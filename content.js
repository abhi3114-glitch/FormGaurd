/**
 * FormGuard Content Script
 * Monitors form fields and auto-saves to chrome.storage.local
 */

(function () {
    'use strict';

    const STORAGE_PREFIX = 'formguard_';
    const SAVE_DELAY = 1000; // 1 second debounce

    let saveTimeout = null;
    let isEnabled = true;
    const domain = window.location.hostname;
    const storageKey = STORAGE_PREFIX + domain;

    /**
     * Generate a unique selector for an element
     */
    function getUniqueSelector(element) {
        // Priority 1: ID
        if (element.id) {
            return `#${element.id}`;
        }

        // Priority 2: Name attribute
        if (element.name) {
            const tagName = element.tagName.toLowerCase();
            return `${tagName}[name="${element.name}"]`;
        }

        // Priority 3: Generate CSS path
        return generateCSSPath(element);
    }

    /**
     * Generate CSS path for element without id/name
     */
    function generateCSSPath(element) {
        const path = [];
        let current = element;

        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();

            if (current.className && typeof current.className === 'string') {
                const classes = current.className.trim().split(/\s+/).filter(c => c);
                if (classes.length > 0) {
                    selector += '.' + classes.slice(0, 2).join('.');
                }
            }

            // Add nth-child for uniqueness
            const parent = current.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(
                    c => c.tagName === current.tagName
                );
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += `:nth-of-type(${index})`;
                }
            }

            path.unshift(selector);
            current = current.parentElement;
        }

        return path.join(' > ');
    }

    /**
     * Get all form fields on the page
     */
    function getFormFields() {
        return document.querySelectorAll(
            'input[type="text"], input[type="email"], input[type="tel"], ' +
            'input[type="url"], input[type="search"], input[type="number"], ' +
            'input:not([type]), textarea, select'
        );
    }

    /**
     * Collect current form data
     */
    function collectFormData() {
        const fields = getFormFields();
        const data = {};

        fields.forEach(field => {
            const selector = getUniqueSelector(field);
            const value = field.value;

            // Only save non-empty values
            if (value && value.trim()) {
                data[selector] = value;
            }
        });

        return data;
    }

    /**
     * Save form data to storage
     */
    function saveFormData() {
        if (!isEnabled) return;

        const fieldsData = collectFormData();

        // Only save if there's data
        if (Object.keys(fieldsData).length === 0) return;

        const data = {
            enabled: true,
            fields: fieldsData,
            timestamp: Date.now(),
            url: window.location.href
        };

        chrome.storage.local.set({ [storageKey]: data }, () => {
            console.log('[FormGuard] Form data saved for:', domain);
        });
    }

    /**
     * Debounced save handler
     */
    function debouncedSave() {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(saveFormData, SAVE_DELAY);
    }

    /**
     * Restore form data from storage
     */
    function restoreFormData(callback) {
        chrome.storage.local.get([storageKey], (result) => {
            const savedData = result[storageKey];

            if (!savedData || !savedData.fields) {
                callback && callback(false, 'No saved data found');
                return;
            }

            let restoredCount = 0;
            const fields = savedData.fields;

            Object.keys(fields).forEach(selector => {
                try {
                    const element = document.querySelector(selector);
                    if (element) {
                        element.value = fields[selector];
                        // Trigger change event for frameworks
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        restoredCount++;
                    }
                } catch (e) {
                    console.warn('[FormGuard] Could not restore:', selector, e);
                }
            });

            callback && callback(true, `Restored ${restoredCount} fields`);
        });
    }

    /**
     * Clear saved data for current domain
     */
    function clearFormData(callback) {
        chrome.storage.local.remove([storageKey], () => {
            callback && callback(true);
        });
    }

    /**
     * Check if auto-save is enabled for this domain
     */
    function checkEnabled(callback) {
        const settingsKey = `formguard_settings_${domain}`;
        chrome.storage.local.get([settingsKey], (result) => {
            const settings = result[settingsKey];
            isEnabled = settings ? settings.enabled !== false : true;
            callback && callback(isEnabled);
        });
    }

    /**
     * Set up event listeners on form fields
     */
    function setupListeners() {
        const fields = getFormFields();

        fields.forEach(field => {
            field.addEventListener('input', debouncedSave);
            field.addEventListener('change', debouncedSave);
        });

        // Also observe for dynamically added fields
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const newFields = node.querySelectorAll
                            ? node.querySelectorAll('input, textarea, select')
                            : [];
                        newFields.forEach(field => {
                            field.addEventListener('input', debouncedSave);
                            field.addEventListener('change', debouncedSave);
                        });
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * Listen for messages from popup
     */
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case 'restore':
                restoreFormData((success, message) => {
                    sendResponse({ success, message });
                });
                return true; // Keep channel open for async response

            case 'clear':
                clearFormData((success) => {
                    sendResponse({ success });
                });
                return true;

            case 'getStatus':
                chrome.storage.local.get([storageKey], (result) => {
                    const savedData = result[storageKey];
                    sendResponse({
                        hasSavedData: !!(savedData && savedData.fields && Object.keys(savedData.fields).length > 0),
                        fieldCount: savedData?.fields ? Object.keys(savedData.fields).length : 0,
                        timestamp: savedData?.timestamp || null,
                        enabled: isEnabled
                    });
                });
                return true;

            case 'setEnabled':
                isEnabled = request.enabled;
                const settingsKey = `formguard_settings_${domain}`;
                chrome.storage.local.set({
                    [settingsKey]: { enabled: isEnabled }
                }, () => {
                    sendResponse({ success: true });
                });
                return true;
        }
    });

    /**
     * Initialize
     */
    function init() {
        checkEnabled(() => {
            if (isEnabled) {
                setupListeners();
                console.log('[FormGuard] Active on:', domain);
            } else {
                console.log('[FormGuard] Disabled on:', domain);
            }
        });
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

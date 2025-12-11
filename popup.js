/**
 * FormGuard Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const domainEl = document.getElementById('currentDomain');
    const fieldCountEl = document.getElementById('fieldCount');
    const lastSavedEl = document.getElementById('lastSaved');
    const restoreBtn = document.getElementById('restoreBtn');
    const clearBtn = document.getElementById('clearBtn');
    const enableToggle = document.getElementById('enableToggle');
    const demoLink = document.getElementById('demoLink');
    const toast = document.getElementById('toast');

    let currentTab = null;

    /**
     * Show toast notification
     */
    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => {
            toast.className = 'toast';
        }, 2500);
    }

    /**
     * Format relative time
     */
    function formatRelativeTime(timestamp) {
        if (!timestamp) return 'Never';

        const diff = Date.now() - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    /**
     * Get current tab info
     */
    async function getCurrentTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    }

    /**
     * Send message to content script
     */
    async function sendMessage(action, data = {}) {
        if (!currentTab?.id) return null;

        try {
            return await chrome.tabs.sendMessage(currentTab.id, { action, ...data });
        } catch (error) {
            console.error('Message error:', error);
            return null;
        }
    }

    /**
     * Update status display
     */
    async function updateStatus() {
        const response = await sendMessage('getStatus');

        if (response) {
            fieldCountEl.textContent = response.fieldCount || 0;
            lastSavedEl.textContent = formatRelativeTime(response.timestamp);
            enableToggle.checked = response.enabled !== false;

            restoreBtn.disabled = !response.hasSavedData;
            clearBtn.disabled = !response.hasSavedData;
        } else {
            fieldCountEl.textContent = '-';
            lastSavedEl.textContent = '-';
            restoreBtn.disabled = true;
            clearBtn.disabled = true;
        }
    }

    /**
     * Initialize popup
     */
    async function init() {
        currentTab = await getCurrentTab();

        if (currentTab?.url) {
            try {
                const url = new URL(currentTab.url);

                // Check if it's our demo page
                const isOurDemo = currentTab.url.includes(chrome.runtime.id) && currentTab.url.includes('demo.html');

                if (isOurDemo) {
                    // It's our extension's demo page - inject content script manually
                    domainEl.textContent = 'Demo Page';
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: currentTab.id },
                            files: ['content.js']
                        });
                        // Small delay for script to initialize
                        await new Promise(r => setTimeout(r, 100));
                        await updateStatus();
                    } catch (e) {
                        console.log('Script already injected or error:', e);
                        await updateStatus();
                    }
                } else if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') {
                    // Other extension pages - disable
                    domainEl.textContent = 'Extension Page';
                    restoreBtn.disabled = true;
                    clearBtn.disabled = true;
                    enableToggle.disabled = true;
                } else if (url.protocol === 'file:') {
                    // File URLs - need special permission
                    domainEl.textContent = url.pathname.split('/').pop() || 'Local File';
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: currentTab.id },
                            files: ['content.js']
                        });
                        await new Promise(r => setTimeout(r, 100));
                        await updateStatus();
                    } catch (e) {
                        console.log('Cannot inject to file URL - needs permission:', e);
                        domainEl.textContent = 'Enable file access';
                        restoreBtn.disabled = true;
                        clearBtn.disabled = true;
                    }
                } else {
                    domainEl.textContent = url.hostname || 'Unknown';
                    await updateStatus();
                }
            } catch (e) {
                domainEl.textContent = 'Unknown';
            }
        } else {
            domainEl.textContent = 'No page loaded';
            restoreBtn.disabled = true;
            clearBtn.disabled = true;
        }

        // Set demo link to open in new tab
        demoLink.href = chrome.runtime.getURL('demo.html');
        demoLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: demoLink.href });
        });
    }

    /**
     * Handle restore button click
     */
    restoreBtn.addEventListener('click', async () => {
        restoreBtn.disabled = true;

        const response = await sendMessage('restore');

        if (response?.success) {
            showToast(response.message || 'Form restored!', 'success');
        } else {
            showToast(response?.message || 'No data to restore', 'error');
        }

        setTimeout(() => {
            restoreBtn.disabled = false;
        }, 500);
    });

    /**
     * Handle clear button click
     */
    clearBtn.addEventListener('click', async () => {
        if (!confirm('Clear all saved form data for this site?')) return;

        clearBtn.disabled = true;

        const response = await sendMessage('clear');

        if (response?.success) {
            showToast('Data cleared', 'success');
            await updateStatus();
        } else {
            showToast('Failed to clear data', 'error');
        }

        clearBtn.disabled = true;
    });

    /**
     * Handle toggle change
     */
    enableToggle.addEventListener('change', async () => {
        const enabled = enableToggle.checked;

        const response = await sendMessage('setEnabled', { enabled });

        if (response?.success) {
            showToast(enabled ? 'Auto-save enabled' : 'Auto-save disabled', 'success');
        }
    });

    // Initialize
    init();
});

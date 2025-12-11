/**
 * FormGuard Background Service Worker
 * Handles installation and optional cleanup
 */

const STORAGE_PREFIX = 'formguard_';
const MAX_AGE_DAYS = 7;

/**
 * Clean up old storage entries
 */
async function cleanupOldEntries() {
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();

    try {
        const allData = await chrome.storage.local.get(null);
        const keysToRemove = [];

        Object.keys(allData).forEach(key => {
            if (key.startsWith(STORAGE_PREFIX) && !key.includes('_settings_')) {
                const entry = allData[key];
                if (entry.timestamp && (now - entry.timestamp) > maxAge) {
                    keysToRemove.push(key);
                }
            }
        });

        if (keysToRemove.length > 0) {
            await chrome.storage.local.remove(keysToRemove);
            console.log('[FormGuard] Cleaned up', keysToRemove.length, 'old entries');
        }
    } catch (error) {
        console.error('[FormGuard] Cleanup error:', error);
    }
}

// On installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('[FormGuard] Installed:', details.reason);

    if (details.reason === 'install') {
        // Open demo page on first install
        chrome.tabs.create({
            url: chrome.runtime.getURL('demo.html')
        });
    }
});

// Periodic cleanup (runs when service worker wakes up)
chrome.runtime.onStartup.addListener(() => {
    cleanupOldEntries();
});

// Also run cleanup on installation
chrome.runtime.onInstalled.addListener(() => {
    cleanupOldEntries();
});

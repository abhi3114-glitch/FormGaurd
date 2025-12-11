# FormGuard Chrome Extension

FormGuard is a lightweight and secure Chrome extension designed to automatically save form input data and provide a seamless restoration capability. This ensures users never lose their work due to accidental page refreshes, browser crashes, or network interruptions.

## Proejct Overview

- **Core Functionality**: Monitors input fields (text, email, textarea, select, etc.) and saves data to local storage with a debounce mechanism.
- **Privacy First**: All data is stored within the browser's `chrome.storage.local`. No data is transmitted to external servers.
- **Granular Control**: Users can toggle auto-save functionality on a per-domain basis.
- **Smart Restoration**: data is mapped using unique selectors (ID, name, or CSS path) to ensure accurate restoration.

## Key Features

1. **Auto-Save**: Captures input changes in real-time with a 1-second delay to optimize performance.
2. **One-Click Restore**: Easily repopulate forms with previously saved data via the extension popup.
3. **Domain Privacy**: selectively enable or disable the extension for specific websites.
4. **Data Management**: clear saved data for the current site or rely on the automatic 7-day cleanup policy.
5. **Robust Field Support**: Handles standard inputs, textareas, and dropdown menus.

## Installation Instructions

1. Clone or download this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button.
5. Select the root directory of this project (`FormGuard`).
6. The FormGuard icon will appear in your browser toolbar.

## Usage Guide

### Basic Operation
The extension automatically runs on all web pages. Simply type into any form, and your data will be saved. To restore data, click the FormGuard icon and select **Restore Form**.

### Privacy & Settings
To disable auto-save for a specific site, open the extension popup and toggle the switch to the off position. This setting is remembered for that specific domain.

### Testing with Local Files
To use FormGuard with local HTML files (URLs starting with `file://`):
1. Go to `chrome://extensions/`.
2. Locate FormGuard and click **Details**.
3. Toggle the option **Allow access to file URLs** to ON.

### Demo
A built-in demonstration page is included. Open the extension popup and click the **Open Demo Form** link to test the functionality.

## Technical Architecture

- **Manifest V3**: Compliant with the latest Chrome Extension specification.
- **Permissions**:
  - `storage`: For saving form data locally.
  - `activeTab`: For interacting with the current page.
  - `scripting`: For injecting the content script when needed.
- **File Structure**:
  - `manifest.json`: Configuration and permissions.
  - `content.js`: Handles DOM interaction, event listeners, and auto-save logic.
  - `background.js`: Service worker for lifecycle management.
  - `popup.html/css/js`: User interface for the extension.

## License

This project is licensed under the MIT License.

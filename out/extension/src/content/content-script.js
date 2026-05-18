"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startCapture') {
        // Message popup to start capture flow
        chrome.runtime.sendMessage({
            action: 'captureScreenshot'
        }).catch(() => {
            // Popup may not be open
            console.log('Popup not open');
        });
    }
    if (request.action === 'startManualReport') {
        // Message popup to start manual report flow
        chrome.runtime.sendMessage({
            action: 'openManualReport'
        }).catch(() => {
            console.log('Popup not open');
        });
    }
});
//# sourceMappingURL=content-script.js.map
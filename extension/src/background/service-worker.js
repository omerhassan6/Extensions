"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'captureScreenshot') {
        handleScreenshotCapture(sendResponse);
        return true; // Keep channel open for async response
    }
    if (request.action === 'analyzeScreenshot') {
        handleScreenshotAnalysis(request, sendResponse);
        return true;
    }
    if (request.action === 'saveToStorage') {
        chrome.storage.local.set({ [request.key]: request.value });
        sendResponse({ success: true });
    }
    if (request.action === 'getFromStorage') {
        chrome.storage.local.get(request.key, (data) => {
            sendResponse({ success: true, data: data[request.key] });
        });
        return true;
    }
});
// Handle screenshot capture
async function handleScreenshotCapture(sendResponse) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) {
            sendResponse({
                success: false,
                error: 'No active tab found'
            });
            return;
        }
        const screenshot = await chrome.tabs.captureVisibleTab(tabs[0].windowId, {
            format: 'png',
            quality: 90
        });
        sendResponse({
            success: true,
            screenshot
        });
    }
    catch (error) {
        sendResponse({
            success: false,
            error: error.message
        });
    }
}
// Handle screenshot analysis
async function handleScreenshotAnalysis(request, sendResponse) {
    // Forward to backend or process locally
    try {
        // Get settings to check backend URL
        chrome.storage.sync.get(['backendUrl', 'apiToken'], async (items) => {
            if (!items.backendUrl) {
                sendResponse({
                    success: false,
                    error: 'Backend URL not configured'
                });
                return;
            }
            try {
                const response = await fetch(`${items.backendUrl}/api/analyze`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': items.apiToken ? `Bearer ${items.apiToken}` : ''
                    },
                    body: JSON.stringify(request)
                });
                if (!response.ok) {
                    throw new Error(`Backend error: ${response.statusText}`);
                }
                const data = await response.json();
                sendResponse({
                    success: true,
                    issues: data.issues,
                    report: data.report
                });
            }
            catch (error) {
                sendResponse({
                    success: false,
                    error: error.message
                });
            }
        });
    }
    catch (error) {
        sendResponse({
            success: false,
            error: error.message
        });
    }
}
// Install context menu
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'capture-analyze',
        title: 'Capture & Analyze Screenshot',
        contexts: ['page']
    });
    chrome.contextMenus.create({
        id: 'manual-report',
        title: 'Create Manual Bug Report',
        contexts: ['page']
    });
});
// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'capture-analyze' && tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
            action: 'startCapture'
        });
    }
    if (info.menuItemId === 'manual-report' && tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
            action: 'startManualReport'
        });
    }
});
//# sourceMappingURL=service-worker.js.map
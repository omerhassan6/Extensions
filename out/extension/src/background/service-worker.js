"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tabUserUrls = new Map();
let currentUserUrlHeaderName = 'x-user-url';
const applicationCookieNameMap = {
    none: [],
    applicationA: ['appA_token', 'auth_token', 'access_token', 'session_token'],
    applicationB: ['appB_token', 'auth_token', 'access_token', 'session_token'],
    custom: []
};
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.userUrlHeaderName) {
        currentUserUrlHeaderName = changes.userUrlHeaderName.newValue || 'x-user-url';
    }
});
chrome.webRequest.onHeadersReceived.addListener((details) => {
    if (details.tabId < 0 || details.type !== 'main_frame') {
        return;
    }
    const headerName = currentUserUrlHeaderName.toLowerCase();
    const foundHeader = details.responseHeaders?.find((header) => header.name?.toLowerCase() === headerName);
    if (foundHeader?.value) {
        tabUserUrls.set(details.tabId, foundHeader.value);
    }
}, { urls: ['<all_urls>'], types: ['main_frame'] }, ['responseHeaders']);
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
        chrome.storage.sync.get(['cookieTokenApp', 'customCookieName', 'userUrlHeaderName'], async (settings) => {
            const screenshot = await chrome.tabs.captureVisibleTab(tabs[0].windowId, {
                format: 'png',
                quality: 90
            });
            const userUrl = tabUserUrls.get(tabs[0].id) || '';
            const cookieToken = await getCookieToken(tabs[0], settings);
            const devicePixelRatio = typeof self !== 'undefined' && self.devicePixelRatio ? self.devicePixelRatio : 1;
            const metadata = {
                url: tabs[0].url || '',
                title: tabs[0].title || '',
                timestamp: new Date().toISOString(),
                viewportWidth: tabs[0].width || 0,
                viewportHeight: tabs[0].height || 0,
                userAgent: navigator.userAgent,
                devicePixelRatio,
                userUrl: userUrl || undefined
            };
            sendResponse({
                success: true,
                screenshot,
                metadata: metadata,
                cookieToken: cookieToken || undefined
            });
        });
    }
    catch (error) {
        sendResponse({
            success: false,
            error: error.message
        });
    }
}
async function getCookieToken(tab, settings) {
    const app = settings.cookieTokenApp || 'none';
    const customName = settings.customCookieName || '';
    const cookieNames = getCookieNamesForApp(app, customName);
    if (!tab?.url || !cookieNames.length) {
        return null;
    }
    try {
        const cookies = await chrome.cookies.getAll({ url: tab.url });
        const matched = cookies.find((cookie) => cookieNames.includes(cookie.name) || cookieNames.some((name) => cookie.name.toLowerCase().includes(name.toLowerCase())));
        return matched?.value || null;
    }
    catch {
        return null;
    }
}
function getCookieNamesForApp(app, customName) {
    if (app === 'custom') {
        return customName ? [customName] : [];
    }
    return applicationCookieNameMap[app] || [];
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
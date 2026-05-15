// Handle screenshot capture
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureTab') {
    chrome.tabs.captureVisibleTab({ format: 'png', quality: 90 })
      .then(screenshot => {
        sendResponse({
          success: true,
          screenshot: screenshot,
          tabInfo: {
            id: sender.tab.id,
            url: sender.tab.url,
            title: sender.tab.title
          }
        });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
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

// Context menu for screenshot
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'capture-screenshot',
    title: 'Capture & Analyze Screenshot',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'capture-screenshot') {
    chrome.tabs.captureVisibleTab()
      .then(screenshot => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'screenshotCaptured',
          screenshot: screenshot
        });
      });
  }
});
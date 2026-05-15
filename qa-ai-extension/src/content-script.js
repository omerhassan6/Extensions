// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureScreenshot') {
    captureScreenshot(sendResponse);
  }
});

async function captureScreenshot(sendResponse) {
  try {
    // Get current tab
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab[0]) {
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }

    // Use chrome.tabs.captureVisibleTab
    const dataUrl = await chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {
      format: 'png',
      quality: 90
    });

    // Get page metadata
    const pageMetadata = {
      url: tab[0].url,
      title: tab[0].title,
      timestamp: new Date().toISOString(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio
    };

    sendResponse({
      success: true,
      screenshot: dataUrl,
      metadata: pageMetadata
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
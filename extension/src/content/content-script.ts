declare const chrome: any

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
  if (request.action === 'startCapture') {
    // Message popup to start capture flow
    chrome.runtime.sendMessage({
      action: 'captureScreenshot'
    }).catch(() => {
      // Popup may not be open
      console.log('Popup not open')
    })
  }

  if (request.action === 'startManualReport') {
    // Message popup to start manual report flow
    chrome.runtime.sendMessage({
      action: 'openManualReport'
    }).catch(() => {
      console.log('Popup not open')
    })
  }
})

// Inject page context for any needed DOM operations
export {}

declare const chrome: any

import { ScreenshotRequest, ScreenshotResponse, AnalysisRequest, AnalysisResponse } from '../types'

const tabUserUrls = new Map<number, string>()
let currentUserUrlHeaderName = 'x-user-url'

const applicationCookieNameMap: Record<string, string[]> = {
  none: [],
  applicationA: ['appA_token', 'auth_token', 'access_token', 'session_token'],
  applicationB: ['appB_token', 'auth_token', 'access_token', 'session_token'],
  custom: []
}

chrome.storage.onChanged.addListener((changes: any, area: string) => {
  if (area === 'sync' && changes.userUrlHeaderName) {
    currentUserUrlHeaderName = changes.userUrlHeaderName.newValue || 'x-user-url'
  }
})

chrome.webRequest.onHeadersReceived.addListener(
  (details: any) => {
    if (details.tabId < 0 || details.type !== 'main_frame') {
      return
    }

    const headerName = currentUserUrlHeaderName.toLowerCase()
    const foundHeader = details.responseHeaders?.find(
      (header: any) => header.name?.toLowerCase() === headerName
    )

    if (foundHeader?.value) {
      tabUserUrls.set(details.tabId, foundHeader.value)
    }
  },
  { urls: ['<all_urls>'], types: ['main_frame'] },
  ['responseHeaders']
)

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
  if (request.action === 'captureScreenshot') {
    handleScreenshotCapture(sendResponse)
    return true // Keep channel open for async response
  }

  if (request.action === 'analyzeScreenshot') {
    handleScreenshotAnalysis(request, sendResponse)
    return true
  }

  if (request.action === 'saveToStorage') {
    chrome.storage.local.set({ [request.key]: request.value })
    sendResponse({ success: true })
  }

  if (request.action === 'getFromStorage') {
    chrome.storage.local.get(request.key, (data: any) => {
      sendResponse({ success: true, data: data[request.key] })
    })
    return true
  }
})

// Handle screenshot capture
async function handleScreenshotCapture(sendResponse: (response: ScreenshotResponse) => void) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tabs[0]?.id) {
      sendResponse({
        success: false,
        error: 'No active tab found'
      })
      return
    }

    chrome.storage.sync.get(['cookieTokenApp', 'customCookieName', 'userUrlHeaderName'], async (settings: any) => {
      const screenshot = await chrome.tabs.captureVisibleTab(tabs[0].windowId, {
        format: 'png',
        quality: 90
      })

      const userUrl = tabUserUrls.get(tabs[0].id) || ''
      const cookieToken = await getCookieToken(tabs[0], settings)
      const devicePixelRatio = typeof self !== 'undefined' && (self as any).devicePixelRatio ? (self as any).devicePixelRatio : 1

      const metadata = {
        url: tabs[0].url || '',
        title: tabs[0].title || '',
        timestamp: new Date().toISOString(),
        viewportWidth: tabs[0].width || 0,
        viewportHeight: tabs[0].height || 0,
        userAgent: navigator.userAgent,
        devicePixelRatio,
        userUrl: userUrl || undefined
      }

      sendResponse({
        success: true,
        screenshot,
        metadata: metadata as any,
        cookieToken: cookieToken || undefined
      })
    })
  } catch (error: any) {
    sendResponse({
      success: false,
      error: error.message
    })
  }
}

async function getCookieToken(tab: any, settings: any): Promise<string | null> {
  const app = settings.cookieTokenApp || 'none'
  const customName = settings.customCookieName || ''
  const cookieNames = getCookieNamesForApp(app, customName)

  if (!tab?.url || !cookieNames.length) {
    return null
  }

  try {
    const cookies = await chrome.cookies.getAll({ url: tab.url })
    const matched = cookies.find((cookie: any) =>
      cookieNames.includes(cookie.name) || cookieNames.some((name) => cookie.name.toLowerCase().includes(name.toLowerCase()))
    )
    return matched?.value || null
  } catch {
    return null
  }
}

function getCookieNamesForApp(app: string, customName: string): string[] {
  if (app === 'custom') {
    return customName ? [customName] : []
  }
  return applicationCookieNameMap[app] || []
}

// Handle screenshot analysis
async function handleScreenshotAnalysis(request: AnalysisRequest, sendResponse: (response: AnalysisResponse) => void) {
  // Forward to backend or process locally
  try {
    // Get settings to check backend URL
    chrome.storage.sync.get(['backendUrl', 'apiToken'], async (items: any) => {
      if (!items.backendUrl) {
        sendResponse({
          success: false,
          error: 'Backend URL not configured'
        })
        return
      }

      try {
        const response = await fetch(`${items.backendUrl}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': items.apiToken ? `Bearer ${items.apiToken}` : ''
          },
          body: JSON.stringify(request)
        })

        if (!response.ok) {
          throw new Error(`Backend error: ${response.statusText}`)
        }

        const data = await response.json()
        sendResponse({
          success: true,
          issues: data.issues,
          report: data.report
        })
      } catch (error: any) {
        sendResponse({
          success: false,
          error: error.message
        })
      }
    })
  } catch (error: any) {
    sendResponse({
      success: false,
      error: error.message
    })
  }
}

// Install context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'capture-analyze',
    title: 'Capture & Analyze Screenshot',
    contexts: ['page']
  })

  chrome.contextMenus.create({
    id: 'manual-report',
    title: 'Create Manual Bug Report',
    contexts: ['page']
  })
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info: any, tab: any) => {
  if (info.menuItemId === 'capture-analyze' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'startCapture'
    })
  }

  if (info.menuItemId === 'manual-report' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'startManualReport'
    })
  }
})

export {}

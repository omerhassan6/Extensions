// Message types between popup, content script, and background
export interface ScreenshotRequest {
  action: 'captureScreenshot'
  tabId?: number
}

export interface ScreenshotResponse {
  success: boolean
  screenshot?: string
  metadata?: PageMetadata
  cookieToken?: string
  error?: string
}

export interface AnalysisRequest {
  action: 'analyzeScreenshot'
  screenshot: string
  metadata: PageMetadata
}

export interface AnalysisResponse {
  success: boolean
  issues?: UIIssue[]
  report?: BugReport
  error?: string
}

export interface PageMetadata {
  url: string
  title: string
  timestamp: string
  viewportWidth: number
  viewportHeight: number
  userAgent: string
  devicePixelRatio: number
  userUrl?: string
}

export interface UIIssue {
  id: string
  issue: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  location: string
  description: string
  impact: string
  suggestedFix: string
  coordinates?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface BugReport {
  id: string
  title: string
  description: string
  expectedBehavior: string
  actualBehavior: string
  reproductionSteps: string[]
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  environment: {
    browser: string
    os: string
    viewport: string
    devicePixelRatio: number
    timestamp: string
  }
  screenshot: {
    data: string
    annotated?: string
  }
  issues: UIIssue[]
  metadata: PageMetadata
  apiRequests?: {
    curl?: string
    python?: string
    javascript?: string
  }
}

export interface ExtensionSettings {
  apiKey: string
  backendUrl: string
  apiToken: string
  bugPriority: 'low' | 'medium' | 'high' | 'critical'
  screenshotQuality: number
  autoAnalyze: boolean
  userUrlHeaderName: string
  cookieTokenApp: 'none' | 'applicationA' | 'applicationB' | 'custom'
  customCookieName: string
}

export interface HistoryItem {
  id: string
  title: string
  severity: string
  timestamp: string
  fullReport: BugReport
}

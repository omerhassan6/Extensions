import { BugReport, UIIssue, AnalysisResponse } from '../types'
import { getSettings } from '../utils/storage'

export class AnalysisService {
  static async analyzeScreenshot(screenshot: string, pageUrl: string): Promise<AnalysisResponse> {
    try {
      const settings = await getSettings()

      if (!settings.backendUrl) {
        return {
          success: false,
          error: 'Backend URL not configured. Please check settings.'
        }
      }

      const response = await fetch(`${settings.backendUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': settings.apiToken ? `Bearer ${settings.apiToken}` : ''
        },
        body: JSON.stringify({
          screenshot,
          pageUrl,
          apiKey: settings.apiKey
        })
      })

      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        success: true,
        issues: data.issues || [],
        report: data.report
      }
    } catch (error: any) {
      console.error('Analysis error:', error)
      return {
        success: false,
        error: error.message || 'Failed to analyze screenshot'
      }
    }
  }

  static async generateBugReport(
    screenshot: string,
    issues: UIIssue[],
    metadata: any
  ): Promise<BugReport | null> {
    try {
      const settings = await getSettings()

      if (!settings.backendUrl) {
        throw new Error('Backend URL not configured')
      }

      const response = await fetch(`${settings.backendUrl}/api/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': settings.apiToken ? `Bearer ${settings.apiToken}` : ''
        },
        body: JSON.stringify({
          screenshot,
          issues,
          metadata,
          apiKey: settings.apiKey
        })
      })

      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.report as BugReport
    } catch (error: any) {
      console.error('Report generation error:', error)
      return null
    }
  }

  static async generateApiRequests(report: BugReport): Promise<{
    curl?: string
    python?: string
    javascript?: string
  }> {
    try {
      const settings = await getSettings()

      const response = await fetch(`${settings.backendUrl}/api/generate-api-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': settings.apiToken ? `Bearer ${settings.apiToken}` : ''
        },
        body: JSON.stringify({
          report,
          apiKey: settings.apiKey
        })
      })

      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error: any) {
      console.error('API request generation error:', error)
      return {}
    }
  }
}

const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs').promises
const path = require('path')

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
})

// Generate detailed bug report
exports.generateBugReport = async (screenshot, issues, metadata = {}) => {
  try {
    if (!process.env.CLAUDE_API_KEY) {
      throw new Error('Claude API key not configured')
    }

    const base64Image = screenshot.includes(',') 
      ? screenshot.split(',')[1] 
      : screenshot

    const issuesText = JSON.stringify(issues, null, 2)

    const prompt = `You are an expert QA engineer. Based on these UI issues detected in a screenshot, generate a comprehensive bug report.

Issues found:
${issuesText}

Page metadata:
- URL: ${metadata.url || 'Unknown'}
- User URL: ${metadata.userUrl || 'Unknown'}
- Title: ${metadata.title || 'Unknown'}
- Browser: ${metadata.userAgent || 'Unknown'}
- Viewport: ${metadata.viewportWidth}x${metadata.viewportHeight}

Generate a professional bug report with these EXACT JSON fields:
{
  "title": "Concise bug title (max 10 words)",
  "description": "Detailed description of the issues",
  "expectedBehavior": "What should happen",
  "actualBehavior": "What's actually happening",
  "reproductionSteps": ["Step 1", "Step 2", "Step 3"],
  "severity": "Low|Medium|High|Critical",
  "affectedArea": "Description of affected UI area"
}

Return ONLY valid JSON, no other text.`

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64Image
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid response format')
    }

    const reportData = JSON.parse(jsonMatch[0])

    // Create complete report object
    const report = {
      id: generateUUID(),
      title: reportData.title || 'UI Issue Found',
      description: reportData.description || '',
      expectedBehavior: reportData.expectedBehavior || '',
      actualBehavior: reportData.actualBehavior || '',
      reproductionSteps: reportData.reproductionSteps || [],
      severity: reportData.severity || 'Medium',
      affectedArea: reportData.affectedArea || '',
      environment: {
        browser: metadata.userAgent || 'Unknown',
        os: detectOS(metadata.userAgent),
        viewport: `${metadata.viewportWidth}x${metadata.viewportHeight}`,
        devicePixelRatio: metadata.devicePixelRatio || 1,
        timestamp: new Date().toISOString()
      },
      screenshot: {
        data: screenshot
      },
      issues: issues,
      metadata: metadata
    }

    return report
  } catch (error) {
    console.error('Report generation error:', error)
    throw error
  }
}

// Get history from file
exports.getHistory = async () => {
  try {
    const historyPath = path.join(__dirname, '../data/history.json')
    const data = await fs.readFile(historyPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

// Save report to history
exports.saveToHistory = async (report) => {
  try {
    const historyPath = path.join(__dirname, '../data/history.json')
    const dataDir = path.dirname(historyPath)

    // Create data directory if it doesn't exist
    await fs.mkdir(dataDir, { recursive: true })

    let history = []
    try {
      const data = await fs.readFile(historyPath, 'utf-8')
      history = JSON.parse(data)
    } catch (error) {
      // File doesn't exist yet
    }

    history.unshift({
      id: report.id,
      title: report.title,
      severity: report.severity,
      timestamp: report.environment.timestamp,
      fullReport: report
    })

    // Keep last 100 reports
    if (history.length > 100) {
      history = history.slice(0, 100)
    }

    await fs.writeFile(historyPath, JSON.stringify(history, null, 2))

    return report
  } catch (error) {
    console.error('Error saving to history:', error)
    throw error
  }
}

// Delete from history
exports.deleteFromHistory = async (id) => {
  try {
    const historyPath = path.join(__dirname, '../data/history.json')
    const data = await fs.readFile(historyPath, 'utf-8')
    let history = JSON.parse(data)

    history = history.filter(item => item.id !== id)

    await fs.writeFile(historyPath, JSON.stringify(history, null, 2))
  } catch (error) {
    console.error('Error deleting from history:', error)
    throw error
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function detectOS(userAgent) {
  if (!userAgent) return 'Unknown'
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac')) return 'macOS'
  if (userAgent.includes('Linux')) return 'Linux'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iPhone')) return 'iOS'
  return 'Unknown'
}

module.exports = exports

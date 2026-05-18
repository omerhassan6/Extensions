const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs').promises
const path = require('path')

const isDemoMode = () => process.env.DEMO_MODE === 'true' || !process.env.CLAUDE_API_KEY

const client = process.env.CLAUDE_API_KEY
  ? new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
  : null

const HISTORY_PATH = path.join(__dirname, '../data/history.json')

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
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'
  return 'Unknown'
}

function highestSeverity(issues = []) {
  const order = ['Critical', 'High', 'Medium', 'Low']
  for (const sev of order) {
    if (issues.some(i => (i.severity || '').toLowerCase() === sev.toLowerCase())) return sev
  }
  return 'Medium'
}

function flowToSteps(flow) {
  if (!Array.isArray(flow)) return []
  return flow
    .filter(s => s && (s.type === 'click' || s.type === 'input' || s.type === 'navigate' || s.type === 'submit'))
    .map(s => {
      if (s.type === 'navigate') return `Navigate to ${s.url || s.target || ''}`
      if (s.type === 'click')    return `Click ${s.target || ''}`
      if (s.type === 'input')    return `Type "${s.value || ''}" into ${s.target || ''}`
      if (s.type === 'submit')   return `Submit ${s.target || ''}`
      return s.target || s.type
    })
}

function buildDemoReport(screenshot, issues, metadata) {
  const sev = highestSeverity(issues)
  const url = metadata.url || metadata.pageUrl || 'the inspected page'
  const flowSteps = flowToSteps(metadata.flow)
  return {
    id: generateUUID(),
    title: `[Demo] ${sev} UI issues detected on ${metadata.title || 'page'}`,
    description: `The QA analyzer flagged ${issues.length} issue(s) on ${url}. This report was generated in demo mode without a Claude API key.`,
    expectedBehavior: 'All UI elements should be aligned, spaced consistently, and meet WCAG AA color contrast.',
    actualBehavior: 'Multiple UI inconsistencies and accessibility issues were detected.',
    reproductionSteps: flowSteps.length ? flowSteps : [
      `Open ${url}`,
      'Inspect the header and navigation area',
      'Review product cards / content sections',
      'Check footer links and small text for contrast'
    ],
    severity: sev,
    affectedArea: 'Page layout, typography, and accessibility',
    environment: {
      browser: metadata.userAgent || 'Unknown',
      os: detectOS(metadata.userAgent),
      viewport: metadata.viewport || `${metadata.viewportWidth || ''}x${metadata.viewportHeight || ''}`.replace(/^x$/, 'Unknown'),
      devicePixelRatio: metadata.devicePixelRatio || 1,
      timestamp: new Date().toISOString()
    },
    screenshot: { data: screenshot || null },
    issues,
    metadata
  }
}

exports.generateBugReport = async (screenshot, issues, metadata = {}) => {
  if (isDemoMode()) {
    return buildDemoReport(screenshot, issues, metadata)
  }

  try {
    const base64Image = screenshot.includes(',')
      ? screenshot.split(',')[1]
      : screenshot

    const flowSteps = flowToSteps(metadata.flow)
    const flowSection = flowSteps.length
      ? `\n\nUser interaction flow captured during reproduction (use as reproductionSteps, condensing redundancy):\n${flowSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
      : ''

    const prompt = `You are an expert QA engineer. Given these UI issues from a screenshot, generate a bug report.

Issues:
${JSON.stringify(issues, null, 2)}

Page metadata:
- URL: ${metadata.url || 'Unknown'}
- Title: ${metadata.title || 'Unknown'}
- Browser: ${metadata.userAgent || 'Unknown'}
- Viewport: ${metadata.viewportWidth || ''}x${metadata.viewportHeight || ''}${flowSection}

Return EXACT JSON with these fields:
{
  "title": "Concise bug title (max 10 words)",
  "description": "Detailed description",
  "expectedBehavior": "...",
  "actualBehavior": "...",
  "reproductionSteps": ["..."],
  "severity": "Low|Medium|High|Critical",
  "affectedArea": "..."
}

Return ONLY valid JSON.`

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: base64Image }
            },
            { type: 'text', text: prompt }
          ]
        }
      ]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return buildDemoReport(screenshot, issues, metadata)

    const data = JSON.parse(jsonMatch[0])
    const reproSteps = (Array.isArray(data.reproductionSteps) && data.reproductionSteps.length)
      ? data.reproductionSteps
      : flowToSteps(metadata.flow)
    return {
      id: generateUUID(),
      title: data.title || 'UI Issue Found',
      description: data.description || '',
      expectedBehavior: data.expectedBehavior || '',
      actualBehavior: data.actualBehavior || '',
      reproductionSteps: reproSteps,
      severity: data.severity || highestSeverity(issues),
      affectedArea: data.affectedArea || '',
      environment: {
        browser: metadata.userAgent || 'Unknown',
        os: detectOS(metadata.userAgent),
        viewport: `${metadata.viewportWidth || ''}x${metadata.viewportHeight || ''}`.replace(/^x$/, 'Unknown'),
        devicePixelRatio: metadata.devicePixelRatio || 1,
        timestamp: new Date().toISOString()
      },
      screenshot: { data: screenshot },
      issues,
      metadata
    }
  } catch (error) {
    console.error('Report generation error:', error)
    return buildDemoReport(screenshot, issues, metadata)
  }
}

async function readHistory() {
  try {
    const data = await fs.readFile(HISTORY_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function writeHistory(history) {
  await fs.mkdir(path.dirname(HISTORY_PATH), { recursive: true })
  await fs.writeFile(HISTORY_PATH, JSON.stringify(history, null, 2))
}

exports.getHistory = async () => readHistory()

exports.saveToHistory = async (report) => {
  const history = await readHistory()
  const item = {
    id: report.id || generateUUID(),
    title: report.title,
    severity: report.severity,
    timestamp: (report.environment && report.environment.timestamp) || new Date().toISOString(),
    fullReport: report
  }
  history.unshift(item)
  if (history.length > 100) history.length = 100
  await writeHistory(history)
  return item
}

exports.deleteFromHistory = async (id) => {
  const history = await readHistory()
  await writeHistory(history.filter(item => item.id !== id))
}

module.exports = exports

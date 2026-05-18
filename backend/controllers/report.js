const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')
const reportService = require('../services/report')
const analysisService = require('../services/analysis')
const apiService = require('../services/api-generator')
const { validateApiKey } = require('../utils/auth')

const UPLOADS_DIR = path.join(__dirname, '../uploads')

function requireAuth(req, res) {
  if (process.env.REQUIRE_AUTH === 'true' && !validateApiKey(req.body && req.body.apiKey)) {
    res.status(401).json({ error: 'Invalid API key' })
    return false
  }
  return true
}

// Generate bug report (auto-analyzes if issues aren't supplied)
exports.generateReport = async (req, res, next) => {
  try {
    if (!requireAuth(req, res)) return
    const { screenshot, metadata, flow } = req.body
    let { issues } = req.body

    if (!screenshot) {
      return res.status(400).json({ error: 'Screenshot is required' })
    }

    if (!Array.isArray(issues) || issues.length === 0) {
      const url = (metadata && (metadata.url || metadata.pageUrl)) || ''
      issues = await analysisService.analyzeScreenshot(screenshot, url)
    }

    const enrichedMetadata = { ...(metadata || {}) }
    if (Array.isArray(flow) && flow.length) {
      enrichedMetadata.flow = flow
    }

    const report = await reportService.generateBugReport(screenshot, issues, enrichedMetadata)

    res.json({ success: true, report })
  } catch (error) {
    next(error)
  }
}

// Generate CURL / Python / JavaScript API requests
exports.generateApiRequests = async (req, res, next) => {
  try {
    if (!requireAuth(req, res)) return
    const { report } = req.body

    if (!report) {
      return res.status(400).json({ error: 'Report is required' })
    }

    res.json({
      success: true,
      requests: {
        curl: apiService.generateCurlRequest(report),
        python: apiService.generatePythonRequest(report),
        javascript: apiService.generateJavaScriptRequest(report),
        jira: apiService.generateJiraRequest(report),
        clickup: apiService.generateClickUpRequest(report)
      }
    })
  } catch (error) {
    next(error)
  }
}

// Upload screenshot (accepts { screenshot: "data:image/png;base64,…" })
exports.uploadScreenshot = async (req, res, next) => {
  try {
    if (!requireAuth(req, res)) return
    const { screenshot, filename } = req.body

    if (!screenshot) {
      return res.status(400).json({ error: 'Screenshot data URL required' })
    }

    const match = screenshot.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
    if (!match) {
      return res.status(400).json({ error: 'Invalid base64 image data' })
    }

    const ext = match[1].split('/')[1].replace('+xml', '')
    const buffer = Buffer.from(match[2], 'base64')
    const safeName = (filename || `screenshot-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`)
      .replace(/[^a-zA-Z0-9._-]/g, '_')

    await fs.mkdir(UPLOADS_DIR, { recursive: true })
    const filePath = path.join(UPLOADS_DIR, safeName)
    await fs.writeFile(filePath, buffer)

    res.json({
      success: true,
      filename: safeName,
      url: `/api/uploads/${safeName}`,
      size: buffer.length
    })
  } catch (error) {
    next(error)
  }
}

exports.getUpload = async (req, res, next) => {
  try {
    const safe = path.basename(req.params.filename)
    res.sendFile(path.join(UPLOADS_DIR, safe))
  } catch (error) {
    next(error)
  }
}

exports.getHistory = async (req, res, next) => {
  try {
    const history = await reportService.getHistory()
    res.json({ success: true, history })
  } catch (error) {
    next(error)
  }
}

exports.saveToHistory = async (req, res, next) => {
  try {
    if (!requireAuth(req, res)) return
    const { report } = req.body
    if (!report) return res.status(400).json({ error: 'Report is required' })
    const saved = await reportService.saveToHistory(report)
    res.json({ success: true, item: saved })
  } catch (error) {
    next(error)
  }
}

exports.deleteHistory = async (req, res, next) => {
  try {
    await reportService.deleteFromHistory(req.params.id)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

module.exports = exports

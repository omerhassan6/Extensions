const reportService = require('../services/report')
const apiService = require('../services/api-generator')
const { validateApiKey } = require('../utils/auth')

// Generate bug report
exports.generateReport = async (req, res, next) => {
  try {
    const { screenshot, issues, metadata, apiKey } = req.body

    if (!screenshot || !issues) {
      return res.status(400).json({ error: 'Screenshot and issues are required' })
    }

    if (process.env.REQUIRE_AUTH === 'true') {
      if (!validateApiKey(apiKey)) {
        return res.status(401).json({ error: 'Invalid API key' })
      }
    }

    const report = await reportService.generateBugReport(screenshot, issues, metadata)

    res.json({
      success: true,
      report: report
    })
  } catch (error) {
    next(error)
  }
}

// Generate API requests (CURL, Python, JavaScript)
exports.generateApiRequests = async (req, res, next) => {
  try {
    const { report, apiKey } = req.body

    if (!report) {
      return res.status(400).json({ error: 'Report is required' })
    }

    if (process.env.REQUIRE_AUTH === 'true') {
      if (!validateApiKey(apiKey)) {
        return res.status(401).json({ error: 'Invalid API key' })
      }
    }

    const requests = {
      curl: apiService.generateCurlRequest(report),
      python: apiService.generatePythonRequest(report),
      javascript: apiService.generateJavaScriptRequest(report)
    }

    res.json({
      success: true,
      requests: requests
    })
  } catch (error) {
    next(error)
  }
}

// Upload screenshot
exports.uploadScreenshot = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const fileUrl = `/uploads/${req.file.filename}`

    res.json({
      success: true,
      filename: req.file.filename,
      url: fileUrl,
      path: req.file.path
    })
  } catch (error) {
    next(error)
  }
}

// Get uploaded file
exports.getUpload = async (req, res, next) => {
  try {
    const { filename } = req.params
    res.sendFile(`${__dirname}/../uploads/${filename}`)
  } catch (error) {
    next(error)
  }
}

// Get history
exports.getHistory = async (req, res, next) => {
  try {
    const history = await reportService.getHistory()
    res.json({
      success: true,
      history: history
    })
  } catch (error) {
    next(error)
  }
}

// Save to history
exports.saveToHistory = async (req, res, next) => {
  try {
    const { report } = req.body

    if (!report) {
      return res.status(400).json({ error: 'Report is required' })
    }

    const saved = await reportService.saveToHistory(report)

    res.json({
      success: true,
      report: saved
    })
  } catch (error) {
    next(error)
  }
}

// Delete from history
exports.deleteHistory = async (req, res, next) => {
  try {
    const { id } = req.params

    await reportService.deleteFromHistory(id)

    res.json({
      success: true
    })
  } catch (error) {
    next(error)
  }
}

module.exports = exports

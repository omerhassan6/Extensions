const analysisService = require('../services/analysis')
const { validateApiKey } = require('../utils/auth')

exports.analyzeScreenshot = async (req, res, next) => {
  try {
    const { screenshot, pageUrl, metadata, apiKey } = req.body

    if (!screenshot) {
      return res.status(400).json({ error: 'Screenshot is required' })
    }

    if (process.env.REQUIRE_AUTH === 'true' && !validateApiKey(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key' })
    }

    const url = pageUrl || (metadata && (metadata.url || metadata.pageUrl)) || ''
    const issues = await analysisService.analyzeScreenshot(screenshot, url)

    res.json({
      success: true,
      issues,
      demoMode: process.env.DEMO_MODE === 'true' || !process.env.CLAUDE_API_KEY,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

module.exports = exports

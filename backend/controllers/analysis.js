const analysisService = require('../services/analysis')
const { validateApiKey } = require('../utils/auth')

// Analyze screenshot for UI issues
exports.analyzeScreenshot = async (req, res, next) => {
  try {
    const { screenshot, pageUrl, apiKey } = req.body

    if (!screenshot) {
      return res.status(400).json({ error: 'Screenshot is required' })
    }

    // Validate API key if required
    if (process.env.REQUIRE_AUTH === 'true') {
      if (!validateApiKey(apiKey)) {
        return res.status(401).json({ error: 'Invalid API key' })
      }
    }

    const issues = await analysisService.analyzeScreenshot(screenshot, pageUrl)

    res.json({
      success: true,
      issues: issues,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

module.exports = exports

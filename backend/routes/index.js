const express = require('express')
const router = express.Router()

const analysisController = require('../controllers/analysis')
const reportController = require('../controllers/report')

// Health for the /api prefix (so settings page test connection works)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    demoMode: process.env.DEMO_MODE === 'true' || !process.env.CLAUDE_API_KEY,
    claudeConfigured: Boolean(process.env.CLAUDE_API_KEY),
    timestamp: new Date().toISOString()
  })
})

// Analysis routes
router.post('/analyze', analysisController.analyzeScreenshot)
router.post('/generate-report', reportController.generateReport)
router.post('/generate-api-requests', reportController.generateApiRequests)

// Upload route (accepts base64 data URL — no multer dep)
router.post('/upload-screenshot', reportController.uploadScreenshot)
router.get('/uploads/:filename', reportController.getUpload)

// History routes
router.get('/history', reportController.getHistory)
router.post('/history/save', reportController.saveToHistory)
router.delete('/history/:id', reportController.deleteHistory)

module.exports = router

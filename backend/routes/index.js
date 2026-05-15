const express = require('express')
const router = express.Router()

const analysisController = require('../controllers/analysis')
const reportController = require('../controllers/report')

// Analysis routes
router.post('/analyze', analysisController.analyzeScreenshot)
router.post('/generate-report', reportController.generateReport)
router.post('/generate-api-requests', reportController.generateApiRequests)

// Upload routes
router.post('/upload-screenshot', reportController.uploadScreenshot)
router.get('/uploads/:filename', reportController.getUpload)

// History routes
router.get('/history', reportController.getHistory)
router.post('/history/save', reportController.saveToHistory)
router.delete('/history/:id', reportController.deleteHistory)

module.exports = router

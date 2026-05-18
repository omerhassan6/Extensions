const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const path = require('path')

const app = express()

// Middleware
app.use(cors())
app.use(morgan('combined'))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Serve static files
app.use(express.static(path.join(__dirname, '../qa-ai-extension/dist')))

// Landing page route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../landing.html'))
})

// API Routes
app.use('/api', require('./routes'))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message,
    status: err.status || 500
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

module.exports = app

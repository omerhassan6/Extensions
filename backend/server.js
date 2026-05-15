require('dotenv').config()
const app = require('./app')

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || 'localhost'

const server = app.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   QA AI Assistant - Backend Server        ║
╚════════════════════════════════════════════╝
  ✓ Server running on http://${HOST}:${PORT}
  ✓ Environment: ${process.env.NODE_ENV || 'development'}
  ✓ Claude API: ${process.env.CLAUDE_API_KEY ? '✓ Configured' : '✗ Not configured'}
  `)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

module.exports = server

// Authentication utilities

exports.validateApiKey = (apiKey) => {
  if (!apiKey) {
    return false
  }

  const validKey = process.env.API_KEY
  if (!validKey) {
    return true // No validation key set, allow all
  }

  return apiKey === validKey
}

exports.generateToken = () => {
  return require('crypto').randomBytes(32).toString('hex')
}

module.exports = exports

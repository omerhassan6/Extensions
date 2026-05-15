const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
})

// Analyze screenshot for UI issues using Claude
exports.analyzeScreenshot = async (screenshot, pageUrl = '') => {
  try {
    if (!process.env.CLAUDE_API_KEY) {
      throw new Error('Claude API key not configured')
    }

    // Extract base64 from data URL
    const base64Image = screenshot.includes(',') 
      ? screenshot.split(',')[1] 
      : screenshot

    const prompt = `You are an expert QA engineer and UI designer. Analyze this screenshot for UI-related issues and problems.

Look for:
1. UI alignment problems
2. Pixel level inconsistencies
3. Spacing or layout issues
4. Responsive design issues
5. Overlapping elements
6. Broken or distorted UI components
7. Text truncation or visibility issues
8. Inconsistent styling or component behavior
9. Color contrast issues
10. Font rendering problems
11. Interactive element accessibility
12. Visual hierarchy issues

For each issue found, provide a JSON array with objects containing these fields:
- issue: Brief name of the issue
- severity: Low/Medium/High/Critical
- location: Approximate location (e.g., "top-left", "center", "bottom-right")
- description: Detailed description of what's wrong
- impact: How this affects users
- suggestedFix: Recommended solution

If no issues found, return an empty array: []

Return ONLY valid JSON, no other text.`

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64Image
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    
    // Parse JSON from response
    try {
      const issues = JSON.parse(responseText)
      return Array.isArray(issues) ? issues : []
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText)
      return []
    }
  } catch (error) {
    console.error('Analysis error:', error)
    throw error
  }
}

module.exports = exports

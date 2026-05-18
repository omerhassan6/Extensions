const Anthropic = require('@anthropic-ai/sdk')

const isDemoMode = () => process.env.DEMO_MODE === 'true' || !process.env.CLAUDE_API_KEY

const client = process.env.CLAUDE_API_KEY
  ? new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
  : null

const DEMO_ISSUES = [
  {
    issue: 'Button alignment misaligned',
    severity: 'High',
    location: 'Top navbar',
    description: 'Primary CTA buttons in the header are not vertically centered with their text labels.',
    impact: 'Creates a visually jarring layout that reduces perceived product quality.',
    suggestedFix: 'Apply flex align-items: center and verify line-height matches button height.'
  },
  {
    issue: 'Text truncation detected',
    severity: 'Medium',
    location: 'Product card',
    description: 'Long product titles are cut off at 280px without an ellipsis indicator.',
    impact: 'Users cannot read full product names, hurting comprehension.',
    suggestedFix: 'Add text-overflow: ellipsis; white-space: nowrap; overflow: hidden;'
  },
  {
    issue: 'Color contrast insufficient',
    severity: 'Medium',
    location: 'Footer links',
    description: 'Gray text on light background fails WCAG AA contrast ratio (3.8:1, needs 4.5:1).',
    impact: 'Hard to read for users with low vision; accessibility violation.',
    suggestedFix: 'Darken link color to #475569 or similar to reach 4.5:1.'
  },
  {
    issue: 'Spacing inconsistency',
    severity: 'Low',
    location: 'Card margins',
    description: 'Margins vary between similar components (16px vs 20px vs 24px).',
    impact: 'Subtle inconsistency reduces perceived polish.',
    suggestedFix: 'Standardize to a 4/8/16/24 spacing scale.'
  }
]

exports.analyzeScreenshot = async (screenshot, pageUrl = '') => {
  if (isDemoMode()) {
    return DEMO_ISSUES
  }

  try {
    const base64Image = screenshot.includes(',')
      ? screenshot.split(',')[1]
      : screenshot

    const prompt = `You are an expert QA engineer and UI designer. Analyze this screenshot for UI-related issues.

Look for: alignment, pixel-level inconsistencies, spacing, layout, responsive issues, overlapping elements, broken/distorted components, text truncation, inconsistent styling, color contrast, font rendering, accessibility, visual hierarchy.

For each issue, return a JSON array with objects:
- issue: brief name
- severity: Low|Medium|High|Critical
- location: approximate location
- description: detailed description
- impact: how it affects users
- suggestedFix: recommended solution

If no issues found, return [].

Page URL: ${pageUrl || 'Unknown'}

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
              source: { type: 'base64', media_type: 'image/png', data: base64Image }
            },
            { type: 'text', text: prompt }
          ]
        }
      ]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const match = responseText.match(/\[[\s\S]*\]/)
    if (!match) return []
    const issues = JSON.parse(match[0])
    return Array.isArray(issues) ? issues : []
  } catch (error) {
    console.error('Analysis error:', error)
    return DEMO_ISSUES
  }
}

module.exports = exports

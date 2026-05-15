class AIAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.anthropicApiUrl = 'https://api.anthropic.com/v1/messages';
  }

  async analyzeScreenshotForUIIssues(screenshot, metadata = {}) {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured');
    }

    try {
      // Convert screenshot to base64 if it's a data URL
      const base64Image = screenshot.includes(',')
        ? screenshot.split(',')[1]
        : screenshot;

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

For each issue found, provide:
- Issue name
- Severity (Low/Medium/High/Critical)
- Location (approximate coordinates if possible)
- Description
- Impact on users
- Suggested fix

Format your response as a JSON array of objects with these exact fields: issue, severity, location, description, impact, suggestedFix

If no issues are found, return: []`;

      const response = await fetch(this.anthropicApiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
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
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.content[0].text;

      // Parse JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('AI analysis error:', error);
      throw error;
    }
  }

  async generateBugTitle(screenshot, issueDescription) {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured');
    }

    try {
      const base64Image = screenshot.includes(',')
        ? screenshot.split(',')[1]
        : screenshot;

      const response = await fetch(this.anthropicApiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 100,
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
                  text: `Generate a concise, professional bug title (max 10 words) for this UI issue: ${issueDescription}. Only return the title, nothing else.`
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.content[0].text.trim();
    } catch (error) {
      console.error('Bug title generation error:', error);
      throw error;
    }
  }

  async generateDetailedBugDescription(screenshot, issues, metadata = {}) {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured');
    }

    try {
      const base64Image = screenshot.includes(',')
        ? screenshot.split(',')[1]
        : screenshot;

      const response = await fetch(this.anthropicApiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
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
                  text: `Generate a professional bug report for these UI issues: ${JSON.stringify(issues)}

Metadata: ${JSON.stringify(metadata)}

Create a response with:
1. Title: Professional bug title
2. Description: Detailed description of what's wrong
3. ExpectedBehavior: What should happen
4. ActualBehavior: What's happening instead
5. ReproductionSteps: Step-by-step to reproduce
6. Environment: Browser, OS, viewport size
7. Severity: Low/Medium/High/Critical

Format as JSON with these exact field names.`
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.content[0].text;

      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Bug description generation error:', error);
      throw error;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIAnalyzer;
}
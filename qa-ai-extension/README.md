# QA AI Browser Extension

A powerful Chrome extension that combines screenshot capture with AI-powered UI analysis to automatically generate detailed bug reports for QA testing.

## Features

- **Screenshot Capture**: Capture full-page screenshots of web applications
- **AI-Powered Analysis**: Uses Claude AI to analyze UI for potential issues
- **Automated Bug Reports**: Generates comprehensive bug reports with severity levels
- **Manual Analysis**: Upload and analyze screenshots manually
- **Report History**: Store and manage bug reports locally
- **Multiple Export Formats**: Export reports as JSON, Markdown, or API calls
- **Integration Ready**: Supports custom API endpoints for bug tracking systems

## Installation

### Development Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder

### Configuration

1. Click the extension icon and go to "Settings"
2. Enter your Claude AI API key (get one from [Anthropic](https://console.anthropic.com/))
3. Configure optional settings:
   - Bug tracking API endpoint
   - API token for authentication
   - Default bug priority

## Usage

### Capture & Analyze Tab

1. Navigate to the page you want to test
2. Click the extension icon
3. Click "Capture Screenshot"
4. Click "Analyze" to run AI analysis
5. Click "Generate Report" to create a bug report

### Manual Analysis Tab

1. Click "Choose File" to upload a screenshot
2. Click "Analyze" to run AI analysis
3. Click "Generate Report" to create a bug report

### History Tab

- View all previously generated bug reports
- Click "View" to see full report details
- Click "Clear History" to remove all reports

## Architecture

### Core Components

- **Popup Interface**: Main UI with three tabs (Capture, Manual, History)
- **Screenshot Handler**: Manages screenshot capture and image processing
- **AI Analyzer**: Integrates with Claude AI for UI analysis
- **Bug Formatter**: Formats reports in multiple output formats
- **API Generator**: Creates API calls for bug tracking integration

### File Structure

```
qa-ai-extension/
├── manifest.json          # Chrome extension manifest
├── src/
│   ├── popup.html         # Main popup interface
│   ├── popup.js           # Popup logic and event handlers
│   ├── options.html       # Settings page
│   ├── options.js         # Settings page logic
│   ├── background.js      # Service worker
│   └── content-script.js  # Content script for page interaction
├── services/
│   ├── ai-analyzer.js     # Claude AI integration
│   ├── bug-formatter.js   # Report formatting utilities
│   └── api-generator.js   # API request generation
├── dist/                  # Built extension files
└── webpack.config.js      # Build configuration
```

## API Integration

The extension supports integration with bug tracking systems through configurable API endpoints. It can generate:

- **CURL commands** for manual API testing
- **JavaScript fetch requests** for web applications
- **Python requests** for backend integration

### Example API Payload

```json
{
  "id": "bug-12345",
  "title": "Button text cutoff on mobile view",
  "severity": "Medium",
  "description": "The 'Submit' button text is being cut off on mobile devices...",
  "expectedBehavior": "Button text should be fully visible",
  "actualBehavior": "Button text is truncated",
  "reproductionSteps": [
    "Navigate to form page",
    "Resize browser to mobile width",
    "Observe button text cutoff"
  ],
  "environment": {
    "browser": "Chrome 120.0",
    "os": "Windows 11",
    "viewport": "375x667",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Development

### Build Commands

- `npm run build` - Production build
- `npm run dev` - Development build
- `npm run watch` - Watch mode for development

### Chrome Extension APIs Used

- `chrome.tabs` - Tab management and screenshot capture
- `chrome.storage` - Local and sync storage
- `chrome.scripting` - Content script injection
- `chrome.runtime` - Extension messaging
- `chrome.contextMenus` - Right-click context menu

## Privacy & Security

- API keys are stored locally using Chrome's secure storage
- Screenshots are processed locally and not sent to external servers
- Claude AI analysis is performed securely through Anthropic's API
- No user data is collected or transmitted without explicit configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
- Check the troubleshooting section below
- Open an issue on GitHub
- Review Chrome extension documentation

## Troubleshooting

### Common Issues

**Extension not loading:**
- Ensure all files are in the `dist` folder
- Check that manifest.json is valid JSON
- Verify Chrome developer mode is enabled

**Screenshot capture fails:**
- Check that you have permission to capture the current tab
- Ensure the page has finished loading
- Try refreshing the page

**AI analysis fails:**
- Verify your Claude API key is correct
- Check your internet connection
- Ensure you have sufficient API credits

**Settings not saving:**
- Check Chrome storage permissions
- Try clearing browser data
- Reinstall the extension
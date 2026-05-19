# QA AI Assistant - Browser Extension

An intelligent browser extension for QA engineers that captures screenshots and automatically generates comprehensive bug reports with AI-powered UI analysis.

## 🎯 Features

### Functionality 1: Automated UI Analysis
- **Screenshot Capture**: Capture screenshots of any web application instantly
- **AI-Powered Analysis**: Detect UI issues including:
  - UI alignment problems
  - Pixel-level inconsistencies
  - Spacing and layout issues
  - Responsive design problems
  - Overlapping elements
  - Broken/distorted components
  - Text truncation and visibility issues
  - Inconsistent styling
  - Color contrast issues
- **Automatic Bug Report Generation**:
  - Professional bug title
  - Detailed descriptions
  - Severity/priority classification
  - Screenshot with highlighted issue areas
  - Reproduction steps (when detectable)
  - Device/browser information

### Functionality 2: Manual Bug Reporting
- **Screenshot Upload**: Upload existing screenshots
- **Smart Report Generation**:
  - Automatic bug title creation
  - Clear description generation
  - Expected vs. actual results
  - Step-by-step reproduction guide
- **API Request Generation**:
  - CURL commands with proper formatting
  - Python code snippets
  - JavaScript fetch examples
  - Support for multiple platforms:
    - Jira
    - ClickUp
    - Custom APIs
    - Trello
  - Authentication token support
  - Proper headers and request formatting

## 📁 Project Structure

```
qa-ai-extension/
├── extension/                 # Browser Extension (Chrome/Firefox)
│   ├── public/               # Icons and static assets
│   ├── src/
│   │   ├── popup/            # Extension popup UI
│   │   │   ├── popup.html
│   │   │   ├── popup.tsx
│   │   │   ├── options.html
│   │   │   └── options.tsx
│   │   ├── background/       # Service worker
│   │   │   └── service-worker.ts
│   │   ├── content/          # Content scripts
│   │   │   └── content-script.ts
│   │   ├── components/       # React components
│   │   ├── services/         # Business logic
│   │   │   ├── screenshot.ts
│   │   │   └── analysis.ts
│   │   ├── utils/            # Utilities
│   │   │   └── storage.ts
│   │   └── types/            # TypeScript types
│   │       └── index.ts
│   ├── manifest.json
│   └── vite.config.ts
│
├── backend/                   # Node.js Backend
│   ├── controllers/           # Route handlers
│   │   ├── analysis.js
│   │   └── report.js
│   ├── routes/                # API routes
│   │   └── index.js
│   ├── services/              # Business logic
│   │   ├── analysis.js        # Claude AI integration
│   │   ├── report.js          # Report generation
│   │   └── api-generator.js   # CURL/API code generation
│   ├── prompts/               # AI prompts
│   ├── uploads/               # Screenshot storage
│   ├── utils/                 # Utilities
│   │   └── auth.js
│   ├── app.js                 # Express app setup
│   ├── server.js              # Server startup
│   ├── package.json
│   └── .env.example
│
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Claude API key (for AI analysis)
- Chrome or Firefox browser

### Installation

1. **Clone/Setup the project**
   ```bash
   cd qa-ai-extension
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env and add your Claude API key
   ```

3. **Install Extension Dependencies**
   ```bash
   cd ../extension
   npm install
   ```

4. **Build Backend**
   ```bash
   cd ../backend
   npm run build
   ```

5. **Build Extension**
   ```bash
   cd ../extension
   npm run build
   ```

## 🔧 Configuration

### Backend Setup (.env)


### Extension Setup

1. Open extension options (right-click extension → Options)
2. Configure:
   - **Claude API Key**: Required for AI analysis
   - **Backend URL**: `http://localhost:3000` (for local development)
   - **API Token**: Optional for backend authentication
   - **Screenshot Quality**: 1-100 (default: 90)

## 📦 Development

### Backend Development
```bash
cd backend
npm install
npm run dev
```
Server runs on `http://localhost:3000`

### Extension Development
```bash
cd extension
npm install
npm run dev
```

**Load in Chrome:**
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extension/dist` folder

## 🔗 API Endpoints

### Analysis
```
POST /api/analyze
Body: { screenshot: string, pageUrl?: string, apiKey: string }
Response: { success: boolean, issues: UIIssue[] }
```

### Report Generation
```
POST /api/generate-report
Body: { screenshot: string, issues: UIIssue[], metadata: object }
Response: { success: boolean, report: BugReport }
```

### API Request Generation
```
POST /api/generate-api-requests
Body: { report: BugReport, apiKey: string }
Response: { success: boolean, requests: { curl, python, javascript } }
```

## 📊 Data Structures

### UIIssue
```typescript
{
  id: string
  issue: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  location: string
  description: string
  impact: string
  suggestedFix: string
  coordinates?: { x, y, width, height }
}
```

### BugReport
```typescript
{
  id: string
  title: string
  description: string
  expectedBehavior: string
  actualBehavior: string
  reproductionSteps: string[]
  severity: string
  environment: {
    browser: string
    os: string
    viewport: string
    timestamp: string
  }
  screenshot: { data: string, annotated?: string }
  issues: UIIssue[]
  metadata: PageMetadata
}
```

## 🎓 Usage Workflow

### For Automated Analysis (Functionality 1)
1. Open any web application
2. Click extension → "Capture & Analyze"
3. Extension captures screenshot
4. AI analyzes for UI issues
5. Review detected issues
6. Click "Generate Bug Report"
7. Copy report or download as JSON
8. Generate CURL for API submission

### For Manual Reporting (Functionality 2)
1. Click extension → "Manual Report"
2. Upload screenshot or paste image
3. Extension analyzes the image
4. Review analysis results
5. Click "Generate Report"
6. Generate API requests (CURL/Python/JavaScript)
7. Copy and submit to your bug tracking system

## 🔐 Security

- API keys stored securely in Chrome storage
- Screenshots processed locally (only sent to Claude API)
- No data stored on extension servers by default
- Optional backend authentication via API tokens
- HTTPS recommended for production

## 🛠️ Building for Production

### Extension
```bash
cd extension
npm run build
# Creates dist/ folder ready for Chrome Web Store submission
```

### Backend
```bash
cd backend
npm run build
# Creates optimized build
```

## 📝 Customization

### Add Custom AI Prompts
Edit prompts in `backend/prompts/` directory

### Support Additional Platforms
Extend `backend/services/api-generator.js` with new platform handlers

### Modify Report Template
Update report generation in `backend/services/report.js`

## 🐛 Troubleshooting

**Extension not appearing?**
- Check if it's enabled in `chrome://extensions/`
- Try refreshing or reloading the extension

**Backend connection error?**
- Verify backend is running: `npm run dev`
- Check backend URL in extension settings
- Ensure CORS is configured

**Claude API errors?**
- Verify API key is valid
- Check Claude API quota
- Review error logs in backend console

**Screenshots not capturing?**
- Ensure extension has required permissions
- Try on different websites
- Check browser console for errors

## 📚 Dependencies

### Frontend (Extension)
- React 18+
- TypeScript
- Vite
- @crxjs/vite-plugin (for Chrome extension building)

### Backend
- Express.js
- @anthropic-ai/sdk (Claude API)
- dotenv
- cors
- morgan

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📄 License

MIT License - See LICENSE file for details

## 📞 Support

For issues, feature requests, or questions:
- Create an issue in the repository
- Check existing documentation
- Review API endpoint specs

## 🎯 Roadmap

- [ ] Firefox addon support
- [ ] Safari support
- [ ] Batch screenshot analysis
- [ ] Custom prompt templates
- [ ] Integration with Slack/Teams
- [ ] Desktop application
- [ ] Mobile app
- [ ] Advanced annotation tools
- [ ] Team collaboration features
- [ ] Report templates library

---

**Version**: 1.0.0  
**Last Updated**: May 2026  
**Status**: Production Ready

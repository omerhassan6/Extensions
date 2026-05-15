# Browser Extension for QA and UI Testing - Development Guide

## Project Overview

A browser extension (Chrome/Firefox) that enables QA engineers to capture screenshots and automatically analyze them for UI issues, then generate comprehensive bug reports with API submission support.

---

## Architecture Overview

```
Extension Structure
├── manifest.json                 # Extension configuration
├── src/
│   ├── content-script.js         # Injects into web pages
│   ├── background.js             # Service worker / background script
│   ├── popup.html                # Extension popup UI
│   ├── popup.js                  # Popup logic
│   ├── popup.css                 # Popup styling
│   ├── options.html              # Settings page
│   ├── options.js                # Settings logic
│   ├── screenshot-handler.js     # Screenshot capture logic
│   └── bug-report-generator.js   # Bug analysis and report generation
├── services/
│   ├── ai-analyzer.js            # AI-powered UI analysis (using Claude API)
│   ├── bug-formatter.js          # Bug report formatting
│   └── api-generator.js          # CURL request generation
├── assets/
│   ├── icons/
│   │   ├── icon-16.png
│   │   ├── icon-48.png
│   │   ├── icon-128.png
│   │   └── icon-256.png
│   └── styles/
│       └── common.css
└── README.md
```

---

## Phase 1: Project Setup

### Step 1.1: Create Project Directory
```bash
mkdir qa-extension
cd qa-extension
npm init -y
```

### Step 1.2: Install Dependencies
```bash
npm install axios dotenv
npm install -D webpack webpack-cli copy-webpack-plugin
```

### Step 1.3: Create Directory Structure
```bash
mkdir -p src services assets/icons assets/styles
```

### Step 1.4: Create .gitignore
```
node_modules/
dist/
.env
.DS_Store
```

---

## Phase 2: Manifest Configuration

### Step 2.1: Create manifest.json (Manifest V3 for Chrome)

**File: `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "QA UI Analyzer & Bug Reporter",
  "version": "1.0.0",
  "description": "Capture screenshots and auto-generate bug reports with UI analysis",
  "icons": {
    "16": "assets/icons/icon-16.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png",
    "256": "assets/icons/icon-256.png"
  },
  "permissions": [
    "scripting",
    "activeTab",
    "storage",
    "tabs",
    "clipboardWrite"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "src/popup.html",
    "default_title": "QA Analyzer"
  },
  "background": {
    "service_worker": "src/background.js"
  },
  "options_page": "src/options.html",
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content-script.js"],
      "run_at": "document_start"
    }
  ]
}
```

---

## Phase 3: Core UI Components

### Step 3.1: Popup HTML (src/popup.html)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h2>QA Bug Reporter</h2>
    
    <!-- Tab Navigation -->
    <div class="tabs">
      <button class="tab-btn active" data-tab="capture">Capture & Analyze</button>
      <button class="tab-btn" data-tab="manual">Manual Report</button>
      <button class="tab-btn" data-tab="history">History</button>
    </div>

    <!-- Tab 1: Capture & Analyze -->
    <div id="capture" class="tab-content active">
      <button id="captureBtn" class="primary-btn">📸 Capture Screenshot</button>
      <div id="captureStatus" class="status"></div>
      <canvas id="previewCanvas" style="max-width: 100%; border: 1px solid #ddd; margin-top: 10px; display: none;"></canvas>
      <button id="analyzeBtn" class="primary-btn" style="display: none; margin-top: 10px;">🔍 Analyze for UI Issues</button>
      <div id="analysisResult" class="result-box" style="display: none;"></div>
      <button id="generateReportBtn" class="secondary-btn" style="display: none;">📋 Generate Bug Report</button>
    </div>

    <!-- Tab 2: Manual Report -->
    <div id="manual" class="tab-content" style="display: none;">
      <input type="file" id="imageUpload" accept="image/*" placeholder="Upload image">
      <div id="manualPreview" style="max-width: 100%; border: 1px solid #ddd; margin-top: 10px; display: none;"></div>
      <button id="analyzeManualBtn" class="primary-btn" style="display: none; margin-top: 10px;">🔍 Analyze Image</button>
      <div id="manualAnalysisResult" class="result-box" style="display: none;"></div>
      <button id="generateManualReportBtn" class="secondary-btn" style="display: none;">📋 Generate Report</button>
    </div>

    <!-- Tab 3: History -->
    <div id="history" class="tab-content" style="display: none;">
      <div id="reportHistory" class="history-list"></div>
      <button id="clearHistoryBtn" class="danger-btn">🗑️ Clear History</button>
    </div>

    <!-- Generated Report Modal -->
    <div id="reportModal" class="modal" style="display: none;">
      <div class="modal-content">
        <span class="close">&times;</span>
        <h3>Generated Bug Report</h3>
        <div id="reportContent" class="report-content"></div>
        <button id="copyReportBtn" class="primary-btn">📋 Copy Report</button>
        <button id="copyCurlBtn" class="primary-btn">🔗 Copy CURL Request</button>
        <button id="downloadReportBtn" class="secondary-btn">⬇️ Download as JSON</button>
      </div>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

### Step 3.2: Popup CSS (src/popup.css)

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 500px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.container {
  padding: 16px;
}

h2 {
  margin-bottom: 16px;
  color: #1a1a1a;
  font-size: 18px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 2px solid #e0e0e0;
}

.tab-btn {
  padding: 10px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
}

.tab-btn.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.tab-content {
  display: none;
  animation: fadeIn 0.3s;
}

.tab-content.active {
  display: block;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Buttons */
.primary-btn, .secondary-btn, .danger-btn {
  width: 100%;
  padding: 12px;
  margin-top: 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
}

.primary-btn {
  background: #2563eb;
  color: white;
}

.primary-btn:hover {
  background: #1d4ed8;
}

.secondary-btn {
  background: #6b7280;
  color: white;
}

.secondary-btn:hover {
  background: #4b5563;
}

.danger-btn {
  background: #dc2626;
  color: white;
}

.danger-btn:hover {
  background: #b91c1c;
}

/* Status & Results */
.status {
  padding: 10px;
  margin-top: 10px;
  border-radius: 4px;
  font-size: 13px;
  display: none;
}

.status.success {
  background: #d1fae5;
  color: #065f46;
  display: block;
}

.status.error {
  background: #fee2e2;
  color: #7f1d1d;
  display: block;
}

.status.loading {
  background: #dbeafe;
  color: #0c4a6e;
  display: block;
}

.result-box {
  background: white;
  padding: 12px;
  margin-top: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.result-item {
  padding: 8px;
  margin-bottom: 8px;
  background: #f9fafb;
  border-left: 3px solid #2563eb;
  border-radius: 4px;
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: none;
  z-index: 1000;
}

.modal.show {
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.close {
  position: absolute;
  top: 10px;
  right: 15px;
  cursor: pointer;
  font-size: 24px;
}

.report-content {
  background: #f9fafb;
  padding: 12px;
  border-radius: 4px;
  margin: 12px 0;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  max-height: 400px;
  overflow-y: auto;
}

/* File Input */
input[type="file"] {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  border: 2px dashed #d1d5db;
  border-radius: 6px;
  cursor: pointer;
}

#manualPreview {
  width: 100%;
  display: none;
}

.history-list {
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  padding: 10px;
  margin-bottom: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-item-time {
  font-size: 12px;
  color: #6b7280;
}

.history-item-title {
  font-weight: 600;
  margin-bottom: 4px;
}
```

### Step 3.3: Options Page (src/options.html)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
    }
    h1 { color: #1a1a1a; }
    .setting-group {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
    }
    input, textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-family: monospace;
    }
    button {
      padding: 10px 20px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 10px;
    }
    button:hover { background: #1d4ed8; }
    .status-message {
      padding: 10px;
      margin-top: 10px;
      border-radius: 4px;
    }
    .success { background: #d1fae5; color: #065f46; }
    .error { background: #fee2e2; color: #7f1d1d; }
  </style>
</head>
<body>
  <h1>QA Analyzer Settings</h1>

  <div class="setting-group">
    <label>Claude API Key</label>
    <input type="password" id="apiKey" placeholder="sk-...">
    <small>Used for AI-powered UI analysis</small>
  </div>

  <div class="setting-group">
    <label>Bug Tracking API Endpoint</label>
    <input type="text" id="bugApiEndpoint" placeholder="https://api.example.com/bugs">
    <small>URL for submitting bug reports via API</small>
  </div>

  <div class="setting-group">
    <label>API Authentication Token</label>
    <input type="password" id="apiToken" placeholder="Bearer token or API key">
    <small>Authentication for bug tracking API</small>
  </div>

  <div class="setting-group">
    <label>Default Bug Priority</label>
    <select id="bugPriority">
      <option value="low">Low</option>
      <option value="medium" selected>Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
    </select>
  </div>

  <div class="setting-group">
    <label>Screenshot Quality (1-100)</label>
    <input type="number" id="screenshotQuality" min="1" max="100" value="90">
  </div>

  <button id="saveBtn">💾 Save Settings</button>
  <div id="statusMessage"></div>

  <script src="options.js"></script>
</body>
</html>
```

---

## Phase 4: Core Functionality - Screenshot Capture

### Step 4.1: Content Script (src/content-script.js)

```javascript
// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureScreenshot') {
    captureScreenshot(sendResponse);
  }
});

async function captureScreenshot(sendResponse) {
  try {
    // Get current tab
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab[0]) {
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }

    // Use chrome.tabs.captureVisibleTab
    const dataUrl = await chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {
      format: 'png',
      quality: 90
    });

    // Get page metadata
    const pageMetadata = {
      url: tab[0].url,
      title: tab[0].title,
      timestamp: new Date().toISOString(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio
    };

    sendResponse({
      success: true,
      screenshot: dataUrl,
      metadata: pageMetadata
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
```

### Step 4.2: Background Service Worker (src/background.js)

```javascript
// Handle screenshot capture
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureTab') {
    chrome.tabs.captureVisibleTab({ format: 'png', quality: 90 })
      .then(screenshot => {
        sendResponse({
          success: true,
          screenshot: screenshot,
          tabInfo: {
            id: sender.tab.id,
            url: sender.tab.url,
            title: sender.tab.title
          }
        });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'saveToStorage') {
    chrome.storage.local.set({ [request.key]: request.value });
    sendResponse({ success: true });
  }

  if (request.action === 'getFromStorage') {
    chrome.storage.local.get(request.key, (data) => {
      sendResponse({ success: true, data: data[request.key] });
    });
    return true;
  }
});

// Context menu for screenshot
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'capture-screenshot',
    title: 'Capture & Analyze Screenshot',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'capture-screenshot') {
    chrome.tabs.captureVisibleTab()
      .then(screenshot => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'screenshotCaptured',
          screenshot: screenshot
        });
      });
  }
});
```

---

## Phase 5: Screenshot Handler

### Step 5.1: Screenshot Handler (src/screenshot-handler.js)

```javascript
class ScreenshotHandler {
  constructor() {
    this.currentScreenshot = null;
    this.currentMetadata = null;
  }

  async captureScreenshot() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
          reject(new Error('No active tab'));
          return;
        }

        chrome.tabs.captureVisibleTab(tabs[0].windowId, { format: 'png', quality: 90 })
          .then(dataUrl => {
            this.currentScreenshot = dataUrl;
            this.currentMetadata = {
              url: tabs[0].url,
              title: tabs[0].title,
              timestamp: new Date().toISOString(),
              tabId: tabs[0].id,
              userAgent: navigator.userAgent
            };
            resolve({
              screenshot: dataUrl,
              metadata: this.currentMetadata
            });
          })
          .catch(reject);
      });
    });
  }

  async uploadScreenshot(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.currentScreenshot = e.target.result;
        this.currentMetadata = {
          filename: file.name,
          filesize: file.size,
          filetype: file.type,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        };
        resolve(this.currentScreenshot);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  getCurrentScreenshot() {
    return this.currentScreenshot;
  }

  getCurrentMetadata() {
    return this.currentMetadata;
  }

  canvasToImage(canvas) {
    return canvas.toDataURL('image/png');
  }

  drawBoxOnScreenshot(x, y, width, height, color = 'red', thickness = 2) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0);
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.strokeRect(x, y, width, height);

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = this.currentScreenshot;
    });
  }

  async drawMultipleBoxes(boxes) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0);

        boxes.forEach(box => {
          ctx.strokeStyle = box.color || 'red';
          ctx.lineWidth = box.thickness || 2;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          // Add label if provided
          if (box.label) {
            ctx.fillStyle = box.color || 'red';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(box.label, box.x + 5, box.y - 5);
          }
        });

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = this.currentScreenshot;
    });
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScreenshotHandler;
}
```

---

## Phase 6: AI-Powered Bug Analysis

### Step 6.1: AI Analyzer Service (services/ai-analyzer.js)

```javascript
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
```

---

## Phase 7: Bug Report Generation

### Step 7.1: Bug Formatter (services/bug-formatter.js)

```javascript
class BugFormatter {
  static formatAsMarkdown(bugReport) {
    return `# Bug Report: ${bugReport.title}

## Description
${bugReport.description}

## Expected Behavior
${bugReport.expectedBehavior}

## Actual Behavior
${bugReport.actualBehavior}

## Reproduction Steps
${bugReport.reproductionSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Environment
- Browser: ${bugReport.environment.browser}
- OS: ${bugReport.environment.os}
- Viewport: ${bugReport.environment.viewport}
- Device Pixel Ratio: ${bugReport.environment.devicePixelRatio}

## Severity
${bugReport.severity}

## Affected Area
${bugReport.affectedArea || 'N/A'}

---
Generated by QA Analyzer Extension on ${new Date().toISOString()}`;
  }

  static formatAsJSON(bugReport) {
    return JSON.stringify(bugReport, null, 2);
  }

  static formatAsJiraMarkdown(bugReport) {
    return `h1. ${bugReport.title}

h2. Description
${bugReport.description}

h2. Expected Result
${bugReport.expectedBehavior}

h2. Actual Result
${bugReport.actualBehavior}

h2. Steps to Reproduce
${bugReport.reproductionSteps.map((step, i) => `# Step ${i + 1}: ${step}`).join('\n')}

h2. Environment
* Browser: ${bugReport.environment.browser}
* OS: ${bugReport.environment.os}
* Viewport: ${bugReport.environment.viewport}

h2. Priority
${bugReport.severity}`;
  }

  static formatForClickUp(bugReport) {
    return {
      name: bugReport.title,
      description: bugReport.description,
      priority: this.mapSeverityToPriority(bugReport.severity),
      custom_fields: {
        expected_result: bugReport.expectedBehavior,
        actual_result: bugReport.actualBehavior,
        steps_to_reproduce: bugReport.reproductionSteps.join('\n'),
        browser: bugReport.environment.browser,
        os: bugReport.environment.os
      }
    };
  }

  static mapSeverityToPriority(severity) {
    const map = {
      'Critical': 1,
      'High': 2,
      'Medium': 3,
      'Low': 4
    };
    return map[severity] || 3;
  }

  static createCompleteReport(analysisData, metadata = {}) {
    return {
      id: this.generateUUID(),
      title: analysisData.title || 'UI Issue Found',
      description: analysisData.description || '',
      expectedBehavior: analysisData.expectedBehavior || '',
      actualBehavior: analysisData.actualBehavior || '',
      reproductionSteps: analysisData.reproductionSteps || [],
      severity: analysisData.severity || 'Medium',
      environment: {
        browser: metadata.userAgent || 'Unknown',
        os: this.detectOS(metadata.userAgent),
        viewport: metadata.viewport || 'Unknown',
        devicePixelRatio: metadata.devicePixelRatio || 1,
        timestamp: new Date().toISOString()
      },
      screenshot: {
        data: analysisData.screenshot || null,
        annotated: analysisData.annotatedScreenshot || null
      },
      issues: analysisData.issues || [],
      metadata: metadata
    };
  }

  static detectOS(userAgent) {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone')) return 'iOS';
    return 'Unknown';
  }

  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BugFormatter;
}
```

---

## Phase 8: API Request Generation

### Step 8.1: CURL Request Generator (services/api-generator.js)

```javascript
class APIGenerator {
  static generateCurlForJira(bugReport, jiraBaseUrl, authToken) {
    const payload = {
      fields: {
        project: { key: 'QA' },
        summary: bugReport.title,
        description: this.formatJiraDescription(bugReport),
        priority: { name: this.mapSeverityToJiraPriority(bugReport.severity) },
        issuetype: { name: 'Bug' },
        labels: ['ui-bug', 'auto-generated'],
        customfield_10000: bugReport.environment.browser,
        customfield_10001: bugReport.environment.os
      }
    };

    return this.generateCurl(
      `${jiraBaseUrl}/rest/api/3/issues`,
      'POST',
      payload,
      {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    );
  }

  static generateCurlForClickUp(bugReport, listId, authToken) {
    const payload = {
      name: bugReport.title,
      description: bugReport.description,
      priority: this.mapSeverityToPriority(bugReport.severity),
      custom_fields: [
        {
          id: 'expected_result',
          value: bugReport.expectedBehavior
        },
        {
          id: 'actual_result',
          value: bugReport.actualBehavior
        }
      ]
    };

    return this.generateCurl(
      `https://api.clickup.com/api/v2/list/${listId}/task`,
      'POST',
      payload,
      {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      }
    );
  }

  static generateCurlForCustomAPI(bugReport, endpoint, authToken, method = 'POST') {
    const payload = {
      title: bugReport.title,
      description: bugReport.description,
      severity: bugReport.severity,
      expectedBehavior: bugReport.expectedBehavior,
      actualBehavior: bugReport.actualBehavior,
      reproductionSteps: bugReport.reproductionSteps,
      environment: bugReport.environment,
      timestamp: new Date().toISOString()
    };

    return this.generateCurl(
      endpoint,
      method,
      payload,
      {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    );
  }

  static generateCurl(url, method = 'POST', data = null, headers = {}) {
    let curl = `curl -X ${method} "${url}"`;

    // Add headers
    Object.entries(headers).forEach(([key, value]) => {
      curl += ` \\\n  -H "${key}: ${value}"`;
    });

    // Add data
    if (data) {
      const jsonData = JSON.stringify(data);
      curl += ` \\\n  -d '${jsonData}'`;
    }

    return curl;
  }

  static generatePythonRequest(bugReport, endpoint, authToken) {
    const pythonCode = `import requests
import json

url = "${endpoint}"
headers = {
    "Authorization": "Bearer ${authToken}",
    "Content-Type": "application/json"
}

payload = ${JSON.stringify({
      title: bugReport.title,
      description: bugReport.description,
      severity: bugReport.severity,
      expectedBehavior: bugReport.expectedBehavior,
      actualBehavior: bugReport.actualBehavior,
      reproductionSteps: bugReport.reproductionSteps,
      environment: bugReport.environment
    }, null, 2)}

response = requests.post(url, headers=headers, json=payload)
print(f"Status: {response.status_code}")
print(json.dumps(response.json(), indent=2))`;

    return pythonCode;
  }

  static generateJavaScriptFetch(bugReport, endpoint, authToken) {
    const jsCode = `fetch("${endpoint}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${authToken}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    title: "${bugReport.title.replace(/"/g, '\\"')}",
    description: "${bugReport.description.replace(/"/g, '\\"')}",
    severity: "${bugReport.severity}",
    expectedBehavior: "${bugReport.expectedBehavior.replace(/"/g, '\\"')}",
    actualBehavior: "${bugReport.actualBehavior.replace(/"/g, '\\"')}",
    reproductionSteps: ${JSON.stringify(bugReport.reproductionSteps)},
    environment: ${JSON.stringify(bugReport.environment)}
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error("Error:", error));`;

    return jsCode;
  }

  static mapSeverityToJiraPriority(severity) {
    const map = {
      'Critical': 'Blocker',
      'High': 'High',
      'Medium': 'Medium',
      'Low': 'Low'
    };
    return map[severity] || 'Medium';
  }

  static mapSeverityToPriority(severity) {
    const map = {
      'Critical': 1,
      'High': 2,
      'Medium': 3,
      'Low': 4
    };
    return map[severity] || 3;
  }

  static formatJiraDescription(bugReport) {
    return `*Expected Behavior:*
${bugReport.expectedBehavior}

*Actual Behavior:*
${bugReport.actualBehavior}

*Steps to Reproduce:*
${bugReport.reproductionSteps.map((step, i) => `# ${step}`).join('\n')}

*Environment:*
* Browser: ${bugReport.environment.browser}
* OS: ${bugReport.environment.os}
* Viewport: ${bugReport.environment.viewport}`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIGenerator;
}
```

---

## Phase 9: Popup Logic

### Step 9.1: Popup JavaScript (src/popup.js)

```javascript
// Initialize
const screenshotHandler = new ScreenshotHandler();
let analyzerInstance = null;

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const tabName = e.target.dataset.tab;
    switchTab(tabName);
  });
});

function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active from buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');
}

// ==================== CAPTURE & ANALYZE TAB ====================

document.getElementById('captureBtn').addEventListener('click', async () => {
  showStatus('Capturing screenshot...', 'loading');
  document.getElementById('analyzeBtn').style.display = 'none';
  document.getElementById('generateReportBtn').style.display = 'none';

  try {
    const result = await screenshotHandler.captureScreenshot();
    
    // Display preview
    const canvas = document.getElementById('previewCanvas');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.style.display = 'block';
    };
    img.src = result.screenshot;

    showStatus('✓ Screenshot captured successfully', 'success');
    document.getElementById('analyzeBtn').style.display = 'block';
  } catch (error) {
    showStatus(`✗ Error: ${error.message}`, 'error');
  }
});

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  showStatus('Analyzing screenshot...', 'loading');
  
  try {
    // Get API key from storage
    const settings = await getSettings();
    if (!settings.apiKey) {
      showStatus('✗ Claude API key not configured. Check settings.', 'error');
      return;
    }

    // Initialize analyzer
    analyzerInstance = new AIAnalyzer(settings.apiKey);

    const screenshot = screenshotHandler.getCurrentScreenshot();
    const metadata = screenshotHandler.getCurrentMetadata();

    // Analyze
    const issues = await analyzerInstance.analyzeScreenshotForUIIssues(screenshot, metadata);

    // Display results
    const resultDiv = document.getElementById('analysisResult');
    if (issues.length === 0) {
      resultDiv.innerHTML = '<p style="color: #065f46;">✓ No UI issues detected</p>';
    } else {
      let html = `<p><strong>Found ${issues.length} issue(s):</strong></p>`;
      issues.forEach((issue, i) => {
        html += `<div class="result-item">
          <strong>${i + 1}. ${issue.issue}</strong>
          <div style="font-size: 12px; color: #666; margin-top: 5px;">
            <div>Severity: <span style="color: ${getSeverityColor(issue.severity)}">${issue.severity}</span></div>
            <div>Location: ${issue.location}</div>
            <div>Impact: ${issue.impact}</div>
          </div>
        </div>`;
      });
      resultDiv.innerHTML = html;
    }
    resultDiv.style.display = 'block';
    document.getElementById('generateReportBtn').style.display = 'block';
    showStatus('✓ Analysis complete', 'success');
  } catch (error) {
    showStatus(`✗ Analysis error: ${error.message}`, 'error');
  }
});

document.getElementById('generateReportBtn').addEventListener('click', async () => {
  showStatus('Generating report...', 'loading');
  
  try {
    const settings = await getSettings();
    const screenshot = screenshotHandler.getCurrentScreenshot();
    const metadata = screenshotHandler.getCurrentMetadata();

    const issues = await analyzerInstance.analyzeScreenshotForUIIssues(screenshot, metadata);
    
    const bugReport = await analyzerInstance.generateDetailedBugDescription(
      screenshot,
      issues,
      metadata
    );

    // Format report
    const formattedReport = BugFormatter.createCompleteReport(bugReport, metadata);
    
    // Store in history
    await saveToHistory(formattedReport);

    // Show modal
    displayReport(formattedReport, settings);
  } catch (error) {
    showStatus(`✗ Report generation error: ${error.message}`, 'error');
  }
});

// ==================== MANUAL REPORT TAB ====================

document.getElementById('imageUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const imageData = await screenshotHandler.uploadScreenshot(file);
    
    // Display preview
    const preview = document.getElementById('manualPreview');
    const img = document.createElement('img');
    img.src = imageData;
    preview.innerHTML = '';
    preview.appendChild(img);
    preview.style.display = 'block';

    document.getElementById('analyzeManualBtn').style.display = 'block';
    showStatus('✓ Image loaded', 'success');
  } catch (error) {
    showStatus(`✗ Error loading image: ${error.message}`, 'error');
  }
});

document.getElementById('analyzeManualBtn').addEventListener('click', async () => {
  showStatus('Analyzing manual image...', 'loading');

  try {
    const settings = await getSettings();
    if (!settings.apiKey) {
      showStatus('✗ Claude API key not configured', 'error');
      return;
    }

    analyzerInstance = new AIAnalyzer(settings.apiKey);
    const screenshot = screenshotHandler.getCurrentScreenshot();
    const metadata = screenshotHandler.getCurrentMetadata();

    const issues = await analyzerInstance.analyzeScreenshotForUIIssues(screenshot, metadata);

    const resultDiv = document.getElementById('manualAnalysisResult');
    if (issues.length === 0) {
      resultDiv.innerHTML = '<p style="color: #065f46;">✓ No issues detected</p>';
    } else {
      let html = `<p><strong>Found ${issues.length} issue(s):</strong></p>`;
      issues.forEach((issue, i) => {
        html += `<div class="result-item">
          <strong>${i + 1}. ${issue.issue}</strong>
          <div style="font-size: 12px; color: #666; margin-top: 5px;">
            <div>Severity: <span style="color: ${getSeverityColor(issue.severity)}">${issue.severity}</span></div>
            <div>${issue.description}</div>
          </div>
        </div>`;
      });
      resultDiv.innerHTML = html;
    }
    resultDiv.style.display = 'block';
    document.getElementById('generateManualReportBtn').style.display = 'block';
    showStatus('✓ Analysis complete', 'success');
  } catch (error) {
    showStatus(`✗ Error: ${error.message}`, 'error');
  }
});

document.getElementById('generateManualReportBtn').addEventListener('click', async () => {
  showStatus('Generating bug report...', 'loading');

  try {
    const settings = await getSettings();
    const screenshot = screenshotHandler.getCurrentScreenshot();
    const metadata = screenshotHandler.getCurrentMetadata();

    const issues = await analyzerInstance.analyzeScreenshotForUIIssues(screenshot, metadata);
    const bugReport = await analyzerInstance.generateDetailedBugDescription(
      screenshot,
      issues,
      metadata
    );

    const formattedReport = BugFormatter.createCompleteReport(bugReport, metadata);
    await saveToHistory(formattedReport);

    displayReport(formattedReport, settings);
    showStatus('✓ Report generated', 'success');
  } catch (error) {
    showStatus(`✗ Error: ${error.message}`, 'error');
  }
});

// ==================== HISTORY TAB ====================

document.getElementById('clearHistoryBtn').addEventListener('click', async () => {
  if (confirm('Clear all bug reports from history?')) {
    await chrome.storage.local.set({ reportHistory: [] });
    loadHistory();
    showStatus('✓ History cleared', 'success');
  }
});

// ==================== HELPER FUNCTIONS ====================

function showStatus(message, type = 'info') {
  const status = document.getElementById('captureStatus') || document.getElementById('manualStatus');
  if (!status) return;
  
  status.textContent = message;
  status.className = `status ${type}`;
}

function getSeverityColor(severity) {
  const colors = {
    'Critical': '#dc2626',
    'High': '#f97316',
    'Medium': '#eab308',
    'Low': '#22c55e'
  };
  return colors[severity] || '#6b7280';
}

function displayReport(report, settings) {
  const modal = document.getElementById('reportModal');
  const reportContent = document.getElementById('reportContent');

  // Format report for display
  const formatted = `
TITLE: ${report.title}
SEVERITY: ${report.severity}
DESCRIPTION: ${report.description}

EXPECTED BEHAVIOR:
${report.expectedBehavior}

ACTUAL BEHAVIOR:
${report.actualBehavior}

REPRODUCTION STEPS:
${report.reproductionSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

ENVIRONMENT:
- Browser: ${report.environment.browser}
- OS: ${report.environment.os}
- Viewport: ${report.environment.viewport}
- Timestamp: ${report.environment.timestamp}
  `;

  reportContent.textContent = formatted;

  // Setup buttons
  document.getElementById('copyReportBtn').onclick = () => {
    navigator.clipboard.writeText(formatted);
    showStatus('✓ Report copied to clipboard', 'success');
  };

  document.getElementById('copyCurlBtn').onclick = () => {
    const curl = APIGenerator.generateCurlForCustomAPI(
      report,
      settings.bugApiEndpoint || 'https://api.example.com/bugs',
      settings.apiToken || 'YOUR_TOKEN'
    );
    navigator.clipboard.writeText(curl);
    showStatus('✓ CURL copied to clipboard', 'success');
  };

  document.getElementById('downloadReportBtn').onclick = () => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bug-report-${report.id}.json`;
    link.click();
    showStatus('✓ Report downloaded', 'success');
  };

  document.querySelector('.close').onclick = () => {
    modal.style.display = 'none';
  };

  modal.style.display = 'flex';
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      apiKey: '',
      bugApiEndpoint: '',
      apiToken: '',
      bugPriority: 'medium'
    }, resolve);
  });
}

async function saveToHistory(report) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ reportHistory: [] }, (data) => {
      const history = data.reportHistory || [];
      history.unshift({
        id: report.id,
        title: report.title,
        severity: report.severity,
        timestamp: new Date().toISOString(),
        fullReport: report
      });
      
      // Keep only last 50 reports
      if (history.length > 50) {
        history.pop();
      }

      chrome.storage.local.set({ reportHistory: history }, resolve);
    });
  });
}

async function loadHistory() {
  const data = await new Promise((resolve) => {
    chrome.storage.local.get({ reportHistory: [] }, resolve);
  });

  const historyDiv = document.getElementById('reportHistory');
  const history = data.reportHistory || [];

  if (history.length === 0) {
    historyDiv.innerHTML = '<p style="color: #999;">No reports yet</p>';
    return;
  }

  historyDiv.innerHTML = history.map(item => `
    <div class="history-item">
      <div>
        <div class="history-item-title">${item.title}</div>
        <div class="history-item-time">${new Date(item.timestamp).toLocaleString()}</div>
      </div>
      <button onclick="viewHistoryReport('${item.id}')" style="padding: 5px 10px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">View</button>
    </div>
  `).join('');
}

window.viewHistoryReport = async (reportId) => {
  const data = await new Promise((resolve) => {
    chrome.storage.local.get({ reportHistory: [] }, resolve);
  });

  const report = data.reportHistory.find(r => r.id === reportId);
  if (report) {
    const settings = await getSettings();
    displayReport(report.fullReport, settings);
  }
};

// Load history on popup open
loadHistory();
```

### Step 9.2: Options Page Script (src/options.js)

```javascript
// Save settings
document.getElementById('saveBtn').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value;
  const bugApiEndpoint = document.getElementById('bugApiEndpoint').value;
  const apiToken = document.getElementById('apiToken').value;
  const bugPriority = document.getElementById('bugPriority').value;
  const screenshotQuality = document.getElementById('screenshotQuality').value;

  chrome.storage.sync.set({
    apiKey,
    bugApiEndpoint,
    apiToken,
    bugPriority,
    screenshotQuality: parseInt(screenshotQuality)
  }, () => {
    const status = document.getElementById('statusMessage');
    status.textContent = '✓ Settings saved successfully';
    status.className = 'status-message success';
    setTimeout(() => {
      status.textContent = '';
    }, 3000);
  });
});

// Load settings
chrome.storage.sync.get({
  apiKey: '',
  bugApiEndpoint: '',
  apiToken: '',
  bugPriority: 'medium',
  screenshotQuality: 90
}, (items) => {
  document.getElementById('apiKey').value = items.apiKey;
  document.getElementById('bugApiEndpoint').value = items.bugApiEndpoint;
  document.getElementById('apiToken').value = items.apiToken;
  document.getElementById('bugPriority').value = items.bugPriority;
  document.getElementById('screenshotQuality').value = items.screenshotQuality;
});
```

---

## Phase 10: Build & Packaging

### Step 10.1: Create webpack.config.js

```javascript
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    popup: './src/popup.js',
    options: './src/options.js',
    background: './src/background.js',
    'content-script': './src/content-script.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'src/popup.html', to: 'src/popup.html' },
        { from: 'src/options.html', to: 'src/options.html' },
        { from: 'services/**/*', to: '.' },
        { from: 'assets/**/*', to: '.' }
      ]
    })
  ]
};
```

### Step 10.2: Update package.json scripts

```json
{
  "scripts": {
    "build": "webpack",
    "watch": "webpack --watch",
    "dev": "webpack --mode development --watch"
  }
}
```

---

## Phase 11: Installation & Testing

### Step 11.1: Build Extension
```bash
npm run build
```

### Step 11.2: Load in Chrome
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

### Step 11.3: Configuration
1. Right-click extension icon → Options
2. Enter Claude API key
3. Configure bug tracking API endpoint
4. Save settings

---

## Phase 12: Testing Checklist

- [ ] Screenshot capture works
- [ ] UI analysis detects issues accurately
- [ ] Bug reports generate correctly
- [ ] History saves and loads
- [ ] Settings persist
- [ ] API generation works
- [ ] Manual upload functions
- [ ] Copy-to-clipboard works
- [ ] File download works
- [ ] Error handling functions

---

## Implementation Priority

1. **MVP (Week 1)**
   - Screenshot capture
   - Basic UI analysis
   - Report generation

2. **Phase 2 (Week 2)**
   - API request generation
   - History tracking
   - Settings management

3. **Phase 3 (Week 3)**
   - Multi-platform support
   - Advanced annotations
   - Batch processing

---

## Dependencies

- Claude API (for AI analysis)
- Chrome Extensions API
- HTML5 Canvas API
- Fetch API

---

## Notes

- All API keys should be stored securely using Chrome storage
- Screenshots are processed locally; no data is sent except to Claude API
- Reports can be exported as JSON or formatted for various platforms
- CURL requests are auto-generated with proper formatting


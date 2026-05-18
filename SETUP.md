# QA Reporter — Complete Setup Guide

## 📁 Project Structure

```
Extension/
├── landing.html                    # Beautiful landing page
├── qa-ai-extension/
│   ├── src/
│   │   ├── popup.html             # Modern popup UI
│   │   ├── popup.css              # Design system
│   │   ├── popup.js               # Logic (server/demo/API modes)
│   │   ├── options.html           # Settings page with server mode toggle
│   │   └── manifest.json          # Extension config
│   ├── package.json               # Build config
│   └── dist/                      # Compiled extension
└── backend/
    ├── server.js                  # Express server
    └── app.js                     # API endpoints
```

---

## 🎯 Three Ways to Use the Extension

### **1. DEMO MODE (No API Key Required!)**
- Works instantly without any setup
- Shows sample bug report data
- Perfect for trials and demos
- **Default mode** when no keys configured

### **2. SERVER MODE (Recommended)**
- Your backend handles AI analysis
- Users don't need API keys
- More scalable and secure
- Settings: Enable toggle → Enter server URL

### **3. DIRECT API MODE**
- User configures their own Claude API key
- Direct Claude API integration
- Fallback if server unavailable

---

## 🚀 Quick Start

### Step 1: Build the Extension
```bash
cd "C:\Users\Omer\Downloads\Extension\qa-ai-extension"
npm run build
```

### Step 2: Load in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist/` folder

### Step 3: Test the Extension
- Click the extension icon
- Try "Capture Screenshot"
- It will work in **demo mode** by default
- See the modern UI with sample bug issues

### Step 4: Deploy Landing Page
```bash
# Serve locally
npx http-server -p 8080

# Then visit: http://localhost:8080/landing.html
```

---

## 🛠️ Setting Up Server Mode (Advanced)

### Backend Endpoints Required

Your backend should expose these endpoints:

```javascript
// POST /api/analyze
{
  screenshot: "data:image/png;base64,...",
  metadata: { pageTitle, viewport, userAgent }
}
→ Returns: { issues: [ { issue, severity, location, impact }, ... ] }

// POST /api/report
{
  screenshot: "data:image/png;base64,...",
  metadata: { pageTitle, ... }
}
→ Returns: { id, title, description, severity, ... }

// GET /health
→ Returns: 200 OK (for connection testing)
```

### Example Backend (Node.js + Claude)

```javascript
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json({ limit: '10mb' }));

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

app.post('/api/analyze', async (req, res) => {
  const { screenshot, metadata } = req.body;
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: screenshot.split(',')[1] }
          },
          {
            type: 'text',
            text: 'Analyze this screenshot for UI issues. Return JSON: { issues: [ { issue, severity, location, impact }, ... ] }'
          }
        ]
      }]
    });
    
    const issues = JSON.parse(response.content[0].text);
    res.json({ issues });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(3000, () => console.log('Server running on :3000'));
```

---

## 🎨 Landing Page Features

✅ **Hero Section** — Eye-catching intro  
✅ **Features Grid** — 6 key capabilities  
✅ **How It Works** — 4-step process  
✅ **Pricing Section** — Free tier showcase  
✅ **Gmail OAuth Modal** — Sign in / Create account  
✅ **Add to Chrome Button** — Redirects to Web Store  
✅ **Mobile Responsive** — Works on all devices  
✅ **Beautiful Gradient Design** — Professional look  

### Modal Flow:
1. User clicks "Get Started"
2. Shows login modal
3. Option: Gmail OAuth or Email
4. On success → "Add to Chrome" button appears
5. Clicking redirects to Chrome Web Store

---

## 🔌 Gmail OAuth Setup (Optional)

To integrate real Gmail login:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials (Web application)
3. Add authorized redirect URI: `https://your-domain.com/callback`
4. Update landing page:

```javascript
// Add Google API script
<script src="https://accounts.google.com/gsi/client" async defer></script>

// Update gmailLogin function
function gmailLogin() {
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?
    client_id=YOUR_CLIENT_ID&
    redirect_uri=https://your-domain.com/callback&
    response_type=code&
    scope=openid%20email%20profile`;
}
```

---

## 📊 Extension Features

### **Popup (Modern UI)**
- Gradient header with settings gear icon
- 3 tabs: Capture | Manual | History
- Real-time AI analysis status
- Issue cards with color-coded severity
- Modal for generated reports
- "Add to Chrome" flow integration

### **Options Page**
- **Server Mode Toggle** — Switch between modes
- **Server URL Configuration** — Enter backend URL
- **API Key Option** — Fallback direct API
- **Test Connection Button** — Verify server
- **Bug Tracker Integration** — Jira/ClickUp
- **Quality Slider** — 1-100% screenshot quality

### **Demo Mode**
- 4 pre-built sample issues
- Works without any configuration
- Perfect for onboarding

---

## 🔒 Security Notes

1. **No Keys Stored Client-Side** (server mode)
2. **API keys only in user settings** (direct mode)
3. **Server can be self-hosted** (privacy)
4. **Screenshots private** (stay in your infrastructure)

---

## 📦 Build & Deployment

### Chrome Web Store Submission
1. Create extension at [Chrome Web Store](https://chromewebstore.google.com/publish)
2. Upload `dist/` as ZIP
3. Add screenshots from landing page
4. Deploy landing page to your website
5. Add Web Store link to GitHub/website

### Environment Variables
```
# Backend .env
CLAUDE_API_KEY=sk-ant-...
NODE_ENV=production

# Landing page (update hardcoded URL)
CHROME_EXTENSION_ID=abc123...
CHROME_WEBSTORE_URL=https://chrome.google.com/webstore/detail/...
```

---

## ✨ What Works Out of the Box

✅ **Landing page** — Open `landing.html` directly  
✅ **Extension popup** — Build → Load unpacked → Test  
✅ **Demo mode** — No setup required  
✅ **Settings page** — Configure server/API/tracker  
✅ **Report history** — Saved in Chrome storage  
✅ **Gmail login UI** — Ready (needs OAuth setup)  

---

## 🎯 Next Steps

1. **Open landing page** → `landing.html` in browser
2. **Click "Get Started"** → See auth modal
3. **Click "Add to Chrome"** → Extension ready
4. **Build extension** → `npm run build`
5. **Load in Chrome** → `chrome://extensions/`
6. **Try demo mode** → Capture screenshot
7. **Setup server** (optional) → Configure in settings
8. **Deploy landing** → Hosted on your domain

---

## 🐛 Troubleshooting

**Extension not loading?**
- Check `dist/` folder has all files
- Verify manifest.json is valid
- Enable developer mode in Chrome

**Demo mode not showing issues?**
- Make sure no API key is configured
- Check browser console for errors
- Try refreshing extension

**Server not connecting?**
- Verify backend is running
- Check CORS headers
- Test with `/health` endpoint

---

## 📞 Support

- Check browser console for errors
- Verify all file paths
- Test backend endpoints with Postman
- Review manifest.json permissions

**Ready to launch?** 🚀

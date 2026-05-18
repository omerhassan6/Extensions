# 🚀 QA Reporter — Local Development Guide

## Quick Start (Windows)

### Option 1: Automatic Startup
```bash
# Just run this:
start.bat
```

This will automatically:
- Install backend dependencies
- Build the extension
- Start the server on localhost:3000

---

## Quick Start (Mac/Linux)

```bash
chmod +x start.sh
./start.sh
```

---

## Manual Setup

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 2: Build the Extension
```bash
cd qa-ai-extension
npm install
npm run build
```

### Step 3: Configure Backend
```bash
cd backend
cp .env.local .env
# (Optional) Add your Claude API key to .env for real AI
```

### Step 4: Start the Server
```bash
cd backend
npm start
```

You should see:
```
╔════════════════════════════════════════════╗
║   QA AI Assistant - Backend Server        ║
╚════════════════════════════════════════════╝
  ✓ Server running on http://localhost:3000
  ✓ Environment: development
  ✓ Claude API: ✗ Not configured
```

---

## Step 5: Load Extension in Chrome

1. **Open Chrome** and go to `chrome://extensions/`
2. **Enable Developer Mode** (toggle in top right)
3. **Click "Load unpacked"**
4. **Select folder:** `qa-ai-extension/dist`

You should see the QA Reporter extension installed!

---

## Step 6: Configure Extension for Server Mode

1. **Click the extension icon** (gear icon on top right of popup)
2. **Go to Settings** (opens options page)
3. **Enable "Backend Server Mode"**
4. **Enter Server URL:** `http://localhost:3000`
5. **Click "Test Connection"** → Should show ✓ Connected
6. **Click "Save Settings"**

---

## Testing Everything

### Test 1: Landing Page
- Open browser: `http://localhost:3000`
- You should see the beautiful landing page
- Click "Get Started" to see the login modal
- Click "Add to Chrome" to get to Web Store link

### Test 2: Health Check
- Open: `http://localhost:3000/health`
- Should show: `{ "status": "ok", "timestamp": "2026-05-18T..." }`

### Test 3: Extension (Demo Mode)
1. Click extension icon
2. Click "Capture Screenshot"
3. Click "Analyze for UI Issues"
4. Should show **4 sample issues** (demo mode)
5. Click "Generate Bug Report"
6. Should show a professional bug report

### Test 4: Extension (Server Mode - if configured)
1. Make sure API key is added to `.env` (optional)
2. Follow Test 3 steps
3. Should show real AI analysis

---

## URLs to Remember

| Purpose | URL |
|---------|-----|
| Landing Page | `http://localhost:3000` |
| API Health | `http://localhost:3000/health` |
| API Analyze | `POST http://localhost:3000/api/analyze` |
| API Report | `POST http://localhost:3000/api/generate-report` |
| Extension | `chrome://extensions` |

---

## Troubleshooting

### "Port 3000 already in use"
```bash
# Change port in backend/.env
PORT=3001

# Or find and kill process on port 3000
lsof -i :3000              # Mac/Linux
netstat -ano | findstr :3000  # Windows
```

### "Extension not showing in Chrome"
- Make sure `qa-ai-extension/dist` folder exists
- Try clicking extension again
- Check browser console for errors (F12)

### "Server connection failed"
- Check server is running
- Verify URL is `http://localhost:3000` (not https)
- Check network tab in Chrome DevTools

### "Demo mode not showing issues"
- Make sure **no Claude API key** is in `.env`
- Verify DEMO_MODE=true in `.env`
- Check browser console for errors

---

## Environment Variables

Edit `backend/.env`:

```env
# Server config
NODE_ENV=development      # development or production
PORT=3000                 # Server port
HOST=localhost            # Server host

# Claude API (optional)
CLAUDE_API_KEY=           # Add key here for real AI

# Local settings
DEMO_MODE=true            # Show sample data without API
UPLOADS_DIR=./uploads     # Where to save screenshots
```

---

## File Structure

```
Extension/
├── start.bat                    # ← Run this (Windows)
├── start.sh                     # ← Run this (Mac/Linux)
├── landing.html                 # Landing page (served at /)
│
├── backend/
│   ├── package.json             # Backend dependencies
│   ├── .env.local               # Environment config
│   ├── server.js                # Startup file
│   ├── app.js                   # Express app
│   ├── routes/index.js          # API endpoints
│   └── controllers/
│       ├── analysis.js          # /api/analyze
│       └── report.js            # /api/generate-report
│
├── qa-ai-extension/
│   ├── src/
│   │   ├── popup.html           # Extension popup
│   │   ├── popup.js             # Popup logic
│   │   ├── options.html         # Settings page
│   │   └── manifest.json        # Chrome manifest
│   ├── dist/                    # ← Built extension (load this)
│   └── package.json             # Extension build config
│
└── node_modules/                # Dependencies
```

---

## Development Workflow

### Make changes to extension:
```bash
cd qa-ai-extension
npm run build     # Recompile
# Refresh extension in Chrome (Ctrl+R on extension page)
```

### Make changes to landing page:
```bash
# Edit landing.html directly
# Refresh browser
```

### Make changes to backend:
```bash
cd backend
npm run dev       # Uses nodemon for auto-restart
```

---

## Next Steps

1. ✅ Run `start.bat` or `start.sh`
2. ✅ Open `http://localhost:3000`
3. ✅ Load extension in Chrome
4. ✅ Configure server mode in extension settings
5. ✅ Test all features
6. ✅ Add Claude API key (optional)
7. 🚀 Deploy to production!

---

## Production Deployment

When ready to go live:

```bash
# Build production bundle
NODE_ENV=production npm run build

# Use a hosting service:
# - Heroku
# - Railway
# - AWS
# - DigitalOcean
# - Google Cloud
# - Azure

# Don't forget:
# - Change URLs from localhost:3000 to your domain
# - Add Claude API key
# - Set up database for user accounts
# - Configure Chrome Web Store listing
```

---

## Support

Having issues? Check:
- Browser console (F12)
- Server terminal output
- `.env` file configuration
- Network tab in DevTools
- Make sure port 3000 is available

Good luck! 🎉

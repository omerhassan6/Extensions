@echo off
REM QA Reporter - Local Development Startup Script

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║      QA Reporter - Local Development Environment           ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check if node is installed
where node >nul 2>nul
if errorlevel 1 (
    echo ✗ Node.js not found. Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo ✓ Node.js found
echo.

REM Install backend dependencies
echo ▶ Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo ✗ Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

echo ✓ Backend dependencies installed
echo.

REM Build extension
echo ▶ Building extension...
cd qa-ai-extension
call npm install
if errorlevel 1 (
    echo ✗ Failed to install extension dependencies
    pause
    exit /b 1
)

call npm run build
if errorlevel 1 (
    echo ✗ Failed to build extension
    pause
    exit /b 1
)
cd ..

echo ✓ Extension built successfully
echo.

REM Start the server
echo ╔════════════════════════════════════════════════════════════╗
echo ║             Server Starting on http://localhost:3000       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo   Landing Page:  http://localhost:3000
echo   Health Check:  http://localhost:3000/health
echo   API:           http://localhost:3000/api
echo.
echo   Chrome Extension: chrome://extensions
echo     - Enable Developer mode
echo     - Load unpacked → qa-ai-extension/dist
echo.

cd backend
call npm start

pause

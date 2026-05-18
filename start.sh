#!/bin/bash

# QA Reporter - Local Development Startup Script

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║      QA Reporter - Local Development Environment           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "✗ Node.js not found. Please install from https://nodejs.org"
    exit 1
fi

echo "✓ Node.js found: $(node --version)"
echo ""

# Install backend dependencies
echo "▶ Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "✗ Failed to install backend dependencies"
    exit 1
fi
cd ..

echo "✓ Backend dependencies installed"
echo ""

# Build extension
echo "▶ Building extension..."
cd qa-ai-extension
npm install
if [ $? -ne 0 ]; then
    echo "✗ Failed to install extension dependencies"
    exit 1
fi

npm run build
if [ $? -ne 0 ]; then
    echo "✗ Failed to build extension"
    exit 1
fi
cd ..

echo "✓ Extension built successfully"
echo ""

# Start the server
echo "╔════════════════════════════════════════════════════════════╗"
echo "║             Server Starting on http://localhost:3000       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "   Landing Page:  http://localhost:3000"
echo "   Health Check:  http://localhost:3000/health"
echo "   API:           http://localhost:3000/api"
echo ""
echo "   Chrome Extension: chrome://extensions"
echo "     - Enable Developer mode"
echo "     - Load unpacked → qa-ai-extension/dist"
echo ""

cd backend
npm start

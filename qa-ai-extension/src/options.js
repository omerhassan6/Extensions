const serverModeToggle = document.getElementById('serverModeToggle');
const serverUrlField   = document.getElementById('serverUrlField');
const serverKeyField   = document.getElementById('serverKeyField');
const modeText         = document.getElementById('modeText');
const modeBadge        = document.getElementById('modeBadge');
const qualitySlider    = document.getElementById('screenshotQuality');
const qualityDisplay   = document.getElementById('qualityDisplay');
const testServerBtn    = document.getElementById('testServerBtn');
const testStatus       = document.getElementById('testStatus');

function setModeBadgeText(text) {
  modeText.textContent = text;
}

qualitySlider.addEventListener('input', () => {
  qualityDisplay.textContent = qualitySlider.value + '%';
});

serverModeToggle.addEventListener('click', () => {
  serverModeToggle.classList.toggle('active');
  const isActive = serverModeToggle.classList.contains('active');
  serverUrlField.style.display = isActive ? 'flex' : 'none';
  serverKeyField.style.display = isActive ? 'flex' : 'none';
  setModeBadgeText(isActive ? 'Using server mode' : 'Using demo mode');
});

testServerBtn.addEventListener('click', async () => {
  const raw = document.getElementById('serverUrl').value.trim();
  if (!raw) {
    showTestStatus('Enter a server URL', 'error');
    return;
  }

  const base = raw.replace(/\/+$/, '');
  const healthUrl = /\/api$/.test(base) ? `${base}/health` : `${base}/api/health`;

  showTestStatus('Testing connection…', 'loading');
  try {
    const res = await fetch(healthUrl, { method: 'GET' });
    if (!res.ok) {
      showTestStatus(`Server returned ${res.status}`, 'error');
      return;
    }
    const data = await res.json().catch(() => ({}));
    const mode = data.demoMode ? 'demo' : (data.claudeConfigured ? 'live' : 'demo');
    showTestStatus(`✓ Connected · ${mode} mode`, 'success');
  } catch (e) {
    showTestStatus('Connection failed: ' + e.message, 'error');
  }
});

function showTestStatus(msg, type) {
  testStatus.className = 'status-msg ' + type;
  if (type === 'loading') {
    testStatus.innerHTML = '<div class="spinner"></div>' + msg;
  } else {
    testStatus.textContent = msg;
  }
}

document.getElementById('saveBtn').addEventListener('click', () => {
  const serverMode = serverModeToggle.classList.contains('active');
  chrome.storage.sync.set({
    serverMode,
    serverUrl: document.getElementById('serverUrl').value.trim(),
    serverKey: document.getElementById('serverKey').value,
    apiKey:    document.getElementById('apiKey').value,
    bugApiEndpoint: document.getElementById('bugApiEndpoint').value.trim(),
    apiToken:  document.getElementById('apiToken').value,
    bugPriority: document.getElementById('bugPriority').value,
    screenshotQuality: parseInt(qualitySlider.value, 10)
  }, () => {
    const msg = document.getElementById('statusMessage');
    msg.textContent = '✓ Settings saved successfully';
    msg.className = 'status-msg success';
    setTimeout(() => { msg.className = 'status-msg'; }, 3000);
  });
});

chrome.storage.sync.get({
  serverMode: false,
  serverUrl: '',
  serverKey: '',
  apiKey: '',
  bugApiEndpoint: '',
  apiToken: '',
  bugPriority: 'medium',
  screenshotQuality: 90
}, (items) => {
  if (items.serverMode) {
    serverModeToggle.classList.add('active');
    serverUrlField.style.display = 'flex';
    serverKeyField.style.display = 'flex';
    setModeBadgeText('Using server mode');
  } else {
    setModeBadgeText(items.apiKey ? 'Using direct Claude API' : 'Using demo mode');
  }
  document.getElementById('serverUrl').value     = items.serverUrl;
  document.getElementById('serverKey').value     = items.serverKey;
  document.getElementById('apiKey').value        = items.apiKey;
  document.getElementById('bugApiEndpoint').value = items.bugApiEndpoint;
  document.getElementById('apiToken').value      = items.apiToken;
  document.getElementById('bugPriority').value   = items.bugPriority;
  qualitySlider.value = items.screenshotQuality;
  qualityDisplay.textContent = items.screenshotQuality + '%';
});

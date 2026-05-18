const screenshotHandler = new ScreenshotHandler();
let analyzerInstance   = null;
let currentMode        = 'demo';      // 'demo' | 'server' | 'api'
let lastReport         = null;
let lastIssues         = [];
let serverApiRequests  = null;
let recordingResult    = null;        // { dataUrl, thumbnail, duration, size, flow[] }
let recordingTimerId   = null;

const STORAGE_HISTORY_KEY = 'reportHistory';

// ===================== INIT =====================

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    switchTab(e.currentTarget.dataset.tab, e.currentTarget);
    if (e.currentTarget.dataset.tab === 'history') loadHistory();
    if (e.currentTarget.dataset.tab === 'record')  syncRecordTabUI();
  });
});

function switchTab(tabName, button) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
    tab.style.display = 'none';
  });
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const pane = document.getElementById(tabName);
  pane.style.display = 'block';
  pane.classList.add('active');
  if (button) button.classList.add('active');
}

function setModeChip(mode) {
  currentMode = mode;
  const chip = document.getElementById('modeChip');
  if (!chip) return;
  chip.className = 'mode-chip ' + mode;
  chip.textContent = mode === 'server' ? 'SERVER' : mode === 'api' ? 'CLAUDE' : 'DEMO';
}

async function resolveMode(settings) {
  if (settings.serverMode && settings.serverUrl) return 'server';
  if (settings.apiKey) return 'api';
  return 'demo';
}

// ===================== CONNECT ONBOARDING =====================

const connectScreen = document.getElementById('connectScreen');
const tabNav = document.getElementById('tabNav');
const tabBody = document.querySelector('.tab-body');

function showConnect() {
  connectScreen.style.display = 'block';
  tabNav.style.display = 'none';
  tabBody.style.display = 'none';
}

function hideConnect() {
  connectScreen.style.display = 'none';
  tabNav.style.display = 'flex';
  tabBody.style.display = 'block';
}

let chosenConnectMode = 'demo';
document.querySelectorAll('.connect-card').forEach(card => {
  card.addEventListener('click', () => {
    chosenConnectMode = card.dataset.mode;
    document.querySelectorAll('.connect-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
  });
});

document.getElementById('connectTestBtn').addEventListener('click', async (e) => {
  e.stopPropagation();
  const raw = document.getElementById('connectServerUrl').value.trim();
  const status = document.getElementById('connectTestStatus');
  if (!raw) { status.className = 'connect-test-status error'; status.textContent = 'Enter a URL'; return; }
  const base = raw.replace(/\/+$/, '');
  const healthUrl = /\/api$/.test(base) ? `${base}/health` : `${base}/api/health`;
  status.className = 'connect-test-status loading';
  status.innerHTML = '<div class="spinner"></div> Testing…';
  try {
    const res = await fetch(healthUrl);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json().catch(() => ({}));
    status.className = 'connect-test-status success';
    status.textContent = `✓ Connected · ${data.demoMode ? 'demo' : 'live'} mode`;
  } catch (err) {
    status.className = 'connect-test-status error';
    status.textContent = '✗ ' + err.message;
  }
});

document.getElementById('connectFinishBtn').addEventListener('click', async () => {
  const settings = await getSettings();
  let next = { ...settings, onboardingComplete: true };

  if (chosenConnectMode === 'server') {
    const url = document.getElementById('connectServerUrl').value.trim() || 'http://localhost:3000/api';
    next.serverMode = true;
    next.serverUrl  = url;
    next.apiKey     = '';
  } else if (chosenConnectMode === 'api') {
    const key = document.getElementById('connectApiKey').value.trim();
    if (!key) {
      alert('Paste a Claude API key, or pick another option.');
      return;
    }
    next.serverMode = false;
    next.apiKey     = key;
  } else {
    next.serverMode = false;
    next.apiKey     = '';
  }

  await chrome.storage.sync.set(next);
  setModeChip(await resolveMode(next));
  hideConnect();
});

// ===================== DEMO DATA =====================

const DEMO_ISSUES = [
  { issue: 'Button alignment misaligned', severity: 'High',   location: 'Top navbar',   description: 'Primary CTA buttons are not vertically centered with their text.', impact: 'Reduces perceived quality.', suggestedFix: 'Apply align-items: center.' },
  { issue: 'Text truncation detected',    severity: 'Medium', location: 'Product card', description: 'Long titles cut off at 280px without ellipsis.', impact: 'Users miss full product names.', suggestedFix: 'Add text-overflow: ellipsis.' },
  { issue: 'Color contrast insufficient', severity: 'Medium', location: 'Footer links', description: 'Gray text fails WCAG AA contrast (3.8:1).', impact: 'Hard to read for low-vision users.', suggestedFix: 'Darken text color.' },
  { issue: 'Spacing inconsistency',       severity: 'Low',    location: 'Card margins', description: 'Margins vary between similar components.', impact: 'Subtle polish issue.', suggestedFix: 'Standardize spacing scale.' }
];

function detectOS(ua = '') {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac'))     return 'macOS';
  if (ua.includes('Linux'))   return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

function buildDemoReport(metadata, issues, flow) {
  const sev = (issues.find(i => i.severity === 'Critical') && 'Critical')
           || (issues.find(i => i.severity === 'High') && 'High')
           || (issues.find(i => i.severity === 'Medium') && 'Medium')
           || 'Low';
  const flowSteps = (flow || [])
    .filter(s => s.type === 'click' || s.type === 'input' || s.type === 'navigate' || s.type === 'submit')
    .map(s => {
      if (s.type === 'navigate') return `Navigate to ${s.url || s.target}`;
      if (s.type === 'click')    return `Click ${s.target}`;
      if (s.type === 'input')    return `Type "${s.value || ''}" into ${s.target}`;
      if (s.type === 'submit')   return `Submit ${s.target}`;
      return s.target || s.type;
    });
  return {
    id: 'demo-' + Date.now(),
    title: `[Demo] ${sev} UI issues detected on ${metadata.title || 'page'}`,
    severity: sev,
    description: `Demo report — ${issues.length} issue(s) flagged on ${metadata.url || metadata.filename || 'the inspected screen'}.`,
    expectedBehavior: 'All UI elements should be aligned, spaced consistently, and meet WCAG AA color contrast.',
    actualBehavior: 'Multiple UI inconsistencies and accessibility issues were detected.',
    reproductionSteps: flowSteps.length ? flowSteps : [
      `Open ${metadata.url || 'the page'}`,
      'Inspect the header / navigation area',
      'Review primary content sections and buttons',
      'Check footer links for color contrast'
    ],
    affectedArea: 'Page layout, typography, accessibility',
    environment: {
      browser: metadata.userAgent || navigator.userAgent,
      os: detectOS(metadata.userAgent || navigator.userAgent),
      viewport: metadata.viewport || `${window.screen.width}x${window.screen.height}`,
      timestamp: new Date().toISOString()
    },
    issues,
    metadata
  };
}

// ===================== SERVER HELPERS =====================

function normalizeServerBase(url) {
  if (!url) return '';
  let base = url.trim().replace(/\/+$/, '');
  if (!/\/api$/.test(base)) base += '/api';
  return base;
}

async function serverFetch(settings, path, options = {}) {
  const base = normalizeServerBase(settings.serverUrl);
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (settings.serverKey) headers['Authorization'] = `Bearer ${settings.serverKey}`;
  const res = await fetch(base + path, { ...options, headers });
  if (!res.ok) throw new Error(`Server ${res.status}`);
  return res.json();
}

async function analyzeWithServer(screenshot, metadata, settings) {
  const data = await serverFetch(settings, '/analyze', {
    method: 'POST',
    body: JSON.stringify({ screenshot, pageUrl: metadata.url, metadata })
  });
  return data.issues || [];
}

async function reportWithServer(screenshot, issues, metadata, flow, settings) {
  const data = await serverFetch(settings, '/generate-report', {
    method: 'POST',
    body: JSON.stringify({ screenshot, issues, metadata, flow })
  });
  return data.report;
}

async function apiRequestsWithServer(report, settings) {
  try {
    const data = await serverFetch(settings, '/generate-api-requests', {
      method: 'POST',
      body: JSON.stringify({ report })
    });
    return data.requests || null;
  } catch { return null; }
}

async function saveHistoryToServer(report, settings) {
  try {
    await serverFetch(settings, '/history/save', { method: 'POST', body: JSON.stringify({ report }) });
  } catch {}
}

// ===================== CAPTURE (screenshot) FLOW =====================

document.getElementById('captureBtn').addEventListener('click', async () => {
  showStatus('Capturing screenshot…', 'loading');
  document.getElementById('analyzeBtn').style.display = 'none';
  document.getElementById('generateReportBtn').style.display = 'none';
  document.getElementById('analysisResult').style.display = 'none';

  try {
    const result = await screenshotHandler.captureScreenshot();
    const canvas = document.getElementById('previewCanvas');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.style.display = 'block';
    };
    img.src = result.screenshot;
    showStatus('Screenshot captured', 'success');
    document.getElementById('analyzeBtn').style.display = 'flex';
  } catch (error) {
    showStatus(`Capture failed: ${error.message}`, 'error');
  }
});

document.getElementById('analyzeBtn').addEventListener('click', () => runAnalysis('capture'));
document.getElementById('generateReportBtn').addEventListener('click', () => runReport('capture'));

// ===================== MANUAL UPLOAD FLOW =====================

document.getElementById('imageUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const imageData = await screenshotHandler.uploadScreenshot(file);
    const preview = document.getElementById('manualPreview');
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = imageData;
    preview.appendChild(img);
    preview.style.display = 'block';
    document.getElementById('analyzeManualBtn').style.display = 'flex';
    document.getElementById('manualAnalysisResult').style.display = 'none';
    document.getElementById('generateManualReportBtn').style.display = 'none';
    showStatus('Image loaded', 'success', 'manualStatus');
  } catch (error) {
    showStatus(`Failed to load image: ${error.message}`, 'error', 'manualStatus');
  }
});

document.getElementById('analyzeManualBtn').addEventListener('click', () => runAnalysis('manual'));
document.getElementById('generateManualReportBtn').addEventListener('click', () => runReport('manual'));

// ===================== RECORDING FLOW =====================

const recordIdle    = document.getElementById('recordIdle');
const recordActive  = document.getElementById('recordActive');
const recordResult  = document.getElementById('recordResult');
const recordTimer   = document.getElementById('recordTimer');
const recordFlowCnt = document.getElementById('recordFlowCount');
const recordPlay    = document.getElementById('recordPlayback');
const recordMeta    = document.getElementById('recordMeta');

document.getElementById('recordStartBtn').addEventListener('click', async () => {
  showStatus('Starting recording…', 'loading', 'recordStatus');
  try {
    const res = await chrome.runtime.sendMessage({ type: 'qa:start-recording' });
    if (!res || !res.ok) throw new Error(res?.error || 'Could not start');
    recordIdle.style.display = 'none';
    recordResult.style.display = 'none';
    recordActive.style.display = 'flex';
    startRecordingTimer();
    showStatus('Recording — tab back to your page', 'success', 'recordStatus');
  } catch (e) {
    showStatus('Failed: ' + e.message, 'error', 'recordStatus');
  }
});

document.getElementById('recordStopBtn').addEventListener('click', async () => {
  showStatus('Stopping…', 'loading', 'recordStatus');
  stopRecordingTimer();
  try {
    const res = await chrome.runtime.sendMessage({ type: 'qa:stop-recording' });
    if (!res || !res.ok) throw new Error(res?.error || 'Stop failed');
    recordingResult = {
      dataUrl: res.dataUrl,
      thumbnail: res.thumbnail,
      duration: res.duration,
      size: res.size,
      mimeType: res.mimeType,
      flow: res.flow || []
    };
    presentRecordingResult();
    showStatus('Recording ready · click Analyze', 'success', 'recordStatus');
  } catch (e) {
    showStatus('Failed: ' + e.message, 'error', 'recordStatus');
    recordActive.style.display = 'none';
    recordIdle.style.display = 'block';
  }
});

function presentRecordingResult() {
  recordActive.style.display = 'none';
  recordResult.style.display = 'flex';

  recordPlay.src = recordingResult.dataUrl;
  recordPlay.load();

  const mb = (recordingResult.size / (1024 * 1024)).toFixed(1);
  const dur = formatTime(recordingResult.duration);
  recordMeta.innerHTML = `
    <div>Duration: <span>${dur}</span></div>
    <div>Size: <span>${mb} MB</span></div>
    <div>Steps captured: <span>${recordingResult.flow.length}</span></div>
  `;
  document.getElementById('recordAnalysis').style.display = 'none';
  document.getElementById('recordReportBtn').style.display = 'none';
}

document.getElementById('recordAnalyzeBtn').addEventListener('click', () => runAnalysis('record'));
document.getElementById('recordReportBtn').addEventListener('click', () => runReport('record'));

document.getElementById('recordDownloadBtn').addEventListener('click', async () => {
  if (!recordingResult) return;
  try {
    await chrome.runtime.sendMessage({
      type: 'qa:download',
      url: recordingResult.dataUrl,
      filename: `qa-recording-${Date.now()}.webm`
    });
    showStatus('Saved to Downloads', 'success', 'recordStatus');
  } catch (e) {
    showStatus('Download failed', 'error', 'recordStatus');
  }
});

function startRecordingTimer() {
  const t0 = Date.now();
  recordTimer.textContent = '00:00';
  recordFlowCnt.textContent = '0';
  recordingTimerId = setInterval(async () => {
    const elapsed = (Date.now() - t0) / 1000;
    recordTimer.textContent = formatTime(elapsed);
    const state = await chrome.runtime.sendMessage({ type: 'qa:get-state' }).catch(() => null);
    if (state && state.ok) recordFlowCnt.textContent = state.flowCount;
  }, 500);
}

function stopRecordingTimer() {
  if (recordingTimerId) clearInterval(recordingTimerId);
  recordingTimerId = null;
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

async function syncRecordTabUI() {
  const state = await chrome.runtime.sendMessage({ type: 'qa:get-state' }).catch(() => null);
  if (!state || !state.ok) return;
  if (state.recording) {
    recordIdle.style.display = 'none';
    recordResult.style.display = 'none';
    recordActive.style.display = 'flex';
    startRecordingTimer();
  } else if (state.hasResult && !recordingResult) {
    const last = await chrome.runtime.sendMessage({ type: 'qa:get-last-result' });
    if (last && last.ok && last.result) {
      recordingResult = last.result;
      presentRecordingResult();
    }
  }
}

// ===================== UNIFIED ANALYSIS / REPORT =====================

const PANEL = {
  capture: { status: 'captureStatus', result: 'analysisResult',       generateBtn: 'generateReportBtn',       source: 'screenshot' },
  manual:  { status: 'manualStatus',  result: 'manualAnalysisResult', generateBtn: 'generateManualReportBtn', source: 'screenshot' },
  record:  { status: 'recordStatus',  result: 'recordAnalysis',       generateBtn: 'recordReportBtn',         source: 'recording'  }
};

async function runAnalysis(panelKey) {
  const panel = PANEL[panelKey];
  showStatus('Analyzing…', 'loading', panel.status);

  try {
    const settings = await getSettings();
    let screenshot, metadata, flow = [];
    if (panel.source === 'recording') {
      if (!recordingResult) throw new Error('No recording loaded');
      screenshot = recordingResult.thumbnail || recordingResult.dataUrl;
      flow = recordingResult.flow || [];
      const navEvent = flow.find(f => f.type === 'navigate');
      metadata = {
        url: navEvent ? navEvent.url : '',
        title: navEvent ? navEvent.target : 'Recorded flow',
        userAgent: navigator.userAgent,
        viewport: `${window.screen.width}x${window.screen.height}`,
        viewportWidth: window.screen.width,
        viewportHeight: window.screen.height,
        recordingDuration: recordingResult.duration,
        recordingSize: recordingResult.size,
        flow
      };
    } else {
      screenshot = screenshotHandler.getCurrentScreenshot();
      metadata   = screenshotHandler.getCurrentMetadata() || {};
    }

    const mode = await resolveMode(settings);
    setModeChip(mode);

    let issues;
    if (mode === 'server') {
      issues = await analyzeWithServer(screenshot, metadata, settings);
    } else if (mode === 'api') {
      analyzerInstance = new AIAnalyzer(settings.apiKey);
      issues = await analyzerInstance.analyzeScreenshotForUIIssues(screenshot, metadata);
    } else {
      issues = DEMO_ISSUES;
    }

    lastIssues = issues;
    renderIssues(issues, panel.result);
    document.getElementById(panel.generateBtn).style.display = 'flex';

    const note = mode === 'demo' ? ' (demo)' : mode === 'server' ? ' (server)' : ' (Claude)';
    showStatus(`Found ${issues.length} issue(s)${note}`, 'success', panel.status);
  } catch (error) {
    console.error(error);
    showStatus(`Analysis failed: ${error.message}`, 'error', panel.status);
  }
}

async function runReport(panelKey) {
  const panel = PANEL[panelKey];
  showStatus('Generating report…', 'loading', panel.status);

  try {
    const settings = await getSettings();
    let screenshot, metadata, flow = [];
    let videoDataUrl = null;

    if (panel.source === 'recording') {
      if (!recordingResult) throw new Error('No recording loaded');
      screenshot = recordingResult.thumbnail || null;
      videoDataUrl = recordingResult.dataUrl;
      flow = recordingResult.flow || [];
      const navEvent = flow.find(f => f.type === 'navigate');
      metadata = {
        url: navEvent ? navEvent.url : '',
        title: navEvent ? navEvent.target : 'Recorded flow',
        userAgent: navigator.userAgent,
        viewport: `${window.screen.width}x${window.screen.height}`,
        viewportWidth: window.screen.width,
        viewportHeight: window.screen.height,
        recordingDuration: recordingResult.duration,
        flow
      };
    } else {
      screenshot = screenshotHandler.getCurrentScreenshot();
      metadata   = screenshotHandler.getCurrentMetadata() || {};
    }

    const mode = currentMode;
    let report;
    if (mode === 'server') {
      report = await reportWithServer(screenshot, lastIssues, metadata, flow, settings);
    } else if (mode === 'api') {
      const bug = await analyzerInstance.generateDetailedBugDescription(screenshot, lastIssues, metadata);
      report = BugFormatter.createCompleteReport({ ...bug, issues: lastIssues, screenshot }, metadata);
      if (flow.length && (!report.reproductionSteps || !report.reproductionSteps.length)) {
        report.reproductionSteps = flowToSteps(flow);
      }
    } else {
      report = buildDemoReport(metadata, lastIssues.length ? lastIssues : DEMO_ISSUES, flow);
    }

    if (videoDataUrl) {
      report.video = { data: videoDataUrl, mimeType: recordingResult.mimeType, size: recordingResult.size };
    }
    if (!report.screenshot && screenshot) report.screenshot = { data: screenshot };

    lastReport = report;
    serverApiRequests = mode === 'server' ? await apiRequestsWithServer(report, settings) : null;

    await saveToLocalHistory(report);
    if (mode === 'server') saveHistoryToServer(report, settings);

    displayReport(report, settings);
    showStatus('Report ready', 'success', panel.status);
  } catch (error) {
    console.error(error);
    showStatus(`Report failed: ${error.message}`, 'error', panel.status);
  }
}

function flowToSteps(flow) {
  return (flow || [])
    .filter(s => s.type === 'click' || s.type === 'input' || s.type === 'navigate' || s.type === 'submit')
    .map(s => {
      if (s.type === 'navigate') return `Navigate to ${s.url || s.target}`;
      if (s.type === 'click')    return `Click ${s.target}`;
      if (s.type === 'input')    return `Type "${s.value || ''}" into ${s.target}`;
      if (s.type === 'submit')   return `Submit ${s.target}`;
      return s.target || s.type;
    });
}

// ===================== HISTORY =====================

document.getElementById('clearHistoryBtn').addEventListener('click', async () => {
  if (!confirm('Clear all bug reports from history?')) return;
  await chrome.storage.local.set({ [STORAGE_HISTORY_KEY]: [] });
  loadHistory();
});

async function saveToLocalHistory(report) {
  return new Promise(resolve => {
    chrome.storage.local.get({ [STORAGE_HISTORY_KEY]: [] }, (data) => {
      const history = data[STORAGE_HISTORY_KEY] || [];
      // Strip large video blob from history to avoid chrome.storage quota issues
      const slim = { ...report };
      if (slim.video) slim.video = { mimeType: slim.video.mimeType, size: slim.video.size };
      history.unshift({
        id: report.id,
        title: report.title,
        severity: report.severity,
        timestamp: (report.environment && report.environment.timestamp) || new Date().toISOString(),
        fullReport: slim
      });
      if (history.length > 50) history.length = 50;
      chrome.storage.local.set({ [STORAGE_HISTORY_KEY]: history }, resolve);
    });
  });
}

async function loadHistory() {
  const data = await new Promise(resolve => chrome.storage.local.get({ [STORAGE_HISTORY_KEY]: [] }, resolve));
  const historyDiv = document.getElementById('reportHistory');
  const history = data[STORAGE_HISTORY_KEY] || [];

  if (history.length === 0) {
    historyDiv.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <div class="empty-state-text">No bug reports yet</div>
    </div>`;
    return;
  }

  historyDiv.innerHTML = history.map(item => {
    const sev = (item.severity || 'unknown').toLowerCase();
    return `<div class="history-item">
      <div class="history-item-info">
        <div class="history-item-title">${escapeHtml(item.title)}</div>
        <div class="history-item-meta">
          <div class="history-dot ${sev}"></div>
          <span class="history-item-time">${new Date(item.timestamp).toLocaleString()}</span>
        </div>
      </div>
      <button class="history-view-btn" data-id="${item.id}">View</button>
    </div>`;
  }).join('');

  historyDiv.querySelectorAll('.history-view-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const fresh = await new Promise(resolve => chrome.storage.local.get({ [STORAGE_HISTORY_KEY]: [] }, resolve));
      const item = (fresh[STORAGE_HISTORY_KEY] || []).find(r => r.id === id);
      if (item) {
        const settings = await getSettings();
        lastReport = item.fullReport;
        displayReport(item.fullReport, settings);
      }
    });
  });
}

// ===================== RENDER =====================

function showStatus(message, type = 'info', targetId = 'captureStatus') {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.className = `status ${type}`;
  if (type === 'loading') {
    el.innerHTML = `<div class="spinner"></div><span>${escapeHtml(message)}</span>`;
  } else {
    el.textContent = message;
  }
}

function renderIssues(issues, containerId) {
  const el = document.getElementById(containerId);
  if (!issues || issues.length === 0) {
    el.innerHTML = '<div class="no-issues">✓ No UI issues detected — looks good!</div>';
  } else {
    el.innerHTML = issues.map((issue, i) => {
      const sev = (issue.severity || 'medium').toLowerCase();
      return `<div class="issue-item ${sev}">
        <div class="issue-header">
          <span class="issue-title">${i + 1}. ${escapeHtml(issue.issue || '')}</span>
          <span class="severity-badge ${sev}">${escapeHtml(issue.severity || '')}</span>
        </div>
        <div class="issue-meta">
          <span class="issue-location">${escapeHtml(issue.location || '')}</span>
          <span class="issue-impact">${escapeHtml(issue.impact || issue.description || '')}</span>
        </div>
      </div>`;
    }).join('');
  }
  el.style.display = 'flex';
}

function displayReport(report, settings) {
  const modal = document.getElementById('reportModal');

  // Title + severity
  document.getElementById('rTitle').textContent = report.title || '—';
  const sev = (report.severity || 'medium').toLowerCase();
  const rSev = document.getElementById('rSeverity');
  rSev.className = `severity-badge ${sev}`;
  rSev.textContent = report.severity || '—';

  // Media (video > screenshot)
  const rScreenshot = document.getElementById('rScreenshot');
  const rVideo = document.getElementById('rVideo');
  rScreenshot.style.display = 'none'; rVideo.style.display = 'none';
  if (report.video && report.video.data) {
    rVideo.src = report.video.data;
    rVideo.style.display = 'block';
  } else if (report.screenshot && report.screenshot.data) {
    rScreenshot.src = report.screenshot.data;
    rScreenshot.style.display = 'block';
  } else if (report.metadata && report.metadata.screenshot) {
    rScreenshot.src = report.metadata.screenshot;
    rScreenshot.style.display = 'block';
  }

  // What's going wrong
  renderIssues(report.issues || lastIssues || [], 'rIssues');

  // Descriptions
  document.getElementById('rDescription').textContent = report.description || '—';
  document.getElementById('rExpected').textContent    = report.expectedBehavior || '—';
  document.getElementById('rActual').textContent      = report.actualBehavior || '—';

  // Steps
  const steps = report.reproductionSteps || [];
  const ol = document.getElementById('rSteps');
  ol.innerHTML = steps.length
    ? steps.map(s => `<li>${escapeHtml(String(s))}</li>`).join('')
    : '<li>—</li>';

  // Environment
  const env = report.environment || {};
  document.getElementById('rEnv').innerHTML = `
    <span class="k">Browser</span><span>${escapeHtml(env.browser || '—')}</span>
    <span class="k">OS</span><span>${escapeHtml(env.os || '—')}</span>
    <span class="k">Viewport</span><span>${escapeHtml(env.viewport || '—')}</span>
    <span class="k">Timestamp</span><span>${escapeHtml(env.timestamp || '—')}</span>
  `;

  // CURL — prefer server-generated, otherwise client-build
  const curl = (serverApiRequests && serverApiRequests.curl)
    || APIGenerator.generateCurlForCustomAPI(
         report,
         settings.bugApiEndpoint || 'https://api.example.com/bugs',
         settings.apiToken || 'YOUR_TOKEN'
       );
  document.getElementById('rCurl').textContent = curl;

  // Wire action buttons
  document.getElementById('copyReportBtn').onclick = () => {
    const txt = buildReportText(report);
    navigator.clipboard.writeText(txt);
    showStatus('Report copied', 'success');
  };
  document.getElementById('copyCurlBtn').onclick = () => {
    navigator.clipboard.writeText(curl);
    showStatus('CURL copied', 'success');
  };
  document.getElementById('downloadReportBtn').onclick = () => {
    const slim = { ...report };
    if (slim.video) slim.video = { mimeType: slim.video.mimeType, size: slim.video.size, note: 'Video stripped from JSON to keep file small.' };
    const blob = new Blob([JSON.stringify(slim, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bug-report-${report.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showStatus('Report downloaded', 'success');
  };

  document.querySelector('.close').onclick = () => { modal.style.display = 'none'; };
  modal.style.display = 'flex';
}

function buildReportText(report) {
  const env = report.environment || {};
  return `TITLE: ${report.title || ''}
SEVERITY: ${report.severity || ''}

DESCRIPTION:
${report.description || ''}

WHAT'S GOING WRONG:
${(report.issues || []).map(i => `- [${i.severity || ''}] ${i.issue || ''} (${i.location || ''}) — ${i.impact || i.description || ''}`).join('\n')}

EXPECTED BEHAVIOR:
${report.expectedBehavior || ''}

ACTUAL BEHAVIOR:
${report.actualBehavior || ''}

REPRODUCTION STEPS:
${(report.reproductionSteps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

ENVIRONMENT:
- Browser: ${env.browser || 'Unknown'}
- OS: ${env.os || 'Unknown'}
- Viewport: ${env.viewport || 'Unknown'}
- Timestamp: ${env.timestamp || ''}`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===================== SETTINGS =====================

async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get({
      serverMode: false,
      serverUrl: '',
      serverKey: '',
      apiKey: '',
      bugApiEndpoint: '',
      apiToken: '',
      bugPriority: 'medium',
      screenshotQuality: 90,
      onboardingComplete: false
    }, resolve);
  });
}

// ===================== BOOTSTRAP =====================

(async () => {
  const settings = await getSettings();
  setModeChip(await resolveMode(settings));

  if (!settings.onboardingComplete) {
    showConnect();
  } else {
    hideConnect();
  }

  syncRecordTabUI();
  loadHistory();
})();

const screenshotHandler = new ScreenshotHandler();
let analyzerInstance = null;

// Settings button
document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    switchTab(e.currentTarget.dataset.tab, e.currentTarget);
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

// ==================== CAPTURE & ANALYZE TAB ====================

document.getElementById('captureBtn').addEventListener('click', async () => {
  showStatus('Capturing screenshot…', 'loading');
  document.getElementById('analyzeBtn').style.display = 'none';
  document.getElementById('generateReportBtn').style.display = 'none';

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

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  showStatus('Analyzing screenshot…', 'loading');

  try {
    const settings = await getSettings();
    if (!settings.apiKey) {
      showStatus('Claude API key not configured — open Settings', 'error');
      return;
    }

    analyzerInstance = new AIAnalyzer(settings.apiKey);
    const screenshot = screenshotHandler.getCurrentScreenshot();
    const metadata = screenshotHandler.getCurrentMetadata();
    const issues = await analyzerInstance.analyzeScreenshotForUIIssues(screenshot, metadata);

    renderIssues(issues, 'analysisResult');
    document.getElementById('generateReportBtn').style.display = 'flex';
    showStatus(`Analysis complete — ${issues.length} issue(s) found`, 'success');
  } catch (error) {
    showStatus(`Analysis failed: ${error.message}`, 'error');
  }
});

document.getElementById('generateReportBtn').addEventListener('click', async () => {
  showStatus('Generating report…', 'loading');

  try {
    const settings = await getSettings();
    const screenshot = screenshotHandler.getCurrentScreenshot();
    const metadata = screenshotHandler.getCurrentMetadata();

    const issues = await analyzerInstance.analyzeScreenshotForUIIssues(screenshot, metadata);
    const bugReport = await analyzerInstance.generateDetailedBugDescription(screenshot, issues, metadata);
    const formattedReport = BugFormatter.createCompleteReport(bugReport, metadata);

    await saveToHistory(formattedReport);
    displayReport(formattedReport, settings);
    showStatus('Report generated', 'success');
  } catch (error) {
    showStatus(`Report failed: ${error.message}`, 'error');
  }
});

// ==================== MANUAL REPORT TAB ====================

document.getElementById('imageUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const imageData = await screenshotHandler.uploadScreenshot(file);

    const preview = document.getElementById('manualPreview');
    const img = document.createElement('img');
    img.src = imageData;
    preview.innerHTML = '';
    preview.appendChild(img);
    preview.style.display = 'block';

    document.getElementById('analyzeManualBtn').style.display = 'flex';
    showStatus('Image loaded', 'success', 'manualStatus');
  } catch (error) {
    showStatus(`Failed to load image: ${error.message}`, 'error', 'manualStatus');
  }
});

document.getElementById('analyzeManualBtn').addEventListener('click', async () => {
  showStatus('Analyzing image…', 'loading', 'manualStatus');

  try {
    const settings = await getSettings();
    if (!settings.apiKey) {
      showStatus('Claude API key not configured — open Settings', 'error', 'manualStatus');
      return;
    }

    analyzerInstance = new AIAnalyzer(settings.apiKey);
    const screenshot = screenshotHandler.getCurrentScreenshot();
    const metadata = screenshotHandler.getCurrentMetadata();
    const issues = await analyzerInstance.analyzeScreenshotForUIIssues(screenshot, metadata);

    renderIssues(issues, 'manualAnalysisResult');
    document.getElementById('generateManualReportBtn').style.display = 'flex';
    showStatus(`Analysis complete — ${issues.length} issue(s) found`, 'success', 'manualStatus');
  } catch (error) {
    showStatus(`Analysis failed: ${error.message}`, 'error', 'manualStatus');
  }
});

document.getElementById('generateManualReportBtn').addEventListener('click', async () => {
  showStatus('Generating report…', 'loading', 'manualStatus');

  try {
    const settings = await getSettings();
    const screenshot = screenshotHandler.getCurrentScreenshot();
    const metadata = screenshotHandler.getCurrentMetadata();

    const issues = await analyzerInstance.analyzeScreenshotForUIIssues(screenshot, metadata);
    const bugReport = await analyzerInstance.generateDetailedBugDescription(screenshot, issues, metadata);
    const formattedReport = BugFormatter.createCompleteReport(bugReport, metadata);

    await saveToHistory(formattedReport);
    displayReport(formattedReport, settings);
    showStatus('Report generated', 'success', 'manualStatus');
  } catch (error) {
    showStatus(`Report failed: ${error.message}`, 'error', 'manualStatus');
  }
});

// ==================== HISTORY TAB ====================

document.getElementById('clearHistoryBtn').addEventListener('click', async () => {
  if (confirm('Clear all bug reports from history?')) {
    await chrome.storage.local.set({ reportHistory: [] });
    loadHistory();
  }
});

// ==================== HELPERS ====================

function showStatus(message, type = 'info', targetId = 'captureStatus') {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.className = `status ${type}`;
  if (type === 'loading') {
    el.innerHTML = `<div class="spinner"></div><span>${message}</span>`;
  } else {
    el.textContent = message;
  }
}

function renderIssues(issues, containerId) {
  const el = document.getElementById(containerId);
  if (issues.length === 0) {
    el.innerHTML = '<div class="no-issues">✓ No UI issues detected — looks good!</div>';
  } else {
    el.innerHTML = issues.map((issue, i) => {
      const sev = (issue.severity || 'medium').toLowerCase();
      return `<div class="issue-item ${sev}">
        <div class="issue-header">
          <span class="issue-title">${i + 1}. ${issue.issue}</span>
          <span class="severity-badge ${sev}">${issue.severity}</span>
        </div>
        <div class="issue-meta">
          <span class="issue-location">${issue.location}</span>
          <span class="issue-impact">${issue.impact}</span>
        </div>
      </div>`;
    }).join('');
  }
  el.style.display = 'flex';
}

function displayReport(report, settings) {
  const modal = document.getElementById('reportModal');
  const reportContent = document.getElementById('reportContent');

  const formatted = `TITLE: ${report.title}
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
- Timestamp: ${report.environment.timestamp}`;

  reportContent.textContent = formatted;

  document.getElementById('copyReportBtn').onclick = () => {
    navigator.clipboard.writeText(formatted);
    showStatus('Report copied to clipboard', 'success');
  };

  document.getElementById('copyCurlBtn').onclick = () => {
    const curl = APIGenerator.generateCurlForCustomAPI(
      report,
      settings.bugApiEndpoint || 'https://api.example.com/bugs',
      settings.apiToken || 'YOUR_TOKEN'
    );
    navigator.clipboard.writeText(curl);
    showStatus('CURL copied to clipboard', 'success');
  };

  document.getElementById('downloadReportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bug-report-${report.id}.json`;
    link.click();
    showStatus('Report downloaded', 'success');
  };

  document.querySelector('.close').onclick = () => {
    modal.style.display = 'none';
  };

  modal.style.display = 'flex';
}

async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ apiKey: '', bugApiEndpoint: '', apiToken: '', bugPriority: 'medium' }, resolve);
  });
}

async function saveToHistory(report) {
  return new Promise(resolve => {
    chrome.storage.local.get({ reportHistory: [] }, (data) => {
      const history = data.reportHistory || [];
      history.unshift({
        id: report.id,
        title: report.title,
        severity: report.severity,
        timestamp: new Date().toISOString(),
        fullReport: report
      });
      if (history.length > 50) history.pop();
      chrome.storage.local.set({ reportHistory: history }, resolve);
    });
  });
}

async function loadHistory() {
  const data = await new Promise(resolve => {
    chrome.storage.local.get({ reportHistory: [] }, resolve);
  });

  const historyDiv = document.getElementById('reportHistory');
  const history = data.reportHistory || [];

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
        <div class="history-item-title">${item.title}</div>
        <div class="history-item-meta">
          <div class="history-dot ${sev}"></div>
          <span class="history-item-time">${new Date(item.timestamp).toLocaleString()}</span>
        </div>
      </div>
      <button class="history-view-btn" onclick="viewHistoryReport('${item.id}')">View</button>
    </div>`;
  }).join('');
}

window.viewHistoryReport = async (reportId) => {
  const data = await new Promise(resolve => {
    chrome.storage.local.get({ reportHistory: [] }, resolve);
  });
  const item = data.reportHistory.find(r => r.id === reportId);
  if (item) {
    const settings = await getSettings();
    displayReport(item.fullReport, settings);
  }
};

loadHistory();

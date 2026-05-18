// Background service worker
// Owns: connection-status, recording lifecycle, flow capture buffer.

const STATE = {
  recording: false,
  recordingTabId: null,
  recordingStartedAt: 0,
  flow: [],          // array of { t, type, target, value, url }
  lastResult: null   // { dataUrl, thumbnail, duration, size, mimeType }
};

// ─── Lifecycle ──────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  // Best-effort context menu — silently ignore if permission isn't granted
  try {
    chrome.contextMenus.create({
      id: 'qa-capture',
      title: 'QA Reporter: Capture & Analyze',
      contexts: ['page']
    });
  } catch {}

  // Mark first-run so popup can show the Connect onboarding.
  const stored = await chrome.storage.sync.get({ onboardingComplete: false });
  if (!stored.onboardingComplete) {
    await chrome.storage.sync.set({ onboardingComplete: false });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'qa-capture') {
    chrome.action.openPopup().catch(() => {});
  }
});

// ─── Offscreen plumbing ─────────────────────────────────────

async function ensureOffscreen() {
  const existing = await chrome.offscreen.hasDocument?.();
  if (existing) return;
  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL('offscreen.html'),
    reasons: ['USER_MEDIA'],
    justification: 'Recording the active tab for QA bug reproduction'
  });
}

async function closeOffscreen() {
  try {
    if (await chrome.offscreen.hasDocument?.()) {
      await chrome.offscreen.closeDocument();
    }
  } catch {}
}

// ─── Recording control ──────────────────────────────────────

async function startRecording() {
  if (STATE.recording) throw new Error('Already recording');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('No active tab');

  if (/^chrome:|^edge:|^about:|^chrome-extension:/.test(tab.url || '')) {
    throw new Error('Cannot record browser internal pages');
  }

  const streamId = await new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (id) => {
      if (chrome.runtime.lastError || !id) {
        reject(new Error(chrome.runtime.lastError?.message || 'tabCapture failed'));
      } else {
        resolve(id);
      }
    });
  });

  await ensureOffscreen();

  const startRes = await chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'start-recording',
    streamId
  });
  if (!startRes || !startRes.ok) {
    throw new Error(startRes?.error || 'Offscreen start failed');
  }

  STATE.recording = true;
  STATE.recordingTabId = tab.id;
  STATE.recordingStartedAt = Date.now();
  STATE.flow = [{
    t: 0,
    type: 'navigate',
    url: tab.url,
    target: tab.title,
    value: 'Recording started'
  }];
  STATE.lastResult = null;

  // Tell the content script in the target tab to start broadcasting flow events.
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'qa:start-flow' });
  } catch {}

  setBadge('REC', '#F43F5E');
  return { startedAt: STATE.recordingStartedAt, tab: { id: tab.id, url: tab.url, title: tab.title } };
}

async function stopRecording() {
  if (!STATE.recording) throw new Error('Not recording');

  try {
    if (STATE.recordingTabId != null) {
      await chrome.tabs.sendMessage(STATE.recordingTabId, { type: 'qa:stop-flow' });
    }
  } catch {}

  const stopRes = await chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'stop-recording'
  });
  if (!stopRes || !stopRes.ok) {
    STATE.recording = false;
    setBadge('', '#000000');
    throw new Error(stopRes?.error || 'Offscreen stop failed');
  }

  STATE.recording = false;
  setBadge('', '#000000');

  STATE.lastResult = {
    dataUrl:   stopRes.dataUrl,
    thumbnail: stopRes.thumbnail,
    duration:  stopRes.duration,
    size:      stopRes.size,
    mimeType:  stopRes.mimeType,
    flow:      STATE.flow.slice()
  };

  await closeOffscreen();
  return STATE.lastResult;
}

function setBadge(text, color) {
  try {
    chrome.action.setBadgeText({ text: text || '' });
    if (color) chrome.action.setBadgeBackgroundColor({ color });
  } catch {}
}

// ─── Message routing ────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'qa:get-state') {
    sendResponse({
      ok: true,
      recording: STATE.recording,
      startedAt: STATE.recordingStartedAt,
      flowCount: STATE.flow.length,
      hasResult: Boolean(STATE.lastResult)
    });
    return;
  }

  if (msg.type === 'qa:start-recording') {
    startRecording()
      .then(d => sendResponse({ ok: true, ...d }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.type === 'qa:stop-recording') {
    stopRecording()
      .then(d => sendResponse({ ok: true, ...d }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.type === 'qa:get-last-result') {
    sendResponse({ ok: true, result: STATE.lastResult });
    return;
  }

  if (msg.type === 'qa:clear-last-result') {
    STATE.lastResult = null;
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === 'qa:flow-event' && STATE.recording) {
    // Throttle: cap at ~200 events.
    if (STATE.flow.length < 200) {
      STATE.flow.push({
        t: Date.now() - STATE.recordingStartedAt,
        ...msg.event
      });
    }
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === 'qa:capture-tab') {
    chrome.tabs.captureVisibleTab({ format: 'png' })
      .then(dataUrl => sendResponse({ ok: true, dataUrl }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === 'qa:download') {
    chrome.downloads.download({
      url: msg.url,
      filename: msg.filename || 'qa-reporter-recording.webm',
      saveAs: false
    }).then(id => sendResponse({ ok: true, id }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});

// If the recorded tab navigates / closes, snapshot the event into the flow.
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (STATE.recording && tabId === STATE.recordingTabId && info.url) {
    STATE.flow.push({
      t: Date.now() - STATE.recordingStartedAt,
      type: 'navigate',
      url: info.url
    });
  }
});

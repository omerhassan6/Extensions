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
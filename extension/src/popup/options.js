const userUrlHeaderNameInput = document.getElementById('userUrlHeaderName')
const cookieTokenAppSelect = document.getElementById('cookieTokenApp')
const customCookieGroup = document.getElementById('customCookieGroup')
const customCookieNameInput = document.getElementById('customCookieName')
const saveBtn = document.getElementById('saveBtn')
const messageEl = document.getElementById('message')

function showMessage(text, type = 'success') {
  messageEl.textContent = text
  messageEl.className = `message ${type}`
}

function updateCustomCookieVisibility() {
  if (cookieTokenAppSelect.value === 'custom') {
    customCookieGroup.style.display = 'block'
  } else {
    customCookieGroup.style.display = 'none'
  }
}

cookieTokenAppSelect.addEventListener('change', updateCustomCookieVisibility)

saveBtn.addEventListener('click', () => {
  const settings = {
    userUrlHeaderName: userUrlHeaderNameInput.value.trim() || 'x-user-url',
    cookieTokenApp: cookieTokenAppSelect.value,
    customCookieName: customCookieNameInput.value.trim()
  }

  chrome.storage.sync.set(settings, () => {
    showMessage('Settings saved successfully', 'success')
    setTimeout(() => {
      showMessage('', '')
    }, 3000)
  })
})

chrome.storage.sync.get({
  userUrlHeaderName: 'x-user-url',
  cookieTokenApp: 'none',
  customCookieName: ''
}, (items) => {
  userUrlHeaderNameInput.value = items.userUrlHeaderName
  cookieTokenAppSelect.value = items.cookieTokenApp
  customCookieNameInput.value = items.customCookieName
  updateCustomCookieVisibility()
})

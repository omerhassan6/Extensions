// Content script — captures user interactions during a QA recording session.

let active = false;
let lastInputAt = 0;

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'qa:start-flow') { active = true; }
  if (msg.type === 'qa:stop-flow')  { active = false; }
});

function describe(el) {
  if (!el || el === document) return 'document';
  if (el === document.body)   return 'body';
  const tag  = (el.tagName || '').toLowerCase();
  const id   = el.id ? `#${el.id}` : '';
  const cls  = (el.classList && el.classList.length)
    ? '.' + Array.from(el.classList).slice(0, 2).join('.')
    : '';
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const aria = el.getAttribute && el.getAttribute('aria-label');
  const name = el.getAttribute && (el.getAttribute('name') || el.getAttribute('placeholder'));
  const label = aria || name || text;
  const sel = `${tag}${id}${cls}`;
  return label ? `${sel} (${label})` : sel;
}

function emit(event) {
  if (!active) return;
  try {
    chrome.runtime.sendMessage({ type: 'qa:flow-event', event });
  } catch {}
}

document.addEventListener('click', (e) => {
  if (!active) return;
  emit({
    type: 'click',
    target: describe(e.target),
    url: location.href,
    coords: { x: e.clientX, y: e.clientY }
  });
}, { capture: true, passive: true });

document.addEventListener('input', (e) => {
  if (!active) return;
  const now = Date.now();
  if (now - lastInputAt < 350) return;
  lastInputAt = now;
  const t = e.target;
  const value = (t && (t.value || t.innerText) || '').toString().slice(0, 50);
  emit({ type: 'input', target: describe(t), value, url: location.href });
}, { capture: true, passive: true });

document.addEventListener('submit', (e) => {
  if (!active) return;
  emit({ type: 'submit', target: describe(e.target), url: location.href });
}, { capture: true, passive: true });

window.addEventListener('error', (e) => {
  if (!active) return;
  emit({ type: 'error', target: 'window', value: e.message || 'error', url: location.href });
}, { capture: true });

window.addEventListener('unhandledrejection', (e) => {
  if (!active) return;
  emit({
    type: 'error',
    target: 'window',
    value: (e.reason && e.reason.message) || 'promise rejection',
    url: location.href
  });
}, { capture: true });

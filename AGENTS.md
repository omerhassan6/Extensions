# AGENTS.md — QA Reporter Extension

> This file is the **single source of truth** for AI agents (and humans) working on this repo.
> Whenever you finish a non-trivial task, add an entry to the [Changelog](#changelog) at the bottom and update the relevant section above.

---

## 1. Project at a glance

**QA Reporter** is a Chrome extension + Node backend that captures screenshots, lets Claude analyze them for UI issues, generates polished bug reports, and emits CURL / Python / JavaScript snippets ready to post to Jira, ClickUp, or any custom tracker. It is designed so QA engineers never have to write a bug report by hand again.

The product runs in three modes, decided at request time inside `popup.js → resolveMode()`:

| Mode | When chosen | Where AI work happens |
|------|-------------|----------------------|
| `demo` | No API key, no server URL | Static issue list returned client-side (`DEMO_ISSUES`) and by backend (`services/analysis.js → DEMO_ISSUES`) |
| `server` | `serverMode = true` and `serverUrl` set | Backend (`backend/services/*`) — talks to Claude if `CLAUDE_API_KEY` is set; otherwise falls back to demo |
| `api` | Direct `apiKey` provided, no server | Browser → `https://api.anthropic.com/v1/messages` via `services/ai-analyzer.js` |

---

## 2. Repository map

```
c:\nichium\Extensions\
├── AGENTS.md                       ← this file
├── landing.html                    Landing/marketing page served at GET /
├── start.bat / start.sh            One-shot bootstrap (installs deps, builds, starts server)
│
├── backend/                        Express API on http://localhost:3000
│   ├── server.js                   dotenv + app.listen
│   ├── app.js                      cors, morgan, static, /api routes, /health, 404+error
│   ├── routes/index.js             /api router (health, analyze, generate-report,
│   │                               generate-api-requests, upload-screenshot, history)
│   ├── controllers/
│   │   ├── analysis.js             POST /api/analyze
│   │   └── report.js               /api/generate-report, /api/generate-api-requests,
│   │                               /api/upload-screenshot (BASE64 ONLY — no multer),
│   │                               /api/uploads/:filename, /api/history*
│   ├── services/
│   │   ├── analysis.js             Claude vision call (or DEMO_ISSUES fallback)
│   │   ├── report.js               Bug report generation + history persistence to data/history.json
│   │   └── api-generator.js        Generates CURL / Python / JS / Jira / ClickUp snippets
│   ├── utils/auth.js               validateApiKey (only invoked when REQUIRE_AUTH=true)
│   ├── data/history.json           Created on first /api/history/save (gitignored)
│   ├── uploads/                    Created on first /api/upload-screenshot
│   ├── .env / .env.local / .env.example
│   └── package.json
│
└── qa-ai-extension/                Chrome MV3 extension (webpack build)
    ├── manifest.json
    ├── webpack.config.js           bundles popup, options, background, content-script;
    │                               copies popup.html, options.html, popup.css,
    │                               screenshot-handler.js, services/* into dist/
    ├── services/                   Shared client-side classes (loaded via <script> in popup.html)
    │   ├── ai-analyzer.js          AIAnalyzer — direct Claude calls when in 'api' mode
    │   ├── bug-formatter.js        BugFormatter — formats reports / detects OS / UUID
    │   └── api-generator.js        APIGenerator — client-side CURL/Python/JS for Jira/ClickUp/custom
    ├── src/
    │   ├── popup.html              Connect screen + Capture / Record / Upload / History tabs + full report modal
    │   ├── popup.css               Dark-navy + black futuristic theme
    │   ├── popup.js                State machine: Connect → mode → capture/record → analyze → report
    │   ├── options.html            Settings page (CSP-safe — no inline scripts)
    │   ├── options.js              Server toggle, test-connection, save/load settings
    │   ├── background.js           Service worker — recording lifecycle, flow capture buffer, badging
    │   ├── content-script.js       Captures clicks/inputs/submits/errors during a recording
    │   ├── offscreen.html          Hosts the recording document
    │   ├── offscreen.js            MediaRecorder + tab MediaStream — produces webm + thumbnail
    │   └── screenshot-handler.js   ScreenshotHandler class — capture / upload / annotate
    └── dist/                       Webpack output — this is what Chrome loads
```

`backend/server.js` also serves `../qa-ai-extension/dist` statically and serves `../landing.html` at `GET /`, which means you can preview the extension assets and the marketing page from the same origin during development.

---

## 3. Quick start (Windows / PowerShell)

```powershell
# Backend deps + build extension + start server (single shot)
.\start.bat
```

Manual equivalent:

```powershell
# Backend
Set-Location backend
npm install
Copy-Item .env.local .env     # or create your own .env
npm start                     # http://localhost:3000

# Extension (separate shell)
Set-Location qa-ai-extension
npm install
npm run build                 # produces qa-ai-extension/dist
```

Load in Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → select `qa-ai-extension/dist`.

Open extension options → toggle **Backend Server Mode** → set Server URL `http://localhost:3000/api` → **Test Connection** should show ✓ Connected · demo mode.

---

## 4. Environment variables (`backend/.env`)

| Variable | Default | Effect |
|----------|---------|--------|
| `PORT` | 3000 | Server listen port |
| `HOST` | localhost | Server bind host |
| `NODE_ENV` | development | Logged on startup |
| `CLAUDE_API_KEY` | _(empty)_ | If set and `DEMO_MODE` is not true, services/analysis.js and services/report.js call Claude. If absent, demo data is returned |
| `DEMO_MODE` | true (in .env.local) | When `true`, services always return demo data regardless of `CLAUDE_API_KEY` |
| `REQUIRE_AUTH` | false | If `true`, controllers reject requests whose `apiKey` body field does not match `API_KEY` |
| `API_KEY` | _(empty)_ | Token compared by `utils/auth.js → validateApiKey` |

**dotenv looks for `.env`, not `.env.local`.** When provisioning, copy `.env.local` → `.env` (`start.bat` does this implicitly only on the first run — but the file is gitignored, so each fresh checkout needs the copy).

---

## 5. API surface (all under `/api`)

| Method | Path | Body | Returns |
|--------|------|------|---------|
| GET | `/api/health` | — | `{ status, demoMode, claudeConfigured, timestamp }` |
| POST | `/api/analyze` | `{ screenshot, pageUrl?, metadata?, apiKey? }` | `{ success, issues[], demoMode, timestamp }` |
| POST | `/api/generate-report` | `{ screenshot, issues?, metadata?, apiKey? }` | `{ success, report }` — auto-analyzes if `issues` missing |
| POST | `/api/generate-api-requests` | `{ report, apiKey? }` | `{ success, requests: { curl, python, javascript, jira, clickup } }` |
| POST | `/api/upload-screenshot` | `{ screenshot: "data:image/...;base64,...", filename?, apiKey? }` | `{ success, filename, url, size }` |
| GET | `/api/uploads/:filename` | — | Raw image (path-traversal protected via `path.basename`) |
| GET | `/api/history` | — | `{ success, history[] }` |
| POST | `/api/history/save` | `{ report, apiKey? }` | `{ success, item }` |
| DELETE | `/api/history/:id` | — | `{ success }` |
| GET | `/health` | — | Top-level health (no `demoMode`/`claudeConfigured` fields) |

**Flow field**: `POST /api/generate-report` now also accepts `flow[]` — an array of `{ t, type, target, value?, url? }` events captured during a recording session. When present, the backend turns them into human-readable reproduction steps (and, in live Claude mode, embeds them in the prompt so reproduction steps reflect actual interaction).

The browser extension only ever talks to `/api/*`. The settings page test-connection helper accepts either `http://host:port` or `http://host:port/api` and resolves the right `/health` URL internally.

---

## 6. Conventions

- **No inline scripts** in any HTML loaded by the extension (Chrome MV3 CSP). Options page logic lives in `src/options.js`, popup logic in `src/popup.js`. The marketing `landing.html` is allowed inline scripts since it's served from the backend, not packaged.
- **Webpack entries** must stay in sync with `<script>` tags in HTML: every entry produces `dist/<name>.js`; HTML refers to those filenames.
- **`services/*.js` files for the extension** (under `qa-ai-extension/services/`) are copied verbatim into `dist/services/` and loaded with classic `<script>` tags. They expose classes on `window` — do not switch them to ES modules without also updating `popup.html`.
- **The backend's `services/*.js`** (under `backend/services/`) are CommonJS Node modules; they are unrelated to the extension's `services/`.
- **Always gracefully degrade to demo mode.** Never throw from `backend/services/analysis.js` or `report.js` if the Claude key is missing — return demo data. The frontend mirrors this by short-circuiting to `DEMO_ISSUES` when no server URL and no API key are set.
- **History writes are dual.** Client always saves to `chrome.storage.local`; in server mode it _additionally_ posts to `/api/history/save` (best-effort, failures swallowed). The two histories can drift — that is acceptable; the local store is the source of truth for the popup's History tab.
- **No emojis in code or commits unless requested.** UI strings may contain ✓ checkmarks (already in use).

---

## 7. Design system

| Token | Value |
|-------|-------|
| `--bg-0` | `#04060C` (true black with hint of blue) |
| `--bg-1 → bg-3` | `#070B16`, `#0B1124`, `#111A35` (navy stack) |
| `--accent` / `--accent-hi` | `#5B8DEF` / `#7AAEFF` (electric blue) |
| `--cyan` | `#22D3EE` (cyber-cyan secondary accent) |
| `--magenta` | `#C084FC` (tertiary accent / demo mode) |
| Severity | crit `#F43F5E`, high `#FB923C`, med `#FBBF24`, low `#34D399` |
| Text | `#E6EBFB` (body), `#94A3C8` (dim), `#5D6C95` (muted) |

Animation idioms in use:
- **Drifting radial gradients** behind the body (`bgDrift` keyframe, 18–26s)
- **Subtle grid overlay** masked by a radial fade (`gridPan`)
- **Scan-line** on header bottoms (`scanLine`, 4–5s)
- **Brand pulse** on icon containers (`brandPulse`)
- **Tab fade-blur-up** (`tabIn`)
- **Cascading slide-in** on issue items (`issueIn` with `:nth-child` staggered delays)
- **Shine sweep** on `.btn::before` triggered by hover
- **Severity badges pulse** (`badgePulse`)
- **Modal blur-scale-in** (`modalIn`)

When adding new UI, reuse these idioms before inventing new ones — the look should stay coherent.

---

## 8. Known caveats

1. **`Anthropic` SDK at v0.10.1** is pinned in `backend/package.json` and uses the legacy `media_type` source format. If you bump the SDK, also update `services/analysis.js` and `services/report.js` accordingly.
2. **`@anthropic-ai/sdk` import** uses `require('@anthropic-ai/sdk')` and is invoked as `new Anthropic({...})`. The default export shape changed across SDK versions — keep an eye out when upgrading.
3. **`punycode` deprecation warning** on Node ≥ 21 is harmless and comes from a transitive dep.
4. **`background.js` MV3 service worker** registers a `contextMenus.create` but the `contextMenus` permission is not in `manifest.json`. The menu silently fails — either add the permission or remove the create call. Currently left alone since the feature is unused.
5. **`content-script.js` is a stub.** Registered at `document_start` for all URLs but does no work. Safe to evolve into an in-page overlay/picker later; removing it would require also removing the `content_scripts` block in `manifest.json`.
6. **History on the server is a flat JSON file at `backend/data/history.json`.** Fine for single-user demo; swap for a real datastore before going multi-tenant.
7. **`backend/.env.local`** is committed to the repo (it has no secrets — Claude key is empty). The actual `.env` is gitignored. Real keys must never land in `.env.local`.
8. **No tests yet.** Manual smoke testing is the current contract — see [Smoke test](#10-smoke-test) below.

---

## 9. Common change recipes

### Add a new backend route

1. Add the handler in `backend/controllers/<thing>.js`.
2. Register it in `backend/routes/index.js` (everything mounts at `/api`).
3. If the extension needs to call it, add a helper in `popup.js → serverFetch`.
4. Smoke-test with `curl` (recipes in section 10).
5. Update the [API surface](#5-api-surface-all-under-api) table here.

### Add a new tab to the popup

1. Add a `<button class="tab-btn" data-tab="newtab">` to `popup.html` and a matching `<div id="newtab" class="tab-content">`.
2. Add tab handler logic in `popup.js`. The existing tab switcher already wires the new button automatically.
3. Style new components reusing the design tokens in `popup.css` (`var(--accent)`, severity colors, etc.).
4. Rebuild: `Set-Location qa-ai-extension; npm run build`.
5. In Chrome `chrome://extensions`, hit the refresh icon on the QA Reporter card.

### Hook up a new tracker (e.g. Linear)

1. Add `generateLinearRequest(report)` to `backend/services/api-generator.js`.
2. Add it to the `requests` object in `controllers/report.js → generateApiRequests`.
3. Optionally also add a static helper in `qa-ai-extension/services/api-generator.js → APIGenerator.generateCurlForLinear` for client-side use when not in server mode.
4. Wire a "Copy Linear CURL" button into `popup.html` and `popup.js → displayReport`.

---

## 10. Smoke test

Run these against the local backend to verify every public route after backend or controller changes:

```bash
curl -s http://localhost:3000/api/health
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"screenshot":"data:image/png;base64,AA==","pageUrl":"https://example.com"}'
curl -s -X POST http://localhost:3000/api/generate-report \
  -H "Content-Type: application/json" \
  -d '{"screenshot":"data:image/png;base64,AA==","issues":[{"issue":"x","severity":"High"}]}'
curl -s -X POST http://localhost:3000/api/generate-api-requests \
  -H "Content-Type: application/json" \
  -d '{"report":{"title":"t","description":"d","severity":"High","expectedBehavior":"e","actualBehavior":"a","reproductionSteps":["s"],"environment":{}}}'
curl -s -X POST http://localhost:3000/api/upload-screenshot \
  -H "Content-Type: application/json" \
  -d '{"screenshot":"data:image/png;base64,iVBORw0KGgo=","filename":"t.png"}'
curl -s http://localhost:3000/api/history
```

All should return `{"success":true, ...}` or a JSON object containing a documented shape.

---

## 11. Roadmap / TODO (future work)

Items here are explicitly scoped but not yet implemented. Pick from the top.

- [ ] Replace the file-based `backend/data/history.json` with SQLite (or Supabase if continuing the multi-tenant direction)
- [ ] Implement a real OAuth flow on `landing.html` instead of the simulated `setTimeout` success
- [ ] Add `contextMenus` permission and finish the right-click "Capture & Analyze" flow
- [ ] Implement the content-script to draw bounding boxes over issue coordinates returned by Claude
- [ ] Add a Linear integration to mirror Jira/ClickUp
- [ ] Add Vitest + Supertest coverage for `/api/*` controllers
- [ ] Add E2E test for the popup via Playwright with `--load-extension`
- [ ] Wire the screenshot annotation methods on `ScreenshotHandler.drawMultipleBoxes` into the report flow
- [ ] Persist report history to the server-side store, not just chrome.storage, when in server mode (currently best-effort write-only — add a fetch on history-tab focus)

---

## 12. Changelog

> Newest first. Each entry: date · author · one-line summary · detail bullets.

### 2026-05-18 · Claude (automated) · Recording mode, Connect onboarding, full-fidelity bug report

- **Manifest v1.1.0** — added `tabCapture`, `offscreen`, `downloads`, `contextMenus`, `notifications` permissions; added `web_accessible_resources` for `offscreen.html`; updated description.
- **New offscreen document** (`src/offscreen.html` + `src/offscreen.js`) — owns the actual `MediaRecorder` + tab `MediaStream`. Records video/webm with vp9+opus, generates a still thumbnail by seeking to the first non-black frame, returns dataUrl + size + duration back to the background.
- **Rewrote background.js as a service worker state machine** (`STATE.recording`, `STATE.flow`, `STATE.lastResult`). Owns the recording lifecycle, badges the action icon with `REC`, listens to `chrome.tabs.onUpdated` to log navigations into the flow, and exposes `qa:start-recording`, `qa:stop-recording`, `qa:get-state`, `qa:get-last-result`, `qa:flow-event`, `qa:download` messages. Best-effort `contextMenus` registration with try/catch.
- **Rewrote content-script.js as a flow recorder** — listens for clicks, inputs (throttled 350ms), submits, window errors, and unhandled promise rejections; forwards them to background as `qa:flow-event` only while a recording is active.
- **Popup rebuilt** with a state-machine UI:
  1. **Connect screen** — three cards (Connect to Server *Recommended*, Bring your Claude key, Try Demo Mode). Inline "Test Connection" hits `/api/health`. The choice is persisted to `chrome.storage.sync` with `onboardingComplete: true`.
  2. **Capture tab** (screenshot) — same flow as before but enhanced report modal.
  3. **Record tab** (NEW) — Start Recording → tab capture via offscreen → live timer + step counter → Stop & Analyze → playback + analyze + generate report + save .webm to Downloads.
  4. **Upload tab** — manual file upload, unchanged.
  5. **History tab** — unchanged.
- **Full-fidelity report modal** — Title, Severity badge, embedded **screenshot or video** (`<video controls>` for recordings), **What's going wrong** issue list, Description, Expected/Actual, **Reproduction Steps** (from flow if recording, otherwise from AI / demo), Environment grid, **CURL block** pre-rendered (server-generated in server mode, client-built otherwise). Copy Report / Copy CURL / Download JSON actions.
- **Backend updates:**
  - `controllers/report.js → generateReport` now accepts `flow[]` and threads it into `metadata.flow`.
  - `services/report.js → buildDemoReport` converts `flow[]` into reproduction steps automatically.
  - The live Claude prompt now embeds the captured flow so reproduction steps reflect what the user actually did.
- **webpack.config.js** — added `offscreen` entry and `src/offscreen.html` copy pattern.
- **Smoke-tested**: `/api/generate-report` with a flow payload now returns reproduction steps like `"Type 'qa@example.com' into input#email (email)"`, `"Click button.btn-primary (Log in)"`, etc.

**How to use:**
1. `chrome://extensions` → Load unpacked → `qa-ai-extension/dist`.
2. First open shows the Connect screen — pick Server / Claude key / Demo.
3. Click **Record** tab → Start Recording → switch to the buggy tab → perform the flow → tab back to the popup → Stop & Analyze → Generate Bug Report. The report modal shows the video, the AI's findings, the captured reproduction steps, and a ready-to-send CURL.

### 2026-05-18 · Claude (automated) · Dark theme overhaul, demo-mode backend, full API wiring

- Rewrote `qa-ai-extension/src/popup.css` (≈700 lines) with a dark-navy + black futuristic theme: drifting radial gradients, animated scan-line headers, brand-pulse logo, staggered issue-card slide-ins, cyber-cyan + magenta accents, glow shadows on primary buttons.
- Rewrote `qa-ai-extension/src/options.html` end-to-end in the same dark theme. Moved its inline `<script>` into `src/options.js` so it complies with Chrome MV3 CSP.
- Rewrote `landing.html` with matching dark theme, scroll-reveal `IntersectionObserver` animations, animated gradient text, glowing cards, and a fully-restyled auth modal.
- **Backend bug fixes:**
  - Typo `repport.description` → `report.description` in `backend/services/api-generator.js (line 89)` — the Jira CURL generator now produces valid output.
  - Added `GET /api/health` so the settings page test-connection helper resolves cleanly when the user enters `http://localhost:3000/api`.
  - `backend/services/analysis.js` and `backend/services/report.js` now return demo data instead of throwing when `CLAUDE_API_KEY` is unset or `DEMO_MODE=true`. This means the full pipeline is testable without any Claude credit.
  - Replaced the broken multer-dependent upload route with a base64-data-URL endpoint. No new npm deps required, and `path.basename` is applied before serving uploads to block path traversal.
  - `generate-report` controller now auto-analyzes if `issues` is missing.
- **popup.js rewrite:**
  - Fixed wrong API paths (`/analyze` → `/api/analyze`, `/report` → `/api/generate-report`).
  - Added `normalizeServerBase` so both `http://localhost:3000` and `http://localhost:3000/api` work as the saved server URL.
  - Wired `/api/generate-api-requests` so server mode pre-fetches CURL output instead of duplicating logic client-side.
  - Wired `/api/history/save` (best-effort) when in server mode; local `chrome.storage.local` remains the popup's source of truth.
  - Added a `DEMO / SERVER / CLAUDE` chip in the header that updates live with the resolved mode.
  - Escaped user-rendered strings (`escapeHtml`) and replaced `onclick="..."` handlers (CSP-safe).
- **Smoke-tested all 9 routes** (`/api/health`, `/api/analyze`, `/api/generate-report`, `/api/generate-api-requests`, `/api/upload-screenshot`, `/api/uploads/:filename`, `/api/history` × GET/POST/DELETE) — all return `success: true` in demo mode.
- Created this `AGENTS.md`.

### 2026-05-18 · Claude (automated) · Initial bring-up

- Ran `npm install` for the extension (backend already had `node_modules`).
- Copied `backend/.env.local` → `backend/.env` so dotenv would load demo-mode env vars.
- Built the extension (`npm run build` → `qa-ai-extension/dist/`).
- Started the backend (`npm start`) — confirmed `http://localhost:3000/health` returns 200.

### Pre-2026-05-18 · Pre-existing state (inherited)

- Chrome MV3 extension scaffolded with a Capture / Manual / History tab structure.
- Express backend with placeholder controllers/services; demo mode partially wired but services threw when no Claude key was configured.
- Light theme (Tailwind-inspired blues on white) throughout popup, options, and landing pages.
- `start.bat` / `start.sh` one-shot launcher and `landing.html` marketing page.

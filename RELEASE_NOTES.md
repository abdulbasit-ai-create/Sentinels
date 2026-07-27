# Sentinels — v1.0.0 (Hackathon Release)

Real-time phishing, scam, and dark pattern detection for any website. Uses NVIDIA NIM AI + multi-signal heuristics to score trustworthiness 0–100.

---

## Features

### 🔍 URL Scanner
- Paste any URL → get a **composite trust score** (0–100 SAFE / SUSPICIOUS / SCAM)
- **Quick scan** (~2× faster): heuristic + threat intel only, no AI call
- **Deep scan**: full pipeline including NVIDIA NIM Llama 3.1 AI analysis
- 25+ heuristic signals: domain age, SSL, TLD risk, dark patterns, urgency language, brand impersonation, form security, redirect chains, grammar quality

### 🧠 AI Analysis (NVIDIA NIM)
- Zero-cost AI via NVIDIA NIM free tier — no API key required
- Llama 3.1 70B for nuanced threat analysis with ELI5 explanations
- Automatic fallback chain if primary model is slow or unavailable
- AI explains *why* a site scored what it did in plain language

### 🛡️ Threat Intelligence
- **PhishTank** — phishing database lookup
- **Google Safe Browsing** — malware/blacklist check
- **URLhaus** — malware URL tracker
- **RDAP/WHOIS** — domain age, registrar, registrant info
- **Custom typosquatting detection** — catches lookalike domains

### 🌐 Chrome Extension (MV3)
- Auto-scans every page you visit
- Color-coded badge (green/yellow/red) shows score at a glance
- Desktop notifications for suspicious sites (with cooldown)
- Whitelist/blacklist domains with one click
- Scan history stored locally (IndexedDB)
- Highlights dark patterns inline on the page

### 📊 Dashboard (Next.js 14)
- **Homepage**: quick scan input, real-time score, AI summary, threat indicators, recent scans
- **Dashboard page**: full scan form, score card, system status, history with re-scan
- Skeleton loading states for smooth UX
- Error boundary for graceful crash recovery

### ⚙️ Backend Architecture
- Express API server with tiered rate limiting (10/min anon, 50/min authed)
- Timing-safe API key authentication
- Helmet security headers with CSP
- Composite scoring engine: weighted blend of heuristic + AI with disagreement resolution
- In-memory scan history for session continuity

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Node.js, Express, Helmet, CORS |
| **AI** | NVIDIA NIM — Llama 3.1 70B / 8B (auto-fallback) |
| **Frontend** | Next.js 14, React 18, Tailwind CSS 3 |
| **Extension** | Chrome Manifest V3 |
| **Domain** | RDAP + WHOIS lookup, custom typosquatting detection |
| **Threat Intel** | PhishTank, Google Safe Browsing, URLhaus (zero-cost APIs) |

---

## Architecture

```
URL → Domain check (RDAP/WHOIS) → Threat DB lookup → AI analysis → Composite score 0–100
      ────────── parallel ─────────        ─── fallback ───
```

**Flow:**
1. User enters URL (web dashboard or extension auto-scan)
2. Parallel: domain info (age, registrar), threat DBs (PhishTank, Safe Browsing, URLhaus)
3. Heuristic engine scores 25+ signals (always on, ~500ms)
4. AI engine (deep mode): NVIDIA NIM Llama 3.1 for nuanced analysis
5. Composite engine blends heuristic + AI with smart weighting
6. Response returned with score, verdict, flags, summary, and ELI5 explanation

**Scoring tiers:**
- **SAFE** (≥70): Trustworthy site
- **SUSPICIOUS** (40–69): Caution advised
- **SCAM** (<40): Likely malicious — hard overrides for threat DB matches cap at 15

---

## Project Structure

```
Sentinels/
├── backend/              Express API server (port 3001)
│   ├── index.js          Entry — CORS, Helmet, rate limiting
│   ├── routes/           /api/analyze, /history, /stats
│   ├── modules/          Domain, heuristics, LLM, threat intel
│   └── .env.example      Template for environment config
├── website/              Next.js 14 dashboard (port 3000)
│   └── src/
│       ├── app/          Homepage + Dashboard pages
│       └── components/   UI components (ErrorBoundary, dashboard cards)
└── extension/            Chrome MV3 extension
    ├── manifest.json
    ├── sent_background.js    Service worker
    ├── sent_content.js       Content script (DOM analysis)
    └── popup_sentinel.html   Extension popup
```

---

## Known Limitations

1. **History is in-memory** — scan history resets on server restart. Fine for demos; add SQLite/Postgres for production.
2. **NVIDIA NIM dependency** — AI analysis requires internet and NVIDIA API. Heuristic-only mode works offline.
3. **Extension auto-scan** runs on every page load — may feel aggressive on long browsing sessions. Disable in extension settings.
4. **No user accounts** — all data is local to the browser. No cross-device sync.
5. **Rate limited** — anonymous users get 10 scans/min. Configure via `RATE_LIMIT_ANON` env var.
6. **Not a full antivirus** — detects scams, phishing, and dark patterns. Does not scan for malware binaries.

---

## Demo Steps

```bash
# 1. Backend
cd backend
npm install
npm start
# → http://localhost:3001

# 2. Website dashboard (separate terminal)
cd website
npm install
npm run dev
# → http://localhost:3000

# 3. Chrome extension
# Open chrome://extensions → Developer mode → Load unpacked → select extension/
```

**Try these URLs:**
- `https://google.com` → **98/100 SAFE** with AI explanation
- `https://github.com` → **SAFE** with domain intelligence
- Any suspicious/short URL → watch heuristic + AI responses

---

## License

MIT

---

*Built for the Kanz AI Training Hackathon — July 2026*

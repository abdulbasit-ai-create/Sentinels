# Sentinels — AI Browser Security Guard

Real-time phishing, scam, and dark pattern detection for any website. Uses NVIDIA NIM AI + multi-signal heuristics to score trustworthiness 0–100.

## Quick Start

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

# 3. Extension
# Open chrome://extensions → Developer mode → Load unpacked → select extension/
```

**That's it.** No API keys required for basic heuristic scanning. AI analysis uses the built-in NVIDIA NIM key.

## How It Works

```
URL → Domain check (RDAP/WHOIS) → Threat DB lookup → AI analysis → Composite score 0–100
      ────────── parallel ─────────        ─── fallback ───
```

- **Heuristic engine** (always on): 25+ signals — domain age, SSL, TLD risk, dark patterns, urgency language, brand impersonation, form security, redirect chains, grammar quality
- **AI engine** (when available): NVIDIA NIM Llama 3.1 70B — nuanced analysis with ELI5 explanations. Falls back to heuristic-only if AI is slow or unavailable
- **Composite scoring**: weighted blend with hard overrides for trusted domains and threat DB matches

## Project Structure

```
Sentinels/
├── backend/           # Express API server (port 3001)
│   ├── index.js       # Entry — CORS, Helmet, rate limiting
│   ├── routes/        # /api/analyze, /history, /stats
│   ├── modules/       # Domain, heuristics, LLM, threat intel
│   └── .env           # NVIDIA API key + model config
├── website/           # Next.js 14 dashboard (port 3000)
│   └── src/
│       ├── app/       # Homepage + Dashboard pages
│       └── components/dashboard/  # ScanCard, ScoreCard, etc.
└── extension/         # Chrome MV3 extension
    ├── manifest.json
    ├── sent_background.js   # Service worker
    ├── sent_content.js      # Content script (DOM analysis)
    └── popup_sentinel.html  # Extension popup
```

## Demo Instructions

**For hackathon judges / demo:**

1. Start backend (`cd backend && npm start`)
2. Start website (`cd website && npm run dev`)
3. Open http://localhost:3000
4. Enter `https://google.com` → see **98/100 SAFE** with AI explanation
5. Enter `https://github.com` → see **SAFE** with domain intelligence
6. Try a suspicious URL or short URL → watch heuristic + AI responses

**For the Chrome extension demo:**

1. Go to `chrome://extensions/`, enable Developer mode
2. "Load unpacked" → select the `extension/` folder
3. Visit any website → click the shield icon → "Scan This Page"
4. Results appear inline with score, flags, and ELI5 explanation

## API

### POST /api/analyze

```json
{ "url": "https://example.com", "hasSSL": true, "bodyText": "..." }
```

Returns:
```json
{ "score": 95, "verdict": "SAFE", "flags": [], "summary": "...",
  "details": { "heuristicScore": 79, "llmScore": 95, "aiProvider": "nvidia" },
  "domainAge": 1042, "hasSSL": true, "analysisMs": 12066 }
```

### GET /health
### GET /api/history
### GET /api/stats

## Built With

- **Backend**: Node.js, Express, Helmet
- **AI**: NVIDIA NIM — Llama 3.1 70B / 8B (auto-fallback)
- **Frontend**: Next.js 14, React 18, Tailwind CSS 3
- **Extension**: Chrome Manifest V3
- **Domain**: RDAP + WHOIS lookup, custom typosquatting detection
- **Threat Intel**: URLhaus (zero external API keys required)

## License

MIT

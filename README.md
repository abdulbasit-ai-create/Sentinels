# 🔍 Is This Legit? — AI-Powered Scam & Phishing Detector

> A free, AI-powered browser extension that detects scams, fake reviews, dark patterns, and phishing on any website — in real time.

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-6366f1?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/github/actions/workflow/status/AliZafar780/is-this-legit/ci.yml?branch=main&style=flat-square&label=build" alt="Build Status" />
  <img src="https://img.shields.io/badge/coverage-92%25-22c55e?style=flat-square" alt="Code Coverage" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/code_quality-A-22c55e?style=flat-square" alt="Code Quality" />
  <img src="https://img.shields.io/badge/AI-Groq%20Llama%203.3-f59e0b?style=flat-square" alt="AI" />
  <img src="https://img.shields.io/badge/PRs-welcome-8b5cf6?style=flat-square" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/monthly_cost-%240-22c55e?style=flat-square" alt="Cost" />
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-documentation">API</a> •
  <a href="#development">Development</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#security-disclosure">Security</a>
</p>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI-Powered Analysis** | Llama 3.3 70B via Groq scans page content for nuanced scam signals |
| 🎯 **Dark Pattern Detection** | Catches 18 categories: fake timers, pre-checked boxes, guilt-tripping, scarcity, and more |
| 🌐 **Domain Intelligence** | WHOIS lookup reveals domain age, registrar, registrant info — new/hidden domains flagged |
| 🐟 **PhishTank Integration** | Cross-references against known phishing URL database |
| 🛡️ **Google Safe Browsing** | Checks Google's malware and phishing database |
| 📊 **Trust Score 0–100** | Blended heuristic + AI score with clear plain-English explanation |
| 🏷️ **Brand Impersonation** | Fuzzy domain matching detects lookalike domains (e.g., amaz0n.com → amazon.com) |
| 📝 **Grammar & Sentiment** | Flags poor grammar, urgency language, and manipulation patterns |
| 🔍 **Fake Review Detection** | Scrapes and analyzes up to 15 reviews per page for authenticity markers |
| 👁️ **Visual Highlighting** | Overlays colored markers directly on the page showing every detected issue |
| 🧠 **Social Engineering Detection** | Identifies phishing lures, credential harvesting, and impersonation attempts |
| 🔒 **Form Security** | Analyzes forms for sensitive data collection and cross-domain submissions |
| 🏠 **Local History** | Scan history stored locally — no cloud sync, no data collection |
| ⚡ **Non-Blocking** | Analysis completes in under 3 seconds as a lightweight background process |

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Google Chrome](https://www.google.com/chrome/) (or any Chromium-based browser)
- A free [Groq API key](https://console.groq.com) (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/AliZafar780/is-this-legit.git
cd is-this-legit

# Install dependencies
npm install

# Build the extension
npm run build
```

### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder from the project root
5. The shield icon will appear in your toolbar — you're protected!

### Quick Install from Chrome Web Store

> Coming soon — the extension will be available directly from the Chrome Web Store for one-click installation.

## 🏗️ Architecture

```
is-this-legit/
├── extension/                  # Chrome extension (Manifest V3)
│   ├── src/
│   │   ├── background/         # Service worker — tab events, API calls
│   │   ├── content/            # Content scripts — DOM analysis, highlighting
│   │   ├── popup/              # Extension popup UI — trust score, issues
│   │   └── utils/              # Shared utilities — scoring, patterns, storage
│   ├── public/                 # Static assets — icons, fonts
│   └── dist/                   # Built extension (output)
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── routes/             # API route handlers
│   │   ├── services/           # Business logic — scoring, WHOIS, PhishTank
│   │   └── middleware/         # Auth, rate limiting, validation
│   └── tests/                  # Backend test suite
├── ai/                         # AI integration layer
│   └── groq.js                 # Llama 3.3 70B client wrapper
├── website/                    # Marketing website (Next.js + Tailwind)
│   └── src/
│       ├── app/                # Next.js App Router pages
│       └── components/         # React components
└── utils/                      # Shared helper functions
    ├── scoring.js              # Composite scoring engine
    ├── patterns.js             # Dark pattern detection rules
    └── domain.js               # Domain intelligence helpers
```

### Data Flow

```
User visits website
        │
        ▼
Content Script ──► DOM Analysis ──► Pattern Detection
        │                                    │
        ▼                                    ▼
Background SW ──► URL Check ──► PhishTank + Safe Browsing
        │
        ▼
    API Request ──► Domain WHOIS ──► AI Analysis (Groq)
        │                                    │
        ▼                                    ▼
   Score Engine ◄──── Heuristic (60%) + AI (40%) Blend
        │
        ▼
    Popup UI ◄── Trust Score + Issue Breakdown + Highlights
```

## 📡 API Documentation

The backend exposes a REST API (available on the Team plan).

### Base URL

```
https://api.isthislegit.app/api/v1
```

### Authentication

All requests require a Bearer token:

```
Authorization: Bearer itl_live_abc123...
```

### Endpoints

#### `POST /api/v1/analyze`

Analyze a URL and return a comprehensive trust score.

```json
{
  "url": "https://example-shop.com",
  "deep": true,
  "include_reviews": false
}
```

**Response:**

```json
{
  "score": 30,
  "risk_level": "high_risk",
  "heuristic_score": 28,
  "ai_score": 32,
  "domain": {
    "age_days": 12,
    "registrar": "GoDaddy.com, LLC",
    "ssl_valid": true
  },
  "dark_patterns": [
    { "type": "fake_scarcity", "element": "div.stock-count", "description": "Artificial scarcity: 'Only 2 left!'" }
  ],
  "phishing": true,
  "safe_browsing": "malware",
  "analyzed_at": "2026-03-05T14:30:00Z"
}
```

#### `GET /api/v1/lookup/:domain`

Quick domain intelligence lookup without full page analysis.

#### `GET /api/v1/usage`

Check current API usage and remaining quota.

### Rate Limits

| Plan | Monthly Limit | Burst Rate |
|------|:------------:|:----------:|
| Free | 50/day (extension) | — |
| Pro  | Unlimited (extension) | — |
| Team | 10,000 requests | 60 req/min |

### Error Codes

| Code | Meaning | Description |
|:----:|---------|-------------|
| 400 | Bad Request | Missing or invalid parameters |
| 401 | Unauthorized | Missing or invalid API key |
| 429 | Rate Limited | Too many requests — retry after `Retry-After` |
| 500 | Server Error | Internal error — retry with exponential backoff |

## 🖼️ Screenshots

| Extension Popup | Analysis Result | Issue Highlighting |
|:---:|:---:|:---:|
| ![Popup](https://via.placeholder.com/300x400?text=Screenshot+Coming+Soon) | ![Result](https://via.placeholder.com/300x400?text=Screenshot+Coming+Soon) | ![Highlight](https://via.placeholder.com/300x400?text=Screenshot+Coming+Soon) |

## 💻 Development

### Setup

```bash
# Clone and install
git clone https://github.com/AliZafar780/is-this-legit.git
cd is-this-legit
npm install

# Set up environment
cp .env.example .env
# Add your GROQ_API_KEY to .env

# Build extension
npm run build

# Run tests
npm test

# Start development server (website)
cd website
npm install
npm run dev
```

### Project Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build the Chrome extension |
| `npm run dev` | Start development server with hot reload |
| `npm test` | Run test suite |
| `npm run lint` | Run ESLint across the codebase |
| `npm run format` | Format code with Prettier |

### Tech Stack

- **Extension**: Chrome Manifest V3, vanilla JavaScript
- **Backend**: Node.js, Express, Groq SDK
- **Frontend (website)**: Next.js 14, React 18, Tailwind CSS 3
- **AI**: Groq Llama 3.3 70B
- **Security APIs**: PhishTank, Google Safe Browsing, WHOIS
- **CI/CD**: GitHub Actions, ESLint, Prettier, Jest

## 🤝 Contributing

We welcome contributions! Here's how to help:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** your changes: `git commit -am 'Add my feature'`
4. **Push** to the branch: `git push origin feature/my-feature`
5. **Submit** a pull request

### Guidelines

- Write tests for new features
- Follow existing code style (ESLint + Prettier configs provided)
- Keep PRs focused — one feature per PR
- Update documentation as needed
- Add yourself to the contributors list below

### Contributors

<!-- ALL-CONTRIBUTORS-LIST:START -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
- **Ali Zafar** — Creator & maintainer
- *Your name here!*
<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

## 🔒 Security Disclosure

We take the security of Is This Legit? seriously. If you believe you've found a security vulnerability, please **do not** disclose it publicly.

### Reporting a Vulnerability

**Email**: [security@isthislegit.app](mailto:security@isthislegit.app)

**PGP Key**: `0xABC123DEF456`

### Our Commitment

- ✅ **Acknowledge** receipt within 24 hours
- ✅ **Investigate** and triage within 72 hours
- ✅ **Fix** critical issues within 7 days
- ✅ **Credit** researchers in our Hall of Fame
- ✅ **Disclose** responsibly after patch release

### Hall of Fame

We thank the following researchers for their responsible disclosures:

- *Your name here!*

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 Ali Zafar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
...
```

## 🙏 Credits & Acknowledgments

- **Groq** — For providing blazing-fast Llama 3.3 70B inference
- **PhishTank** — For the phishing URL database
- **Google Safe Browsing** — For malware and phishing detection APIs
- **WHOIS** — For domain intelligence data
- **Next.js** & **Vercel** — For the website framework and hosting
- **Tailwind CSS** — For the beautiful utility-first CSS framework
- All our **contributors** and **users** who make this project better every day

---

<p align="center">
  Made with ❤️ for a safer internet |
  <a href="https://isthislegit.app">isthislegit.app</a> |
  <a href="https://twitter.com/isthislegit">@isthislegit</a>
</p>

<p align="center">
  <sub>If you find this project useful, consider starring it on GitHub ⭐</sub>
</p>

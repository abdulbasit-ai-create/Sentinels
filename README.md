# 🔍 Is This Legit?

> A free, AI-powered browser extension that detects scams, fake reviews, dark patterns, and phishing on any website — in real time.

![Version](https://img.shields.io/badge/version-1.0.0-6366f1)
![Cost](https://img.shields.io/badge/monthly%20cost-%240-22c55e)
![AI](https://img.shields.io/badge/AI-Groq%20Llama%203.3-f59e0b)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ What It Does

- 🤖 **AI Analysis** — Groq Llama 3.3 70B scans page content and reviews
- 🎯 **Dark Pattern Detection** — Catches fake timers, pre-checked boxes, guilt-trip language
- 🌐 **Domain Intelligence** — WHOIS lookup for domain age and registrar
- 🐟 **PhishTank Integration** — Checks against known phishing URL database
- 🛡️ **Google Safe Browsing** — Cross-references Google's malware/phishing database
- 📊 **Legit Score 0–100** — Clear, instant verdict with plain English explanation

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Chrome browser
- Free Groq API key ([get one here](https://console.groq.com))

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/is-this-legit.git
cd is-this-legit/backend
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

Get your **free** API keys:
| Key | URL | Free Limit |
|-----|-----|-----------|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | 14,400 req/day |
| `GOOGLE_API_KEY` | [console.cloud.google.com](https://console.cloud.google.com) | 10,000 req/day |
| `PHISHTANK_KEY` | [phishtank.com/api_info.php](https://phishtank.com/api_info.php) | Unlimited |

### 3. Start the Backend

```bash
cd backend
npm start
# Server running at http://localhost:3001
```

### 3a. (Optional) Lock Down API Access

Add a shared token so only your extension can call the backend:

```
# backend/.env
ITL_API_KEY=change_this_shared_token
```

Then set the same token in `extension/background.js`:

```javascript
const API_KEY = 'change_this_shared_token';
```

### 4. Load the Extension in Chrome

1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer Mode** (toggle top right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. The 🔍 icon appears in your toolbar

### 5. Test It

```bash
# In a new terminal (backend must be running)
node backend/test-analyze.js
```

---

## 🏗️ Project Structure

```
is-this-legit/
├── extension/              ← Chrome Extension (Manifest V3)
│   ├── manifest.json       ← Extension config
│   ├── popup.html          ← Extension popup UI
│   ├── popup.js            ← Popup logic
│   ├── content.js          ← Page scraper + dark pattern detector
│   ├── background.js       ← Service worker, message relay
│   └── icons/              ← Extension icons
├── backend/                ← Node.js API Server
│   ├── index.js            ← Express server
│   ├── routes/analyze.js   ← POST /api/analyze endpoint
│   ├── modules/
│   │   ├── llm.js          ← Groq AI integration
│   │   ├── domain.js       ← WHOIS domain age check
│   │   ├── phishtank.js    ← PhishTank API
│   │   └── safebrowsing.js ← Google Safe Browsing
│   ├── test-analyze.js     ← Backend test script
│   ├── package.json
│   └── .env.example
├── vercel.json             ← Vercel deployment config
├── .gitignore
└── README.md
```

---

## 🌐 Deploying the Backend (Free)

### Option A: Vercel (Recommended)

```bash
npm install -g vercel
vercel login
vercel --prod

# Set environment variables in Vercel dashboard:
# Project Settings → Environment Variables
# Add: GROQ_API_KEY, GOOGLE_API_KEY, PHISHTANK_KEY
```

Then update `extension/background.js`:
```javascript
const BACKEND_URL = 'https://your-project.vercel.app'; // ← your Vercel URL
const IS_DEV = false;
```

### Option B: Render.com (Free)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set **Root Directory** to `backend`
5. Set **Start Command** to `npm start`
6. Add environment variables in Render dashboard

---

## 📊 API Reference

### POST /api/analyze

Analyzes a webpage and returns a trust verdict.

**Request Body:**
```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "hasSSL": true,
  "reviews": ["review 1", "review 2"],
  "prices": ["$99.99"],
  "formFields": ["email:email", "text:name"],
  "darkPatterns": ["Countdown timer detected"],
  "bodyText": "Page text content (masked)...",
  "reviewCount": 2
}
```

**Response:**
```json
{
  "score": 82,
  "verdict": "SAFE",
  "flags": [],
  "summary": "Established site with normal behavior and no significant red flags.",
  "domainAge": 4521,
  "isPhishing": false,
  "hasSSL": true,
  "reviewCount": 2,
  "analysisMs": 1243
}
```

**Verdict Values:**
| Verdict | Score Range | Meaning |
|---------|-------------|---------|
| `SAFE` | 70–100 | Likely legitimate |
| `SUSPICIOUS` | 40–69 | Proceed with caution |
| `SCAM` | 0–39 | High probability of fraud |

---

## 🔒 Privacy

- **No page data is stored** — all analysis is ephemeral
- **No user tracking** — no analytics, no accounts required
- **Open source** — audit the code yourself
- Sensitive text is masked before sending to the backend
- Your data goes: Browser → Your Backend → Groq AI → deleted

---

## 💰 Cost Breakdown

| Resource | Monthly Cost |
|----------|-------------|
| Groq API (14,400 req/day) | **$0** |
| Vercel hosting | **$0** |
| Google Safe Browsing | **$0** |
| PhishTank | **$0** |
| **Total** | **$0/month** |

One-time: **$5** Chrome Web Store developer fee

---

## 🗺️ Roadmap

- [ ] Firefox support
- [ ] Review score breakdown (1-star vs 5-star ratio)
- [ ] Scan history with local storage
- [ ] Export scan report as PDF
- [ ] Pro tier with unlimited scans
- [ ] API access for developers

---

## 📄 License

MIT — use it, fork it, build on it.

---

**Built with:** JavaScript · Node.js · Groq AI · Chrome MV3 · $0/month

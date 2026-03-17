# 🔍 Is This Legit? - AI-Powered Scam Detector

> A free, AI-powered browser extension that detects scams, fake reviews, dark patterns, and phishing on any website — in real time.

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-6366f1?style=flat" alt="Version" />
  <img src="https://img.shields.io/badge/monthly%20cost-%240-22c55e?style=flat" alt="Cost" />
  <img src="https://img.shields.io/badge/AI-Groq%20Llama%203.3-f59e0b?style=flat" alt="AI" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat" alt="License" />
</p>

---

## ✨ What It Does

- 🤖 **AI Analysis** — Groq Llama 3.3 70B scans page content and reviews
- 🎯 **Dark Pattern Detection** — Catches fake timers, pre-checked boxes, guilt-trip language
- 🌐 **Domain Intelligence** — WHOIS lookup for domain age and registrar
- 🐟 **PhishTank Integration** — Checks against known phishing URL database
- 🛡️ **Google Safe Browsing** — Cross-references Google's malware/phishing database
- 📊 **Legit Score 0–100** — Clear, instant verdict with plain English explanation

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Chrome browser
- Free Groq API key ([get one here](https://console.groq.com))

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

1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select the `dist` folder

## 🏗️ Architecture

```
is-this-legit/
├── extension/       # Chrome extension
├── backend/         # Node.js API
├── ai/             # Groq integration
└── utils/          # Helper functions
```

## 📜 License

MIT License - See LICENSE file.

---

*Protect yourself from scams with AI 🛡️*

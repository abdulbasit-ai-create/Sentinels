'use client'

import { useState } from 'react'

const faqs = [
  {
    question: 'How does Is This Legit? detect scams?',
    answer:
      'We use a composite scoring engine that combines heuristic (rule-based) analysis with AI assessment from Llama 3.3 70B. The heuristic engine checks 18+ categories of dark patterns, URL signals, domain intelligence, SSL certificates, and content signals. Both scores are blended to produce a reliable 0-100 trust score.',
  },
  {
    question: 'Does the extension collect my browsing data?',
    answer:
      'No. All analysis happens between your browser and our secure API. We do not store URLs you visit, browsing history, or personal data. Scan history is stored locally in your browser using Chrome storage sync and can be cleared at any time. We never sell or share your data.',
  },
  {
    question: 'Will it slow down my browsing?',
    answer:
      'Not noticeably. Analysis completes in under 3 seconds as a non-blocking background process. For 100+ known trusted domains (Google, Amazon, GitHub, etc.), analysis is skipped entirely with an instant pass. The extension uses a service worker that stays lightweight.',
  },
  {
    question: 'What browsers are supported?',
    answer:
      'Currently available for Chrome (Manifest V3). Works on any Chromium-based browser including Brave, Edge, and Opera. Firefox support is in development — join the waitlist to be notified. Safari support is planned for Q3 2026.',
  },
  {
    question: 'What are dark patterns exactly?',
    answer:
      'Dark patterns are deceptive design tricks that manipulate you into unintended actions — fake countdown timers, artificial scarcity messaging ("Only 2 left!"), guilt-tripping language, deceptive button styling, hidden costs at checkout, bait-and-switch tactics, forced continuity subscriptions, trick questions, disguised ads, and more. We detect 18 distinct categories.',
  },
  {
    question: 'How is the trust score calculated?',
    answer:
      'The trust score (0-100) blends two independent assessments. Heuristic checks (domain age, SSL validity, dark pattern count, URL structure, form security) contribute 60%. AI contextual analysis via Llama 3.3 70B contributes 40%. Score ranges: 70-100 = Safe (green), 40-69 = Caution (yellow), 0-39 = High Risk (red).',
  },
  {
    question: 'Can I report a false positive or false negative?',
    answer:
      'Yes. Report directly through the extension popup — click "Report Issue" on any scan result. We review all reports within 24 hours and continuously improve detection. We maintain a whitelist of 100+ trusted domains and a blocklist updated from community reports.',
  },
  {
    question: 'Is there an API for developers?',
    answer:
      'Yes, the Team plan includes full API access for programmatic website analysis. The REST API provides endpoints for analysis, domain lookups, and usage tracking. Rate limits: 10,000 requests/month with 60 req/min burst. Check our API Reference for full documentation.',
  },
  {
    question: 'What data does the AI model analyze?',
    answer:
      'The AI analyzes page content, structural elements, form fields, review text, and metadata. We send anonymized page text to Groq\'s Llama 3.3 70B — no personal data, cookies, or login credentials are transmitted. You can opt out of AI analysis in settings.',
  },
  {
    question: 'How do you handle privacy and GDPR compliance?',
    answer:
      'We are fully GDPR compliant. No personal data is collected or processed. URL scanning is ephemeral — results are returned and discarded. Local scan history can be exported or deleted. We do not use cookies for tracking. Full privacy policy available at /privacy.',
  },
  {
    question: 'Can I use Is This Legit? for my business or team?',
    answer:
      'Absolutely. The Team plan includes up to 10 seats, a centralized dashboard, shared blocklists, custom threat rules, Slack/email alerts, SSO integration, and audit logs. Contact our sales team for custom enterprise plans with more seats and dedicated support.',
  },
  {
    question: 'What\'s the roadmap for future features?',
    answer:
      'Q2 2026: Firefox support, mobile companion app, phishing URL sharing network. Q3 2026: Safari support, enterprise SSO, custom ML model training. Q4 2026: API v2 with streaming analysis, real-time threat feed integration. See our changelog for detailed updates.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="relative section-spacing">
      <div className="container-main">
        {/* Header */}
        <div className="mb-16">
          <p className="section-label">// FAQ</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Frequently asked questions
          </h2>
          <p className="text-neutral-400 max-w-lg text-sm">
            Everything you need to know about Is This Legit? Can&apos;t find what you&apos;re looking for? Reach out via our contact form.
          </p>
        </div>

        {/* Items */}
        <div className="max-w-2xl space-y-1">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div
                key={index}
                className="border-b border-neutral-800"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between py-4 text-left group"
                >
                  <span className="text-sm text-neutral-200 group-hover:text-white transition-colors pr-8">
                    {faq.question}
                  </span>
                  <span className={`text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </span>
                </button>
                {isOpen && (
                  <div className="pb-4 animate-slide-up">
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

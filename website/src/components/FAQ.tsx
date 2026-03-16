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
      'No. All analysis happens between your browser and our secure API. We do not store URLs you visit, browsing history, or personal data. Scan history is stored locally in your browser and can be cleared at any time.',
  },
  {
    question: 'Will it slow down my browsing?',
    answer:
      'Not noticeably. Analysis completes in under 3 seconds as a non-blocking background process. For 100+ known trusted domains (Google, Amazon, etc.), analysis is skipped entirely.',
  },
  {
    question: 'What browsers are supported?',
    answer:
      'Currently available for Chrome (Manifest V3). Works on any Chromium-based browser including Brave, Edge, and Opera. Firefox support is planned.',
  },
  {
    question: 'What are dark patterns?',
    answer:
      'Deceptive design tricks that manipulate you into unintended actions — fake countdown timers, scarcity messaging, guilt-tripping, deceptive buttons, hidden costs, and more. We detect 18 categories.',
  },
  {
    question: 'How is the trust score calculated?',
    answer:
      'The trust score (0-100) blends heuristic checks (domain age, SSL, dark patterns, URL structure) with AI contextual analysis. 70-100 = Safe, 40-69 = Caution, 0-39 = High Risk.',
  },
  {
    question: 'Can I report a false positive?',
    answer:
      'Yes. Report through the extension popup. We maintain a whitelist of 100+ trusted domains and continuously improve detection based on feedback.',
  },
  {
    question: 'Is there an API for developers?',
    answer:
      'The Team plan includes API access for programmatic website analysis. Useful for security teams and developers building safety features.',
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
            Questions
          </h2>
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

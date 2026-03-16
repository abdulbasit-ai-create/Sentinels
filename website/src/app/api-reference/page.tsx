import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'API Reference — Is This Legit?',
  description: 'Complete API reference for the Is This Legit? website analysis API.',
}

const endpoints = [
  {
    method: 'POST',
    path: '/api/v1/analyze',
    description: 'Analyze a website URL and return a trust score with detailed breakdown.',
    headers: [
      { name: 'Authorization', value: 'Bearer <API_KEY>', required: true },
      { name: 'Content-Type', value: 'application/json', required: true },
    ],
    body: {
      url: { type: 'string', required: true, description: 'Full URL to analyze (must include protocol).' },
      deep: { type: 'boolean', required: false, description: 'Enable AI deep analysis. Default: false.' },
      include_reviews: { type: 'boolean', required: false, description: 'Include fake review detection. Default: false.' },
    },
    response: `{
  "score": 72,
  "risk_level": "caution",
  "heuristic_score": 68,
  "ai_score": 76,
  "domain": {
    "age_days": 340,
    "registrar": "Namecheap, Inc.",
    "ssl_valid": true
  },
  "dark_patterns": [
    {
      "type": "fake_scarcity",
      "element": "div.stock-count",
      "description": "Artificial scarcity: 'Only 2 left!'"
    }
  ],
  "phishing": false,
  "safe_browsing": "clean",
  "analyzed_at": "2026-03-05T14:30:00Z"
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/lookup/:domain',
    description: 'Quick domain intelligence lookup without full page analysis.',
    headers: [
      { name: 'Authorization', value: 'Bearer <API_KEY>', required: true },
    ],
    body: null,
    response: `{
  "domain": "example-shop.com",
  "age_days": 12,
  "registrar": "GoDaddy.com, LLC",
  "registrant_country": "hidden",
  "nameservers": ["ns1.example.com"],
  "ssl": {
    "valid": true,
    "issuer": "Let's Encrypt",
    "expires": "2026-06-01"
  },
  "phishtank_listed": false,
  "safe_browsing": "clean"
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/usage',
    description: 'Check current API usage and remaining quota.',
    headers: [
      { name: 'Authorization', value: 'Bearer <API_KEY>', required: true },
    ],
    body: null,
    response: `{
  "plan": "team",
  "period_start": "2026-03-01",
  "period_end": "2026-03-31",
  "requests_used": 1247,
  "requests_limit": 10000,
  "seats_used": 4,
  "seats_limit": 10
}`,
  },
]

const errorCodes = [
  { code: 400, meaning: 'Bad Request', description: 'Missing or invalid parameters.' },
  { code: 401, meaning: 'Unauthorized', description: 'Missing or invalid API key.' },
  { code: 429, meaning: 'Rate Limited', description: 'Too many requests. Retry after Retry-After header.' },
  { code: 500, meaning: 'Server Error', description: 'Internal error. Retry with exponential backoff.' },
]

export default function ApiReferencePage() {
  return (
    <>
      <Navbar />
      <PageHeader
        badge="// API"
        title="API Reference"
        description="Programmatic access to website trust scoring. Available on the Team plan."
      />

      <div className="container-main pb-20 max-w-3xl">
        {/* Auth */}
        <section className="mb-14">
          <h2 className="text-base font-bold text-white mb-3">Authentication</h2>
          <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
            All requests require a Bearer token. Generate your key from the Team dashboard.
          </p>
          <div className="terminal-card p-3 font-mono text-xs">
            <span className="text-neutral-500">Authorization:</span>{' '}
            <span className="text-accent">Bearer</span>{' '}
            <span className="text-neutral-400">itl_live_abc123...</span>
          </div>
        </section>

        {/* Base URL */}
        <section className="mb-14">
          <h2 className="text-base font-bold text-white mb-3">Base URL</h2>
          <div className="terminal-card p-3 font-mono text-xs text-neutral-300">
            https://api.isthislegit.app/api/v1
          </div>
        </section>

        {/* Endpoints */}
        <section className="mb-14">
          <h2 className="text-base font-bold text-white mb-6">Endpoints</h2>
          <div className="space-y-8">
            {endpoints.map((ep) => (
              <div key={ep.path} className="terminal-card">
                {/* Header */}
                <div className="px-4 py-3 border-b border-neutral-700/50 flex items-center gap-2.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                    ep.method === 'POST'
                      ? 'bg-accent-muted text-accent'
                      : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {ep.method}
                  </span>
                  <code className="text-xs text-neutral-200 font-mono">{ep.path}</code>
                </div>

                <div className="px-4 py-4 space-y-4">
                  <p className="text-xs text-neutral-400">{ep.description}</p>

                  {/* Headers */}
                  <div>
                    <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Headers</h4>
                    <div className="space-y-1">
                      {ep.headers.map((h) => (
                        <div key={h.name} className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-neutral-300">{h.name}</span>
                          <span className="text-neutral-600">:</span>
                          <span className="text-neutral-500">{h.value}</span>
                          {h.required && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-threat-danger/10 text-threat-danger font-sans">req</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Body */}
                  {ep.body && (
                    <div>
                      <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Body</h4>
                      <div className="space-y-1.5">
                        {Object.entries(ep.body).map(([key, val]) => (
                          <div key={key} className="flex items-start gap-2 text-xs">
                            <code className="text-accent font-mono shrink-0">{key}</code>
                            <span className="text-neutral-600 shrink-0 font-mono">{val.type}</span>
                            {val.required && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-threat-danger/10 text-threat-danger shrink-0">req</span>
                            )}
                            <span className="text-neutral-500">{val.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Response */}
                  <div>
                    <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Response</h4>
                    <pre className="bg-surface-1 rounded p-3 text-[11px] text-neutral-400 font-mono overflow-x-auto">
                      {ep.response}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-14">
          <h2 className="text-base font-bold text-white mb-3">Rate Limits</h2>
          <div className="terminal-card p-4">
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-neutral-300">Team</span>
              <span className="text-neutral-600">|</span>
              <span className="text-neutral-400">10,000 req/month</span>
              <span className="text-neutral-600">|</span>
              <span className="text-neutral-400">60 req/min burst</span>
            </div>
          </div>
        </section>

        {/* Error Codes */}
        <section className="mb-14">
          <h2 className="text-base font-bold text-white mb-3">Error Codes</h2>
          <div className="terminal-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-700/50">
                  <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-neutral-500">Code</th>
                  <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-neutral-500">Meaning</th>
                  <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-neutral-500">Description</th>
                </tr>
              </thead>
              <tbody>
                {errorCodes.map((e) => (
                  <tr key={e.code} className="border-b border-neutral-800/50">
                    <td className="px-4 py-2.5">
                      <code className="text-threat-danger font-mono">{e.code}</code>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-300">{e.meaning}</td>
                    <td className="px-4 py-2.5 text-neutral-400">{e.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Footer />
    </>
  )
}

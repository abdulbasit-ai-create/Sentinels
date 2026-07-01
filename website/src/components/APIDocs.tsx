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
      url: 'string (required) — Full URL to analyze (must include protocol)',
      deep: 'boolean (optional) — Enable AI deep analysis. Default: false',
      include_reviews: 'boolean (optional) — Include fake review detection. Default: false',
    },
    code_example: `curl -X POST https://api.isthislegit.app/api/v1/analyze \\
  -H "Authorization: Bearer itl_live_abc123" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example-shop.com",
    "deep": true,
    "include_reviews": true
  }'`,
    response_preview: `{
  "score": 72,
  "risk_level": "caution",
  "heuristic_score": 68,
  "ai_score": 76,
  "domain": { "age_days": 340, "registrar": "Namecheap, Inc.", "ssl_valid": true },
  "dark_patterns": [
    { "type": "fake_scarcity", "element": "div.stock-count", "description": "Artificial scarcity: 'Only 2 left!'" }
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
    code_example: `curl -X GET https://api.isthislegit.app/api/v1/lookup/example-shop.com \\
  -H "Authorization: Bearer itl_live_abc123"`,
    response_preview: `{
  "domain": "example-shop.com",
  "age_days": 12,
  "registrar": "GoDaddy.com, LLC",
  "registrant_country": "hidden",
  "nameservers": ["ns1.example.com"],
  "ssl": { "valid": true, "issuer": "Let's Encrypt", "expires": "2026-06-01" },
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
    code_example: `curl -X GET https://api.isthislegit.app/api/v1/usage \\
  -H "Authorization: Bearer itl_live_abc123"`,
    response_preview: `{
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

export default function APIDocs() {
  return (
    <section id="api" className="relative section-spacing">
      <div className="container-main">
        {/* Header */}
        <div className="mb-12">
          <p className="section-label">// API</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Developer API
          </h2>
          <p className="text-neutral-400 max-w-lg text-sm">
            Integrate website trust scoring into your own tools and workflows.
            Available on the Team plan.
          </p>
        </div>

        {/* Auth info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="terminal-card p-4">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">Authentication</h3>
            <div className="bg-surface-1 rounded p-3 font-mono text-xs">
              <span className="text-neutral-500">Authorization:</span>{' '}
              <span className="text-accent">Bearer</span>{' '}
              <span className="text-neutral-400">itl_live_abc123...</span>
            </div>
          </div>
          <div className="terminal-card p-4">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">Base URL</h3>
            <div className="bg-surface-1 rounded p-3 font-mono text-xs text-neutral-300">
              https://api.isthislegit.app/api/v1
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-6">
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
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-threat-danger/10 text-threat-danger font-sans">required</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Body params */}
                {ep.body && (
                  <div>
                    <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Parameters</h4>
                    <div className="space-y-1">
                      {Object.entries(ep.body).map(([key, val]) => (
                        <div key={key} className="text-xs text-neutral-400 font-mono">
                          <span className="text-accent">{key}</span>
                          <span className="text-neutral-600"> — </span>
                          {val as string}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Code example */}
                <div>
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Example</h4>
                  <pre className="bg-surface-1 rounded p-3 text-[11px] text-neutral-400 font-mono overflow-x-auto">
                    {ep.code_example}
                  </pre>
                </div>

                {/* Response */}
                <div>
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Response</h4>
                  <pre className="bg-surface-1 rounded p-3 text-[11px] text-neutral-400 font-mono overflow-x-auto">
                    {ep.response_preview}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rate limits */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="terminal-card p-4">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">Rate Limit</h4>
            <p className="text-xs text-neutral-300 font-mono">10,000 req/month</p>
            <p className="text-[10px] text-neutral-500 font-mono mt-1">60 req/min burst</p>
          </div>
          <div className="terminal-card p-4">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">SDKs</h4>
            <p className="text-xs text-neutral-300 font-mono">JavaScript / TypeScript</p>
            <p className="text-[10px] text-neutral-500 font-mono mt-1">Python — Coming soon</p>
          </div>
          <div className="terminal-card p-4">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">Support</h4>
            <p className="text-xs text-neutral-300 font-mono">API status: operational</p>
            <p className="text-[10px] text-neutral-500 font-mono mt-1">99.9% uptime SLA</p>
          </div>
        </div>
      </div>
    </section>
  )
}

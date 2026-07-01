const comparisonData = [
  {
    feature: 'Real-time Analysis',
    us: true,
    competitor1: true,
    competitor2: false,
    competitor3: false,
  },
  {
    feature: 'AI-Powered Scoring',
    us: true,
    competitor1: false,
    competitor2: false,
    competitor3: false,
  },
  {
    feature: 'Dark Pattern Detection',
    us: true,
    competitor1: false,
    competitor2: false,
    competitor3: false,
  },
  {
    feature: 'Brand Impersonation Check',
    us: true,
    competitor1: false,
    competitor2: false,
    competitor3: true,
  },
  {
    feature: 'Fake Review Detection',
    us: true,
    competitor1: false,
    competitor2: false,
    competitor3: false,
  },
  {
    feature: 'Grammar / Sentiment Analysis',
    us: true,
    competitor1: false,
    competitor2: false,
    competitor3: false,
  },
  {
    feature: 'WHOIS Domain Intelligence',
    us: true,
    competitor1: true,
    competitor2: false,
    competitor3: false,
  },
  {
    feature: 'PhishTank Integration',
    us: true,
    competitor1: true,
    competitor2: true,
    competitor3: true,
  },
  {
    feature: 'Google Safe Browsing',
    us: true,
    competitor1: true,
    competitor2: true,
    competitor3: true,
  },
  {
    feature: 'Visual Issue Highlighting',
    us: true,
    competitor1: false,
    competitor2: false,
    competitor3: false,
  },
  {
    feature: 'Free Tier Available',
    us: true,
    competitor1: true,
    competitor2: false,
    competitor3: false,
  },
  {
    feature: 'Open Source',
    us: true,
    competitor1: false,
    competitor2: false,
    competitor3: false,
  },
  {
    feature: 'Privacy-First (No Tracking)',
    us: true,
    competitor1: false,
    competitor2: true,
    competitor3: false,
  },
  {
    feature: 'Local Scan History',
    us: true,
    competitor1: false,
    competitor2: false,
    competitor3: false,
  },
  {
    feature: 'API for Developers',
    us: true,
    competitor1: false,
    competitor2: false,
    competitor3: false,
  },
  {
    feature: 'Multilingual Support',
    us: false,
    competitor1: false,
    competitor2: false,
    competitor3: true,
  },
]

export default function Comparison() {
  return (
    <section id="comparison" className="relative section-spacing">
      <div className="container-main">
        {/* Header */}
        <div className="mb-12">
          <p className="section-label">// Comparison</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            How we compare
          </h2>
          <p className="text-neutral-400 max-w-lg text-sm">
            Is This Legit? is the most comprehensive free scam detection tool available.
            See how we stack up against other solutions.
          </p>
        </div>

        {/* Table */}
        <div className="terminal-card overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-700/50 bg-surface-3/50">
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-neutral-500 min-w-[200px]">
                  Feature
                </th>
                <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-accent min-w-[120px]">
                  <div className="flex items-center justify-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    Is This Legit?
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-neutral-500 min-w-[120px]">
                  URLScan.io
                </th>
                <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-neutral-500 min-w-[120px]">
                    VirusTotal
                </th>
                <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-neutral-500 min-w-[120px]">
                  PhishTank
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-neutral-800/50 ${
                    i % 2 === 0 ? 'bg-surface-0/30' : ''
                  } hover:bg-surface-2/30 transition-colors`}
                >
                  <td className="px-4 py-2.5 text-neutral-300 font-medium">{row.feature}</td>
                  <td className="px-4 py-2.5 text-center">
                    {row.us ? (
                      <svg className="w-4 h-4 text-accent mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-neutral-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {row.competitor1 ? (
                      <svg className="w-4 h-4 text-accent mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-neutral-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {row.competitor2 ? (
                      <svg className="w-4 h-4 text-accent mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-neutral-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {row.competitor3 ? (
                      <svg className="w-4 h-4 text-accent mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-neutral-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-[10px] text-neutral-600 font-mono text-center">
          Comparison based on publicly available feature lists. Last updated March 2026.
        </div>
      </div>
    </section>
  )
}

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Essential protection for casual browsing.',
    features: [
      '50 scans / day',
      'Trust score for every site',
      'Dark pattern detection (18 types)',
      'Phishing URL checking',
      'SSL verification',
      'Scan history (25)',
      'Domain intelligence (basic)',
      'Community support',
    ],
    excluded: [
      'AI deep analysis',
      'Fake review detection',
      'Visual highlighting',
    ],
    cta: 'Add to Chrome',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$4.99',
    period: '/mo',
    description: 'Full protection for power users and professionals.',
    features: [
      'Unlimited scans',
      'AI-powered deep analysis',
      'Fake review detection',
      'Brand impersonation detection',
      'Grammar & sentiment analysis',
      'Social engineering detection',
      'Domain intelligence (full WHOIS)',
      'Visual issue highlighting',
      'Form security analysis',
      'Priority scanning',
      'Scan history (200)',
      'Email support',
    ],
    excluded: [],
    cta: 'Start 7-Day Trial',
    highlight: true,
  },
  {
    name: 'Team',
    price: '$12.99',
    period: '/mo',
    description: 'Protect your entire organization.',
    features: [
      'Everything in Pro',
      'Up to 10 seats',
      'Centralized dashboard',
      'Shared blocklist',
      'Custom threat rules',
      'Slack / email alerts',
      'Full API access',
      'SSO integration',
      'Audit logs',
      'Dedicated account manager',
      'Priority support (24/7)',
      'Custom integration',
    ],
    excluded: [],
    cta: 'Contact Sales',
    highlight: false,
  },
]

const featureComparison = [
  { name: 'AI Analysis', free: true, pro: true, team: true },
  { name: 'Dark Pattern Detection', free: true, pro: true, team: true },
  { name: 'Phishing Protection', free: true, pro: true, team: true },
  { name: 'SSL Verification', free: true, pro: true, team: true },
  { name: 'Domain Intelligence (Basic)', free: true, pro: true, team: true },
  { name: 'Full Domain WHOIS', free: false, pro: true, team: true },
  { name: 'Fake Review Detection', free: false, pro: true, team: true },
  { name: 'Brand Impersonation', free: false, pro: true, team: true },
  { name: 'Grammar Analysis', free: false, pro: true, team: true },
  { name: 'Visual Highlighting', free: false, pro: true, team: true },
  { name: 'API Access', free: false, pro: true, team: true },
  { name: 'Team Dashboard', free: false, pro: false, team: true },
  { name: 'Custom Rules', free: false, pro: false, team: true },
  { name: 'SSO / Audit Logs', free: false, pro: false, team: true },
]

export default function Pricing() {
  return (
    <section id="pricing" className="relative section-spacing">
      <div className="container-main">
        {/* Header */}
        <div className="mb-16">
          <p className="section-label">// Pricing</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-neutral-400 max-w-lg text-sm">
            Start free. Upgrade when you need more. No hidden fees — just like we detect them for you.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mb-16">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative terminal-card p-6 flex flex-col ${
                plan.highlight
                  ? 'border-accent/30 bg-accent/[0.02] ring-1 ring-accent/10'
                  : ''
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-2.5 left-4">
                  <span className="code-label text-[10px]">POPULAR</span>
                </div>
              )}

              <div className="mb-5 pt-1">
                <h3 className="text-sm font-semibold text-white mb-0.5 font-mono">
                  {plan.name}
                </h3>
                <p className="text-xs text-neutral-500 mb-3">
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white font-mono">
                    {plan.price}
                  </span>
                  <span className="text-xs text-neutral-500 font-mono">
                    {plan.period}
                  </span>
                </div>
              </div>

              <div className="divider mb-5" />

              <ul className="space-y-2.5 mb-4 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs">
                    <svg className="w-3 h-3 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className="text-neutral-300">{feature}</span>
                  </li>
                ))}
                {plan.excluded.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs opacity-40">
                    <svg className="w-3 h-3 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-neutral-500">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full text-xs py-2.5 rounded-md font-medium transition-all duration-200 ${
                  plan.highlight
                    ? 'btn-accent'
                    : 'btn-ghost'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-3xl mx-auto">
          <h3 className="text-sm font-semibold text-white mb-4 text-center">Feature Comparison</h3>
          <div className="terminal-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-700/50">
                  <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-neutral-500">Feature</th>
                  <th className="px-4 py-2.5 text-center font-mono text-[10px] uppercase tracking-wider text-neutral-500">Free</th>
                  <th className="px-4 py-2.5 text-center font-mono text-[10px] uppercase tracking-wider text-accent">Pro</th>
                  <th className="px-4 py-2.5 text-center font-mono text-[10px] uppercase tracking-wider text-neutral-500">Team</th>
                </tr>
              </thead>
              <tbody>
                {featureComparison.map((f) => (
                  <tr key={f.name} className="border-b border-neutral-800/50">
                    <td className="px-4 py-2.5 text-neutral-300">{f.name}</td>
                    <td className="px-4 py-2.5 text-center">
                      {f.free ? (
                        <svg className="w-3.5 h-3.5 text-accent mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {f.pro ? (
                        <svg className="w-3.5 h-3.5 text-accent mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {f.team ? (
                        <svg className="w-3.5 h-3.5 text-accent mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 terminal-card inline-flex items-center gap-2 px-4 py-2.5">
          <span className="status-dot status-dot-warn" />
          <p className="text-[11px] font-mono text-neutral-500">
            Prices shown are placeholder. Final pricing will be announced at launch. All paid plans include a 30-day money-back guarantee.
          </p>
        </div>
      </div>
    </section>
  )
}

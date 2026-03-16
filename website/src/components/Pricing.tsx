const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Essential protection for casual browsing.',
    features: [
      '50 scans / day',
      'Trust score for every site',
      'Dark pattern detection',
      'Phishing URL checking',
      'SSL verification',
      'Scan history (25)',
    ],
    cta: 'Add to Chrome',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$4.99',
    period: '/mo',
    description: 'Full protection for power users.',
    features: [
      'Unlimited scans',
      'AI-powered deep analysis',
      'Fake review detection',
      'Domain intelligence (WHOIS)',
      'Visual issue highlighting',
      'Form security analysis',
      'Priority scanning',
      'Scan history (200)',
    ],
    cta: 'Start 7-Day Trial',
    highlight: true,
  },
  {
    name: 'Team',
    price: '$12.99',
    period: '/mo',
    description: 'Protect your entire team.',
    features: [
      'Everything in Pro',
      'Up to 10 seats',
      'Centralized dashboard',
      'Shared blocklist',
      'Custom threat rules',
      'Slack / email alerts',
      'API access',
      'Priority support',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="relative section-spacing">
      <div className="container-main">
        {/* Header */}
        <div className="mb-16">
          <p className="section-label">// Pricing</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Simple pricing
          </h2>
          <p className="text-neutral-400 max-w-lg text-sm">
            Start free. Upgrade when you need more. No hidden fees — just like we detect them for you.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative terminal-card p-6 ${
                plan.highlight
                  ? 'border-accent/30 bg-accent/[0.02]'
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

              <ul className="space-y-2.5 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs">
                    <span className={`w-1 h-1 rounded-full shrink-0 ${plan.highlight ? 'bg-accent' : 'bg-neutral-600'}`} />
                    <span className="text-neutral-300">{feature}</span>
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

const features = [
  {
    tag: 'AI',
    title: 'AI-Powered Analysis',
    description: 'Llama 3.3 70B understands context and nuance to catch sophisticated scams that rule-based systems miss.',
    detail: 'groq.analyze(url, { model: "llama-3.3-70b" })',
  },
  {
    tag: 'SCORE',
    title: 'Composite Trust Score',
    description: 'Blends heuristic analysis with AI scoring using weighted averaging for a reliable 0-100 trust score.',
    detail: 'score = heuristic * 0.6 + ai * 0.4',
  },
  {
    tag: 'DETECT',
    title: '18 Dark Patterns',
    description: 'Countdown timers, scarcity messaging, guilt-tripping, fake social proof, deceptive buttons, hidden iframes.',
    detail: 'patterns.detect(dom, { categories: 18 })',
  },
  {
    tag: 'BRAND',
    title: 'Brand Impersonation Detection',
    description: 'Detects lookalike domains and pages impersonating trusted brands using fuzzy matching and visual analysis.',
    detail: 'brand.check(domain, { fuzzy: true, levenshtein: 2 })',
  },
  {
    tag: 'GRAMMAR',
    title: 'Grammar & Sentiment Analysis',
    description: 'Flags poor grammar, aggressive urgency, and manipulative language patterns common in scam content.',
    detail: 'nlp.analyze(text, { grammar: true, sentiment: true })',
  },
  {
    tag: 'PHISH',
    title: 'Phishing Protection',
    description: 'Cross-references against PhishTank and Google Safe Browsing to catch known threats instantly.',
    detail: 'phishtank.check(url) && safeBrowsing.check(url)',
  },
  {
    tag: 'WHOIS',
    title: 'Domain Intelligence',
    description: 'WHOIS lookups reveal domain age, registrar, registrant info. New domains with hidden info get flagged.',
    detail: 'whois.lookup(domain, { age, registrar, ns })',
  },
  {
    tag: 'SSL',
    title: 'SSL & Form Security',
    description: 'Verifies certificates and analyzes forms for sensitive data collection and cross-domain submissions.',
    detail: 'ssl.verify(cert) && forms.analyze(fields)',
  },
  {
    tag: 'REVIEW',
    title: 'Fake Review Detection',
    description: 'Scrapes and analyzes up to 15 reviews per page to identify patterns of fake or incentivized reviews.',
    detail: 'reviews.extract(page, { limit: 15 }).analyze()',
  },
  {
    tag: 'VISUAL',
    title: 'Issue Highlighting',
    description: 'Overlays colored markers directly on the page to show exactly where dark patterns are hiding.',
    detail: 'overlay.highlight(issues, { color: "warn" })',
  },
  {
    tag: 'SOCIAL',
    title: 'Social Engineering Detection',
    description: 'Identifies phishing lures, urgent calls-to-action, impersonation attempts, and credential harvesting forms.',
    detail: 'social.detect(page, { vector: "phishing" })',
  },
  {
    tag: 'HISTORY',
    title: 'Scan History & Analytics',
    description: 'Track every scanned site with local storage. View trends, revisit scans, and monitor your browsing safety.',
    detail: 'history.query({ limit: 200, sort: "date" })',
  },
]

export default function Features() {
  return (
    <section id="features" className="relative section-spacing">
      <div className="container-main">
        {/* Header */}
        <div className="mb-16">
          <p className="section-label">// Features</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Twelve layers of protection
          </h2>
          <p className="text-neutral-400 max-w-lg text-sm">
            Every scan runs through multiple detection engines working in parallel 
            to give you a comprehensive safety assessment. No stone left unturned.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group terminal-card hover-glow p-5 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  <span className="code-label text-[10px]">{feature.tag}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-3">
                    {feature.description}
                  </p>
                  <code className="block text-[10px] font-mono text-neutral-500 group-hover:text-accent/60 transition-colors truncate">
                    {feature.detail}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

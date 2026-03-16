const steps = [
  {
    num: '01',
    title: 'Install',
    description: 'One click from the Chrome Web Store. No account, no config. It starts working immediately.',
    terminal: '$ chrome.install("is-this-legit", { version: "1.0.0" })\n> Extension installed. Shield icon active.',
  },
  {
    num: '02',
    title: 'Browse',
    description: 'Visit any website normally. Analysis runs silently in the background without slowing your browsing.',
    terminal: '$ navigate("https://example-shop.com")\n> Scanning... heuristic engine running\n> AI analysis in progress...',
  },
  {
    num: '03',
    title: 'Get Alerts',
    description: 'Color-coded badge shows safety status. Click for a full breakdown of every detected issue.',
    terminal: '$ scan.results()\n> Score: 30/100 [HIGH RISK]\n> 3 dark patterns detected\n> Domain age: 12 days',
  },
  {
    num: '04',
    title: 'Stay Safe',
    description: 'View scan history, highlight issues on-page, make informed decisions. Data stays local — always.',
    terminal: '$ history.list({ days: 7 })\n> 42 sites scanned\n> 3 threats blocked\n> All data stored locally',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative section-spacing">
      <div className="container-main">
        {/* Header */}
        <div className="mb-16">
          <p className="section-label">// How it works</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Four steps to safety
          </h2>
          <p className="text-neutral-400 max-w-lg text-sm">
            No setup, no learning curve. Install and forget — we handle the rest.
          </p>
        </div>

        {/* Steps — vertical timeline */}
        <div className="relative max-w-2xl">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-6 bottom-6 w-px bg-gradient-to-b from-accent/30 via-accent/10 to-transparent" />

          <div className="space-y-8">
            {steps.map((step, i) => (
              <div key={step.num} className="relative pl-12">
                {/* Timeline dot */}
                <div className="absolute left-0 top-1 w-[31px] h-[31px] rounded-full bg-surface-0 border border-neutral-700 flex items-center justify-center">
                  <span className="text-[10px] font-mono font-medium text-accent">{step.num}</span>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-3">
                    {step.description}
                  </p>

                  {/* Mini terminal */}
                  <div className="terminal-card">
                    <div className="terminal-header">
                      <div className="terminal-dot bg-threat-danger/50" />
                      <div className="terminal-dot bg-threat-warn/50" />
                      <div className="terminal-dot bg-threat-safe/50" />
                    </div>
                    <pre className="p-3 text-[11px] font-mono text-neutral-500 leading-relaxed whitespace-pre-wrap">
                      {step.terminal}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

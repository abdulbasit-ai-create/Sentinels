import Link from 'next/link'

const releases = [
  {
    version: '1.0.0',
    date: 'March 1, 2026',
    tag: 'latest',
    tagColor: 'text-accent',
    changes: [
      { type: 'added', text: 'Initial public release of Is This Legit? Chrome extension.' },
      { type: 'added', text: 'AI-powered website analysis using Llama 3.3 70B via Groq.' },
      { type: 'added', text: 'Composite trust scoring engine (heuristic + AI weighted blend).' },
      { type: 'added', text: 'Detection of 18 dark pattern categories.' },
      { type: 'added', text: 'PhishTank database integration for phishing URL checking.' },
      { type: 'added', text: 'Google Safe Browsing API integration.' },
      { type: 'added', text: 'WHOIS domain intelligence (age, registrar, registrant, nameservers).' },
      { type: 'added', text: 'SSL certificate verification.' },
      { type: 'added', text: 'Review extraction and fake review analysis (up to 15 reviews/page).' },
      { type: 'added', text: 'Brand impersonation detection via fuzzy domain matching.' },
      { type: 'added', text: 'Grammar and sentiment analysis for scam language patterns.' },
      { type: 'added', text: 'Social engineering detection (phishing lures, credential harvesting).' },
      { type: 'added', text: 'Form security analysis (sensitive fields, cross-domain submissions).' },
      { type: 'added', text: 'Visual issue highlighting overlay on-page.' },
      { type: 'added', text: 'Scan history with local storage (up to 200 scans on Pro).' },
      { type: 'added', text: 'Light and dark theme support.' },
      { type: 'added', text: '100+ trusted domain whitelist to prevent false positives.' },
    ],
  },
  {
    version: '0.9.0',
    date: 'February 15, 2026',
    tag: 'beta',
    tagColor: 'text-threat-warn',
    changes: [
      { type: 'added', text: 'Beta release for internal testing.' },
      { type: 'added', text: 'Core heuristic scoring engine with URL, content, and domain signals.' },
      { type: 'added', text: 'Extension popup with trust score gauge and issue breakdown.' },
      { type: 'added', text: 'Background service worker for tab event handling.' },
      { type: 'fixed', text: 'Resolved timing issues with content script injection on SPAs.' },
    ],
  },
  {
    version: '0.5.0',
    date: 'January 20, 2026',
    tag: 'alpha',
    tagColor: 'text-neutral-500',
    changes: [
      { type: 'added', text: 'Proof of concept with basic URL pattern matching.' },
      { type: 'added', text: 'Initial dark pattern detection (5 categories).' },
      { type: 'added', text: 'Basic popup UI with score display.' },
    ],
  },
]

const typeColors: Record<string, string> = {
  added: 'bg-accent',
  fixed: 'bg-blue-400',
  changed: 'bg-threat-warn',
  removed: 'bg-threat-danger',
}

export default function Changelog() {
  return (
    <section id="changelog" className="relative section-spacing">
      <div className="container-main">
        {/* Header */}
        <div className="mb-12">
          <p className="section-label">// Changelog</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Version history
          </h2>
          <p className="text-neutral-400 max-w-lg text-sm">
            Every update, improvement, and fix — documented here. We believe in full transparency.
          </p>
        </div>

        <div className="max-w-2xl">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[5px] top-2 bottom-0 w-px bg-neutral-800" />

            <div className="space-y-10">
              {releases.map((release) => (
                <div key={release.version} className="relative pl-8">
                  {/* Dot */}
                  <div className="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full bg-surface-0 border-2 border-accent/50" />

                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold font-mono text-white">v{release.version}</span>
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${release.tagColor}`}>
                      {release.tag}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-600 font-mono mb-3">{release.date}</p>

                  {/* Changes */}
                  <div className="terminal-card p-4">
                    <ul className="space-y-2">
                      {release.changes.map((change, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs">
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${typeColors[change.type] || 'bg-neutral-500'}`} />
                          <span className="text-neutral-400">{change.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full changelog link */}
          <div className="text-center mt-8">
            <Link
              href="/changelog"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-accent transition-colors"
            >
              View full changelog →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

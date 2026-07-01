export default function Security() {
  return (
    <section id="security" className="relative section-spacing">
      <div className="container-main">
        {/* Header */}
        <div className="mb-12">
          <p className="section-label">// Security</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Security & privacy
          </h2>
          <p className="text-neutral-400 max-w-lg text-sm">
            We take security seriously — both in what we build and how we handle
            vulnerabilities. Here&apos;s our commitment to you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {/* Privacy first */}
          <div className="terminal-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent-muted border border-accent/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white">Privacy First</h3>
            </div>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>No browsing history collected or stored</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>URL analysis is ephemeral — results returned and discarded</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>Scan history stored locally in your browser (Chrome storage sync)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>No cookies, no trackers, no fingerprinting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>GDPR compliant — fully open about data practices</span>
              </li>
            </ul>
          </div>

          {/* Encryption */}
          <div className="terminal-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent-muted border border-accent/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white">Encryption & Security</h3>
            </div>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>All API traffic encrypted with TLS 1.3</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>API keys stored securely with hardware-backed encryption</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>No plaintext secrets in source code or config files</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>Dependencies regularly audited with Dependabot and Snyk</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>Rate limiting and request validation on all API endpoints</span>
              </li>
            </ul>
          </div>

          {/* Open source */}
          <div className="terminal-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent-muted border border-accent/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l8.735 8.735m0 0l.338 2.699a2.25 2.25 0 01-1.106 2.283l-1.656.813a2.25 2.25 0 01-2.588-.47l-2.626-2.736a2.25 2.25 0 01-.53-2.527l.965-2.24c.21-.487.589-.874 1.049-1.114l7.253-3.497a2.25 2.25 0 012.76.54l4.003 4.003a2.25 2.25 0 01.54 2.76l-3.497 7.253a2.25 2.25 0 01-1.114 1.05l-2.24.964a2.25 2.25 0 01-2.527-.53l-2.736-2.626a2.25 2.25 0 01-.47-2.588l.813-1.657a2.25 2.25 0 012.283-1.106l2.699.338z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white">Open Source</h3>
            </div>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>Full source code available on GitHub</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>MIT licensed — free to use, modify, and distribute</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>Community contributions welcome via pull requests</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>CI/CD pipeline with automated testing and linting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>100% code transparency — what you see is what runs</span>
              </li>
            </ul>
          </div>

          {/* Disclosure */}
          <div className="terminal-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent-muted border border-accent/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white">Vulnerability Disclosure</h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed mb-3">
              We welcome responsible disclosure of security vulnerabilities. If you find a security issue,
              please report it privately rather than publicly.
            </p>
            <div className="bg-surface-1 rounded p-3 text-[11px] font-mono leading-relaxed">
              <span className="text-neutral-600"># Report a vulnerability</span>
              <br />
              <span className="text-neutral-300">Email: security@isthislegit.app</span>
              <br />
              <span className="text-neutral-400">PGP key: <span className="text-neutral-500">0xABC123DEF456</span></span>
              <br />
              <br />
              <span className="text-neutral-600"># We commit to:</span>
              <br />
              <span className="text-neutral-400">✓ Respond within 24 hours</span>
              <br />
              <span className="text-neutral-400">✓ Fix critical issues within 7 days</span>
              <br />
              <span className="text-neutral-400">✓ Credit researchers in our security hall of fame</span>
            </div>
          </div>
        </div>

        {/* Security badges */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          {[
            { label: 'HTTPS / TLS 1.3', icon: '🔒' },
            { label: 'GDPR Compliant', icon: '🇪🇺' },
            { label: 'Open Source', icon: '📖' },
            { label: 'No Trackers', icon: '🚫' },
            { label: 'Privacy Verified', icon: '✅' },
          ].map((badge) => (
            <div key={badge.label} className="flex items-center gap-1.5 text-xs text-neutral-500 font-mono">
              <span>{badge.icon}</span>
              <span>{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

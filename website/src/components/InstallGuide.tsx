export default function InstallGuide() {
  const steps = [
    {
      title: '1. Install from Chrome Web Store',
      description: 'Visit the Chrome Web Store listing and click "Add to Chrome." The extension installs in seconds with no account or configuration required.',
      code: 'chrome.google.com/webstore/detail/is-this-legit/...',
      icon: (
        <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      ),
    },
    {
      title: '2. Pin the Extension',
      description: 'Click the puzzle piece icon in your Chrome toolbar, find "Is This Legit?" and click the pin icon. The shield icon will appear in your toolbar.',
      code: 'chrome://extensions/ → Find Is This Legit? → Pin',
      icon: (
        <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ),
    },
    {
      title: '3. Browse Normally',
      description: 'That\'s it! The extension works automatically in the background. The shield icon color shows site safety: green (safe), yellow (caution), red (danger).',
      code: 'Just browse — analysis runs silently',
      icon: (
        <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      ),
    },
    {
      title: '4. View Detailed Analysis',
      description: 'Click the shield icon to open the popup. See trust score, detected issues, domain intelligence, and AI analysis. Click "Highlight Issues" to see dark patterns on the page.',
      code: 'Click shield → View score → Highlight issues',
      icon: (
        <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
        </svg>
      ),
    },
  ]

  const chromeSteps = [
    'Open Google Chrome',
    'Navigate to chrome://extensions/',
    'Enable "Developer mode" (toggle in top right)',
    'Click "Load unpacked"',
    'Select the extension directory',
    'The shield icon appears in your toolbar',
  ]

  return (
    <section id="install" className="relative section-spacing">
      <div className="container-main">
        {/* Header */}
        <div className="mb-12">
          <p className="section-label">// Installation</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Get started in seconds
          </h2>
          <p className="text-neutral-400 max-w-lg text-sm">
            Install from the Chrome Web Store, or load the extension manually from source.
            No account, no configuration, no data collection.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick install steps */}
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.title} className="terminal-card p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent-muted border border-accent/20 flex items-center justify-center shrink-0">
                  {step.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">{step.title}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-2">{step.description}</p>
                  <code className="block text-[10px] font-mono text-neutral-500 bg-surface-1 rounded px-2 py-1 truncate">
                    {step.code}
                  </code>
                </div>
              </div>
            ))}
          </div>

          {/* Manual install (side panel) */}
          <div>
            <div className="terminal-card p-5">
              <h3 className="text-xs font-semibold text-white mb-3 font-mono">
                Manual Installation (Developer Mode)
              </h3>
              <div className="space-y-2 mb-4">
                {chromeSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="w-5 h-5 rounded-full bg-surface-3 border border-neutral-700 flex items-center justify-center text-[10px] font-mono text-neutral-500 shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-neutral-400">{step}</span>
                  </div>
                ))}
              </div>

              {/* Code block */}
              <div className="bg-surface-1 rounded p-3 text-[11px] font-mono leading-relaxed">
                <span className="text-neutral-600"># Clone and build from source</span>
                <br />
                <span className="text-neutral-300">git clone https://github.com/AliZafar780/is-this-legit.git</span>
                <br />
                <span className="text-neutral-300">cd is-this-legit</span>
                <br />
                <span className="text-neutral-300">npm install</span>
                <br />
                <span className="text-neutral-300">npm run build</span>
                <br />
                <br />
                <span className="text-neutral-600"># Load the dist/ folder in chrome://extensions/</span>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
                <span className="status-dot status-dot-safe" />
                Works with Chrome, Brave, Edge, Opera
              </div>
            </div>

            {/* Prerequisites */}
            <div className="terminal-card p-4 mt-4">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">Prerequisites</h3>
              <div className="flex flex-wrap gap-2">
                {['Node.js v18+', 'Chrome Browser', 'Git', 'npm or yarn'].map((prereq) => (
                  <span key={prereq} className="px-2 py-1 rounded text-[10px] font-mono bg-surface-3 text-neutral-400 border border-neutral-800">
                    {prereq}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Screenshots placeholder */}
        <div className="mt-12">
          <h3 className="text-sm font-semibold text-white mb-4 text-center">Screenshots</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Extension Popup', 'Analysis Result', 'Issue Highlighting'].map((title) => (
              <div key={title} className="terminal-card p-4 text-center">
                <div className="w-full h-36 rounded bg-surface-3 border border-neutral-800/50 flex items-center justify-center mb-3">
                  <div className="text-center">
                    <svg className="w-8 h-8 text-neutral-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <span className="text-xs text-neutral-600 font-mono">Screenshot coming soon</span>
                  </div>
                </div>
                <span className="text-xs text-neutral-400 font-mono">{title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

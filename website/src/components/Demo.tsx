'use client'

import { useState, useRef, useEffect } from 'react'

interface LogEntry {
  prefix: string
  text: string
  color: string
}

const demoResponses: Record<string, LogEntry[]> = {
  safe: [
    { prefix: 'DNS', text: 'Resolving domain...', color: 'text-accent' },
    { prefix: 'DNS', text: 'Domain registered 1,245 days ago — established', color: 'text-accent' },
    { prefix: 'SSL', text: 'Certificate valid — SHA-256 with ECDSA', color: 'text-accent' },
    { prefix: 'PHISH', text: 'Checking PhishTank database... clean', color: 'text-accent' },
    { prefix: 'PHISH', text: 'Google Safe Browsing check... clean', color: 'text-accent' },
    { prefix: 'PATTERN', text: 'No dark patterns detected', color: 'text-accent' },
    { prefix: 'AI', text: 'AI analysis — legitimate business, positive reputation', color: 'text-accent' },
    { prefix: 'SCORE', text: 'Trust Score: 92/100 — SAFE', color: 'text-threat-safe' },
  ],
  suspicious: [
    { prefix: 'DNS', text: 'Resolving domain...', color: 'text-accent' },
    { prefix: 'DNS', text: 'Domain registered 34 days ago — very new', color: 'text-threat-warn' },
    { prefix: 'SSL', text: 'Certificate valid — Let\'s Encrypt', color: 'text-accent' },
    { prefix: 'PHISH', text: 'Checking PhishTank database... clean', color: 'text-accent' },
    { prefix: 'PHISH', text: 'Google Safe Browsing check... clean', color: 'text-accent' },
    { prefix: 'PATTERN', text: 'Fake countdown timer detected', color: 'text-threat-warn' },
    { prefix: 'PATTERN', text: 'Scarcity messaging: "Hurry! Only 3 left"', color: 'text-threat-warn' },
    { prefix: 'PATTERN', text: 'Hidden subscription pre-checked', color: 'text-threat-warn' },
    { prefix: 'AI', text: 'LLM analysis — some manipulation signals found', color: 'text-threat-warn' },
    { prefix: 'SCORE', text: 'Trust Score: 48/100 — CAUTION', color: 'text-threat-warn' },
  ],
  dangerous: [
    { prefix: 'DNS', text: 'Resolving domain...', color: 'text-accent' },
    { prefix: 'DNS', text: 'Domain registered 6 days ago — extremely new', color: 'text-threat-danger' },
    { prefix: 'SSL', text: 'Certificate valid — Let\'s Encrypt (auto-issued)', color: 'text-threat-warn' },
    { prefix: 'PHISH', text: 'Checking PhishTank database... MATCH FOUND', color: 'text-threat-danger' },
    { prefix: 'PHISH', text: 'Google Safe Browsing check... MALWARE DETECTED', color: 'text-threat-danger' },
    { prefix: 'PATTERN', text: 'Fake login form detected (credential harvesting)', color: 'text-threat-danger' },
    { prefix: 'PATTERN', text: 'Fake countdown timer detected', color: 'text-threat-warn' },
    { prefix: 'PATTERN', text: 'Hidden iframe loading external content', color: 'text-threat-warn' },
    { prefix: 'PATTERN', text: 'Brand impersonation: fake Amazon login', color: 'text-threat-danger' },
    { prefix: 'AI', text: 'AI analysis — confirmed phishing site', color: 'text-threat-danger' },
    { prefix: 'SCORE', text: 'Trust Score: 8/100 — HIGH RISK', color: 'text-threat-danger' },
  ],
}

const exampleUrls = [
  { label: 'Safe site', url: 'https://github.com', result: 'safe' as const },
  { label: 'Suspicious', url: 'https://amaz0n-deals-2026.com', result: 'suspicious' as const },
  { label: 'Dangerous', url: 'https://free-iphone-verify-now.com', result: 'dangerous' as const },
]

export default function Demo() {
  const [inputUrl, setInputUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [done, setDone] = useState(false)
  const [currentResult, setCurrentResult] = useState<string | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const runScan = async (url: string) => {
    setScanning(true)
    setDone(false)
    setLogs([])
    setCurrentResult(null)

    const result = url.includes('github') || url.includes('google') || url.includes('microsoft')
      ? 'safe'
      : url.includes('amaz0n') || url.includes('deals') || url.includes('shop')
        ? 'suspicious'
        : 'dangerous'

    const lines = demoResponses[result]
    setCurrentResult(result)

    for (let i = 0; i < lines.length; i++) {
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 400))
      setLogs((prev) => [...prev, lines[i]])
    }

    setScanning(false)
    setDone(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputUrl.trim() || scanning) return
    runScan(inputUrl.trim())
  }

  const handleExampleUrl = (url: string) => {
    setInputUrl(url)
    if (!scanning) runScan(url)
  }

  const resultColor = currentResult === 'safe'
    ? 'text-threat-safe'
    : currentResult === 'suspicious'
      ? 'text-threat-warn'
      : 'text-threat-danger'

  const resultBg = currentResult === 'safe'
    ? 'bg-threat-safe/5 border-threat-safe/20'
    : currentResult === 'suspicious'
      ? 'bg-threat-warn/5 border-threat-warn/20'
      : 'bg-threat-danger/5 border-threat-danger/20'

  return (
    <section id="demo" className="relative section-spacing">
      <div className="container-main">
        {/* Header */}
        <div className="mb-12">
          <p className="section-label">// Live Demo</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Try it yourself
          </h2>
          <p className="text-neutral-400 max-w-lg text-sm">
            Enter any URL below to see how Is This Legit? analyzes websites in real time.
            This is a simulation of our actual scanning engine.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Input area */}
          <div className="lg:col-span-2">
            <div className="terminal-card p-5">
              <h3 className="text-xs font-semibold text-white mb-3 font-mono">
                URL Scanner
              </h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="demo-url" className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1 block">
                    Enter a website URL
                  </label>
                  <input
                    id="demo-url"
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://example.com"
                    disabled={scanning}
                    className="w-full px-3 py-2 rounded text-xs bg-surface-3 border border-neutral-700 text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-accent/40 font-mono disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={scanning || !inputUrl.trim()}
                  className="btn-accent text-xs py-2 w-full disabled:opacity-40"
                >
                  {scanning ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-surface-0 border-t-transparent rounded-full animate-spin" />
                      Scanning...
                    </span>
                  ) : (
                    'Scan URL'
                  )}
                </button>
              </form>

              <div className="divider my-4" />

              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">
                  Try an example
                </p>
                <div className="space-y-1.5">
                  {exampleUrls.map((ex) => (
                    <button
                      key={ex.label}
                      onClick={() => handleExampleUrl(ex.url)}
                      disabled={scanning}
                      className="w-full flex items-center justify-between px-3 py-2 rounded text-xs bg-surface-3/50 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition-colors disabled:opacity-40 font-mono"
                    >
                      <span>{ex.url}</span>
                      <span className={`text-[10px] ${
                        ex.result === 'safe' ? 'text-threat-safe' :
                        ex.result === 'suspicious' ? 'text-threat-warn' : 'text-threat-danger'
                      }`}>
                        {ex.result}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Terminal output */}
          <div className="lg:col-span-3">
            <div className="terminal-card h-full">
              <div className="terminal-header">
                <div className="terminal-dot bg-threat-danger/70" />
                <div className="terminal-dot bg-threat-warn/70" />
                <div className="terminal-dot bg-threat-safe/70" />
                <span className="ml-2 text-[10px] font-mono text-neutral-500">
                  is-this-legit — live scan {scanning ? '(running...)' : done ? '(complete)' : '(idle)'}
                </span>
              </div>
              <div className="p-4 min-h-[320px] max-h-[400px] overflow-y-auto">
                {logs.length === 0 && !scanning && (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <svg className="w-10 h-10 text-neutral-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    <p className="text-xs text-neutral-600 font-mono">
                      Paste a URL or select an example to start the scan.
                    </p>
                  </div>
                )}
                <div className="space-y-1.5">
                  {logs.map((log, i) => (
                    <div key={i} className="flex gap-2 text-xs font-mono leading-relaxed animate-fade-in">
                      <span className="text-neutral-500 select-none">$</span>
                      <span className={`${log.color} shrink-0`}>[{log.prefix}]</span>
                      <span className="text-neutral-400">{log.text}</span>
                    </div>
                  ))}
                  {scanning && (
                    <div className="flex gap-2 text-xs font-mono">
                      <span className="text-neutral-500">$</span>
                      <span className="animate-terminal-blink text-accent">_</span>
                    </div>
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            </div>

            {/* Result banner */}
            {done && currentResult && (
              <div className={`mt-3 terminal-card p-3 border ${resultBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`status-dot ${
                      currentResult === 'safe' ? 'status-dot-safe' :
                      currentResult === 'suspicious' ? 'status-dot-warn' : 'status-dot-danger'
                    }`} />
                    <span className={`text-xs font-mono font-semibold ${resultColor}`}>
                      {currentResult === 'safe' ? 'SAFE' : currentResult === 'suspicious' ? 'CAUTION' : 'HIGH RISK'}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Analysis complete
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

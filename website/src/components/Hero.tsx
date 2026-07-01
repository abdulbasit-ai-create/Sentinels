'use client'

import { useEffect, useState, useCallback } from 'react'

const scanLines = [
  { prefix: 'SCAN', text: 'https://suspicious-deals-store.com', delay: 0 },
  { prefix: 'DNS', text: 'Resolving domain... registered 12 days ago', delay: 400 },
  { prefix: 'SSL', text: 'Certificate valid — Let\'s Encrypt', delay: 800 },
  { prefix: 'PHISH', text: 'Checking PhishTank database...', delay: 1200 },
  { prefix: 'PATTERN', text: 'Fake countdown timer detected', delay: 1600 },
  { prefix: 'PATTERN', text: 'Scarcity messaging: "Only 2 left!"', delay: 2000 },
  { prefix: 'PATTERN', text: 'Hidden fees in checkout form', delay: 2400 },
  { prefix: 'AI', text: 'LLM analysis — high manipulation signals', delay: 2800 },
  { prefix: 'SCORE', text: 'Trust Score: 30/100 — HIGH RISK', delay: 3200 },
]

function TerminalLine({ prefix, text, delay }: { prefix: string; text: string; delay: number }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (!visible) return null

  const prefixColor =
    prefix === 'SCORE' ? 'text-threat-danger' :
    prefix === 'PATTERN' ? 'text-threat-warn' :
    prefix === 'AI' ? 'text-purple-400' :
    'text-accent'

  return (
    <div className="flex gap-2 animate-fade-in text-xs font-mono leading-relaxed">
      <span className="text-neutral-500 select-none">$</span>
      <span className={`${prefixColor} shrink-0`}>[{prefix}]</span>
      <span className="text-neutral-400">{text}</span>
    </div>
  )
}

export default function Hero() {
  const [showCursor, setShowCursor] = useState(true)
  const [typedText, setTypedText] = useState('')
  const [showScanPrompt, setShowScanPrompt] = useState(false)
  const fullText = 'Try scanning a site: scan("https://")'

  useEffect(() => {
    const cursorTimer = setTimeout(() => setShowCursor(false), 3600)
    return () => clearTimeout(cursorTimer)
  }, [])

  useEffect(() => {
    const promptTimer = setTimeout(() => setShowScanPrompt(true), 3800)
    return () => clearTimeout(promptTimer)
  }, [])

  useEffect(() => {
    if (!showScanPrompt) return
    let i = 0
    const typeInterval = setInterval(() => {
      if (i < fullText.length) {
        setTypedText(fullText.slice(0, i + 1))
        i++
      } else {
        clearInterval(typeInterval)
      }
    }, 30)
    return () => clearInterval(typeInterval)
  }, [showScanPrompt, fullText])

  const handleRestart = useCallback(() => {
    setShowCursor(true)
    setShowScanPrompt(false)
    setTypedText('')
    setTimeout(() => setShowCursor(false), 3600)
    setTimeout(() => setShowScanPrompt(true), 3800)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center">
      {/* Background */}
      <div className="absolute inset-0 dot-grid opacity-40" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/[0.03] rounded-full blur-[120px] pointer-events-none" />
      
      {/* Animated radar rings */}
      <div className="absolute top-1/3 right-1/4 w-32 h-32">
        <div className="radar-ring w-full h-full" />
        <div className="radar-ring w-full h-full" style={{ animationDelay: '0.7s' }} />
        <div className="radar-ring w-full h-full" style={{ animationDelay: '1.4s' }} />
      </div>

      <div className="container-main relative z-10 pt-28 pb-20">
        <div className="max-w-3xl">
          {/* Status indicator */}
          <div className="flex items-center gap-2 mb-8 animate-fade-in">
            <span className="status-dot status-dot-safe" />
            <span className="text-xs font-mono text-neutral-500">v1.0.0 — Available for Chrome</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-5 animate-fade-in-up text-white">
            Detect scams before
            <br />
            <span className="text-accent">they detect you</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-neutral-400 max-w-xl mb-8 animate-fade-in-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
            AI-powered Chrome extension that scores every website for phishing, 
            dark patterns, and fake reviews in real-time. Free, private, and built for everyone.
          </p>

          {/* CTA — Download buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-16 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <a href="#pricing" className="btn-accent">
              Add to Chrome — Free
            </a>
            <a href="#how-it-works" className="btn-ghost">
              How it works
            </a>
            <a href="#demo" className="btn-ghost">
              Try the Demo
            </a>
          </div>

          {/* Terminal Scanner */}
          <div className="terminal-card max-w-2xl animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="terminal-header">
              <div className="terminal-dot bg-threat-danger/70" />
              <div className="terminal-dot bg-threat-warn/70" />
              <div className="terminal-dot bg-threat-safe/70" />
              <span className="ml-2 text-[10px] font-mono text-neutral-500">is-this-legit — scan</span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={handleRestart}
                  className="text-[10px] font-mono text-neutral-500 hover:text-accent transition-colors"
                  aria-label="Restart scan animation"
                >
                  ↻ rerun
                </button>
              </div>
            </div>
            <div className="p-4 space-y-1.5 min-h-[220px]">
              {scanLines.map((line, i) => (
                <TerminalLine key={i} {...line} />
              ))}
              {showCursor && (
                <div className="flex gap-2 text-xs font-mono">
                  <span className="text-neutral-500">$</span>
                  <span className="animate-terminal-blink text-accent">_</span>
                </div>
              )}
              {showScanPrompt && (
                <div className="flex gap-2 text-xs font-mono">
                  <span className="text-neutral-500">$</span>
                  <span className="text-neutral-400">{typedText}</span>
                  <span className="animate-terminal-blink text-accent">_</span>
                </div>
              )}
            </div>
          </div>

          {/* Minimal social proof */}
          <div className="flex items-center gap-4 mt-8 text-xs text-neutral-500 font-mono animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <span>10,000+ users</span>
            <span className="w-px h-3 bg-neutral-700" />
            <span>500K+ sites scanned</span>
            <span className="w-px h-3 bg-neutral-700" />
            <span>4.9/5 rating</span>
            <span className="w-px h-3 bg-neutral-700" />
            <span>Open Source</span>
          </div>
        </div>
      </div>
    </section>
  )
}

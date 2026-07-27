'use client'

import { useState, useRef } from 'react'
import { scanUrl, type ScanResult } from './useApi'

interface Props {
  onScanComplete: (result: ScanResult) => void
  onScanStart?: () => void
}

export default function ScanCard({ onScanComplete, onScanStart }: Props) {
  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isValid = url.startsWith('http://') || url.startsWith('https://')

  const handleScan = async () => {
    const trimmed = url.trim()
    if (!trimmed) return

    // Auto-prepend https:// if no protocol
    let target = trimmed
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target
      setUrl(target)
    }

    setScanning(true)
    setError(null)
    onScanStart?.()

    // Cancel previous scan if any
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await scanUrl(target, controller.signal)
      onScanComplete(result)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Scan failed'
      // ponytail: user-friendly timeout hint without adding a separate timeout check
      setError(msg.includes('timeout') || msg.includes('timed out')
        ? 'Request timed out — the backend may be unreachable'
        : msg)
    } finally {
      setScanning(false)
      abortRef.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !scanning && url.trim()) {
      handleScan()
    }
  }

  return (
    <div className="terminal-card hover-glow">
      <div className="terminal-header">
        <span className={`terminal-dot ${scanning ? 'bg-accent/70' : error ? 'bg-threat-danger/70' : 'bg-accent/70'}`} />
        <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
          Scan URL
        </span>
          {scanning && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-accent font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" style={{ animationDelay: '0s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" style={{ animationDelay: '0.3s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" style={{ animationDelay: '0.6s' }} />
            scanning
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null) }}
            onKeyDown={handleKeyDown}
            placeholder="example.com or https://..."
            aria-label="Website URL to scan"
            disabled={scanning}
            className="flex-1 h-10 rounded-md bg-surface-3 border border-neutral-700/50 px-3
                       text-sm text-neutral-200 font-mono placeholder-neutral-600
                       focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20
                       disabled:opacity-40 transition-colors"
          />
          <button
            onClick={handleScan}
            disabled={scanning || !url.trim()}
            className={`btn-accent text-xs px-5 ${(!url.trim() || scanning) ? 'opacity-40 cursor-not-allowed' : ''} ${scanning ? 'min-w-[72px]' : ''}`}
          >
            {scanning ? (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Scan
              </span>
            ) : 'Scan'}
          </button>
        </div>

        {error && (
          <p className="text-xs text-threat-danger font-mono mt-3 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </p>
        )}

        {!error && !scanning && (
          <p className="text-xs text-neutral-600 font-mono mt-3">
            {isValid ? 'Press Enter or click Scan' : 'Enter a URL to check for threats'}
          </p>
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useApi } from './useApi'

interface ScanEntry {
  url: string
  score: number
  verdict: string
  summary: string
  aiModel: string
  aiProvider: string
  analysisMs: number
  hasSSL: boolean
  domainAge: number | null
  flags: string[]
  timestamp: number
}

interface HistoryResponse {
  scans: ScanEntry[]
  total: number
}

interface Props {
  onSelectScan?: (url: string) => void
  refreshKey?: number
}

function verdictColor(v: string): string {
  if (v === 'SAFE') return 'text-threat-safe'
  if (v === 'SUSPICIOUS') return 'text-threat-warn'
  if (v === 'SCAM') return 'text-threat-danger'
  return 'text-neutral-400'
}

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function truncate(url: string, max = 55): string {
  return url.length > max ? url.slice(0, max) + '…' : url
}

export default function RecentScansCard({ onSelectScan, refreshKey = 0 }: Props) {
  const { data, loading, error, refetch } = useApi<HistoryResponse>('/api/history')
  const [selecting, setSelecting] = useState<string | null>(null)
  const scans = data?.scans ?? []
  const total = data?.total ?? 0

  // Refresh when external trigger fires (scan complete)
  useEffect(() => {
    refetch()
  }, [refreshKey, refetch])

  const handleClick = async (url: string) => {
    if (!onSelectScan) return
    setSelecting(url)
    try {
      await onSelectScan(url)
    } finally {
      setSelecting(null)
    }
  }

  return (
    <div className="terminal-card hover-glow">
      <div className="terminal-header">
        <span className="terminal-dot bg-neutral-500/70" />
        <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
          Recent Scans
        </span>
        <span className="ml-auto text-xs text-neutral-600 font-mono">
          {total} total
        </span>
        {error && (
          <button onClick={refetch} className="ml-3 text-xs text-accent font-mono hover:underline">
            Retry
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="p-10 flex items-center justify-center min-h-[120px]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-pulse-dot" style={{ animationDelay: '0s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-pulse-dot" style={{ animationDelay: '0.3s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-pulse-dot" style={{ animationDelay: '0.6s' }} />
            <span className="text-sm text-neutral-500 font-mono ml-2">Loading...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-10 flex items-center justify-center min-h-[120px]">
          <div className="text-center">
            <p className="text-sm text-threat-danger font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* Empty — updated copy */}
      {!loading && !error && scans.length === 0 && (
        <div className="p-10 flex items-center justify-center min-h-[120px]">
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto mb-2 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <p className="text-sm text-neutral-500 font-mono">No scans yet. Scan a URL to begin.</p>
          </div>
        </div>
      )}

      {/* Data table */}
      {!loading && !error && scans.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-700/30">
                <th className="text-left px-4 py-2.5 text-neutral-500 font-medium uppercase tracking-wider">URL</th>
                <th className="text-center px-3 py-2.5 text-neutral-500 font-medium uppercase tracking-wider">Score</th>
                <th className="text-center px-3 py-2.5 text-neutral-500 font-medium uppercase tracking-wider">Verdict</th>
                <th className="text-left px-3 py-2.5 text-neutral-500 font-medium uppercase tracking-wider hidden sm:table-cell">When</th>
                <th className="text-left px-3 py-2.5 text-neutral-500 font-medium uppercase tracking-wider hidden md:table-cell">Model</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s, i) => (
                <tr
                  key={s.timestamp + '-' + i}
                  onClick={() => handleClick(s.url)}
                  className={`border-b border-neutral-800/50 transition-colors ${
                    onSelectScan ? 'cursor-pointer hover:bg-surface-3/40' : 'hover:bg-surface-3/30'
                  } ${selecting === s.url ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <td className="px-4 py-3 text-neutral-300 max-w-[200px] truncate" title={s.url}>
                    {selecting === s.url ? (
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                        Scanning...
                      </span>
                    ) : (
                      truncate(s.url)
                    )}
                  </td>
                  <td className={`px-3 py-3 text-center font-semibold ${verdictColor(s.verdict)}`}>
                    {s.score}
                  </td>
                  <td className={`px-3 py-3 text-center ${verdictColor(s.verdict)}`}>
                    {s.verdict}
                  </td>
                  <td className="px-3 py-3 text-neutral-500 hidden sm:table-cell">
                    {timeAgo(s.timestamp)}
                  </td>
                  <td className="px-3 py-3 text-neutral-500 hidden md:table-cell max-w-[120px] truncate" title={s.aiModel}>
                    {s.aiModel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

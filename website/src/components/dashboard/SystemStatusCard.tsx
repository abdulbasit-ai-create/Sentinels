'use client'

import { useEffect } from 'react'
import { useApi } from './useApi'

interface StatsResponse {
  totalScans: number
  avgScore: number
  avgLatencyMs: number
  safeCount: number
  suspiciousCount: number
  scamCount: number
  scansToday: number
  modelUsage: Record<string, number>
  lastScanTimestamp: number | null
  uptimeHours: number
}

interface Props {
  refreshKey?: number
}

function fmt(value: number | string | null | undefined, fallback = '--'): string {
  if (value === null || value === undefined) return fallback
  return String(value)
}

export default function SystemStatusCard({ refreshKey = 0 }: Props) {
  const { data, loading, error, refetch } = useApi<StatsResponse>('/api/stats')

  // Auto-refresh every 20 seconds
  useEffect(() => {
    const interval = setInterval(refetch, 20000)
    return () => clearInterval(interval)
  }, [refetch])

  // External refresh trigger (e.g. after a scan completes)
  useEffect(() => {
    refetch()
  }, [refreshKey, refetch])

  function fmtScore(v: number | null | undefined, suffix = ''): string {
    if (v === null || v === undefined) return '--'
    return `${Math.round(v)}${suffix}`
  }

  const items = [
    { label: 'Total Scans', value: loading ? '...' : fmt(data?.totalScans) },
    { label: 'Avg Score',   value: loading ? '...' : fmtScore(data?.avgScore, '/100') },
    { label: 'Avg Latency', value: loading ? '...' : fmtScore(data?.avgLatencyMs, 'ms') },
    { label: 'Scans Today', value: loading ? '...' : fmt(data?.scansToday) },
    { label: 'Safe',        value: loading ? '...' : fmt(data?.safeCount) },
    { label: 'Suspicious',  value: loading ? '...' : fmt(data?.suspiciousCount) },
    { label: 'Scam',        value: loading ? '...' : fmt(data?.scamCount) },
    { label: 'Uptime',      value: loading ? '...' : fmtScore(data?.uptimeHours, 'h') },
  ]

  // Top model info
  const topModel = data?.modelUsage && Object.keys(data.modelUsage).length > 0
    ? Object.entries(data.modelUsage).sort((a, b) => b[1] - a[1])[0]
    : null

  return (
    <div className="terminal-card hover-glow h-full">
      <div className="terminal-header">
        <span className="terminal-dot bg-accent/70" />
        <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
          System Status
        </span>
        {!loading && (
          <span className="ml-auto text-xs text-neutral-600 font-mono">
            {data ? `v${Math.round(data.uptimeHours * 10) / 10}h` : '--'}
          </span>
        )}
        {error && (
          <button onClick={refetch} className="ml-2 text-xs text-accent font-mono hover:underline">
            Retry
          </button>
        )}
      </div>
      <div className="p-5">
        {error ? (
          <div className="text-center py-4">
            <p className="text-xs text-threat-danger font-mono">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-5 gap-x-4">
            {items.map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-lg font-mono font-semibold text-white">
                  {item.value}
                </div>
                <div className="text-xs text-neutral-500 font-mono mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* AI Model / Provider section */}
        {topModel && (
          <div className="mt-5 pt-4 border-t border-neutral-700/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-neutral-500 font-mono mb-1.5">AI Model</div>
                <code className="code-label text-[11px] break-all" title={topModel[0]}>
                  {topModel[0]}
                </code>
              </div>
              <div>
                <div className="text-xs text-neutral-500 font-mono mb-1.5">Provider</div>
                <span className="text-xs text-neutral-400 font-mono">
                  {topModel[0].includes('/') ? topModel[0].split('/')[0] : 'nvidia'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

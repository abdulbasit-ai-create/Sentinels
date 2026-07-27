'use client'

import { useState, useEffect, useRef } from 'react'
import { useApi } from './useApi'

interface HealthResponse {
  status: string
  version: string
  timestamp: string
}

interface Props {
  compact?: boolean
}

export default function HealthCard({ compact }: Props) {
  const { data, loading, error, refetch } = useApi<HealthResponse>('/health')
  const [latency, setLatency] = useState<number | null>(null)
  const fetchStart = useRef(0)

  useEffect(() => {
    if (loading) fetchStart.current = Date.now()
    if (data) setLatency(Date.now() - fetchStart.current)
  }, [loading, data])

  const isOk = data?.status === 'ok' && !error

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs font-mono">
          {loading ? (
            <span className="w-2 h-2 rounded-full bg-threat-warn animate-pulse-dot" />
          ) : error ? (
            <span className="w-2 h-2 rounded-full bg-threat-danger" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-threat-safe" />
          )}
          <span className={error ? 'text-threat-danger' : 'text-neutral-400'}>
            {loading ? 'health...' : error ? 'offline' : 'online'}
          </span>
        </span>
        {data?.version && (
          <span className="text-xs text-neutral-600 font-mono">v{data.version}</span>
        )}
        {latency !== null && (
          <span className="text-xs text-neutral-600 font-mono">{latency}ms</span>
        )}
        {error && (
          <button onClick={refetch} className="text-xs text-accent font-mono hover:underline">retry</button>
        )}
      </div>
    )
  }

  return (
    <div className="terminal-card hover-glow">
      <div className="terminal-header">
        <span className={`terminal-dot ${isOk ? 'bg-threat-safe/70' : error ? 'bg-threat-danger/70' : 'bg-threat-warn/70'}`} />
        <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Backend Health</span>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-neutral-400">Status</span>
          {loading ? (
            <span className="flex items-center gap-2 text-sm text-threat-warn font-mono">
              <span className="w-2 h-2 rounded-full bg-threat-warn animate-pulse-dot" />
              Checking...
            </span>
          ) : error ? (
            <span className="flex items-center gap-2 text-sm text-threat-danger font-mono" title={error}>
              <span className="w-2 h-2 rounded-full bg-threat-danger" />
              Offline
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm text-threat-safe font-mono">
              <span className="w-2 h-2 rounded-full bg-threat-safe" />
              Online
            </span>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-500">Uptime</span>
            <span className="text-neutral-400 font-mono">
              {data ? `${Math.round((Date.now() - new Date(data.timestamp).getTime()) / 1000)}s` : '--'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-neutral-500">Version</span>
            <span className="text-neutral-400 font-mono">{data?.version ?? '--'}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-neutral-500">Latency</span>
            <span className="text-neutral-400 font-mono">
              {latency !== null ? `${latency}ms` : '--'}
            </span>
          </div>
        </div>
        {error && (
          <div className="mt-3 pt-3 border-t border-neutral-700/30">
            <p className="text-xs text-threat-danger font-mono truncate">{error}</p>
            <button onClick={refetch} className="mt-2 text-xs text-accent font-mono hover:underline">Retry</button>
          </div>
        )}
      </div>
    </div>
  )
}

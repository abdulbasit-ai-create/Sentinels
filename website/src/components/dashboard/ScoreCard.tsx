'use client'

import type { ScanResult } from './useApi'

interface Props {
  result: ScanResult | null
}

function scoreColor(score: number): string {
  if (score >= 70) return '#00e5a0'   // safe — green
  if (score >= 40) return '#ffb224'   // suspicious — amber
  return '#ff4d4d'                     // scam — red
}

function verdictBadge(v: string): string {
  if (v === 'SAFE') return 'text-threat-safe border-threat-safe/30 bg-threat-safe/10'
  if (v === 'SUSPICIOUS') return 'text-threat-warn border-threat-warn/30 bg-threat-warn/10'
  if (v === 'SCAM') return 'text-threat-danger border-threat-danger/30 bg-threat-danger/10'
  return 'text-neutral-400 border-neutral-600/30 bg-neutral-700/20'
}

export default function ScoreCard({ result }: Props) {
  const score = result?.score ?? 0
  const verdict = result?.verdict ?? 'PENDING'
  const color = result ? scoreColor(score) : '#52525b'
  const circumference = 2 * Math.PI * 42 // 2 * pi * r
  // When empty, show offset at 50% (neutral position)
  const offset = result
    ? circumference - (score / 100) * circumference
    : circumference * 0.5

  return (
    <div className="terminal-card hover-glow h-full">
      <div className="terminal-header">
        <span className={`terminal-dot ${result ? (score >= 70 ? 'bg-threat-safe/70' : score >= 40 ? 'bg-threat-warn/70' : 'bg-threat-danger/70') : 'bg-neutral-600/70'}`} />
        <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Score</span>
        {result && (
          <span className="ml-auto text-xs text-neutral-600 font-mono">{score}/100</span>
        )}
      </div>
      <div className="p-5 flex flex-col items-center justify-center min-h-[200px]">
        {/* Gauge — always rendered so CSS transitions persist across result changes */}
        <div className="relative w-24 h-24 mb-3">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6"
              className="text-neutral-700/50" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.4s ease' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-mono font-bold transition-all duration-500 ${result ? 'animate-counter' : 'text-neutral-500'}`}
              style={result ? { color } : {}}>
              {result ? score : '--'}
            </span>
          </div>
        </div>

        {/* Verdict badge */}
        {result ? (
          <span key={verdict} className={`px-3 py-1 rounded text-xs font-mono font-semibold border animate-slide-up ${verdictBadge(verdict)}`}>
            {verdict}
          </span>
        ) : (
          <span className="text-xs font-mono text-neutral-600 uppercase tracking-wider">No scan yet</span>
        )}

        {/* Method */}
        {result?.details?.compositeMethod && (
          <span className="text-xs text-neutral-600 font-mono mt-2">
            {result.details.compositeMethod.replace(/_/g, ' ')}
          </span>
        )}
      </div>
    </div>
  )
}

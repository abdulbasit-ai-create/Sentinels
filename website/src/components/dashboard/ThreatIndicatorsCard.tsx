'use client'

import type { ScanResult } from './useApi'

interface Props {
  result: ScanResult | null
}

function flagColor(flag: string): string {
  const lower = flag.toLowerCase()
  if (lower.includes('phish') || lower.includes('scam') || lower.includes('malicious') || lower.includes('malware') || lower.includes('crypto') || lower.includes('zero-day')) {
    return 'text-threat-danger border-threat-danger/20 bg-threat-danger/8'
  }
  if (lower.includes('ssl') || lower.includes('missing') || lower.includes('suspicious') || lower.includes('new') || lower.includes('private')) {
    return 'text-threat-warn border-threat-warn/20 bg-threat-warn/8'
  }
  return 'text-neutral-400 border-neutral-600/20 bg-neutral-700/20'
}

function flagIcon(flag: string): string {
  const lower = flag.toLowerCase()
  if (lower.includes('phish') || lower.includes('scam') || lower.includes('malicious')) return '⚠'
  if (lower.includes('ssl') || lower.includes('missing')) return '🔒'
  if (lower.includes('crypto')) return '₿'
  if (lower.includes('zero-day')) return '🛡'
  return '•'
}

export default function ThreatIndicatorsCard({ result }: Props) {
  if (!result) {
    return (
      <div className="terminal-card hover-glow h-full">
        <div className="terminal-header">
          <span className="terminal-dot bg-neutral-500/70" />
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Threat Indicators</span>
        </div>
        <div className="p-5 min-h-[160px] flex items-center justify-center">
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto mb-2 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-neutral-500 font-mono">Results will appear here after scanning</p>
          </div>
        </div>
      </div>
    )
  }

  const { flags, domainAge, domainAgeText, hasSSL, registrar, isPhishing, isMalicious, isInUrlhaus } = result

  // Red flags from detailed info
  const redFlags: string[] = []
  if (isPhishing) redFlags.push('Flagged by PhishTank')
  if (isMalicious) redFlags.push('Flagged by Google Safe Browsing')
  if (isInUrlhaus) redFlags.push('Found in URLhaus malware database')
  if (!hasSSL) redFlags.push('No SSL certificate — HTTP connection')

  return (
    <div className="terminal-card hover-glow animate-fade-in-up">
      <div className="terminal-header">
        <span className={`terminal-dot ${flags.length > 2 ? 'bg-threat-danger/70' : flags.length > 0 ? 'bg-threat-warn/70' : 'bg-threat-safe/70'}`} />
        <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Threat Indicators</span>
        {flags.length > 0 && (
          <span className="ml-auto text-xs font-mono text-neutral-500">{flags.length} flag{flags.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="p-5 space-y-4">
        {/* Domain info */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div>
            <span className="text-neutral-500">Domain Age</span>
            <p className="text-neutral-300 mt-0.5">{domainAgeText || 'Unknown'}</p>
          </div>
          <div>
            <span className="text-neutral-500">SSL</span>
            <p className={hasSSL ? 'text-threat-safe mt-0.5' : 'text-threat-danger mt-0.5'}>
              {hasSSL ? 'Present' : 'Missing'}
            </p>
          </div>
          {registrar && (
            <div className="col-span-2">
              <span className="text-neutral-500">Registrar</span>
              <p className="text-neutral-300 mt-0.5 truncate">{registrar}</p>
            </div>
          )}
        </div>

        {/* Flags */}
        {flags.length > 0 && (
          <div>
            <div className="text-xs text-neutral-500 font-mono mb-2">Flags</div>
            <div className="space-y-1.5">
              {flags.map((flag, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 px-2.5 py-1.5 rounded text-xs font-mono border ${flagColor(flag)}`}
                >
                  <span className="mt-0.5 shrink-0">{flagIcon(flag)}</span>
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No flags fallback */}
        {flags.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-threat-safe font-mono">
            <span className="w-2 h-2 rounded-full bg-threat-safe" />
            No threats detected
          </div>
        )}
      </div>
    </div>
  )
}

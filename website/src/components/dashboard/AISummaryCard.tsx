'use client'

import type { ScanResult } from './useApi'

interface Props {
  result: ScanResult | null
}

export default function AISummaryCard({ result }: Props) {
  if (!result) {
    return (
      <div className="terminal-card hover-glow h-full">
        <div className="terminal-header">
          <span className="terminal-dot bg-accent/70" />
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">AI Analysis</span>
        </div>
        <div className="p-5 min-h-[160px] flex items-center justify-center">
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto mb-2 text-neutral-700 animate-glow-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <p className="text-sm text-neutral-500 font-mono">Enter a URL and scan to see AI analysis</p>
            <p className="text-xs text-neutral-600 font-mono mt-2">Heuristic engine always active — AI adds deeper analysis</p>
          </div>
        </div>
      </div>
    )
  }

  const { summary, details, analysisMs, url } = result
  const aiAnalysis = details?.aiAnalysis || ''
  const model = details?.aiModel || 'unknown'
  const provider = details?.aiProvider || 'unknown'
  const isFallback = provider === 'fallback' || provider === 'local-keyword-analysis'

  return (
    <div className="terminal-card hover-glow animate-fade-in-up">
      <div className="terminal-header">
        <span className={`terminal-dot ${isFallback ? 'bg-threat-warn/70' : 'bg-accent/70'}`} />
        <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
          {isFallback ? 'Analysis (AI Unavailable)' : 'AI Analysis'}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-neutral-500 font-mono">
          {analysisMs}ms
        </span>
      </div>
      <div className="p-5 space-y-4">
        {/* AI fallback notice */}
        {isFallback && (
          <div className="flex items-start gap-2 px-3 py-2 rounded text-xs font-mono border border-threat-warn/20 bg-threat-warn/8 text-threat-warn">
            <span className="mt-0.5 shrink-0">⚡</span>
            <span>AI temporarily unavailable — results based on heuristic analysis. Full AI resumes automatically when the service recovers.</span>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="animate-slide-up">
            <div className="text-xs text-neutral-500 font-mono mb-1">Summary</div>
            <p className="text-sm text-neutral-200 leading-relaxed">{summary}</p>
          </div>
        )}

        {/* AI analysis detail */}
        {aiAnalysis && (
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="text-xs text-neutral-500 font-mono mb-1">Detailed Analysis</div>
            <p className="text-sm text-neutral-300 leading-relaxed">{aiAnalysis}</p>
          </div>
        )}

        {/* Meta footer */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-neutral-700/30 text-xs font-mono">
          {model && <code className="code-label text-[11px]">{model}</code>}
          <span className="text-neutral-500">{provider}</span>
          <span className="text-neutral-600 truncate max-w-[200px]" title={url}>{url}</span>
        </div>
      </div>
    </div>
  )
}

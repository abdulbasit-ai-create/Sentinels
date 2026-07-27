// ── Skeleton placeholders for scan-in-progress ─────────────

export function SkeletonSummary() {
  return (
    <div className="terminal-card animate-pulse">
      <div className="terminal-header">
        <span className="terminal-dot bg-accent/40" />
        <span className="text-xs font-mono text-neutral-500">AI Summary</span>
      </div>
      <div className="p-5 space-y-3">
        <div className="h-3 bg-surface-3 rounded w-3/4" />
        <div className="h-3 bg-surface-3 rounded w-full" />
        <div className="h-3 bg-surface-3 rounded w-5/6" />
        <div className="h-3 bg-surface-3 rounded w-2/3" />
      </div>
    </div>
  )
}

export function SkeletonThreats() {
  return (
    <div className="terminal-card animate-pulse">
      <div className="terminal-header">
        <span className="terminal-dot bg-accent/40" />
        <span className="text-xs font-mono text-neutral-500">Threat Indicators</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="h-3 bg-surface-3 rounded w-1/2" />
        <div className="h-2 bg-surface-3 rounded w-full" />
        <div className="h-2 bg-surface-3 rounded w-full" />
        <div className="h-2 bg-surface-3 rounded w-3/4" />
      </div>
    </div>
  )
}

export function SkeletonScore() {
  return (
    <div className="terminal-card animate-pulse">
      <div className="terminal-header">
        <span className="terminal-dot bg-accent/40" />
        <span className="text-xs font-mono text-neutral-500">Score</span>
      </div>
      <div className="p-5 flex justify-center items-center h-32">
        <div className="w-24 h-24 bg-surface-3 rounded-full" />
      </div>
    </div>
  )
}

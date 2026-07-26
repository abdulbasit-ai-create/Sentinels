import Link from 'next/link'

export default function PageHeader({
  badge,
  title,
  description,
}: {
  badge: string
  title: string
  description: string
}) {
  return (
    <div className="relative pt-24 pb-12">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="container-main relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors mb-6 font-mono"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          cd ~
        </Link>
        <p className="section-label">{badge}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
          {title}
        </h1>
        <p className="text-sm text-neutral-400 max-w-lg">{description}</p>
      </div>
    </div>
  )
}

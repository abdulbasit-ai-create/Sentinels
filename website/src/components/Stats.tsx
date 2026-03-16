const stats = [
  { value: '10,000+', label: 'users protected' },
  { value: '500K+', label: 'websites scanned' },
  { value: '18', label: 'dark pattern types' },
  { value: '<3s', label: 'analysis time' },
]

export default function Stats() {
  return (
    <section className="relative py-16">
      <div className="container-main">
        <div className="divider mb-16" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-accent mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-neutral-500 font-mono">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        <div className="divider mt-16" />
      </div>
    </section>
  )
}

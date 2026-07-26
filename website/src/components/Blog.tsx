import Link from 'next/link'

const posts = [
  {
    slug: '#',
    date: '2026-03-03',
    category: 'Security',
    title: 'The Rise of AI-Powered Phishing: What You Need to Know in 2026',
    excerpt: 'Phishing attacks are becoming increasingly sophisticated with AI-generated content. How modern phishing differs and how to protect yourself.',
    readTime: '6 min',
  },
  {
    slug: '#',
    date: '2026-02-24',
    category: 'Dark Patterns',
    title: '18 Dark Patterns Every Online Shopper Should Recognize',
    excerpt: 'From fake countdown timers to guilt-tripping language — every type of dark pattern our extension detects and how they manipulate your decisions.',
    readTime: '8 min',
  },
  {
    slug: '#',
    date: '2026-02-15',
    category: 'Product',
    title: 'How Our Composite Scoring Engine Works Under the Hood',
    excerpt: 'A deep dive into the dual-engine approach — combining heuristic analysis with Llama 3.3 70B AI for reliable trust scores.',
    readTime: '10 min',
  },
  {
    slug: '#',
    date: '2026-02-05',
    category: 'Guides',
    title: 'How to Spot a Fake Online Store in 30 Seconds',
    excerpt: 'Manual red flags to look for: domain age, missing contact info, too-good-to-be-true prices, and more.',
    readTime: '5 min',
  },
]

const catColor: Record<string, string> = {
  Security: 'text-threat-danger',
  'Dark Patterns': 'text-threat-warn',
  Product: 'text-accent',
  Guides: 'text-blue-400',
}

export default function Blog() {
  return (
    <section id="blog" className="relative section-spacing">
      <div className="container-main">
        {/* Header */}
        <div className="mb-12">
          <p className="section-label">// Blog</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Latest from our blog
          </h2>
          <p className="text-neutral-400 max-w-lg text-sm">
            Tips, insights, and updates on online safety, scam detection, and building a safer internet.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <Link key={post.title} href={post.slug} className="group">
              <article className="terminal-card p-5 h-full hover-glow transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-[10px] font-mono uppercase tracking-wider ${catColor[post.category] || 'text-neutral-500'}`}>
                    {post.category}
                  </span>
                  <span className="text-[10px] text-neutral-600 font-mono">{post.date}</span>
                  <span className="text-[10px] text-neutral-600 font-mono">{post.readTime}</span>
                </div>
                <h3 className="text-sm font-semibold text-neutral-200 group-hover:text-white transition-colors mb-2">
                  {post.title}
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed mb-3">
                  {post.excerpt}
                </p>
                <span className="text-[10px] font-mono text-accent group-hover:text-accent/80 transition-colors">
                  Read more →
                </span>
              </article>
            </Link>
          ))}
        </div>

        {/* View all link */}
        <div className="text-center mt-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-accent transition-colors"
          >
            View all posts
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}

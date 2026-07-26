import type { Metadata } from 'next'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Blog — Is This Legit?',
  description: 'Tips, insights, and updates on online safety, scam detection, and dark pattern awareness.',
}

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
  {
    slug: '#',
    date: '2026-01-28',
    category: 'Security',
    title: 'Understanding WHOIS Data: What Domain Registration Reveals',
    excerpt: 'Domain intelligence is one of the strongest signals for legitimacy. What WHOIS data tells us and why hidden registrant info is a red flag.',
    readTime: '7 min',
  },
  {
    slug: '#',
    date: '2026-01-15',
    category: 'Product',
    title: 'Introducing Is This Legit? — Your AI Safety Companion for the Web',
    excerpt: 'Online scams cost consumers billions every year. Our story, our mission, and how our Chrome extension protects you.',
    readTime: '4 min',
  },
]

const catColor: Record<string, string> = {
  Security: 'text-threat-danger',
  'Dark Patterns': 'text-threat-warn',
  Product: 'text-accent',
  Guides: 'text-blue-400',
}

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <PageHeader
        badge="// Blog"
        title="Blog"
        description="Insights on online safety, scam detection, and building a safer internet."
      />

      <div className="container-main pb-20 max-w-3xl">
        <div className="space-y-1">
          {posts.map((post, i) => (
            <Link key={i} href={post.slug} className="block group">
              <article className="py-5 border-b border-neutral-800 hover:bg-surface-2/50 -mx-3 px-3 rounded transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[10px] font-mono uppercase tracking-wider ${catColor[post.category] || 'text-neutral-500'}`}>
                    {post.category}
                  </span>
                  <span className="text-[10px] text-neutral-600 font-mono">{post.date}</span>
                  <span className="text-[10px] text-neutral-600 font-mono">{post.readTime}</span>
                </div>
                <h2 className="text-sm font-semibold text-neutral-200 group-hover:text-white transition-colors mb-1">
                  {post.title}
                </h2>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {post.excerpt}
                </p>
              </article>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Cybersecurity Analyst',
    avatar: 'SC',
    content: 'I\'ve recommended this to all my non-tech friends. The dark pattern detection is incredibly detailed — caught a fake countdown timer that I almost fell for myself.',
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Freelance Designer',
    avatar: 'MJ',
    content: 'Install and forget. It just works. Saved me from a phishing site that looked exactly like my bank\'s login page. The AI analysis caught what my eyes missed.',
    rating: 5,
  },
  {
    name: 'Elena Rodriguez',
    role: 'Small Business Owner',
    avatar: 'ER',
    content: 'I run an online store and use this to vet suppliers. The WHOIS domain intelligence alone has saved me from three scam suppliers this month. Worth every penny.',
    rating: 5,
  },
  {
    name: 'David Kim',
    role: 'Software Engineer',
    avatar: 'DK',
    content: 'Open source and privacy-first. I audited the code myself — no data collection, no tracking. The composite scoring algorithm is elegant and effective.',
    rating: 5,
  },
  {
    name: 'Priya Sharma',
    role: 'Digital Marketing',
    avatar: 'PS',
    content: 'The fake review detection is a game changer. I can finally spot which Amazon reviews are real. The issue highlighting overlay makes it so obvious.',
    rating: 4,
  },
  {
    name: 'James O\'Brien',
    role: 'Retired Teacher',
    avatar: 'JO',
    content: 'Not tech-savvy at all, but even I can use this. Green means safe, red means danger. Simple. My whole family uses it now.',
    rating: 5,
  },
]

export default function Testimonials() {
  const [current, setCurrent] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const goTo = (index: number) => {
    setCurrent(index)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const goPrev = () => {
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const goNext = () => {
    setCurrent((prev) => (prev + 1) % testimonials.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const t = testimonials[current]

  return (
    <section id="testimonials" className="relative section-spacing">
      <div className="container-main">
        {/* Header */}
        <div className="mb-12">
          <p className="section-label">// Testimonials</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Trusted by thousands
          </h2>
          <p className="text-neutral-400 max-w-lg text-sm">
            See what our users are saying about Is This Legit?
          </p>
        </div>

        {/* Rating summary */}
        <div className="flex items-center gap-6 mb-10">
          <div className="text-center">
            <div className="text-3xl font-bold text-white font-mono">4.9</div>
            <div className="text-[10px] text-neutral-500 font-mono mt-1">avg rating</div>
          </div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg key={star} className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-xs text-neutral-500 font-mono">Based on 847 reviews</span>
        </div>

        {/* Carousel */}
        <div className="relative max-w-2xl">
          <div className="terminal-card p-6 min-h-[200px]">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-accent-muted border border-accent/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-accent font-mono">{t.avatar}</span>
              </div>
              <div className="flex-1 min-w-0">
                {/* Name + Role */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white">{t.name}</span>
                  <span className="text-[10px] text-neutral-500 font-mono">{t.role}</span>
                </div>
                {/* Stars */}
                <div className="flex gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-3 h-3 ${star <= t.rating ? 'text-accent' : 'text-neutral-700'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                {/* Content */}
                <p className="text-xs text-neutral-400 leading-relaxed">
                  &ldquo;{t.content}&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    i === current ? 'bg-accent w-4' : 'bg-neutral-700 hover:bg-neutral-600'
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                className="p-1.5 rounded text-neutral-500 hover:text-white hover:bg-surface-3 transition-colors"
                aria-label="Previous testimonial"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
              <button
                onClick={goNext}
                className="p-1.5 rounded text-neutral-500 hover:text-white hover:bg-surface-3 transition-colors"
                aria-label="Next testimonial"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

'use client'

import { useState } from 'react'

const topics = [
  'General inquiry',
  'Support',
  'Bug report',
  'Feature request',
  'Security issue',
  'Partnership',
  'Press / Media',
  'Waitlist (Firefox / Safari)',
]

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'General inquiry',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }

    // Simulate submission
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <section id="contact" className="relative section-spacing">
        <div className="container-main">
          <div className="max-w-lg mx-auto text-center">
            <div className="terminal-card p-8">
              <div className="w-12 h-12 rounded-full bg-accent-muted border border-accent/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Message sent!</h3>
              <p className="text-xs text-neutral-400 mb-6">
                We&apos;ll get back to you within 24 hours. In the meantime, check out our docs and FAQ.
              </p>
              <button
                onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', topic: 'General inquiry', message: '' }) }}
                className="btn-ghost text-xs"
              >
                Send another message
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="contact" className="relative section-spacing">
      <div className="container-main">
        {/* Header */}
        <div className="mb-12">
          <p className="section-label">// Contact</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Get in touch
          </h2>
          <p className="text-neutral-400 max-w-lg text-sm">
            Have a question, suggestion, or want to report an issue? We&apos;d love to hear from you.
            For security issues, please see our Security page.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3">
            <div className="terminal-card p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-threat-danger/10 border border-threat-danger/20 text-xs text-threat-danger">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1 block">
                      Name <span className="text-threat-danger">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Your name"
                      className="w-full px-3 py-2 rounded text-xs bg-surface-3 border border-neutral-700 text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-accent/40 font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1 block">
                      Email <span className="text-threat-danger">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 rounded text-xs bg-surface-3 border border-neutral-700 text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-accent/40 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="topic" className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1 block">
                    Topic
                  </label>
                  <select
                    id="topic"
                    name="topic"
                    value={formData.topic}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded text-xs bg-surface-3 border border-neutral-700 text-neutral-300 focus:outline-none focus:border-accent/40 font-mono appearance-none cursor-pointer"
                  >
                    {topics.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1 block">
                    Message <span className="text-threat-danger">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us how we can help..."
                    className="w-full px-3 py-2 rounded text-xs bg-surface-3 border border-neutral-700 text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-accent/40 font-mono resize-y"
                  />
                </div>

                <button type="submit" className="btn-accent text-xs py-2.5 w-full sm:w-auto">
                  Send message
                </button>
              </form>
            </div>
          </div>

          {/* Contact info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="terminal-card p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">Waitlist</h3>
              <p className="text-xs text-neutral-400 mb-3">
                Join the waitlist for Firefox, Safari, and our mobile companion app.
              </p>
              <form
                onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}
                className="flex gap-1"
              >
                <input
                  type="email"
                  placeholder="your@email.com"
                  required
                  className="flex-1 px-2.5 py-1.5 rounded text-xs bg-surface-3 border border-neutral-700 text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-accent/40 font-mono"
                />
                <button type="submit" className="btn-accent text-[10px] py-1.5 px-3 whitespace-nowrap">
                  Join
                </button>
              </form>
            </div>

            <div className="terminal-card p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">Other ways to reach us</h3>
              <div className="space-y-2 text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <span className="font-mono text-neutral-500">hello@isthislegit.app</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                  <span className="font-mono text-neutral-500">@isthislegit</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.553.152 1.28-.487 1.582l-.598.299a1.5 1.5 0 00-.684 1.882l.218.654c.227.681-.102 1.433-.748 1.714l-1.07.466a2.25 2.25 0 00-1.215 1.508l-.044.148a2.25 2.25 0 01-1.608 1.564l-1.903.475a3.75 3.75 0 01-3.612-1.046L3 18.75m14.25-12.75h.008v.008h-.008V6z" />
                  </svg>
                  <span className="font-mono text-neutral-500">github.com/isthislegit</span>
                </div>
              </div>
            </div>

            <div className="terminal-card p-4 bg-accent/[0.02] border-accent/20">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-accent mb-2">⚡ Response time</h3>
              <p className="text-xs text-neutral-400">
                We typically respond within <span className="text-white">24 hours</span>. 
                Security issues are triaged within <span className="text-white">4 hours</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Documentation — Is This Legit?',
  description: 'Learn how to install, configure, and get the most out of Is This Legit? Chrome extension.',
}

const sections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: [
      {
        subtitle: 'Installation',
        text: 'Visit the Chrome Web Store and click "Add to Chrome." The extension installs in seconds and requires no account or configuration. Once installed, the shield icon appears in your browser toolbar.',
      },
      {
        subtitle: 'First Scan',
        text: 'Navigate to any website. The extension automatically analyzes the page in the background. Click the shield icon to view the trust score, detected issues, and detailed breakdown. A green badge means safe, yellow means caution, and red means high risk.',
      },
      {
        subtitle: 'Permissions',
        text: 'The extension requires access to read page content (to detect dark patterns), access to the active tab URL (to check against threat databases), and storage (to save your scan history locally). We never access your browsing history or personal data.',
      },
    ],
  },
  {
    id: 'trust-score',
    title: 'Understanding the Trust Score',
    content: [
      {
        subtitle: 'How Scoring Works',
        text: 'Each website receives a composite score from 0 to 100. This score blends two independent assessments: a heuristic score based on deterministic checks (domain age, SSL, dark patterns, URL structure) and an AI score from our Llama 3.3 70B model that understands context and nuance.',
      },
      {
        subtitle: 'Score Ranges',
        text: '70-100 (Safe): The site passes most checks and shows no significant red flags. 40-69 (Caution): Some concerns detected — review the details before proceeding. 0-39 (High Risk): Multiple serious issues found. Exercise extreme caution or avoid the site entirely.',
      },
      {
        subtitle: 'Trusted Domains',
        text: 'Over 100 well-known domains (Google, Amazon, GitHub, etc.) are whitelisted to prevent false positives. These sites receive an automatic high score and skip the full analysis pipeline.',
      },
    ],
  },
  {
    id: 'dark-patterns',
    title: 'Dark Pattern Detection',
    content: [
      {
        subtitle: 'What We Detect',
        text: 'We scan for 18 categories of dark patterns including: fake countdown timers, artificial scarcity messaging, guilt-tripping language, deceptive button styling, hidden costs, bait-and-switch tactics, forced continuity, trick questions, disguised ads, friend spam triggers, roach motels, privacy zuckering, confirmshaming, misdirection, hidden subscriptions, fake social proof, fake urgency, and obstruction patterns.',
      },
      {
        subtitle: 'Visual Highlighting',
        text: 'Click "Highlight Issues" in the extension popup to overlay colored markers directly on the page. Each detected dark pattern is outlined with a colored border and labeled.',
      },
    ],
  },
  {
    id: 'scan-history',
    title: 'Scan History',
    content: [
      {
        subtitle: 'Viewing History',
        text: 'Click the clock icon in the extension popup to view your recent scans. Each entry shows the site URL, trust score, date, and number of issues found. History is stored locally in your browser.',
      },
      {
        subtitle: 'Storage Limits',
        text: 'The Free plan stores your last 25 scans. Pro users can access up to 200 historical scans. History can be cleared at any time from the extension settings.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Customization',
    content: [
      {
        subtitle: 'Theme',
        text: 'Switch between light and dark mode from the extension popup using the theme toggle. The extension respects your system preference by default.',
      },
      {
        subtitle: 'Notifications',
        text: 'The extension badge color updates automatically for every page: green for safe, yellow for caution, red for high risk. No intrusive popups — information is always one click away.',
      },
    ],
  },
]

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <PageHeader
        badge="// Docs"
        title="Documentation"
        description="Everything you need to know about installing and using Is This Legit?"
      />

      <div className="container-main pb-20">
        <div className="flex gap-10">
          {/* Sidebar */}
          <aside className="hidden lg:block w-48 shrink-0">
            <nav className="sticky top-20 space-y-0.5">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block px-3 py-1.5 rounded text-xs font-mono text-neutral-500 hover:text-white hover:bg-surface-3 transition-colors"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0 max-w-2xl">
            <div className="space-y-14">
              {sections.map((section) => (
                <div key={section.id} id={section.id}>
                  <h2 className="text-lg font-bold text-white mb-5 pb-3 border-b border-neutral-800">
                    {section.title}
                  </h2>
                  <div className="space-y-6">
                    {section.content.map((item) => (
                      <div key={item.subtitle}>
                        <h3 className="text-sm font-semibold text-neutral-200 mb-1.5">
                          {item.subtitle}
                        </h3>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

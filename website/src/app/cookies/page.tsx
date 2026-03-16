import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Cookie Policy — Is This Legit?',
  description: 'How Is This Legit? uses cookies and similar technologies.',
}

const lastUpdated = 'March 1, 2026'

export default function CookiePage() {
  return (
    <>
      <Navbar />
      <PageHeader
        badge="// Legal"
        title="Cookie Policy"
        description="How we use cookies and similar technologies."
      />

      <div className="container-main pb-20 max-w-2xl">
        <p className="text-[10px] text-neutral-600 font-mono mb-8">Last updated: {lastUpdated}</p>

        <div className="space-y-10">
          <Section title="1. What Are Cookies">
            <p>
              Cookies are small text files stored on your device when you visit a website. Similar technologies include local storage, session storage, and pixel tags.
            </p>
          </Section>

          <Section title="2. Cookies on This Website">
            <p className="mb-3">
              This website uses a minimal set of cookies:
            </p>

            <div className="terminal-card overflow-hidden mb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-700/50">
                    <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-neutral-500">Cookie</th>
                    <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-neutral-500">Type</th>
                    <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-neutral-500">Purpose</th>
                    <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-neutral-500">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-800/50">
                    <td className="px-4 py-2 text-neutral-300 font-mono text-[11px]">__next_*</td>
                    <td className="px-4 py-2 text-neutral-400">Essential</td>
                    <td className="px-4 py-2 text-neutral-400">Website functionality and routing.</td>
                    <td className="px-4 py-2 text-neutral-400">Session</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              We do not use advertising, tracking, or third-party analytics cookies.
            </p>
          </Section>

          <Section title="3. Cookies in the Extension">
            <p>
              The extension does not set or read any cookies. Local data is stored via Chrome&apos;s storage API, isolated from website cookies.
            </p>
          </Section>

          <Section title="4. Third-Party Cookies">
            <p>
              This website loads fonts from Google Fonts, which may set cookies per Google&apos;s policy. No other third-party cookies are used.
            </p>
          </Section>

          <Section title="5. Managing Cookies">
            <p className="mb-2">You can manage cookies through your browser:</p>
            <ul className="list-disc list-inside space-y-1 text-neutral-400 text-xs">
              <li>View and delete cookies individually</li>
              <li>Block third-party cookies</li>
              <li>Block cookies from specific sites</li>
              <li>Block all cookies</li>
              <li>Delete all cookies on browser close</li>
            </ul>
            <p className="mt-2">
              Blocking essential cookies may affect functionality.
            </p>
          </Section>

          <Section title="6. Changes to This Policy">
            <p>
              We may update this policy. Changes are reflected here with an updated date. Additional cookies will require consent where required by law.
            </p>
          </Section>

          <Section title="7. Contact">
            <p>
              Questions? Contact us at{' '}
              <a href="mailto:privacy@isthislegit.app" className="text-accent hover:underline">
                privacy@isthislegit.app
              </a>.
            </p>
          </Section>
        </div>
      </div>

      <Footer />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-bold text-white mb-3">{title}</h2>
      <div className="text-xs text-neutral-400 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

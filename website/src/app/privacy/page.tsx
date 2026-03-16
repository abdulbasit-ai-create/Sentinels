import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy — Is This Legit?',
  description: 'How Is This Legit? handles your data, what we collect, and your rights.',
}

const lastUpdated = 'March 1, 2026'

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <PageHeader
        badge="// Legal"
        title="Privacy Policy"
        description="Your privacy matters. Here is exactly how we handle your data."
      />

      <div className="container-main pb-20 max-w-2xl">
        <p className="text-[10px] text-neutral-600 font-mono mb-8">Last updated: {lastUpdated}</p>

        <div className="space-y-10">
          <Section title="1. Overview">
            <p>
              Is This Legit? (&quot;we,&quot; &quot;our,&quot; or &quot;the Extension&quot;) is a Chrome browser extension that analyzes websites for scams, phishing, dark patterns, and fake reviews. This Privacy Policy explains what data we collect, how we use it, and your rights.
            </p>
          </Section>

          <Section title="2. Data We Collect">
            <h4 className="text-xs font-semibold text-neutral-200 mb-1.5">2.1 Data sent to our servers</h4>
            <p className="mb-3">
              When you scan a website, the following is sent to our API:
            </p>
            <ul className="list-disc list-inside space-y-1 text-neutral-400 text-xs mb-3">
              <li>The URL of the page being analyzed</li>
              <li>Page content signals (meta tags, form fields, script ratios, dark pattern indicators)</li>
              <li>Extracted review text (up to 15 reviews, if present)</li>
            </ul>
            <p className="mb-3">
              This data is processed in real-time and <strong className="text-neutral-200">not stored on our servers</strong>.
            </p>

            <h4 className="text-xs font-semibold text-neutral-200 mb-1.5">2.2 Data stored locally</h4>
            <ul className="list-disc list-inside space-y-1 text-neutral-400 text-xs">
              <li>Scan history (URL, trust score, date, issue count) — up to 50 entries</li>
              <li>Theme preference (light/dark)</li>
              <li>Extension settings</li>
            </ul>
            <p className="mt-2">This data never leaves your browser.</p>
          </Section>

          <Section title="3. Data We Do Not Collect">
            <ul className="list-disc list-inside space-y-1 text-neutral-400 text-xs">
              <li>Browsing history or navigation patterns</li>
              <li>Personal information (name, email, address)</li>
              <li>Passwords, payment details, or form input values</li>
              <li>Cookies or tracking identifiers</li>
              <li>Device fingerprints</li>
              <li>Location data</li>
            </ul>
          </Section>

          <Section title="4. Third-Party Services">
            <p className="mb-2">Our analysis pipeline uses:</p>
            <ul className="list-disc list-inside space-y-1 text-neutral-400 text-xs">
              <li><strong className="text-neutral-200">Groq</strong> — AI model hosting (Llama 3.3 70B)</li>
              <li><strong className="text-neutral-200">PhishTank</strong> — Phishing URL database</li>
              <li><strong className="text-neutral-200">Google Safe Browsing</strong> — Malware detection</li>
              <li><strong className="text-neutral-200">WHOIS providers</strong> — Domain registration info</li>
            </ul>
          </Section>

          <Section title="5. Data Security">
            <p>
              All communication is encrypted over HTTPS with TLS 1.2+. Our server uses Helmet.js security headers, timing-safe API key authentication, input sanitization, and rate limiting (20 req/min).
            </p>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We do not retain any user data on our servers. Analysis results are computed and returned in real-time, then discarded. Local scan history is retained until you clear it or uninstall.
            </p>
          </Section>

          <Section title="7. Your Rights">
            <ul className="list-disc list-inside space-y-1 text-neutral-400 text-xs">
              <li>Clear all locally stored data via extension settings</li>
              <li>Uninstall the extension to remove all data</li>
              <li>Request information about data processing</li>
              <li>Contact us with privacy concerns</li>
            </ul>
          </Section>

          <Section title="8. Children&apos;s Privacy">
            <p>
              Our extension is not directed at children under 13. We do not knowingly collect data from children.
            </p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>
              We may update this policy. Changes will be reflected on this page with an updated date. Continued use constitutes acceptance.
            </p>
          </Section>

          <Section title="10. Contact">
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

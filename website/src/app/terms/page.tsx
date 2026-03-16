import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Terms of Service — Is This Legit?',
  description: 'Terms and conditions for using the Is This Legit? Chrome extension and services.',
}

const lastUpdated = 'March 1, 2026'

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <PageHeader
        badge="// Legal"
        title="Terms of Service"
        description="The terms governing your use of Is This Legit?"
      />

      <div className="container-main pb-20 max-w-2xl">
        <p className="text-[10px] text-neutral-600 font-mono mb-8">Last updated: {lastUpdated}</p>

        <div className="space-y-10">
          <Section title="1. Acceptance of Terms">
            <p>
              By installing or using the Is This Legit? Chrome extension (&quot;the Extension&quot;), you agree to these Terms. If you do not agree, do not use the Extension.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              Is This Legit? provides AI-powered analysis of websites to help identify scams, phishing, dark patterns, and fake reviews. Trust scores are informational tools to assist your decision-making.
            </p>
          </Section>

          <Section title="3. No Guarantee of Accuracy">
            <p>
              The Extension is an informational tool. We cannot guarantee every threat will be detected or that every flagged site is malicious. Scores may produce false positives or negatives.
            </p>
            <p>
              <strong className="text-neutral-200">Do not rely solely on the Extension for security decisions.</strong>
            </p>
          </Section>

          <Section title="4. Permitted Use">
            <p className="mb-2">You may not:</p>
            <ul className="list-disc list-inside space-y-1 text-neutral-400 text-xs">
              <li>Reverse engineer, decompile, or disassemble the Extension</li>
              <li>Circumvent rate limits or authentication</li>
              <li>Use for automated scraping or competitive intelligence</li>
              <li>Redistribute, resell, or sublicense</li>
              <li>Use for any unlawful purpose</li>
            </ul>
          </Section>

          <Section title="5. Accounts and Subscriptions">
            <p>
              Free tier requires no account. Paid plans require valid payment. Subscriptions renew automatically. Cancel anytime. 30-day money-back guarantee.
            </p>
          </Section>

          <Section title="6. API Usage">
            <p>
              API access is Team-plan exclusive and subject to rate limits. API keys are confidential. We may revoke access for abuse.
            </p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              The Extension, its code, design, algorithms, and documentation are the intellectual property of Is This Legit? and Ali Zafar. All rights reserved.
            </p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, we shall not be liable for indirect, incidental, special, consequential, or punitive damages. Total liability shall not exceed the amount paid in the 12 months preceding the claim, or $50, whichever is greater.
            </p>
          </Section>

          <Section title="9. Disclaimer of Warranties">
            <p>
              The Extension is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind.
            </p>
          </Section>

          <Section title="10. Termination">
            <p>
              We may suspend or terminate access at any time for violation. Provisions that should survive termination will remain in effect.
            </p>
          </Section>

          <Section title="11. Modifications">
            <p>
              We may modify these terms at any time. Material changes will be communicated. Continued use constitutes acceptance.
            </p>
          </Section>

          <Section title="12. Governing Law">
            <p>
              These Terms are governed by applicable law. Disputes shall be resolved through binding arbitration or courts of competent jurisdiction.
            </p>
          </Section>

          <Section title="13. Contact">
            <p>
              Questions? Contact us at{' '}
              <a href="mailto:legal@isthislegit.app" className="text-accent hover:underline">
                legal@isthislegit.app
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

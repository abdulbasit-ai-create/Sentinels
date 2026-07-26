import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Is This Legit? — Real-Time Scam & Phishing Detector',
  description:
    'AI-powered Chrome extension that detects scams, phishing, fake reviews, and dark patterns in real-time. Get an instant trust score for every website.',
  keywords: [
    'scam detector',
    'phishing protection',
    'dark pattern detector',
    'fake review detector',
    'chrome extension',
    'website trust score',
    'AI security',
  ],
  authors: [{ name: 'Ali Zafar' }],
  openGraph: {
    title: 'Is This Legit? — Real-Time Scam & Phishing Detector',
    description:
      'AI-powered Chrome extension that detects scams, phishing, fake reviews, and dark patterns. Free.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Is This Legit? — Real-Time Scam & Phishing Detector',
    description:
      'AI-powered Chrome extension that detects scams, phishing, fake reviews, and dark patterns. Free.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased overflow-x-hidden noise">
        <div className="relative min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}

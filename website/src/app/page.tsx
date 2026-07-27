'use client'

import { useState, useCallback } from 'react'
import { scanUrl } from '@/components/dashboard/useApi'
import type { ScanResult } from '@/components/dashboard/useApi'
import ScanCard from '@/components/dashboard/ScanCard'
import ScoreCard from '@/components/dashboard/ScoreCard'
import AISummaryCard from '@/components/dashboard/AISummaryCard'
import ThreatIndicatorsCard from '@/components/dashboard/ThreatIndicatorsCard'
import RecentScansCard from '@/components/dashboard/RecentScansCard'
import HealthCard from '@/components/dashboard/HealthCard'
import { SkeletonSummary, SkeletonThreats } from '@/components/dashboard/Skeletons'
import Link from 'next/link'

export default function Home() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleScanComplete = useCallback((result: ScanResult) => {
    setScanResult(result)
    setScanning(false)
    setRefreshKey(k => k + 1)
  }, [])

  const handleScanStart = useCallback(() => {
    setScanning(true)
  }, [])

  const handleSelectScan = useCallback(async (url: string) => {
    setScanning(true)
    const result = await scanUrl(url)
    setScanResult(result)
    setScanning(false)
    setRefreshKey(k => k + 1)
  }, [])

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full">

        {/* ── Header ──────────────────────────────────── */}
        <div className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded border border-accent/40 flex items-center justify-center bg-accent-muted">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="text-base font-semibold text-white font-mono tracking-tight">
              Sentinels<span className="text-accent">.</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <HealthCard compact />
            <Link href="/dashboard" className="text-xs text-neutral-400 font-mono hover:text-accent transition-colors">
              dashboard<span className="text-accent">/</span>
            </Link>
          </div>
        </div>

        {/* ── Tagline ─────────────────────────────────── */}
        <div className="text-center py-10">
          <h2 className="text-xl sm:text-2xl font-semibold text-white font-mono">
            Real-time AI security scanner
          </h2>
          <p className="text-sm text-neutral-500 font-mono mt-2 max-w-md mx-auto">
            Paste any URL to check for phishing, scams, malware, and dark patterns.
          </p>
        </div>

        {/* ── Scan row (input + score) ────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-4">
          <div className="sm:col-span-3">
            <ScanCard onScanComplete={handleScanComplete} onScanStart={handleScanStart} />
          </div>
          <div className="sm:col-span-2 flex flex-col gap-4">
            <ScoreCard result={scanResult} />
          </div>
        </div>

        {/* ── Analysis results / skeleton ─────────────── */}
        {(scanResult || scanning) && (
          <div key={scanResult?.url ?? 'skeleton'} className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-4">
            <div className="sm:col-span-3 animate-fade-in-up">
              {scanResult ? <AISummaryCard result={scanResult} /> : <SkeletonSummary />}
            </div>
            <div className="sm:col-span-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              {scanResult ? <ThreatIndicatorsCard result={scanResult} /> : <SkeletonThreats />}
            </div>
          </div>
        )}

        {/* ── Recent scans ────────────────────────────── */}
        <div className="mt-2 mb-12">
          <RecentScansCard onSelectScan={handleSelectScan} refreshKey={refreshKey} />
        </div>

      </div>
    </div>
  )
}

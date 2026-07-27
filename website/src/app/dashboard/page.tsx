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
import SystemStatusCard from '@/components/dashboard/SystemStatusCard'
import { SkeletonSummary, SkeletonThreats, SkeletonScore } from '@/components/dashboard/Skeletons'

export default function DashboardPage() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Increment refresh key so history + stats cards refetch
  const handleScanComplete = useCallback((result: ScanResult) => {
    setScanResult(result)
    setScanning(false)
    setRefreshKey(k => k + 1)
  }, [])

  const handleScanStart = useCallback(() => {
    setScanning(true)
  }, [])

  // Clicking a history row re-scans the URL and loads result into dashboard
  const handleSelectScan = useCallback(async (url: string) => {
    setScanning(true)
    const result = await scanUrl(url)
    setScanResult(result)
    setScanning(false)
    setRefreshKey(k => k + 1)
  }, [])

  return (
    <div className="min-h-screen bg-surface-0">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* Header — minimal */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white font-mono">
              Sentinels<span className="text-accent">/</span>dashboard
            </h1>
          </div>
          <HealthCard compact />
        </div>

        {/* Main 2-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          {/* Left column (3/5): scan form + AI + threats */}
          <div className="md:col-span-3 space-y-4">
            <ScanCard onScanComplete={handleScanComplete} onScanStart={handleScanStart} />
            {/* ponytail: key on scanResult.url so animations re-trigger on each new scan */}
            <div key={scanResult?.url ?? 'empty'} className="animate-fade-in-up">
              {scanResult ? <AISummaryCard result={scanResult} /> : scanning ? <SkeletonSummary /> : <AISummaryCard result={null} />}
            </div>
            <div key={scanResult?.url ?? 'empty-threats'} className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              {scanResult ? <ThreatIndicatorsCard result={scanResult} /> : scanning ? <SkeletonThreats /> : <ThreatIndicatorsCard result={null} />}
            </div>
          </div>

          {/* Right column (2/5): score + stats — flex column for equal height */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <div key={scanResult?.url ?? 'empty-score'} className="animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
              {scanResult ? <ScoreCard result={scanResult} /> : scanning ? <SkeletonScore /> : <ScoreCard result={null} />}
            </div>
            <SystemStatusCard refreshKey={refreshKey} />
          </div>

        </div>

        {/* Recent scans — full width */}
        <div className="mt-4">
          <RecentScansCard onSelectScan={handleSelectScan} refreshKey={refreshKey} />
        </div>

      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

// ── Types ─────────────────────────────────────────────────────

export interface ScanDetails {
  aiAnalysis?: string
  aiModel?: string
  aiProvider?: string
  heuristicScore?: number
  heuristicConfidence?: string
  llmScore?: number
  compositeMethod?: string
  isTrustedDomain?: boolean
  signalCount?: number
  [key: string]: unknown
}

export interface ScanResult {
  score: number
  verdict: string
  flags: string[]
  summary: string
  details: ScanDetails
  domainAge: number | null
  domainAgeText: string
  domainCreated: string | null
  registrar: string | null
  registrantOrg: string | null
  isPhishing: boolean
  isMalicious: boolean
  isInUrlhaus: boolean
  hasSSL: boolean
  analysisMs: number
  scanTimestamp: string
  url: string
  [key: string]: unknown
}

// ── Hooks ─────────────────────────────────────────────────────

/**
 * Generic hook to fetch data from the backend API.
 * Returns { data, loading, error } and a refetch() trigger.
 */
export function useApi<T>(endpoint: string, options?: RequestInit) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        // ponytail: 15s timeout per fetch — no request hangs forever
        signal: options?.signal ?? AbortSignal.timeout(15000),
      })
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`)
      }
      const json = (await res.json()) as T
      setState({ data: json, loading: false, error: null })
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState({ data: null, loading: false, error: message })
    }
  // ponytail: options in deps prevents stale closure if a caller ever passes options
  }, [endpoint, options])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { ...state, refetch: fetchData }
}

/**
 * Scan a URL via POST /api/scan/deep.
 * Returns the promise so the caller can manage UI state.
 */
export function scanUrl(url: string, signal?: AbortSignal): Promise<ScanResult> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return Promise.reject(new Error('Invalid URL — must start with http:// or https://'))
  }

  return fetch(`${API_BASE}/api/scan/deep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal,
  }).then(async (res) => {
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || `${res.status} ${res.statusText}`)
    }
    return json as ScanResult
  })
}

// ============================================================
//  Sentinels — backend/modules/history.js
//  In-memory scan history store with stats aggregation.
//  Capped at 200 entries, auto-purge entries older than 24h.
// ============================================================

const MAX_ENTRIES = 200;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

/** @type {Array<{url:string,score:number,verdict:string,summary:string,aiModel:string,aiProvider:string,analysisMs:number,hasSSL:boolean,domainAge:number|null,flags:string[],timestamp:number}>} */
const scans = [];

// ── Periodic cleanup ──────────────────────────────────────────
setInterval(() => {
  const cutoff = Date.now() - TTL_MS;
  const before = scans.length;
  for (let i = scans.length - 1; i >= 0; i--) {
    if (scans[i].timestamp < cutoff) scans.splice(i, 1);
  }
  if (scans.length !== before) {
    console.log(`[History] Purged ${before - scans.length} expired entries, ${scans.length} remaining`);
  }
}, CLEANUP_INTERVAL_MS).unref();

// ── Public API ────────────────────────────────────────────────

/**
 * Save a scan result into history. Extracts relevant fields
 * from the full POST /api/analyze response body.
 * @param {object} result — full analyze response
 */
function saveScan(result) {
  const entry = {
    url:        result.url || '',
    score:      result.score ?? 0,
    verdict:    result.verdict || 'UNKNOWN',
    summary:    (result.summary || '').slice(0, 300),
    aiModel:    result.details?.aiModel || 'unknown',
    aiProvider: result.details?.aiProvider || 'unknown',
    analysisMs: result.analysisMs ?? 0,
    hasSSL:     Boolean(result.hasSSL),
    domainAge:  result.domainAge ?? null,
    flags:      (result.flags || []).slice(0, 20),
    timestamp:  Date.now()
  };

  scans.unshift(entry);

  // Cap at MAX_ENTRIES
  if (scans.length > MAX_ENTRIES) {
    scans.splice(MAX_ENTRIES);
  }
}

/**
 * Return all stored scans (newest first).
 * @param {number} [limit=50]
 * @returns {Array}
 */
function getHistory(limit) {
  const n = typeof limit === 'number' ? Math.min(limit, MAX_ENTRIES) : MAX_ENTRIES;
  return scans.slice(0, n);
}

/**
 * Compute aggregate statistics from stored scans.
 * @returns {object}
 */
function getStats() {
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  const total = scans.length;
  if (total === 0) {
    return {
      totalScans: 0,
      avgScore: 0,
      avgLatencyMs: 0,
      safeCount: 0,
      suspiciousCount: 0,
      scamCount: 0,
      scansToday: 0,
      modelUsage: {},
      lastScanTimestamp: null,
      uptimeHours: process.uptime() ? Math.round(process.uptime() / 3600 * 10) / 10 : 0
    };
  }

  let scoreSum = 0, latencySum = 0;
  let safe = 0, suspicious = 0, scam = 0, todayCount = 0;
  const modelUsage = {};

  for (const s of scans) {
    scoreSum += s.score;
    latencySum += s.analysisMs;
    if (s.verdict === 'SAFE') safe++;
    else if (s.verdict === 'SUSPICIOUS') suspicious++;
    else if (s.verdict === 'SCAM') scam++;
    if (s.timestamp >= todayTs) todayCount++;

    const m = s.aiModel || 'unknown';
    modelUsage[m] = (modelUsage[m] || 0) + 1;
  }

  // Sort model usage by count descending
  const sortedModels = Object.entries(modelUsage)
    .sort((a, b) => b[1] - a[1])
    .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});

  return {
    totalScans: total,
    avgScore:       Math.round(scoreSum / total * 10) / 10,
    avgLatencyMs:   Math.round(latencySum / total),
    safeCount:      safe,
    suspiciousCount: suspicious,
    scamCount:      scam,
    scansToday:     todayCount,
    modelUsage:     sortedModels,
    lastScanTimestamp: scans[0]?.timestamp ?? null,
    uptimeHours:    Math.round(process.uptime() / 3600 * 10) / 10
  };
}

module.exports = { saveScan, getHistory, getStats };

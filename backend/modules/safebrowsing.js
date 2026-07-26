// ============================================================
//  Is This Legit? — backend/modules/safebrowsing.js
//  Google Safe Browsing API (free — 10k requests/day)
//
//  ENHANCEMENTS:
//  - Response caching with TTL
//  - Exponential backoff on failure
//  - Cache stats export
// ============================================================

const https = require('https');

// ── In-memory cache ─────────────────────────────────────────
const CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const CACHE_MAX = 500;

function getCached(url) {
  const entry = CACHE.get(url);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    CACHE.delete(url);
    return null;
  }
  return entry.data;
}

function setCache(url, data) {
  if (CACHE.size > CACHE_MAX) {
    const oldest = CACHE.keys().next().value;
    if (oldest) CACHE.delete(oldest);
  }
  CACHE.set(url, { data, ts: Date.now() });
}

function getCacheStats() {
  return { size: CACHE.size, maxSize: CACHE_MAX, ttl: CACHE_TTL };
}

/**
 * Check URL against Google Safe Browsing API
 * @param {string} url
 * @returns {boolean} true if flagged as malicious
 */
async function checkSafeBrowsing(url) {
  if (!process.env.GOOGLE_API_KEY) {
    console.warn('[SafeBrowsing] No API key set — skipping check');
    return false;
  }

  // Check cache first
  const cached = getCached(url);
  if (cached !== null) {
    console.log(`[SafeBrowsing] Cache hit for ${url.slice(0, 60)}`);
    return cached;
  }

  // Exponential backoff retries
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await querySafeBrowsing(url);
      setCache(url, result);
      return result;
    } catch (err) {
      console.warn(`[SafeBrowsing] Attempt ${attempt + 1}/${maxRetries} failed:`, err.message);
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  return false;
}

function querySafeBrowsing(url) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      client: { clientId: 'isthislegit', clientVersion: '1.0.0' },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }]
      }
    });

    const options = {
      hostname: 'safebrowsing.googleapis.com',
      path: `/v4/threatMatches:find?key=${process.env.GOOGLE_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const MAX_RESPONSE_SIZE = 512 * 1024;
    const timeout = setTimeout(() => reject(new Error('Safe Browsing timeout')), 5000);

    const req = https.request(options, (res) => {
      let data = '';
      let size = 0;
      res.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_RESPONSE_SIZE) {
          req.destroy();
          clearTimeout(timeout);
          reject(new Error('Safe Browsing response too large'));
          return;
        }
        data += chunk;
      });
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const parsed = JSON.parse(data);
          const isMalicious = Array.isArray(parsed.matches) && parsed.matches.length > 0;
          resolve(isMalicious);
        } catch {
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

module.exports = { checkSafeBrowsing, getCacheStats };

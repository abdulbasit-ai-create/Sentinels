// ============================================================
//  Is This Legit? — backend/modules/urlhaus.js
//  Check URLs against URLhaus malware database (free API)
//  https://urlhaus.abuse.ch/
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

function getCached(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  if (CACHE.size > CACHE_MAX) {
    const oldest = CACHE.keys().next().value;
    if (oldest) CACHE.delete(oldest);
  }
  CACHE.set(key, { data, ts: Date.now() });
}

function getCacheStats() {
  return { size: CACHE.size, maxSize: CACHE_MAX, ttl: CACHE_TTL };
}

const DEFAULT_RESULT = { isMalware: false, threat: null, tags: [], reference: null };
const DEFAULT_HOST_RESULT = { found: false };

/**
 * Check if a URL is in the URLhaus malware database
 * @param {string} url
 * @returns {Promise<{isMalware: boolean, threat: string|null, tags: string[], reference: string|null}>}
 */
async function checkUrlhaus(url) {
  if (!process.env.URLHAUS_KEY) {
    console.warn('[URLhaus] No API key set — skipping check');
    return { ...DEFAULT_RESULT };
  }

  // Check cache first
  const cached = getCached(url);
  if (cached !== null) {
    console.log(`[URLhaus] Cache hit for ${url.slice(0, 60)}`);
    return cached;
  }

  // Exponential backoff retries
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await queryUrlhaus(url);
      setCache(url, result);
      return result;
    } catch (err) {
      console.warn(`[URLhaus] Attempt ${attempt + 1}/${maxRetries} failed:`, err.message);
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  return { ...DEFAULT_RESULT };
}

function queryUrlhaus(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('URLhaus timeout')), 8000);
    const encodedUrl = encodeURIComponent(url);

    const options = {
      hostname: 'urlhaus-api.abuse.ch',
      path: `/v1/URLhaus/MD5/${encodedUrl}?auth-key=${process.env.URLHAUS_KEY}`,
      method: 'GET',
      headers: { 'User-Agent': 'IsThisLegit/1.0.0' }
    };

    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const parsed = JSON.parse(data);
          if (parsed.query_status === 'ok' && parsed.url_status === 'malware') {
            resolve({
              isMalware: true,
              threat: parsed.threat || 'malware',
              tags: parsed.tags || [],
              reference: parsed.reference || null,
              dateadded: parsed.dateadded || null,
              url_status: parsed.url_status
            });
          } else {
            resolve({ ...DEFAULT_RESULT, url_status: parsed.url_status || 'not_found' });
          }
        } catch {
          resolve({ ...DEFAULT_RESULT });
        }
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    req.end();
  });
}

/**
 * Alternative: Check using URLhaus hostlist API (simpler, no auth needed for small queries)
 * @param {string} hostname 
 */
async function checkUrlhausHost(hostname) {
  if (!hostname) return { ...DEFAULT_HOST_RESULT };

  // Check cache first
  const cacheKey = `host:${hostname}`;
  const cached = getCached(cacheKey);
  if (cached !== null) {
    console.log(`[URLhaus] Host cache hit for ${hostname}`);
    return cached;
  }

  // Exponential backoff
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await queryUrlhausHost(hostname);
      setCache(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`[URLhaus] Host attempt ${attempt + 1}/${maxRetries} failed:`, err.message);
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  return { ...DEFAULT_HOST_RESULT };
}

function queryUrlhausHost(hostname) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ ...DEFAULT_HOST_RESULT }), 5000);

    const options = {
      hostname: 'urlhaus-api.abuse.ch',
      path: `/v1/host/${encodeURIComponent(hostname)}`,
      method: 'GET',
      headers: { 'User-Agent': 'IsThisLegit/1.0.0' }
    };

    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const parsed = JSON.parse(data);
          if (parsed.query_status === 'ok') {
            resolve({ found: true, url_count: parsed.url_count || 0, urls: parsed.urls || [] });
          } else {
            resolve({ ...DEFAULT_HOST_RESULT });
          }
        } catch {
          resolve({ ...DEFAULT_HOST_RESULT });
        }
      });
    });

    req.on('error', () => {
      clearTimeout(timeout);
      resolve({ ...DEFAULT_HOST_RESULT });
    });

    req.end();
  });
}

module.exports = { checkUrlhaus, checkUrlhausHost, getCacheStats };

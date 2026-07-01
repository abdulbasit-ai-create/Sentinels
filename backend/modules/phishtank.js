// ============================================================
//  Is This Legit? — backend/modules/phishtank.js
//  Check URLs against PhishTank database (free API)
//
//  ENHANCEMENTS:
//  - Response caching with TTL
//  - Exponential backoff on failure
//  - Cache stats export
// ============================================================

const https = require('https');
const querystring = require('querystring');

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
 * Check if a URL is in the PhishTank phishing database
 * @param {string} url
 * @returns {boolean} true if phishing detected
 */
async function checkPhishTank(url) {
  if (!process.env.PHISHTANK_KEY) {
    console.warn('[PhishTank] No API key set — skipping check');
    return false;
  }

  // Check cache first
  const cached = getCached(url);
  if (cached !== null) {
    console.log(`[PhishTank] Cache hit for ${url.slice(0, 60)}`);
    return cached;
  }

  // Exponential backoff retries
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await queryPhishTank(url);
      setCache(url, result);
      return result;
    } catch (err) {
      console.warn(`[PhishTank] Attempt ${attempt + 1}/${maxRetries} failed:`, err.message);
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // Don't cache failures (retry next time)
  return false;
}

function queryPhishTank(url) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      url: url,
      format: 'json',
      app_key: process.env.PHISHTANK_KEY
    });

    const options = {
      hostname: 'checkurl.phishtank.com',
      path: '/checkurl/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'IsThisLegit/1.0.0'
      }
    };

    const MAX_RESPONSE_SIZE = 512 * 1024;
    const timeout = setTimeout(() => reject(new Error('PhishTank timeout')), 6000);

    const req = https.request(options, (res) => {
      let data = '';
      let size = 0;
      res.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_RESPONSE_SIZE) {
          req.destroy();
          clearTimeout(timeout);
          reject(new Error('PhishTank response too large'));
          return;
        }
        data += chunk;
      });
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const parsed = JSON.parse(data);
          const isPhishing = parsed?.results?.in_database === true && parsed?.results?.valid === true;
          resolve(isPhishing);
        } catch {
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

module.exports = { checkPhishTank, getCacheStats };

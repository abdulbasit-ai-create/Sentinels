// ============================================================
//  Is This Legit? — backend/modules/safebrowsing.js
//  Google Safe Browsing API (free — 10k requests/day)
// ============================================================

const https = require('https');

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

  try {
    const result = await querySafeBrowsing(url);
    return result;
  } catch (err) {
    console.warn('[SafeBrowsing] Check failed:', err.message);
    return false;
  }
}

function querySafeBrowsing(url) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      client: {
        clientId: 'isthislegit',
        clientVersion: '1.0.0'
      },
      threatInfo: {
        threatTypes: [
          'MALWARE',
          'SOCIAL_ENGINEERING',
          'UNWANTED_SOFTWARE',
          'POTENTIALLY_HARMFUL_APPLICATION'
        ],
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

    const MAX_RESPONSE_SIZE = 512 * 1024; // 512KB max
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
          // If matches array exists and has items, it's flagged
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

module.exports = { checkSafeBrowsing };

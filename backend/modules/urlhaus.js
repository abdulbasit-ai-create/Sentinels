// ============================================================
//  Is This Legit? — backend/modules/urlhaus.js
//  Check URLs against URLhaus malware database (free API)
//  https://urlhaus.abuse.ch/
// ============================================================

const https = require('https');

/**
 * Check if a URL is in the URLhaus malware database
 * @param {string} url
 * @returns {Promise<{isMalware: boolean, threat: string, tags: string[], reference: string}>}
 */
async function checkUrlhaus(url) {
  if (!process.env.URLHAUS_KEY) {
    console.warn('[URLhaus] No API key set — skipping check');
    return { isMalware: false, threat: null, tags: [], reference: null };
  }

  try {
    const result = await queryUrlhaus(url);
    return result;
  } catch (err) {
    console.warn('[URLhaus] Check failed:', err.message);
    return { isMalware: false, threat: null, tags: [], reference: null };
  }
}

function queryUrlhaus(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('URLhaus timeout')), 8000);

    const getUrl = `https://urlhaus-api.abuse.ch/v1/URLhaus/MD5/${Buffer.from(url).toString('base64').substring(0, 64)}?auth-key=${process.env.URLHAUS_KEY}`;

    const options = {
      hostname: 'urlhaus-api.abuse.ch',
      path: `/v1/URLhaus/MD5/${encodeURIComponent(url)}?auth-key=${process.env.URLHAUS_KEY}`,
      method: 'GET',
      headers: {
        'User-Agent': 'IsThisLegit/1.0.0'
      }
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
            resolve({
              isMalware: false,
              threat: null,
              tags: [],
              reference: null,
              url_status: parsed.url_status || 'not_found'
            });
          }
        } catch {
          resolve({ isMalware: false, threat: null, tags: [], reference: null });
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
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ found: false }), 5000);

    const options = {
      hostname: 'urlhaus-api.abuse.ch',
      path: `/v1/host/${encodeURIComponent(hostname)}`,
      method: 'GET',
      headers: {
        'User-Agent': 'IsThisLegit/1.0.0'
      }
    };

    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const parsed = JSON.parse(data);
          if (parsed.query_status === 'ok') {
            resolve({
              found: true,
              url_count: parsed.url_count || 0,
              urls: parsed.urls || []
            });
          } else {
            resolve({ found: false });
          }
        } catch {
          resolve({ found: false });
        }
      });
    });

    req.on('error', () => {
      clearTimeout(timeout);
      resolve({ found: false });
    });

    req.end();
  });
}

module.exports = { checkUrlhaus, checkUrlhausHost };

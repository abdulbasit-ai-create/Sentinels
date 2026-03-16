// ============================================================
//  Is This Legit? — backend/modules/phishtank.js
//  Check URLs against PhishTank database (free API)
// ============================================================

const https = require('https');
const querystring = require('querystring');

/**
 * Check if a URL is in the PhishTank phishing database
 * @param {string} url
 * @returns {boolean} true if phishing detected
 */
async function checkPhishTank(url) {
  // If no API key configured, skip gracefully
  if (!process.env.PHISHTANK_KEY) {
    console.warn('[PhishTank] No API key set — skipping check');
    return false;
  }

  try {
    const result = await queryPhishTank(url);
    return result;
  } catch (err) {
    console.warn('[PhishTank] Check failed:', err.message);
    return false;
  }
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

    const MAX_RESPONSE_SIZE = 512 * 1024; // 512KB max
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
          // PhishTank returns in_database: true and valid: true if it's a known phishing URL
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

module.exports = { checkPhishTank };

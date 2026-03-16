// ============================================================
//  Is This Legit? — backend/modules/domain.js
//  Domain age + registration lookup
//  Uses RDAP (modern, JSON-based) as primary, WHOIS as fallback.
//  Includes in-memory cache to avoid repeated lookups.
// ============================================================

const whois = require('whois');

// ── In-memory cache (TTL: 1 hour) ───────────────────────────
const CACHE = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCached(hostname) {
  const entry = CACHE.get(hostname);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    CACHE.delete(hostname);
    return null;
  }
  return entry.data;
}

function setCache(hostname, data) {
  // Cap cache size at 500 entries
  if (CACHE.size > 500) {
    const oldest = CACHE.keys().next().value;
    CACHE.delete(oldest);
  }
  CACHE.set(hostname, { data, ts: Date.now() });
}

// ── Known WHOIS creation-date field names ────────────────────
const CREATION_PATTERNS = [
  /Creation Date:\s*(.+)/i,
  /Created Date:\s*(.+)/i,
  /Created On:\s*(.+)/i,
  /Created:\s*(.+)/i,
  /created-date:\s*(.+)/i,
  /Registration Date:\s*(.+)/i,
  /Domain Registration Date:\s*(.+)/i,
  /Registered on:\s*(.+)/i,
  /Registered:\s*(.+)/i,
  /Registration Time:\s*(.+)/i,
  /record created on\s*[.:]?\s*(.+)/i,
  /Domain Name Commencement Date:\s*(.+)/i,
  /Domain Create Date:\s*(.+)/i,
  /Commencement Date:\s*(.+)/i,
  /domain_dateregistered:\s*(.+)/i,
  /created\.+:\s*(.+)/i,
  /\[Created on\]\s*(.+)/i,
  /\[登録年月日\]\s*(.+)/i,
  /Entry created:\s*(.+)/i,
  /Fecha de registro:\s*(.+)/i,
  /Fecha de Creación:\s*(.+)/i,
  /Data de Criação:\s*(.+)/i,
  /Дата регистрации:\s*(.+)/i,
  /paid-till:\s*(.+)/i,
  /create:\s*(\d{4}[-/.]\d{2}[-/.]\d{2})/i,
  /activated:\s*(.+)/i,
  /First registration date:\s*(.+)/i,
  /Anniversary date:\s*(.+)/i,
];

// ── WHOIS registrar patterns ─────────────────────────────────
const REGISTRAR_PATTERNS = [
  /Registrar:\s*(.+)/i,
  /Registrar Name:\s*(.+)/i,
  /Sponsoring Registrar:\s*(.+)/i,
  /registrar:\s*(.+)/i,
];

// ── Date formats that new Date() doesn't handle well ─────────
const CUSTOM_DATE_FORMATS = [
  {
    regex: /^(\d{1,2})[-/](\w{3})[-/](\d{4})/,
    parse: (m) => new Date(`${m[2]} ${m[1]}, ${m[3]}`)
  },
  {
    regex: /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})/,
    parse: (m) => new Date(+m[1], +m[2] - 1, +m[3])
  },
  {
    regex: /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/,
    parse: (m) => new Date(+m[3], +m[2] - 1, +m[1])
  },
  {
    regex: /^(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
    parse: (m) => new Date(`${m[1]} ${m[2]}, ${m[3]}`)
  },
  {
    regex: /^(\d{4})(\d{2})(\d{2})$/,
    parse: (m) => new Date(+m[1], +m[2] - 1, +m[3])
  }
];

/**
 * Check domain age and registrar.
 * Strategy: RDAP first (reliable JSON API), then WHOIS fallback.
 * Results are cached in-memory for 1 hour.
 *
 * @param {string} url
 * @returns {Object} { ageInDays, created, registrar, registrantOrg, nameservers, hostname, expires }
 */
async function checkDomain(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');

    // Check cache first
    const cached = getCached(hostname);
    if (cached) {
      console.log(`[Domain] Cache hit for ${hostname}`);
      return cached;
    }

    // Strategy 1: Try RDAP (modern, structured JSON, more reliable)
    let result = null;
    try {
      result = await rdapLookup(hostname);
      if (result && result.ageInDays !== null) {
        console.log(`[Domain] RDAP success for ${hostname}: ${result.ageInDays} days`);
        setCache(hostname, result);
        return result;
      }
    } catch (err) {
      console.warn(`[Domain] RDAP failed for ${hostname}:`, err.message);
    }

    // Strategy 2: Fallback to WHOIS with retry
    try {
      result = await whoisCheckDomain(hostname);
      if (result && result.ageInDays !== null) {
        console.log(`[Domain] WHOIS success for ${hostname}: ${result.ageInDays} days`);
        setCache(hostname, result);
        return result;
      }
    } catch (err) {
      console.warn(`[Domain] WHOIS failed for ${hostname}:`, err.message);
    }

    // Strategy 3: Try RDAP via alternative bootstrap
    try {
      result = await rdapLookupAlternative(hostname);
      if (result && result.ageInDays !== null) {
        console.log(`[Domain] RDAP alt success for ${hostname}: ${result.ageInDays} days`);
        setCache(hostname, result);
        return result;
      }
    } catch (err) {
      console.warn(`[Domain] RDAP alt failed for ${hostname}:`, err.message);
    }

    // All strategies failed — return partial data if WHOIS gave us something
    const fallback = result || { ageInDays: null, registrar: null, created: null, hostname };
    // Cache even failures briefly to avoid hammering external services
    setCache(hostname, fallback);
    return fallback;

  } catch (err) {
    console.warn('[Domain] Domain check failed:', err.message);
    return { ageInDays: null, registrar: null, created: null };
  }
}

// ═══════════════════════════════════════════════════════════════
//  RDAP Lookup (Primary — structured JSON, no parsing needed)
// ═══════════════════════════════════════════════════════════════

/**
 * Look up domain via RDAP.
 * Uses the IANA RDAP bootstrap to find the right server,
 * then queries for structured registration data.
 */
async function rdapLookup(hostname) {
  // Extract the registrable domain (e.g., "sub.example.com" -> "example.com")
  const domain = extractRegistrableDomain(hostname);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    // RDAP query via rdap.org (bootstrap service that routes to the right registry)
    const url = `https://rdap.org/domain/${domain}`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/rdap+json, application/json' }
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      throw new Error(`RDAP HTTP ${resp.status}`);
    }

    const data = await resp.json();
    return parseRdapResponse(data, hostname);

  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Alternative RDAP lookup using direct registry RDAP servers.
 */
async function rdapLookupAlternative(hostname) {
  const domain = extractRegistrableDomain(hostname);
  const tld = domain.split('.').pop().toLowerCase();

  // Map of TLDs to their RDAP servers
  const rdapServers = {
    'com': 'https://rdap.verisign.com/com/v1/domain/',
    'net': 'https://rdap.verisign.com/net/v1/domain/',
    'org': 'https://rdap.org/domain/',
    'io': 'https://rdap.nic.io/domain/',
    'dev': 'https://rdap.nic.google/domain/',
    'app': 'https://rdap.nic.google/domain/',
    'co': 'https://rdap.nic.co/domain/',
    'me': 'https://rdap.nic.me/domain/',
    'info': 'https://rdap.afilias.net/rdap/info/domain/',
    'xyz': 'https://rdap.nic.xyz/domain/',
  };

  const serverBase = rdapServers[tld];
  if (!serverBase) {
    throw new Error(`No RDAP server known for .${tld}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const url = `${serverBase}${domain}`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/rdap+json, application/json' }
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      throw new Error(`RDAP alt HTTP ${resp.status}`);
    }

    const data = await resp.json();
    return parseRdapResponse(data, hostname);

  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Parse an RDAP JSON response into our standard result format.
 */
function parseRdapResponse(data, hostname) {
  let created = null;
  let expires = null;
  let registrar = null;
  let registrantOrg = null;
  let nameservers = null;

  // Extract events (registration, expiration dates)
  if (Array.isArray(data.events)) {
    for (const event of data.events) {
      if (event.eventAction === 'registration' && event.eventDate) {
        created = event.eventDate;
      }
      if (event.eventAction === 'expiration' && event.eventDate) {
        expires = event.eventDate;
      }
    }
  }

  // Extract registrar from entities
  if (Array.isArray(data.entities)) {
    for (const entity of data.entities) {
      if (Array.isArray(entity.roles)) {
        if (entity.roles.includes('registrar')) {
          // Try vcardArray first, then fall back to handle
          if (entity.vcardArray && Array.isArray(entity.vcardArray[1])) {
            const fnEntry = entity.vcardArray[1].find(v => v[0] === 'fn');
            if (fnEntry) registrar = fnEntry[3];
          }
          if (!registrar && entity.handle) {
            registrar = entity.handle;
          }
          if (!registrar && entity.publicIds) {
            registrar = entity.publicIds[0]?.identifier;
          }
        }
        if (entity.roles.includes('registrant')) {
          if (entity.vcardArray && Array.isArray(entity.vcardArray[1])) {
            const orgEntry = entity.vcardArray[1].find(v => v[0] === 'org');
            const fnEntry = entity.vcardArray[1].find(v => v[0] === 'fn');
            registrantOrg = orgEntry ? orgEntry[3] : (fnEntry ? fnEntry[3] : null);
          }
        }
      }
    }
  }

  // Extract nameservers
  if (Array.isArray(data.nameservers)) {
    nameservers = data.nameservers
      .map(ns => (ns.ldhName || '').toLowerCase())
      .filter(Boolean)
      .slice(0, 4);
  }

  // Calculate age
  let ageInDays = null;
  if (created) {
    const createdDate = new Date(created);
    if (!isNaN(createdDate.getTime()) && createdDate.getFullYear() >= 1985) {
      const now = Date.now();
      if (createdDate.getTime() < now) {
        ageInDays = Math.floor((now - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
  }

  return {
    ageInDays,
    created: created || null,
    expires: expires || null,
    registrar: registrar || null,
    registrantOrg: registrantOrg || null,
    nameservers: nameservers && nameservers.length > 0 ? nameservers : null,
    hostname
  };
}

// ═══════════════════════════════════════════════════════════════
//  WHOIS Lookup (Fallback — text-based, needs regex parsing)
// ═══════════════════════════════════════════════════════════════

async function whoisCheckDomain(hostname) {
  // Try up to 3 times with increasing timeout
  let raw = null;
  const timeouts = [8000, 12000, 18000];

  for (let attempt = 0; attempt < timeouts.length; attempt++) {
    try {
      raw = await whoisLookup(hostname, timeouts[attempt]);
      if (raw && typeof raw === 'string' && raw.length > 50) break;
      raw = null; // Reset if too short
    } catch (err) {
      console.warn(`[Domain] WHOIS attempt ${attempt + 1} failed for ${hostname}:`, err.message);
      if (attempt === timeouts.length - 1) throw err;
      // Brief delay before retry
      await new Promise(r => setTimeout(r, 500));
    }
  }

  if (!raw || raw.length < 30) {
    console.warn(`[Domain] WHOIS returned empty/short response for ${hostname}`);
    return { ageInDays: null, registrar: null, created: null, hostname };
  }

  const ageInDays = extractDomainAge(raw);
  const registrar = extractRegistrar(raw);
  const created = extractCreationDate(raw);
  const registrantOrg = extractRegistrantOrg(raw);
  const nameservers = extractNameservers(raw);
  const expires = extractExpiryDate(raw);

  return { ageInDays, registrar, created, registrantOrg, nameservers, hostname, expires };
}

function whoisLookup(domain, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WHOIS timeout')), timeoutMs);

    whois.lookup(domain, (err, data) => {
      clearTimeout(timeout);
      if (err) return reject(err);
      resolve(data || '');
    });
  });
}

/**
 * Extract domain age in days from raw WHOIS text.
 */
function extractDomainAge(raw) {
  const dateStr = findFirstMatch(raw, CREATION_PATTERNS);
  if (!dateStr) return null;

  const date = parseFlexibleDate(dateStr);
  if (!date) return null;

  const now = Date.now();
  if (date.getTime() > now || date.getFullYear() < 1985) return null;

  const ageMs = now - date.getTime();
  return Math.floor(ageMs / (1000 * 60 * 60 * 24));
}

function extractRegistrar(raw) {
  return findFirstMatch(raw, REGISTRAR_PATTERNS);
}

function extractCreationDate(raw) {
  return findFirstMatch(raw, CREATION_PATTERNS);
}

function extractRegistrantOrg(raw) {
  const patterns = [
    /Registrant Organization:\s*(.+)/i,
    /Registrant Org:\s*(.+)/i,
    /Registrant Name:\s*(.+)/i,
    /org-name:\s*(.+)/i,
    /Registrant:\s*(.+)/i,
  ];
  return findFirstMatch(raw, patterns);
}

function extractNameservers(raw) {
  const matches = raw.match(/Name Server:\s*(.+)/gi);
  if (!matches) return null;
  return matches
    .map(m => m.split(':').slice(1).join(':').trim().split('\n')[0].trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 4);
}

function extractExpiryDate(raw) {
  const patterns = [
    /Registry Expiry Date:\s*(.+)/i,
    /Registrar Registration Expiration Date:\s*(.+)/i,
    /Expiration Date:\s*(.+)/i,
    /Expiry Date:\s*(.+)/i,
    /Expires On:\s*(.+)/i,
    /Expires:\s*(.+)/i,
    /paid-till:\s*(.+)/i,
  ];
  return findFirstMatch(raw, patterns);
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Extract the registrable domain from a hostname.
 * e.g., "sub.example.com" -> "example.com", "foo.co.uk" -> "foo.co.uk"
 */
function extractRegistrableDomain(hostname) {
  const parts = hostname.split('.');
  // Handle common two-part TLDs
  const twoPartTlds = ['co.uk', 'co.jp', 'co.kr', 'co.nz', 'co.za', 'com.au', 'com.br', 'com.cn', 'com.mx', 'com.sg', 'com.tw', 'net.au', 'org.uk', 'org.au', 'ac.uk', 'gov.uk'];
  const lastTwo = parts.slice(-2).join('.');
  if (twoPartTlds.includes(lastTwo) && parts.length > 2) {
    return parts.slice(-3).join('.');
  }
  // Default: last two parts
  if (parts.length > 2) {
    return parts.slice(-2).join('.');
  }
  return hostname;
}

function findFirstMatch(raw, patterns) {
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match && match[1]) {
      const cleaned = match[1]
        .trim()
        .split('\n')[0]
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\.$/, '');
      if (cleaned.length > 0 && cleaned.length < 200) {
        return cleaned;
      }
    }
  }
  return null;
}

function parseFlexibleDate(str) {
  if (!str || typeof str !== 'string') return null;

  const cleaned = str
    .trim()
    .replace(/\s*\(.+\)\s*$/, '')
    .replace(/\s*UTC\s*$/i, '')
    .replace(/\s*GMT\s*$/i, '')
    .replace(/\bBefore\b.*/i, '')
    .trim();

  if (!cleaned || cleaned.length < 6) return null;

  // 1. Try native Date parsing (ISO 8601, RFC 2822, etc.)
  const native = new Date(cleaned);
  if (!isNaN(native.getTime())) return native;

  // 2. Try custom format parsers
  for (const fmt of CUSTOM_DATE_FORMATS) {
    const m = cleaned.match(fmt.regex);
    if (m) {
      try {
        const d = fmt.parse(m);
        if (d && !isNaN(d.getTime())) return d;
      } catch { /* try next format */ }
    }
  }

  // 3. Last resort: extract any date-like substring
  const isoLike = cleaned.match(/(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/);
  if (isoLike) {
    const d = new Date(isoLike[1].replace(/\./g, '-'));
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

module.exports = { checkDomain };

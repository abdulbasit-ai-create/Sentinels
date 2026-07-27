// ============================================================
//  Is This Legit? — backend/modules/domain.js
//  Domain age + registration lookup
//  Uses RDAP (modern, JSON-based) as primary, WHOIS as fallback.
//  Includes in-memory cache to avoid repeated lookups.
//
//  ENHANCEMENTS:
//  - Typosquatting detection (homoglyphs, common brand typos)
//  - Enhanced TLD risk classification
//  - Improved domain entropy calculation with substring scoring
//  - Better subdomain count analysis with configurable thresholds
//  - Brand impersonation via character substitution / look-alike
// ============================================================

// ponytail: native TCP WHOIS lookup replaces the `whois` npm package
// which is ESM-only and breaks CJS require(). Uses raw TCP socket via
// Node's built-in `net` module — zero dependencies.
// Upgrade path: if WHOIS query volume exceeds ~100/day, add a proper
// async WHOIS library that supports CJS or migrate the project to ESM.
const net = require('net');

// ── In-memory cache (TTL: 1 hour) ───────────────────────────
const CACHE = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const CACHE_MAX_SIZE = 500;

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
  if (CACHE.size > CACHE_MAX_SIZE) {
    const oldest = CACHE.keys().next().value;
    if (oldest) CACHE.delete(oldest);
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

// ═══════════════════════════════════════════════════════════════
//  TYPO SQUATTING & BRAND IMPERSONATION DETECTION
// ═══════════════════════════════════════════════════════════════

// Homoglyph / look-alike character maps
const HOMOGLYPH_MAP = {
  '0': ['o', 'O'],
  '1': ['l', 'I', 'i'],
  '2': ['z', 'Z'],
  '3': ['e', 'E'],
  '4': ['a', 'A'],
  '5': ['s', 'S'],
  '6': ['b', 'G'],
  '7': ['t', 'T', 'L'],
  '8': ['b', 'B'],
  '9': ['g', 'q'],
  'a': ['a', 'à', 'á', 'â', 'ã', 'ä', 'å', '4', '@'],
  'b': ['b', '6', '8', '1'],
  'c': ['c', 'ç', '¢', '€', '('],
  'd': ['d', 'cl'],
  'e': ['e', 'è', 'é', 'ê', 'ë', '3', '€'],
  'f': ['f', 'ƒ'],
  'g': ['g', '9', '6', 'q'],
  'h': ['h', '1'],
  'i': ['i', '1', 'l', '!', 'ì', 'í', 'î', 'ï'],
  'j': ['j', 'i'],
  'k': ['k', 'lc'],
  'l': ['l', '1', 'I', 'i', '!', '|'],
  'm': ['m', 'r', 'n'],
  'n': ['n', 'r'],
  'o': ['o', '0', 'O', 'ò', 'ó', 'ô', 'õ', 'ö', 'ø'],
  'p': ['p', '9'],
  'q': ['q', '9', 'g'],
  'r': ['r', 'l'],
  's': ['s', '5', '$', 'z'],
  't': ['t', '7', '+'],
  'u': ['u', 'v', 'ù', 'ú', 'û', 'ü'],
  'v': ['v', 'u'],
  'w': ['w', 'vv'],
  'x': ['x', '×'],
  'y': ['y', 'ý', 'ÿ', '¥'],
  'z': ['z', '2', 's'],
};

// High-value brand targets for typosquatting
const BRAND_TARGETS = [
  { name: 'google', domains: ['google.com', 'google.co.uk'] },
  { name: 'amazon', domains: ['amazon.com', 'amazon.co.uk', 'amazon.de'] },
  { name: 'paypal', domains: ['paypal.com'] },
  { name: 'netflix', domains: ['netflix.com'] },
  { name: 'facebook', domains: ['facebook.com'] },
  { name: 'microsoft', domains: ['microsoft.com'] },
  { name: 'apple', domains: ['apple.com'] },
  { name: 'instagram', domains: ['instagram.com'] },
  { name: 'twitter', domains: ['twitter.com', 'x.com'] },
  { name: 'linkedin', domains: ['linkedin.com'] },
  { name: 'whatsapp', domains: ['whatsapp.com'] },
  { name: 'youtube', domains: ['youtube.com'] },
  { name: 'spotify', domains: ['spotify.com'] },
  { name: 'reddit', domains: ['reddit.com'] },
  { name: 'ebay', domains: ['ebay.com'] },
  { name: 'walmart', domains: ['walmart.com'] },
  { name: 'chase', domains: ['chase.com'] },
  { name: 'wellsfargo', domains: ['wellsfargo.com'] },
  { name: 'bankofamerica', domains: ['bankofamerica.com'] },
  { name: 'dropbox', domains: ['dropbox.com'] },
  { name: 'github', domains: ['github.com'] },
  { name: 'slack', domains: ['slack.com'] },
  { name: 'zoom', domains: ['zoom.us'] },
  { name: 'tiktok', domains: ['tiktok.com'] },
  { name: 'telegram', domains: ['telegram.com'] },
  { name: 'adobe', domains: ['adobe.com'] },
  { name: 'steam', domains: ['steampowered.com'] },
  { name: 'discord', domains: ['discord.com'] },
  { name: 'twitch', domains: ['twitch.tv'] },
];

// Common typos for brand names (for fast matching)
const BRAND_TYPOS = {
  'google': ['g00gle', 'go0gle', 'googel', 'gogle', 'googl', 'goog1e', 'googIe', 'go0gl3', 'g00gl3'],
  'amazon': ['amaz0n', 'amazn', 'amzon', 'amaz0n', 'amazo', 'amaz0', 'amaz0n', 'amozon', 'amazzon', '4mazon', '4maz0n'],
  'paypal': ['paypa1', 'paypaI', 'paypai', 'paypal', 'paypa1', 'p4yp4l', 'p4ypl', 'paypaI'],
  'netflix': ['netfl1x', 'netfli', 'netfIix', 'n3tflix', 'n3tfl1x', 'netflx', 'netf1ix', 'netfliix'],
  'facebook': ['faceb00k', 'facebok', 'faceb0ok', 'f4c3b00k', 'faceb00k', 'faceboook', 'fasebook'],
  'microsoft': ['micr0s0ft', 'm1cr0s0ft', 'microsoft', 'micros0ft', 'micr0soft', 'm1crosoft'],
  'apple': ['app1e', 'aple', 'appIe', '4ppl3', '4pple', 'app1e'],
  'instagram': ['inst4gr4m', 'instagr4m', 'instagrarn', '1nstagram', '1nst4gr4m', 'instagrram'],
  'linkedin': ['1inkedin', '1inked1n', 'linked1n', 'Iinkedin', 'l1nkedin', 'l1nked1n'],
  'chase': ['ch4se', 'chas3', 'chase', 'chaz3', 'ch4s3'],
};

// ── TLD Risk Classification (enhanced) ───────────────────────
const HIGH_RISK_TLDS = new Set([
  'tk', 'ml', 'ga', 'cf', 'gq',       // Freenom free TLDs
  'buzz', 'top', 'xyz', 'club', 'icu', // Cheap bulk TLDs
  'cam', 'monster', 'rest', 'beauty',
  'loan', 'win', 'bid', 'click', 'link',
  'work', 'gdn', 'stream', 'racing',
  'review', 'trade', 'party', 'date', 'download',
  'science', 'cricket', 'accountant', 'faith',
  'help', 'surf', 'vodka', 'date', 'kred', 'yachts',
]);

const MODERATE_RISK_TLDS = new Set([
  'info', 'biz', 'pro', 'pw', 'cc', 'ws',
  'site', 'online', 'store', 'shop', 'live',
  'space', 'fun', 'tech', 'world',
  'cyou', 'uno', 'rip', 'lol', 'guru',
]);

const LOW_RISK_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'mil',
  'co.uk', 'co.jp', 'co.kr', 'co.nz',
  'com.au', 'com.br', 'com.cn',
  'org.uk', 'net.au',
  'ac.uk', 'gov.uk', 'gov.au',
  'eu', 'ch', 'de', 'jp', 'uk', 'fr',
  'ca', 'au', 'nz', 'jp', 'sg', 'hk',
  'io', 'dev', 'app', 'me', 'co',
]);

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Check domain age, registrar, typosquatting, entropy, and TLD risk.
 * Strategy: RDAP first (reliable JSON API), then WHOIS fallback.
 *
 * @param {string} url
 * @returns {Object} { ageInDays, created, registrar, ..., typosquat, entropy, tldDetails, subdomainAnalysis }
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

    // Strategy 1: Try RDAP
    let result = null;
    try {
      result = await rdapLookup(hostname);
      if (result && result.ageInDays !== null) {
        console.log(`[Domain] RDAP success for ${hostname}: ${result.ageInDays} days`);
        const enhanced = enhanceDomainAnalysis(hostname, result);
        setCache(hostname, enhanced);
        return enhanced;
      }
    } catch (err) {
      console.warn(`[Domain] RDAP failed for ${hostname}:`, err.message);
    }

    // Strategy 2: WHOIS with retry
    try {
      result = await whoisCheckDomain(hostname);
      if (result && result.ageInDays !== null) {
        console.log(`[Domain] WHOIS success for ${hostname}: ${result.ageInDays} days`);
        const enhanced = enhanceDomainAnalysis(hostname, result);
        setCache(hostname, enhanced);
        return enhanced;
      }
    } catch (err) {
      console.warn(`[Domain] WHOIS failed for ${hostname}:`, err.message);
    }

    // Strategy 3: RDAP via alternative bootstrap
    try {
      result = await rdapLookupAlternative(hostname);
      if (result && result.ageInDays !== null) {
        console.log(`[Domain] RDAP alt success for ${hostname}: ${result.ageInDays} days`);
        const enhanced = enhanceDomainAnalysis(hostname, result);
        setCache(hostname, enhanced);
        return enhanced;
      }
    } catch (err) {
      console.warn(`[Domain] RDAP alt failed for ${hostname}:`, err.message);
    }

    // All strategies failed — return partial with analysis
    const fallback = result || { ageInDays: null, registrar: null, created: null, hostname };
    const enhanced = enhanceDomainAnalysis(hostname, fallback);
    setCache(hostname, enhanced);
    return enhanced;

  } catch (err) {
    console.warn('[Domain] Domain check failed:', err.message);
    return { ageInDays: null, registrar: null, created: null, hostname: null };
  }
}

// ═══════════════════════════════════════════════════════════════
//  ENHANCED DOMAIN ANALYSIS (typosquatting, entropy, TLD, subdomains)
// ═══════════════════════════════════════════════════════════════

function enhanceDomainAnalysis(hostname, baseData) {
  const domain = extractRegistrableDomain(hostname);
  const tld = hostname.split('.').pop().toLowerCase();
  const parts = hostname.split('.');
  const subdomainParts = parts.slice(0, -2);
  const subdomainCount = subdomainParts.length;

  // ── TLD Risk Classification ─────────────────────────────────
  let tldRisk = 'unknown';
  let tldScore = 50;
  if (HIGH_RISK_TLDS.has(tld)) {
    tldRisk = 'high';
    tldScore = 15;
  } else if (MODERATE_RISK_TLDS.has(tld)) {
    tldRisk = 'moderate';
    tldScore = 45;
  } else if (LOW_RISK_TLDS.has(tld)) {
    tldRisk = 'low';
    tldScore = 90;
  } else {
    // Uncommon TLD — slightly elevated risk
    tldRisk = 'uncommon';
    tldScore = 60;
  }

  // ── Subdomain Analysis ──────────────────────────────────────
  let subdomainRisk = 'low';
  let subdomainScore = 100;
  if (subdomainCount >= 4) {
    subdomainRisk = 'very_high';
    subdomainScore = 10;
  } else if (subdomainCount === 3) {
    subdomainRisk = 'high';
    subdomainScore = 35;
  } else if (subdomainCount === 2) {
    subdomainRisk = 'moderate';
    subdomainScore = 65;
  }

  // ── Domain Entropy (improved) ───────────────────────────────
  const entropy = calculateEntropy(hostname.replace(/\./g, ''));
  // Also calculate substring entropy on the registered domain part
  const domainPart = hostname.replace(/\..+$/, '');
  const domainEntropy = calculateEntropy(domainPart);
  const combinedEntropy = (entropy + domainEntropy) / 2;

  let entropyRisk = 'low';
  let entropyScore = 100;
  if (combinedEntropy > 4.5) {
    entropyRisk = 'very_high';
    entropyScore = 10;
  } else if (combinedEntropy > 4.0) {
    entropyRisk = 'high';
    entropyScore = 30;
  } else if (combinedEntropy > 3.5) {
    entropyRisk = 'moderate';
    entropyScore = 60;
  }

  // ── Typosquatting Detection ─────────────────────────────────
  const typosquatResult = detectTyposquatting(hostname);

  // ── Brand Impersonation via Character Substitution ─────────
  const brandImpersonation = detectBrandImpersonation(hostname);

  // ── Hyphen Analysis ─────────────────────────────────────────
  const hyphenCount = (hostname.match(/-/g) || []).length;
  const digitCount = (hostname.match(/\d/g) || []).length;

  // ── Combined Analysis ───────────────────────────────────────
  return {
    // Original fields
    ageInDays: baseData.ageInDays,
    created: baseData.created || null,
    expires: baseData.expires || null,
    registrar: baseData.registrar || null,
    registrantOrg: baseData.registrantOrg || null,
    nameservers: baseData.nameservers || null,
    hostname,

    // Enhanced fields
    tldAnalysis: {
      tld,
      risk: tldRisk,
      score: tldScore,
    },
    subdomainAnalysis: {
      count: subdomainCount,
      parts: subdomainParts.length > 0 ? subdomainParts : [],
      risk: subdomainRisk,
      score: subdomainScore,
    },
    entropyAnalysis: {
      overall: parseFloat(entropy.toFixed(2)),
      domainPart: parseFloat(domainEntropy.toFixed(2)),
      combined: parseFloat(combinedEntropy.toFixed(2)),
      risk: entropyRisk,
      score: entropyScore,
    },
    typosquatting: {
      isSuspicious: typosquatResult.isSuspicious,
      matchedBrand: typosquatResult.matchedBrand,
      similarity: typosquatResult.similarity,
      detail: typosquatResult.detail,
    },
    brandImpersonation: {
      isSuspicious: brandImpersonation.isSuspicious,
      impersonatedBrand: brandImpersonation.impersonatedBrand,
      method: brandImpersonation.method,
      detail: brandImpersonation.detail,
    },
    hostnameAnalysis: {
      hyphenCount,
      digitCount,
      length: hostname.length,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
//  TYPOSQUATTING DETECTION
// ═══════════════════════════════════════════════════════════════

function detectTyposquatting(hostname) {
  const normalized = hostname.toLowerCase().replace(/^www\./, '');
  const domainPart = extractRegistrableDomain(normalized);
  const domainName = domainPart.split('.')[0]; // e.g. "paypa1" from "paypa1.com"

  // 1. Check known typo list
  for (const [brand, typos] of Object.entries(BRAND_TYPOS)) {
    for (const typo of typos) {
      if (domainName === typo || normalized.includes(typo + '.')) {
        return {
          isSuspicious: true,
          matchedBrand: brand,
          similarity: 0.95,
          detail: `Domain "${domainName}.${normalized.split('.').slice(-2).join('.')}" matches known typo of ${brand}: "${typo}"`,
        };
      }
    }
  }

  // 2. Homoglyph / look-alike detection
  for (const brand of BRAND_TARGETS) {
    const brandName = brand.name;
    // Skip exact match — the real domain is not typosquatting itself
    if (domainName === brandName) continue;
    // Check if after substituting look-alike characters we get a match
    const similarity = homoglyphSimilarity(domainName, brandName);
    if (similarity >= 0.85) {
      return {
        isSuspicious: true,
        matchedBrand: brandName,
        similarity,
        detail: `Domain "${domainName}" has ${Math.round(similarity * 100)}% homoglyph similarity to "${brandName}"`,
      };
    }
  }

  // 3. Detect brand name embedded with extra chars (e.g. "googlexyz", "amazonshop")
  for (const brand of BRAND_TARGETS) {
    const brandName = brand.name;
    // Check if domain starts with brand + has extra stuff but no dot separation
    if (domainName.startsWith(brandName) && domainName.length > brandName.length + 1) {
      return {
        isSuspicious: true,
        matchedBrand: brandName,
        similarity: 0.80,
        detail: `Domain "${domainName}" starts with "${brandName}" followed by extra characters`,
      };
    }
  }

  return { isSuspicious: false, matchedBrand: null, similarity: 0, detail: 'No typosquatting detected' };
}

/**
 * Calculate similarity between two strings considering homoglyph substitutions.
 * Returns a score 0.0 - 1.0.
 */
function homoglyphSimilarity(a, b) {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 1.0;

  // Levenshtein distance with homoglyph penalty
  const lenA = aLower.length;
  const lenB = bLower.length;
  const maxLen = Math.max(lenA, lenB);
  if (maxLen === 0) return 1.0;

  // Simple character-by-character homoglyph check
  let matches = 0;
  const minLen = Math.min(lenA, lenB);
  for (let i = 0; i < minLen; i++) {
    const ca = aLower[i];
    const cb = bLower[i];
    if (ca === cb) {
      matches++;
    } else {
      // Check if characters are homoglyphs of each other
      if (isHomoglyphPair(ca, cb)) {
        matches += 0.8; // Partial credit for homoglyph match
      }
    }
  }

  // Handle extra characters
  if (lenA !== lenB) {
    const diff = Math.abs(lenA - lenB);
    matches -= diff * 0.3;
  }

  return Math.max(0, matches / maxLen);
}

function isHomoglyphPair(c1, c2) {
  if (c1 === c2) return true;
  for (const [key, variants] of Object.entries(HOMOGLYPH_MAP)) {
    if ((key === c1 && variants.includes(c2)) || (key === c2 && variants.includes(c1))) {
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
//  BRAND IMPERSONATION DETECTION
// ═══════════════════════════════════════════════════════════════

function detectBrandImpersonation(hostname) {
  const normalized = hostname.toLowerCase().replace(/^www\./, '');
  const parts = normalized.split('.');
  const rootDomain = parts.slice(-2).join('.');
  const rootName = parts.slice(-2, -1)[0] || parts[0];

  for (const brand of BRAND_TARGETS) {
    const brandName = brand.name;
    const brandDomains = brand.domains;

    // Check if brand appears in subdomain but root domain isn't the brand's legitimate domain
    // e.g. "paypal.evil.com" → rootDomain "evil.com" doesn't match any paypal domain → flagged
    // e.g. "github.com" → rootDomain "github.com" matches brand domain "github.com" → NOT flagged
    const isLegitimate = brandDomains.some(bd => rootDomain === bd);
    if (normalized.includes(brandName) && !isLegitimate) {
      return {
        isSuspicious: true,
        impersonatedBrand: brandName,
        method: 'subdomain_impersonation',
        detail: `"${brandName}" appears in hostname but root domain "${rootDomain}" is not a legitimate ${brandName} domain`,
      };
    }

    // Check character substitution (e.g. "g00gle" for "google")
    const substitutionResult = checkCharacterSubstitution(rootName, brandName);
    if (substitutionResult.isMatch) {
      return {
        isSuspicious: true,
        impersonatedBrand: brandName,
        method: 'character_substitution',
        detail: `Root domain "${rootName}" visually mimics "${brandName}" (${substitutionResult.description})`,
      };
    }
  }

  return { isSuspicious: false, impersonatedBrand: null, method: null, detail: 'No brand impersonation detected' };
}

function checkCharacterSubstitution(domain, brand) {
  if (domain.toLowerCase() === brand.toLowerCase()) return { isMatch: false };

  // Check if domain can be transformed into brand by substituting
  // numbers/digits for look-alike letters (leetspeak)
  const substitutions = [
    { from: '0', to: 'o' }, { from: '1', to: 'l' }, { from: '2', to: 'z' },
    { from: '3', to: 'e' }, { from: '4', to: 'a' }, { from: '5', to: 's' },
    { from: '6', to: 'g' }, { from: '7', to: 't' }, { from: '8', to: 'b' },
    { from: '9', to: 'g' },
  ];

  let substituted = domain.toLowerCase();
  const changes = [];
  for (const sub of substitutions) {
    if (substituted.includes(sub.from)) {
      const replaced = substituted.replace(new RegExp('\\' + sub.from, 'g'), sub.to);
      if (replaced !== substituted) {
        changes.push(`${sub.from}→${sub.to}`);
        substituted = replaced;
      }
    }
  }

  if (substituted === brand.toLowerCase()) {
    return { isMatch: true, description: `leet-speak substitution: ${changes.join(', ')}` };
  }

  // Check for double letters or missing letters
  const levenDist = levenshteinDistance(domain.toLowerCase(), brand.toLowerCase());
  if (levenDist <= 1 && Math.abs(domain.length - brand.length) <= 1) {
    return { isMatch: true, description: `edit distance ${levenDist} from "${brand}"` };
  }

  return { isMatch: false };
}

function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
    }
  }
  return dp[m][n];
}

// ═══════════════════════════════════════════════════════════════
//  RDAP Lookup
// ═══════════════════════════════════════════════════════════════

async function rdapLookup(hostname) {
  const domain = extractRegistrableDomain(hostname);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const url = `https://rdap.org/domain/${domain}`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/rdap+json, application/json' }
    });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`RDAP HTTP ${resp.status}`);
    const data = await resp.json();
    return parseRdapResponse(data, hostname);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function rdapLookupAlternative(hostname) {
  const domain = extractRegistrableDomain(hostname);
  const tld = domain.split('.').pop().toLowerCase();
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
  if (!serverBase) throw new Error(`No RDAP server known for .${tld}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const url = `${serverBase}${domain}`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/rdap+json, application/json' }
    });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`RDAP alt HTTP ${resp.status}`);
    const data = await resp.json();
    return parseRdapResponse(data, hostname);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function parseRdapResponse(data, hostname) {
  let created = null;
  let expires = null;
  let registrar = null;
  let registrantOrg = null;
  let nameservers = null;

  if (Array.isArray(data.events)) {
    for (const event of data.events) {
      if (event.eventAction === 'registration' && event.eventDate) created = event.eventDate;
      if (event.eventAction === 'expiration' && event.eventDate) expires = event.eventDate;
    }
  }

  if (Array.isArray(data.entities)) {
    for (const entity of data.entities) {
      if (Array.isArray(entity.roles)) {
        if (entity.roles.includes('registrar')) {
          if (entity.vcardArray && Array.isArray(entity.vcardArray[1])) {
            const fnEntry = entity.vcardArray[1].find(v => v[0] === 'fn');
            if (fnEntry) registrar = fnEntry[3];
          }
          if (!registrar && entity.handle) registrar = entity.handle;
          if (!registrar && entity.publicIds) registrar = entity.publicIds[0]?.identifier;
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

  if (Array.isArray(data.nameservers)) {
    nameservers = data.nameservers
      .map(ns => (ns.ldhName || '').toLowerCase())
      .filter(Boolean)
      .slice(0, 4);
  }

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

  return { ageInDays, created: created || null, expires: expires || null, registrar: registrar || null, registrantOrg: registrantOrg || null, nameservers: nameservers?.length > 0 ? nameservers : null, hostname };
}

// ═══════════════════════════════════════════════════════════════
//  WHOIS Lookup
// ═══════════════════════════════════════════════════════════════

async function whoisCheckDomain(hostname) {
  let raw = null;
  const timeouts = [8000, 12000, 18000];

  for (let attempt = 0; attempt < timeouts.length; attempt++) {
    try {
      raw = await whoisLookup(hostname, timeouts[attempt]);
      if (raw && typeof raw === 'string' && raw.length > 50) break;
      raw = null;
    } catch (err) {
      console.warn(`[Domain] WHOIS attempt ${attempt + 1} failed for ${hostname}:`, err.message);
      if (attempt === timeouts.length - 1) throw err;
      await new Promise(r => setTimeout(r, 500));
    }
  }

  if (!raw || raw.length < 30) {
    return { ageInDays: null, registrar: null, created: null, hostname };
  }

  return {
    ageInDays: extractDomainAge(raw),
    registrar: extractRegistrar(raw),
    created: extractCreationDate(raw),
    registrantOrg: extractRegistrantOrg(raw),
    nameservers: extractNameservers(raw),
    expires: extractExpiryDate(raw),
    hostname
  };
}

// ponytail: native TCP WHOIS query. Queries whois.iana.org first to
// find the authoritative WHOIS server for the TLD, then queries that.
// Ceiling: sequential two-hop lookup (~2-8s). For bulk WHOIS, batch
// through a single server or cache referral results per-TLD.
function whoisLookup(domain, timeoutMs = 8000) {
  return whoisQueryRaw(domain, 'whois.iana.org', 43, timeoutMs / 2)
    .then(ianaResp => {
      const refMatch = ianaResp.match(/refer:\s*(\S+)/i);
      const whoisServer = refMatch ? refMatch[1] : 'whois.verisign-grs.com';
      return whoisQueryRaw(domain, whoisServer, 43, timeoutMs / 2);
    });
}

function whoisQueryRaw(query, host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let buffer = '';
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`WHOIS timeout (${host})`));
    }, timeoutMs);

    socket.connect(port, host, () => socket.write(query + '\r\n'));
    socket.on('data', data => { buffer += data.toString('utf-8'); });
    socket.on('end', () => { clearTimeout(timer); resolve(buffer); });
    socket.on('error', err => { clearTimeout(timer); reject(err); });
  });
}

function extractDomainAge(raw) {
  const dateStr = findFirstMatch(raw, CREATION_PATTERNS);
  if (!dateStr) return null;
  const date = parseFlexibleDate(dateStr);
  if (!date) return null;
  const now = Date.now();
  if (date.getTime() > now || date.getFullYear() < 1985) return null;
  return Math.floor((now - date.getTime()) / (1000 * 60 * 60 * 24));
}

function extractRegistrar(raw) { return findFirstMatch(raw, REGISTRAR_PATTERNS); }
function extractCreationDate(raw) { return findFirstMatch(raw, CREATION_PATTERNS); }

function extractRegistrantOrg(raw) {
  const patterns = [
    /Registrant Organization:\s*(.+)/i, /Registrant Org:\s*(.+)/i,
    /Registrant Name:\s*(.+)/i, /org-name:\s*(.+)/i, /Registrant:\s*(.+)/i,
  ];
  return findFirstMatch(raw, patterns);
}

function extractNameservers(raw) {
  const matches = raw.match(/Name Server:\s*(.+)/gi);
  if (!matches) return null;
  return matches.map(m => m.split(':').slice(1).join(':').trim().split('\n')[0].trim().toLowerCase()).filter(Boolean).slice(0, 4);
}

function extractExpiryDate(raw) {
  const patterns = [
    /Registry Expiry Date:\s*(.+)/i, /Registrar Registration Expiration Date:\s*(.+)/i,
    /Expiration Date:\s*(.+)/i, /Expiry Date:\s*(.+)/i, /Expires On:\s*(.+)/i,
    /Expires:\s*(.+)/i, /paid-till:\s*(.+)/i,
  ];
  return findFirstMatch(raw, patterns);
}

// ── Helpers ──────────────────────────────────────────────────

function extractRegistrableDomain(hostname) {
  const parts = hostname.split('.');
  const twoPartTlds = ['co.uk', 'co.jp', 'co.kr', 'co.nz', 'co.za', 'com.au', 'com.br', 'com.cn', 'com.mx', 'com.sg', 'com.tw', 'net.au', 'org.uk', 'org.au', 'ac.uk', 'gov.uk'];
  const lastTwo = parts.slice(-2).join('.');
  if (twoPartTlds.includes(lastTwo) && parts.length > 2) return parts.slice(-3).join('.');
  if (parts.length > 2) return parts.slice(-2).join('.');
  return hostname;
}

function findFirstMatch(raw, patterns) {
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match && match[1]) {
      const cleaned = match[1].trim().split('\n')[0].trim().replace(/\s+/g, ' ').replace(/\.$/, '');
      if (cleaned.length > 0 && cleaned.length < 200) return cleaned;
    }
  }
  return null;
}

function parseFlexibleDate(str) {
  if (!str || typeof str !== 'string') return null;
  const cleaned = str.trim().replace(/\s*\(.+\)\s*$/, '').replace(/\s*UTC\s*$/i, '').replace(/\s*GMT\s*$/i, '').replace(/\bBefore\b.*/i, '').trim();
  if (!cleaned || cleaned.length < 6) return null;
  const native = new Date(cleaned);
  if (!isNaN(native.getTime())) return native;
  for (const fmt of CUSTOM_DATE_FORMATS) {
    const m = cleaned.match(fmt.regex);
    if (m) { try { const d = fmt.parse(m); if (d && !isNaN(d.getTime())) return d; } catch { /* try next */ } }
  }
  const isoLike = cleaned.match(/(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/);
  if (isoLike) { const d = new Date(isoLike[1].replace(/\./g, '-')); if (!isNaN(d.getTime())) return d; }
  return null;
}

/**
 * Shannon Entropy Calculator (improved)
 * Higher entropy = more random-looking = more suspicious
 */
function calculateEntropy(str) {
  if (!str || str.length === 0) return 0;
  const freq = {};
  for (const c of str) freq[c] = (freq[c] || 0) + 1;
  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

module.exports = {
  checkDomain,
  extractRegistrableDomain,
  detectTyposquatting,
  detectBrandImpersonation,
  calculateEntropy,
  HIGH_RISK_TLDS,
  MODERATE_RISK_TLDS,
  LOW_RISK_TLDS,
};

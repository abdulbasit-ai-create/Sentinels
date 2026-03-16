// ============================================================
//  Is This Legit? — backend/modules/heuristics.js
//  Deterministic multi-signal scoring engine
//  Provides reliable scoring independent of LLM
// ============================================================

// ── Known-Good Domains (false-positive prevention) ───────────
const TRUSTED_DOMAINS = new Set([
  // Search / portals
  'google.com', 'google.co.uk', 'google.co.in', 'google.ca', 'google.com.au',
  'bing.com', 'duckduckgo.com', 'yahoo.com', 'baidu.com', 'yandex.ru',
  // Social media
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com',
  'reddit.com', 'pinterest.com', 'tiktok.com', 'snapchat.com', 'tumblr.com',
  'discord.com', 'twitch.tv', 'threads.net', 'mastodon.social',
  // E-commerce
  'amazon.com', 'amazon.co.uk', 'amazon.ca', 'amazon.de', 'amazon.in',
  'ebay.com', 'walmart.com', 'target.com', 'bestbuy.com', 'costco.com',
  'etsy.com', 'shopify.com', 'aliexpress.com', 'wayfair.com', 'homedepot.com',
  // Tech
  'apple.com', 'microsoft.com', 'github.com', 'gitlab.com', 'stackoverflow.com',
  'mozilla.org', 'chromium.org', 'npmjs.com', 'pypi.org', 'docker.com',
  'aws.amazon.com', 'azure.microsoft.com', 'cloud.google.com',
  // Payments / finance
  'paypal.com', 'stripe.com', 'chase.com', 'bankofamerica.com', 'wellsfargo.com',
  'visa.com', 'mastercard.com', 'americanexpress.com', 'wise.com', 'revolut.com',
  // Streaming / media
  'youtube.com', 'netflix.com', 'spotify.com', 'hulu.com', 'disneyplus.com',
  'twitch.tv', 'soundcloud.com', 'vimeo.com',
  // News
  'bbc.com', 'bbc.co.uk', 'cnn.com', 'nytimes.com', 'reuters.com',
  'theguardian.com', 'washingtonpost.com', 'apnews.com', 'npr.org',
  // Education
  'wikipedia.org', 'khanacademy.org', 'coursera.org', 'edx.org', 'udemy.com',
  // Productivity
  'notion.so', 'slack.com', 'zoom.us', 'dropbox.com', 'drive.google.com',
  'docs.google.com', 'office.com', 'outlook.com', 'proton.me', 'protonmail.com',
  // Other
  'cloudflare.com', 'vercel.com', 'netlify.com', 'heroku.com',
  'archive.org', 'craigslist.org', 'yelp.com', 'tripadvisor.com',
]);

// TLDs that are disproportionately used by scam/phishing sites
const HIGH_RISK_TLDS = new Set([
  'tk', 'ml', 'ga', 'cf', 'gq',       // Freenom free TLDs
  'buzz', 'top', 'xyz', 'club', 'icu', // Cheap bulk TLDs
  'cam', 'monster', 'rest', 'beauty',
  'loan', 'win', 'bid', 'click', 'link',
  'work', 'gdn', 'stream', 'racing',
  'review', 'trade', 'party', 'date', 'download',
  'science', 'cricket', 'accountant', 'faith',
]);

const MODERATE_RISK_TLDS = new Set([
  'info', 'biz', 'pro', 'pw', 'cc', 'ws',
  'site', 'online', 'store', 'shop', 'live',
  'space', 'fun', 'tech', 'world',
]);

// Registrars known for lax abuse policies or high scam volume
const SUSPICIOUS_REGISTRARS = [
  'namecheap', 'namesilo', 'porkbun', 'nicenic',
  'alibaba', 'west263', 'jiangsu', 'chengdu',
  'enom', 'epik', 'regtons',
];

// ── Core Heuristic Engine ────────────────────────────────────

function computeHeuristicScore(data) {
  const signals = [];
  let totalWeight = 0;
  let weightedScore = 0;

  // ─── 1. Trusted Domain Check (short-circuit false positives) ───
  const domainClean = extractRootDomain(data.url);
  const isTrusted = isTrustedDomain(domainClean);

  if (isTrusted) {
    signals.push({
      name: 'trusted_domain',
      score: 95,
      weight: 40,
      detail: `${domainClean} is a well-known trusted domain`
    });
    // Still check for phishing/malware even on trusted domains
    if (data.isPhishing || data.isMalicious) {
      signals.push({
        name: 'phishing_override',
        score: 5,
        weight: 50,
        detail: 'Domain flagged in threat databases despite being trusted - possible compromise'
      });
    }
  }

  // ─── 2. Phishing / Malware Database ───────────────────────────
  if (data.isPhishing || data.isMalicious) {
    signals.push({
      name: 'threat_database',
      score: 0,
      weight: 35,
      detail: data.isPhishing && data.isMalicious
        ? 'Flagged in both phishing and malware databases'
        : data.isPhishing
          ? 'Found in PhishTank phishing database'
          : 'Flagged by Google Safe Browsing'
    });
  } else {
    signals.push({
      name: 'threat_database',
      score: 100,
      weight: 10,
      detail: 'Not found in any threat databases'
    });
  }

  // ─── 3. Domain Age ────────────────────────────────────────────
  const age = data.domainAge;
  if (age !== null && age !== undefined) {
    let ageScore, ageDetail;
    if (age < 7) {
      ageScore = 5;
      ageDetail = `Domain is only ${age} days old - extremely new`;
    } else if (age < 14) {
      ageScore = 12;
      ageDetail = `Domain is only ${age} days old - very new`;
    } else if (age < 30) {
      ageScore = 25;
      ageDetail = `Domain is ${age} days old - recently registered`;
    } else if (age < 90) {
      ageScore = 45;
      ageDetail = `Domain is ${age} days old - fairly new`;
    } else if (age < 180) {
      ageScore = 65;
      ageDetail = `Domain is ${age} days old`;
    } else if (age < 365) {
      ageScore = 80;
      ageDetail = `Domain is ${age} days old - established`;
    } else if (age < 730) {
      ageScore = 90;
      ageDetail = `Domain is ${Math.floor(age / 365)}+ years old`;
    } else {
      ageScore = 100;
      ageDetail = `Domain is ${Math.floor(age / 365)}+ years old - well established`;
    }
    signals.push({ name: 'domain_age', score: ageScore, weight: 15, detail: ageDetail });
  }

  // ─── 4. SSL/TLS ──────────────────────────────────────────────
  signals.push({
    name: 'ssl',
    score: data.hasSSL ? 100 : 10,
    weight: data.hasSSL ? 5 : 12,
    detail: data.hasSSL ? 'HTTPS with SSL certificate' : 'No SSL certificate - connection insecure'
  });

  // ─── 5. URL Analysis ─────────────────────────────────────────
  const urlScore = analyzeUrl(data.url, data.urlSignals);
  signals.push({ name: 'url_analysis', score: urlScore.score, weight: 10, detail: urlScore.detail });

  // ─── 6. TLD Risk ─────────────────────────────────────────────
  const tld = (data.urlSignals?.tld || '').toLowerCase();
  if (HIGH_RISK_TLDS.has(tld)) {
    signals.push({ name: 'tld_risk', score: 15, weight: 8, detail: `High-risk TLD: .${tld}` });
  } else if (MODERATE_RISK_TLDS.has(tld)) {
    signals.push({ name: 'tld_risk', score: 50, weight: 5, detail: `Moderate-risk TLD: .${tld}` });
  } else {
    signals.push({ name: 'tld_risk', score: 90, weight: 2, detail: `Standard TLD: .${tld}` });
  }

  // ─── 7. Registrar Analysis ───────────────────────────────────
  if (data.registrar) {
    const registrarLower = data.registrar.toLowerCase();
    const isSuspicious = SUSPICIOUS_REGISTRARS.some(r => registrarLower.includes(r));
    if (isSuspicious) {
      signals.push({ name: 'registrar', score: 40, weight: 3, detail: `Registrar (${data.registrar}) has higher scam association` });
    }
  }

  // ─── 8. WHOIS Privacy ────────────────────────────────────────
  if (data.registrantOrg) {
    const orgLower = data.registrantOrg.toLowerCase();
    const isPrivate = ['privacy', 'private', 'redacted', 'withheld', 'data protected', 'whoisguard', 'domains by proxy'].some(k => orgLower.includes(k));
    if (isPrivate) {
      // Privacy protection alone is NOT a strong negative signal - many legitimate sites use it
      // Only penalize slightly, and only if other signals are also negative
      signals.push({ name: 'whois_privacy', score: 60, weight: 3, detail: 'WHOIS registrant info is privacy-protected' });
    }
  }

  // ─── 9. Dark Patterns ────────────────────────────────────────
  const dpCount = data.darkPatterns?.length || 0;
  if (dpCount > 0) {
    let dpScore;
    if (dpCount >= 5) dpScore = 10;
    else if (dpCount >= 3) dpScore = 25;
    else if (dpCount >= 2) dpScore = 45;
    else dpScore = 65;
    signals.push({ name: 'dark_patterns', score: dpScore, weight: 10, detail: `${dpCount} dark pattern(s) detected` });
  } else {
    signals.push({ name: 'dark_patterns', score: 95, weight: 3, detail: 'No dark patterns detected' });
  }

  // ─── 10. Contact Information ──────────────────────────────────
  const hasEmail = data.contactInfo?.emails?.length > 0;
  const hasPhone = data.contactInfo?.phones?.length > 0;
  const hasAddress = data.contactInfo?.addresses;
  const contactCount = [hasEmail, hasPhone, hasAddress].filter(Boolean).length;

  if (contactCount >= 2) {
    signals.push({ name: 'contact_info', score: 90, weight: 5, detail: 'Multiple contact methods available' });
  } else if (contactCount === 1) {
    signals.push({ name: 'contact_info', score: 65, weight: 4, detail: 'Limited contact information' });
  } else {
    // No contact info - but not a strong signal for non-commercial pages
    const isCommercial = data.pageStats?.hasCheckout || data.pageStats?.hasCart || (data.prices?.length > 0);
    if (isCommercial) {
      signals.push({ name: 'contact_info', score: 20, weight: 8, detail: 'No contact info on a commercial page' });
    } else {
      signals.push({ name: 'contact_info', score: 55, weight: 3, detail: 'No visible contact information' });
    }
  }

  // ─── 11. Social Media Presence ────────────────────────────────
  const socialCount = data.socialLinks?.length || 0;
  if (socialCount >= 3) {
    signals.push({ name: 'social_presence', score: 85, weight: 3, detail: `${socialCount} social media links found` });
  } else if (socialCount > 0) {
    signals.push({ name: 'social_presence', score: 70, weight: 2, detail: `${socialCount} social media link(s) found` });
  }
  // Don't penalize absence of social links

  // ─── 12. Page Structure Analysis ──────────────────────────────
  const structureScore = analyzePageStructure(data.pageStats);
  if (structureScore.score < 80) {
    signals.push({ name: 'page_structure', score: structureScore.score, weight: 5, detail: structureScore.detail });
  }

  // ─── 13. Form Security ───────────────────────────────────────
  const formScore = analyzeFormFields(data.formFields, data.hasSSL);
  if (formScore.weight > 0) {
    signals.push(formScore);
  }

  // ─── 14. Content Quality ─────────────────────────────────────
  const contentScore = analyzeContentQuality(data.bodyText, data.pageStats);
  if (contentScore.weight > 0) {
    signals.push(contentScore);
  }

  // ─── 15. Pricing Analysis ────────────────────────────────────
  const pricingScore = analyzePricing(data.prices);
  if (pricingScore.weight > 0) {
    signals.push(pricingScore);
  }

  // ─── Compute weighted average ─────────────────────────────────
  for (const signal of signals) {
    totalWeight += signal.weight;
    weightedScore += signal.score * signal.weight;
  }

  const finalScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;

  return {
    score: clamp(finalScore, 0, 100),
    signals,
    isTrusted,
    confidence: calculateConfidence(signals, data)
  };
}

// ── URL Analysis ─────────────────────────────────────────────

function analyzeUrl(url, urlSignals) {
  const problems = [];
  let score = 100;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // Entropy check - random-looking hostnames
    const entropy = calculateEntropy(host.replace(/\./g, ''));
    if (entropy > 4.2) {
      score -= 25;
      problems.push('random-looking hostname');
    }

    // Excessive subdomains
    const subdomains = urlSignals?.subdomainCount || (host.split('.').length - 2);
    if (subdomains >= 4) {
      score -= 30;
      problems.push(`${subdomains} subdomains`);
    } else if (subdomains >= 3) {
      score -= 15;
      problems.push('many subdomains');
    }

    // Excessive hyphens in hostname
    const hyphens = urlSignals?.hyphenCount || (host.match(/-/g) || []).length;
    if (hyphens >= 4) {
      score -= 25;
      problems.push('excessive hyphens');
    } else if (hyphens >= 2) {
      score -= 10;
      problems.push('multiple hyphens');
    }

    // Digits in hostname
    const digits = urlSignals?.digitCount || (host.match(/\d/g) || []).length;
    if (digits >= 6) {
      score -= 20;
      problems.push('many digits in hostname');
    }

    // URL length
    if (url.length > 200) {
      score -= 15;
      problems.push('very long URL');
    } else if (url.length > 120) {
      score -= 5;
    }

    // Phishy tokens in path
    const phishyTokens = ['login', 'verify', 'update', 'secure', 'account', 'billing', 'password', 'confirm', 'suspend', 'unlock', 'validate', 'authenticate'];
    const pathLower = (parsed.pathname + parsed.search).toLowerCase();
    const matchedTokens = phishyTokens.filter(t => pathLower.includes(t));
    if (matchedTokens.length >= 2) {
      score -= 25;
      problems.push(`suspicious path tokens: ${matchedTokens.join(', ')}`);
    } else if (matchedTokens.length === 1) {
      score -= 8;
      // Single tokens like 'login' or 'account' are normal
    }

    // IP address as hostname
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
      score -= 35;
      problems.push('IP address used as hostname');
    }

    // @ symbol in URL (common phishing technique)
    if (url.includes('@')) {
      score -= 30;
      problems.push('@ symbol in URL (deceptive redirect)');
    }

    // Double slashes in path (not at protocol)
    if (parsed.pathname.includes('//')) {
      score -= 10;
      problems.push('double slashes in path');
    }

    // Homograph detection - mixed scripts
    if (/[^\x00-\x7F]/.test(host)) {
      score -= 25;
      problems.push('non-ASCII characters in hostname (possible homograph attack)');
    }

    // Brand impersonation in subdomain
    const trustedBrands = ['google', 'apple', 'microsoft', 'amazon', 'facebook', 'netflix', 'paypal', 'ebay', 'instagram', 'twitter', 'linkedin', 'bank', 'chase', 'wellsfargo'];
    const parts = host.split('.');
    const rootDomain = parts.slice(-2).join('.');
    for (const brand of trustedBrands) {
      if (host.includes(brand) && !rootDomain.startsWith(brand)) {
        score -= 30;
        problems.push(`"${brand}" in subdomain but not root domain (impersonation risk)`);
        break;
      }
    }

  } catch {
    score = 50;
    problems.push('URL parsing error');
  }

  return {
    score: Math.max(0, score),
    detail: problems.length > 0 ? `URL issues: ${problems.join('; ')}` : 'URL looks clean'
  };
}

// ── Shannon Entropy Calculator ───────────────────────────────

function calculateEntropy(str) {
  if (!str || str.length === 0) return 0;
  const freq = {};
  for (const c of str) {
    freq[c] = (freq[c] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// ── Page Structure Analysis ──────────────────────────────────

function analyzePageStructure(stats) {
  if (!stats) return { score: 70, detail: 'No page stats available' };

  const problems = [];
  let score = 90;

  // Excessive iframes (ad injection, clickjacking)
  if (stats.iframes > 10) {
    score -= 25;
    problems.push(`${stats.iframes} iframes`);
  } else if (stats.iframes > 5) {
    score -= 10;
    problems.push('many iframes');
  }

  // Very high external link ratio
  if (stats.totalLinks > 0 && stats.externalLinks > 0) {
    const externalRatio = stats.externalLinks / stats.totalLinks;
    if (externalRatio > 0.8 && stats.totalLinks > 10) {
      score -= 15;
      problems.push('mostly external links');
    }
  }

  // Excessive scripts
  if (stats.scripts > 50) {
    score -= 10;
    problems.push(`${stats.scripts} scripts loaded`);
  }

  // Very little text content
  if (stats.textLength < 200 && stats.forms > 0) {
    score -= 20;
    problems.push('minimal text content with forms present');
  }

  // Many inputs with few forms (data harvesting)
  if (stats.inputs > 10 && stats.forms <= 1) {
    score -= 10;
    problems.push('many inputs outside proper forms');
  }

  return {
    score: Math.max(0, score),
    detail: problems.length > 0 ? problems.join('; ') : 'Normal page structure'
  };
}

// ── Form Field Analysis ──────────────────────────────────────

function analyzeFormFields(formFields, hasSSL) {
  if (!formFields || formFields.length === 0) {
    return { name: 'form_analysis', score: 85, weight: 0, detail: 'No forms' };
  }

  const sensitiveFields = formFields.filter(f => f.includes(':SENSITIVE'));
  const hasSensitive = sensitiveFields.length > 0;

  if (hasSensitive && !hasSSL) {
    return {
      name: 'form_analysis',
      score: 5,
      weight: 15,
      detail: `Sensitive fields (${sensitiveFields.length}) collected over insecure connection`
    };
  }

  if (hasSensitive) {
    // Sensitive fields over HTTPS is normal for login/checkout
    return {
      name: 'form_analysis',
      score: 60,
      weight: 5,
      detail: `${sensitiveFields.length} sensitive field(s) - verify legitimacy`
    };
  }

  return { name: 'form_analysis', score: 85, weight: 1, detail: 'Standard form fields' };
}

// ── Content Quality Analysis ─────────────────────────────────

function analyzeContentQuality(bodyText, pageStats) {
  if (!bodyText || bodyText.length < 50) {
    return { name: 'content_quality', score: 40, weight: 5, detail: 'Very little page content' };
  }

  const text = bodyText.toLowerCase();
  let score = 85;
  const problems = [];

  // Excessive ALL CAPS
  const words = bodyText.split(/\s+/);
  const capsWords = words.filter(w => w.length > 3 && w === w.toUpperCase());
  const capsRatio = words.length > 0 ? capsWords.length / words.length : 0;
  if (capsRatio > 0.3) {
    score -= 15;
    problems.push('excessive CAPS usage');
  }

  // Scam language patterns
  const scamPhrases = [
    'congratulations you have won',
    'claim your prize',
    'you have been selected',
    'click here to claim',
    'send money',
    'wire transfer',
    'western union',
    'bitcoin payment',
    'crypto payment required',
    'your account has been compromised',
    'verify your identity immediately',
    'suspended your account',
    'unusual activity detected',
    'nigerian prince',
    'inheritance fund',
    'act immediately or',
    'this is not a scam',
    'guaranteed income',
    'make money fast',
    'work from home earn',
    'double your money',
    'risk free investment',
    '100% guaranteed',
    'one time offer',
  ];

  const matchedScam = scamPhrases.filter(p => text.includes(p));
  if (matchedScam.length >= 3) {
    score -= 40;
    problems.push(`multiple scam phrases detected (${matchedScam.length})`);
  } else if (matchedScam.length >= 1) {
    score -= 20;
    problems.push('suspicious language patterns');
  }

  // Grammar/spelling heuristic: excessive exclamation marks
  const exclamationCount = (bodyText.match(/!/g) || []).length;
  const questionCount = (bodyText.match(/\?/g) || []).length;
  if (exclamationCount > 15 && exclamationCount > questionCount * 3) {
    score -= 10;
    problems.push('excessive exclamation marks');
  }

  if (problems.length > 0) {
    return { name: 'content_quality', score: Math.max(0, score), weight: 7, detail: problems.join('; ') };
  }

  return { name: 'content_quality', score, weight: 2, detail: 'Content appears normal' };
}

// ── Pricing Analysis ─────────────────────────────────────────

function analyzePricing(prices) {
  if (!prices || prices.length === 0) {
    return { name: 'pricing', score: 80, weight: 0, detail: 'No prices found' };
  }

  // Extract numeric values
  const numericPrices = prices
    .map(p => {
      const match = p.match(/[\d,]+\.?\d*/);
      if (match) return parseFloat(match[0].replace(/,/g, ''));
      return null;
    })
    .filter(p => p !== null && p > 0);

  if (numericPrices.length === 0) {
    return { name: 'pricing', score: 70, weight: 1, detail: 'Prices detected but could not parse' };
  }

  const problems = [];
  let score = 85;

  // Look for suspiciously low prices
  const veryLow = numericPrices.filter(p => p > 0 && p < 1);
  if (veryLow.length > 2) {
    score -= 15;
    problems.push('multiple items priced under $1');
  }

  // Look for "too good to be true" discounts (original crossed out, huge reduction)
  // This would need DOM analysis, which we get from the scraper text
  const priceTexts = prices.map(p => p.toLowerCase());
  const hasStrikethrough = priceTexts.some(p => /was\s*\$?\d|original.*\$?\d/i.test(p));
  if (hasStrikethrough && numericPrices.some(p => p < 5)) {
    score -= 10;
    problems.push('steep discounts on very low prices');
  }

  if (problems.length > 0) {
    return { name: 'pricing', score: Math.max(0, score), weight: 5, detail: problems.join('; ') };
  }

  return { name: 'pricing', score, weight: 1, detail: 'Pricing looks normal' };
}

// ── Confidence Calculation ───────────────────────────────────

function calculateConfidence(signals, data) {
  // More data points = higher confidence
  const dataPoints = signals.length;
  const hasDbChecks = data.isPhishing !== undefined || data.isMalicious !== undefined;
  const hasDomainAge = data.domainAge !== null && data.domainAge !== undefined;
  const hasContent = data.bodyText && data.bodyText.length > 100;

  if (dataPoints >= 10 && hasDbChecks && hasDomainAge && hasContent) return 'high';
  if (dataPoints >= 6 && (hasDbChecks || hasDomainAge)) return 'medium';
  return 'low';
}

// ── Utility ──────────────────────────────────────────────────

function extractRootDomain(url) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    // Handle subdomains: get last 2 parts (or 3 for co.uk etc)
    const parts = host.split('.');
    const knownSLDs = ['co', 'com', 'org', 'net', 'gov', 'ac', 'edu'];
    if (parts.length >= 3 && knownSLDs.includes(parts[parts.length - 2])) {
      return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
  } catch {
    return '';
  }
}

function isTrustedDomain(domain) {
  if (TRUSTED_DOMAINS.has(domain)) return true;
  // Also check if it's a subdomain of a trusted domain
  for (const trusted of TRUSTED_DOMAINS) {
    if (domain.endsWith('.' + trusted)) return true;
  }
  return false;
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

module.exports = {
  computeHeuristicScore,
  isTrustedDomain,
  extractRootDomain,
  HIGH_RISK_TLDS,
  MODERATE_RISK_TLDS,
  TRUSTED_DOMAINS,
};

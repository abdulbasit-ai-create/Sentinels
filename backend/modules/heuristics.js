// ============================================================
//  Is This Legit? — backend/modules/heuristics.js
//  Deterministic multi-signal scoring engine
//  Provides reliable scoring independent of LLM
//
//  ENHANCEMENTS:
//  - Brand impersonation in subdomain/URL
//  - Enhanced form detection (password, credit card, SSN)
//  - Suspicious redirect chain detection
//  - Fake login page detection
//  - Popup/overlay detection
//  - Too-good-to-be-true offers
//  - Enhanced urgency language detection
//  - Grammar/spelling mistake detection
//  - Mismatched hover/text link detection
//  - Enhanced IFrame detection (clickjacking)
// ============================================================

// ── Known-Good Domains (false-positive prevention) ───────────
const TRUSTED_DOMAINS = new Set([
  'google.com', 'google.co.uk', 'google.co.in', 'google.ca', 'google.com.au',
  'bing.com', 'duckduckgo.com', 'yahoo.com', 'baidu.com', 'yandex.ru',
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com',
  'reddit.com', 'pinterest.com', 'tiktok.com', 'snapchat.com', 'tumblr.com',
  'discord.com', 'twitch.tv', 'threads.net', 'mastodon.social',
  'amazon.com', 'amazon.co.uk', 'amazon.ca', 'amazon.de', 'amazon.in',
  'ebay.com', 'walmart.com', 'target.com', 'bestbuy.com', 'costco.com',
  'etsy.com', 'shopify.com', 'aliexpress.com', 'wayfair.com', 'homedepot.com',
  'apple.com', 'microsoft.com', 'github.com', 'gitlab.com', 'stackoverflow.com',
  'mozilla.org', 'chromium.org', 'npmjs.com', 'pypi.org', 'docker.com',
  'aws.amazon.com', 'azure.microsoft.com', 'cloud.google.com',
  'paypal.com', 'stripe.com', 'chase.com', 'bankofamerica.com', 'wellsfargo.com',
  'visa.com', 'mastercard.com', 'americanexpress.com', 'wise.com', 'revolut.com',
  'youtube.com', 'netflix.com', 'spotify.com', 'hulu.com', 'disneyplus.com',
  'bbc.com', 'bbc.co.uk', 'cnn.com', 'nytimes.com', 'reuters.com',
  'theguardian.com', 'washingtonpost.com', 'apnews.com', 'npr.org',
  'wikipedia.org', 'khanacademy.org', 'coursera.org', 'edx.org', 'udemy.com',
  'notion.so', 'slack.com', 'zoom.us', 'dropbox.com', 'drive.google.com',
  'docs.google.com', 'office.com', 'outlook.com', 'proton.me', 'protonmail.com',
  'cloudflare.com', 'vercel.com', 'netlify.com', 'heroku.com',
  'archive.org', 'craigslist.org', 'yelp.com', 'tripadvisor.com',
]);

const HIGH_RISK_TLDS = new Set([
  'tk', 'ml', 'ga', 'cf', 'gq', 'buzz', 'top', 'xyz', 'club', 'icu',
  'cam', 'monster', 'rest', 'beauty', 'loan', 'win', 'bid', 'click', 'link',
  'work', 'gdn', 'stream', 'racing', 'review', 'trade', 'party', 'date', 'download',
  'science', 'cricket', 'accountant', 'faith',
]);

const MODERATE_RISK_TLDS = new Set([
  'info', 'biz', 'pro', 'pw', 'cc', 'ws', 'site', 'online', 'store', 'shop', 'live',
  'space', 'fun', 'tech', 'world',
]);

const SUSPICIOUS_REGISTRARS = [
  'namecheap', 'namesilo', 'porkbun', 'nicenic',
  'alibaba', 'west263', 'jiangsu', 'chengdu',
  'enom', 'epik', 'regtons',
];

// ── Known brand names for impersonation checks ───────────────
const KNOWN_BRANDS = [
  'paypal', 'amazon', 'netflix', 'google', 'microsoft', 'apple',
  'facebook', 'instagram', 'twitter', 'linkedin', 'whatsapp',
  'youtube', 'spotify', 'reddit', 'ebay', 'walmart', 'chase',
  'wellsfargo', 'bankofamerica', 'dropbox', 'github', 'slack',
  'zoom', 'tiktok', 'telegram', 'adobe', 'steam', 'discord', 'twitch',
];

// ── Suspicious redirect parameters ───────────────────────────
const REDIRECT_PARAMS = [
  'redirect', 'redirect_uri', 'redirect_url', 'return', 'return_to',
  'return_url', 'next', 'url', 'target', 'goto', 'destination',
  'continue', 'continue_url', 'forward', 'to', 'link', 'ref',
  'outbound', 'click', 'track', 'linkto', 'href',
];

// ── Triggers for urgency language ────────────────────────────
const URGENCY_PHRASES = [
  'act now', 'act immediately', 'limited time', 'limited offer',
  'expires', 'expiring', 'your account will be closed',
  'your account has been suspended', 'your account is suspended',
  'your account has been locked', 'your account is locked',
  'your account will be deleted', 'your account will be terminated',
  'immediate action required', 'immediate action needed',
  'respond within', 'within 24 hours', 'within 48 hours',
  'final notice', 'final warning', 'last chance',
  'offer expires', 'hurry', 'don\'t miss out', 'only today',
  'urgent', 'time sensitive', 'time is running out',
  'verify now', 'confirm now', 'update now',
  'you must respond', 'failure to respond will result',
  'you have been selected', 'you won', 'you are the winner',
  'claim your prize', 'claim now',
];

// ── Common misspellings / poor grammar indicators ────────────
const COMMON_MISSPELLINGS = [
  'recieved', 'recieve', 'beleive', 'beleivable',
  'occured', 'occuring', 'ocurred', 'ocurring',
  'seperate', 'seperately', 'definately', 'definatly',
  'accomodate', 'accomodation', 'acheive', 'acheiving',
  'aquire', 'aquired', 'arguement', 'beleif',
  'calender', 'catagory', 'cemetary', 'concieve',
  'decaffinate', 'dependance', 'dissapear', 'dissapoint',
  'embarass', 'embarassed', 'enviroment', 'enviromental',
  'exellent', 'existance', 'familiarise', 'febuary',
  'gaurantee', 'gauranteed', 'goverment', 'govermental',
  'greateful', 'harrass', 'harrassment', 'humourous',
  'imaginary', 'imaginery', 'immediatly', 'independant',
  'interupt', 'jewlery', 'jewellery', 'judgment',
  'knowlege', 'knowlegeable', 'liason', 'libary',
  'licenced', 'maintainance', 'maintenence', 'millenium',
  'mischievious', 'misilleable', 'misspelled', 'momento',
  'neccessary', 'necesary', 'noticable', 'noticably',
  'occassion', 'occasionaly', 'occurance', 'occurrance',
  'oppertunity', 'opposition', 'originaly', 'outragous',
  'paralel', 'parralel', 'percieve', 'percieved',
  'permenant', 'persistant', 'personel', 'personel',
  'posession', 'possessess', 'potatos', 'priviledge',
  'publicaly', 'purchaseing', 'realy', 'realy',
  'reciept', 'recieved', 'refered', 'refering',
  'regester', 'relevent', 'religous', 'remeber',
  'renewel', 'repetion', 'responsable', 'restaraunt',
  'revelant', 'sargeant', 'seige', 'sensable',
  'sentance', 'seperate', 'sincerly', 'situation',
  'somene', 'sorceror', 'speach', 'sponser',
  'steriod', 'stragedy', 'stragies', 'stregnth',
  'succesful', 'succesfully', 'suceed', 'suceeding',
  'supercede', 'supose', 'supposably', 'surprize',
  'targetted', 'targetting', 'teh', 'thier', 'thier',
  'throughly', 'tommorow', 'tommorrow', 'tradgedy',
  'transfered', 'transfering', 'truely',
  'unfortunatly', 'untill', 'usefull', 'usefull',
  'vaccuum', 'vegatarian', 'vegitable', 'vehicule',
  'vengence', 'visable', 'volcanoe', 'wensday',
  'wierd', 'writen', 'writting', 'yatch', 'your welcome',
];

// ── Core Heuristic Engine ────────────────────────────────────

function computeHeuristicScore(data) {
  const signals = [];
  let totalWeight = 0;
  let weightedScore = 0;

  const domainClean = extractRootDomain(data.url);
  const isTrusted = isTrustedDomain(domainClean);

  // ─── 1. Trusted Domain Check ──────────────────────────────────
  if (isTrusted) {
    signals.push({
      name: 'trusted_domain',
      score: 95,
      weight: 40,
      detail: `${domainClean} is a well-known trusted domain`
    });
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
    if (age < 7) { ageScore = 5; ageDetail = `Domain is only ${age} days old - extremely new`; }
    else if (age < 14) { ageScore = 12; ageDetail = `Domain is only ${age} days old - very new`; }
    else if (age < 30) { ageScore = 25; ageDetail = `Domain is ${age} days old - recently registered`; }
    else if (age < 90) { ageScore = 45; ageDetail = `Domain is ${age} days old - fairly new`; }
    else if (age < 180) { ageScore = 65; ageDetail = `Domain is ${age} days old`; }
    else if (age < 365) { ageScore = 80; ageDetail = `Domain is ${age} days old - established`; }
    else if (age < 730) { ageScore = 90; ageDetail = `Domain is ${Math.floor(age / 365)}+ years old`; }
    else { ageScore = 100; ageDetail = `Domain is ${Math.floor(age / 365)}+ years old - well established`; }
    signals.push({ name: 'domain_age', score: ageScore, weight: 15, detail: ageDetail });
  }

  // ─── 4. SSL/TLS ──────────────────────────────────────────────
  // ponytail: trusted domains get lighter SSL penalty — a known domain
  // like github.com accessed via HTTP is still the real GitHub, just
  // on the wrong protocol. Upgrade path: redirect check.
  const sslScore = data.hasSSL ? 100 : (isTrusted ? 50 : 10);
  const sslWeight = data.hasSSL ? 5 : (isTrusted ? 3 : 12);
  const sslDetail = data.hasSSL
    ? 'HTTPS with SSL certificate'
    : (isTrusted ? 'Using HTTP instead of HTTPS' : 'No SSL certificate - connection insecure');
  signals.push({ name: 'ssl', score: sslScore, weight: sslWeight, detail: sslDetail });

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

  // ─── 12. Page Structure Analysis ──────────────────────────────
  const structureScore = analyzePageStructure(data.pageStats, data);
  if (structureScore.score < 80) {
    signals.push({ name: 'page_structure', score: structureScore.score, weight: 5, detail: structureScore.detail });
  }

  // ─── 13. Form Security ───────────────────────────────────────
  const formScore = analyzeFormFields(data.formFields, data.hasSSL, data.url);
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

  // ─── 16. BRAND IMPERSONATION IN SUBDOMAIN ─────────────────────
  const brandImpersonationScore = detectBrandImpersonation(data.url);
  if (brandImpersonationScore.weight > 0) {
    signals.push(brandImpersonationScore);
  }

  // ─── 17. FORM DETECTION ON PAGE (enhanced) ────────────────────
  const formDetectionScore = detectFormTypes(data.formFields, data.bodyText);
  if (formDetectionScore.weight > 0) {
    signals.push(formDetectionScore);
  }

  // ─── 18. SUSPICIOUS REDIRECT CHAINS ───────────────────────────
  const redirectScore = detectRedirectChains(data.url, data.urlSignals, data.contentSignals);
  if (redirectScore.weight > 0) {
    signals.push(redirectScore);
  }

  // ─── 19. FAKE LOGIN PAGE DETECTION ────────────────────────────
  const fakeLoginScore = detectFakeLoginPage(data.url, data.pageStats, data.formFields, data.contentSignals, data.bodyText);
  if (fakeLoginScore.weight > 0) {
    signals.push(fakeLoginScore);
  }

  // ─── 20. POPUP/OVERLAY DETECTION ──────────────────────────────
  const popupScore = detectPopups(data.contentSignals, data.pageStats);
  if (popupScore.weight > 0) {
    signals.push(popupScore);
  }

  // ─── 21. TOO-GOOD-TO-BE-TRUE OFFERS ──────────────────────────
  const tgtbtScore = detectTooGoodToBeTrue(data.prices, data.bodyText);
  if (tgtbtScore.weight > 0) {
    signals.push(tgtbtScore);
  }

  // ─── 22. URGENCY LANGUAGE (enhanced) ──────────────────────────
  const urgencyScore = detectUrgencyLanguage(data.bodyText);
  if (urgencyScore.weight > 0) {
    signals.push(urgencyScore);
  }

  // ─── 23. GRAMMAR/SPELLING MISTAKES ────────────────────────────
  const grammarScore = detectGrammarMistakes(data.bodyText);
  if (grammarScore.weight > 0) {
    signals.push(grammarScore);
  }

  // ─── 24. MISMATCHED HOVER/TEXT LINKS ─────────────────────────
  const mismatchScore = detectMismatchedLinks(data.urlSignals);
  if (mismatchScore.weight > 0) {
    signals.push(mismatchScore);
  }

  // ─── 25. IFRAME DETECTION (enhanced clickjacking) ────────────
  const iframeScore = detectIframeClickjacking(data.pageStats, data.contentSignals);
  if (iframeScore.weight > 0) {
    signals.push(iframeScore);
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

// ═══════════════════════════════════════════════════════════════
//  NEW DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// ── 16. Brand Impersonation in Subdomain/Url ─────────────────
function detectBrandImpersonation(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    const parts = hostname.split('.');
    const rootDomain = parts.slice(-2).join('.');
    const rootName = parts.slice(-2, -1)[0] || parts[0];

    for (const brand of KNOWN_BRANDS) {
      // Brand found in hostname but not as legitimate root
      if (hostname.includes(brand) && !rootDomain.startsWith(brand)) {
        return {
          name: 'brand_impersonation',
          score: 15,
          weight: 12,
          detail: `"${brand}" appears in subdomain/URL but root domain is not "${brand}" - possible impersonation`
        };
      }

      // Brand found in subdomain with leet-speak
      const leetVariations = generateLeetVariations(brand);
      for (const variation of leetVariations) {
        if (hostname.includes(variation) && !hostname.includes(brand + '.')) {
          return {
            name: 'brand_impersonation',
            score: 10,
            weight: 14,
            detail: `"${variation}" visually mimics "${brand}" - possible leet-speak impersonation`
          };
        }
      }
    }
  } catch {}
  return { name: 'brand_impersonation', score: 80, weight: 0, detail: '' };
}

function generateLeetVariations(word) {
  const variations = [];
  const leetSubs = { 'o': '0', 'e': '3', 'a': '4', 's': '5', 't': '7', 'l': '1', 'i': '1' };
  for (const [char, sub] of Object.entries(leetSubs)) {
    if (word.includes(char)) {
      variations.push(word.replace(new RegExp(char, 'g'), sub));
    }
  }
  return variations;
}

// ── 17. Enhanced Form Detection ──────────────────────────────
function detectFormTypes(formFields, bodyText) {
  if (!formFields || formFields.length === 0) {
    return { name: 'form_types', score: 80, weight: 0, detail: '' };
  }

  const fieldsFlat = (formFields.join(' ') + ' ' + (bodyText || '')).toLowerCase();
  const indicators = [];

  // Password fields
  const passwordIndicators = ['password', 'passwd', 'pwd', 'pass'];
  const hasPasswordField = passwordIndicators.some(p => fieldsFlat.includes(p));
  if (hasPasswordField) {
    indicators.push('password');
  }

  // Credit card fields
  const ccIndicators = ['credit card', 'card number', 'card number', 'cc-number', 'ccnumber',
    'cardnumber', 'debit card', 'cardholder name', 'card holder', 'expiration date',
    'expiry date', 'cvv', 'cvc', 'security code', 'card code'];
  const hasCCField = ccIndicators.some(c => fieldsFlat.includes(c));

  // SSN / government ID
  const ssnIndicators = ['social security', 'ssn', 'drivers license', 'passport number', 'national id'];
  const hasSSNField = ssnIndicators.some(s => fieldsFlat.includes(s));

  // Banking details
  const bankingIndicators = ['bank account', 'routing number', 'account number', 'iban', 'swift'];
  const hasBankingField = bankingIndicators.some(b => fieldsFlat.includes(b));

  if (hasCCField) indicators.push('credit_card');
  if (hasSSNField) indicators.push('ssn');
  if (hasBankingField) indicators.push('banking');

  if (indicators.length >= 2) {
    return {
      name: 'form_types',
      score: 10,
      weight: 18,
      detail: `Highly sensitive form fields detected: ${indicators.join(', ')}`
    };
  }
  if (indicators.length === 1 && indicators[0] !== 'password') {
    return {
      name: 'form_types',
      score: 25,
      weight: 14,
      detail: `Sensitive information field detected: ${indicators[0]}`
    };
  }
  if (hasPasswordField) {
    return { name: 'form_types', score: 55, weight: 6, detail: 'Password field detected - verify page legitimacy' };
  }

  return { name: 'form_types', score: 80, weight: 0, detail: '' };
}

// ── 18. Suspicious Redirect Chains ───────────────────────────
function detectRedirectChains(url, urlSignals, contentSignals) {
  try {
    const parsed = new URL(url);
    const searchParams = parsed.searchParams;

    // Check for known redirect parameters
    const foundParams = [];
    for (const param of REDIRECT_PARAMS) {
      if (searchParams.has(param)) {
        const val = searchParams.get(param);
        if (val && val.startsWith('http')) {
          foundParams.push(`${param}=${val.slice(0, 40)}...`);
        } else {
          foundParams.push(param);
        }
      }
    }

    if (foundParams.length >= 2) {
      return {
        name: 'redirect_chains',
        score: 15,
        weight: 10,
        detail: `Multiple redirect parameters detected: ${foundParams.join(', ')}`
      };
    }
    if (foundParams.length === 1) {
      return {
        name: 'redirect_chains',
        score: 40,
        weight: 7,
        detail: `Suspicious redirect parameter: ${foundParams[0]}`
      };
    }

    // Check for meta refresh redirect
    if (contentSignals?.hasMetaRefresh) {
      return {
        name: 'redirect_chains',
        score: 45,
        weight: 5,
        detail: 'Page has automatic meta refresh redirect'
      };
    }

    // Check for javascript redirects (window.location etc.)
    const body = (contentSignals?.pageText || '').toLowerCase();
    if (body.includes('window.location') || body.includes('document.location') || body.includes('window.location.href')) {
      return {
        name: 'redirect_chains',
        score: 40,
        weight: 6,
        detail: 'Page contains JavaScript auto-redirect code'
      };
    }

  } catch {}
  return { name: 'redirect_chains', score: 80, weight: 0, detail: '' };
}

// ── 19. Fake Login Page Detection ────────────────────────────
function detectFakeLoginPage(url, pageStats, formFields, contentSignals, bodyText) {
  if (!pageStats) return { name: 'fake_login', score: 80, weight: 0, detail: '' };

  const text = (bodyText || '').toLowerCase();
  const hostname = extractHostname(url);
  const isLoginPage = pageStats.hasLogin || text.includes('sign in') || text.includes('log in') || text.includes('login');

  if (!isLoginPage) return { name: 'fake_login', score: 80, weight: 0, detail: '' };

  // Check for brand keywords in page text
  const brandMatches = KNOWN_BRANDS.filter(brand => text.includes(brand));
  const impersonationFlags = [];

  if (brandMatches.length > 0) {
    // Check if the domain matches the brand being impersonated
    for (const brand of brandMatches) {
      if (!hostname.includes(brand)) {
        impersonationFlags.push(`"${brand}" login page on non-${brand} domain`);
      }
    }
  }

  // Login page on a non-standard domain with no brand match
  if (impersonationFlags.length > 0) {
    return {
      name: 'fake_login',
      score: 10,
      weight: 16,
      detail: `Potential fake login: ${impersonationFlags.join('; ')}`
    };
  }

  // Login page on unusual domain (no well-known brand affiliation)
  const isBrandDomain = KNOWN_BRANDS.some(b => hostname.includes(b) || hostname.includes(b.replace(' ', '')));
  if (isLoginPage && !isBrandDomain && hostname.split('.').length > 2) {
    return {
      name: 'fake_login',
      score: 30,
      weight: 10,
      detail: 'Login page on non-branded domain with subdomains'
    };
  }

  return { name: 'fake_login', score: 55, weight: 4, detail: 'Login form present - verify domain legitimacy' };
}

function extractHostname(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}

// ── 20. Popup/Overlay Detection ──────────────────────────────
function detectPopups(contentSignals, pageStats) {
  if (!contentSignals && !pageStats) return { name: 'popup_overlay', score: 80, weight: 0, detail: '' };

  let issues = [];
  let severity = 0;

  // Popunder count from contentSignals
  const popunderCount = contentSignals?.popunderCount || 0;
  if (popunderCount > 0) {
    issues.push(`${popunderCount} popunders`);
    severity += popunderCount * 10;
  }

  // Multiple alerts / prompts (detected through contentSignals)
  if (contentSignals?.alertCount > 2) {
    issues.push('multiple popup alerts');
    severity += 20;
  }

  // Excessive modal overlays
  if (contentSignals?.modalCount > 3) {
    issues.push('excessive modal overlays');
    severity += 15;
  }

  if (severity >= 30) {
    return {
      name: 'popup_overlay',
      score: 15,
      weight: 10,
      detail: `Aggressive popup/overlay behavior: ${issues.join(', ')}`
    };
  }
  if (severity > 0) {
    return {
      name: 'popup_overlay',
      score: 40,
      weight: 6,
      detail: `Popups detected: ${issues.join(', ')}`
    };
  }

  return { name: 'popup_overlay', score: 80, weight: 0, detail: '' };
}

// ── 21. Too-Good-To-Be-True Offers ───────────────────────────
function detectTooGoodToBeTrue(prices, bodyText) {
  const text = (bodyText || '').toLowerCase();
  const flags = [];

  // Price-related unrealistic patterns
  if (prices && prices.length > 0) {
    const numericPrices = prices
      .map(p => { const m = p.match(/[\d,]+\.?\d*/); return m ? parseFloat(m[0].replace(/,/g, '')) : null; })
      .filter(p => p !== null && p > 0);

    // Items priced under $1 that are typically expensive
    const suspiciouslyCheap = numericPrices.filter(p => p > 0 && p < 1);
    if (suspiciouslyCheap.length > 3) {
      flags.push('multiple items under $1');
    }

    // Brand name items at unrealistic prices
    if (numericPrices.length > 0 && text.includes('iphone') && numericPrices.some(p => p < 100)) {
      flags.push('iPhone priced unrealistically low');
    }
    if (numericPrices.length > 0 && text.includes('macbook') && numericPrices.some(p => p < 200)) {
      flags.push('MacBook priced unrealistically low');
    }
    if (numericPrices.length > 0 && (text.includes('airpods') || text.includes('airpod')) && numericPrices.some(p => p < 20)) {
      flags.push('AirPods priced unrealistically low');
    }
  }

  // Text patterns for unrealistic offers
  const tgtbtPhrases = [
    'make money fast', 'make $', '$$$', 'earn $', 'work from home earn',
    'double your money', 'triple your investment', 'risk free profit',
    'guaranteed returns', 'guaranteed income', 'no risk involved',
    '100% guaranteed', 'limited supply', 'while supplies last',
    'exclusive deal', 'insider deal', 'secret deal',
    'discount code 90%', '90% off', '80% off', '70% off everything',
    'free iphone', 'free macbook', 'free ipad', 'free airpods',
    'you are the lucky winner', 'congratulations you won', 'you have won',
    'claim your free', 'get it free', 'free gift', 'free prize',
  ];

  const matchedPhrases = tgtbtPhrases.filter(p => text.includes(p));
  if (matchedPhrases.length > 1) {
    flags.push(`unrealistic offer claims: ${matchedPhrases.slice(0, 3).join(', ')}`);
  }

  if (flags.length >= 2) {
    return {
      name: 'too_good_to_be_true',
      score: 10,
      weight: 12,
      detail: `Too-good-to-be-true offers: ${flags.join('; ')}`
    };
  }
  if (flags.length === 1) {
    return {
      name: 'too_good_to_be_true',
      score: 30,
      weight: 8,
      detail: `Suspicious offer: ${flags[0]}`
    };
  }

  return { name: 'too_good_to_be_true', score: 80, weight: 0, detail: '' };
}

// ── 22. Enhanced Urgency Language Detection ──────────────────
function detectUrgencyLanguage(bodyText) {
  if (!bodyText || bodyText.length < 20) {
    return { name: 'urgency_language', score: 80, weight: 0, detail: '' };
  }

  const text = bodyText.toLowerCase();
  const matchedPhrases = URGENCY_PHRASES.filter(p => text.includes(p));

  if (matchedPhrases.length >= 4) {
    return {
      name: 'urgency_language',
      score: 10,
      weight: 10,
      detail: `High-pressure urgency tactics: "${matchedPhrases.slice(0, 5).join('", "')}"`
    };
  }
  if (matchedPhrases.length >= 2) {
    return {
      name: 'urgency_language',
      score: 30,
      weight: 7,
      detail: `Urgency language detected: "${matchedPhrases.slice(0, 3).join('", "')}"`
    };
  }
  if (matchedPhrases.length === 1) {
    return {
      name: 'urgency_language',
      score: 55,
      weight: 4,
      detail: `Mild urgency: "${matchedPhrases[0]}"`
    };
  }

  return { name: 'urgency_language', score: 80, weight: 0, detail: '' };
}

// ── 23. Grammar / Spelling Mistake Detection ─────────────────
function detectGrammarMistakes(bodyText) {
  if (!bodyText || bodyText.length < 100) {
    return { name: 'grammar_spelling', score: 80, weight: 0, detail: '' };
  }

  const words = bodyText.toLowerCase().split(/\s+/);
  let mistakes = 0;
  const foundMistakes = [];

  for (const word of words) {
    // Remove punctuation for comparison
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord.length < 4) continue;
    if (COMMON_MISSPELLINGS.includes(cleanWord)) {
      mistakes++;
      if (foundMistakes.length < 5) foundMistakes.push(cleanWord);
    }
  }

  // Check for excessive exclamation and question marks
  const exclaimCount = (bodyText.match(/!/g) || []).length;
  const questionCount = (bodyText.match(/\?/g) || []).length;
  let capsIssue = false;
  const capsWords = words.filter(w => w.length > 3 && w === w.toUpperCase()).length;
  if (words.length > 0 && capsWords / words.length > 0.15) capsIssue = true;

  if (mistakes >= 5) {
    return {
      name: 'grammar_spelling',
      score: 15,
      weight: 10,
      detail: `${mistakes} spelling/grammar mistakes found: ${foundMistakes.join(', ')}`
    };
  }
  if (mistakes >= 3) {
    return {
      name: 'grammar_spelling',
      score: 35,
      weight: 7,
      detail: `${mistakes} spelling mistakes: ${foundMistakes.join(', ')}`
    };
  }
  if (mistakes >= 1 || capsIssue) {
    return {
      name: 'grammar_spelling',
      score: 55,
      weight: 4,
      detail: mistakes > 0 ? `Possible grammatical issues (${mistakes} mistake(s))` : 'Excessive capitalization'
    };
  }

  return { name: 'grammar_spelling', score: 80, weight: 0, detail: '' };
}

// ── 24. Mismatched Hover/Text Links ──────────────────────────
function detectMismatchedLinks(urlSignals) {
  // The extension should send mismatched link data
  // Check for mismatched links count
  const mismatchedCount = urlSignals?.mismatchedLinks || 0;
  if (mismatchedCount > 5) {
    return {
      name: 'mismatched_links',
      score: 10,
      weight: 10,
      detail: `${mismatchedCount} links have mismatched display text and href targets`
    };
  }
  if (mismatchedCount > 0) {
    return {
      name: 'mismatched_links',
      score: 35,
      weight: 7,
      detail: `${mismatchedCount} link(s) have mismatched display text and href`
    };
  }
  return { name: 'mismatched_links', score: 80, weight: 0, detail: '' };
}

// ── 25. Enhanced IFrame / Clickjacking Detection ─────────────
function detectIframeClickjacking(pageStats, contentSignals) {
  if (!pageStats && !contentSignals) return { name: 'iframe_detection', score: 80, weight: 0, detail: '' };

  const iframeCount = pageStats?.iframes || 0;
  const hiddenIframeCount = contentSignals?.hiddenIframeCount || 0;
  let issues = [];

  // Hidden iframes are a strong clickjacking signal
  if (hiddenIframeCount > 0) {
    issues.push(`${hiddenIframeCount} hidden iframe(s)`);
  }

  // Excessive iframes
  if (iframeCount > 10) {
    issues.push(`${iframeCount} total iframes (excessive)`);
  } else if (iframeCount > 5) {
    issues.push(`${iframeCount} iframes`);
  }

  if (hiddenIframeCount >= 2) {
    return {
      name: 'iframe_detection',
      score: 5,
      weight: 15,
      detail: `Clickjacking risk: ${issues.join(', ')}`
    };
  }
  if (hiddenIframeCount === 1) {
    return {
      name: 'iframe_detection',
      score: 20,
      weight: 12,
      detail: `Hidden iframe detected: ${issues.join(', ')}`
    };
  }
  if (iframeCount > 10) {
    return {
      name: 'iframe_detection',
      score: 25,
      weight: 8,
      detail: `Excessive iframes: ${issues.join(', ')}`
    };
  }
  if (iframeCount > 0 || hiddenIframeCount > 0) {
    return {
      name: 'iframe_detection',
      score: 55,
      weight: 4,
      detail: issues.length > 0 ? issues.join(', ') : `${iframeCount} iframe(s) present`
    };
  }

  return { name: 'iframe_detection', score: 80, weight: 0, detail: '' };
}

// ═══════════════════════════════════════════════════════════════
//  EXISTING ANALYSIS FUNCTIONS (upgraded)
// ═══════════════════════════════════════════════════════════════

function analyzeUrl(url, urlSignals) {
  const problems = [];
  let score = 100;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // Entropy check
    const entropy = calculateEntropy(host.replace(/\./g, ''));
    if (entropy > 4.2) { score -= 25; problems.push('random-looking hostname'); }
    else if (entropy > 3.8) { score -= 10; problems.push('moderate hostname entropy'); }

    // Subdomain analysis
    const subdomains = urlSignals?.subdomainCount || (host.split('.').length - 2);
    if (subdomains >= 4) { score -= 30; problems.push(`${subdomains} subdomains`); }
    else if (subdomains >= 3) { score -= 15; problems.push('many subdomains'); }
    else if (subdomains >= 2) { score -= 5; }

    // Excessive hyphens
    const hyphens = urlSignals?.hyphenCount || (host.match(/-/g) || []).length;
    if (hyphens >= 4) { score -= 25; problems.push('excessive hyphens'); }
    else if (hyphens >= 2) { score -= 10; problems.push('multiple hyphens'); }

    // Digits in hostname
    const digits = urlSignals?.digitCount || (host.match(/\d/g) || []).length;
    if (digits >= 6) { score -= 20; problems.push('many digits in hostname'); }

    // URL length
    if (url.length > 200) { score -= 15; problems.push('very long URL'); }
    else if (url.length > 120) { score -= 5; }

    // Phishy tokens
    const phishyTokens = ['login', 'verify', 'update', 'secure', 'account', 'billing', 'password', 'confirm', 'suspend', 'unlock', 'validate', 'authenticate', 'signin', 'sign-in', '2fa', 'mfa', 'security', 'recover', 'reset'];
    const pathLower = (parsed.pathname + parsed.search).toLowerCase();
    const matchedTokens = phishyTokens.filter(t => pathLower.includes(t));
    if (matchedTokens.length >= 2) { score -= 25; problems.push(`suspicious path tokens: ${matchedTokens.join(', ')}`); }
    else if (matchedTokens.length === 1) { score -= 8; }

    // IP address as hostname
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) { score -= 35; problems.push('IP address used as hostname'); }

    // @ symbol
    if (url.includes('@')) { score -= 30; problems.push('@ symbol in URL (deceptive redirect)'); }

    // Double slashes
    if (parsed.pathname.includes('//')) { score -= 10; problems.push('double slashes in path'); }

    // Homograph detection
    if (/[^\x00-\x7F]/.test(host)) { score -= 25; problems.push('non-ASCII characters in hostname (possible homograph attack)'); }

    // Brand impersonation in subdomain
    const parts = host.split('.');
    const rootDomain = parts.slice(-2).join('.');
    for (const brand of KNOWN_BRANDS) {
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

  return { score: Math.max(0, score), detail: problems.length > 0 ? `URL issues: ${problems.join('; ')}` : 'URL looks clean' };
}

function calculateEntropy(str) {
  if (!str || str.length === 0) return 0;
  const freq = {};
  for (const c of str) freq[c] = (freq[c] || 0) + 1;
  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(freq)) { const p = count / len; entropy -= p * Math.log2(p); }
  return entropy;
}

function analyzePageStructure(stats, data) {
  if (!stats) return { score: 70, detail: 'No page stats available' };
  const problems = [];
  let score = 90;

  if (stats.iframes > 10) { score -= 25; problems.push(`${stats.iframes} iframes`); }
  else if (stats.iframes > 5) { score -= 10; problems.push('many iframes'); }

  if (stats.totalLinks > 0 && stats.externalLinks > 0) {
    const externalRatio = stats.externalLinks / stats.totalLinks;
    if (externalRatio > 0.8 && stats.totalLinks > 10) { score -= 15; problems.push('mostly external links'); }
  }

  if (stats.scripts > 50) { score -= 10; problems.push(`${stats.scripts} scripts loaded`); }

  if (stats.textLength < 200 && stats.forms > 0) { score -= 20; problems.push('minimal text content with forms present'); }

  if (stats.inputs > 10 && stats.forms <= 1) { score -= 10; problems.push('many inputs outside proper forms'); }

  return { score: Math.max(0, score), detail: problems.length > 0 ? problems.join('; ') : 'Normal page structure' };
}

function analyzeFormFields(formFields, hasSSL, url) {
  if (!formFields || formFields.length === 0) return { name: 'form_analysis', score: 85, weight: 0, detail: 'No forms' };

  const sensitiveFields = formFields.filter(f => f.includes(':SENSITIVE'));
  const hasSensitive = sensitiveFields.length > 0;

  if (hasSensitive && !hasSSL) {
    return { name: 'form_analysis', score: 5, weight: 15, detail: `Sensitive fields (${sensitiveFields.length}) collected over insecure connection` };
  }
  if (hasSensitive) {
    return { name: 'form_analysis', score: 60, weight: 5, detail: `${sensitiveFields.length} sensitive field(s) - verify legitimacy` };
  }
  return { name: 'form_analysis', score: 85, weight: 1, detail: 'Standard form fields' };
}

function analyzeContentQuality(bodyText, pageStats) {
  if (!bodyText || bodyText.length < 50) return { name: 'content_quality', score: 40, weight: 5, detail: 'Very little page content' };

  const text = bodyText.toLowerCase();
  let score = 85;
  const problems = [];

  const words = bodyText.split(/\s+/);
  const capsWords = words.filter(w => w.length > 3 && w === w.toUpperCase());
  const capsRatio = words.length > 0 ? capsWords.length / words.length : 0;
  if (capsRatio > 0.3) { score -= 15; problems.push('excessive CAPS usage'); }

  const scamPhrases = [
    'congratulations you have won', 'claim your prize', 'you have been selected',
    'click here to claim', 'send money', 'wire transfer', 'western union',
    'bitcoin payment', 'crypto payment required', 'your account has been compromised',
    'verify your identity immediately', 'suspended your account', 'unusual activity detected',
    'nigerian prince', 'inheritance fund', 'act immediately or', 'this is not a scam',
    'guaranteed income', 'make money fast', 'work from home earn', 'double your money',
    'risk free investment', '100% guaranteed', 'one time offer',
  ];
  const matchedScam = scamPhrases.filter(p => text.includes(p));
  if (matchedScam.length >= 3) { score -= 40; problems.push(`multiple scam phrases detected (${matchedScam.length})`); }
  else if (matchedScam.length >= 1) { score -= 20; problems.push('suspicious language patterns'); }

  const exclamationCount = (bodyText.match(/!/g) || []).length;
  const questionCount = (bodyText.match(/\?/g) || []).length;
  if (exclamationCount > 15 && exclamationCount > questionCount * 3) { score -= 10; problems.push('excessive exclamation marks'); }

  if (problems.length > 0) return { name: 'content_quality', score: Math.max(0, score), weight: 7, detail: problems.join('; ') };
  return { name: 'content_quality', score, weight: 2, detail: 'Content appears normal' };
}

function analyzePricing(prices) {
  if (!prices || prices.length === 0) return { name: 'pricing', score: 80, weight: 0, detail: 'No prices found' };

  const numericPrices = prices.map(p => { const match = p.match(/[\d,]+\.?\d*/); if (match) return parseFloat(match[0].replace(/,/g, '')); return null; }).filter(p => p !== null && p > 0);
  if (numericPrices.length === 0) return { name: 'pricing', score: 70, weight: 1, detail: 'Prices detected but could not parse' };

  const problems = [];
  let score = 85;
  const veryLow = numericPrices.filter(p => p > 0 && p < 1);
  if (veryLow.length > 2) { score -= 15; problems.push('multiple items priced under $1'); }

  const priceTexts = prices.map(p => p.toLowerCase());
  const hasStrikethrough = priceTexts.some(p => /was\s*\$?\d|original.*\$?\d/i.test(p));
  if (hasStrikethrough && numericPrices.some(p => p < 5)) { score -= 10; problems.push('steep discounts on very low prices'); }

  if (problems.length > 0) return { name: 'pricing', score: Math.max(0, score), weight: 5, detail: problems.join('; ') };
  return { name: 'pricing', score, weight: 1, detail: 'Pricing looks normal' };
}

function calculateConfidence(signals, data) {
  const dataPoints = signals.length;
  const hasDbChecks = data.isPhishing !== undefined || data.isMalicious !== undefined;
  const hasDomainAge = data.domainAge !== null && data.domainAge !== undefined;
  const hasContent = data.bodyText && data.bodyText.length > 100;

  if (dataPoints >= 10 && hasDbChecks && hasDomainAge && hasContent) return 'high';
  if (dataPoints >= 6 && (hasDbChecks || hasDomainAge)) return 'medium';
  return 'low';
}

function extractRootDomain(url) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    const parts = host.split('.');
    const knownSLDs = ['co', 'com', 'org', 'net', 'gov', 'ac', 'edu'];
    if (parts.length >= 3 && knownSLDs.includes(parts[parts.length - 2])) return parts.slice(-3).join('.');
    return parts.slice(-2).join('.');
  } catch { return ''; }
}

function isTrustedDomain(domain) {
  if (TRUSTED_DOMAINS.has(domain)) return true;
  for (const trusted of TRUSTED_DOMAINS) { if (domain.endsWith('.' + trusted)) return true; }
  return false;
}

function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

module.exports = {
  computeHeuristicScore,
  isTrustedDomain,
  extractRootDomain,
  HIGH_RISK_TLDS,
  MODERATE_RISK_TLDS,
  TRUSTED_DOMAINS,
  KNOWN_BRANDS,
  // Export new functions for testing
  detectBrandImpersonation,
  detectTooGoodToBeTrue,
  detectUrgencyLanguage,
  detectGrammarMistakes,
  detectFakeLoginPage,
  detectPopups,
  detectRedirectChains,
  detectIframeClickjacking,
};

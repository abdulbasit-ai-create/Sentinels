// ============================================================
//  Is This Legit? — backend/routes/analyze.js
//  Main analysis endpoint — orchestrates all modules
//  Now with heuristic + LLM composite scoring
// ============================================================

const express = require('express');
const router = express.Router();

const { analyzeWithAI }          = require('../modules/llm');
const { checkDomain }            = require('../modules/domain');
const { checkPhishTank }         = require('../modules/phishtank');
const { checkSafeBrowsing }      = require('../modules/safebrowsing');
const { checkUrlhaus, checkUrlhausHost } = require('../modules/urlhaus');
const { computeHeuristicScore, isTrustedDomain, extractRootDomain } = require('../modules/heuristics');

router.post('/analyze', async (req, res) => {
  const startTime = Date.now();

  try {
    const pageData = normalizePageData(req.body);

    if (!pageData?.url) {
      return res.status(400).json({ error: 'Missing URL in request body' });
    }

    if (!isValidHttpUrl(pageData.url)) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    console.log(`[Analyze] ${pageData.url}`);

    // Extract hostname for URLhaus check
    let hostname = '';
    try {
      hostname = new URL(pageData.url).hostname;
    } catch {}

    // ── 1. Parallel external lookups ────────────────────────────
    const [domainInfo, phishResult, safeBrowsingResult, urlhausResult] = await Promise.allSettled([
      checkDomain(pageData.url),
      checkPhishTank(pageData.url),
      checkSafeBrowsing(pageData.url),
      checkUrlhausHost(hostname)
    ]);

    const domain = domainInfo.status === 'fulfilled' ? domainInfo.value : {};
    const isPhishing = phishResult.status === 'fulfilled' ? phishResult.value : false;
    const isMalicious = safeBrowsingResult.status === 'fulfilled' ? safeBrowsingResult.value : false;
    const urlhausData = urlhausResult.status === 'fulfilled' ? urlhausResult.value : { found: false };
    const isInUrlhaus = urlhausData.found === true;

    // ── 2. Build enriched data object ───────────────────────────
    const enrichedData = {
      url: pageData.url,
      domain: pageData.domain,
      title: pageData.title,
      hasSSL: pageData.hasSSL,
      metaDescription: pageData.metaDescription,
      pageStats: pageData.pageStats,
      socialLinks: pageData.socialLinks,
      contactInfo: pageData.contactInfo,
      trustBadges: pageData.trustBadges,
      urlSignals: pageData.urlSignals,
      contentSignals: pageData.contentSignals,
      reviews: pageData.reviews,
      prices: pageData.prices,
      formFields: pageData.formFields,
      darkPatterns: pageData.darkPatterns,
      bodyText: pageData.bodyText,
      reviewCount: pageData.reviewCount,
      timestamp: pageData.timestamp,
      domainAge: domain.ageInDays ?? null,
      domainCreated: domain.created || null,
      registrar: domain.registrar || null,
      registrantOrg: domain.registrantOrg || null,
      nameservers: domain.nameservers || null,
      isPhishing: isPhishing || isMalicious || isInUrlhaus,
      isMalicious: isMalicious || isInUrlhaus,
      isInUrlhaus: isInUrlhaus,
      urlhausUrlCount: urlhausData.url_count || 0,
      sslDetails: {
        present: pageData.hasSSL,
        protocol: pageData.hasSSL ? 'TLS' : null,
        analyzed: true
      }
    };

    // ── 3. Run heuristic scoring + LLM analysis in parallel ─────
    const [heuristicResult, aiResult] = await Promise.all([
      Promise.resolve(computeHeuristicScore(enrichedData)),
      analyzeWithAI(enrichedData)
    ]);

    // ── 4. Composite scoring ────────────────────────────────────
    const compositeResult = computeCompositeScore(heuristicResult, aiResult, enrichedData);

    // ── 5. Merge flags ──────────────────────────────────────────
    const flags = buildFlagList(aiResult, enrichedData, domain, isPhishing, isMalicious, pageData);

    // ── 6. Build response ───────────────────────────────────────
    const result = {
      score: compositeResult.score,
      verdict: compositeResult.verdict,
      flags: [...new Set(flags)],
      summary: aiResult.summary,
      details: {
        ...(aiResult.details || {}),
        heuristicScore: heuristicResult.score,
        heuristicConfidence: heuristicResult.confidence,
        llmScore: aiResult.score,
        compositeMethod: compositeResult.method,
        isTrustedDomain: heuristicResult.isTrusted,
        signalCount: heuristicResult.signals.length
      },
      domainAge: domain.ageInDays,
      domainAgeText: formatDomainAge(domain.ageInDays),
      domainCreated: domain.created,
      registrar: domain.registrar,
      registrantOrg: domain.registrantOrg,
      isPhishing: isPhishing || isMalicious || isInUrlhaus,
      isMalicious: isMalicious || isInUrlhaus,
      isInUrlhaus: isInUrlhaus,
      urlhausUrlCount: urlhausData.url_count || 0,
      hasSSL: pageData.hasSSL,
      reviewCount: pageData.reviewCount || 0,
      darkPatternsFound: pageData.darkPatterns?.length || 0,
      analysisMs: Date.now() - startTime,
      scanTimestamp: new Date().toISOString(),
      url: pageData.url
    };

    console.log(`[Analyze] Done in ${result.analysisMs}ms — ${result.verdict} (${result.score}/100) [H:${heuristicResult.score} L:${aiResult.score} => C:${compositeResult.score}]`);
    res.json(result);

  } catch (err) {
    console.error('[Analyze] Error:', err.message, err.stack);
    // Don't leak internal error details to the client
    res.status(500).json({
      error: 'Analysis failed',
      score: 50,
      verdict: 'SUSPICIOUS',
      flags: ['Analysis error — could not complete full scan'],
      summary: 'Scan encountered an error. Results may be incomplete.'
    });
  }
});

// ── Composite Scoring Engine ─────────────────────────────────
// Merges heuristic (deterministic) and LLM (probabilistic) scores
// with weighting that depends on confidence and agreement

function computeCompositeScore(heuristic, llm, data) {
  const hScore = heuristic.score;
  const lScore = llm.score;
  const isTrusted = heuristic.isTrusted;
  const hConfidence = heuristic.confidence;

  // ── Hard overrides (non-negotiable) ───────────────────────────
  // Phishing/malware database match: cap at 15 no matter what
  if (data.isPhishing || data.isMalicious || data.isInUrlhaus) {
    const capped = Math.min(Math.min(hScore, lScore), 15);
    return { score: capped, verdict: 'SCAM', method: 'threat_db_override' };
  }

  // Trusted domain with no threats: floor at 80
  if (isTrusted && !data.isPhishing && !data.isMalicious && !data.isInUrlhaus) {
    const boosted = Math.max(Math.max(hScore, lScore), 80);
    const avg = Math.round((hScore * 0.4 + lScore * 0.6));
    const score = Math.max(avg, boosted);
    return { score: clamp(score, 80, 100), verdict: 'SAFE', method: 'trusted_domain_floor' };
  }

  // ── Weighted blend ────────────────────────────────────────────
  // Heuristic weight increases with confidence; LLM always gets some weight
  let hWeight, lWeight;

  if (hConfidence === 'high') {
    hWeight = 0.55;
    lWeight = 0.45;
  } else if (hConfidence === 'medium') {
    hWeight = 0.45;
    lWeight = 0.55;
  } else {
    // Low confidence heuristic — lean more on LLM
    hWeight = 0.35;
    lWeight = 0.65;
  }

  // If LLM returned a fallback/error, lean heavily on heuristic
  if (llm.details?.error) {
    hWeight = 0.85;
    lWeight = 0.15;
  }

  let blended = Math.round(hScore * hWeight + lScore * lWeight);

  // ── Disagreement resolution ───────────────────────────────────
  // If heuristic and LLM disagree by more than 30 points, investigate
  const gap = Math.abs(hScore - lScore);
  if (gap > 30) {
    // Use the more conservative (lower) score, but pull it slightly toward the higher
    const lower = Math.min(hScore, lScore);
    const higher = Math.max(hScore, lScore);
    blended = Math.round(lower + (higher - lower) * 0.25);
  }

  // ── Final hard caps based on critical signals ─────────────────
  const age = data.domainAge;
  if (age !== null && age !== undefined && age < 7) {
    blended = Math.min(blended, 25);
  } else if (age !== null && age !== undefined && age < 14) {
    blended = Math.min(blended, 40);
  }

  if (!data.hasSSL) {
    blended = Math.min(blended, 45);
  }

  blended = clamp(blended, 0, 100);
  const verdict = blended >= 70 ? 'SAFE' : blended >= 40 ? 'SUSPICIOUS' : 'SCAM';

  return { score: blended, verdict, method: gap > 30 ? 'conservative_blend' : 'weighted_blend' };
}

// ── Flag Builder ─────────────────────────────────────────────

function buildFlagList(aiResult, enrichedData, domain, isPhishing, isMalicious, pageData) {
  const flags = [...(aiResult.flags || [])];

  if (isPhishing) flags.unshift('URL found in PhishTank phishing database');
  if (isMalicious) flags.unshift('Flagged by Google Safe Browsing as malicious');
  
  if (enrichedData.isInUrlhaus) {
    const urlCount = enrichedData.urlhausUrlCount || 0;
    flags.unshift(`URL found in URLhaus malware database (${urlCount} URL${urlCount !== 1 ? 's' : ''} linked to this host)`);
  }
  
  if (domain.ageInDays && domain.ageInDays < 14) {
    flags.push(`Domain only ${domain.ageInDays} days old — very new`);
  } else if (domain.ageInDays && domain.ageInDays < 30) {
    flags.push(`Domain only ${domain.ageInDays} days old — recently registered`);
  }
  if (!pageData.hasSSL) flags.push('No SSL certificate — connection is not secure');

  if (enrichedData.registrantOrg && ['privacy', 'private', 'redacted'].some(k => enrichedData.registrantOrg.toLowerCase().includes(k))) {
    // Only include as a minor note, not a strong warning
    flags.push('Domain registrant info is privacy-protected (common practice)');
  }

  // Contact info flag — only for commercial pages
  const isCommercial = pageData.pageStats?.hasCheckout || pageData.pageStats?.hasCart || (pageData.prices?.length > 0);
  if (isCommercial && !pageData.contactInfo?.emails?.length && !pageData.contactInfo?.phones?.length) {
    flags.push('No visible contact information on a commercial page');
  }

  if (pageData.pageStats?.iframes > 5) {
    flags.push('Excessive iframes detected');
  }

  // New: content signal flags
  const cs = pageData.contentSignals || {};
  if (cs.hasCryptoMiner) {
    flags.unshift('Cryptocurrency miner script detected');
  }
  if (cs.hiddenIframeCount > 0) {
    flags.push(`${cs.hiddenIframeCount} hidden iframe(s) detected`);
  }
  if (cs.hasMetaRefresh) {
    flags.push('Page has automatic redirect (meta refresh)');
  }

  return flags;
}

// ── History endpoint ─────────────────────────────────────────

router.get('/history', async (req, res) => {
  res.json({ message: 'History endpoint - use extension storage for local history' });
});

module.exports = router;

// ── Data Normalization ───────────────────────────────────────

function normalizePageData(body) {
  const data = body && typeof body === 'object' ? body : {};

  return {
    url: safeString(data.url, 2048),
    domain: safeString(data.domain, 255),
    title: safeString(data.title, 200),
    hasSSL: Boolean(data.hasSSL),
    metaDescription: safeString(data.metaDescription, 300),
    pageStats: sanitizeStats(data.pageStats),
    socialLinks: sanitizeStringArray(data.socialLinks, 12, 300),
    contactInfo: sanitizeContactInfo(data.contactInfo),
    trustBadges: sanitizeStringArray(data.trustBadges, 20, 80),
    urlSignals: sanitizeUrlSignals(data.urlSignals),
    contentSignals: sanitizeContentSignals(data.contentSignals),
    reviews: sanitizeStringArray(data.reviews, 12, 400),
    prices: sanitizeStringArray(data.prices, 10, 80),
    formFields: sanitizeStringArray(data.formFields, 20, 100),
    darkPatterns: sanitizeStringArray(data.darkPatterns, 20, 200),
    bodyText: safeString(data.bodyText, 1800),
    reviewCount: Number.isFinite(data.reviewCount) ? Math.max(0, Math.min(500, data.reviewCount)) : 0,
    timestamp: Number.isFinite(data.timestamp) ? data.timestamp : Date.now()
  };
}

function safeString(val, maxLen) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function sanitizeStringArray(arr, maxItems, maxLen) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(v => typeof v === 'string')
    .map(v => v.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeContactInfo(info) {
  const data = info && typeof info === 'object' ? info : {};
  return {
    emails: sanitizeStringArray(data.emails, 5, 120),
    phones: sanitizeStringArray(data.phones, 5, 40),
    addresses: Boolean(data.addresses)
  };
}

function sanitizeStats(stats) {
  const s = stats && typeof stats === 'object' ? stats : {};
  const toInt = (v) => Number.isFinite(v) ? Math.max(0, Math.min(5000, Math.floor(v))) : 0;
  return {
    totalLinks: toInt(s.totalLinks),
    externalLinks: toInt(s.externalLinks),
    images: toInt(s.images),
    scripts: toInt(s.scripts),
    iframes: toInt(s.iframes),
    forms: toInt(s.forms),
    buttons: toInt(s.buttons),
    inputs: toInt(s.inputs),
    textLength: toInt(s.textLength),
    hasLogin: Boolean(s.hasLogin),
    hasCheckout: Boolean(s.hasCheckout),
    hasCart: Boolean(s.hasCart)
  };
}

function sanitizeUrlSignals(signals) {
  const s = signals && typeof signals === 'object' ? signals : {};
  const toInt = (v) => Number.isFinite(v) ? Math.max(0, Math.min(1000, Math.floor(v))) : 0;
  return {
    tld: safeString(s.tld, 20),
    subdomainCount: toInt(s.subdomainCount),
    hyphenCount: toInt(s.hyphenCount),
    digitCount: toInt(s.digitCount),
    length: toInt(s.length),
    longUrl: Boolean(s.longUrl),
    hasPhishyToken: Boolean(s.hasPhishyToken),
    isIPAddress: Boolean(s.isIPAddress),
    hasAtSymbol: Boolean(s.hasAtSymbol),
    hasNonASCII: Boolean(s.hasNonASCII),
    hasBase64: Boolean(s.hasBase64),
    pathDepth: toInt(s.pathDepth),
    suspiciousParamCount: toInt(s.suspiciousParamCount)
  };
}

function sanitizeContentSignals(signals) {
  const s = signals && typeof signals === 'object' ? signals : {};
  const toInt = (v) => Number.isFinite(v) ? Math.max(0, Math.min(10000, Math.floor(v))) : 0;
  const toFloat = (v) => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
  return {
    hasFavicon: Boolean(s.hasFavicon),
    hasOpenGraph: Boolean(s.hasOpenGraph),
    hasStructuredData: Boolean(s.hasStructuredData),
    hasCanonical: Boolean(s.hasCanonical),
    hasCopyright: Boolean(s.hasCopyright),
    hasPrivacyPolicy: Boolean(s.hasPrivacyPolicy),
    hasTerms: Boolean(s.hasTerms),
    hasCookieConsent: Boolean(s.hasCookieConsent),
    totalScripts: toInt(s.totalScripts),
    externalScriptCount: toInt(s.externalScriptCount),
    externalScriptRatio: toFloat(s.externalScriptRatio),
    popunderCount: toInt(s.popunderCount),
    hasCryptoMiner: Boolean(s.hasCryptoMiner),
    hasMetaRefresh: Boolean(s.hasMetaRefresh),
    wordCount: toInt(s.wordCount),
    capsRatio: toFloat(s.capsRatio),
    hiddenIframeCount: toInt(s.hiddenIframeCount)
  };
}

function isValidHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function formatDomainAge(days) {
  if (days == null || days < 0) return 'Unknown';
  if (days === 0) return 'Today';
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'}`;
  }
  const years = Math.floor(days / 365);
  const remainMonths = Math.floor((days % 365) / 30);
  if (remainMonths === 0) return `${years} year${years === 1 ? '' : 's'}`;
  return `${years} year${years === 1 ? '' : 's'}, ${remainMonths} month${remainMonths === 1 ? '' : 's'}`;
}

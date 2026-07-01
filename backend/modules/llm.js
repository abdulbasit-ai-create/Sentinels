// ============================================================
//  Is This Legit? — backend/modules/llm.js
//  AI analysis using Groq — dynamically managed models
//  With caching, rate limiting, fallback, injection protection
//  Uses model_manager for auto-discovery, fallback & tracking
// ============================================================

const Groq = require('groq-sdk');
const crypto = require('crypto');
const { isTrustedDomain, extractRootDomain } = require('./heuristics');
const modelManager = require('./model_manager');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ═══════════════════════════════════════════════════════════════
//  CACHE
// ═══════════════════════════════════════════════════════════════

const LLM_CACHE = new Map();
const LLM_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const LLM_CACHE_MAX = 200;

function getCachedResponse(cacheKey) {
  const entry = LLM_CACHE.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.ts > LLM_CACHE_TTL) {
    LLM_CACHE.delete(cacheKey);
    return null;
  }
  return entry.data;
}

function setCachedResponse(cacheKey, data) {
  if (LLM_CACHE.size > LLM_CACHE_MAX) {
    const oldest = LLM_CACHE.keys().next().value;
    if (oldest) LLM_CACHE.delete(oldest);
  }
  LLM_CACHE.set(cacheKey, { data, ts: Date.now() });
}

function getCacheStats() {
  return { size: LLM_CACHE.size, maxSize: LLM_CACHE_MAX, ttl: LLM_CACHE_TTL };
}

// ═══════════════════════════════════════════════════════════════
//  RATE LIMITING
// ═══════════════════════════════════════════════════════════════

const LLM_RATE_LIMITS = new Map();
const LLM_RATE_WINDOW = 60 * 1000; // 1 minute
const LLM_RATE_MAX = 10; // max 10 LLM calls per minute per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = LLM_RATE_LIMITS.get(ip);
  if (!entry || now - entry.reset > LLM_RATE_WINDOW) {
    LLM_RATE_LIMITS.set(ip, { count: 1, reset: now });
    return { allowed: true, remaining: LLM_RATE_MAX - 1, resetIn: LLM_RATE_WINDOW };
  }
  if (entry.count >= LLM_RATE_MAX) {
    const resetIn = LLM_RATE_WINDOW - (now - entry.reset);
    return { allowed: false, remaining: 0, resetIn };
  }
  entry.count++;
  return { allowed: true, remaining: LLM_RATE_MAX - entry.count, resetIn: LLM_RATE_WINDOW - (now - entry.reset) };
}

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of LLM_RATE_LIMITS) {
    if (now - entry.reset > LLM_RATE_WINDOW * 2) LLM_RATE_LIMITS.delete(ip);
  }
}, 5 * 60 * 1000).unref();

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT with cache + rate limit + model fallback
// ═══════════════════════════════════════════════════════════════

async function analyzeWithAI(data, clientIp = 'unknown') {
  // 1. Check rate limit
  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed && process.env.GROQ_API_KEY) {
    console.warn(`[LLM] Rate limit exceeded for ${clientIp}. Using fallback.`);
    return fallbackAnalysis(data);
  }

  // 2. Check cache
  const cacheKey = buildCacheKey(data);
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    console.log(`[LLM] Cache hit for ${data.url}`);
    return cached;
  }

  // 3. Sanitize user data for prompt injection protection
  const sanitizedData = sanitizeForPrompt(data);

  // 4. Try Groq API with model fallback chain
  try {
    const result = await queryGroq(sanitizedData);
    setCachedResponse(cacheKey, result);
    return result;
  } catch (err) {
    console.error('[LLM] All Groq models failed:', err.message);
    // 5. Fallback to keyword-based analysis
    const fallback = fallbackAnalysis(sanitizedData);
    // Don't cache fallback results
    return fallback;
  }
}

// ═══════════════════════════════════════════════════════════════
//  GROQ API CALL — uses model_manager for dynamic model selection
//  with automatic fallback through model chain + retry per model
// ═══════════════════════════════════════════════════════════════

async function queryGroq(data) {
  const prompt = buildAdvancedPrompt(data);
  const systemPrompt = buildSystemPrompt(data);

  // Get the fallback chain from model_manager
  const taskType = data.taskType || 'analysis';
  const fallbackChain = modelManager.getFallbackChain(taskType);

  console.log(`[LLM] Model fallback chain: [${fallbackChain.join(' -> ')}]`);

  let lastError;
  const modelsAttempted = [];

  // Try each model in the fallback chain
  for (const modelId of fallbackChain) {
    modelsAttempted.push(modelId);

    // Retry logic for each model (2 retries per model)
    for (let attempt = 0; attempt <= 2; attempt++) {
      const start = Date.now();
      try {
        console.log(`[LLM] Attempting model: ${modelId} (attempt ${attempt + 1})`);
        const response = await groq.chat.completions.create({
          model: modelId,
          max_tokens: 900,
          temperature: 0.1,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ]
        });

        const latency = Date.now() - start;
        const raw = response.choices[0]?.message?.content?.trim() || '{}';
        const parsed = parseLLMResponse(raw, modelId);

        if (parsed) {
          // Record success in performance tracker
          modelManager.getPerformanceTracker().recordSuccess(modelId, latency);
          console.log(`[LLM] Success with model: ${modelId} (${latency}ms)`);
          return parsed;
        }

        lastError = new Error('Failed to parse LLM response');
        console.warn(`[LLM] Model ${modelId} returned unparseable response, retrying...`);
      } catch (err) {
        const latency = Date.now() - start;
        lastError = err;
        modelManager.getPerformanceTracker().recordFailure(modelId, err);
        console.warn(`[LLM] Model ${modelId} failed after ${latency}ms: ${err.message}`);

        if (attempt < 2) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
          console.warn(`[LLM] Retry ${attempt + 1}/2 for ${modelId} after ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    // If fallback is disabled, don't try next model
    if (!modelManager.fallbackEnabled) break;
  }

  // All models exhausted
  const error = lastError || new Error('All Groq models failed after exhausting retries');
  error.modelsAttempted = modelsAttempted;
  throw error;
}

// ═══════════════════════════════════════════════════════════════
//  STRUCTURED OUTPUT PARSER with validation
// ═══════════════════════════════════════════════════════════════

function parseLLMResponse(raw, modelId) {
  // Remove markdown code fences
  let clean = raw.replace(/```json|```javascript|```/g, '').trim();

  // Try direct parse
  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    // Try to extract JSON from the text using regex
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  // Validate required fields
  const score = typeof parsed.score === 'number' ? clamp(Math.round(parsed.score), 0, 100) :
                typeof parsed.score === 'string' ? clamp(parseInt(parsed.score) || 50, 0, 100) : 50;

  const verdict = ['SAFE', 'SUSPICIOUS', 'SCAM'].includes(parsed.verdict) ? parsed.verdict : calculateVerdict(score);

  return {
    score,
    verdict,
    flags: Array.isArray(parsed.flags) ? parsed.flags.slice(0, 12) : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 300) : 'Analysis complete.',
    details: {
      aiAnalysis: parsed.analysis || null,
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors.slice(0, 10) : [],
      positiveSignals: Array.isArray(parsed.positiveSignals) ? parsed.positiveSignals.slice(0, 8) : [],
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 5) : [],
      aiProvider: 'groq',
      aiModel: modelId || 'unknown'
    }
  };
}

// ═══════════════════════════════════════════════════════════════
//  PROMPT INJECTION PROTECTION
// ═══════════════════════════════════════════════════════════════

function sanitizeForPrompt(data) {
  const sanitized = { ...data };

  // Strip any user-provided text that could contain injection
  const sanitizeStr = (str) => {
    if (typeof str !== 'string') return str || '';
    // Remove null bytes
    let s = str.replace(/\0/g, '');
    // Remove excessive newlines (could be used for injection)
    s = s.replace(/\n{3,}/g, '\n\n');
    // Truncate to safe length
    s = s.slice(0, 3000);
    // Remove common injection patterns
    s = s.replace(/ignore all previous instructions/gi, '[REDACTED]');
    s = s.replace(/ignore all prior instructions/gi, '[REDACTED]');
    s = s.replace(/you are now/gi, '[REDACTED]');
    s = s.replace(/forget everything/gi, '[REDACTED]');
    s = s.replace(/your new role is/gi, '[REDACTED]');
    s = s.replace(/you will now act as/gi, '[REDACTED]');
    return s;
  };

  sanitized.url = sanitizeStr(sanitized.url).slice(0, 2048);
  sanitized.title = sanitizeStr(sanitized.title).slice(0, 200);
  sanitized.bodyText = sanitizeStr(sanitized.bodyText).slice(0, 1500);

  // Sanitize arrays
  const sanitizeArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => typeof item === 'string' ? sanitizeStr(item).slice(0, 200) : '').filter(Boolean).slice(0, 20);
  };

  sanitized.reviews = sanitizeArray(sanitized.reviews);
  sanitized.prices = sanitizeArray(sanitized.prices);
  sanitized.formFields = sanitizeArray(sanitized.formFields);
  sanitized.darkPatterns = sanitizeArray(sanitized.darkPatterns);
  sanitized.socialLinks = sanitizeArray(sanitized.socialLinks);
  sanitized.trustBadges = sanitizeArray(sanitized.trustBadges);

  return sanitized;
}

// ═══════════════════════════════════════════════════════════════
//  FALLBACK ANALYSIS (local keyword-based when Groq unavailable)
// ═══════════════════════════════════════════════════════════════

function fallbackAnalysis(data) {
  let score = 65; // start neutral
  const flags = [];
  const riskFactors = [];
  const positiveSignals = [];
  const recommendations = [];

  const text = (data.bodyText || '').toLowerCase();
  const url = (data.url || '').toLowerCase();
  const hostname = extractHostname(data.url);
  const rootDomain = extractRootDomain(data.url);

  // ── Threat database override ──────────────────────────────────
  if (data.isPhishing || data.isMalicious) {
    score = 10;
    flags.push('Flagged in threat databases');
    riskFactors.push('Known malicious URL');
    recommendations.push('Do NOT visit this URL - it is known to be malicious');
  }

  // ── Domain age ────────────────────────────────────────────────
  const age = data.domainAge;
  if (age !== null && age !== undefined && age < 7) {
    score -= 20;
    flags.push('Extremely new domain');
    riskFactors.push('Domain registered less than 7 days ago');
  } else if (age !== null && age !== undefined && age < 30) {
    score -= 10;
    riskFactors.push('Recently registered domain');
  }

  // ── SSL ───────────────────────────────────────────────────────
  if (!data.hasSSL) {
    score -= 15;
    flags.push('No SSL certificate');
    riskFactors.push('Insecure HTTP connection');
    recommendations.push('Avoid entering personal information on non-HTTPS sites');
  }

  // ── Brand impersonation in URL ────────────────────────────────
  const knownBrands = ['paypal', 'amazon', 'netflix', 'google', 'microsoft', 'apple',
    'facebook', 'instagram', 'twitter', 'linkedin', 'whatsapp', 'youtube',
    'spotify', 'reddit', 'ebay', 'walmart', 'chase', 'wellsfargo', 'bankofamerica'];

  for (const brand of knownBrands) {
    if (hostname.includes(brand) && !rootDomain.startsWith(brand)) {
      score -= 20;
      flags.push(`"${brand}" appears in URL but domain is not legitimate`);
      riskFactors.push(`Possible ${brand} impersonation`);
      recommendations.push(`Be cautious - this URL mentions "${brand}" but may not be the real website`);
      break;
    }
  }

  // ── Urgency language ──────────────────────────────────────────
  const urgencyPatterns = ['act now', 'immediate', 'urgent', 'limited time', 'expires',
    'your account', 'suspended', 'locked', 'verify now', 'confirm now'];
  const foundUrgency = urgencyPatterns.filter(p => text.includes(p));
  if (foundUrgency.length > 2) {
    score -= 15;
    flags.push('High-pressure urgency tactics detected');
    riskFactors.push('Urgency language pressure');
  }

  // ── Scam phrases ─────────────────────────────────────────────
  const scamPatterns = ['win', 'winner', 'prize', 'lottery', 'inheritance',
    'guaranteed', 'cryptocurrency', 'bitcoin', 'wire transfer', 'money gram',
    'western union', 'gift card', 'nigerian', 'fee required'];
  const foundScam = scamPatterns.filter(p => text.includes(p));
  if (foundScam.length > 2) {
    score -= 15;
    flags.push('Common scam language patterns detected');
    riskFactors.push('Fraudulent content patterns');
  }

  // ── Sensitive form fields ─────────────────────────────────────
  const formFields = (data.formFields || []).join(' ').toLowerCase();
  if (formFields.includes('credit card') || formFields.includes('ssn') || formFields.includes('social security')) {
    score -= 15;
    flags.push('Highly sensitive information requested');
    riskFactors.push('Request for sensitive personal data');
  }

  // ── Positive signals ──────────────────────────────────────────
  if (data.hasSSL) {
    positiveSignals.push('Secure HTTPS connection');
  }
  if (age !== null && age !== undefined && age > 365) {
    positiveSignals.push('Well-established domain (over 1 year old)');
  }
  if (data.reviewCount > 10) {
    positiveSignals.push('Multiple user reviews available');
  }
  if (data.contactInfo?.emails?.length > 0) {
    positiveSignals.push('Contact email available');
  }
  if (data.trustBadges?.length > 0) {
    positiveSignals.push('Trust/badge indicators present');
  }

  // ── Clamp score ──────────────────────────────────────────────
  score = clamp(score, 0, 100);

  return {
    score,
    verdict: calculateVerdict(score),
    flags: flags.slice(0, 10),
    summary: buildFallbackSummary(score, flags),
    details: {
      aiAnalysis: buildFallbackAnalysis(score, riskFactors, positiveSignals),
      riskFactors: riskFactors.slice(0, 10),
      positiveSignals: positiveSignals.slice(0, 8),
      confidence: 'low',
      recommendations: recommendations.length > 0 ? recommendations : buildFallbackRecommendations(score),
      aiProvider: 'fallback',
      aiModel: 'local-keyword-analysis',
      note: 'LLM API unavailable - analysis based on local keyword heuristics'
    }
  };
}

function buildFallbackSummary(score, flags) {
  if (score < 40) return 'This site shows strong indicators of being a scam or phishing attempt. Exercise extreme caution.';
  if (score < 70) return 'This site shows some suspicious signals. Proceed with caution and verify legitimacy independently.';
  return 'This site appears to be legitimate based on available signals.';
}

function buildFallbackAnalysis(score, risks, positives) {
  const parts = [];
  if (score < 40) {
    parts.push('Multiple significant risk indicators detected.');
  } else if (score < 70) {
    parts.push('Some risk factors identified but no definitive scam indicators.');
  } else {
    parts.push('Site appears legitimate based on analyzed signals.');
  }
  if (risks.length > 0) parts.push(`Risks: ${risks.slice(0, 3).join(', ')}.`);
  if (positives.length > 0) parts.push(`Positives: ${positives.slice(0, 3).join(', ')}.`);
  return parts.join(' ');
}

function buildFallbackRecommendations(score) {
  if (score < 40) return ['Do NOT enter any personal information', 'Do not make payments', 'Close this website immediately'];
  if (score < 70) return ['Verify the website independently before proceeding', 'Check for official contact methods', 'Avoid entering sensitive information'];
  return ['Standard browsing precautions apply', 'Keep your browser and security software updated'];
}

// ═══════════════════════════════════════════════════════════════
//  SYSTEM PROMPT — with false-positive prevention
// ═══════════════════════════════════════════════════════════════

function buildSystemPrompt(data) {
  const rootDomain = extractRootDomain(data.url);
  const trusted = isTrustedDomain(rootDomain);

  let systemMsg = `You are a senior cybersecurity analyst specializing in website trust evaluation. Your role is to analyze webpage data and return a structured JSON trust assessment.

YOUR CORE PRINCIPLES:
1. ACCURACY over caution — minimize BOTH false positives and false negatives.
2. Context matters — a login page on a bank's own domain is normal; a login page on a random domain is suspicious.
3. Signals must be weighed in combination, not in isolation.
4. Common website features (cookies, analytics, ads) are NOT scam indicators by themselves.
5. The presence of marketing tactics (urgency, scarcity) on legitimate e-commerce sites is NORMAL and should NOT trigger low scores.

FALSE-POSITIVE PREVENTION RULES (CRITICAL):
- Well-known domains (Google, Amazon, Facebook, Microsoft, Apple, Netflix, Wikipedia, Reddit, etc.) should score 85-100 UNLESS there is evidence of compromise or phishing database flags.
- Countdown timers and urgency language on Amazon, Shopify stores, Walmart, etc. are standard e-commerce practices — do NOT flag these as scam indicators on established sites.
- WHOIS privacy protection is used by ~60% of all domains including legitimate ones — it is NOT a strong scam signal.
- Pre-checked checkboxes for newsletters are common and legal — only flag if they enable paid subscriptions without clear disclosure.
- Having many external links is normal for news sites, blogs, and aggregators.
- Cookie consent banners are a sign of COMPLIANCE, not suspicion.
- No contact information on a personal blog, wiki, or non-commercial page is not suspicious.`;

  if (trusted) {
    systemMsg += `\n\nIMPORTANT CONTEXT: The domain "${rootDomain}" is a well-known, established website. Unless the data shows it has been COMPROMISED (e.g., flagged in phishing/malware databases, injected content), your score should reflect this. Do NOT penalize trusted domains for standard features like login forms, cookie banners, analytics scripts, or marketing language. Score should be 85+ for trusted domains with no compromise indicators.`;
  }

  systemMsg += `\n\nReturn ONLY valid JSON, no markdown, no explanation outside the JSON.`;
  return systemMsg;
}

// ═══════════════════════════════════════════════════════════════
//  USER PROMPT
// ═══════════════════════════════════════════════════════════════

function buildAdvancedPrompt(data) {
  const reviewSample = data.reviews?.slice(0, 8).join('\n- ') || 'None found';
  const darkPatterns = data.darkPatterns?.join('; ') || 'None';
  const formFields = data.formFields?.join(', ') || 'None';
  const prices = data.prices?.join(', ') || 'None visible';
  const domainAgeDesc = describeDomainAge(data.domainAge);
  const pageStats = data.pageStats || {};
  const contact = data.contactInfo || {};
  const socials = data.socialLinks || [];
  const trustBadges = data.trustBadges || [];
  const urlSignals = data.urlSignals || {};
  const contentSignals = data.contentSignals || {};

  return `
Analyze this webpage for scams, fraud, phishing, and trust signals.

══════════════════════════════════════════════════════════════
PAGE INFORMATION
══════════════════════════════════════════════════════════════
URL: ${data.url}
Title: ${data.title || 'N/A'}
Domain: ${data.domain || 'Unknown'}
SSL: ${data.hasSSL ? 'HTTPS present' : 'MISSING — HTTP only'}
Domain Age: ${domainAgeDesc}
Registrar: ${data.registrar || 'Unknown'}
Creation Date: ${data.domainCreated || 'Unknown'}
Registrant Org: ${data.registrantOrg || 'Unknown'}
Nameservers: ${data.nameservers ? data.nameservers.join(', ') : 'Unknown'}
Phishing DB: ${data.isPhishing ? 'YES — FLAGGED' : 'Not found'}
Malware DB: ${data.isMalicious ? 'YES — FLAGGED' : 'Not found'}

URL Signals:
  TLD: .${urlSignals.tld || 'n/a'}
  Subdomains: ${urlSignals.subdomainCount || 0}
  Hyphens: ${urlSignals.hyphenCount || 0}
  Digits in host: ${urlSignals.digitCount || 0}
  URL length: ${urlSignals.length || 0}${urlSignals.longUrl ? ' (long)' : ''}
  Phishy path tokens: ${urlSignals.hasPhishyToken ? 'YES' : 'No'}
  IP as hostname: ${urlSignals.isIPAddress ? 'YES' : 'No'}
  @ symbol: ${urlSignals.hasAtSymbol ? 'YES' : 'No'}
  Non-ASCII hostname: ${urlSignals.hasNonASCII ? 'YES' : 'No'}
  Base64 in params: ${urlSignals.hasBase64 ? 'YES' : 'No'}
  Path depth: ${urlSignals.pathDepth || 0}
  Suspicious redirect params: ${urlSignals.suspiciousParamCount || 0}

══════════════════════════════════════════════════════════════
CONTENT ANALYSIS
══════════════════════════════════════════════════════════════
Reviews: ${data.reviewCount || 0} found
${reviewSample !== 'None found' ? `Samples:\n- ${reviewSample}` : 'No reviews'}

Prices: ${prices}
Form Fields: ${formFields}
Dark Patterns: ${darkPatterns}
Trust Badges: ${trustBadges.length ? trustBadges.join(', ') : 'None'}
Social Links: ${socials.length ? socials.join(', ') : 'None'}
Contact: ${contact.emails?.length ? 'Email found' : 'No email'} / ${contact.phones?.length ? 'Phone found' : 'No phone'} / ${contact.addresses ? 'Address found' : 'No address'}

Page Stats:
  Links: ${pageStats.totalLinks || 0} total, ${pageStats.externalLinks || 0} external
  Forms: ${pageStats.forms || 0}, Iframes: ${pageStats.iframes || 0}
  Scripts: ${pageStats.scripts || 0}, Inputs: ${pageStats.inputs || 0}
  Text length: ${pageStats.textLength || 0} chars
  Login page: ${pageStats.hasLogin ? 'Yes' : 'No'}
  Checkout page: ${pageStats.hasCheckout ? 'Yes' : 'No'}

Content Signals:
  Favicon: ${contentSignals.hasFavicon ? 'Yes' : 'No'}
  Open Graph tags: ${contentSignals.hasOpenGraph ? 'Yes' : 'No'}
  Structured data: ${contentSignals.hasStructuredData ? 'Yes' : 'No'}
  Canonical URL: ${contentSignals.hasCanonical ? 'Yes' : 'No'}
  Copyright notice: ${contentSignals.hasCopyright ? 'Yes' : 'No'}
  Privacy policy link: ${contentSignals.hasPrivacyPolicy ? 'Yes' : 'No'}
  Terms link: ${contentSignals.hasTerms ? 'Yes' : 'No'}
  Cookie consent: ${contentSignals.hasCookieConsent ? 'Yes' : 'No'}
  External script ratio: ${contentSignals.externalScriptRatio || 'N/A'}
  Hidden iframes: ${contentSignals.hiddenIframeCount || 0}
  Crypto miner: ${contentSignals.hasCryptoMiner ? 'YES' : 'No'}
  Meta refresh redirect: ${contentSignals.hasMetaRefresh ? 'YES' : 'No'}
  Word count: ${contentSignals.wordCount || 'N/A'}
  CAPS ratio: ${contentSignals.capsRatio || 'N/A'}

══════════════════════════════════════════════════════════════
PAGE TEXT (first 1500 chars)
══════════════════════════════════════════════════════════════
${(data.bodyText || '').slice(0, 1500)}

══════════════════════════════════════════════════════════════
INSTRUCTIONS
══════════════════════════════════════════════════════════════
Return JSON with this exact structure:
{
  "score": <integer 0-100>,
  "verdict": "<SAFE|SUSPICIOUS|SCAM>",
  "confidence": "<high|medium|low>",
  "flags": ["<danger signal with explanation>", ...],
  "riskFactors": ["<risk factor>", ...],
  "positiveSignals": ["<positive signal>", ...],
  "analysis": "<2-3 sentence explanation>",
  "summary": "<One clear sentence verdict>",
  "recommendations": ["<action user should take>", ...]
}

SCORING RULES (follow precisely):
  90-100: Established, trusted site with no issues. Major platforms, well-known brands.
  75-89:  Legitimate site with minor or cosmetic concerns. Newer but professional sites.
  50-74:  Multiple genuine warning signs. Proceed with caution.
  25-49:  Strong evidence of fraud, phishing, or deception.
  0-24:   Confirmed scam/phishing (database match + other signals).

VERDICT THRESHOLDS:
  SAFE: score >= 70
  SUSPICIOUS: score 40-69
  SCAM: score < 40

IMPORTANT — SCORE CALIBRATION:
- A domain flagged in phishing/malware databases → score <= 15
- A domain < 7 days old with no SSL → score <= 20
- A well-known domain (google.com, amazon.com, etc.) with no compromise → score >= 85
- Standard e-commerce dark patterns on a legitimate store → do NOT reduce below 70
- Missing contact info on a non-commercial page → no penalty
- WHOIS privacy alone → no penalty (deduct at most 2-3 points)
`;
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function buildCacheKey(data) {
  // Use domain + hash of relevant fields to build cache key
  const domain = extractRootDomain(data.url) || data.url;
  const hash = crypto.createHash('md5').update(JSON.stringify({
    url: data.url,
    hasSSL: data.hasSSL,
    domainAge: data.domainAge,
    isPhishing: data.isPhishing,
    isMalicious: data.isMalicious,
    bodyTextLen: (data.bodyText || '').length,
  })).digest('hex');
  return `${domain}:${hash}`;
}

function extractHostname(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}

function describeDomainAge(age) {
  if (age === null || age === undefined) return 'Unknown';
  if (age < 7) return `${age} days — EXTREMELY NEW`;
  if (age < 14) return `${age} days — very new`;
  if (age < 30) return `${age} days — recently registered`;
  if (age < 90) return `${age} days — fairly new`;
  if (age < 365) return `${age} days (~${Math.floor(age / 30)} months)`;
  return `${Math.floor(age / 365)}+ years — well established`;
}

function calculateVerdict(score) {
  if (score >= 70) return 'SAFE';
  if (score >= 40) return 'SUSPICIOUS';
  return 'SCAM';
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

module.exports = {
  analyzeWithAI,
  getCacheStats,
  modelManager,
  getModelSummary: () => modelManager.summarize()
};

// ============================================================
//  Sentinels — backend/modules/llm.js
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
    return fallback;
  }
}

// ═══════════════════════════════════════════════════════════════
//  GROQ API CALL
// ═══════════════════════════════════════════════════════════════

async function queryGroq(data) {
  const prompt = buildAdvancedPrompt(data);
  const systemPrompt = buildSystemPrompt(data);

  const taskType = data.taskType || 'analysis';
  const fallbackChain = modelManager.getFallbackChain(taskType);

  console.log(`[LLM] Model fallback chain: [${fallbackChain.join(' -> ')}]`);

  let lastError;
  const modelsAttempted = [];

  for (const modelId of fallbackChain) {
    modelsAttempted.push(modelId);

    for (let attempt = 0; attempt <= 2; attempt++) {
      const start = Date.now();
      try {
        console.log(`[LLM] Attempting model: ${modelId} (attempt ${attempt + 1})`);
        const response = await groq.chat.completions.create({
          model: modelId,
          max_tokens: 1200,
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

    if (!modelManager.fallbackEnabled) break;
  }

  const error = lastError || new Error('All Groq models failed after exhausting retries');
  error.modelsAttempted = modelsAttempted;
  throw error;
}

// ═══════════════════════════════════════════════════════════════
//  STRUCTURED OUTPUT PARSER with validation
// ═══════════════════════════════════════════════════════════════

function parseLLMResponse(raw, modelId) {
  let clean = raw.replace(/```json|```javascript|```/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
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

  const score = typeof parsed.score === 'number' ? clamp(Math.round(parsed.score), 0, 100) :
                typeof parsed.score === 'string' ? clamp(parseInt(parsed.score) || 50, 0, 100) : 50;

  const verdict = ['SAFE', 'SUSPICIOUS', 'SCAM'].includes(parsed.verdict) ? parsed.verdict : calculateVerdict(score);

  return {
    score,
    verdict,
    flags: Array.isArray(parsed.flags) ? parsed.flags.slice(0, 12) : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 300) : 'Analysis complete.',
    eli5: typeof parsed.eli5 === 'string' ? parsed.eli5.slice(0, 500) : generateEli5Fallback(score, verdict, parsed.flags || []),
    // New structured fields
    explanation: typeof parsed.explanation === 'string' ? parsed.explanation.slice(0, 500) : null,
    realWorldExample: typeof parsed.realWorldExample === 'string' ? parsed.realWorldExample.slice(0, 300) : null,
    riskLevel: ['low', 'medium', 'high', 'critical'].includes(parsed.riskLevel) ? parsed.riskLevel : calculateRiskLevel(score),
    actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 4) : [],
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags.slice(0, 8).map(r => ({
      icon: typeof r.icon === 'string' ? r.icon.slice(0, 4) : '⚠️',
      title: typeof r.title === 'string' ? r.title.slice(0, 60) : 'Suspicious signal',
      explanation: typeof r.explanation === 'string' ? r.explanation.slice(0, 200) : '',
      severity: ['low', 'medium', 'high', 'critical'].includes(r.severity) ? r.severity : 'medium'
    })) : [],
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

function generateEli5Fallback(score, verdict, flags) {
  if (verdict === 'SAFE' || score >= 70) {
    return 'This website looks safe! Think of it like a store in a busy mall — it has proper licenses, security cameras (SSL), and has been around long enough that other people trust it. You can browse and shop here normally.';
  }
  if (verdict === 'SCAM' || score < 40) {
    let reasons = '';
    if (flags.length > 0) {
      reasons = ' Red flags we found: ' + flags.slice(0, 3).join(', ') + '.';
    }
    return 'This website is acting suspiciously — like a street vendor who won\'t show their ID, asks for your credit card upfront, and keeps looking over their shoulder.' + reasons + ' Our advice: close this tab and don\'t share any personal info.';
  }
  let reasons = '';
  if (flags.length > 0) {
    reasons = ' Things that seem off: ' + flags.slice(0, 2).join(', ') + '.';
  }
  return 'This website gives mixed signals — like a store with a proper sign but a broken lock on the door.' + reasons + ' We recommend being careful: don\'t enter passwords or payment details until you\'re sure it\'s legit.';
}

// ═══════════════════════════════════════════════════════════════
//  PROMPT INJECTION PROTECTION
// ═══════════════════════════════════════════════════════════════

function sanitizeForPrompt(data) {
  const sanitized = { ...data };

  const sanitizeStr = (str) => {
    if (typeof str !== 'string') return str || '';
    let s = str.replace(/\0/g, '');
    s = s.replace(/\n{3,}/g, '\n\n');
    s = s.slice(0, 3000);
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
//  FALLBACK ANALYSIS
// ═══════════════════════════════════════════════════════════════

function fallbackAnalysis(data) {
  let score = 65;
  const flags = [];
  const riskFactors = [];
  const positiveSignals = [];
  const recommendations = [];

  const text = (data.bodyText || '').toLowerCase();
  const url = (data.url || '').toLowerCase();
  const hostname = extractHostname(data.url);
  const rootDomain = extractRootDomain(data.url);

  if (data.isPhishing || data.isMalicious) {
    score = 10;
    flags.push('Flagged in threat databases');
    riskFactors.push('Known malicious URL');
    recommendations.push('Do NOT visit this URL - it is known to be malicious');
  }

  const age = data.domainAge;
  if (age !== null && age !== undefined && age < 7) {
    score -= 20;
    flags.push('Extremely new domain');
    riskFactors.push('Domain registered less than 7 days ago');
  } else if (age !== null && age !== undefined && age < 30) {
    score -= 10;
    riskFactors.push('Recently registered domain');
  }

  if (!data.hasSSL) {
    score -= 15;
    flags.push('No SSL certificate');
    riskFactors.push('Insecure HTTP connection');
    recommendations.push('Avoid entering personal information on non-HTTPS sites');
  }

  const knownBrands = ['paypal', 'amazon', 'netflix', 'google', 'microsoft', 'apple',
    'facebook', 'instagram', 'twitter', 'linkedin', 'whatsapp', 'youtube',
    'spotify', 'reddit', 'ebay', 'walmart', 'chase', 'wellsfargo', 'bankofamerica'];

  for (const brand of knownBrands) {
    if (hostname.includes(brand) && !rootDomain.startsWith(brand)) {
      score -= 20;
      flags.push('"' + brand + '" appears in URL but domain is not legitimate');
      riskFactors.push('Possible ' + brand + ' impersonation');
      recommendations.push('Be cautious - this URL mentions "' + brand + '" but may not be the real website');
      break;
    }
  }

  const urgencyPatterns = ['act now', 'immediate', 'urgent', 'limited time', 'expires',
    'your account', 'suspended', 'locked', 'verify now', 'confirm now'];
  const foundUrgency = urgencyPatterns.filter(p => text.includes(p));
  if (foundUrgency.length > 2) {
    score -= 15;
    flags.push('High-pressure urgency tactics detected');
    riskFactors.push('Urgency language pressure');
  }

  const scamPatterns = ['win', 'winner', 'prize', 'lottery', 'inheritance',
    'guaranteed', 'cryptocurrency', 'bitcoin', 'wire transfer', 'money gram',
    'western union', 'gift card', 'nigerian', 'fee required'];
  const foundScam = scamPatterns.filter(p => text.includes(p));
  if (foundScam.length > 2) {
    score -= 15;
    flags.push('Common scam language patterns detected');
    riskFactors.push('Fraudulent content patterns');
  }

  const formFields = (data.formFields || []).join(' ').toLowerCase();
  if (formFields.includes('credit card') || formFields.includes('ssn') || formFields.includes('social security')) {
    score -= 15;
    flags.push('Highly sensitive information requested');
    riskFactors.push('Request for sensitive personal data');
  }

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

  score = clamp(score, 0, 100);
  const verdict = calculateVerdict(score);

  const riskLevel = calculateRiskLevel(score);

  return {
    score,
    verdict,
    flags: flags.slice(0, 10),
    summary: buildFallbackSummary(score, flags),
    eli5: generateEli5Fallback(score, verdict, flags),
    explanation: generateFallbackExplanation(score, verdict, flags),
    realWorldExample: generateFallbackRealWorldExample(verdict, score),
    riskLevel,
    actions: generateActions(verdict, riskLevel, flags),
    redFlags: generateFallbackRedFlags(flags),
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
  if (risks.length > 0) parts.push('Risks: ' + risks.slice(0, 3).join(', ') + '.');
  if (positives.length > 0) parts.push('Positives: ' + positives.slice(0, 3).join(', ') + '.');
  return parts.join(' ');
}

function buildFallbackRecommendations(score) {
  if (score < 40) return ['Do NOT enter any personal information', 'Do not make payments', 'Close this website immediately'];
  if (score < 70) return ['Verify the website independently before proceeding', 'Check for official contact methods', 'Avoid entering sensitive information'];
  return ['Standard browsing precautions apply', 'Keep your browser and security software updated'];
}

// ═══════════════════════════════════════════════════════════════
//  SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

function buildSystemPrompt(data) {
  const rootDomain = extractRootDomain(data.url);
  const trusted = isTrustedDomain(rootDomain);

  let systemMsg = 'You are a senior cybersecurity analyst specializing in website trust evaluation. Your role is to analyze webpage data and return a structured JSON trust assessment.\n\nYOUR CORE PRINCIPLES:\n1. ACCURACY over caution \u2014 minimize BOTH false positives and false negatives.\n2. Context matters \u2014 a login page on a bank\'s own domain is normal; a login page on a random domain is suspicious.\n3. Signals must be weighed in combination, not in isolation.\n4. Common website features (cookies, analytics, ads) are NOT scam indicators by themselves.\n5. The presence of marketing tactics (urgency, scarcity) on legitimate e-commerce sites is NORMAL and should NOT trigger low scores.\n\nFALSE-POSITIVE PREVENTION RULES (CRITICAL):\n- Well-known domains (Google, Amazon, Facebook, Microsoft, Apple, Netflix, Wikipedia, Reddit, etc.) should score 85-100 UNLESS there is evidence of compromise or phishing database flags.\n- Countdown timers and urgency language on Amazon, Shopify stores, Walmart, etc. are standard e-commerce practices \u2014 do NOT flag these as scam indicators on established sites.\n- WHOIS privacy protection is used by ~60% of all domains including legitimate ones \u2014 it is NOT a strong scam signal.\n- Pre-checked checkboxes for newsletters are common and legal \u2014 only flag if they enable paid subscriptions without clear disclosure.\n- Having many external links is normal for news sites, blogs, and aggregators.\n- Cookie consent banners are a sign of COMPLIANCE, not suspicion.\n- No contact information on a personal blog, wiki, or non-commercial page is not suspicious.';

  if (trusted) {
    systemMsg += '\n\nIMPORTANT CONTEXT: The domain "' + rootDomain + '" is a well-known, established website. Unless the data shows it has been COMPROMISED (e.g., flagged in phishing/malware databases, injected content), your score should reflect this. Do NOT penalize trusted domains for standard features like login forms, cookie banners, analytics scripts, or marketing language. Score should be 85+ for trusted domains with no compromise indicators.';
  }

  systemMsg += '\n\nIMPORTANT: Include ALL of these fields in your JSON:\n';
  systemMsg += '- "eli5": Explain like the user is 10 years old. Simple friendly analogies. 1-3 sentences, zero jargon.\n';
  systemMsg += '- "explanation": A plain-English paragraph explaining WHY the verdict was reached. Mention specific signals found on this page.\n';
  systemMsg += '- "realWorldExample": A relatable real-world analogy for the risk (e.g. "This is like someone wearing a fake police uniform to gain your trust"). 1 sentence.\n';
  systemMsg += '- "riskLevel": One of: "low", "medium", "high", "critical"\n';
  systemMsg += '- "actions": Array of 2-3 specific short actions the user should take. e.g. ["Safe to continue browsing", "Verify before entering passwords", "Close this website immediately"]\n';
  systemMsg += '- "redFlags": Array of objects, one per detected issue, each with: { "icon": emoji or "⚠️"/"🔴"/"🟡"/"🟢", "title": "Short 3-5 word title", "explanation": "Plain English what this means and why it matters", "severity": "low|medium|high|critical" }\n';

  systemMsg += '\n\nReturn ONLY valid JSON, no markdown, no explanation outside the JSON.';
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

  return '\nAnalyze this webpage for scams, fraud, phishing, and trust signals.\n\n' +
'PAGE INFORMATION\n' +
'URL: ' + data.url + '\n' +
'Title: ' + (data.title || 'N/A') + '\n' +
'Domain: ' + (data.domain || 'Unknown') + '\n' +
'SSL: ' + (data.hasSSL ? 'HTTPS present' : 'MISSING \u2014 HTTP only') + '\n' +
'Domain Age: ' + domainAgeDesc + '\n' +
'Registrar: ' + (data.registrar || 'Unknown') + '\n' +
'Phishing DB: ' + (data.isPhishing ? 'YES \u2014 FLAGGED' : 'Not found') + '\n' +
'Malware DB: ' + (data.isMalicious ? 'YES \u2014 FLAGGED' : 'Not found') + '\n\n' +
'Return JSON with this EXACT structure (ALL fields required):\n' +
'{\n  "score": <integer 0-100>,\n' +
'  "verdict": "<SAFE|SUSPICIOUS|SCAM>",\n' +
'  "confidence": "<high|medium|low>",\n' +
'  "eli5": "<explain-like-im-10: 1-3 sentences with simple analogy, no jargon>",\n' +
'  "explanation": "<plain English paragraph: why this verdict, what signals were found>",\n' +
'  "realWorldExample": "<one relatable real-world analogy sentence>",\n' +
'  "riskLevel": "<low|medium|high|critical>",\n' +
'  "actions": ["<specific action 1>", "<specific action 2>", "<specific action 3>"],\n' +
'  "redFlags": [\n' +
'    { "icon": "🟡", "title": "<Short title>", "explanation": "<Plain English>", "severity": "<low|medium|high|critical>" },\n' +
'    { "icon": "🔴", "title": "<Short title>", "explanation": "<Plain English>", "severity": "<low|medium|high|critical>" }\n' +
'  ],\n' +
'  "flags": ["<danger signal>", ...],\n' +
'  "riskFactors": ["<risk factor>", ...],\n' +
'  "positiveSignals": ["<positive signal>", ...],\n' +
'  "analysis": "<2-3 sentence explanation>",\n' +
'  "summary": "<One clear sentence verdict>",\n' +
'  "recommendations": ["<action>", ...]\n' +
'}\n\n' +
'SCORING RULES:\n' +
'  90-100: Established, trusted site.\n' +
'  75-89:  Legitimate site with minor concerns.\n' +
'  50-74:  Multiple warning signs. Caution.\n' +
'  25-49:  Strong evidence of fraud.\n' +
'  0-24:   Confirmed scam/phishing.\n\n' +
'VERDICT THRESHOLDS:\n' +
'  SAFE: score >= 70\n' +
'  SUSPICIOUS: score 40-69\n' +
'  SCAM: score < 40\n\n' +
'REQUIRED: eli5, explanation, realWorldExample, riskLevel, actions, and redFlags[] are ALL mandatory fields.\n' +
'redFlags should have ONE entry per distinct issue found. If the site is clean, redFlags can be an empty array.\n';
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function buildCacheKey(data) {
  const domain = extractRootDomain(data.url) || data.url;
  const hash = crypto.createHash('md5').update(JSON.stringify({
    url: data.url,
    hasSSL: data.hasSSL,
    domainAge: data.domainAge,
    isPhishing: data.isPhishing,
    isMalicious: data.isMalicious,
    bodyTextLen: (data.bodyText || '').length,
  })).digest('hex');
  return domain + ':' + hash;
}

function extractHostname(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}

function describeDomainAge(age) {
  if (age === null || age === undefined) return 'Unknown';
  if (age < 7) return age + ' days \u2014 EXTREMELY NEW';
  if (age < 14) return age + ' days \u2014 very new';
  if (age < 30) return age + ' days \u2014 recently registered';
  if (age < 90) return age + ' days \u2014 fairly new';
  if (age < 365) return age + ' days (~' + Math.floor(age / 30) + ' months)';
  return Math.floor(age / 365) + '+ years \u2014 well established';
}

function calculateVerdict(score) {
  if (score >= 70) return 'SAFE';
  if (score >= 40) return 'SUSPICIOUS';
  return 'SCAM';
}

function calculateRiskLevel(score) {
  if (score >= 80) return 'low';
  if (score >= 60) return 'medium';
  if (score >= 30) return 'high';
  return 'critical';
}

function generateActions(verdict, riskLevel, flags) {
  if (verdict === 'SAFE' || riskLevel === 'low') {
    return ['Safe to continue browsing', 'Always use common sense online'];
  }
  if (verdict === 'SCAM' || riskLevel === 'critical' || riskLevel === 'high') {
    const actions = ['Close this website immediately', 'Do NOT enter any personal information'];
    if (flags.some(f => /password|card|bank|ssn/i.test(f))) {
      actions.push('Change passwords if you already entered them');
    }
    return actions;
  }
  return ['Verify this site before entering passwords', 'Check for official contact info', 'Look up independent reviews'];
}

function generateFallbackExplanation(score, verdict, flags) {
  if (verdict === 'SAFE' || score >= 70) {
    return 'We found no significant issues with this website. It has proper security measures like HTTPS, and the domain appears legitimate. Our analysis shows it is safe to use.';
  }
  if (verdict === 'SCAM' || score < 40) {
    let sigs = '';
    if (flags.length > 0) sigs = ' Specific signals: ' + flags.slice(0, 3).join(', ') + '.';
    return 'This website shows multiple strong indicators of being malicious or fraudulent.' + sigs + ' These signals together give us high confidence this site is not trustworthy.';
  }
  let sigs = '';
  if (flags.length > 0) sigs = ' Signals include: ' + flags.slice(0, 2).join(', ') + '.';
  return 'This site has some suspicious characteristics we cannot ignore.' + sigs + ' While not definitively malicious, caution is strongly advised.';
}

function generateFallbackRealWorldExample(verdict, score) {
  if (verdict === 'SAFE' || score >= 70) {
    return 'This is like a store in a busy shopping center — it has proper licenses, security cameras, and other customers have shopped here without issues.';
  }
  if (verdict === 'SCAM' || score < 40) {
    return 'This is like someone wearing a fake police uniform and asking for your wallet — it looks official at first glance, but nothing checks out up close.';
  }
  return 'This is like a food stall with a proper menu board but no health inspection certificate — it might be fine, but you cannot be sure.';
}

function generateFallbackRedFlags(flags) {
  if (!flags || flags.length === 0) return [];
  return flags.slice(0, 8).map(f => {
    let icon = '⚠️', severity = 'medium';
    const lower = f.toLowerCase();
    if (/scam|phish|fraud|malicious|malware|danger/i.test(lower)) { icon = '🔴'; severity = 'critical'; }
    else if (/password|credential|bank|card|ssn|urgent|suspended/i.test(lower)) { icon = '🔴'; severity = 'high'; }
    else if (/fake|spoof|impersonat|deceptive|misleading/i.test(lower)) { icon = '⚠️'; severity = 'high'; }
    else if (/new domain|no ssl|suspicious/i.test(lower)) { icon = '🟡'; severity = 'medium'; }
    else { icon = '🟡'; severity = 'medium'; }
    const title = f.length > 50 ? f.slice(0, 47) + '...' : f;
    return { icon, title, explanation: f, severity };
  });
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

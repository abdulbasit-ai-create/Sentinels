// ============================================================
//  Is This Legit? — backend/modules/llm.js
//  AI analysis using Groq Llama 3.3 70B
//  With false-positive prevention & stricter scoring
// ============================================================

const Groq = require('groq-sdk');
const { isTrustedDomain, extractRootDomain } = require('./heuristics');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function analyzeWithAI(data) {
  const prompt = buildAdvancedPrompt(data);

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 900,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(data)
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const raw = response.choices[0]?.message?.content?.trim() || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const score = clamp(parseInt(parsed.score) || 50, 0, 100);

    return {
      score,
      verdict: ['SAFE', 'SUSPICIOUS', 'SCAM'].includes(parsed.verdict) ? parsed.verdict : calculateVerdict(score),
      flags: Array.isArray(parsed.flags) ? parsed.flags.slice(0, 12) : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 300) : 'Analysis complete.',
      details: {
        aiAnalysis: parsed.analysis || null,
        riskFactors: parsed.riskFactors || [],
        positiveSignals: parsed.positiveSignals || [],
        confidence: parsed.confidence || 'medium',
        recommendations: parsed.recommendations || []
      }
    };

  } catch (err) {
    console.error('[LLM] Groq API error:', err.message);
    return {
      score: 50,
      verdict: 'SUSPICIOUS',
      flags: ['AI analysis unavailable — manual review recommended'],
      summary: 'Could not complete AI analysis. Heuristic and database checks still apply.',
      details: { error: err.message }
    };
  }
}

// ── System Prompt — with false-positive prevention ───────────

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
    systemMsg += `

IMPORTANT CONTEXT: The domain "${rootDomain}" is a well-known, established website. Unless the data shows it has been COMPROMISED (e.g., flagged in phishing/malware databases, injected content), your score should reflect this. Do NOT penalize trusted domains for standard features like login forms, cookie banners, analytics scripts, or marketing language. Score should be 85+ for trusted domains with no compromise indicators.`;
  }

  systemMsg += `

Return ONLY valid JSON, no markdown, no explanation outside the JSON.`;

  return systemMsg;
}

// ── User Prompt ──────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────

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

module.exports = { analyzeWithAI };

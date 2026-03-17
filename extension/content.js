
console.log('[IsThisLegit] Content script loaded on:', window.location.href);

// ============================================================
//  Core Scraper
// ============================================================

function scrapePageData() {
  const startTime = performance.now();

  const data = {
    url: window.location.href,
    domain: window.location.hostname,
    title: document.title,
    hasSSL: window.location.protocol === 'https:',
    metaDescription: document.querySelector('meta[name="description"]')?.content || '',
    metaKeywords: document.querySelector('meta[name="keywords"]')?.content || '',
    metaAuthor: document.querySelector('meta[name="author"]')?.content || '',

    reviews: extractReviews(),
    prices: extractPrices(),
    formFields: extractFormFields(),
    darkPatterns: detectDarkPatterns(),

    pageStats: analyzePageStructure(),
    socialLinks: extractSocialLinks(),
    contactInfo: extractContactInfo(),
    trustBadges: extractTrustBadges(),

    urlSignals: analyzeUrlSignals(),
    contentSignals: analyzeContentSignals(),

    bodyText: sanitizeText(document.body.innerText.replace(/\s+/g, ' ').trim()).slice(0, 1500),
    reviewCount: 0,
    timestamp: Date.now(),

    scrapingTime: 0
  };

  data.reviewCount = data.reviews.length;
  data.scrapingTime = Math.round(performance.now() - startTime);
  return data;
}

// ============================================================
//  URL Signal Analysis
// ============================================================

function analyzeUrlSignals() {
  try {
    const url = new URL(window.location.href);
    const host = url.hostname;
    const domainParts = host.split('.');
    const tld = domainParts[domainParts.length - 1] || '';
    const subdomainCount = Math.max(0, domainParts.length - 2);
    const hyphenCount = (host.match(/-/g) || []).length;
    const digitCount = (host.match(/\d/g) || []).length;
    const longUrl = url.href.length > 120;

    const suspiciousTokens = ['login', 'verify', 'update', 'secure', 'account', 'billing', 'password', 'confirm', 'suspend', 'unlock', 'validate', 'authenticate'];
    const pathLower = (url.pathname + url.search).toLowerCase();
    const hasPhishyToken = suspiciousTokens.some(t => pathLower.includes(t));

    // IP address as hostname
    const isIPAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);

    // @ symbol in URL (used for deceptive redirects)
    const hasAtSymbol = window.location.href.includes('@');

    // Non-ASCII characters (homograph attacks)
    const hasNonASCII = /[^\x00-\x7F]/.test(host);

    // Base64 or encoded payloads in the URL
    const hasBase64 = /[A-Za-z0-9+/=]{40,}/.test(url.search + url.hash);

    // Path depth — deeply nested paths can indicate redirect chains
    const pathDepth = url.pathname.split('/').filter(Boolean).length;

    // Multiple query params with suspicious names
    const suspiciousParams = ['redirect', 'return', 'next', 'url', 'goto', 'dest', 'redir', 'continue'];
    const paramKeys = [...url.searchParams.keys()].map(k => k.toLowerCase());
    const suspiciousParamCount = paramKeys.filter(k => suspiciousParams.includes(k)).length;

    return {
      tld,
      subdomainCount,
      hyphenCount,
      digitCount,
      length: url.href.length,
      longUrl,
      hasPhishyToken,
      isIPAddress,
      hasAtSymbol,
      hasNonASCII,
      hasBase64,
      pathDepth,
      suspiciousParamCount
    };
  } catch {
    return {
      tld: '', subdomainCount: 0, hyphenCount: 0, digitCount: 0,
      length: 0, longUrl: false, hasPhishyToken: false,
      isIPAddress: false, hasAtSymbol: false, hasNonASCII: false,
      hasBase64: false, pathDepth: 0, suspiciousParamCount: 0
    };
  }
}

// ============================================================
//  Content Signal Analysis (new — structural trust signals)
// ============================================================

function analyzeContentSignals() {
  const signals = {};

  try {
    // Favicon presence
    signals.hasFavicon = !!(
      document.querySelector('link[rel="icon"]') ||
      document.querySelector('link[rel="shortcut icon"]') ||
      document.querySelector('link[rel="apple-touch-icon"]')
    );

    // Open Graph / social metadata
    const ogTags = document.querySelectorAll('meta[property^="og:"]');
    signals.hasOpenGraph = ogTags.length >= 2;

    // Structured data (JSON-LD, microdata)
    const jsonLd = document.querySelectorAll('script[type="application/ld+json"]');
    signals.hasStructuredData = jsonLd.length > 0;

    // Canonical URL
    signals.hasCanonical = !!document.querySelector('link[rel="canonical"]');

    // Copyright notice
    const bodyLower = document.body.innerText.toLowerCase();
    signals.hasCopyright = /©|\bcopyright\b/i.test(bodyLower);

    // Privacy policy / Terms links
    const allLinks = Array.from(document.querySelectorAll('a'));
    const linkTexts = allLinks.map(a => (a.textContent || '').toLowerCase().trim());
    const linkHrefs = allLinks.map(a => (a.href || '').toLowerCase());
    signals.hasPrivacyPolicy = linkTexts.some(t => t.includes('privacy')) || linkHrefs.some(h => h.includes('privacy'));
    signals.hasTerms = linkTexts.some(t => t.includes('terms')) || linkHrefs.some(h => h.includes('terms'));

    // Cookie consent banner
    signals.hasCookieConsent = !!(
      document.querySelector('[class*="cookie"]') ||
      document.querySelector('[id*="cookie"]') ||
      document.querySelector('[class*="consent"]') ||
      document.querySelector('[id*="consent"]') ||
      bodyLower.includes('we use cookies')
    );

    // External script ratio — lots of third-party scripts can indicate ad injection
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const hostname = window.location.hostname;
    const externalScripts = scripts.filter(s => {
      try { return !new URL(s.src).hostname.includes(hostname); } catch { return false; }
    });
    signals.totalScripts = scripts.length;
    signals.externalScriptCount = externalScripts.length;
    signals.externalScriptRatio = scripts.length > 0 ? +(externalScripts.length / scripts.length).toFixed(2) : 0;

    // Popunder / new window openers
    const onclickEls = document.querySelectorAll('[onclick*="window.open"]');
    signals.popunderCount = onclickEls.length;

    // Crypto miner detection (known scripts)
    const allScriptSrcs = scripts.map(s => s.src.toLowerCase());
    const minerDomains = ['coinhive', 'coin-hive', 'jsecoin', 'cryptoloot', 'minero', 'webminepool'];
    signals.hasCryptoMiner = allScriptSrcs.some(src => minerDomains.some(m => src.includes(m)));

    // Meta refresh redirect
    const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
    signals.hasMetaRefresh = !!metaRefresh;

    // Word count and caps ratio
    const words = document.body.innerText.split(/\s+/).filter(w => w.length > 0);
    signals.wordCount = words.length;
    const capsWords = words.filter(w => w.length > 3 && w === w.toUpperCase());
    signals.capsRatio = words.length > 0 ? +(capsWords.length / words.length).toFixed(3) : 0;

    // Hidden iframes (zero-size or off-screen)
    const iframes = Array.from(document.querySelectorAll('iframe'));
    signals.hiddenIframeCount = iframes.filter(f => {
      const style = window.getComputedStyle(f);
      const w = parseInt(style.width) || f.width || 0;
      const h = parseInt(style.height) || f.height || 0;
      return (w <= 1 && h <= 1) || style.display === 'none' || style.visibility === 'hidden';
    }).length;

  } catch (err) {
    console.warn('[IsThisLegit] Content signal error:', err.message);
  }

  return signals;
}

// ============================================================
//  Existing Extractors (enhanced)
// ============================================================

function extractReviews() {
  const selectors = [
    '[data-hook="review-body"]',
    '.review-text',
    '.comment-body',
    '[class*="review-content"]',
    '[class*="reviewText"]',
    '[itemprop="reviewBody"]',
    '.user-review',
    '[class*="review_body"]',
    '.stars',
    '[data-review]',
    '.testimonial-text',
    '.customer-review',
    '[data-star-rating]',
    '.rating-text'
  ];

  return Array.from(document.querySelectorAll(selectors.join(',')))
    .map(el => {
      const text = el.innerText.trim().slice(0, 400);
      return text;
    })
    .filter(r => r.length > 20)
    .slice(0, 15);
}

function extractPrices() {
  const selectors = [
    '.price',
    '[class*="price"]',
    '[itemprop="price"]',
    '[class*="Price"]',
    '.cost',
    '[data-price]',
    '.sale-price',
    '.current-price',
    '.product-price'
  ];

  return Array.from(document.querySelectorAll(selectors.join(',')))
    .map(el => el.innerText.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function extractFormFields() {
  const sensitiveFields = ['password', 'credit_card', 'card_number', 'cvv', 'ssn', 'social_security', 'bank_account', 'routing_number', 'pin'];
  return Array.from(document.querySelectorAll('input, select, textarea'))
    .map(i => {
      const type = i.type || i.tagName;
      const name = (i.name || i.placeholder || i.id || '').toLowerCase();
      const isSensitive = sensitiveFields.some(s => name.includes(s) || type.includes(s));
      const formAction = i.closest('form')?.action || '';
      const isCrossDomain = formAction && !formAction.includes(window.location.hostname);
      let tag = `${type}:${i.name || i.placeholder || i.id || ''}`;
      if (isSensitive) tag += ':SENSITIVE';
      if (isCrossDomain) tag += ':CROSSDOMAIN';
      return tag;
    })
    .filter(Boolean)
    .slice(0, 20);
}

function extractSocialLinks() {
  const socialDomains = ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com'];

  return Array.from(document.querySelectorAll('a[href]'))
    .map(a => a.href)
    .filter(h => socialDomains.some(d => h.includes(d)))
    .slice(0, 10);
}

function extractContactInfo() {
  const contactPatterns = {
    phone: /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g,
    email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    address: /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct)/gi
  };

  const bodyText = document.body.innerText;
  const phones = (bodyText.match(contactPatterns.phone) || []).slice(0, 5);
  const emails = (bodyText.match(contactPatterns.email) || []).slice(0, 5);
  const addresses = (bodyText.match(contactPatterns.address) || []).slice(0, 3);

  return { phones, emails, addresses: addresses.length > 0 };
}

function extractTrustBadges() {
  const badgeKeywords = [
    'ssl', 'secure', 'encrypted', 'verified', 'trusted', 'norton', 'mcafee',
    'bbb', 'better business', 'paypal', 'visa', 'mastercard', 'amex',
    'privacy policy', 'terms of service', 'refund', 'guarantee', 'money back'
  ];

  const badges = [];
  const allText = document.body.innerText.toLowerCase();

  badgeKeywords.forEach(keyword => {
    if (allText.includes(keyword)) {
      badges.push(keyword);
    }
  });

  return badges.slice(0, 15);
}

function analyzePageStructure() {
  const stats = {
    totalLinks: document.querySelectorAll('a[href]').length,
    externalLinks: 0,
    images: document.querySelectorAll('img').length,
    scripts: document.querySelectorAll('script').length,
    iframes: document.querySelectorAll('iframe').length,
    forms: document.querySelectorAll('form').length,
    buttons: document.querySelectorAll('button').length,
    inputs: document.querySelectorAll('input').length,
    textLength: document.body.innerText.length,
    hasLogin: false,
    hasCheckout: false,
    hasCart: false
  };

  const hostname = window.location.hostname;
  stats.externalLinks = Array.from(document.querySelectorAll('a[href]'))
    .filter(a => a.href.startsWith('http') && !a.href.includes(hostname)).length;

  const lowerText = document.body.innerText.toLowerCase();
  stats.hasLogin = /login|sign in|log in|register|sign up/i.test(lowerText);
  stats.hasCheckout = /checkout|buy now|add to cart|purchase/i.test(lowerText);
  stats.hasCart = /cart|basket|shopping/i.test(lowerText);

  return stats;
}

// ============================================================
//  Dark Pattern Detection (expanded to 18 categories)
// ============================================================

function detectDarkPatterns() {
  const patterns = [];
  const bodyText = document.body.innerText.toLowerCase();
  const html = document.body.innerHTML.toLowerCase();

  // 1. Countdown timers
  const timers = document.querySelectorAll('[class*="countdown"], [class*="timer"], [id*="countdown"], [class*="limited-time"]');
  if (timers.length > 0) {
    patterns.push(`Countdown timer detected (${timers.length} elements)`);
  }

  // 2. Scarcity messaging
  const scarcityPhrases = [
    'only 1 left', 'only 2 left', 'only 3 left', 'only few left',
    'last one', 'selling fast', 'almost gone', 'high demand',
    'limited quantity', 'running out'
  ];
  const scarcityMatches = scarcityPhrases.filter(p => bodyText.includes(p));
  if (scarcityMatches.length > 0) {
    patterns.push(`Scarcity messaging (${scarcityMatches.slice(0, 3).join(', ')})`);
  }

  // 3. Pre-checked checkboxes
  const preChecked = Array.from(document.querySelectorAll('input[type="checkbox"]'))
    .filter(cb => cb.checked);
  if (preChecked.length > 0) {
    patterns.push(`Pre-checked checkboxes (${preChecked.length})`);
  }

  // 4. Guilt-trip opt-out (confirm-shaming)
  const guiltPhrases = [
    'no thanks', "i don't want", 'no, i hate', 'i prefer to pay more',
    'no thank you', "i don't want to", "i'll stick with",
    'no, i want to pay full', 'i don\'t like saving', 'no, i prefer'
  ];
  if (guiltPhrases.some(p => bodyText.includes(p))) {
    patterns.push('Guilt-trip / confirm-shaming opt-out language');
  }

  // 5. Urgency triggers
  const urgencyPhrases = [
    'act now', 'limited time', 'expires today', 'offer ends',
    "don't miss", 'hurry', 'last chance', 'today only',
    'while supplies last', 'ending soon', 'offer expires in'
  ];
  const urgencyCount = urgencyPhrases.filter(p => bodyText.includes(p)).length;
  if (urgencyCount >= 2) {
    patterns.push(`Urgency triggers (${urgencyCount} found)`);
  }

  // 6. Hidden/tiny text
  const tinyText = Array.from(document.querySelectorAll('*')).filter(el => {
    try {
      const style = window.getComputedStyle(el);
      return parseFloat(style.fontSize) < 8 && el.innerText?.trim().length > 10;
    } catch { return false; }
  });
  if (tinyText.length > 1) {
    patterns.push(`Hidden/difficult-to-read text (${tinyText.length} elements)`);
  }

  // 7. Excessive modals/popups
  const modals = document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="overlay"], [class*="dialog"]');
  if (modals.length > 2) {
    patterns.push(`Multiple pop-ups/modals (${modals.length})`);
  }

  // 8. Obfuscated/redirect links
  const obfuscatedLinks = Array.from(document.querySelectorAll('a[href]')).filter(a => {
    return a.href.includes('click') || a.href.includes('redirect') || a.href.includes('track');
  });
  if (obfuscatedLinks.length > 3) {
    patterns.push(`Obfuscated/redirecting links (${obfuscatedLinks.length})`);
  }

  // 9. Misleading close buttons
  const fakeCloseBtns = document.querySelectorAll('[class*="close"]:not(button):not(.close), [class*="no-thank"]');
  if (fakeCloseBtns.length > 0) {
    patterns.push('Misleading close buttons detected');
  }

  // 10. Hidden costs
  const hiddenCosts = bodyText.match(/\$[0-9.]+\s*(shipping|handling|processing|fee)/gi);
  if (hiddenCosts && hiddenCosts.length > 0) {
    patterns.push(`Potential hidden costs: ${hiddenCosts.slice(0, 2).join(', ')}`);
  }

  // 11. Copycat branding
  const copycatBranding = detectCopycatBranding();
  if (copycatBranding) {
    patterns.push(`Potential copycat branding: ${copycatBranding}`);
  }

  // 12. Deceptive form issues
  const deceptiveForms = detectDeceptiveForms();
  if (deceptiveForms.length > 0) {
    patterns.push(...deceptiveForms);
  }

  // ── NEW CATEGORIES (13–18) ──────────────────────────────────

  // 13. Fake social proof ("X people are viewing this", "John from NY just purchased...")
  const socialProofPatterns = [
    /\d+\s*people?\s*(are|is)\s*(viewing|watching|looking)/i,
    /\w+\s+from\s+\w+\s+just\s+(purchased|bought|ordered)/i,
    /\d+\s*customer(s)?\s*(recently\s+)?(bought|purchased|ordered)/i,
    /someone\s+in\s+\w+\s+(just\s+)?(bought|purchased)/i
  ];
  const hasFakeSocial = socialProofPatterns.some(p => p.test(document.body.innerText));
  if (hasFakeSocial) {
    patterns.push('Fake social proof notifications detected');
  }

  // 14. Deceptive button styling (small decline, large accept)
  try {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"], .btn, [class*="button"]'));
    const acceptKeywords = ['accept', 'agree', 'yes', 'allow', 'subscribe', 'continue', 'ok'];
    const declineKeywords = ['decline', 'reject', 'no', 'deny', 'cancel', 'skip', 'later'];
    let deceptiveButtonPair = false;
    for (const btn of buttons) {
      const text = (btn.textContent || '').toLowerCase().trim();
      if (acceptKeywords.some(k => text.includes(k))) {
        const style = window.getComputedStyle(btn);
        const fontSize = parseFloat(style.fontSize);
        // Find any nearby decline button that is significantly smaller
        const parent = btn.parentElement;
        if (parent) {
          const siblings = Array.from(parent.querySelectorAll('button, [role="button"], .btn, [class*="button"]'));
          for (const sib of siblings) {
            const sibText = (sib.textContent || '').toLowerCase().trim();
            if (declineKeywords.some(k => sibText.includes(k))) {
              const sibStyle = window.getComputedStyle(sib);
              const sibFontSize = parseFloat(sibStyle.fontSize);
              if (fontSize > sibFontSize * 1.4 || (style.fontWeight >= 600 && sibStyle.color.includes('0.') )) {
                deceptiveButtonPair = true;
                break;
              }
            }
          }
        }
      }
      if (deceptiveButtonPair) break;
    }
    if (deceptiveButtonPair) {
      patterns.push('Deceptive button styling (accept much more prominent than decline)');
    }
  } catch { /* ignore styling check errors */ }

  // 15. Forced action / road-blocking (must sign up to see content, overlay blocking page)
  const roadBlocks = document.querySelectorAll(
    '[class*="paywall"], [class*="login-wall"], [class*="signup-wall"], [class*="gate"], [class*="blocking-overlay"]'
  );
  if (roadBlocks.length > 0) {
    patterns.push('Forced action / road-blocking elements detected');
  }

  // 16. Hidden iframes (1x1 pixel, display:none)
  const iframes = Array.from(document.querySelectorAll('iframe'));
  const hiddenIframes = iframes.filter(f => {
    try {
      const style = window.getComputedStyle(f);
      const w = parseInt(style.width) || parseInt(f.getAttribute('width')) || 0;
      const h = parseInt(style.height) || parseInt(f.getAttribute('height')) || 0;
      return (w <= 1 && h <= 1) || style.display === 'none' || style.visibility === 'hidden';
    } catch { return false; }
  });
  if (hiddenIframes.length > 0) {
    patterns.push(`Hidden iframes detected (${hiddenIframes.length})`);
  }

  // 17. Crypto-only payment
  const cryptoPayment = ['bitcoin only', 'btc only', 'crypto only', 'cryptocurrency only', 'pay with bitcoin', 'send btc to'];
  if (cryptoPayment.some(p => bodyText.includes(p))) {
    patterns.push('Cryptocurrency-only payment option detected');
  }

  // 18. Form submitting to a different domain (cross-domain form action)
  const forms = document.querySelectorAll('form[action]');
  const hostname = window.location.hostname;
  const crossDomainForms = Array.from(forms).filter(f => {
    try {
      const action = new URL(f.action, window.location.href);
      return action.hostname !== hostname && action.hostname !== '';
    } catch { return false; }
  });
  if (crossDomainForms.length > 0) {
    patterns.push(`Form submitting to external domain (${crossDomainForms.length})`);
  }

  return patterns;
}

function detectCopycatBranding() {
  const trustedBrands = ['amazon', 'apple', 'google', 'microsoft', 'facebook', 'netflix', 'paypal', 'stripe', 'shopify', 'ebay'];
  const domain = window.location.hostname.toLowerCase();

  for (const brand of trustedBrands) {
    if (domain.includes(brand) && !domain.endsWith(brand + '.com') && !domain.includes(brand + '.co')) {
      return brand + ' (possible brand impersonation)';
    }
  }
  return null;
}

function detectDeceptiveForms() {
  const issues = [];
  const forms = document.querySelectorAll('form');

  forms.forEach((form, i) => {
    const hasPassword = form.querySelector('input[type="password"]');
    const hasEmail = form.querySelector('input[type="email"]');
    const submitBtn = form.querySelector('button, input[type="submit"]');

    if (hasPassword && !submitBtn?.innerText?.toLowerCase().includes('login')) {
      issues.push(`Form ${i + 1}: Password field without clear login action`);
    }
  });

  return issues;
}

// ============================================================
//  Sanitizer
// ============================================================

function sanitizeText(text) {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[CARD]')
    .replace(/\b\d{9,}\b/g, '[NUMBER]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
}

// ============================================================
//  Message Listener & Highlight System
// ============================================================

try {
  console.log('[IsThisLegit] Setting up message listener');

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('[IsThisLegit] Message received:', msg.type);

    if (msg.type === 'PING') {
      sendResponse({ alive: true });
      return;
    }

    if (msg.type === 'SCRAPE') {
      try {
        const data = scrapePageData();
        console.log('[IsThisLegit] Scraped successfully, reviews:', data.reviewCount, 'dark patterns:', data.darkPatterns.length);
        sendResponse({ success: true, data });
      } catch (err) {
        console.error('[IsThisLegit] Scrape error:', err);
        sendResponse({ success: false, error: err.message });
      }
    } else if (msg.type === 'HIGHLIGHT') {
      highlightSuspiciousElements(msg.flags);
      sendResponse({ success: true });
    } else if (msg.type === 'CLEAR_HIGHLIGHTS') {
      clearHighlights();
      sendResponse({ success: true });
    }

    return true;
  });

function highlightSuspiciousElements(flags) {
  clearHighlights();

  const style = document.createElement('style');
  style.id = 'itl-styles';
  style.textContent = `
    .itl-warning-banner {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 2147483647 !important;
      background: #ef4444 !important;
      color: white !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      padding: 10px 20px !important;
      text-align: center !important;
      letter-spacing: 0.2px !important;
      box-shadow: 0 2px 12px rgba(239,68,68,0.35) !important;
      backdrop-filter: blur(8px) !important;
    }
    .itl-suspicious-text {
      background: rgba(245, 158, 11, 0.15) !important;
      border-bottom: 2px solid rgba(245, 158, 11, 0.6) !important;
      border-radius: 2px !important;
      transition: background 0.2s ease !important;
    }
    .itl-suspicious-text:hover {
      background: rgba(245, 158, 11, 0.25) !important;
    }
    .itl-dark-pattern {
      outline: 2px solid rgba(239, 68, 68, 0.7) !important;
      outline-offset: 2px !important;
      background: rgba(239, 68, 68, 0.06) !important;
      border-radius: 4px !important;
      transition: outline-color 0.2s ease !important;
    }
    .itl-dark-pattern:hover {
      outline-color: rgba(239, 68, 68, 1) !important;
      background: rgba(239, 68, 68, 0.12) !important;
    }
  `;
  document.head.appendChild(style);

  if (flags && flags.length > 0) {
    const banner = document.createElement('div');
    banner.className = 'itl-warning-banner';
    banner.id = 'itl-banner';
    const warningText = `⚠️ Is This Legit? detected ${flags.length} warning${flags.length > 1 ? 's' : ''} on this page`;
    banner.textContent = warningText;
    document.body.prepend(banner);
  }

  document.querySelectorAll('[class*="countdown"], [class*="timer"], [class*="limited-time"]').forEach(el => {
    el.classList.add('itl-dark-pattern');
  });

  document.querySelectorAll('input[type="checkbox"]:checked').forEach(el => {
    el.classList.add('itl-dark-pattern');
  });
}

function clearHighlights() {
  document.getElementById('itl-styles')?.remove();
  document.getElementById('itl-banner')?.remove();
  document.querySelectorAll('.itl-warning-banner, .itl-suspicious-text, .itl-dark-pattern')
    .forEach(el => {
      el.classList.remove('itl-warning-banner', 'itl-suspicious-text', 'itl-dark-pattern');
    });
}

} catch (err) {
  console.error('[IsThisLegit] Content script error:', err);
}

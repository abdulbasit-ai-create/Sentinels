
console.log('[Sentinels] Content script loaded on:', window.location.href);

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

    scrapingTime: 0,

    // ── New: Additional scan data ──
    clickjackingDetected: false,
    credentialFieldsDetected: [],
    mismatchedLinks: []
  };

  data.reviewCount = data.reviews.length;
  data.scrapingTime = Math.round(performance.now() - startTime);

  // ── New scan passes ──
  data.clickjackingDetected = detectClickjacking();
  data.credentialFieldsDetected = detectCredentialFields();
  data.mismatchedLinks = detectMismatchedLinks();

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

    const isIPAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
    const hasAtSymbol = window.location.href.includes('@');
    const hasNonASCII = /[^\x00-\x7F]/.test(host);
    const hasBase64 = /[A-Za-z0-9+/=]{40,}/.test(url.search + url.hash);
    const pathDepth = url.pathname.split('/').filter(Boolean).length;

    const suspiciousParams = ['redirect', 'return', 'next', 'url', 'goto', 'dest', 'redir', 'continue'];
    const paramKeys = [...url.searchParams.keys()].map(k => k.toLowerCase());
    const suspiciousParamCount = paramKeys.filter(k => suspiciousParams.includes(k)).length;

    return {
      tld, subdomainCount, hyphenCount, digitCount,
      length: url.href.length, longUrl, hasPhishyToken,
      isIPAddress, hasAtSymbol, hasNonASCII, hasBase64,
      pathDepth, suspiciousParamCount
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
//  Content Signal Analysis
// ============================================================

function analyzeContentSignals() {
  const signals = {};

  try {
    signals.hasFavicon = !!(
      document.querySelector('link[rel="icon"]') ||
      document.querySelector('link[rel="shortcut icon"]') ||
      document.querySelector('link[rel="apple-touch-icon"]')
    );

    const ogTags = document.querySelectorAll('meta[property^="og:"]');
    signals.hasOpenGraph = ogTags.length >= 2;

    const jsonLd = document.querySelectorAll('script[type="application/ld+json"]');
    signals.hasStructuredData = jsonLd.length > 0;

    signals.hasCanonical = !!document.querySelector('link[rel="canonical"]');

    const bodyLower = document.body.innerText.toLowerCase();
    signals.hasCopyright = /©|\bcopyright\b/i.test(bodyLower);

    const allLinks = Array.from(document.querySelectorAll('a'));
    const linkTexts = allLinks.map(a => (a.textContent || '').toLowerCase().trim());
    const linkHrefs = allLinks.map(a => (a.href || '').toLowerCase());
    signals.hasPrivacyPolicy = linkTexts.some(t => t.includes('privacy')) || linkHrefs.some(h => h.includes('privacy'));
    signals.hasTerms = linkTexts.some(t => t.includes('terms')) || linkHrefs.some(h => h.includes('terms'));

    signals.hasCookieConsent = !!(
      document.querySelector('[class*="cookie"]') ||
      document.querySelector('[id*="cookie"]') ||
      document.querySelector('[class*="consent"]') ||
      document.querySelector('[id*="consent"]') ||
      bodyLower.includes('we use cookies')
    );

    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const hostname = window.location.hostname;
    const externalScripts = scripts.filter(s => {
      try { return !new URL(s.src).hostname.includes(hostname); } catch { return false; }
    });
    signals.totalScripts = scripts.length;
    signals.externalScriptCount = externalScripts.length;
    signals.externalScriptRatio = scripts.length > 0 ? +(externalScripts.length / scripts.length).toFixed(2) : 0;

    const onclickEls = document.querySelectorAll('[onclick*="window.open"]');
    signals.popunderCount = onclickEls.length;

    const allScriptSrcs = scripts.map(s => s.src.toLowerCase());
    const minerDomains = ['coinhive', 'coin-hive', 'jsecoin', 'cryptoloot', 'minero', 'webminepool'];
    signals.hasCryptoMiner = allScriptSrcs.some(src => minerDomains.some(m => src.includes(m)));

    const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
    signals.hasMetaRefresh = !!metaRefresh;

    const words = document.body.innerText.split(/\s+/).filter(w => w.length > 0);
    signals.wordCount = words.length;
    const capsWords = words.filter(w => w.length > 3 && w === w.toUpperCase());
    signals.capsRatio = words.length > 0 ? +(capsWords.length / words.length).toFixed(3) : 0;

    const iframes = Array.from(document.querySelectorAll('iframe'));
    signals.hiddenIframeCount = iframes.filter(f => {
      const style = window.getComputedStyle(f);
      const w = parseInt(style.width) || f.width || 0;
      const h = parseInt(style.height) || f.height || 0;
      return (w <= 1 && h <= 1) || style.display === 'none' || style.visibility === 'hidden';
    }).length;
  } catch (err) {
    console.warn('[Sentinels] Content signal error:', err.message);
  }

  return signals;
}

// ============================================================
//  Existing Extractors (enhanced)
// ============================================================

function extractReviews() {
  const selectors = [
    '[data-hook="review-body"]', '.review-text', '.comment-body',
    '[class*="review-content"]', '[class*="reviewText"]',
    '[itemprop="reviewBody"]', '.user-review', '[class*="review_body"]',
    '.stars', '[data-review]', '.testimonial-text',
    '.customer-review', '[data-star-rating]', '.rating-text'
  ];

  return Array.from(document.querySelectorAll(selectors.join(',')))
    .map(el => el.innerText.trim().slice(0, 400))
    .filter(r => r.length > 20)
    .slice(0, 15);
}

function extractPrices() {
  const selectors = [
    '.price', '[class*="price"]', '[itemprop="price"]',
    '[class*="Price"]', '.cost', '[data-price]',
    '.sale-price', '.current-price', '.product-price'
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
    if (allText.includes(keyword)) badges.push(keyword);
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
  const hostname = window.location.hostname;

  // 1. Countdown timers
  const timers = document.querySelectorAll('[class*="countdown"], [class*="timer"], [id*="countdown"], [class*="limited-time"]');
  if (timers.length > 0) patterns.push(`Countdown timer detected (${timers.length} elements)`);

  // 2. Scarcity messaging
  const scarcityPhrases = ['only 1 left', 'only 2 left', 'only 3 left', 'only few left', 'last one', 'selling fast', 'almost gone', 'high demand', 'limited quantity', 'running out'];
  const scarcityMatches = scarcityPhrases.filter(p => bodyText.includes(p));
  if (scarcityMatches.length > 0) patterns.push(`Scarcity messaging (${scarcityMatches.slice(0, 3).join(', ')})`);

  // 3. Pre-checked checkboxes
  const preChecked = Array.from(document.querySelectorAll('input[type="checkbox"]')).filter(cb => cb.checked);
  if (preChecked.length > 0) patterns.push(`Pre-checked checkboxes (${preChecked.length})`);

  // 4. Guilt-trip / confirm-shaming
  const guiltPhrases = ['no thanks', "i don't want", 'no, i hate', 'i prefer to pay more', 'no thank you', "i don't want to", "i'll stick with", 'no, i want to pay full', "i don't like saving", 'no, i prefer'];
  if (guiltPhrases.some(p => bodyText.includes(p))) patterns.push('Guilt-trip / confirm-shaming opt-out language');

  // 5. Urgency triggers
  const urgencyPhrases = ['act now', 'limited time', 'expires today', 'offer ends', "don't miss", 'hurry', 'last chance', 'today only', 'while supplies last', 'ending soon', 'offer expires in'];
  const urgencyCount = urgencyPhrases.filter(p => bodyText.includes(p)).length;
  if (urgencyCount >= 2) patterns.push(`Urgency triggers (${urgencyCount} found)`);

  // 6. Hidden/tiny text
  const tinyText = Array.from(document.querySelectorAll('*')).filter(el => {
    try {
      const style = window.getComputedStyle(el);
      return parseFloat(style.fontSize) < 8 && el.innerText?.trim().length > 10;
    } catch { return false; }
  });
  if (tinyText.length > 1) patterns.push(`Hidden/difficult-to-read text (${tinyText.length} elements)`);

  // 7. Excessive modals/popups
  const modals = document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="overlay"], [class*="dialog"]');
  if (modals.length > 2) patterns.push(`Multiple pop-ups/modals (${modals.length})`);

  // 8. Obfuscated/redirect links
  const obfuscatedLinks = Array.from(document.querySelectorAll('a[href]')).filter(a => {
    return a.href.includes('click') || a.href.includes('redirect') || a.href.includes('track');
  });
  if (obfuscatedLinks.length > 3) patterns.push(`Obfuscated/redirecting links (${obfuscatedLinks.length})`);

  // 9. Misleading close buttons
  const fakeCloseBtns = document.querySelectorAll('[class*="close"]:not(button):not(.close), [class*="no-thank"]');
  if (fakeCloseBtns.length > 0) patterns.push('Misleading close buttons detected');

  // 10. Hidden costs
  const hiddenCosts = bodyText.match(/\$[0-9.]+\s*(shipping|handling|processing|fee)/gi);
  if (hiddenCosts && hiddenCosts.length > 0) patterns.push(`Potential hidden costs: ${hiddenCosts.slice(0, 2).join(', ')}`);

  // 11. Copycat branding
  const copycatBranding = detectCopycatBranding();
  if (copycatBranding) patterns.push(`Potential copycat branding: ${copycatBranding}`);

  // 12. Deceptive form issues
  const deceptiveForms = detectDeceptiveForms();
  if (deceptiveForms.length > 0) patterns.push(...deceptiveForms);

  // 13. Fake social proof
  const socialProofPatterns = [
    /\d+\s*people?\s*(are|is)\s*(viewing|watching|looking)/i,
    /\w+\s+from\s+\w+\s+just\s+(purchased|bought|ordered)/i,
    /\d+\s*customer(s)?\s*(recently\s+)?(bought|purchased|ordered)/i,
    /someone\s+in\s+\w+\s+(just\s+)?(bought|purchased)/i
  ];
  if (socialProofPatterns.some(p => p.test(document.body.innerText))) patterns.push('Fake social proof notifications detected');

  // 14. Deceptive button styling
  try {
    detectDeceptiveButtons(patterns);
  } catch { /* ignore */ }

  // 15. Forced action / road-blocking
  const roadBlocks = document.querySelectorAll('[class*="paywall"], [class*="login-wall"], [class*="signup-wall"], [class*="gate"], [class*="blocking-overlay"]');
  if (roadBlocks.length > 0) patterns.push('Forced action / road-blocking elements detected');

  // 16. Hidden iframes
  const iframes = Array.from(document.querySelectorAll('iframe'));
  const hiddenIframes = iframes.filter(f => {
    try {
      const style = window.getComputedStyle(f);
      const w = parseInt(style.width) || parseInt(f.getAttribute('width')) || 0;
      const h = parseInt(style.height) || parseInt(f.getAttribute('height')) || 0;
      return (w <= 1 && h <= 1) || style.display === 'none' || style.visibility === 'hidden';
    } catch { return false; }
  });
  if (hiddenIframes.length > 0) patterns.push(`Hidden iframes detected (${hiddenIframes.length})`);

  // 17. Crypto-only payment
  const cryptoPayment = ['bitcoin only', 'btc only', 'crypto only', 'cryptocurrency only', 'pay with bitcoin', 'send btc to'];
  if (cryptoPayment.some(p => bodyText.includes(p))) patterns.push('Cryptocurrency-only payment option detected');

  // 18. Cross-domain form action
  const forms = document.querySelectorAll('form[action]');
  const crossDomainForms = Array.from(forms).filter(f => {
    try {
      const action = new URL(f.action, window.location.href);
      return action.hostname !== hostname && action.hostname !== '';
    } catch { return false; }
  });
  if (crossDomainForms.length > 0) patterns.push(`Form submitting to external domain (${crossDomainForms.length})`);

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

function detectDeceptiveButtons(patterns) {
  const buttons = Array.from(document.querySelectorAll('button, [role="button"], .btn, [class*="button"]'));
  const acceptKeywords = ['accept', 'agree', 'yes', 'allow', 'subscribe', 'continue', 'ok'];
  const declineKeywords = ['decline', 'reject', 'no', 'deny', 'cancel', 'skip', 'later'];
  let deceptiveButtonPair = false;

  for (const btn of buttons) {
    const text = (btn.textContent || '').toLowerCase().trim();
    if (acceptKeywords.some(k => text.includes(k))) {
      const style = window.getComputedStyle(btn);
      const fontSize = parseFloat(style.fontSize);
      const parent = btn.parentElement;
      if (parent) {
        const siblings = Array.from(parent.querySelectorAll('button, [role="button"], .btn, [class*="button"]'));
        for (const sib of siblings) {
          const sibText = (sib.textContent || '').toLowerCase().trim();
          if (declineKeywords.some(k => sibText.includes(k))) {
            const sibStyle = window.getComputedStyle(sib);
            const sibFontSize = parseFloat(sibStyle.fontSize);
            if (fontSize > sibFontSize * 1.4) {
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
}

// ============================================================
//  NEW: Clickjacking Detection
// ============================================================

function detectClickjacking() {
  const signals = {
    clickjackingDetected: false,
    details: []
  };

  // Check if page is being framed
  if (window !== window.top) {
    signals.clickjackingDetected = true;
    signals.details.push('Page is loaded in an iframe (possible clickjacking)');
  }

  // Check for missing X-Frame-Options equivalent
  const metas = document.querySelectorAll('meta[http-equiv]');
  let hasFrameProtection = false;
  metas.forEach(m => {
    const content = (m.getAttribute('content') || '').toLowerCase();
    if (m.getAttribute('http-equiv').toLowerCase() === 'content-security-policy' && content.includes('frame-ancestors')) {
      hasFrameProtection = true;
    }
  });

  if (!hasFrameProtection && window === window.top) {
    // Page doesn't protect itself from being framed
    signals.details.push('No frame-busting protection detected');
  }

  // Check for framebusting code
  const hasFramebusting = (
    document.querySelector('script:not([src])')?.textContent?.includes('top.location') ||
    document.querySelector('script:not([src])')?.textContent?.includes('parent.location')
  );

  if (!hasFramebusting && window === window.top) {
    signals.details.push('No framebusting JavaScript detected');
  }

  // Check for transparent overlays (clickjacking technique)
  const overlays = Array.from(document.querySelectorAll('*')).filter(el => {
    try {
      const style = window.getComputedStyle(el);
      return style.opacity === '0' && style.position === 'absolute' &&
             parseInt(style.width) > 50 && parseInt(style.height) > 50;
    } catch { return false; }
  });

  if (overlays.length > 0) {
    signals.clickjackingDetected = true;
    signals.details.push(`Transparent overlay detected (${overlays.length} elements) — possible clickjacking`);
  }

  return signals;
}

// ============================================================
//  NEW: Credential Field Detection
// ============================================================

function detectCredentialFields() {
  const credentialPatterns = [];
  const inputs = document.querySelectorAll('input');

  inputs.forEach(input => {
    const type = input.type || '';
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const autocomplete = (input.autocomplete || '').toLowerCase();
    const formAction = input.closest('form')?.action || '';
    const hostname = window.location.hostname;
    const isCrossDomain = formAction && !formAction.includes(hostname);

    // Password detection
    if (type === 'password' || name.includes('password') || id.includes('password')) {
      credentialPatterns.push({
        type: 'password',
        field: name || id || placeholder,
        crossDomain: isCrossDomain,
        severity: isCrossDomain ? 'high' : 'medium'
      });
    }

    // Credit card detection
    if (name.includes('card') || id.includes('card') || placeholder.includes('card') ||
        name.includes('cc_') || name.includes('cc-') || autocomplete === 'cc-number') {
      credentialPatterns.push({
        type: 'credit_card',
        field: name || id || placeholder,
        crossDomain: isCrossDomain,
        severity: 'high'
      });
    }

    // SSN detection
    if (name.includes('ssn') || id.includes('ssn') || placeholder.includes('ssn') ||
        name.includes('social') || id.includes('social') || placeholder.includes('social security')) {
      credentialPatterns.push({
        type: 'ssn',
        field: name || id || placeholder,
        crossDomain: isCrossDomain,
        severity: 'high'
      });
    }

    // CVV detection
    if (name.includes('cvv') || id.includes('cvv') || placeholder.includes('cvv') ||
        name.includes('cvc') || id.includes('cvc') || autocomplete === 'cc-csc') {
      credentialPatterns.push({
        type: 'cvv',
        field: name || id || placeholder,
        crossDomain: isCrossDomain,
        severity: 'high'
      });
    }

    // Bank account detection
    if (name.includes('account') || id.includes('account') || placeholder.includes('account') ||
        name.includes('routing') || id.includes('routing') || placeholder.includes('routing') ||
        name.includes('iban') || id.includes('iban')) {
      credentialPatterns.push({
        type: 'bank_account',
        field: name || id || placeholder,
        crossDomain: isCrossDomain,
        severity: 'high'
      });
    }
  });

  return credentialPatterns.slice(0, 10);
}

// ============================================================
//  NEW: Mismatched Link Detection
// ============================================================

function detectMismatchedLinks() {
  const mismatches = [];
  const links = document.querySelectorAll('a[href]');

  links.forEach(link => {
    const text = (link.textContent || '').trim();
    const href = (link.href || '').trim();

    if (!text || !href || text.length < 4) return;

    const textLower = text.toLowerCase();
    const hrefLower = href.toLowerCase();

    // Skip same-domain links and javascript: links
    if (hrefLower.startsWith('javascript') || hrefLower.startsWith('#')) return;

    // Check if text says one domain but href goes somewhere else
    const urlMatch = textLower.match(/https?:\/\/([^\/\s]+)/);
    if (urlMatch) {
      const textDomain = urlMatch[1];
      const hrefDomain = (() => {
        try { return new URL(href).hostname; } catch { return null; }
      })();
      if (hrefDomain && textDomain !== hrefDomain) {
        mismatches.push({
          text: text.slice(0, 60),
          displayedUrl: textLower.match(/https?:\/\/[^\s]+/)?.[0] || '',
          actualUrl: href.slice(0, 120),
          type: 'domain_mismatch'
        });
        return;
      }
    }

    // Check if visible link text claims to go somewhere reputable but href doesn't match
    const trustedNames = ['google', 'facebook', 'youtube', 'twitter', 'instagram', 'linkedin', 'amazon', 'paypal', 'apple', 'microsoft', 'netflix', 'github'];
    const mentionedTrusted = trustedNames.some(name => textLower.includes(name));
    if (mentionedTrusted) {
      const goesToTrusted = trustedNames.some(name => hrefLower.includes(name));
      if (!goesToTrusted) {
        mismatches.push({
          text: text.slice(0, 60),
          actualUrl: href.slice(0, 120),
          type: 'brand_mismatch'
        });
        return;
      }
    }

    // Check if text contains a URL but href redirects through a different domain
    if (textLower.includes('http') || textLower.includes('www.')) {
      const textUrl = textLower.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
      if (textUrl) {
        const textDomain = textUrl[0].replace(/^www\./, '');
        const hrefDomain = (() => {
          try { return new URL(href).hostname.replace(/^www\./, ''); } catch { return null; }
        })();
        if (hrefDomain && !hrefDomain.includes(textDomain) && !textDomain.includes(hrefDomain)) {
          mismatches.push({
            text: text.slice(0, 60),
            displayedUrl: textUrl[0],
            actualUrl: href.slice(0, 120),
            type: 'text_href_mismatch'
          });
        }
      }
    }
  });

  return mismatches.slice(0, 10);
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
//  NEW: Hover Detection System
// ============================================================

let _hoverActive = false;
let _hoverTooltip = null;
let _hoverStyles = null;

function initHoverDetection() {
  if (_hoverActive) return;
  _hoverActive = true;

  // Create tooltip element
  _hoverTooltip = document.createElement('div');
  _hoverTooltip.id = 'sent-hover-tooltip';
  _hoverTooltip.style.cssText = `
    display: none; position: fixed; z-index: 2147483647;
    background: #1a1d26; color: #f0f2f5;
    padding: 10px 14px; border-radius: 10px;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif;
    font-size: 12px; line-height: 1.5;
    max-width: 350px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    pointer-events: none;
    backdrop-filter: blur(8px);
  `;
  document.body.appendChild(_hoverTooltip);

  // Create styles
  _hoverStyles = document.createElement('style');
  _hoverStyles.id = 'sent-hover-styles';
  _hoverStyles.textContent = `
    .sent-suspicious-form {
      outline: 2px solid rgba(239, 68, 68, 0.5) !important;
      outline-offset: 2px !important;
      transition: outline-color 0.2s ease !important;
    }
    .sent-suspicious-form:hover {
      outline-color: rgba(239, 68, 68, 1) !important;
      background: rgba(239, 68, 68, 0.04) !important;
    }
    .sent-suspicious-link {
      border-bottom: 2px dashed rgba(245, 158, 11, 0.5) !important;
      transition: border-color 0.2s ease !important;
    }
    .sent-suspicious-link:hover {
      border-bottom-color: rgba(245, 158, 11, 1) !important;
    }
    .sent-mismatched-link {
      border-bottom: 2px dashed rgba(239, 68, 68, 0.6) !important;
      background: rgba(239, 68, 68, 0.05) !important;
    }
    .sent-mismatched-link:hover {
      border-bottom-color: rgba(239, 68, 68, 1) !important;
      background: rgba(239, 68, 68, 0.1) !important;
    }
    .sent-credential-field {
      outline: 2px solid rgba(245, 158, 11, 0.4) !important;
      outline-offset: 1px !important;
    }
    .sent-credential-field.credential-high {
      outline-color: rgba(239, 68, 68, 0.5) !important;
    }
  `;
  document.head.appendChild(_hoverStyles);

  // ── Form hover detection ──
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('mouseenter', onFormHover);
    form.addEventListener('mouseleave', hideHoverTooltip);
  });

  // ── Link hover detection ──
  document.querySelectorAll('a[href]').forEach(link => {
    link.addEventListener('mouseenter', onLinkHover);
    link.addEventListener('mouseleave', hideHoverTooltip);
  });

  // ── Credential field hover ──
  document.querySelectorAll('input[type="password"], input[name*="card"], input[name*="ssn"], input[name*="cvv"]').forEach(field => {
    field.classList.add('sent-credential-field');
    field.addEventListener('mouseenter', onCredentialFieldHover);
    field.addEventListener('mouseleave', hideHoverTooltip);
  });

  // MutationObserver for dynamically added elements
  const observer = new MutationObserver(() => {
    document.querySelectorAll('form:not([data-sent-initialized])').forEach(form => {
      form.setAttribute('data-sent-initialized', 'true');
      form.addEventListener('mouseenter', onFormHover);
      form.addEventListener('mouseleave', hideHoverTooltip);
    });
    document.querySelectorAll('a[href]:not([data-sent-initialized])').forEach(link => {
      link.setAttribute('data-sent-initialized', 'true');
      link.addEventListener('mouseenter', onLinkHover);
      link.addEventListener('mouseleave', hideHoverTooltip);
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// ── Form hover handler ──
function onFormHover(e) {
  const form = e.currentTarget;
  const inputs = form.querySelectorAll('input, select, textarea');
  const hasPassword = form.querySelector('input[type="password"]');
  const action = form.action || '';
  const hostname = window.location.hostname;
  const isCrossDomain = action && !action.includes(hostname);
  const method = (form.method || 'get').toUpperCase();

  const warnings = [];

  if (hasPassword) {
    form.classList.add('sent-suspicious-form');
    warnings.push('Contains password field');
    if (isCrossDomain) {
      warnings.push('⚠️ Form submits to DIFFERENT domain!');
    }
  }

  if (isCrossDomain) {
    warnings.push(`Action: ${action.slice(0, 60)}...`);
  }

  if (inputs.length > 5) {
    warnings.push(`${inputs.length} input fields`);
  }

  if (method === 'GET' && hasPassword) {
    warnings.push('⚠️ Password sent via GET (insecure)');
  }

  if (warnings.length > 0) {
    showHoverTooltip(e, '🔐 Form Analysis', warnings);
  }
}

// ── Link hover handler ──
function onLinkHover(e) {
  const link = e.currentTarget;
  const href = link.href || '';
  const text = (link.textContent || '').trim();

  if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;

  const warnings = [];
  const hostname = window.location.hostname;
  const linkHostname = (() => { try { return new URL(href).hostname; } catch { return ''; } })();

  // External link check
  if (linkHostname && !linkHostname.includes(hostname)) {
    warnings.push(`External: ${linkHostname}`);
    link.classList.add('sent-suspicious-link');
  }

  // Suspicious link patterns
  const suspiciousTerms = ['login', 'verify', 'update', 'secure', 'account', 'confirm', 'redirect'];
  const hrefLower = href.toLowerCase();
  if (suspiciousTerms.some(t => hrefLower.includes(t))) {
    warnings.push('Contains suspicious URL parameters');
    link.classList.add('sent-suspicious-link');
  }

  // Mismatched text and href
  if (text && text.length > 3) {
    const textLower = text.toLowerCase();
    const trustedNames = ['google', 'facebook', 'youtube', 'paypal', 'amazon', 'apple', 'microsoft', 'netflix', 'instagram', 'twitter'];
    const mentionsTrusted = trustedNames.some(name => textLower.includes(name));
    const goesToTrusted = trustedNames.some(name => hrefLower.includes(name));

    if (mentionsTrusted && !goesToTrusted && !linkHostname.includes(hostname)) {
      warnings.push('⚠️ Text mentions trusted brand but link goes elsewhere!');
      link.classList.add('sent-mismatched-link');
    }
  }

  // Non-HTTPS link
  if (href.startsWith('http://') && !hostname.includes('localhost')) {
    warnings.push('Not HTTPS (insecure)');
  }

  // Suspicious TLDs
  if (linkHostname) {
    const suspiciousTLDs = ['.xyz', '.top', '.club', '.online', '.click', '.link', '.download', '.review', '.win', '.bid'];
    if (suspiciousTLDs.some(tld => linkHostname.endsWith(tld))) {
      warnings.push(`Unusual TLD: ${linkHostname.split('.').pop()}`);
      link.classList.add('sent-mismatched-link');
    }
  }

  if (warnings.length > 0) {
    showHoverTooltip(e, '🔗 Link Analysis', warnings);
    e.preventDefault(); // prevent default link behavior on hover
  }
}

// ── Credential field hover handler ──
function onCredentialFieldHover(e) {
  const field = e.currentTarget;
  const name = field.name || field.id || field.placeholder || '';
  const type = field.type || 'text';
  const formAction = field.closest('form')?.action || '';
  const hostname = window.location.hostname;
  const isCrossDomain = formAction && !formAction.includes(hostname);

  const warnings = [];
  warnings.push(`Field: ${name}`);
  warnings.push(`Type: ${type}`);

  if (isCrossDomain) {
    warnings.push('⚠️ Cross-domain form!');
    field.classList.add('credential-high');
  }

  showHoverTooltip(e, '🔑 Credential Field', warnings);
}

// ── Tooltip display ──
function showHoverTooltip(e, title, warnings) {
  if (!_hoverTooltip) return;

  const lines = warnings.map(w => `<div style="padding: 2px 0; ${w.includes('⚠️') ? 'color: #f59e0b;' : ''}">${w}</div>`).join('');
  _hoverTooltip.innerHTML = `
    <div style="font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #6b8aff;">${title}</div>
    ${lines}
  `;
  _hoverTooltip.style.display = 'block';

  const x = e.clientX + 16;
  const y = e.clientY + 16;
  const maxX = window.innerWidth - 370;
  const maxY = window.innerHeight - 200;
  _hoverTooltip.style.left = Math.min(x, maxX) + 'px';
  _hoverTooltip.style.top = Math.min(y, maxY) + 'px';
}

function hideHoverTooltip() {
  if (_hoverTooltip) {
    _hoverTooltip.style.display = 'none';
  }
}

// ============================================================
//  NEW: Full-Page Visual Warning Overlay
// ============================================================

function showPageOverlay(verdict, score, flags, summary) {
  // Remove existing overlay if any
  removePageOverlay();

  if (verdict === 'SAFE') return;

  const overlay = document.createElement('div');
  overlay.id = 'sent-page-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 2147483646;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none;
  `;

  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: absolute; inset: 0;
    background: rgba(0,0,0,0.3);
    backdrop-filter: blur(2px);
  `;
  overlay.appendChild(backdrop);

  const card = document.createElement('div');
  const isScam = verdict === 'SCAM';
  const accentColor = isScam ? '#ef4444' : '#f59e0b';
  const bgColor = isScam ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)';

  card.style.cssText = `
    position: relative; z-index: 1;
    background: #1a1d26; color: #f0f2f5;
    border: 1px solid ${accentColor}44;
    border-radius: 16px; padding: 24px 28px;
    max-width: 400px; width: 90%;
    box-shadow: 0 16px 48px rgba(0,0,0,0.4);
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif;
    pointer-events: auto;
    animation: itlOverlayIn 0.3s ease;
  `;

  card.innerHTML = `
    <div style="text-align: center; margin-bottom: 16px;">
      <div style="font-size: 36px; margin-bottom: 8px;">${isScam ? '🚫' : '⚠️'}</div>
      <div style="font-size: 18px; font-weight: 700; letter-spacing: -0.5px; color: ${accentColor};">
        ${verdict} — ${score}/100
      </div>
    </div>
    ${summary ? `<div style="font-size: 13px; color: #a1a8ba; margin-bottom: 16px; text-align: center; line-height: 1.5;">${summary}</div>` : ''}
    ${flags && flags.length > 0 ? `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">Issues detected:</div>
        ${flags.slice(0, 5).map(f => `<div style="padding: 6px 10px; background: ${bgColor}; border-radius: 6px; font-size: 12px; margin-bottom: 4px; color: #d1d5db;">${f}</div>`).join('')}
      </div>
    ` : ''}
    <div style="display: flex; gap: 8px;">
      <button id="sent-overlay-dismiss" style="flex: 1; padding: 10px; background: ${accentColor}; border: none; border-radius: 8px; color: white; font-weight: 600; font-size: 12px; cursor: pointer;">Dismiss</button>
      <button id="sent-overlay-ignore" style="flex: 1; padding: 10px; background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #a1a8ba; font-weight: 500; font-size: 12px; cursor: pointer;">Ignore for this page</button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Add keyframes
  if (!document.getElementById('sent-overlay-anim')) {
    const style = document.createElement('style');
    style.id = 'sent-overlay-anim';
    style.textContent = `@keyframes itlOverlayIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`;
    document.head.appendChild(style);
  }

  // Button handlers
  document.getElementById('sent-overlay-dismiss')?.addEventListener('click', removePageOverlay);
  document.getElementById('sent-overlay-ignore')?.addEventListener('click', () => {
    removePageOverlay();
    // Don't show again for this page (session storage)
    try {
      sessionStorage.setItem('sent_ignore_' + window.location.href, 'true');
    } catch (e) {}
  });
}

function removePageOverlay() {
  document.getElementById('sent-page-overlay')?.remove();
}

// ============================================================
//  Message Listener & Highlight System
// ============================================================

try {
  console.log('[Sentinels] Setting up message listener');

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('[Sentinels] Message received:', msg.type);

    if (msg.type === 'PING') {
      sendResponse({ alive: true });
      return;
    }

    if (msg.type === 'SCRAPE') {
      try {
        const data = scrapePageData();
        console.log('[Sentinels] Scraped successfully, reviews:', data.reviewCount, 'dark patterns:', data.darkPatterns.length,
          'clickjacking:', data.clickjackingDetected?.clickjackingDetected,
          'mismatched links:', data.mismatchedLinks?.length);
        sendResponse({ success: true, data });
      } catch (err) {
        console.error('[Sentinels] Scrape error:', err);
        sendResponse({ success: false, error: err.message });
      }
    } else if (msg.type === 'HIGHLIGHT') {
      highlightSuspiciousElements(msg.flags);
      if (msg.fullResult) {
        const r = msg.fullResult;
        // Show full-page overlay for high risk
        if (r.verdict === 'SCAM' || (r.verdict === 'SUSPICIOUS' && r.score < 30)) {
          showPageOverlay(r.verdict, r.score, r.flags, r.summary);
        }
      }
      sendResponse({ success: true });
    } else if (msg.type === 'CLEAR_HIGHLIGHTS') {
      clearHighlights();
      removePageOverlay();
      sendResponse({ success: true });
    }

    return true;
  });

  // Initialize hover detection
  initHoverDetection();

function highlightSuspiciousElements(flags) {
  clearHighlights();

  const style = document.createElement('style');
  style.id = 'sent-styles';
  style.textContent = `
    .sent-warning-banner {
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
    .sent-suspicious-text {
      background: rgba(245, 158, 11, 0.15) !important;
      border-bottom: 2px solid rgba(245, 158, 11, 0.6) !important;
      border-radius: 2px !important;
      transition: background 0.2s ease !important;
    }
    .sent-suspicious-text:hover {
      background: rgba(245, 158, 11, 0.25) !important;
    }
    .sent-dark-pattern {
      outline: 2px solid rgba(239, 68, 68, 0.7) !important;
      outline-offset: 2px !important;
      background: rgba(239, 68, 68, 0.06) !important;
      border-radius: 4px !important;
      transition: outline-color 0.2s ease !important;
    }
    .sent-dark-pattern:hover {
      outline-color: rgba(239, 68, 68, 1) !important;
      background: rgba(239, 68, 68, 0.12) !important;
    }
  `;
  document.head.appendChild(style);

  if (flags && flags.length > 0) {
    const banner = document.createElement('div');
    banner.className = 'sent-warning-banner';
    banner.id = 'sent-banner';
    const warningText = `🛡️ Sentinels detected ${flags.length} warning${flags.length > 1 ? 's' : ''} on this page`;
    banner.textContent = warningText;
    document.body.prepend(banner);
  }

  document.querySelectorAll('[class*="countdown"], [class*="timer"], [class*="limited-time"]').forEach(el => {
    el.classList.add('sent-dark-pattern');
  });

  document.querySelectorAll('input[type="checkbox"]:checked').forEach(el => {
    el.classList.add('sent-dark-pattern');
  });
}

function clearHighlights() {
  document.getElementById('sent-styles')?.remove();
  document.getElementById('sent-banner')?.remove();
  document.querySelectorAll('.sent-warning-banner, .sent-suspicious-text, .sent-dark-pattern')
    .forEach(el => {
      el.classList.remove('sent-warning-banner', 'sent-suspicious-text', 'sent-dark-pattern');
    });
}

} catch (err) {
  console.error('[Sentinels] Content script error:', err);
}

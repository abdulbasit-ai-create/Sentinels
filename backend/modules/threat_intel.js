// ============================================================
//  Is This Legit? — backend/modules/threat_intel.js
//  Advanced threat intelligence aggregation & zero-day detection
//
//  Aggregates results from all sources (PhishTank, SafeBrowsing,
//  URLhaus, heuristic, LLM) into a unified threat assessment.
//  Detects zero-day phishing patterns via cross-source correlation.
// ============================================================

// ── Source reliability weights (0.0 - 1.0) ────────────────────
const SOURCE_WEIGHTS = {
  phishtank:     0.85,
  safebrowsing:  0.90,
  urlhaus:       0.80,
  heuristic:     0.70,
  llm:           0.75,
};

// ── Zero-day pattern signatures ──────────────────────────────
const ZERO_DAY_PATTERNS = [
  {
    name: 'new_domain_threat_match',
    description: 'Recently registered domain flagged by multiple threat feeds',
    check: (data) => {
      const age = data.domainAge;
      const threatMatches = [data.isPhishing, data.isMalicious, data.isInUrlhaus].filter(Boolean).length;
      return age !== null && age < 30 && threatMatches >= 1 ? { severity: 'critical', confidence: 0.9 } : null;
    }
  },
  {
    name: 'brand_impersonation_no_db_flag',
    description: 'Brand impersonation detected but not yet in threat databases — possible zero-day',
    check: (data) => {
      const hasBrandImpersonation = data.brandImpersonation?.isSuspicious || false;
      const noDbMatch = !data.isPhishing && !data.isMalicious && !data.isInUrlhaus;
      if (hasBrandImpersonation && noDbMatch) {
        return { severity: 'high', confidence: 0.75 };
      }
      return null;
    }
  },
  {
    name: 'fake_login_no_db',
    description: 'Fake login page pattern not yet flagged by threat databases',
    check: (data) => {
      const heuristicSignals = data.heuristicSignals || [];
      const hasFakeLogin = heuristicSignals.some(s => s.name === 'fake_login' && s.score < 30);
      const noDbMatch = !data.isPhishing && !data.isMalicious;
      if (hasFakeLogin && noDbMatch) {
        return { severity: 'high', confidence: 0.7 };
      }
      return null;
    }
  },
  {
    name: 'urgent_sensitive_collection',
    description: 'Urgency pressure combined with sensitive data collection — phishing precursor',
    check: (data) => {
      const hasUrgency = data.urgencyDetected || false;
      const hasSensitiveFields = data.hasSensitiveFields || false;
      const isNewDomain = data.domainAge !== null && data.domainAge < 60;
      if (hasUrgency && hasSensitiveFields && isNewDomain) {
        return { severity: 'high', confidence: 0.8 };
      }
      return null;
    }
  },
  {
    name: 'mismatched_brand_content',
    description: 'URL and page content reference different brands — possible cross-brand phishing',
    check: (data) => {
      const urlBrands = data.urlBrands || [];
      const contentBrands = data.contentBrands || [];
      if (urlBrands.length > 0 && contentBrands.length > 0) {
        const commonBrands = urlBrands.filter(b => contentBrands.includes(b));
        if (commonBrands.length === 0) {
          return { severity: 'medium', confidence: 0.6 };
        }
      }
      return null;
    }
  },
  {
    name: 'multiple_redirects_no_ssl',
    description: 'Multiple redirect parameters on non-HTTPS site — traffic interception risk',
    check: (data) => {
      const hasRedirects = data.hasRedirectParams || false;
      const noSSL = !data.hasSSL;
      const suspiciousTLD = data.suspiciousTLD || false;
      if (hasRedirects && noSSL && suspiciousTLD) {
        return { severity: 'medium', confidence: 0.65 };
      }
      return null;
    }
  },
  {
    name: 'high_entropy_brand_subdomain',
    description: 'Random-looking subdomain with brand name — typosquatting variant',
    check: (data) => {
      const highEntropy = data.entropyAnalysis?.combined > 4.0;
      const brandInHostname = data.brandImpersonation?.isSuspicious;
      if (highEntropy && brandInHostname) {
        return { severity: 'high', confidence: 0.85 };
      }
      return null;
    }
  },
  {
    name: 'crypto_miner_no_threat_flag',
    description: 'Cryptocurrency miner detected but not in any threat database — possible new campaign',
    check: (data) => {
      const hasCryptoMiner = data.contentSignals?.hasCryptoMiner || false;
      const noDbMatch = !data.isPhishing && !data.isMalicious;
      if (hasCryptoMiner && noDbMatch) {
        return { severity: 'critical', confidence: 0.9 };
      }
      return null;
    }
  },
];

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT — Aggregate & Assess
// ═══════════════════════════════════════════════════════════════

/**
 * Aggregate threat intelligence from all sources and generate
 * a comprehensive threat assessment.
 *
 * @param {Object} analysisData - Full analysis data from all modules
 * @returns {Object} { threatScore, threatLevel, zeroDayPatterns, confidence, details }
 */
function aggregateThreatIntel(analysisData) {
  const sources = extractSourceResults(analysisData);
  const weightedScore = calculateWeightedScore(sources);
  const zeroDayPatterns = detectZeroDayPatterns(analysisData);
  const confidence = calculateOverallConfidence(sources, analysisData);
  const threatLevel = classifyThreatLevel(weightedScore, zeroDayPatterns);

  return {
    threatScore: Math.round(weightedScore),
    threatLevel,
    zeroDayPatterns,
    confidence,
    sources: {
      phishtank: sources.phishtank,
      safebrowsing: sources.safebrowsing,
      urlhaus: sources.urlhaus,
      heuristic: sources.heuristic,
      llm: sources.llm,
    },
    details: {
      sourceCount: Object.values(sources).filter(s => s.available).length,
      agreementScore: calculateAgreementScore(sources),
      primaryThreat: determinePrimaryThreat(sources, zeroDayPatterns),
      recommendations: generateRecommendations(threatLevel, zeroDayPatterns),
    },
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
//  SOURCE EXTRACTION
// ═══════════════════════════════════════════════════════════════

function extractSourceResults(data) {
  return {
    phishtank: {
      available: data.isPhishing !== undefined,
      malicious: data.isPhishing === true,
      score: data.isPhishing ? 5 : 85,
      weight: SOURCE_WEIGHTS.phishtank,
    },
    safebrowsing: {
      available: data.isMalicious !== undefined,
      malicious: data.isMalicious === true,
      score: data.isMalicious ? 5 : 85,
      weight: SOURCE_WEIGHTS.safebrowsing,
    },
    urlhaus: {
      available: data.isInUrlhaus !== undefined,
      malicious: data.isInUrlhaus === true,
      score: data.isInUrlhaus ? 5 : 85,
      weight: SOURCE_WEIGHTS.urlhaus,
      urlCount: data.urlhausUrlCount || 0,
    },
    heuristic: {
      available: data.heuristicScore !== undefined,
      score: data.heuristicScore ?? 50,
      weight: SOURCE_WEIGHTS.heuristic,
      confidence: data.heuristicConfidence || 'medium',
      signalCount: data.signalCount || 0,
    },
    llm: {
      available: data.llmScore !== undefined,
      score: data.llmScore ?? 50,
      weight: SOURCE_WEIGHTS.llm,
      aiProvider: data.aiProvider || 'unknown',
    },
  };
}

// ═══════════════════════════════════════════════════════════════
//  WEIGHTED SCORE CALCULATION
// ═══════════════════════════════════════════════════════════════

function calculateWeightedScore(sources) {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [name, source] of Object.entries(sources)) {
    if (source.available) {
      // Adjust weight by confidence for heuristic
      let weight = source.weight;
      if (name === 'heuristic' && source.confidence === 'low') {
        weight *= 0.6;
      } else if (name === 'heuristic' && source.confidence === 'high') {
        weight *= 1.2;
      }
      weightedSum += source.score * weight;
      totalWeight += weight;
    }
  }

  // If no sources available, return neutral score
  if (totalWeight === 0) return 50;

  return weightedSum / totalWeight;
}

// ═══════════════════════════════════════════════════════════════
//  ZERO-DAY PATTERN DETECTION
// ═══════════════════════════════════════════════════════════════

function detectZeroDayPatterns(data) {
  const detected = [];

  for (const pattern of ZERO_DAY_PATTERNS) {
    try {
      const result = pattern.check(data);
      if (result) {
        detected.push({
          name: pattern.name,
          description: pattern.description,
          severity: result.severity,
          confidence: result.confidence,
        });
      }
    } catch (err) {
      // Skip pattern on error
      console.warn(`[ThreatIntel] Pattern check failed: ${pattern.name}`, err.message);
    }
  }

  return detected;
}

// ═══════════════════════════════════════════════════════════════
//  CONFIDENCE & AGREEMENT ANALYSIS
// ═══════════════════════════════════════════════════════════════

function calculateOverallConfidence(sources, data) {
  let confidenceFactors = 0;
  let maxFactors = 0;

  // Factor 1: Multiple sources agree
  const availableSources = Object.values(sources).filter(s => s.available).length;
  maxFactors++;
  if (availableSources >= 4) confidenceFactors++;
  else if (availableSources >= 3) confidenceFactors += 0.7;
  else if (availableSources >= 2) confidenceFactors += 0.4;

  // Factor 2: High agreement between sources
  maxFactors++;
  const agreement = calculateAgreementScore(sources);
  if (agreement >= 0.8) confidenceFactors++;
  else if (agreement >= 0.5) confidenceFactors += 0.6;
  else confidenceFactors += 0.3;

  // Factor 3: Domain age and content data available
  maxFactors++;
  if (data.domainAge !== null && data.domainAge !== undefined) confidenceFactors += 0.5;
  if (data.bodyText && data.bodyText.length > 100) confidenceFactors += 0.5;

  // Factor 4: Heuristic confidence
  maxFactors++;
  if (sources.heuristic.available) {
    if (sources.heuristic.confidence === 'high') confidenceFactors++;
    else if (sources.heuristic.confidence === 'medium') confidenceFactors += 0.6;
    else confidenceFactors += 0.3;
  }

  const overall = maxFactors > 0 ? confidenceFactors / maxFactors : 0.5;
  return parseFloat(overall.toFixed(2));
}

function calculateAgreementScore(sources) {
  const scores = Object.values(sources)
    .filter(s => s.available)
    .map(s => s.score);

  if (scores.length < 2) return 1.0; // No disagreement possible

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Convert std dev to agreement score (0-1)
  // Lower std dev = higher agreement
  // Max possible std dev is ~50 for 0-100 scale
  const agreement = Math.max(0, 1 - (stdDev / 50));
  return parseFloat(agreement.toFixed(2));
}

// ═══════════════════════════════════════════════════════════════
//  THREAT CLASSIFICATION & PRIMARY THREAT
// ═══════════════════════════════════════════════════════════════

function classifyThreatLevel(score, zeroDayPatterns) {
  const hasCriticalPattern = zeroDayPatterns.some(p => p.severity === 'critical');
  const hasHighPattern = zeroDayPatterns.some(p => p.severity === 'high');

  if (hasCriticalPattern && score < 30) return 'CRITICAL';
  if (hasCriticalPattern) return 'HIGH';
  if (hasHighPattern && score < 40) return 'HIGH';
  if (score < 20) return 'CRITICAL';
  if (score < 40) return 'HIGH';
  if (score < 60) return 'MEDIUM';
  if (score < 80) return 'LOW';
  return 'NONE';
}

function determinePrimaryThreat(sources, zeroDayPatterns) {
  // Check zero-day patterns first
  if (zeroDayPatterns.length > 0) {
    const critical = zeroDayPatterns.find(p => p.severity === 'critical');
    if (critical) return { type: 'zero_day_pattern', name: critical.name, confidence: critical.confidence };

    const high = zeroDayPatterns.find(p => p.severity === 'high');
    if (high) return { type: 'zero_day_pattern', name: high.name, confidence: high.confidence };
  }

  // Check threat databases
  if (sources.phishtank.malicious) return { type: 'threat_db', name: 'PhishTank', confidence: 0.95 };
  if (sources.safebrowsing.malicious) return { type: 'threat_db', name: 'Google Safe Browsing', confidence: 0.95 };
  if (sources.urlhaus.malicious) return { type: 'threat_db', name: 'URLhaus', confidence: 0.90 };

  // Check heuristic
  if (sources.heuristic.score < 30) return { type: 'heuristic', name: 'Heuristic Analysis', confidence: 0.7 };

  return { type: 'none', name: 'No significant threat', confidence: 1.0 };
}

// ═══════════════════════════════════════════════════════════════
//  RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════

function generateRecommendations(threatLevel, zeroDayPatterns) {
  const recommendations = [];

  if (threatLevel === 'CRITICAL') {
    recommendations.push('Do NOT visit this URL — it poses a critical security risk');
    recommendations.push('Avoid entering any personal or financial information');
    recommendations.push('Report this URL to Google Safe Browsing and PhishTank');
    recommendations.push('Run a full antivirus scan if you have already visited this page');
  } else if (threatLevel === 'HIGH') {
    recommendations.push('Exercise extreme caution — this URL shows strong scam indicators');
    recommendations.push('Verify the website identity through official channels before interacting');
    recommendations.push('Do not enter login credentials, payment info, or personal data');
    recommendations.push('Consider using a disposable email if registration is required');
  } else if (threatLevel === 'MEDIUM') {
    recommendations.push('Proceed with caution — some risk indicators detected');
    recommendations.push('Verify the site independently before sharing sensitive information');
    recommendations.push('Check for HTTPS, contact information, and privacy policy');
  } else if (threatLevel === 'LOW') {
    recommendations.push('Low risk detected — standard browsing precautions recommended');
    recommendations.push('Keep your browser and security software up to date');
  } else {
    recommendations.push('No threats detected — safe browsing');
  }

  // Add zero-day-specific recommendations
  if (zeroDayPatterns.length > 0) {
    recommendations.push('Zero-day phishing pattern detected — consider reporting to security researchers');
    if (zeroDayPatterns.some(p => p.name === 'crypto_miner_no_threat_flag')) {
      recommendations.push('Cryptocurrency mining script detected — consider using an ad-blocker or script blocker');
    }
  }

  return recommendations;
}

// ═══════════════════════════════════════════════════════════════
//  ANALYSIS INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Full call: compute heuristics combined with threat intel for details.
 */
function computeThreatIntel(heuristicResult, data) {
  const analysisData = {
    isPhishing: data.isPhishing,
    isMalicious: data.isMalicious,
    isInUrlhaus: data.isInUrlhaus,
    urlhausUrlCount: data.urlhausUrlCount,
    domainAge: data.domainAge,
    hasSSL: data.hasSSL,
    bodyText: data.bodyText,
    heuristicScore: heuristicResult.score,
    heuristicConfidence: heuristicResult.confidence,
    signalCount: heuristicResult.signals?.length || 0,
    heuristicSignals: heuristicResult.signals || [],
    brandImpersonation: data.brandImpersonation,
    entropyAnalysis: data.entropyAnalysis,
    contentSignals: data.contentSignals,
    urlSignals: data.urlSignals,
    hasSensitiveFields: data.hasSensitiveFields || false,
    urgencyDetected: data.urgencyDetected || false,
    hasRedirectParams: data.hasRedirectParams || false,
    suspiciousTLD: data.suspiciousTLD || false,
    urlBrands: data.urlBrands || [],
    contentBrands: data.contentBrands || [],
    llmScore: data.llmScore,
    aiProvider: data.aiProvider,
  };

  return aggregateThreatIntel(analysisData);
}

module.exports = {
  aggregateThreatIntel,
  computeThreatIntel,
  detectZeroDayPatterns,
  SOURCE_WEIGHTS,
  ZERO_DAY_PATTERNS,
};

// ============================================================
//  Is This Legit? — backend/modules/model_manager.js
//  Groq Model Manager — Auto-discovery, fallback, tracking
//  Supports all production + preview Groq models
// ============================================================
//
// Environment variables:
//   GROQ_MODEL              — Preferred model (default: auto-select best)
//   GROQ_API_KEY            — Required: Groq API key
//   GROQ_MODEL_FALLBACK_ENABLED — Enable fallback chain (default: true)
//   GROQ_MODEL_DISCOVERY    — Enable API-based model discovery (default: true)
//   GROQ_MODEL_MAX_RETRIES  — Max fallback retries (default: 3)
//   MODEL_CACHE_TTL_MS      — How long to cache model list (default: 3600000)
// ============================================================

const https = require('https');

// ── Model Registry ────────────────────────────────────────────
// All currently supported Groq models as of July 2026
// Sources: console.groq.com/docs/models, console.groq.com/docs/deprecations

const MODEL_REGISTRY = {
  // ── PRODUCTION MODELS ─────────────────────────────────────────
  'llama-3.1-8b-instant': {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    tier: 'production',
    speed: 560,
    contextWindow: 131072,
    maxCompletionTokens: 131072,
    pricing: { input: 0.05, output: 0.08 },
    capabilities: ['chat', 'function-calling', 'json-mode', 'tool-use'],
    deprecated: true,      // Deprecation announced June 17, 2026 - effective Aug 16, 2026
    supersededBy: 'openai/gpt-oss-20b',
    quality: 6
  },
  'llama-3.3-70b-versatile': {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    tier: 'production',
    speed: 280,
    contextWindow: 131072,
    maxCompletionTokens: 32768,
    pricing: { input: 0.59, output: 0.79 },
    capabilities: ['chat', 'function-calling', 'json-mode', 'multilingual', 'tool-use'],
    deprecated: true,      // Deprecation announced June 17, 2026 - effective Aug 16, 2026
    supersededBy: 'openai/gpt-oss-120b',
    quality: 8
  },
  'openai/gpt-oss-20b': {
    id: 'openai/gpt-oss-20b',
    name: 'GPT-OSS 20B',
    tier: 'production',
    speed: 1000,
    contextWindow: 131072,
    maxCompletionTokens: 65536,
    pricing: { input: 0.075, output: 0.30 },
    capabilities: ['chat', 'function-calling', 'json-mode', 'reasoning', 'browser-search', 'code-execution', 'structured-outputs', 'tool-use'],
    deprecated: false,
    supersededBy: null,
    quality: 8
  },
  'openai/gpt-oss-120b': {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B',
    tier: 'production',
    speed: 500,
    contextWindow: 131072,
    maxCompletionTokens: 65536,
    pricing: { input: 0.15, output: 0.60 },
    capabilities: ['chat', 'function-calling', 'json-mode', 'reasoning', 'browser-search', 'code-execution', 'structured-outputs', 'tool-use'],
    deprecated: false,
    supersededBy: null,
    quality: 9
  },

  // ── PREVIEW / NEWEST MODELS ───────────────────────────────────
  'meta-llama/llama-4-scout-17b-16e-instruct': {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout 17Bx16E',
    tier: 'preview',
    speed: 750,
    contextWindow: 131072,
    maxCompletionTokens: 8192,
    pricing: { input: 0.11, output: 0.34 },
    capabilities: ['chat', 'function-calling', 'json-mode', 'vision', 'multilingual', 'tool-use'],
    deprecated: true,      // Deprecation announced June 17, 2026 - effective Aug 16, 2026
    supersededBy: 'openai/gpt-oss-120b',
    quality: 8
  },
  'qwen/qwen3-32b': {
    id: 'qwen/qwen3-32b',
    name: 'Qwen 3 32B',
    tier: 'preview',
    speed: 400,
    contextWindow: 131072,
    maxCompletionTokens: 40960,
    pricing: { input: 0.29, output: 0.59 },
    capabilities: ['chat', 'function-calling', 'json-mode', 'multilingual', 'tool-use'],
    deprecated: true,      // Deprecation announced June 17, 2026 - effective Aug 16, 2026
    supersededBy: 'openai/gpt-oss-120b',
    quality: 8
  },
  'qwen/qwen3.6-27b': {
    id: 'qwen/qwen3.6-27b',
    name: 'Qwen 3.6 27B',
    tier: 'preview',
    speed: 500,
    contextWindow: 131072,
    maxCompletionTokens: 32768,
    pricing: { input: 0.60, output: 3.00 },
    capabilities: ['chat', 'function-calling', 'json-mode', 'vision', 'multilingual', 'tool-use'],
    deprecated: false,
    supersededBy: null,
    quality: 8
  },
  'groq/compound': {
    id: 'groq/compound',
    name: 'Groq Compound',
    tier: 'production',
    speed: 450,
    contextWindow: 131072,
    maxCompletionTokens: 8192,
    pricing: { input: null, output: null }, // Pass-through pricing
    capabilities: ['chat', 'web-search', 'code-execution', 'browser-automation', 'tool-use'],
    deprecated: false,
    supersededBy: null,
    quality: 9
  },
  'groq/compound-mini': {
    id: 'groq/compound-mini',
    name: 'Groq Compound Mini',
    tier: 'production',
    speed: 450,
    contextWindow: 131072,
    maxCompletionTokens: 8192,
    pricing: { input: null, output: null },
    capabilities: ['chat', 'web-search', 'code-execution', 'browser-automation', 'tool-use'],
    deprecated: false,
    supersededBy: null,
    quality: 7
  }
};

// ── Fallback Chains ───────────────────────────────────────────
// Ordered from best to worst — model_manager tries each in sequence

const FALLBACK_CHAINS = {
  // Best overall quality (for complex analysis tasks)
  quality: [
    'openai/gpt-oss-120b',
    'groq/compound',
    'openai/gpt-oss-20b',
    'qwen/qwen3.6-27b',
    'llama-3.3-70b-versatile',
    'qwen/qwen3-32b',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'llama-3.1-8b-instant'
  ],
  // Fastest models (for simple/quick tasks)
  speed: [
    'openai/gpt-oss-20b',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'qwen/qwen3.6-27b',
    'openai/gpt-oss-120b',
    'groq/compound-mini',
    'llama-3.1-8b-instant',
    'qwen/qwen3-32b',
    'groq/compound',
    'llama-3.3-70b-versatile'
  ],
  // Cheapest models (for bulk/low-priority tasks)
  economy: [
    'llama-3.1-8b-instant',
    'openai/gpt-oss-20b',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'qwen/qwen3.6-27b',
    'openai/gpt-oss-120b',
    'qwen/qwen3-32b',
    'llama-3.3-70b-versatile',
    'groq/compound-mini'
  ],
  // Non-deprecated only (future-proof)
  stable: [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.6-27b',
    'groq/compound',
    'groq/compound-mini'
  ]
};

// ── Performance Tracker ───────────────────────────────────────
// Tracks success/failure rates per model for smart selection

class PerformanceTracker {
  constructor() {
    this.stats = new Map(); // modelId -> { attempts, successes, failures, totalLatency, lastUsed }
  }

  recordSuccess(modelId, latencyMs) {
    const s = this._getStats(modelId);
    s.attempts++;
    s.successes++;
    s.totalLatency += latencyMs;
    s.lastUsed = Date.now();
  }

  recordFailure(modelId, error) {
    const s = this._getStats(modelId);
    s.attempts++;
    s.failures++;
    s.lastError = error?.message || 'unknown';
    s.lastUsed = Date.now();
  }

  getStats(modelId) {
    return this.stats.get(modelId) || null;
  }

  getSuccessRate(modelId) {
    const s = this.stats.get(modelId);
    if (!s || s.attempts === 0) return 1; // Unknown = assume works
    return s.successes / s.attempts;
  }

  getAverageLatency(modelId) {
    const s = this.stats.get(modelId);
    if (!s || s.successes === 0) return Infinity;
    return s.totalLatency / s.successes;
  }

  getBestModel(chain) {
    let best = null;
    let bestScore = -Infinity;

    for (const modelId of chain) {
      const registry = MODEL_REGISTRY[modelId];
      if (!registry) continue;
      // Skip deprecated models if stable is preferred
      if (process.env.GROQ_MODEL_SKIP_DEPRECATED === 'true' && registry.deprecated) continue;

      const successRate = this.getSuccessRate(modelId);
      const latency = this.getAverageLatency(modelId);
      // Score: prefer high success rate, low latency, high quality
      const score = successRate * 100 - (latency / 1000) + (registry.quality || 0) * 5;
      if (score > bestScore) {
        bestScore = score;
        best = modelId;
      }
    }
    return best || chain[0];
  }

  summarize() {
    const result = {};
    for (const [modelId, stats] of this.stats) {
      result[modelId] = {
        attempts: stats.attempts,
        successes: stats.successes,
        failures: stats.failures,
        successRate: stats.attempts > 0 ? (stats.successes / stats.attempts * 100).toFixed(1) + '%' : 'N/A',
        avgLatency: stats.successes > 0 ? (stats.totalLatency / stats.successes).toFixed(0) + 'ms' : 'N/A',
        lastUsed: stats.lastUsed ? new Date(stats.lastUsed).toISOString() : 'N/A',
        lastError: stats.lastError || null
      };
    }
    return result;
  }

  _getStats(modelId) {
    if (!this.stats.has(modelId)) {
      this.stats.set(modelId, { attempts: 0, successes: 0, failures: 0, totalLatency: 0, lastUsed: null, lastError: null });
    }
    return this.stats.get(modelId);
  }
}

// ── Model Manager ─────────────────────────────────────────────

class ModelManager {
  constructor() {
    this.performanceTracker = new PerformanceTracker();
    this.discoveredModels = null;
    this.lastDiscoveryTime = 0;
    this.discoveryInProgress = false;

    // Parse environment
    this.preferredModel = process.env.GROQ_MODEL || '';
    this.fallbackEnabled = process.env.GROQ_MODEL_FALLBACK_ENABLED !== 'false';
    this.discoveryEnabled = process.env.GROQ_MODEL_DISCOVERY !== 'false';
    this.maxRetries = parseInt(process.env.GROQ_MODEL_MAX_RETRIES || '3', 10);
    this.cacheTtl = parseInt(process.env.MODEL_CACHE_TTL_MS || '3600000', 10);
    this.apiKey = process.env.GROQ_API_KEY || '';
    this.skipDeprecated = process.env.GROQ_MODEL_SKIP_DEPRECATED === 'true';
  }

  // ── Get best model for a given task type ──────────────────────

  getModelForTask(taskType = 'analysis') {
    // 1. If user explicitly set a model via env var, use it
    if (this.preferredModel && MODEL_REGISTRY[this.preferredModel]) {
      return this.preferredModel;
    }

    // 2. Select appropriate fallback chain based on task
    let chain;
    switch (taskType) {
      case 'quick':
      case 'simple':
        chain = FALLBACK_CHAINS.speed;
        break;
      case 'bulk':
      case 'batch':
        chain = FALLBACK_CHAINS.economy;
        break;
      case 'stable':
        chain = FALLBACK_CHAINS.stable;
        break;
      case 'analysis':
      default:
        chain = FALLBACK_CHAINS.quality;
        break;
    }

    // 3. Filter by performance if available
    const bestTracked = this.performanceTracker.getBestModel(chain);
    if (bestTracked) return bestTracked;

    // 4. Return first non-deprecated (or all) from chain
    for (const modelId of chain) {
      const reg = MODEL_REGISTRY[modelId];
      if (reg && (!this.skipDeprecated || !reg.deprecated)) {
        return modelId;
      }
    }

    // 5. Ultimate fallback
    return 'openai/gpt-oss-20b';
  }

  // ── Get fallback chain for a task ─────────────────────────────

  getFallbackChain(taskType = 'analysis') {
    const preferred = this.preferredModel;
    let baseChain;

    switch (taskType) {
      case 'speed':
      case 'simple':
        baseChain = [...FALLBACK_CHAINS.speed];
        break;
      case 'economy':
      case 'bulk':
        baseChain = [...FALLBACK_CHAINS.economy];
        break;
      case 'stable':
        baseChain = [...FALLBACK_CHAINS.stable];
        break;
      default:
        baseChain = [...FALLBACK_CHAINS.quality];
        break;
    }

    // If user set a preferred model, put it at the front
    if (preferred && MODEL_REGISTRY[preferred]) {
      const idx = baseChain.indexOf(preferred);
      if (idx > -1) baseChain.splice(idx, 1);
      baseChain.unshift(preferred);
    }

    // Filter deprecated if configured
    if (this.skipDeprecated) {
      baseChain = baseChain.filter(id => {
        const reg = MODEL_REGISTRY[id];
        return reg && !reg.deprecated;
      });
    }

    return baseChain;
  }

  // ── Model Discovery (fetch from Groq API) ─────────────────────

  async discoverModels() {
    if (!this.discoveryEnabled) return null;
    if (this.discoveryInProgress) return null;
    if (this.discoveredModels && (Date.now() - this.lastDiscoveryTime < this.cacheTtl)) {
      return this.discoveredModels;
    }

    this.discoveryInProgress = true;

    return new Promise((resolve) => {
      const req = https.get(
        'https://api.groq.com/openai/v1/models',
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        },
        (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              const models = (parsed.data || []).map(m => ({
                id: m.id,
                owned_by: m.owned_by,
                created: m.created,
                active: m.active !== false
              }));
              this.discoveredModels = models;
              this.lastDiscoveryTime = Date.now();
              console.log(`[ModelManager] Discovered ${models.length} models from Groq API`);
              this.discoveryInProgress = false;
              resolve(models);
            } catch (err) {
              console.warn('[ModelManager] Failed to parse model discovery response:', err.message);
              this.discoveryInProgress = false;
              resolve(null);
            }
          });
        }
      );

      req.on('error', (err) => {
        console.warn('[ModelManager] Model discovery failed:', err.message);
        this.discoveryInProgress = false;
        resolve(null);
      });

      req.on('timeout', () => {
        req.destroy();
        this.discoveryInProgress = false;
        resolve(null);
      });
    });
  }

  // ── Get model metadata ────────────────────────────────────────

  getModelInfo(modelId) {
    return MODEL_REGISTRY[modelId] || {
      id: modelId,
      name: modelId,
      tier: 'unknown',
      speed: '?',
      contextWindow: '?',
      capabilities: [],
      deprecated: false
    };
  }

  // ── Check if model is available (in registry or discovered) ───

  isModelAvailable(modelId) {
    if (MODEL_REGISTRY[modelId]) return true;
    if (this.discoveredModels) {
      return this.discoveredModels.some(m => m.id === modelId && m.active !== false);
    }
    return false;
  }

  // ── Get all non-deprecated models ─────────────────────────────

  getActiveModels() {
    return Object.values(MODEL_REGISTRY).filter(m => !m.deprecated);
  }

  // ── Performance tracking access ───────────────────────────────

  getPerformanceTracker() {
    return this.performanceTracker;
  }

  // ── Summary ───────────────────────────────────────────────────

  summarize() {
    const preferred = this.preferredModel || '(auto)';
    const currentModel = this.getModelForTask('analysis');
    const info = this.getModelInfo(currentModel);

    return {
      preferredModel: preferred,
      currentModel,
      modelInfo: {
        name: info.name,
        tier: info.tier,
        speed: `${info.speed} t/s`,
        contextWindow: info.contextWindow,
        deprecated: info.deprecated,
        capabilities: info.capabilities
      },
      fallbackEnabled: this.fallbackEnabled,
      discoveryEnabled: this.discoveryEnabled,
      discoveredCount: this.discoveredModels ? this.discoveredModels.length : 0,
      performanceStats: this.performanceTracker.summarize()
    };
  }
}

// ── Singleton ──────────────────────────────────────────────────

const modelManager = new ModelManager();

// Attempt discovery at startup (non-blocking)
if (modelManager.apiKey) {
  modelManager.discoverModels().catch(() => {});
}

module.exports = modelManager;

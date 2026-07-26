// ============================================================
//  Sentinels — backend/modules/model_manager.js
//  NVIDIA NIM Model Manager — Auto-discovery, fallback, tracking
//  Supports NVIDIA NIM OpenAI-compatible API models
// ============================================================
//
// Environment variables:
//   NVIDIA_MODEL            — Preferred model (default: deepseek-ai/deepseek-v4-pro)
//   MODEL_NAME              — Alias for NVIDIA_MODEL (swap models by changing this)
//   NVIDIA_API_KEY          — Required: NVIDIA API key
//   NVIDIA_BASE_URL         — API base URL (default: https://integrate.api.nvidia.com/v1)
//   NVIDIA_FALLBACK_ENABLED — Enable fallback chain (default: true)
//   NVIDIA_MODEL_DISCOVERY  — Enable API-based model discovery (default: true)
//   NVIDIA_MAX_RETRIES      — Max fallback retries (default: 3)
//   MODEL_CACHE_TTL_MS      — How long to cache model list (default: 3600000)
// ============================================================

const https = require('https');

// ── Model Registry ────────────────────────────────────────────
// NVIDIA NIM models available via the OpenAI-compatible API.
// Add new models here or use the discovery endpoint.

const MODEL_REGISTRY = {
  'meta/llama-4-maverick-17b-128e-instruct': {
    id: 'meta/llama-4-maverick-17b-128e-instruct',
    name: 'Llama 4 Maverick',
    tier: 'production',
    speed: 950,
    contextWindow: 131072,
    capabilities: ['chat', 'json-mode', 'reasoning'],
    quality: 9
  },
  'mistralai/mixtral-8x7b-instruct-v0.1': {
    id: 'mistralai/mixtral-8x7b-instruct-v0.1',
    name: 'Mixtral 8x7B',
    tier: 'production',
    speed: 850,
    contextWindow: 32768,
    capabilities: ['chat', 'reasoning'],
    quality: 8
  },
  'deepseek-ai/deepseek-v4-pro': {
    id: 'deepseek-ai/deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    tier: 'production',
    speed: 800,
    contextWindow: 131072,
    capabilities: ['chat', 'json-mode', 'reasoning'],
    quality: 9
  },
  'thudm/glm-4-9b-chat': {
    id: 'thudm/glm-4-9b-chat',
    name: 'GLM-4 9B Chat',
    tier: 'production',
    speed: 600,
    contextWindow: 131072,
    capabilities: ['chat', 'json-mode'],
    quality: 7
  },
  'nvidia/llama-3.1-nemotron-70b-instruct': {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct',
    name: 'Nemotron 70B',
    tier: 'production',
    speed: 400,
    contextWindow: 128000,
    capabilities: ['chat', 'json-mode', 'reasoning', 'tool-use'],
    quality: 8
  },
  'mistralai/mistral-7b-instruct-v0.3': {
    id: 'mistralai/mistral-7b-instruct-v0.3',
    name: 'Mistral 7B v0.3',
    tier: 'production',
    speed: 1000,
    contextWindow: 32768,
    capabilities: ['chat', 'json-mode'],
    quality: 6
  },
  'google/gemma-2-27b-it': {
    id: 'google/gemma-2-27b-it',
    name: 'Gemma 2 27B',
    tier: 'production',
    speed: 500,
    contextWindow: 8192,
    capabilities: ['chat', 'json-mode'],
    quality: 7
  }
};

// ── Fallback Chains ───────────────────────────────────────────
// Ordered from best to worst — model_manager tries each in sequence

const FALLBACK_CHAINS = {
  quality: [
    'meta/llama-4-maverick-17b-128e-instruct',
    'mistralai/mixtral-8x7b-instruct-v0.1',
    'deepseek-ai/deepseek-v4-pro',
    'nvidia/llama-3.1-nemotron-70b-instruct',
    'google/gemma-2-27b-it',
    'thudm/glm-4-9b-chat',
    'mistralai/mistral-7b-instruct-v0.3'
  ],
  speed: [
    'meta/llama-4-maverick-17b-128e-instruct',
    'mistralai/mixtral-8x7b-instruct-v0.1',
    'mistralai/mistral-7b-instruct-v0.3',
    'deepseek-ai/deepseek-v4-pro',
    'google/gemma-2-27b-it',
    'thudm/glm-4-9b-chat',
    'nvidia/llama-3.1-nemotron-70b-instruct'
  ],
  economy: [
    'meta/llama-4-maverick-17b-128e-instruct',
    'mistralai/mixtral-8x7b-instruct-v0.1',
    'mistralai/mistral-7b-instruct-v0.3',
    'thudm/glm-4-9b-chat',
    'google/gemma-2-27b-it',
    'deepseek-ai/deepseek-v4-pro',
    'nvidia/llama-3.1-nemotron-70b-instruct'
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
    this.preferredModel = process.env.NVIDIA_MODEL || process.env.MODEL_NAME || '';
    this.fallbackEnabled = process.env.NVIDIA_FALLBACK_ENABLED !== 'false';
    this.discoveryEnabled = process.env.NVIDIA_MODEL_DISCOVERY !== 'false';
    this.maxRetries = parseInt(process.env.NVIDIA_MAX_RETRIES || '3', 10);
    this.cacheTtl = parseInt(process.env.MODEL_CACHE_TTL_MS || '3600000', 10);
    this.apiKey = process.env.NVIDIA_API_KEY || '';
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

    // 4. Return first available from chain
    for (const modelId of chain) {
      if (MODEL_REGISTRY[modelId]) return modelId;
    }

    // 5. Ultimate fallback
    return 'deepseek-ai/deepseek-v4-pro';
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

    return baseChain;
  }

  // ── Model Discovery (fetch from NVIDIA NIM API) ────────────────

  async discoverModels() {
    if (!this.discoveryEnabled) return null;
    if (this.discoveryInProgress) return null;
    if (this.discoveredModels && (Date.now() - this.lastDiscoveryTime < this.cacheTtl)) {
      return this.discoveredModels;
    }

    this.discoveryInProgress = true;
    const baseUrl = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';

    return new Promise((resolve) => {
      const req = https.get(
        `${baseUrl}/models`,
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
              console.log(`[ModelManager] Discovered ${models.length} models from NVIDIA NIM`);
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
      capabilities: []
    };
  }

  // ── Check if model is available (in registry or discovered) ───

  isModelAvailable(modelId) {
    if (MODEL_REGISTRY[modelId]) return true;
    if (this.discoveredModels) {
      return this.discoveredModels.some(m => m.id === modelId);
    }
    return false;
  }

  // ── Get all models ────────────────────────────────────────────

  getActiveModels() {
    return Object.values(MODEL_REGISTRY);
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

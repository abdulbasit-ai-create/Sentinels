// ============================================================
//  Is This Legit? — backend/index.js
//  Express server entry point (security-hardened)
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const helmet = require('helmet');
const analyzeRoute = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 3001;
const EXTENSION_ID = process.env.EXTENSION_ID || '';
const API_KEY = process.env.ITL_API_KEY || '';
const ALLOW_LOCALHOST = process.env.ALLOW_LOCALHOST !== 'false';

// Warn at startup if EXTENSION_ID not configured
if (!EXTENSION_ID) {
  console.warn('[Security] EXTENSION_ID not set — CORS will accept any browser extension origin. Set EXTENSION_ID in .env for production.');
}
if (!API_KEY) {
  console.warn('[Security] ITL_API_KEY not set — API authentication is disabled.');
}

// ── Security Headers (Helmet) ────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Not needed for API server
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

// ── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g., server-to-server, curl)
    if (!origin) return cb(null, true);

    const isLocalhost = ALLOW_LOCALHOST && /^http:\/\/localhost:\d+$/.test(origin);

    if (EXTENSION_ID) {
      const allowedChrome = `chrome-extension://${EXTENSION_ID}`;
      const allowedMoz = `moz-extension://${EXTENSION_ID}`;
      if (origin === allowedChrome || origin === allowedMoz || isLocalhost) {
        return cb(null, origin);
      }
      return cb(new Error(`Origin not allowed: ${origin}`));
    }

    // Permissive mode (EXTENSION_ID not set): accept any browser extension
    const isChromeExt = origin.startsWith('chrome-extension://');
    const isMozExt = origin.startsWith('moz-extension://');
    if (isChromeExt || isMozExt || isLocalhost) {
      return cb(null, origin);
    }
    return cb(new Error(`Origin not allowed: ${origin}`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-ITL-Key', 'Authorization']
}));

// Trust first proxy hop for correct client IP in rate limiter
app.set('trust proxy', 1);

app.use(express.json({ limit: '2mb' }));

// ── Timing-Safe API Key Authentication ──────────────────────
app.use('/api', (req, res, next) => {
  if (!API_KEY) return next();

  const headerKey = req.get('x-itl-key') || '';
  const authHeader = req.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const provided = headerKey || bearer;

  if (!provided || !timingSafeEqual(provided, API_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
});

/**
 * Constant-time string comparison to prevent timing attacks.
 * Pads both strings to the same length before comparing.
 */
function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));

  // Pad shorter buffer to same length to avoid length-leak in timingSafeEqual
  if (bufA.length !== bufB.length) {
    const maxLen = Math.max(bufA.length, bufB.length);
    const paddedA = Buffer.alloc(maxLen);
    const paddedB = Buffer.alloc(maxLen);
    bufA.copy(paddedA);
    bufB.copy(paddedB);
    // Always run timingSafeEqual even though lengths differ (to avoid early return leak)
    crypto.timingSafeEqual(paddedA, paddedB);
    return false; // Different lengths = never equal
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

// ── Rate Limiting (in-memory, tiered by auth status) ─────────
const requestCounts = new Map();
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_MAX_ANON = process.env.RATE_LIMIT_ANON || 10;    // unauthenticated
const RATE_MAX_AUTHED = process.env.RATE_LIMIT_AUTHED || 50; // with API key
const RATE_CLEANUP_INTERVAL = 5 * 60 * 1000;

// Periodic cleanup to prevent unbounded Map growth
const rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of requestCounts) {
    if (now - entry.start > RATE_WINDOW_MS * 2) {
      requestCounts.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[RateLimit] Cleaned ${cleaned} expired entries, ${requestCounts.size} remaining`);
  }
}, RATE_CLEANUP_INTERVAL);

// Don't let the cleanup interval keep the process alive
if (rateLimitCleanup.unref) {
  rateLimitCleanup.unref();
}

app.use((req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const isAuthed = !!(req.get('x-itl-key') || req.get('authorization'));
  const limit = isAuthed ? RATE_MAX_AUTHED : RATE_MAX_ANON;
  const key = `${ip}:${isAuthed ? 'authed' : 'anon'}`;
  const now = Date.now();

  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, start: now });
    return next();
  }

  const entry = requestCounts.get(key);

  if (now - entry.start > RATE_WINDOW_MS) {
    requestCounts.set(key, { count: 1, start: now });
    return next();
  }

  if (entry.count >= limit) {
    return res.status(429).json({ error: `Rate limit exceeded (${isAuthed ? '50' : '10'}/min). Try again later.` });
  }

  entry.count++;
  next();
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api', analyzeRoute);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ─────────────────────────────────────
// Catches unhandled errors — sanitizes messages before sending to client
app.use((err, req, res, _next) => {
  console.error('[Server] Unhandled error:', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Is This Legit? Backend running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});

module.exports = app;

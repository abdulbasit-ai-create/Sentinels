// ============================================================
//  Sentinels — background.js (Service Worker)
//  Relays messages between popup and content script
//  Inline scraper synced with content.js enhanced signals
//  UPGRADED: IndexedDB, real-time URL checks, whitelist/blacklist,
//  notifications, enhanced badge, severity thresholds, ELI5
// ============================================================

// ── Configuration ────────────────────────────────────────────────
const DEFAULT_BACKEND_URL = 'http://localhost:3001';
const CONFIG_KEYS = {
  apiKey: 'sent_api_key',
  backendUrl: 'sent_backend_url',
  severityThreshold: 'sent_severity_threshold',
  autoScan: 'sent_auto_scan',
  showNotifications: 'sent_show_notifications'
};

let _apiKey = '';
let _apiBase = DEFAULT_BACKEND_URL;
let _severityThreshold = 40;   // score below this = warning
let _autoScan = true;
let _showNotifications = true;

// ── IndexedDB Setup ─────────────────────────────────────────────
const DB_NAME = 'sent_reports';
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('reports')) {
        const reportStore = db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
        reportStore.createIndex('url', 'url', { unique: false });
        reportStore.createIndex('timestamp', 'timestamp', { unique: false });
        reportStore.createIndex('verdict', 'verdict', { unique: false });
      }
      if (!db.objectStoreNames.contains('warnings')) {
        const warnStore = db.createObjectStore('warnings', { keyPath: 'id', autoIncrement: true });
        warnStore.createIndex('url', 'url', { unique: false });
        warnStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('whitelist')) {
        db.createObjectStore('whitelist', { keyPath: 'domain' });
      }
      if (!db.objectStoreNames.contains('blacklist')) {
        db.createObjectStore('blacklist', { keyPath: 'domain' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── IndexedDB Helpers ───────────────────────────────────────────

async function dbStoreReport(report) {
  try {
    const db = await openDB();
    const tx = db.transaction('reports', 'readwrite');
    const store = tx.objectStore('reports');
    store.add({
      url: report.url,
      score: report.score,
      verdict: report.verdict,
      flags: report.flags || [],
      summary: report.summary || '',
      details: report.details || {},
      hasSSL: report.hasSSL,
      domainAge: report.domainAge,
      isPhishing: report.isPhishing,
      reviewCount: report.reviewCount,
      domainCreated: report.domainCreated,
      registrar: report.registrar,
      timestamp: Date.now()
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.error('[Sentinels] IndexedDB store report error:', err);
  }
}

async function dbStoreWarning(entry) {
  try {
    const db = await openDB();
    const tx = db.transaction('warnings', 'readwrite');
    const store = tx.objectStore('warnings');
    store.add({
      url: entry.url,
      title: entry.title,
      score: entry.score,
      verdict: entry.verdict,
      flags: entry.flags || [],
      summary: entry.summary || '',
      timestamp: Date.now()
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.error('[Sentinels] IndexedDB store warning error:', err);
  }
}

async function dbGetReports(filter = {}) {
  try {
    const db = await openDB();
    const tx = db.transaction('reports', 'readonly');
    const store = tx.objectStore('reports');
    const index = store.index('timestamp');
    const all = await new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      const results = [];
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
    return all;
  } catch (err) {
    console.error('[Sentinels] IndexedDB get reports error:', err);
    return [];
  }
}

async function dbGetWarnings(limit = 100) {
  try {
    const db = await openDB();
    const tx = db.transaction('warnings', 'readonly');
    const store = tx.objectStore('warnings');
    const index = store.index('timestamp');
    const all = await new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      const results = [];
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
    return all;
  } catch (err) {
    console.error('[Sentinels] IndexedDB get warnings error:', err);
    return [];
  }
}

async function dbIsWhitelisted(domain) {
  try {
    const db = await openDB();
    const tx = db.transaction('whitelist', 'readonly');
    const store = tx.objectStore('whitelist');
    const result = await new Promise((resolve) => {
      const req = store.get(domain.toLowerCase());
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
    return result;
  } catch { return false; }
}

async function dbIsBlacklisted(domain) {
  try {
    const db = await openDB();
    const tx = db.transaction('blacklist', 'readonly');
    const store = tx.objectStore('blacklist');
    const result = await new Promise((resolve) => {
      const req = store.get(domain.toLowerCase());
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
    return result;
  } catch { return false; }
}

async function dbAddWhitelist(domain) {
  try {
    const db = await openDB();
    const tx = db.transaction('whitelist', 'readwrite');
    const store = tx.objectStore('whitelist');
    store.put({ domain: domain.toLowerCase(), addedAt: Date.now() });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    return true;
  } catch { return false; }
}

async function dbRemoveWhitelist(domain) {
  try {
    const db = await openDB();
    const tx = db.transaction('whitelist', 'readwrite');
    const store = tx.objectStore('whitelist');
    store.delete(domain.toLowerCase());
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    return true;
  } catch { return false; }
}

async function dbAddBlacklist(domain) {
  try {
    const db = await openDB();
    const tx = db.transaction('blacklist', 'readwrite');
    const store = tx.objectStore('blacklist');
    store.put({ domain: domain.toLowerCase(), addedAt: Date.now() });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    return true;
  } catch { return false; }
}

async function dbRemoveBlacklist(domain) {
  try {
    const db = await openDB();
    const tx = db.transaction('blacklist', 'readwrite');
    const store = tx.objectStore('blacklist');
    store.delete(domain.toLowerCase());
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    return true;
  } catch { return false; }
}

async function dbGetWhitelist() {
  try {
    const db = await openDB();
    const tx = db.transaction('whitelist', 'readonly');
    const store = tx.objectStore('whitelist');
    const all = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return all || [];
  } catch { return []; }
}

async function dbGetBlacklist() {
  try {
    const db = await openDB();
    const tx = db.transaction('blacklist', 'readonly');
    const store = tx.objectStore('blacklist');
    const all = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return all || [];
  } catch { return []; }
}

async function dbGetSetting(key) {
  try {
    const db = await openDB();
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const result = await new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
    return result;
  } catch { return null; }
}

async function dbSetSetting(key, value) {
  try {
    const db = await openDB();
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    store.put({ key, value });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    return true;
  } catch { return false; }
}

// ── Load config on startup ────────────────────────────────────
async function loadConfig() {
  const data = await new Promise(resolve => {
    chrome.storage.local.get([
      CONFIG_KEYS.apiKey, CONFIG_KEYS.backendUrl,
      CONFIG_KEYS.severityThreshold, CONFIG_KEYS.autoScan,
      CONFIG_KEYS.showNotifications
    ], resolve);
  });
  _apiKey = data[CONFIG_KEYS.apiKey] || '';
  _apiBase = data[CONFIG_KEYS.backendUrl] || DEFAULT_BACKEND_URL;
  _severityThreshold = data[CONFIG_KEYS.severityThreshold] || 40;
  _autoScan = data[CONFIG_KEYS.autoScan] !== false;
  _showNotifications = data[CONFIG_KEYS.showNotifications] !== false;
  console.log('[Sentinels] Background loaded, API_BASE:', _apiBase,
    'Key configured:', !!_apiKey,
    'Threshold:', _severityThreshold,
    'AutoScan:', _autoScan);
}

loadConfig();

// Update config if storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[CONFIG_KEYS.apiKey]) {
    _apiKey = changes[CONFIG_KEYS.apiKey].newValue || '';
  }
  if (changes[CONFIG_KEYS.backendUrl]) {
    _apiBase = changes[CONFIG_KEYS.backendUrl].newValue || DEFAULT_BACKEND_URL;
  }
  if (changes[CONFIG_KEYS.severityThreshold]) {
    _severityThreshold = changes[CONFIG_KEYS.severityThreshold].newValue || 40;
  }
  if (changes[CONFIG_KEYS.autoScan] !== undefined) {
    _autoScan = changes[CONFIG_KEYS.autoScan].newValue !== false;
  }
  if (changes[CONFIG_KEYS.showNotifications] !== undefined) {
    _showNotifications = changes[CONFIG_KEYS.showNotifications].newValue !== false;
  }
});

// ── Message Handler (with validation) ────────────────────────────
const VALID_MSG_TYPES = new Set([
  'ANALYZE_PAGE', 'HIGHLIGHT_PAGE', 'CLEAR_PAGE',
  'GET_REPORTS', 'GET_WARNINGS', 'GET_WHITELIST', 'GET_BLACKLIST',
  'ADD_WHITELIST', 'REMOVE_WHITELIST', 'ADD_BLACKLIST', 'REMOVE_BLACKLIST',
  'GET_SETTINGS', 'SAVE_SETTINGS',
  'REPORT_FALSE_POSITIVE', 'REPORT_FALSE_NEGATIVE',
  'GET_SAVED_REPORTS', 'DELETE_REPORT',
  'CHECK_URL_NOW'
]);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
    sendResponse({ success: false, error: 'Invalid message format' });
    return true;
  }

  if (!VALID_MSG_TYPES.has(msg.type)) {
    sendResponse({ success: false, error: 'Unknown message type' });
    return true;
  }

  if (msg.tabId !== undefined && (!Number.isInteger(msg.tabId) || msg.tabId < 0)) {
    sendResponse({ success: false, error: 'Invalid tab ID' });
    return true;
  }

  console.log('[Sentinels] Message received:', msg.type);

  // ── IndexedDB Operations ──
  if (msg.type === 'GET_REPORTS') {
    dbGetReports().then(reports => sendResponse({ success: true, reports }));
    return true;
  }

  if (msg.type === 'GET_WARNINGS') {
    dbGetWarnings(msg.limit || 100).then(warnings => sendResponse({ success: true, warnings }));
    return true;
  }

  if (msg.type === 'GET_WHITELIST') {
    dbGetWhitelist().then(list => sendResponse({ success: true, list }));
    return true;
  }

  if (msg.type === 'GET_BLACKLIST') {
    dbGetBlacklist().then(list => sendResponse({ success: true, list }));
    return true;
  }

  if (msg.type === 'ADD_WHITELIST') {
    dbAddWhitelist(msg.domain).then(() => sendResponse({ success: true }));
    return true;
  }

  if (msg.type === 'REMOVE_WHITELIST') {
    dbRemoveWhitelist(msg.domain).then(() => sendResponse({ success: true }));
    return true;
  }

  if (msg.type === 'ADD_BLACKLIST') {
    dbAddBlacklist(msg.domain).then(() => sendResponse({ success: true }));
    return true;
  }

  if (msg.type === 'REMOVE_BLACKLIST') {
    dbRemoveBlacklist(msg.domain).then(() => sendResponse({ success: true }));
    return true;
  }

  if (msg.type === 'GET_SETTINGS') {
    sendResponse({
      success: true,
      settings: {
        backendUrl: _apiBase,
        apiKey: _apiKey,
        severityThreshold: _severityThreshold,
        autoScan: _autoScan,
        showNotifications: _showNotifications
      }
    });
    return true;
  }

  if (msg.type === 'SAVE_SETTINGS') {
    const s = msg.settings || {};
    const toSave = {};
    if (s.backendUrl !== undefined) {
      _apiBase = s.backendUrl;
      toSave[CONFIG_KEYS.backendUrl] = s.backendUrl;
    }
    if (s.apiKey !== undefined) {
      _apiKey = s.apiKey;
      toSave[CONFIG_KEYS.apiKey] = s.apiKey;
    }
    if (s.severityThreshold !== undefined) {
      _severityThreshold = s.severityThreshold;
      toSave[CONFIG_KEYS.severityThreshold] = s.severityThreshold;
    }
    if (s.autoScan !== undefined) {
      _autoScan = s.autoScan;
      toSave[CONFIG_KEYS.autoScan] = s.autoScan;
    }
    if (s.showNotifications !== undefined) {
      _showNotifications = s.showNotifications;
      toSave[CONFIG_KEYS.showNotifications] = s.showNotifications;
    }
    if (Object.keys(toSave).length > 0) {
      chrome.storage.local.set(toSave);
    }
    sendResponse({ success: true });
    return true;
  }

  if (msg.type === 'REPORT_FALSE_POSITIVE') {
    handleFalseReport('false_positive', msg).then(() => sendResponse({ success: true }));
    return true;
  }

  if (msg.type === 'REPORT_FALSE_NEGATIVE') {
    handleFalseReport('false_negative', msg).then(() => sendResponse({ success: true }));
    return true;
  }

  if (msg.type === 'GET_SAVED_REPORTS') {
    dbGetReports().then(reports => sendResponse({ success: true, reports }));
    return true;
  }

  if (msg.type === 'DELETE_REPORT') {
    deleteReport(msg.reportId).then(() => sendResponse({ success: true }));
    return true;
  }

  if (msg.type === 'CHECK_URL_NOW') {
    handleAnalysis(msg.tabId, sendResponse, true);
    return true;
  }

  // ── Core Operations ──
  if (msg.type === 'ANALYZE_PAGE') {
    handleAnalysis(msg.tabId, sendResponse, false);
    return true;
  }

  if (msg.type === 'HIGHLIGHT_PAGE') {
    if (!Array.isArray(msg.flags)) {
      sendResponse({ success: false, error: 'Invalid flags' });
      return true;
    }
    chrome.tabs.sendMessage(msg.tabId, {
      type: 'HIGHLIGHT',
      flags: msg.flags,
      fullResult: msg.fullResult || null
    }).then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      console.error('[Sentinels] Highlight error:', err);
      sendResponse({ success: false, error: 'Failed to highlight page' });
    });
    return true;
  }

  if (msg.type === 'CLEAR_PAGE') {
    chrome.tabs.sendMessage(msg.tabId, { type: 'CLEAR_HIGHLIGHTS' })
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false, error: 'Failed to clear highlights' }));
    return true;
  }
});

// ── False Report Handling ─────────────────────────────────────
async function handleFalseReport(type, msg) {
  try {
    const payload = {
      type,
      url: msg.url || '',
      score: msg.score || 0,
      verdict: msg.verdict || '',
      expectedVerdict: msg.expectedVerdict || '',
      notes: msg.notes || '',
      timestamp: Date.now()
    };
    // Send to backend if configured
    if (_apiBase) {
      const headers = { 'Content-Type': 'application/json' };
      if (_apiKey) headers['X-Sentinels-Key'] = _apiKey;
      await fetch(`${_apiBase}/api/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      }).catch(() => {});
    }
    // Also store locally
    await dbSetSetting(`feedback_${Date.now()}`, JSON.stringify(payload));
  } catch (err) {
    console.error('[Sentinels] Feedback error:', err);
  }
}

async function deleteReport(reportId) {
  try {
    const db = await openDB();
    const tx = db.transaction('reports', 'readwrite');
    const store = tx.objectStore('reports');
    store.delete(reportId);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.error('[Sentinels] Delete report error:', err);
  }
}

// ── Real-Time URL Checking (chrome.tabs.onUpdated) ──────────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!_autoScan) return;
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('about:')) return;

  // Check whitelist/blacklist
  try {
    const url = new URL(tab.url);
    const domain = url.hostname.toLowerCase();

    const isBlacklisted = await dbIsBlacklisted(domain);
    const isWhitelisted = await dbIsWhitelisted(domain);

    if (isBlacklisted) {
      updateBadge(tabId, 0, 'SCAM');
      showChromeNotification(tabId, tab.url, `⚠️ Blacklisted domain: ${domain}`, 'SCAM');
      return;
    }
    if (isWhitelisted) {
      updateBadge(tabId, 100, 'SAFE');
      return;
    }
  } catch (e) {
    // Ignore URL parsing errors
  }

  // Auto-analyze the page
  console.log('[Sentinels] Auto-analyzing tab:', tabId, tab.url);
  try {
    const result = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { type: 'PING' }, response => {
        if (chrome.runtime.lastError) {
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });

    if (result === null) {
      // Content script not loaded, inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        return;
      }
    }

    // Do the analysis
    await autoAnalyzeTab(tabId, tab.url);
  } catch (err) {
    console.error('[Sentinels] Auto-analyze error:', err);
  }
});

async function autoAnalyzeTab(tabId, url) {
  const scrapeResult = await new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'SCRAPE' }, response => {
      resolve(response);
    });
  });

  if (!scrapeResult?.success) return;

  const headers = { 'Content-Type': 'application/json' };
  if (_apiKey) headers['X-Sentinels-Key'] = _apiKey;

  try {
    const response = await fetch(`${_apiBase}/api/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify(scrapeResult.data)
    });
    if (!response.ok) return;
    const result = await response.json();

    // Store in IndexedDB
    await dbStoreReport(result);

    // Update badge
    updateBadge(tabId, result.score, result.verdict);

    // Show notification for high risk
    if (_showNotifications && result.score < _severityThreshold) {
      const domain = new URL(url).hostname;
      showChromeNotification(
        tabId,
        url,
        `⚠️ Warning: "${domain}" scored ${result.score}/100 - ${result.verdict}\n${result.summary || ''}`,
        result.verdict
      );

      // Store warning in timeline
      await dbStoreWarning({
        url,
        title: document?.title || url,
        score: result.score,
        verdict: result.verdict,
        flags: result.flags || [],
        summary: result.summary || ''
      });
    }

    // Cache in storage for popup
    await chrome.storage.local.set({
      [`scan_${tabId}`]: {
        result,
        url,
        timestamp: Date.now()
      }
    });

  } catch (err) {
    console.error('[Sentinels] Auto-analyze fetch error:', err);
  }
}

// ── Enhanced Badge Updates ──────────────────────────────────────
function updateBadge(tabId, score, verdict) {
  if (tabId === undefined || tabId < 0) return;

  const color = verdict === 'SAFE' ? '#16a34a'
              : verdict === 'SUSPICIOUS' ? '#d97706'
              : '#dc2626';

  chrome.action.setBadgeText({ tabId, text: String(score) });
  chrome.action.setBadgeBackgroundColor({ tabId, color });

  // Set badge title with details
  chrome.action.setTitle({
    tabId,
    title: `Sentinels — ${verdict} (${score}/100)`
  });
}

// ── Chrome Notification System ─────────────────────────────────
function showChromeNotification(tabId, url, message, verdict) {
  const notificationId = `sent_warn_${tabId}_${Date.now()}`;

  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `Sentinels — ${verdict}`,
    message: message.slice(0, 250),
    priority: verdict === 'SCAM' ? 2 : 1,
    buttons: [
      { title: 'View Details' },
      { title: 'Whitelist Domain' }
    ],
    requireInteraction: true
  });

  // Handle notification button clicks
  const handler = (notifId, btnIdx) => {
    if (notifId !== notificationId) return;
    chrome.notifications.onButtonClicked.removeListener(handler);

    if (btnIdx === 0) {
      // Open popup - can't directly open it, but we can focus the tab
      chrome.tabs.update(tabId, { active: true });
      chrome.windows.update(tabId, { focused: true }).catch(() => {});
    } else if (btnIdx === 1) {
      try {
        const domain = new URL(url).hostname;
        dbAddWhitelist(domain);
        updateBadge(tabId, 100, 'SAFE');
      } catch (e) {}
    }
  };
  chrome.notifications.onButtonClicked.addListener(handler);

  // Auto-clear after 30 seconds
  setTimeout(() => {
    chrome.notifications.clear(notificationId);
  }, 30000);
}

// ── Main Analysis Handler ──────────────────────────────────────
async function handleAnalysis(tabId, sendResponse, isAutoScan) {
  console.log('[Sentinels] Starting analysis for tab:', tabId);

  try {
    const tab = await chrome.tabs.get(tabId);
    console.log('[Sentinels] Tab URL:', tab.url, 'Status:', tab.status);

    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
      sendResponse({ success: false, error: 'Cannot scan Chrome internal pages. Try a regular website instead.' });
      return;
    }

    if (tab.status !== 'complete') {
      console.log('[Sentinels] Waiting for page to finish loading...');
      try {
        await waitForTabComplete(tabId, 20000);
      } catch (waitErr) {
        sendResponse({ success: false, error: 'Page took too long to load. Refresh and try again.' });
        return;
      }
    }

    // Check whitelist/blacklist
    try {
      const url = new URL(tab.url);
      const domain = url.hostname.toLowerCase();
      const isBlacklisted = await dbIsBlacklisted(domain);
      const isWhitelisted = await dbIsWhitelisted(domain);

      if (isBlacklisted) {
        updateBadge(tabId, 0, 'SCAM');
        sendResponse({
          success: true,
          result: {
            url: tab.url,
            score: 0,
            verdict: 'SCAM',
            flags: [`Blacklisted domain: ${domain}`],
            summary: 'This domain is on your blacklist.',
            details: { confidence: 'high', riskFactors: ['Domain is blacklisted'] },
            hasSSL: tab.url.startsWith('https:'),
            reviewCount: 0,
            scanTimestamp: new Date().toISOString()
          }
        });
        return;
      }
      if (isWhitelisted) {
        updateBadge(tabId, 100, 'SAFE');
        sendResponse({
          success: true,
          result: {
            url: tab.url,
            score: 100,
            verdict: 'SAFE',
            flags: [],
            summary: 'This domain is on your whitelist.',
            details: { confidence: 'high', positiveSignals: ['Domain is whitelisted'] },
            hasSSL: tab.url.startsWith('https:'),
            reviewCount: 0,
            scanTimestamp: new Date().toISOString()
          }
        });
        return;
      }
    } catch (e) {
      // Continue with normal scan
    }

    // Use chrome.scripting.executeScript to run scrape directly
    console.log('[Sentinels] Executing script in tab:', tabId);

    let scrapeResult;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // ── Inline scraper (mirrors content.js scrapePageData) ──
          const sanitizeText = (text) => {
            return text
              .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]')
              .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
              .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[CARD]')
              .replace(/\b\d{9,}\b/g, '[NUMBER]')
              .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
          };

          const bodyText = document.body.innerText.replace(/\s+/g, ' ').trim();
          const hostname = window.location.hostname;
          const lowerText = bodyText.toLowerCase();

          // ── Reviews ────────────────────────────────────────────
          const reviewSelectors = [
            '[data-hook="review-body"]', '.review-text', '.comment-body',
            '[class*="review-content"]', '[class*="reviewText"]',
            '[itemprop="reviewBody"]', '.user-review', '[class*="review_body"]',
            '.stars', '[data-review]', '.testimonial-text',
            '.customer-review', '[data-star-rating]', '.rating-text'
          ];
          const reviews = Array.from(document.querySelectorAll(reviewSelectors.join(',')))
            .map(el => el.innerText.trim().slice(0, 400))
            .filter(r => r.length > 20)
            .slice(0, 15);

          // ── Prices ─────────────────────────────────────────────
          const priceSelectors = ['.price', '[class*="price"]', '[itemprop="price"]', '[class*="Price"]', '.cost', '[data-price]', '.sale-price', '.current-price', '.product-price'];
          const prices = Array.from(document.querySelectorAll(priceSelectors.join(',')))
            .map(el => el.innerText.trim()).filter(Boolean).slice(0, 10);

          // ── Form Fields ────────────────────────────────────────
          const sensitiveFields = ['password', 'credit_card', 'card_number', 'cvv', 'ssn', 'social_security', 'bank_account', 'routing_number', 'pin'];
          const formFields = Array.from(document.querySelectorAll('input, select, textarea'))
            .map(i => {
              const type = i.type || i.tagName;
              const name = (i.name || i.placeholder || i.id || '').toLowerCase();
              const isSensitive = sensitiveFields.some(s => name.includes(s) || type.includes(s));
              const formAction = i.closest('form')?.action || '';
              const isCrossDomain = formAction && !formAction.includes(hostname);
              let tag = `${type}:${i.name || i.placeholder || i.id || ''}`;
              if (isSensitive) tag += ':SENSITIVE';
              if (isCrossDomain) tag += ':CROSSDOMAIN';
              return tag;
            })
            .filter(Boolean).slice(0, 20);

          // ── Page Stats ─────────────────────────────────────────
          const stats = {
            totalLinks: document.querySelectorAll('a[href]').length,
            externalLinks: 0,
            images: document.querySelectorAll('img').length,
            scripts: document.querySelectorAll('script').length,
            iframes: document.querySelectorAll('iframe').length,
            forms: document.querySelectorAll('form').length,
            buttons: document.querySelectorAll('button').length,
            inputs: document.querySelectorAll('input').length,
            textLength: bodyText.length,
            hasLogin: false,
            hasCheckout: false,
            hasCart: false
          };
          stats.externalLinks = Array.from(document.querySelectorAll('a[href]'))
            .filter(a => a.href.startsWith('http') && !a.href.includes(hostname)).length;
          stats.hasLogin = /login|sign in|log in|register|sign up/i.test(lowerText);
          stats.hasCheckout = /checkout|buy now|add to cart|purchase/i.test(lowerText);
          stats.hasCart = /cart|basket|shopping/i.test(lowerText);

          // ── Social Links ───────────────────────────────────────
          const socialDomains = ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com'];
          const socialLinks = Array.from(document.querySelectorAll('a[href]'))
            .map(a => a.href)
            .filter(h => socialDomains.some(d => h.includes(d)))
            .slice(0, 10);

          // ── Contact Info ───────────────────────────────────────
          const emailMatches = (bodyText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).slice(0, 5);
          const phoneMatches = (bodyText.match(/(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g) || []).slice(0, 5);
          const addressMatch = /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct)/i.test(bodyText);

          // ── Trust Badges ───────────────────────────────────────
          const trustBadges = [];
          const badgeKeywords = ['ssl', 'secure', 'encrypted', 'verified', 'trusted', 'norton', 'mcafee', 'bbb', 'better business', 'paypal', 'visa', 'mastercard', 'amex', 'privacy policy', 'terms of service', 'refund', 'guarantee', 'money back'];
          badgeKeywords.forEach(k => { if (lowerText.includes(k)) trustBadges.push(k); });

          // ── URL Signals ────────────────────────────────────────
          let urlSignals = {};
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

            urlSignals = {
              tld, subdomainCount, hyphenCount, digitCount,
              length: url.href.length, longUrl, hasPhishyToken,
              isIPAddress, hasAtSymbol, hasNonASCII, hasBase64,
              pathDepth, suspiciousParamCount
            };
          } catch (e) {
            urlSignals = {
              tld: '', subdomainCount: 0, hyphenCount: 0, digitCount: 0,
              length: 0, longUrl: false, hasPhishyToken: false,
              isIPAddress: false, hasAtSymbol: false, hasNonASCII: false,
              hasBase64: false, pathDepth: 0, suspiciousParamCount: 0
            };
          }

          // ── Content Signals ────────────────────────────────────
          const contentSignals = {};
          try {
            contentSignals.hasFavicon = !!(
              document.querySelector('link[rel="icon"]') ||
              document.querySelector('link[rel="shortcut icon"]') ||
              document.querySelector('link[rel="apple-touch-icon"]')
            );
            const ogTags = document.querySelectorAll('meta[property^="og:"]');
            contentSignals.hasOpenGraph = ogTags.length >= 2;
            const jsonLd = document.querySelectorAll('script[type="application/ld+json"]');
            contentSignals.hasStructuredData = jsonLd.length > 0;
            contentSignals.hasCanonical = !!document.querySelector('link[rel="canonical"]');
            contentSignals.hasCopyright = /©|\bcopyright\b/i.test(lowerText);

            const allLinks = Array.from(document.querySelectorAll('a'));
            const linkTexts = allLinks.map(a => (a.textContent || '').toLowerCase().trim());
            const linkHrefs = allLinks.map(a => (a.href || '').toLowerCase());
            contentSignals.hasPrivacyPolicy = linkTexts.some(t => t.includes('privacy')) || linkHrefs.some(h => h.includes('privacy'));
            contentSignals.hasTerms = linkTexts.some(t => t.includes('terms')) || linkHrefs.some(h => h.includes('terms'));

            contentSignals.hasCookieConsent = !!(
              document.querySelector('[class*="cookie"]') ||
              document.querySelector('[id*="cookie"]') ||
              document.querySelector('[class*="consent"]') ||
              document.querySelector('[id*="consent"]') ||
              lowerText.includes('we use cookies')
            );

            const scripts = Array.from(document.querySelectorAll('script[src]'));
            const externalScripts = scripts.filter(s => {
              try { return !new URL(s.src).hostname.includes(hostname); } catch { return false; }
            });
            contentSignals.totalScripts = scripts.length;
            contentSignals.externalScriptCount = externalScripts.length;
            contentSignals.externalScriptRatio = scripts.length > 0 ? +(externalScripts.length / scripts.length).toFixed(2) : 0;

            const onclickEls = document.querySelectorAll('[onclick*="window.open"]');
            contentSignals.popunderCount = onclickEls.length;

            const allScriptSrcs = scripts.map(s => s.src.toLowerCase());
            const minerDomains = ['coinhive', 'coin-hive', 'jsecoin', 'cryptoloot', 'minero', 'webminepool'];
            contentSignals.hasCryptoMiner = allScriptSrcs.some(src => minerDomains.some(m => src.includes(m)));

            const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
            contentSignals.hasMetaRefresh = !!metaRefresh;

            const words = bodyText.split(/\s+/).filter(w => w.length > 0);
            contentSignals.wordCount = words.length;
            const capsWords = words.filter(w => w.length > 3 && w === w.toUpperCase());
            contentSignals.capsRatio = words.length > 0 ? +(capsWords.length / words.length).toFixed(3) : 0;

            const iframes = Array.from(document.querySelectorAll('iframe'));
            contentSignals.hiddenIframeCount = iframes.filter(f => {
              try {
                const style = window.getComputedStyle(f);
                const w = parseInt(style.width) || parseInt(f.getAttribute('width')) || 0;
                const h = parseInt(style.height) || parseInt(f.getAttribute('height')) || 0;
                return (w <= 1 && h <= 1) || style.display === 'none' || style.visibility === 'hidden';
              } catch { return false; }
            }).length;
          } catch (e) { /* best-effort */ }

          // ── Dark Patterns (18 categories) ──────────────────────
          const patterns = [];

          const timers = document.querySelectorAll('[class*="countdown"], [class*="timer"], [id*="countdown"], [class*="limited-time"]');
          if (timers.length > 0) patterns.push('Countdown timer detected (' + timers.length + ' elements)');

          const scarcityPhrases = ['only 1 left', 'only 2 left', 'only 3 left', 'only few left', 'last one', 'selling fast', 'almost gone', 'high demand', 'limited quantity', 'running out'];
          const scarcityMatches = scarcityPhrases.filter(function(p) { return lowerText.includes(p); });
          if (scarcityMatches.length > 0) patterns.push('Scarcity messaging (' + scarcityMatches.slice(0, 3).join(', ') + ')');

          const preChecked = Array.from(document.querySelectorAll('input[type="checkbox"]')).filter(function(cb) { return cb.checked; });
          if (preChecked.length > 0) patterns.push('Pre-checked checkboxes (' + preChecked.length + ')');

          const guiltPhrases = ['no thanks', "i don't want", 'no, i hate', 'i prefer to pay more', 'no thank you', "i don't want to", "i'll stick with", 'no, i want to pay full', "i don't like saving", 'no, i prefer'];
          if (guiltPhrases.some(function(p) { return lowerText.includes(p); })) patterns.push('Guilt-trip / confirm-shaming opt-out language');

          const urgencyPhrases = ['act now', 'limited time', 'expires today', 'offer ends', "don't miss", 'hurry', 'last chance', 'today only', 'while supplies last', 'ending soon', 'offer expires in'];
          const urgencyCount = urgencyPhrases.filter(function(p) { return lowerText.includes(p); }).length;
          if (urgencyCount >= 2) patterns.push('Urgency triggers (' + urgencyCount + ' found)');

          try {
            const tinyText = Array.from(document.querySelectorAll('*')).filter(function(el) {
              try { const style = window.getComputedStyle(el); return parseFloat(style.fontSize) < 8 && el.innerText && el.innerText.trim().length > 10; }
              catch { return false; }
            });
            if (tinyText.length > 1) patterns.push('Hidden/difficult-to-read text (' + tinyText.length + ' elements)');
          } catch (e) { /* skip */ }

          const modals = document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="overlay"], [class*="dialog"]');
          if (modals.length > 2) patterns.push('Multiple pop-ups/modals (' + modals.length + ')');

          const obfuscatedLinks = Array.from(document.querySelectorAll('a[href]')).filter(function(a) {
            return a.href.includes('click') || a.href.includes('redirect') || a.href.includes('track');
          });
          if (obfuscatedLinks.length > 3) patterns.push('Obfuscated/redirecting links (' + obfuscatedLinks.length + ')');

          const fakeCloseBtns = document.querySelectorAll('[class*="close"]:not(button):not(.close), [class*="no-thank"]');
          if (fakeCloseBtns.length > 0) patterns.push('Misleading close buttons detected');

          const hiddenCosts = lowerText.match(/\$[0-9.]+\s*(shipping|handling|processing|fee)/gi);
          if (hiddenCosts && hiddenCosts.length > 0) patterns.push('Potential hidden costs: ' + hiddenCosts.slice(0, 2).join(', '));

          const trustedBrands = ['amazon', 'apple', 'google', 'microsoft', 'facebook', 'netflix', 'paypal', 'stripe', 'shopify', 'ebay'];
          const domainLower = hostname.toLowerCase();
          for (const brand of trustedBrands) {
            if (domainLower.includes(brand) && !domainLower.endsWith(brand + '.com') && !domainLower.includes(brand + '.co')) {
              patterns.push('Potential copycat branding: ' + brand + ' (possible brand impersonation)');
              break;
            }
          }

          document.querySelectorAll('form').forEach(function(form, i) {
            const hasPassword = form.querySelector('input[type="password"]');
            const submitBtn = form.querySelector('button, input[type="submit"]');
            if (hasPassword && submitBtn && !submitBtn.innerText.toLowerCase().includes('login')) {
              patterns.push('Form ' + (i + 1) + ': Password field without clear login action');
            }
          });

          const socialProofPatterns = [
            /\d+\s*people?\s*(are|is)\s*(viewing|watching|looking)/i,
            /\w+\s+from\s+\w+\s+just\s+(purchased|bought|ordered)/i,
            /\d+\s*customer(s)?\s*(recently\s+)?(bought|purchased|ordered)/i,
            /someone\s+in\s+\w+\s+(just\s+)?(bought|purchased)/i
          ];
          if (socialProofPatterns.some(function(p) { return p.test(bodyText); })) patterns.push('Fake social proof notifications detected');

          try {
            const buttons = Array.from(document.querySelectorAll('button, [role="button"], .btn, [class*="button"]'));
            const acceptKw = ['accept', 'agree', 'yes', 'allow', 'subscribe', 'continue', 'ok'];
            const declineKw = ['decline', 'reject', 'no', 'deny', 'cancel', 'skip', 'later'];
            let deceptiveBtn = false;
            for (const btn of buttons) {
              const text = (btn.textContent || '').toLowerCase().trim();
              if (acceptKw.some(function(k) { return text.includes(k); })) {
                const style = window.getComputedStyle(btn);
                const fontSize = parseFloat(style.fontSize);
                const parent = btn.parentElement;
                if (parent) {
                  const siblings = Array.from(parent.querySelectorAll('button, [role="button"], .btn, [class*="button"]'));
                  for (const sib of siblings) {
                    const sibText = (sib.textContent || '').toLowerCase().trim();
                    if (declineKw.some(function(k) { return sibText.includes(k); })) {
                      const sibStyle = window.getComputedStyle(sib);
                      const sibFontSize = parseFloat(sibStyle.fontSize);
                      if (fontSize > sibFontSize * 1.4) { deceptiveBtn = true; break; }
                    }
                  }
                }
              }
              if (deceptiveBtn) break;
            }
            if (deceptiveBtn) patterns.push('Deceptive button styling (accept much more prominent than decline)');
          } catch (e) { /* skip */ }

          const roadBlocks = document.querySelectorAll('[class*="paywall"], [class*="login-wall"], [class*="signup-wall"], [class*="gate"], [class*="blocking-overlay"]');
          if (roadBlocks.length > 0) patterns.push('Forced action / road-blocking elements detected');

          const allIframes = Array.from(document.querySelectorAll('iframe'));
          const hiddenIframes = allIframes.filter(function(f) {
            try {
              const style = window.getComputedStyle(f);
              const w = parseInt(style.width) || parseInt(f.getAttribute('width')) || 0;
              const h = parseInt(style.height) || parseInt(f.getAttribute('height')) || 0;
              return (w <= 1 && h <= 1) || style.display === 'none' || style.visibility === 'hidden';
            } catch { return false; }
          });
          if (hiddenIframes.length > 0) patterns.push('Hidden iframes detected (' + hiddenIframes.length + ')');

          const cryptoPayment = ['bitcoin only', 'btc only', 'crypto only', 'cryptocurrency only', 'pay with bitcoin', 'send btc to'];
          if (cryptoPayment.some(function(p) { return lowerText.includes(p); })) patterns.push('Cryptocurrency-only payment option detected');

          const crossDomainForms = Array.from(document.querySelectorAll('form[action]')).filter(function(f) {
            try {
              const action = new URL(f.action, window.location.href);
              return action.hostname !== hostname && action.hostname !== '';
            } catch { return false; }
          });
          if (crossDomainForms.length > 0) patterns.push('Form submitting to external domain (' + crossDomainForms.length + ')');

          return {
            url: window.location.href,
            domain: hostname,
            title: document.title,
            hasSSL: window.location.protocol === 'https:',
            metaDescription: document.querySelector('meta[name="description"]')?.content || '',
            metaKeywords: document.querySelector('meta[name="keywords"]')?.content || '',
            metaAuthor: document.querySelector('meta[name="author"]')?.content || '',
            reviews: reviews,
            prices: prices,
            formFields: formFields,
            darkPatterns: patterns,
            pageStats: stats,
            socialLinks: socialLinks,
            contactInfo: { emails: emailMatches, phones: phoneMatches, addresses: addressMatch },
            trustBadges: trustBadges,
            urlSignals: urlSignals,
            contentSignals: contentSignals,
            bodyText: sanitizeText(bodyText).slice(0, 1500),
            reviewCount: reviews.length,
            timestamp: Date.now()
          };
        }
      });

      scrapeResult = { success: true, data: results[0].result };
      console.log('[Sentinels] Scrape success:', scrapeResult.data.reviewCount, 'reviews,', scrapeResult.data.darkPatterns.length, 'dark patterns');

    } catch (scrapeErr) {
      console.error('[Sentinels] Scrape error:', scrapeErr.message);

      // ── Retry: re-inject content script and try SCRAPE via messaging ──
      console.log('[Sentinels] Attempting fallback via content script injection...');
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        await new Promise(r => setTimeout(r, 200));

        const fallbackResult = await chrome.tabs.sendMessage(tabId, { type: 'SCRAPE' });
        if (fallbackResult?.success) {
          scrapeResult = fallbackResult;
          console.log('[Sentinels] Fallback scrape succeeded');
        } else {
          sendResponse({ success: false, error: 'Failed to scrape page. The page may restrict extensions.' });
          return;
        }
      } catch (retryErr) {
        console.error('[Sentinels] Fallback scrape also failed:', retryErr.message);
        sendResponse({ success: false, error: 'Failed to scrape page. The page may restrict extensions.' });
        return;
      }
    }

    if (!scrapeResult?.success) {
      sendResponse({ success: false, error: scrapeResult?.error || 'Could not scrape page.' });
      return;
    }

    // Send to backend
    console.log('[Sentinels] Sending to backend:', _apiBase);
    const headers = { 'Content-Type': 'application/json' };
    if (_apiKey) headers['X-Sentinels-Key'] = _apiKey;

    const response = await fetch(`${_apiBase}/api/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify(scrapeResult.data)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const msg = text && text.length < 300 ? ` ${text}` : '';
      throw new Error(`Backend error: ${response.status}${msg}`.trim());
    }

    const result = await response.json();
    console.log('[Sentinels] Analysis result:', result.verdict, result.score);

    // Store in IndexedDB
    await dbStoreReport(result);

    // Cache in storage for popup
    await chrome.storage.local.set({
      [`scan_${tabId}`]: {
        result,
        url: scrapeResult.data.url,
        timestamp: Date.now()
      }
    });

    // Update badge
    updateBadge(tabId, result.score, result.verdict);

    // Check threshold for warning
    if (result.score < _severityThreshold && _showNotifications && !isAutoScan) {
      try {
        const domain = new URL(scrapeResult.data.url).hostname;
        showChromeNotification(tabId, scrapeResult.data.url,
          `⚠️ Warning: "${domain}" scored ${result.score}/100 - ${result.verdict}\n${result.summary || ''}`,
          result.verdict
        );
        await dbStoreWarning({
          url: scrapeResult.data.url,
          title: scrapeResult.data.title || scrapeResult.data.url,
          score: result.score,
          verdict: result.verdict,
          flags: result.flags || [],
          summary: result.summary || ''
        });
      } catch (e) {}
    }

    sendResponse({ success: true, result });

  } catch (err) {
    console.error('[Sentinels] Analysis error:', err);
    const safeMsg = (err.message || '').includes('Backend error')
      ? 'Backend is unreachable or returned an error. Is the server running?'
      : (err.message || '').includes('fetch')
        ? 'Could not connect to the analysis server. Check your connection.'
        : 'Analysis failed. Please try again.';
    sendResponse({ success: false, error: safeMsg });
  }
}

function waitForTabComplete(tabId, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Timeout waiting for tab to load'));
    }, timeoutMs);

    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

// ── Badge Updates from Storage Changes ──────────────────────────
chrome.storage.onChanged.addListener((changes) => {
  Object.entries(changes).forEach(([key, { newValue }]) => {
    if (key.startsWith('scan_') && newValue?.result) {
      const tabId = parseInt(key.replace('scan_', ''));
      const score = newValue.result.score;
      const verdict = newValue.result.verdict;
      updateBadge(tabId, score, verdict);
    }
  });
});

// ── Installation & Startup ──────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Sentinels] Extension installed');
  // Initialize IndexedDB
  openDB().then(() => console.log('[Sentinels] IndexedDB initialized')).catch(err => console.error('[Sentinels] IndexedDB init error:', err));
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Sentinels] Extension started');
  loadConfig();
});

// ============================================================
//  Is This Legit? — popup.js
//  Redesigned popup with light/dark theme, history, details
// ============================================================

let currentTabId = null;
let highlightsActive = false;
let lastResult = null;
let scanHistory = [];

const STORAGE_KEY = 'itl_scan_history';
const THEME_KEY = 'itl_theme';
const MAX_HISTORY = 50;

// ========== Theme Management ==========

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (!icon) return;

  // Clear existing content
  while (icon.firstChild) icon.removeChild(icon.firstChild);

  const svgNS = 'http://www.w3.org/2000/svg';

  if (theme === 'dark') {
    // Moon icon
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
    icon.appendChild(path);
  } else {
    // Sun icon
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '5');
    icon.appendChild(circle);

    const lines = [
      ['12','1','12','3'], ['12','21','12','23'],
      ['4.22','4.22','5.64','5.64'], ['18.36','18.36','19.78','19.78'],
      ['1','12','3','12'], ['21','12','23','12'],
      ['4.22','19.78','5.64','18.36'], ['18.36','5.64','19.78','4.22']
    ];
    lines.forEach(([x1,y1,x2,y2]) => {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      icon.appendChild(line);
    });
  }
}

async function loadTheme() {
  return new Promise(resolve => {
    chrome.storage.local.get([THEME_KEY], (data) => {
      const theme = data[THEME_KEY] || getSystemTheme();
      applyTheme(theme);
      resolve(theme);
    });
  });
}

async function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  await new Promise(resolve => {
    chrome.storage.local.set({ [THEME_KEY]: next }, resolve);
  });
}

// ========== Settings ==========

const SETTINGS_KEYS = { apiKey: 'itl_api_key', backendUrl: 'itl_backend_url' };

async function loadSettings() {
  const data = await new Promise(resolve => {
    chrome.storage.local.get([SETTINGS_KEYS.apiKey, SETTINGS_KEYS.backendUrl], resolve);
  });
  
  if (data[SETTINGS_KEYS.backendUrl]) {
    document.getElementById('settingBackendUrl').value = data[SETTINGS_KEYS.backendUrl];
  }
  if (data[SETTINGS_KEYS.apiKey]) {
    document.getElementById('settingApiKey').value = data[SETTINGS_KEYS.apiKey];
  }
}

async function saveSettings() {
  const backendUrl = document.getElementById('settingBackendUrl').value.trim();
  const apiKey = document.getElementById('settingApiKey').value.trim();
  
  await new Promise(resolve => {
    chrome.storage.local.set({
      [SETTINGS_KEYS.backendUrl]: backendUrl,
      [SETTINGS_KEYS.apiKey]: apiKey
    }, resolve);
  });
  
  const savedMsg = document.getElementById('settingsSaved');
  savedMsg.style.display = 'block';
  setTimeout(() => { savedMsg.style.display = 'none'; }, 2000);
}

// ========== Initialization ==========

document.addEventListener('DOMContentLoaded', async () => {
  // Load theme first for instant render
  await loadTheme();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  currentTabId = tab.id;
  loadHistory();

  document.getElementById('currentUrl').textContent = tab.url || 'Unknown';

  const cached = await getCachedResult(tab.id, tab.url);
  if (cached) {
    try {
      renderResult(cached);
    } catch (renderErr) {
      console.error('[Popup] Cached render error:', renderErr);
      showError('Failed to display cached results.');
    }
  }

  // Event listeners
  document.getElementById('scanBtn').addEventListener('click', startScan);
  document.getElementById('rescanBtn')?.addEventListener('click', startScan);
  document.getElementById('highlightBtn')?.addEventListener('click', toggleHighlights);
  document.getElementById('clearHistoryBtn')?.addEventListener('click', clearHistory);
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
  document.getElementById('getApiKeyLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://console.groq.com' });
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.target));
  });

  loadSettings();
});

// ========== History ==========

async function loadHistory() {
  const data = await new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], r => resolve(r[STORAGE_KEY] || []));
  });
  scanHistory = data;
}

async function saveToHistory(result) {
  const entry = {
    url: result.url,
    score: result.score,
    verdict: result.verdict,
    flags: result.flags,
    summary: result.summary,
    timestamp: result.scanTimestamp || new Date().toISOString()
  };

  scanHistory.unshift(entry);
  if (scanHistory.length > MAX_HISTORY) {
    scanHistory = scanHistory.slice(0, MAX_HISTORY);
  }

  await new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY]: scanHistory }, resolve);
  });
}

// ========== Panel Navigation ==========

function switchPanel(panelId) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add('active');

  const btn = document.querySelector(`.nav-btn[data-target="${panelId}"]`);
  if (btn) btn.classList.add('active');

  if (panelId === 'panel-history') renderHistory();
  if (panelId === 'panel-details') renderDetails();
}

// ========== History Rendering ==========

function renderHistory() {
  const container = document.getElementById('historyList');
  container.innerHTML = '';

  if (scanHistory.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'history-empty';
    const iconDiv = document.createElement('div');
    iconDiv.className = 'history-empty-icon';
    iconDiv.textContent = '\u{1F50D}';
    emptyDiv.appendChild(iconDiv);
    emptyDiv.appendChild(document.createTextNode('No scan history yet'));
    container.appendChild(emptyDiv);
    return;
  }

  scanHistory.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'history-item';

    const color = item.verdict === 'SAFE'
      ? 'var(--safe)'
      : item.verdict === 'SUSPICIOUS'
        ? 'var(--warn)'
        : 'var(--danger)';

    const iconSvg = createVerdictIcon(item.verdict);

    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'history-score';
    scoreDiv.style.color = color;
    scoreDiv.appendChild(iconSvg);
    scoreDiv.appendChild(document.createTextNode(' ' + item.score));

    const infoDiv = document.createElement('div');
    infoDiv.className = 'history-info';

    const urlDiv = document.createElement('div');
    urlDiv.className = 'history-url';
    urlDiv.textContent = (item.url || '').replace(/^https?:\/\//, '').slice(0, 40);

    const timeDiv = document.createElement('div');
    timeDiv.className = 'history-time';
    timeDiv.textContent = new Date(item.timestamp).toLocaleString();

    infoDiv.appendChild(urlDiv);
    infoDiv.appendChild(timeDiv);

    div.appendChild(scoreDiv);
    div.appendChild(infoDiv);

    div.addEventListener('click', () => {
      switchPanel('panel-scan');
      try {
        renderResult(item);
      } catch (renderErr) {
        console.error('[Popup] History render error:', renderErr);
        showError('Failed to display this scan result.');
      }
    });

    container.appendChild(div);
  });
}

function clearHistory() {
  scanHistory = [];
  chrome.storage.local.set({ [STORAGE_KEY]: [] });
  renderHistory();
}

// ========== Details Rendering ==========

function renderDetails() {
  const container = document.getElementById('detailsContent');
  container.innerHTML = '';

  if (!lastResult) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'history-empty';
    const iconDiv = document.createElement('div');
    iconDiv.className = 'history-empty-icon';
    iconDiv.textContent = '\u{1F4C4}';
    emptyDiv.appendChild(iconDiv);
    emptyDiv.appendChild(document.createTextNode('Run a scan to see details'));
    container.appendChild(emptyDiv);
    return;
  }

  const d = lastResult.details || {};

  // ── Domain Information section ──
  const domainSection = createDetailSection('Domain Information', createSvgIcon('search'));
  if (lastResult.domainCreated) {
    const createdDate = new Date(lastResult.domainCreated);
    if (!isNaN(createdDate.getTime())) {
      domainSection.appendChild(createDetailItem('Registered', createdDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })));
      domainSection.appendChild(createDetailItem('Domain Age', formatDomainAgeFromDate(createdDate)));
    }
  } else if (lastResult.domainAge != null) {
    domainSection.appendChild(createDetailItem('Domain Age', formatDomainAgeFallback(lastResult.domainAge)));
  } else {
    domainSection.appendChild(createDetailItem('Domain Age', 'Unknown'));
  }
  if (lastResult.registrar) {
    domainSection.appendChild(createDetailItem('Registrar', lastResult.registrar));
  }
  if (lastResult.registrantOrg) {
    domainSection.appendChild(createDetailItem('Organization', lastResult.registrantOrg));
  }
  domainSection.appendChild(createDetailItem('SSL', lastResult.hasSSL ? 'Secure (HTTPS)' : 'No SSL'));
  if (lastResult.isPhishing) {
    domainSection.appendChild(createDetailItem('Threat DB', 'FLAGGED', 'risk'));
  } else {
    domainSection.appendChild(createDetailItem('Threat DB', 'Clean'));
  }
  container.appendChild(domainSection);

  // ── Risk Analysis section ──
  const riskSection = createDetailSection('Risk Analysis', createSvgIcon('upload'));
  riskSection.appendChild(createDetailItem('Confidence', d.confidence || 'N/A'));
  container.appendChild(riskSection);

  // ── Risk Factors section ──
  if (d.riskFactors?.length) {
    const rfSection = createDetailSection('Risk Factors', createSvgIcon('alert'));
    d.riskFactors.forEach(f => {
      rfSection.appendChild(createDetailItem('', f, 'risk'));
    });
    container.appendChild(rfSection);
  }

  // ── Positive Signals section ──
  if (d.positiveSignals?.length) {
    const psSection = createDetailSection('Positive Signals', createSvgIcon('check'));
    d.positiveSignals.forEach(s => {
      psSection.appendChild(createDetailItem('', s, 'positive'));
    });
    container.appendChild(psSection);
  }

  // ── Recommendations section ──
  if (d.recommendations?.length) {
    const recSection = createDetailSection('Recommendations', createSvgIcon('info'));
    d.recommendations.forEach(r => {
      recSection.appendChild(createDetailItem('', r));
    });
    container.appendChild(recSection);
  }

  // ── Scan Metadata section ──
  const metaSection = createDetailSection('Scan Metadata', createSvgIcon('search'));
  metaSection.appendChild(createDetailItem('URL', lastResult.url || '--', 'url'));
  metaSection.appendChild(createDetailItem('Analysis time', (lastResult.analysisMs || 0) + 'ms'));
  metaSection.appendChild(createDetailItem('Scanned', new Date(lastResult.scanTimestamp).toLocaleString()));
  container.appendChild(metaSection);
}

// ── Safe DOM helpers for details ─────────────────────────────

function createDetailSection(title, iconEl) {
  const section = document.createElement('div');
  section.className = 'detail-section';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'detail-title';
  if (iconEl) titleDiv.appendChild(iconEl);
  titleDiv.appendChild(document.createTextNode(' ' + title));
  section.appendChild(titleDiv);

  return section;
}

function createDetailItem(label, value, extraClass) {
  const item = document.createElement('div');
  item.className = 'detail-item' + (extraClass ? ' ' + extraClass : '');

  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;
  item.appendChild(labelSpan);

  const valueSpan = document.createElement('span');
  if (extraClass !== 'url') {
    valueSpan.textContent = value;
  } else {
    valueSpan.className = 'detail-value';
    valueSpan.textContent = value;
  }
  item.appendChild(valueSpan);

  return item;
}

function createSvgIcon(type) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');

  if (type === 'upload') {
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4');
    svg.appendChild(path);
    const poly = document.createElementNS(svgNS, 'polyline');
    poly.setAttribute('points', '17 8 12 3 7 8');
    svg.appendChild(poly);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', '12'); line.setAttribute('y1', '3');
    line.setAttribute('x2', '12'); line.setAttribute('y2', '15');
    svg.appendChild(line);
  } else if (type === 'alert') {
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z');
    svg.appendChild(path);
    const l1 = document.createElementNS(svgNS, 'line');
    l1.setAttribute('x1', '12'); l1.setAttribute('y1', '9');
    l1.setAttribute('x2', '12'); l1.setAttribute('y2', '13');
    svg.appendChild(l1);
    const l2 = document.createElementNS(svgNS, 'line');
    l2.setAttribute('x1', '12'); l2.setAttribute('y1', '17');
    l2.setAttribute('x2', '12.01'); l2.setAttribute('y2', '17');
    svg.appendChild(l2);
  } else if (type === 'check') {
    const poly = document.createElementNS(svgNS, 'polyline');
    poly.setAttribute('points', '20 6 9 17 4 12');
    svg.appendChild(poly);
  } else if (type === 'info') {
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '10');
    svg.appendChild(circle);
    const l1 = document.createElementNS(svgNS, 'line');
    l1.setAttribute('x1', '12'); l1.setAttribute('y1', '16');
    l1.setAttribute('x2', '12'); l1.setAttribute('y2', '12');
    svg.appendChild(l1);
    const l2 = document.createElementNS(svgNS, 'line');
    l2.setAttribute('x1', '12'); l2.setAttribute('y1', '8');
    l2.setAttribute('x2', '12.01'); l2.setAttribute('y2', '8');
    svg.appendChild(l2);
  } else if (type === 'search') {
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '11'); circle.setAttribute('cy', '11'); circle.setAttribute('r', '8');
    svg.appendChild(circle);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', '21'); line.setAttribute('y1', '21');
    line.setAttribute('x2', '16.65'); line.setAttribute('y2', '16.65');
    svg.appendChild(line);
  } else if (type === 'x') {
    svg.setAttribute('stroke-width', '3');
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '10');
    svg.appendChild(circle);
    const l1 = document.createElementNS(svgNS, 'line');
    l1.setAttribute('x1', '15'); l1.setAttribute('y1', '9');
    l1.setAttribute('x2', '9'); l1.setAttribute('y2', '15');
    svg.appendChild(l1);
    const l2 = document.createElementNS(svgNS, 'line');
    l2.setAttribute('x1', '9'); l2.setAttribute('y1', '9');
    l2.setAttribute('x2', '15'); l2.setAttribute('y2', '15');
    svg.appendChild(l2);
  }

  return svg;
}

/**
 * Creates an SVG verdict icon element (check, alert, or x) for history items
 */
function createVerdictIcon(verdict) {
  if (verdict === 'SAFE') return createSvgIcon('check');
  if (verdict === 'SUSPICIOUS') return createSvgIcon('alert');
  return createSvgIcon('x');
}

// ========== Scanning ==========

async function startScan() {
  showLoading();

  const steps = [
    'Scraping page data...',
    'Checking domain intel...',
    'Querying PhishTank DB...',
    'Running AI analysis...',
    'Generating verdict...'
  ];

  let stepIdx = 0;
  const stepEl = document.getElementById('loadingStep');
  const stepInterval = setInterval(() => {
    if (stepIdx < steps.length - 1) stepIdx++;
    stepEl.textContent = steps[stepIdx];
  }, 600);

  try {
    let response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_PAGE',
      tabId: currentTabId
    });

    if (!response?.success && /loading/i.test(response?.error || '')) {
      document.getElementById('loadingStep').textContent = 'Waiting for page to finish loading...';
      try {
        await waitForTabComplete(currentTabId, 20000);
        response = await chrome.runtime.sendMessage({
          type: 'ANALYZE_PAGE',
          tabId: currentTabId
        });
      } catch {
        response = { success: false, error: 'Page took too long to load. Refresh and try again.' };
      }
    }

    clearInterval(stepInterval);
    console.log('[Popup] Response:', response);

    if (!response?.success) {
      console.error('[Popup] Error:', response?.error);
      showError(response?.error || 'Unknown error occurred');
      return;
    }

    lastResult = response.result;
    await saveToHistory(response.result);

    const trialNote = document.getElementById('trialNote');
    if (trialNote) trialNote.style.display = 'none';

    try {
      renderResult(response.result);
    } catch (renderErr) {
      console.error('[Popup] Render error:', renderErr);
      showError('Failed to display results. Please try scanning again.');
    }

  } catch (err) {
    clearInterval(stepInterval);
    showError(err.message || 'Failed to connect to backend. Is the server running?');
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

// ========== Result Rendering ==========

function renderResult(result) {
  hideAll();
  document.getElementById('resultPanel').style.display = 'block';

  const { score, verdict, flags, summary, domainAge, isPhishing, hasSSL, reviewCount, details } = result;

  // Score ring animation
  const circle = document.getElementById('scoreCircle');
  const circumference = 2 * Math.PI * 36; // r=36
  const offset = circumference - (score / 100) * circumference;
  const color = verdict === 'SAFE'
    ? 'var(--safe)'
    : verdict === 'SUSPICIOUS'
      ? 'var(--warn)'
      : 'var(--danger)';

  circle.style.stroke = color;
  setTimeout(() => { circle.style.strokeDashoffset = offset; }, 100);

  const scoreEl = document.getElementById('scoreNum');
  scoreEl.textContent = score;
  scoreEl.style.color = color;

  // Verdict badge
  const badge = document.getElementById('verdictBadge');
  badge.className = `verdict-badge ${verdict.toLowerCase()}`;
  badge.innerHTML = '';
  badge.appendChild(document.createTextNode(verdict + ' '));

  // Confidence
  if (details?.confidence) {
    const span = document.createElement('span');
    span.id = 'confidenceLevel';
    span.className = `confidence-badge ${details.confidence}`;
    span.textContent = details.confidence.toUpperCase();
    badge.appendChild(span);
  }

  document.getElementById('verdictSummary').textContent = summary || 'Analysis complete.';

  renderFlags(flags || []);

  // Domain intelligence
  const sslEl = document.getElementById('sslStatus');
  sslEl.textContent = hasSSL ? 'Secure' : 'No SSL';
  sslEl.style.color = hasSSL ? 'var(--safe)' : 'var(--danger)';

  // Domain age — use domainCreated date for accurate calendar math
  const ageEl = document.getElementById('domainAge');
  const ageSubEl = document.getElementById('domainAgeSub');
  const domainCreated = result.domainCreated;

  if (domainCreated) {
    const createdDate = new Date(domainCreated);
    if (!isNaN(createdDate.getTime())) {
      // Proper calendar-based age
      const ageText = formatDomainAgeFromDate(createdDate);
      ageEl.textContent = ageText;

      // Show actual registration date below
      if (ageSubEl) {
        ageSubEl.textContent = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        ageSubEl.style.display = 'block';
      }

      // Color based on age in days
      const ageDays = domainAge || Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      if (ageDays < 30) {
        ageEl.style.color = 'var(--danger)';
      } else if (ageDays < 180) {
        ageEl.style.color = 'var(--warn)';
      } else {
        ageEl.style.color = 'var(--safe)';
      }
    } else {
      ageEl.textContent = domainAge != null ? formatDomainAgeFallback(domainAge) : 'Unknown';
      ageEl.style.color = domainAge != null && domainAge >= 180 ? 'var(--safe)' : 'var(--text-muted)';
      if (ageSubEl) ageSubEl.style.display = 'none';
    }
  } else if (domainAge != null && domainAge >= 0) {
    ageEl.textContent = formatDomainAgeFallback(domainAge);
    if (domainAge < 30) {
      ageEl.style.color = 'var(--danger)';
    } else if (domainAge < 180) {
      ageEl.style.color = 'var(--warn)';
    } else {
      ageEl.style.color = 'var(--safe)';
    }
    if (ageSubEl) ageSubEl.style.display = 'none';
  } else {
    ageEl.textContent = 'Unknown';
    ageEl.style.color = 'var(--text-muted)';
    if (ageSubEl) ageSubEl.style.display = 'none';
  }

  // Registrar
  const registrarEl = document.getElementById('registrarName');
  if (registrarEl) {
    registrarEl.textContent = result.registrar || 'Unknown';
    registrarEl.style.color = result.registrar ? 'var(--text-primary)' : 'var(--text-muted)';
  }

  const phishEl = document.getElementById('phishStatus');
  phishEl.textContent = isPhishing ? 'FLAGGED' : 'Clean';
  phishEl.style.color = isPhishing ? 'var(--danger)' : 'var(--safe)';

  document.getElementById('reviewCount').textContent = reviewCount != null ? `${reviewCount} found` : '--';

  lastResult = result;
  switchPanel('panel-scan');
}

function renderFlags(flags) {
  const container = document.getElementById('flagsList');
  container.innerHTML = '';

  if (!flags || flags.length === 0) {
    const noFlags = document.createElement('div');
    noFlags.className = 'no-flags';
    noFlags.textContent = 'No issues detected on this page';
    container.appendChild(noFlags);
    return;
  }

  const dangerKeywords = ['scam', 'phish', 'fake', 'fraud', 'malicious', 'spam'];

  flags.forEach((flag, i) => {
    const div = document.createElement('div');
    const isDanger = dangerKeywords.some(k => flag.toLowerCase().includes(k));
    div.className = `flag-item ${isDanger ? 'bad' : 'warn'} fade-in`;
    div.style.animationDelay = `${i * 0.04}s`;

    const iconEl = isDanger ? createSvgIcon('x') : createSvgIcon('alert');
    // Reset stroke-width for flag icons (x icon has stroke-width 3 from createSvgIcon)
    if (!isDanger) iconEl.setAttribute('stroke-width', '2');

    const iconSpan = document.createElement('span');
    iconSpan.className = 'flag-icon';
    iconSpan.appendChild(iconEl);

    const textSpan = document.createElement('span');
    textSpan.className = 'flag-text';
    textSpan.textContent = flag;

    div.appendChild(iconSpan);
    div.appendChild(textSpan);
    container.appendChild(div);
  });
}

// ========== Highlights ==========

function toggleHighlights() {
  const btn = document.getElementById('highlightBtn');

  if (highlightsActive) {
    chrome.runtime.sendMessage({ type: 'CLEAR_PAGE', tabId: currentTabId });
    btn.textContent = 'Highlight Issues';
    highlightsActive = false;
  } else {
    chrome.runtime.sendMessage({
      type: 'HIGHLIGHT_PAGE',
      tabId: currentTabId,
      flags: lastResult?.flags || []
    });
    btn.textContent = 'Clear Highlights';
    highlightsActive = true;
  }
}

// ========== UI State Helpers ==========

function showLoading() {
  hideAll();
  document.getElementById('loadingState').style.display = 'flex';
  document.getElementById('scanBtn').disabled = true;
  document.getElementById('loadingStep').textContent = 'Scraping page data...';
  switchPanel('panel-scan');
}

function showError(msg) {
  hideAll();
  document.getElementById('errorState').style.display = 'block';
  document.getElementById('errorMsg').textContent = msg;
  document.getElementById('scanBtn').disabled = false;
  switchPanel('panel-scan');
}

function hideAll() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('resultPanel').style.display = 'none';
  document.getElementById('errorState').style.display = 'none';
  const welcome = document.getElementById('welcomeState');
  if (welcome) welcome.style.display = 'none';
  document.getElementById('scanBtn').disabled = false;
}

// ========== Cache ==========

/**
 * Format domain age from a Date object using proper calendar math.
 * Returns strings like "28 years, 5 months" or "15 days".
 */
function formatDomainAgeFromDate(created) {
  const now = new Date();
  let years = now.getFullYear() - created.getFullYear();
  let months = now.getMonth() - created.getMonth();
  let days = now.getDate() - created.getDate();

  if (days < 0) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years > 0 && months > 0) {
    return `${years} yr${years !== 1 ? 's' : ''}, ${months} mo`;
  }
  if (years > 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
  if (months > 0) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  }
  const totalDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  if (totalDays === 0) return 'Today';
  return `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
}

/**
 * Fallback: format domain age from raw day count (less accurate).
 * Used only when domainCreated date is not available.
 */
function formatDomainAgeFallback(days) {
  if (days == null || days < 0) return 'Unknown';
  if (days === 0) return 'Today';
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  }
  // Approximate with 365.25 for leap years
  const years = Math.floor(days / 365.25);
  const remainDays = days - Math.floor(years * 365.25);
  const remainMonths = Math.floor(remainDays / 30.44);
  if (remainMonths > 0) {
    return `${years} yr${years !== 1 ? 's' : ''}, ${remainMonths} mo`;
  }
  return `${years} year${years !== 1 ? 's' : ''}`;
}

async function getCachedResult(tabId, url) {
  return new Promise(resolve => {
    chrome.storage.local.get([`scan_${tabId}`], (data) => {
      const cached = data[`scan_${tabId}`];
      if (cached && cached.url === url && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
        resolve(cached.result);
      } else {
        resolve(null);
      }
    });
  });
}

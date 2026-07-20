// ============================================================
//  Sentinels — popup.js
//  UPGRADED: collapsible panels, whitelist/blacklist UI,
//  settings management, false reporting, history search/filter,
//  IndexedDB integration, threat breakdown bars, ELI5
// ============================================================

let currentTabId = null;
let highlightsActive = false;
let lastResult = null;
let scanHistory = [];
let whitelistData = [];
let blacklistData = [];
let settingsData = {};

const STORAGE_KEY = 'sent_scan_history';
const THEME_KEY = 'sent_theme';
const MAX_HISTORY = 100;

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
  while (icon.firstChild) icon.removeChild(icon.firstChild);

  const svgNS = 'http://www.w3.org/2000/svg';
  if (theme === 'dark') {
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
    icon.appendChild(path);
  } else {
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

// ========== Initialization ==========

document.addEventListener('DOMContentLoaded', async () => {
  await loadTheme();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  currentTabId = tab.id;
  document.getElementById('currentUrl').textContent = tab.url || 'Unknown';

  await loadHistory();
  await loadWhitelist();
  await loadBlacklist();
  await loadSettingsData();
  await loadSettingsUI();

  const cached = await getCachedResult(tab.id, tab.url);
  if (cached) {
    try {
      renderResult(cached);
    } catch (renderErr) {
      console.error('[Popup] Cached render error:', renderErr);
    }
  }

  // ── Event Listeners ──
  document.getElementById('scanBtn').addEventListener('click', startScan);
  document.getElementById('rescanBtn')?.addEventListener('click', startScan);
  document.getElementById('highlightBtn')?.addEventListener('click', toggleHighlights);
  document.getElementById('clearHistoryBtn')?.addEventListener('click', clearHistory);
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

  // Settings
  document.getElementById('saveApiSettings')?.addEventListener('click', saveApiSettings);
  document.getElementById('saveGeneralSettings')?.addEventListener('click', saveGeneralSettings);

  // Whitelist/Blacklist
  document.getElementById('addWhitelistBtn')?.addEventListener('click', () => addDomain('whitelist'));
  document.getElementById('addBlacklistBtn')?.addEventListener('click', () => addDomain('blacklist'));

  // History search/filter
  document.getElementById('historySearchInput')?.addEventListener('input', renderHistory);
  document.getElementById('historySearchClear')?.addEventListener('click', () => {
    document.getElementById('historySearchInput').value = '';
    renderHistory();
  });

  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderHistory();
    });
  });

  // Settings tabs
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.settings-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.settingsTab).classList.add('active');
    });
  });

  // Collapsible panels
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      const parent = header.parentElement;
      parent.classList.toggle('open');
    });
  });

  // Severity slider
  const slider = document.getElementById('severitySlider');
  const sliderVal = document.getElementById('severityValue');
  if (slider && sliderVal) {
    slider.addEventListener('input', () => {
      sliderVal.textContent = slider.value;
    });
  }

  // Toggle switches
  document.querySelectorAll('.toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
    });
  });

  // Feedback buttons
  document.getElementById('reportFalsePositiveBtn')?.addEventListener('click', () => reportFeedback('false_positive'));
  document.getElementById('reportFalseNegativeBtn')?.addEventListener('click', () => reportFeedback('false_negative'));

  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.target));
  });

  // Keyboard shortcut: Enter in whitelist/blacklist input
  document.getElementById('whitelistInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addDomain('whitelist');
  });
  document.getElementById('blacklistInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addDomain('blacklist');
  });
});

// ========== Settings Persistence ==========

async function loadSettingsData() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (response?.success) {
      settingsData = response.settings;
    }
  } catch (err) {
    console.error('[Popup] Load settings error:', err);
  }
}

async function loadSettingsUI() {
  // API settings
  const data = await new Promise(resolve => {
    chrome.storage.local.get(['sent_backend_url', 'sent_api_key'], resolve);
  });
  if (data.sent_backend_url) document.getElementById('settingBackendUrl').value = data.sent_backend_url;
  if (data.sent_api_key) document.getElementById('settingApiKey').value = data.sent_api_key;

  // Severity threshold
  const threshold = settingsData.severityThreshold || 40;
  const slider = document.getElementById('severitySlider');
  const sliderVal = document.getElementById('severityValue');
  if (slider) slider.value = threshold;
  if (sliderVal) sliderVal.textContent = threshold;

  // Auto-scan toggle
  const autoScan = settingsData.autoScan !== false;
  const autoToggle = document.getElementById('autoScanToggle');
  if (autoToggle) autoToggle.classList.toggle('active', autoScan);

  // Notifications toggle
  const showNotifs = settingsData.showNotifications !== false;
  const notifToggle = document.getElementById('notificationsToggle');
  if (notifToggle) notifToggle.classList.toggle('active', showNotifs);
}

async function saveApiSettings() {
  const backendUrl = document.getElementById('settingBackendUrl').value.trim();
  const apiKey = document.getElementById('settingApiKey').value.trim();

  await chrome.runtime.sendMessage({
    type: 'SAVE_SETTINGS',
    settings: { backendUrl, apiKey }
  });

  const savedMsg = document.getElementById('settingsSaved');
  savedMsg.style.display = 'block';
  setTimeout(() => { savedMsg.style.display = 'none'; }, 2000);
}

async function saveGeneralSettings() {
  const severityThreshold = parseInt(document.getElementById('severitySlider').value) || 40;
  const autoScan = document.getElementById('autoScanToggle').classList.contains('active');
  const showNotifications = document.getElementById('notificationsToggle').classList.contains('active');

  await chrome.runtime.sendMessage({
    type: 'SAVE_SETTINGS',
    settings: { severityThreshold, autoScan, showNotifications }
  });

  updateFooter('Settings saved', '#22c55e');
  setTimeout(() => updateFooter('Ready', ''), 2000);
}

// ========== Whitelist/Blacklist Management ==========

async function loadWhitelist() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_WHITELIST' });
    if (response?.success) {
      whitelistData = response.list || [];
      renderWhitelist();
    }
  } catch (err) {
    console.error('[Popup] Load whitelist error:', err);
  }
}

async function loadBlacklist() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_BLACKLIST' });
    if (response?.success) {
      blacklistData = response.list || [];
      renderBlacklist();
    }
  } catch (err) {
    console.error('[Popup] Load blacklist error:', err);
  }
}

function renderWhitelist() {
  const container = document.getElementById('whitelistList');
  if (!container) return;
  container.innerHTML = '';
  if (whitelistData.length === 0) {
    container.innerHTML = '<div class="text-muted" style="font-size:11px;padding:4px 0;">No whitelisted domains</div>';
    return;
  }
  whitelistData.forEach(item => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `<span>${item.domain}</span><span class="remove-btn" data-domain="${item.domain}" data-list="whitelist">&times;</span>`;
    container.appendChild(div);
  });
  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      removeDomain(btn.dataset.list, btn.dataset.domain);
    });
  });
}

function renderBlacklist() {
  const container = document.getElementById('blacklistList');
  if (!container) return;
  container.innerHTML = '';
  if (blacklistData.length === 0) {
    container.innerHTML = '<div class="text-muted" style="font-size:11px;padding:4px 0;">No blacklisted domains</div>';
    return;
  }
  blacklistData.forEach(item => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `<span>${item.domain}</span><span class="remove-btn" data-domain="${item.domain}" data-list="blacklist">&times;</span>`;
    container.appendChild(div);
  });
  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      removeDomain(btn.dataset.list, btn.dataset.domain);
    });
  });
}

async function addDomain(listType) {
  const inputId = listType === 'whitelist' ? 'whitelistInput' : 'blacklistInput';
  const input = document.getElementById(inputId);
  const domain = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!domain) return;

  const msgType = listType === 'whitelist' ? 'ADD_WHITELIST' : 'ADD_BLACKLIST';
  await chrome.runtime.sendMessage({ type: msgType, domain });

  input.value = '';
  if (listType === 'whitelist') {
    await loadWhitelist();
  } else {
    await loadBlacklist();
  }
  updateFooter(`Added to ${listType}: ${domain}`, '#22c55e');
  setTimeout(() => updateFooter('Ready', ''), 2000);
}

async function removeDomain(listType, domain) {
  const msgType = listType === 'whitelist' ? 'REMOVE_WHITELIST' : 'REMOVE_BLACKLIST';
  await chrome.runtime.sendMessage({ type: msgType, domain });

  if (listType === 'whitelist') {
    await loadWhitelist();
  } else {
    await loadBlacklist();
  }
  updateFooter(`Removed from ${listType}: ${domain}`, '#f59e0b');
  setTimeout(() => updateFooter('Ready', ''), 2000);
}

// ========== Feedback Reporting ==========

async function reportFeedback(type) {
  if (!lastResult) {
    updateFooter('Scan a page first to report feedback', '#ef4444');
    setTimeout(() => updateFooter('Ready', ''), 2000);
    return;
  }

  const expectedVerdict = type === 'false_positive' ? 'SAFE' : 'SCAM';

  try {
    await chrome.runtime.sendMessage({
      type: type === 'false_positive' ? 'REPORT_FALSE_POSITIVE' : 'REPORT_FALSE_NEGATIVE',
      url: lastResult.url,
      score: lastResult.score,
      verdict: lastResult.verdict,
      expectedVerdict
    });
    updateFooter(`${type === 'false_positive' ? 'False positive' : 'False negative'} reported. Thank you!`, '#22c55e');
    setTimeout(() => updateFooter('Ready', ''), 3000);
  } catch (err) {
    console.error('[Popup] Feedback error:', err);
    updateFooter('Failed to submit report', '#ef4444');
    setTimeout(() => updateFooter('Ready', ''), 2000);
  }
}

// ========== History ==========

async function loadHistory() {
  try {
    // Load from both IndexedDB (via background) and local storage
    const response = await chrome.runtime.sendMessage({ type: 'GET_REPORTS' });
    if (response?.success && response.reports) {
      scanHistory = response.reports.map(r => ({
        url: r.url,
        score: r.score,
        verdict: r.verdict,
        flags: r.flags || [],
        summary: r.summary || '',
        timestamp: r.timestamp || Date.now()
      }));
    }

    // Also merge with local storage history
    const localData = await new Promise(resolve => {
      chrome.storage.local.get([STORAGE_KEY], r => resolve(r[STORAGE_KEY] || []));
    });

    // Merge and deduplicate
    const urlSet = new Set(scanHistory.map(h => h.url + h.timestamp));
    localData.forEach(item => {
      const key = item.url + item.timestamp;
      if (!urlSet.has(key)) {
        scanHistory.push(item);
        urlSet.add(key);
      }
    });

    // Sort by timestamp descending
    scanHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit
    if (scanHistory.length > MAX_HISTORY) {
      scanHistory = scanHistory.slice(0, MAX_HISTORY);
    }
  } catch (err) {
    console.error('[Popup] Load history error:', err);
    // Fallback to local storage
    const data = await new Promise(resolve => {
      chrome.storage.local.get([STORAGE_KEY], r => resolve(r[STORAGE_KEY] || []));
    });
    scanHistory = data;
  }
}

async function saveToHistory(result) {
  const entry = {
    url: result.url,
    score: result.score,
    verdict: result.verdict,
    flags: result.flags || [],
    summary: result.summary || '',
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
  if (panelId === 'panel-settings') {
    loadWhitelist();
    loadBlacklist();
  }
}

// ========== History Rendering ==========

function renderHistory() {
  const container = document.getElementById('historyList');
  container.textContent = '';

  const query = (document.getElementById('historySearchInput')?.value || '').toLowerCase();
  const activeFilter = document.querySelector('.filter-chip.active');
  const filter = activeFilter ? activeFilter.dataset.filter : 'all';

  let filtered = scanHistory;

  // Apply filter
  if (filter !== 'all') {
    filtered = filtered.filter(item => item.verdict === filter);
  }

  // Apply search
  if (query) {
    filtered = filtered.filter(item =>
      (item.url || '').toLowerCase().includes(query) ||
      (item.summary || '').toLowerCase().includes(query) ||
      (item.flags || []).some(f => f.toLowerCase().includes(query))
    );
  }

  if (filtered.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'history-empty';
    emptyDiv.innerHTML = `<div class="history-empty-icon">&#128269;</div>${query ? 'No results for "' + query + '"' : 'No scan history yet'}`;
    container.appendChild(emptyDiv);
    return;
  }

  filtered.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'history-item fade-in';

    const color = item.verdict === 'SAFE'
      ? 'var(--safe)' : item.verdict === 'SUSPICIOUS'
        ? 'var(--warn)' : 'var(--danger)';

    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'history-score';
    scoreDiv.style.color = color;
    scoreDiv.textContent = item.score || '--';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'history-info';

    const urlDiv = document.createElement('div');
    urlDiv.className = 'history-url';
    urlDiv.textContent = (item.url || '').replace(/^https?:\/\//, '').slice(0, 45);

    const timeDiv = document.createElement('div');
    timeDiv.className = 'history-time';
    const ts = item.timestamp ? new Date(item.timestamp) : new Date();
    timeDiv.textContent = ts.toLocaleString();

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
  updateFooter('History cleared', '#22c55e');
  setTimeout(() => updateFooter('Ready', ''), 2000);
}

// ========== Details Rendering ==========

function renderDetails() {
  const container = document.getElementById('detailsContent');
  container.innerHTML = '';

  if (!lastResult) {
    container.innerHTML = '<div class="history-empty"><div class="history-empty-icon">&#128196;</div>Run a scan to see details</div>';
    return;
  }

  const d = lastResult.details || {};

  // Domain Information
  const domainSection = createDetailSection('Domain Information', 'search');
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
  if (lastResult.registrar) domainSection.appendChild(createDetailItem('Registrar', lastResult.registrar));
  if (lastResult.registrantOrg) domainSection.appendChild(createDetailItem('Organization', lastResult.registrantOrg));
  domainSection.appendChild(createDetailItem('SSL', lastResult.hasSSL ? 'Secure (HTTPS)' : 'No SSL'));
  domainSection.appendChild(createDetailItem('Threat DB', lastResult.isPhishing ? 'FLAGGED' : 'Clean', lastResult.isPhishing ? 'risk' : ''));
  container.appendChild(domainSection);

  // Risk Analysis
  const riskSection = createDetailSection('Risk Analysis', 'upload');
  if (d.confidence) riskSection.appendChild(createDetailItem('Confidence', d.confidence));
  if (d.modelVersion) riskSection.appendChild(createDetailItem('Model', d.modelVersion));
  container.appendChild(riskSection);

  // Risk Factors
  if (d.riskFactors?.length) {
    const rfSection = createDetailSection('Risk Factors', 'alert');
    d.riskFactors.forEach(f => rfSection.appendChild(createDetailItem('', f, 'risk')));
    container.appendChild(rfSection);
  }

  // Positive Signals
  if (d.positiveSignals?.length) {
    const psSection = createDetailSection('Positive Signals', 'check');
    d.positiveSignals.forEach(s => psSection.appendChild(createDetailItem('', s, 'positive')));
    container.appendChild(psSection);
  }

  // Recommendations
  if (d.recommendations?.length) {
    const recSection = createDetailSection('Recommendations', 'info');
    d.recommendations.forEach(r => recSection.appendChild(createDetailItem('', r)));
    container.appendChild(recSection);
  }

  // Scan Metadata
  const metaSection = createDetailSection('Scan Metadata', 'search');
  metaSection.appendChild(createDetailItem('URL', lastResult.url || '--', 'url'));
  metaSection.appendChild(createDetailItem('Analysis time', (lastResult.analysisMs || 0) + 'ms'));
  metaSection.appendChild(createDetailItem('Scanned', lastResult.scanTimestamp ? new Date(lastResult.scanTimestamp).toLocaleString() : '--'));
  container.appendChild(metaSection);
}

function createDetailSection(title, iconType) {
  const section = document.createElement('div');
  section.className = 'detail-section';
  const titleDiv = document.createElement('div');
  titleDiv.className = 'detail-title';
  titleDiv.appendChild(createSvgIcon(iconType));
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
  svg.setAttribute('width', '14'); svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');

  const paths = {
    upload: [['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }], ['polyline', { points: '17 8 12 3 7 8' }], ['line', { x1: '12', y1: '3', x2: '12', y2: '15' }]],
    alert: [['path', { d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }], ['line', { x1: '12', y1: '9', x2: '12', y2: '13' }], ['line', { x1: '12', y1: '17', x2: '12.01', y2: '17' }]],
    check: [['polyline', { points: '20 6 9 17 4 12' }]],
    info: [['circle', { cx: '12', cy: '12', r: '10' }], ['line', { x1: '12', y1: '16', x2: '12', y2: '12' }], ['line', { x1: '12', y1: '8', x2: '12.01', y2: '8' }]],
    search: [['circle', { cx: '11', cy: '11', r: '8' }], ['line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' }]],
    x: [['circle', { cx: '12', cy: '12', r: '10' }], ['line', { x1: '15', y1: '9', x2: '9', y2: '15' }], ['line', { x1: '9', y1: '9', x2: '15', y2: '15' }]]
  };

  const elements = paths[type] || paths.info;
  elements.forEach(([tag, attrs]) => {
    const el = document.createElementNS(svgNS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    svg.appendChild(el);
  });

  return svg;
}

function createVerdictIcon(verdict) {
  if (verdict === 'SAFE') return createSvgIcon('check');
  if (verdict === 'SUSPICIOUS') return createSvgIcon('alert');
  return createSvgIcon('x');
}

// ========== Scanning ==========

async function startScan() {
  showLoading();

  const steps = ['Scraping page data...', 'Checking domain intel...', 'Querying PhishTank DB...', 'Running AI analysis...', 'Generating verdict...'];
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
        response = await chrome.runtime.sendMessage({ type: 'ANALYZE_PAGE', tabId: currentTabId });
      } catch {
        response = { success: false, error: 'Page took too long to load.' };
      }
    }

    clearInterval(stepInterval);

    if (!response?.success) {
      showError(response?.error || 'Unknown error');
      return;
    }

    lastResult = response.result;
    await saveToHistory(response.result);

    try {
      renderResult(response.result);
    } catch (renderErr) {
      console.error('[Popup] Render error:', renderErr);
      showError('Failed to display results.');
    }

  } catch (err) {
    clearInterval(stepInterval);
    showError(err.message || 'Failed to connect to backend.');
  }
}

function waitForTabComplete(tabId, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Timeout'));
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

  // ── Score Ring ──
  const circle = document.getElementById('scoreCircle');
  const circumference = 2 * Math.PI * 34.5;
  const offset = circumference - (score / 100) * circumference;
  const color = verdict === 'SAFE' ? 'var(--safe)' : verdict === 'SUSPICIOUS' ? 'var(--warn)' : 'var(--danger)';

  circle.style.stroke = color;
  setTimeout(() => { circle.style.strokeDashoffset = offset; }, 100);

  const scoreEl = document.getElementById('scoreNum');
  scoreEl.textContent = score;
  scoreEl.style.color = color;

  // ── Verdict Badge ──
  const badge = document.getElementById('verdictBadge');
  badge.className = `verdict-badge ${verdict.toLowerCase()}`;
  badge.textContent = '';
  badge.appendChild(document.createTextNode(verdict + ' '));

  if (details?.confidence) {
    const span = document.createElement('span');
    span.id = 'confidenceLevel';
    span.className = `confidence-badge ${details.confidence}`;
    span.textContent = details.confidence.toUpperCase();
    badge.appendChild(span);
  }

  document.getElementById('verdictSummary').textContent = summary || 'Analysis complete.';

  // ── Risk Level Badge ──
  renderRiskLevel(result);

  // ── Explanation (why we reached this conclusion) ──
  renderExplanation(result);

  // ── Real World Example ──
  renderRealWorldExample(result);

  // ── Render ELI5 ──
  renderEli5(result);

  // ── Actions (What should I do) ──
  renderActions(result);

  // ── Red Flags Count ──
  const redflagsCount = document.getElementById('redflagsCount');
  const redflags = result.redFlags || [];
  if (redflagsCount) {
    const count = redflags.length;
    redflagsCount.textContent = count;
    redflagsCount.className = `count-badge ${count === 0 ? 'safe' : count <= 3 ? 'warn' : 'danger'}`;
  }

  // ── Render Red Flag Cards ──
  renderRedFlags(result);

  // ── Render Threat Breakdown ──
  renderThreatBreakdown(result);

  // ── Render Recommendations ──
  renderRecommendations(result);

  // ── Domain Intelligence ──
  const sslEl = document.getElementById('sslStatus');
  sslEl.textContent = hasSSL ? 'Secure' : 'No SSL';
  sslEl.style.color = hasSSL ? 'var(--safe)' : 'var(--danger)';

  const ageEl = document.getElementById('domainAge');
  const ageSubEl = document.getElementById('domainAgeSub');

  if (result.domainCreated) {
    const createdDate = new Date(result.domainCreated);
    if (!isNaN(createdDate.getTime())) {
      ageEl.textContent = formatDomainAgeFromDate(createdDate);
      if (ageSubEl) {
        ageSubEl.textContent = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        ageSubEl.style.display = 'block';
      }
      const ageDays = domainAge || Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      ageEl.style.color = ageDays < 30 ? 'var(--danger)' : ageDays < 180 ? 'var(--warn)' : 'var(--safe)';
    } else {
      ageEl.textContent = domainAge != null ? formatDomainAgeFallback(domainAge) : 'Unknown';
      ageEl.style.color = domainAge != null && domainAge >= 180 ? 'var(--safe)' : 'var(--text-muted)';
      if (ageSubEl) ageSubEl.style.display = 'none';
    }
  } else if (domainAge != null && domainAge >= 0) {
    ageEl.textContent = formatDomainAgeFallback(domainAge);
    ageEl.style.color = domainAge < 30 ? 'var(--danger)' : domainAge < 180 ? 'var(--warn)' : 'var(--safe)';
    if (ageSubEl) ageSubEl.style.display = 'none';
  } else {
    ageEl.textContent = 'Unknown';
    ageEl.style.color = 'var(--text-muted)';
    if (ageSubEl) ageSubEl.style.display = 'none';
  }

  const registrarEl = document.getElementById('registrarName');
  if (registrarEl) {
    registrarEl.textContent = result.registrar || 'Unknown';
    registrarEl.style.color = result.registrar ? 'var(--text-primary)' : 'var(--text-muted)';
  }

  const phishEl = document.getElementById('phishStatus');
  phishEl.textContent = isPhishing ? 'FLAGGED' : 'Clean';
  phishEl.style.color = isPhishing ? 'var(--danger)' : 'var(--safe)';

  document.getElementById('reviewCount').textContent = reviewCount != null ? `${reviewCount} found` : '--';

  // Ensure redflags collapsible is open if there are red flags
  const redflagsCollapse = document.getElementById('redflagsCollapse');
  if (redflagsCollapse && redflags.length > 0) {
    redflagsCollapse.classList.add('open');
  }

  lastResult = result;
  switchPanel('panel-scan');
  updateFooter(`${verdict} — ${score}/100`, color);
}

// ── Threat Breakdown ──
function renderThreatBreakdown(result) {
  const container = document.getElementById('threatBreakdownBody');
  if (!container) return;
  container.innerHTML = '';

  const categories = [
    { name: 'URL & Domain', score: calculateUrlRisk(result), max: 100 },
    { name: 'Dark Patterns', score: calculateDarkPatternRisk(result), max: 100 },
    { name: 'Content Signals', score: calculateContentRisk(result), max: 100 },
    { name: 'Page Structure', score: calculateStructureRisk(result), max: 100 },
    { name: 'Trust Signals', score: calculateTrustRisk(result), max: 100 }
  ];

  categories.forEach(cat => {
    const wrap = document.createElement('div');
    wrap.className = 'threat-bar-wrap';

    const label = document.createElement('div');
    label.className = 'threat-bar-label';
    label.innerHTML = `<span class="name">${cat.name}</span><span class="score">${cat.score}%</span>`;
    wrap.appendChild(label);

    const track = document.createElement('div');
    track.className = 'threat-bar-track';

    const fill = document.createElement('div');
    fill.className = 'threat-bar-fill';
    const riskColor = cat.score < 30 ? 'var(--safe)' : cat.score < 60 ? 'var(--warn)' : 'var(--danger)';
    fill.style.background = riskColor;
    setTimeout(() => { fill.style.width = cat.score + '%'; }, 200);

    track.appendChild(fill);
    wrap.appendChild(track);
    container.appendChild(wrap);
  });

  // Expand threat breakdown if risk is significant
  const totalRisk = categories.reduce((s, c) => s + c.score, 0) / categories.length;
  const collapse = document.getElementById('threatBreakdownCollapse');
  if (collapse && totalRisk > 30) {
    collapse.classList.add('open');
  }
}

function calculateUrlRisk(result) {
  const signals = result.details?.urlSignals || {};
  let risk = 0;
  if (signals.isIPAddress) risk += 30;
  if (signals.hasAtSymbol) risk += 20;
  if (signals.hasNonASCII) risk += 25;
  if (signals.hasBase64) risk += 15;
  if (signals.hasPhishyToken) risk += 20;
  if (signals.longUrl) risk += 10;
  if (signals.suspiciousParamCount > 1) risk += 15;
  if (signals.subdomainCount > 3) risk += 10;
  if (signals.hyphenCount > 2) risk += 10;
  if (signals.digitCount > 3) risk += 10;
  return Math.min(risk, 100);
}

function calculateDarkPatternRisk(result) {
  const flags = result.flags || [];
  const darkPatternFlags = flags.filter(f =>
    f.toLowerCase().includes('countdown') || f.toLowerCase().includes('scarcity') ||
    f.toLowerCase().includes('urgency') || f.toLowerCase().includes('guilt') ||
    f.toLowerCase().includes('hidden') || f.toLowerCase().includes('deceptive') ||
    f.toLowerCase().includes('fake') || f.toLowerCase().includes('misleading')
  );
  return Math.min(darkPatternFlags.length * 20, 100);
}

function calculateContentRisk(result) {
  const signals = result.details?.contentSignals || {};
  let risk = 0;
  if (!signals.hasFavicon) risk += 10;
  if (!signals.hasOpenGraph) risk += 15;
  if (!signals.hasStructuredData) risk += 10;
  if (!signals.hasCanonical) risk += 10;
  if (!signals.hasCopyright) risk += 10;
  if (!signals.hasPrivacyPolicy) risk += 15;
  if (!signals.hasTerms) risk += 10;
  if (signals.hiddenIframeCount > 0) risk += 15;
  if (signals.hasCryptoMiner) risk += 30;
  if (signals.hasMetaRefresh) risk += 15;
  if (signals.externalScriptRatio > 0.7) risk += 15;
  if (signals.capsRatio > 0.1) risk += 10;
  return Math.min(risk, 100);
}

function calculateStructureRisk(result) {
  const stats = result.details?.pageStats || {};
  let risk = 0;
  if (stats.iframes > 3) risk += 15;
  if (stats.externalLinks > stats.totalLinks * 0.7) risk += 20;
  if (stats.forms > 3) risk += 15;
  if (!stats.hasLogin && stats.hasCheckout) risk += 15;
  return Math.min(risk, 100);
}

function calculateTrustRisk(result) {
  let risk = 0;
  if (!result.hasSSL) risk += 30;
  if (result.domainAge != null && result.domainAge < 30) risk += 25;
  if (result.domainAge != null && result.domainAge < 90) risk += 15;
  if (result.isPhishing) risk += 30;
  const badges = result.details?.trustBadges || [];
  if (badges.length === 0) risk += 10;
  return Math.min(risk, 100);
}

// ── Recommendations ──
function renderRecommendations(result) {
  const container = document.getElementById('recommendationsBody');
  if (!container) return;
  container.innerHTML = '';

  const recs = [];
  const { score, verdict, flags, hasSSL, domainAge, isPhishing, details } = result;

  if (!hasSSL) recs.push('This site does not use HTTPS. Avoid entering sensitive information.');
  if (isPhishing) recs.push('This domain has been flagged in phishing databases. Exercise extreme caution.');
  if (domainAge != null && domainAge < 7) recs.push('This domain was registered less than a week ago. This is a common tactic for scam sites.');
  if (domainAge != null && domainAge < 30) recs.push('This domain is very new (less than a month). Verify the site\'s legitimacy before proceeding.');
  if (flags && flags.length > 0) {
    if (flags.some(f => f.toLowerCase().includes('password'))) recs.push('Be cautious when entering passwords — the form may submit data to an untrusted server.');
    if (flags.some(f => f.toLowerCase().includes('countdown'))) recs.push('Fake countdown timers are a common pressure tactic. Take your time to evaluate the offer.');
    if (flags.some(f => f.toLowerCase().includes('crypto') || f.toLowerCase().includes('bitcoin'))) recs.push('Cryptocurrency-only payment options are often used by scam sites. Proceed with caution.');
  }
  if (score < 60) recs.push('Consider looking up independent reviews and verifying the company through external sources.');
  if (score >= 80) recs.push('This site appears legitimate based on our analysis. Always use common sense.');

  if (recs.length === 0) {
    container.innerHTML = '<div class="text-muted" style="font-size:11px;">No recommendations for this page.</div>';
  } else {
    recs.forEach(r => {
      const div = document.createElement('div');
      div.style.cssText = 'padding:6px 8px; margin-bottom:4px; border-radius:6px; background:var(--bg-primary); border:1px solid var(--border); font-size:11px; line-height:1.4;';
      div.textContent = '• ' + r;
      container.appendChild(div);
    });
  }

  // Open recommendations if there are significant risks
  const collapse = document.getElementById('recommendationsCollapse');
  if (collapse && recs.length > 1) {
    collapse.classList.add('open');
  }
}

// ── Flags Rendering ──
function renderFlags(flags) {
  const container = document.getElementById('flagsList');
  container.textContent = '';

  if (!flags || flags.length === 0) {
    container.innerHTML = '<div class="no-flags">No issues detected on this page</div>';
    return;
  }

  const dangerKeywords = ['scam', 'phish', 'fake', 'fraud', 'malicious', 'spam', 'password', 'credential'];

  flags.forEach((flag, i) => {
    const div = document.createElement('div');
    const isDanger = dangerKeywords.some(k => flag.toLowerCase().includes(k));
    div.className = `flag-item ${isDanger ? 'bad' : 'warn'} fade-in`;
    div.style.animationDelay = `${i * 0.04}s`;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'flag-icon';
    iconSpan.appendChild(isDanger ? createSvgIcon('x') : createSvgIcon('alert'));

    const textSpan = document.createElement('span');
    textSpan.className = 'flag-text';
    textSpan.textContent = flag;

    div.appendChild(iconSpan);
    div.appendChild(textSpan);
    container.appendChild(div);
  });
}

// ── ELI5 (Explain Like I'm 5) ──
function renderEli5(result) {
  const container = document.getElementById('eli5Body');
  if (!container) return;

  const eli5 = result.eli5 || generateEli5Fallback(result.score, result.verdict, result.flags || []);
  container.textContent = eli5;

  // Open ELI5 for suspicious/scam results
  const collapse = document.getElementById('eli5Collapse');
  if (collapse && result.verdict !== 'SAFE') {
    collapse.classList.add('open');
  }
}

function generateEli5Fallback(score, verdict, flags) {
  if (verdict === 'SAFE' || score >= 70) {
    return 'This website looks safe! Think of it like a store in a busy mall \u2014 it has proper licenses, security cameras, and has been around long enough that other people trust it. You can browse and shop here normally.';
  }
  if (verdict === 'SCAM' || score < 40) {
    let reasons = '';
    if (flags.length > 0) {
      reasons = ' Red flags we found: ' + flags.slice(0, 3).join(', ') + '.';
    }
    return 'This website is acting suspiciously \u2014 like a street vendor who won\'t show their ID, asks for your credit card upfront, and keeps looking over their shoulder.' + reasons + ' Our advice: close this tab and don\'t share any personal info.';
  }
  let reasons = '';
  if (flags.length > 0) {
    reasons = ' Things that seem off: ' + flags.slice(0, 2).join(', ') + '.';
  }
  return 'This website gives mixed signals \u2014 like a store with a proper sign but a broken lock on the door.' + reasons + ' We recommend being careful: don\'t enter passwords or payment details until you\'re sure it\'s legit.';
}

// ── Risk Level ──
function renderRiskLevel(result) {
  const badge = document.getElementById('riskLevelBadge');
  if (!badge) return;
  const riskLevel = result.riskLevel || calculateRiskLevel(result.score);
  if (!riskLevel) { badge.style.display = 'none'; return; }
  badge.style.display = 'inline-flex';
  badge.className = 'risk-badge ' + riskLevel;
  const icons = { low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' };
  badge.textContent = (icons[riskLevel] || '') + ' ' + riskLevel.toUpperCase();
}

function calculateRiskLevel(score) {
  if (score >= 80) return 'low';
  if (score >= 60) return 'medium';
  if (score >= 30) return 'high';
  return 'critical';
}

// ── Explanation (why we reached this conclusion) ──
function renderExplanation(result) {
  const box = document.getElementById('explanationBox');
  const textEl = document.getElementById('explanationText');
  if (!box || !textEl) return;

  const explanation = result.explanation || generateFallbackExplanation(result);
  if (explanation) {
    box.style.display = 'block';
    textEl.textContent = explanation;
  } else {
    box.style.display = 'none';
  }
}

function generateFallbackExplanation(result) {
  const { score, verdict, flags } = result;
  if (verdict === 'SAFE' || score >= 70) {
    return 'We found no significant issues with this website. It has proper security measures and appears legitimate based on our analysis.';
  }
  if (verdict === 'SCAM' || score < 40) {
    let sigs = '';
    if (flags && flags.length > 0) sigs = ' Specific signals: ' + flags.slice(0, 3).join(', ') + '.';
    return 'This website shows multiple strong indicators of being malicious or fraudulent.' + sigs + ' These signals together give us high confidence this site is not trustworthy.';
  }
  let sigs = '';
  if (flags && flags.length > 0) sigs = ' Signals include: ' + flags.slice(0, 2).join(', ') + '.';
  return 'This site has some suspicious characteristics we cannot ignore.' + sigs + ' While not definitively malicious, caution is strongly advised.';
}

// ── Real World Example ──
function renderRealWorldExample(result) {
  const card = document.getElementById('realWorldCard');
  const textEl = document.getElementById('realWorldText');
  if (!card || !textEl) return;

  const example = result.realWorldExample || generateFallbackExample(result);
  if (example) {
    card.style.display = 'flex';
    textEl.textContent = example;
  } else {
    card.style.display = 'none';
  }
}

function generateFallbackExample(result) {
  const { verdict, score } = result;
  if (verdict === 'SAFE' || score >= 70) {
    return 'This is like a store in a busy shopping center — it has proper licenses, security cameras, and other customers have shopped here without issues.';
  }
  if (verdict === 'SCAM' || score < 40) {
    return 'This is like someone wearing a fake police uniform and asking for your wallet — it looks official at first glance, but nothing checks out up close.';
  }
  return 'This is like a food stall with a proper menu board but no health inspection certificate — it might be fine, but you cannot be sure.';
}

// ── Actions (What should I do) ──
function renderActions(result) {
  const section = document.getElementById('actionsSection');
  const list = document.getElementById('actionList');
  if (!section || !list) return;

  const actions = result.actions || generateFallbackActions(result);
  if (!actions || actions.length === 0) { section.style.display = 'none'; return; }

  section.style.display = 'block';
  list.innerHTML = '';

  const theme = result.verdict === 'SAFE' ? 'safe' : result.verdict === 'SUSPICIOUS' ? 'warn' : 'danger';
  const icons = { safe: '✓', warn: '!', danger: '✕' };

  actions.forEach(action => {
    const item = document.createElement('div');
    item.className = 'action-item ' + theme;
    item.innerHTML = '<span class="action-icon">' + (icons[theme] || '•') + '</span><span>' + action + '</span>';
    list.appendChild(item);
  });
}

function generateFallbackActions(result) {
  const { verdict, score, flags } = result;
  if (verdict === 'SAFE' || score >= 70) {
    return ['Safe to continue browsing', 'Always use common sense online'];
  }
  if (verdict === 'SCAM' || score < 40) {
    const actions = ['Close this website immediately', 'Do NOT enter any personal information'];
    if (flags && flags.some(f => /password|card|bank|ssn/i.test(f))) {
      actions.push('Change passwords if you already entered them');
    }
    return actions;
  }
  return ['Verify this site before entering passwords', 'Check for official contact info', 'Look up independent reviews'];
}

// ── Red Flag Cards ──
function renderRedFlags(result) {
  const container = document.getElementById('redflagsList');
  if (!container) return;

  const redFlags = result.redFlags || generateFallbackRedFlags(result);
  if (!redFlags || redFlags.length === 0) {
    container.innerHTML = '<div class="redflag-empty">No red flags detected on this page</div>';
    return;
  }

  container.innerHTML = '';
  redFlags.forEach((flag, i) => {
    const card = document.createElement('div');
    card.className = 'redflag-card fade-in';
    card.style.animationDelay = (i * 0.04) + 's';

    const severity = flag.severity || 'medium';
    const icons = { critical: '🔴', high: '⚠️', medium: '🟡', low: '🟢' };

    card.innerHTML =
      '<div class="redflag-side ' + severity + '"></div>' +
      '<div class="redflag-body">' +
        '<div class="redflag-icon ' + severity + '">' + (flag.icon || icons[severity] || '⚠️') + '</div>' +
        '<div class="redflag-content">' +
          '<div class="redflag-title">' + escapeHtml(flag.title || 'Suspicious Signal') + '</div>' +
          '<div class="redflag-explanation">' + escapeHtml(flag.explanation || '') + '</div>' +
          '<span class="redflag-severity-tag ' + severity + '">' + severity.toUpperCase() + '</span>' +
        '</div>' +
      '</div>';

    container.appendChild(card);
  });
}

function generateFallbackRedFlags(result) {
  const flags = result.flags || [];
  if (!flags || flags.length === 0) return [];
  return flags.slice(0, 8).map(f => {
    let icon = '🟡', severity = 'medium';
    const lower = f.toLowerCase();
    if (/scam|phish|fraud|malicious|malware|danger/i.test(lower)) { icon = '🔴'; severity = 'critical'; }
    else if (/password|credential|bank|card|ssn|urgent|suspended/i.test(lower)) { icon = '🔴'; severity = 'high'; }
    else if (/fake|spoof|impersonat|deceptive|misleading/i.test(lower)) { icon = '⚠️'; severity = 'high'; }
    else if (/new domain|no ssl|suspicious/i.test(lower)) { icon = '🟡'; severity = 'medium'; }
    return { icon, title: f.length > 50 ? f.slice(0, 47) + '...' : f, explanation: f, severity };
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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
      flags: lastResult?.flags || [],
      fullResult: lastResult || null
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
  // Hide dynamic sections for clean transition
  document.getElementById('explanationBox') && (document.getElementById('explanationBox').style.display = 'none');
  document.getElementById('realWorldCard') && (document.getElementById('realWorldCard').style.display = 'none');
  document.getElementById('actionsSection') && (document.getElementById('actionsSection').style.display = 'none');
}

function updateFooter(text, color) {
  const el = document.getElementById('footerStatus');
  if (el) {
    el.textContent = text;
    if (color) el.style.color = color;
  }
}

// ========== Domain Age Helpers ==========

function formatDomainAgeFromDate(created) {
  const now = new Date();
  let years = now.getFullYear() - created.getFullYear();
  let months = now.getMonth() - created.getMonth();
  let days = now.getDate() - created.getDate();

  if (days < 0) months--;
  if (months < 0) { years--; months += 12; }

  if (years > 0 && months > 0) return `${years} yr${years !== 1 ? 's' : ''}, ${months} mo`;
  if (years > 0) return `${years} year${years !== 1 ? 's' : ''}`;
  if (months > 0) return `${months} month${months !== 1 ? 's' : ''}`;
  const totalDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  if (totalDays === 0) return 'Today';
  return `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
}

function formatDomainAgeFallback(days) {
  if (days == null || days < 0) return 'Unknown';
  if (days === 0) return 'Today';
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? 's' : ''}`;
  const years = Math.floor(days / 365.25);
  const remainMonths = Math.floor((days - years * 365.25) / 30.44);
  if (remainMonths > 0) return `${years} yr${years !== 1 ? 's' : ''}, ${remainMonths} mo`;
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

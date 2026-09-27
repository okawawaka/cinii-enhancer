/**
 * CiNii Research Enhancer - Background Service Worker
 * Handles Unpaywall API requests, caching, and configuration defaults.
 */

const DEFAULT_SETTINGS = {
  unpaywallEmail: 'academic-reader@example.com',
  enableFilter: true,
  enableSearchQuickCopy: true,
  enableSearchPdfDirect: true,
  enableDetailToolbar: true,
  preferredCitation: 'bibtex'
};

// In-memory cache for Unpaywall responses (DOI -> { result, timestamp })
const unpaywallCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Initialize default settings upon installation
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const storage = chrome.storage.sync || chrome.storage.local;
    const current = await storage.get(Object.keys(DEFAULT_SETTINGS));
    const toSet = {};
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (current[key] === undefined) {
        toSet[key] = value;
      }
    }
    if (Object.keys(toSet).length > 0) {
      await storage.set(toSet);
    }
  } catch (err) {
    console.error('[CiNii Enhancer] Failed to initialize settings:', err);
  }
});

// Helper to normalize DOI strings
function cleanDoiString(doi) {
  if (!doi) return '';
  return doi
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .trim();
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'CHECK_UNPAYWALL') {
    handleUnpaywallCheck(message.doi)
      .then(sendResponse)
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep channel open for async response
  }

  if (message.action === 'GET_SETTINGS') {
    const storage = chrome.storage.sync || chrome.storage.local;
    storage.get(DEFAULT_SETTINGS)
      .then(sendResponse)
      .catch(() => sendResponse(DEFAULT_SETTINGS));
    return true;
  }
});

/**
 * Queries Unpaywall API with memory caching
 */
async function handleUnpaywallCheck(rawDoi) {
  const doi = cleanDoiString(rawDoi);
  if (!doi) {
    return { success: false, error: 'Empty or invalid DOI' };
  }

  // Check cache
  const cached = unpaywallCache.get(doi);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const storage = chrome.storage.sync || chrome.storage.local;
  const settings = await storage.get({ unpaywallEmail: DEFAULT_SETTINGS.unpaywallEmail });
  const email = (settings.unpaywallEmail || DEFAULT_SETTINGS.unpaywallEmail).trim();

  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    if (res.status === 404) {
      const result = { success: true, is_oa: false, reason: 'DOI not indexed in Unpaywall' };
      unpaywallCache.set(doi, { result, timestamp: now });
      return result;
    }

    if (!res.ok) {
      return { success: false, error: `Unpaywall API responded with HTTP ${res.status}` };
    }

    const data = await res.json();
    const isOa = Boolean(data.is_oa);
    const bestLoc = data.best_oa_location || null;
    const pdfUrl = bestLoc ? (bestLoc.url_for_pdf || bestLoc.url) : null;

    const result = {
      success: true,
      is_oa: isOa,
      pdf_url: pdfUrl,
      oa_status: data.oa_status || (isOa ? 'oa' : 'closed'),
      host_type: bestLoc ? bestLoc.host_type : null,
      version: bestLoc ? bestLoc.version : null,
      journal_is_oa: data.journal_is_oa || false
    };

    unpaywallCache.set(doi, { result, timestamp: now });
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

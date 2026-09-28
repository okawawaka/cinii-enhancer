/**
 * CiNii Research Enhancer - Background Service Worker
 * Manages configuration defaults and settings synchronization.
 */

const DEFAULT_SETTINGS = {
  enableSearchQuickCopy: true,
  enableDetailToolbar: true,
  enableAbstractCleanup: true,
  preferredCitation: 'bibtex',
  customTemplate: '{authors} ({year})「{title}」『{journal}』{volume}({issue}), pp.{pages}. {url}',
  customTemplateArticle: '{authors} ({year})「{title}」『{journal}』{volume}({issue}), pp.{pages}. {url}',
  customTemplateBook: '{authors} ({year})『{title}』{place}: {publisher}. {url}',
  customTemplateDissertation: '{authors} ({year})『{title}』博士論文, {publisher}. {url}',
  customTemplateLabel: 'カスタム',
  enableItemTypeTemplate: true
};

// Initialize default settings upon extension install or update
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

// Handle settings messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const storage = chrome.storage.sync || chrome.storage.local;

  if (message.action === 'GET_SETTINGS') {
    storage.get(DEFAULT_SETTINGS)
      .then(sendResponse)
      .catch(() => sendResponse(DEFAULT_SETTINGS));
    return true;
  }

  if (message.action === 'SAVE_SETTINGS') {
    storage.set(message.settings || {})
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

/**
 * CiNii Research Enhancer - Popup Controller
 */

const DEFAULT_SETTINGS = {
  unpaywallEmail: 'academic-reader@example.com',
  enableSearchQuickCopy: true,
  enableSearchPdfDirect: true,
  enableDetailToolbar: true,
  enableAbstractCleanup: true,
  preferredCitation: 'bibtex',
  customTemplate: '{authors} ({year})「{title}」『{journal}』{volume}({issue}), pp.{pages}. {url}',
  customTemplateArticle: '{authors} ({year})「{title}」『{journal}』{volume}({issue}), pp.{pages}. {url}',
  customTemplateBook: '{authors} ({year})『{title}』{publisher}. {url}',
  customTemplateDissertation: '{authors} ({year})『{title}』博士論文, {publisher}. {url}',
  customTemplateLabel: 'カスタム',
  enableItemTypeTemplate: true
};

document.addEventListener('DOMContentLoaded', async () => {
  const storage = chrome.storage.sync || chrome.storage.local;

  const enableDetailToolbarInput = document.getElementById('enableDetailToolbar');
  const enableSearchQuickCopyInput = document.getElementById('enableSearchQuickCopy');
  const enableAbstractCleanupInput = document.getElementById('enableAbstractCleanup');
  const preferredCitationInput = document.getElementById('preferredCitation');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');

  const badgeDetailToolbar = document.getElementById('badge-detail-toolbar');
  const badgeSearchCopy = document.getElementById('badge-search-copy');
  const badgeAbstractCleanup = document.getElementById('badge-abstract-cleanup');

  const updateBadge = (checkbox, badge) => {
    if (!checkbox || !badge) return;
    if (checkbox.checked) {
      badge.textContent = '有効';
      badge.className = 'status-badge badge-on';
    } else {
      badge.textContent = '無効';
      badge.className = 'status-badge badge-off';
    }
  };

  // Wire badge update events
  if (enableDetailToolbarInput && badgeDetailToolbar) {
    enableDetailToolbarInput.addEventListener('change', () => updateBadge(enableDetailToolbarInput, badgeDetailToolbar));
  }
  if (enableSearchQuickCopyInput && badgeSearchCopy) {
    enableSearchQuickCopyInput.addEventListener('change', () => updateBadge(enableSearchQuickCopyInput, badgeSearchCopy));
  }
  if (enableAbstractCleanupInput && badgeAbstractCleanup) {
    enableAbstractCleanupInput.addEventListener('change', () => updateBadge(enableAbstractCleanupInput, badgeAbstractCleanup));
  }

  // Load current settings
  let loadedSettings = { ...DEFAULT_SETTINGS };
  try {
    const current = await storage.get(DEFAULT_SETTINGS);
    loadedSettings = { ...DEFAULT_SETTINGS, ...current };

    enableDetailToolbarInput.checked = Boolean(loadedSettings.enableDetailToolbar);
    enableSearchQuickCopyInput.checked = Boolean(loadedSettings.enableSearchQuickCopy);
    enableAbstractCleanupInput.checked = Boolean(loadedSettings.enableAbstractCleanup);

    if (loadedSettings.preferredCitation) {
      preferredCitationInput.value = loadedSettings.preferredCitation;
    }

    updateBadge(enableDetailToolbarInput, badgeDetailToolbar);
    updateBadge(enableSearchQuickCopyInput, badgeSearchCopy);
    updateBadge(enableAbstractCleanupInput, badgeAbstractCleanup);
  } catch (err) {
    console.error('Failed to load settings:', err);
  }

  // Save on button click
  saveBtn.addEventListener('click', async () => {
    const newSettings = {
      ...loadedSettings,
      enableDetailToolbar: enableDetailToolbarInput.checked,
      enableSearchQuickCopy: enableSearchQuickCopyInput.checked,
      enableAbstractCleanup: enableAbstractCleanupInput.checked,
      preferredCitation: preferredCitationInput.value
    };

    try {
      await storage.set(newSettings);
      loadedSettings = newSettings;
      saveStatus.textContent = '設定を保存しました';
      saveStatus.classList.add('is-visible');
      setTimeout(() => {
        saveStatus.classList.remove('is-visible');
      }, 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      saveStatus.textContent = '保存エラー';
      saveStatus.classList.add('is-visible');
    }
  });
});

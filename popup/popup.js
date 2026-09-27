/**
 * CiNii Research Enhancer - Popup Controller
 */

const DEFAULT_SETTINGS = {
  unpaywallEmail: 'academic-reader@example.com',
  enableSearchQuickCopy: true,
  enableSearchPdfDirect: true,
  enableDetailToolbar: true,
  preferredCitation: 'bibtex'
};

document.addEventListener('DOMContentLoaded', async () => {
  const storage = chrome.storage.sync || chrome.storage.local;

  const emailInput = document.getElementById('unpaywallEmail');
  const enableDetailToolbarInput = document.getElementById('enableDetailToolbar');
  const enableSearchPdfDirectInput = document.getElementById('enableSearchPdfDirect');
  const enableSearchQuickCopyInput = document.getElementById('enableSearchQuickCopy');
  const preferredCitationInput = document.getElementById('preferredCitation');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');

  // Load current settings
  try {
    const current = await storage.get(DEFAULT_SETTINGS);
    emailInput.value = current.unpaywallEmail || '';
    enableDetailToolbarInput.checked = Boolean(current.enableDetailToolbar);
    enableSearchPdfDirectInput.checked = Boolean(current.enableSearchPdfDirect);
    enableSearchQuickCopyInput.checked = Boolean(current.enableSearchQuickCopy);
    if (current.preferredCitation) {
      preferredCitationInput.value = current.preferredCitation;
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }

  // Save on button click
  saveBtn.addEventListener('click', async () => {
    const newSettings = {
      unpaywallEmail: emailInput.value.trim() || DEFAULT_SETTINGS.unpaywallEmail,
      enableDetailToolbar: enableDetailToolbarInput.checked,
      enableSearchPdfDirect: enableSearchPdfDirectInput.checked,
      enableSearchQuickCopy: enableSearchQuickCopyInput.checked,
      preferredCitation: preferredCitationInput.value
    };

    try {
      await storage.set(newSettings);
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

/**
 * CiNii Research Enhancer - Content Script
 * Academic-focused UI enhancements: Citation copying, PDF direct navigation, search filtering.
 * Strict design rule: NO Unicode emojis. Crisp SVG iconography and academic styling.
 */

(function () {
  'use strict';

  // Prevent duplicate execution
  if (window.__CINII_ENHANCER_INITIALIZED__) return;
  window.__CINII_ENHANCER_INITIALIZED__ = true;

  // Settings state (synced with storage)
  let userSettings = {
    unpaywallEmail: 'academic-reader@example.com',
    enableSearchQuickCopy: true,
    enableSearchPdfDirect: true,
    enableDetailToolbar: true,
    enableAbstractCleanup: true,
    preferredCitation: 'bibtex'
  };

  // SVGs (Strictly NO EMOJIS, scholarly vector icons)
  const SVGS = {
    QUOTE: `<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 0 4 1.75 6 5 8zm13 0c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 0 4 1.75 6 5 8z"/></svg>`,
    COPY: `<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    CHECK: `<svg class="cinii-enh-icon cinii-enh-icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    PDF: `<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    EXTERNAL: `<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    CLEAN: `<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    CODE: `<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    SPINNER: `<svg class="cinii-enh-icon cinii-enh-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>`,
    CLOSE: `<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  };

  // Toast Notification
  function showToast(message, duration = 2400) {
    let toast = document.getElementById('cinii-enh-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cinii-enh-toast';
      toast.className = 'cinii-enh-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="cinii-enh-toast-icon">${SVGS.CHECK}</span><span class="cinii-enh-toast-text">${escapeHtml(message)}</span>`;
    toast.classList.add('is-visible');

    if (toast.__timeout) clearTimeout(toast.__timeout);
    toast.__timeout = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, duration);
  }

  // Copy to clipboard with visual feedback
  async function copyText(text, successMessage = '引用をクリップボードにコピーしました') {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast(successMessage);
      return true;
    } catch (err) {
      console.error('[CiNii Enhancer] Copy failed:', err);
      showToast('コピーに失敗しました');
      return false;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ==========================================
  // Page Type Detection Helpers
  // ==========================================

  function isDetailPage() {
    return (
      window.location.pathname.includes('/crid/') ||
      Boolean(document.querySelector('.detail, .itemheading, meta[name="citation_title"]'))
    );
  }

  function isSearchPage() {
    if (isDetailPage()) return false;
    return (
      window.location.pathname.startsWith('/all') ||
      window.location.pathname.startsWith('/articles') ||
      window.location.pathname.startsWith('/books') ||
      window.location.pathname.startsWith('/dissertations') ||
      window.location.pathname.startsWith('/projects') ||
      window.location.pathname === '/' ||
      Boolean(document.querySelector('.resultlist, .listContainer, .listitem'))
    );
  }

  // ==========================================
  // Full-Text & PDF Detection Engine
  // ==========================================

  function detectFullTextInElement(element) {
    if (!element) return null;

    // 1. Direct PDF link
    const pdfLinks = element.querySelectorAll('a[href*=".pdf"]');
    for (const a of pdfLinks) {
      const href = a.getAttribute('href') || '';
      if (href && !href.startsWith('javascript:')) {
        return { url: a.href, label: 'PDF' };
      }
    }

    // 2. J-STAGE link (any J-STAGE URL)
    const jstageLinks = element.querySelectorAll('a[href*="jstage.jst.go.jp"]');
    if (jstageLinks.length > 0) {
      return { url: jstageLinks[0].href, label: 'J-STAGE' };
    }

    // 3. Institutional repository link
    const repoLinks = element.querySelectorAll('a[href*="repository"], a[href*="repo."], a[href*="ir.lib."]');
    if (repoLinks.length > 0) {
      return { url: repoLinks[0].href, label: '機関リポジトリ' };
    }

    // 4. CiNii specific bodypdf / fulltext buttons
    const bodyPdf = element.querySelector('.bodypdf, a.bodylink');
    if (bodyPdf) {
      const href = bodyPdf.getAttribute('href') || bodyPdf.querySelector('a')?.getAttribute('href');
      if (href && !href.startsWith('javascript:')) {
        return { url: href.startsWith('http') ? href : window.location.origin + href, label: 'PDF' };
      }
    }

    const cftBtn = element.querySelector('.cfullTextBtn, .fulltextitem a');
    if (cftBtn) {
      const href = cftBtn.getAttribute('href') || cftBtn.closest('a')?.getAttribute('href');
      if (href && !href.startsWith('javascript:')) {
        return { url: href.startsWith('http') ? href : window.location.origin + href, label: '本文リンク' };
      }
    }

    // 5. Open Access tags / classes
    if (element.querySelector('.tag-oa, [class*="openaccess"], [class*="open-access"]')) {
      return { url: null, label: 'オープンアクセス' };
    }

    // 6. DOI link
    const doiLinks = element.querySelectorAll('a[href*="doi.org/"]');
    if (doiLinks.length > 0) {
      return { url: doiLinks[0].href, label: 'DOI' };
    }

    // 7. General text check for OA or full text
    const text = element.textContent;
    if (
      text.includes('オープンアクセス') ||
      text.includes('本文あり') ||
      text.includes('本文へのリンクあり')
    ) {
      return { url: null, label: '本文あり' };
    }

    return null;
  }

  // ==========================================
  // Metadata Extraction Engine
  // ==========================================

  function extractDetailMetadata() {
    const meta = {
      title: '',
      authors: [],
      journal: '',
      year: '',
      volume: '',
      issue: '',
      firstPage: '',
      lastPage: '',
      pages: '',
      doi: '',
      pdfUrl: '',
      url: window.location.href.split('?')[0].split('#')[0],
      publisher: '',
      issn: '',
      isbn: '',
      itemType: 'article'
    };

    // 1. Highwire Press / Google Scholar Meta Tags
    document.querySelectorAll('meta[name^="citation_"]').forEach((el) => {
      const name = el.getAttribute('name').toLowerCase();
      const content = (el.getAttribute('content') || '').trim();
      if (!content) return;

      if (name === 'citation_title') meta.title = content;
      else if (name === 'citation_author') meta.authors.push(content);
      else if (name === 'citation_journal_title') meta.journal = content;
      else if (name === 'citation_publication_date' || name === 'citation_date') {
        const matchYear = content.match(/\b(19\d\d|20\d\d)\b/);
        if (matchYear) meta.year = matchYear[1];
      } else if (name === 'citation_volume') meta.volume = content;
      else if (name === 'citation_issue') meta.issue = content;
      else if (name === 'citation_firstpage') meta.firstPage = content;
      else if (name === 'citation_lastpage') meta.lastPage = content;
      else if (name === 'citation_doi') meta.doi = content;
      else if (name === 'citation_pdf_url') meta.pdfUrl = content;
      else if (name === 'citation_publisher') meta.publisher = content;
      else if (name === 'citation_issn') meta.issn = content;
      else if (name === 'citation_isbn') meta.isbn = content;
    });

    // 2. OpenGraph Fallback
    if (!meta.title) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) meta.title = ogTitle.getAttribute('content').trim();
    }

    // 3. JSON-LD Fallback
    try {
      const jsonLdEl = document.querySelector('script[type="application/ld+json"]');
      if (jsonLdEl) {
        const ld = JSON.parse(jsonLdEl.textContent);
        if (ld) {
          if (!meta.title && ld.name) meta.title = ld.name;
          if (meta.authors.length === 0 && ld.author) {
            const authorList = Array.isArray(ld.author) ? ld.author : [ld.author];
            authorList.forEach((a) => {
              const name = typeof a === 'string' ? a : (a.name || '');
              if (name) meta.authors.push(name);
            });
          }
          if (!meta.year && ld.datePublished) {
            const m = String(ld.datePublished).match(/\b(19\d\d|20\d\d)\b/);
            if (m) meta.year = m[1];
          }
        }
      }
    } catch (e) {
      // ignore json-ld parse error
    }

    // 4. DOM Fallbacks
    if (!meta.title) {
      const titleEl = document.querySelector('.item_mainTitle, h1.item-title, h1.title, .itemheading h1, h1');
      if (titleEl) {
        meta.title = titleEl.textContent.trim().replace(/\s+/g, ' ');
      }
    }

    if (meta.authors.length === 0) {
      const authorEls = document.querySelectorAll('.authorslist a, .author-name, .creator-name, .item-creator a');
      authorEls.forEach((el) => {
        const t = el.textContent.trim();
        if (t && !meta.authors.includes(t)) meta.authors.push(t);
      });
    }

    // Determine pages
    if (meta.firstPage && meta.lastPage) {
      meta.pages = `${meta.firstPage}-${meta.lastPage}`;
    } else if (meta.firstPage) {
      meta.pages = meta.firstPage;
    }

    // Look for DOI in DOM if not yet discovered
    if (!meta.doi) {
      const doiLinks = document.querySelectorAll('a[href*="doi.org/"]');
      for (const link of doiLinks) {
        const match = link.href.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
        if (match) {
          meta.doi = match[0];
          break;
        }
      }
    }

    // Look for direct full-text link in CiNii DOM
    if (!meta.pdfUrl) {
      const direct = detectFullTextInElement(document);
      if (direct && direct.url) {
        meta.pdfUrl = direct.url;
        meta.fullTextLabel = direct.label;
      }
    }

    return meta;
  }

  // ==========================================
  // Citation Formatters
  // ==========================================

  function generateBibTeX(meta) {
    const firstAuthor = meta.authors[0] || 'Unknown';
    const authorKey = firstAuthor
      .replace(/[\s,]+/g, '')
      .replace(/[^\w]/g, '')
      .toLowerCase() || 'item';
    const yearKey = meta.year || 'nodate';
    const firstWord = (meta.title || '')
      .replace(/[^\w\s]/g, '')
      .trim()
      .split(/\s+/)[0]
      .toLowerCase();
    const citeKey = `${authorKey}${yearKey}${firstWord ? '_' + firstWord : ''}`;

    const authorStr = meta.authors.join(' and ') || 'Unknown';

    const fields = [
      `  title     = {{${meta.title || 'Untitled'}}}`,
      `  author    = {${authorStr}}`
    ];

    if (meta.journal) fields.push(`  journal   = {${meta.journal}}`);
    if (meta.year) fields.push(`  year      = {${meta.year}}`);
    if (meta.volume) fields.push(`  volume    = {${meta.volume}}`);
    if (meta.issue) fields.push(`  number    = {${meta.issue}}`);
    if (meta.pages) fields.push(`  pages     = {${meta.pages.replace('-', '--')}}`);
    if (meta.publisher) fields.push(`  publisher = {${meta.publisher}}`);
    if (meta.doi) fields.push(`  doi       = {${meta.doi}}`);
    if (meta.url) fields.push(`  url       = {${meta.url}}`);

    return `@${meta.itemType || 'article'}{${citeKey},\n${fields.join(',\n')}\n}`;
  }

  function generateSIST02(meta) {
    const authors = meta.authors.join(', ') || '著者不明';
    let res = `${authors}. ${meta.title}.`;
    if (meta.journal) res += ` ${meta.journal}.`;

    const parts = [];
    if (meta.year) parts.push(meta.year);
    if (meta.volume && meta.issue) {
      parts.push(`${meta.volume}(${meta.issue})`);
    } else if (meta.volume) {
      parts.push(meta.volume);
    } else if (meta.issue) {
      parts.push(`(${meta.issue})`);
    }

    if (parts.length > 0) {
      res += ` ${parts.join(', ')}`;
    }

    if (meta.pages) {
      res += `, p. ${meta.pages}.`;
    } else {
      res += '.';
    }

    if (meta.doi) {
      res += ` https://doi.org/${meta.doi}`;
    } else if (meta.url) {
      res += ` ${meta.url}`;
    }

    return res.trim();
  }

  function generateAPA(meta) {
    let authorStr = 'Unknown';
    if (meta.authors.length > 0) {
      if (meta.authors.length === 1) {
        authorStr = meta.authors[0];
      } else if (meta.authors.length === 2) {
        authorStr = `${meta.authors[0]} & ${meta.authors[1]}`;
      } else {
        authorStr = `${meta.authors[0]} et al.`;
      }
    }

    const yearStr = meta.year ? `(${meta.year})` : '(n.d.)';
    let res = `${authorStr} ${yearStr}. ${meta.title}.`;

    if (meta.journal) {
      res += ` ${meta.journal}`;
      if (meta.volume) {
        res += `, ${meta.volume}`;
        if (meta.issue) res += `(${meta.issue})`;
      }
      if (meta.pages) {
        res += `, ${meta.pages}`;
      }
      res += '.';
    }

    if (meta.doi) {
      res += ` https://doi.org/${meta.doi}`;
    } else if (meta.url) {
      res += ` ${meta.url}`;
    }

    return res.trim();
  }

  function generateMarkdown(meta) {
    const authors = meta.authors.join(', ') || '著者不明';
    const year = meta.year ? ` (${meta.year})` : '';
    let details = '';
    if (meta.journal) {
      details += ` *${meta.journal}*`;
      if (meta.volume) details += `, Vol.${meta.volume}`;
      if (meta.issue) details += ` No.${meta.issue}`;
      if (meta.pages) details += `, pp.${meta.pages}`;
    }
    const link = meta.url ? `[${meta.title}](${meta.url})` : meta.title;
    return `${authors}${year}. ${link}.${details}`;
  }

  function generateMLA(meta) {
    const author = meta.authors[0] || 'Unknown';
    let res = `${author}. "${meta.title}."`;
    if (meta.journal) res += ` ${meta.journal}`;
    if (meta.volume) res += `, vol. ${meta.volume}`;
    if (meta.issue) res += `, no. ${meta.issue}`;
    if (meta.year) res += `, ${meta.year}`;
    if (meta.pages) res += `, pp. ${meta.pages}`;
    res += '.';
    if (meta.doi) res += ` https://doi.org/${meta.doi}.`;
    else if (meta.url) res += ` ${meta.url}.`;
    return res.trim();
  }

  function generateChicago(meta) {
    const author = meta.authors[0] || 'Unknown';
    const year = meta.year || 'n.d.';
    let res = `${author}. ${year}. "${meta.title}."`;
    if (meta.journal) {
      res += ` ${meta.journal}`;
      if (meta.volume) res += ` ${meta.volume}`;
      if (meta.issue) res += ` (${meta.issue})`;
      if (meta.pages) res += `: ${meta.pages}`;
    }
    res += '.';
    if (meta.doi) res += ` https://doi.org/${meta.doi}.`;
    else if (meta.url) res += ` ${meta.url}.`;
    return res.trim();
  }

  function generateAllCitations(meta) {
    return {
      bibtex: { label: 'BibTeX', text: generateBibTeX(meta) },
      sist02: { label: 'SIST02 (和文標準)', text: generateSIST02(meta) },
      apa: { label: 'APA (第7版)', text: generateAPA(meta) },
      markdown: { label: 'Markdown', text: generateMarkdown(meta) },
      mla: { label: 'MLA (第9版)', text: generateMLA(meta) },
      chicago: { label: 'Chicago (著者-日付)', text: generateChicago(meta) }
    };
  }

  // ==========================================
  // Centered Modal Dialog Builder (画面中央モーダル)
  // ==========================================

  function openCitationModal(citations, paperTitle) {
    // Remove any existing modal
    document.querySelectorAll('.cinii-enh-modal-overlay').forEach((el) => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'cinii-enh-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cinii-enh-modal';

    const titleHtml = paperTitle
      ? `<div class="cinii-enh-modal-paper-title">${escapeHtml(paperTitle)}</div>`
      : '';

    modal.innerHTML = `
      <div class="cinii-enh-modal-header">
        <div class="cinii-enh-modal-header-info">
          <span class="cinii-enh-modal-badge">CiNii Enhancer</span>
          <h2 class="cinii-enh-modal-title">引用フォーマットのコピー</h2>
          ${titleHtml}
        </div>
        <button type="button" class="cinii-enh-modal-close" aria-label="閉じる">${SVGS.CLOSE}</button>
      </div>
      <div class="cinii-enh-modal-body">
        <div class="cinii-enh-modal-list"></div>
      </div>
    `;

    const list = modal.querySelector('.cinii-enh-modal-list');

    for (const [key, item] of Object.entries(citations)) {
      const row = document.createElement('div');
      row.className = 'cinii-enh-modal-item';

      const previewText = item.text.replace(/\n\s+/g, ' ');

      row.innerHTML = `
        <div class="cinii-enh-modal-item-info">
          <div class="cinii-enh-modal-item-label">${escapeHtml(item.label)}</div>
          <div class="cinii-enh-modal-item-preview">${escapeHtml(previewText)}</div>
        </div>
        <button type="button" class="cinii-enh-btn cinii-enh-btn-copy-action">
          ${SVGS.COPY}<span>コピー</span>
        </button>
      `;

      const copyBtn = row.querySelector('.cinii-enh-btn-copy-action');
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const success = await copyText(item.text, `${item.label} をコピーしました`);
        if (success) {
          copyBtn.innerHTML = `${SVGS.CHECK}<span>完了</span>`;
          copyBtn.classList.add('is-copied');
          setTimeout(() => {
            copyBtn.innerHTML = `${SVGS.COPY}<span>コピー</span>`;
            copyBtn.classList.remove('is-copied');
          }, 1800);
        }
      });

      list.appendChild(row);
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeModal = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown);
    };

    modal.querySelector('.cinii-enh-modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKeyDown);
  }

  // ==========================================
  // Detail Page Enhancement (詳細画面のみ実行)
  // ==========================================

  function enhanceDetailPage() {
    if (!userSettings.enableDetailToolbar) return;
    if (document.getElementById('cinii-enh-detail-toolbar')) return;

    const meta = extractDetailMetadata();
    if (!meta.title) return;

    // Anchor: right after heading
    const anchor =
      document.querySelector('.itemheading') ||
      document.querySelector('.item_mainTitle') ||
      document.querySelector('h1') ||
      document.querySelector('#main, .main-content');

    if (!anchor) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'cinii-enh-detail-toolbar';
    toolbar.className = 'cinii-enh-detail-toolbar';

    // Toolbar Brand Label
    const brand = document.createElement('div');
    brand.className = 'cinii-enh-toolbar-brand';
    brand.innerHTML = `<span class="cinii-enh-brand-label">CiNii Enhancer</span>`;
    toolbar.appendChild(brand);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'cinii-enh-btn-group';

    // 1. Citation Modal Trigger Button
    const citeBtn = document.createElement('button');
    citeBtn.type = 'button';
    citeBtn.className = 'cinii-enh-btn cinii-enh-btn-primary';
    citeBtn.innerHTML = `${SVGS.QUOTE}<span>引用をコピー</span>`;

    citeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const citations = generateAllCitations(meta);
      openCitationModal(citations, meta.title);
    });

    btnGroup.appendChild(citeBtn);

    // 2. Full-Text / PDF Direct Button
    const pdfContainer = document.createElement('div');
    pdfContainer.className = 'cinii-enh-pdf-wrapper';

    if (meta.pdfUrl) {
      const pdfBtn = document.createElement('a');
      pdfBtn.className = 'cinii-enh-btn cinii-enh-btn-pdf';
      pdfBtn.href = meta.pdfUrl;
      pdfBtn.target = '_blank';
      pdfBtn.rel = 'noopener noreferrer';
      const label = meta.fullTextLabel ? `PDF / 本文 (${meta.fullTextLabel})` : 'PDFを閲覧';
      pdfBtn.innerHTML = `${SVGS.PDF}<span>${escapeHtml(label)}</span>${SVGS.EXTERNAL}`;
      pdfContainer.appendChild(pdfBtn);
    } else if (meta.doi) {
      // Query Unpaywall API via background worker
      const checkingBtn = document.createElement('button');
      checkingBtn.type = 'button';
      checkingBtn.className = 'cinii-enh-btn cinii-enh-btn-muted';
      checkingBtn.innerHTML = `${SVGS.SPINNER}<span>PDF確認中...</span>`;
      checkingBtn.disabled = true;
      pdfContainer.appendChild(checkingBtn);

      chrome.runtime.sendMessage(
        { action: 'CHECK_UNPAYWALL', doi: meta.doi },
        (res) => {
          pdfContainer.innerHTML = '';
          if (res && res.success && res.is_oa && res.pdf_url) {
            const pdfBtn = document.createElement('a');
            pdfBtn.className = 'cinii-enh-btn cinii-enh-btn-pdf';
            pdfBtn.href = res.pdf_url;
            pdfBtn.target = '_blank';
            pdfBtn.rel = 'noopener noreferrer';
            const badgeType = res.host_type === 'repository' ? '機関OA' : 'オープンアクセス';
            pdfBtn.innerHTML = `${SVGS.PDF}<span>PDF (${badgeType})</span>${SVGS.EXTERNAL}`;
            pdfContainer.appendChild(pdfBtn);
          } else {
            const domDirect = detectFullTextInElement(document);
            if (domDirect && domDirect.url) {
              const linkBtn = document.createElement('a');
              linkBtn.className = 'cinii-enh-btn cinii-enh-btn-pdf';
              linkBtn.href = domDirect.url;
              linkBtn.target = '_blank';
              linkBtn.rel = 'noopener noreferrer';
              linkBtn.innerHTML = `${SVGS.EXTERNAL}<span>${escapeHtml(domDirect.label || '本文リンク')}</span>`;
              pdfContainer.appendChild(linkBtn);
            }
          }
        }
      );
    } else {
      const domDirect = detectFullTextInElement(document);
      if (domDirect && domDirect.url) {
        const linkBtn = document.createElement('a');
        linkBtn.className = 'cinii-enh-btn cinii-enh-btn-pdf';
        linkBtn.href = domDirect.url;
        linkBtn.target = '_blank';
        linkBtn.rel = 'noopener noreferrer';
        linkBtn.innerHTML = `${SVGS.EXTERNAL}<span>${escapeHtml(domDirect.label)}</span>`;
        pdfContainer.appendChild(linkBtn);
      }
    }

    btnGroup.appendChild(pdfContainer);
    toolbar.appendChild(btnGroup);

    anchor.parentNode.insertBefore(toolbar, anchor.nextSibling);
  }

  // ==========================================
  // Search Results Enhancement (検索結果画面のみ実行)
  // ==========================================

  function enhanceSearchResults() {
    // CiNii search result list items: .listitem or .item
    const resultItems = document.querySelectorAll('.listitem, .search-result-item');
    if (resultItems.length === 0) return;

    // Enhance each result item
    resultItems.forEach((item) => {
      enhanceSearchCard(item);
    });
  }

  function enhanceSearchCard(item) {
    if (item.classList.contains('cinii-enh-card-enhanced')) return;
    item.classList.add('cinii-enh-card-enhanced');

    // Identify the main title link within this result item
    const titleLink = item.querySelector('.item_mainTitle a, .articletitle a, h2 a, h3 a, a[href*="/crid/"]');
    if (!titleLink) return;

    const titleText = titleLink.textContent.trim().replace(/\s+/g, ' ');

    // Check full-text availability in this item
    const fullTextInfo = detectFullTextInElement(item);
    const hasFullText = Boolean(fullTextInfo);

    item.setAttribute('data-has-fulltext', hasFullText ? 'true' : 'false');

    // Extract authors from .authorslist
    const authorEls = item.querySelectorAll('.authorslist a, .author-name, .item-creator a');
    const authors = [];
    authorEls.forEach((a) => {
      const name = a.textContent.trim();
      if (name && !authors.includes(name)) authors.push(name);
    });

    // Extract year from text
    const textContent = item.textContent;
    const yearMatch = textContent.match(/\b(19\d\d|20\d\d)\b/);
    const year = yearMatch ? yearMatch[1] : '';

    // Extract DOI if present
    let doi = '';
    const doiMatch = item.innerHTML.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
    if (doiMatch) doi = doiMatch[0];

    const cardMeta = {
      title: titleText,
      authors: authors.length > 0 ? authors : ['著作者'],
      journal: '',
      year: year,
      volume: '',
      issue: '',
      pages: '',
      doi: doi,
      url: titleLink.href.split('?')[0].split('#')[0]
    };

    // Dedicated, clearly bounded toolbar for this card
    const toolbar = document.createElement('div');
    toolbar.className = 'cinii-enh-item-toolbar';

    // 1. Citation Button
    if (userSettings.enableSearchQuickCopy) {
      const citeBtn = document.createElement('button');
      citeBtn.type = 'button';
      citeBtn.className = 'cinii-enh-btn cinii-enh-btn-sm cinii-enh-btn-outline';
      citeBtn.innerHTML = `${SVGS.QUOTE}<span>引用</span>`;

      citeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const citations = generateAllCitations(cardMeta);
        openCitationModal(citations, cardMeta.title);
      });

      toolbar.appendChild(citeBtn);
    }

    // 2. PDF / Full-Text Link Button (only if full text is available)
    if (userSettings.enableSearchPdfDirect) {
      if (fullTextInfo && fullTextInfo.url) {
        const pdfBtn = document.createElement('a');
        pdfBtn.className = 'cinii-enh-btn cinii-enh-btn-sm cinii-enh-btn-pdf';
        pdfBtn.href = fullTextInfo.url;
        pdfBtn.target = '_blank';
        pdfBtn.rel = 'noopener noreferrer';
        const label = fullTextInfo.label || 'PDF';
        pdfBtn.innerHTML = `${SVGS.PDF}<span>${escapeHtml(label)}</span>${SVGS.EXTERNAL}`;
        toolbar.appendChild(pdfBtn);
      } else if (fullTextInfo) {
        const badge = document.createElement('span');
        badge.className = 'cinii-enh-badge cinii-enh-badge-oa';
        badge.textContent = fullTextInfo.label || '本文あり';
        toolbar.appendChild(badge);
      }
    }

    // Append toolbar to the card
    // Look for item_data or insert at the end of item
    const targetAnchor = item.querySelector('.item_data, .item_subData, .articletitle') || item;
    targetAnchor.parentNode.insertBefore(toolbar, targetAnchor.nextSibling);
  }

  // ==========================================
  // Abstract / Description HTML Cleaner (案3: スマート整形 + 原文切替)
  // ==========================================

  function cleanAbstractHtml(raw) {
    if (!raw) return '';
    let text = raw;

    // 1. Decode entities if HTML tags were escaped
    if (text.includes('&lt;') || text.includes('&amp;lt;')) {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      text = doc.body.textContent || text;
      if (text.includes('&lt;')) {
        const doc2 = new DOMParser().parseFromString(text, 'text/html');
        text = doc2.body.textContent || text;
      }
    }

    // 2. Normalize JATS XML tags to standard HTML tags
    text = text
      .replace(/<\/?jats:p[^>]*>/gi, (m) => m.startsWith('</') ? '</p>' : '<p>')
      .replace(/<\/?jats:italic[^>]*>/gi, (m) => m.startsWith('</') ? '</i>' : '<i>')
      .replace(/<\/?jats:bold[^>]*>/gi, (m) => m.startsWith('</') ? '</b>' : '<b>')
      .replace(/<\/?jats:sup[^>]*>/gi, (m) => m.startsWith('</') ? '</sup>' : '<sup>')
      .replace(/<\/?jats:sub[^>]*>/gi, (m) => m.startsWith('</') ? '</sub>' : '<sub>')
      .replace(/<\/?jats:underline[^>]*>/gi, (m) => m.startsWith('</') ? '</u>' : '<u>')
      .replace(/<\/?jats:title[^>]*>/gi, (m) => m.startsWith('</') ? '</strong><br>' : '<strong>')
      .replace(/<\/?jats:[a-zA-Z0-9_-]+[^>]*>/gi, '');

    // 3. Parse and sanitize via DOMParser
    const parsedDoc = new DOMParser().parseFromString(`<div>${text}</div>`, 'text/html');
    const root = parsedDoc.body.firstElementChild;
    if (!root) return text;

    const ALLOWED_TAGS = new Set([
      'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'SUB', 'SUP', 'U', 'CODE', 'UL', 'OL', 'LI'
    ]);
    const REMOVE_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED']);

    function sanitizeNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toUpperCase();

        if (REMOVE_TAGS.has(tag)) {
          node.remove();
          return;
        }

        while (node.attributes.length > 0) {
          node.removeAttribute(node.attributes[0].name);
        }

        const children = Array.from(node.childNodes);
        children.forEach(sanitizeNode);

        if (!ALLOWED_TAGS.has(tag)) {
          while (node.firstChild) {
            node.parentNode.insertBefore(node.firstChild, node);
          }
          node.remove();
        }
      }
    }

    Array.from(root.childNodes).forEach(sanitizeNode);
    return root.innerHTML.trim();
  }

  function enhanceAbstracts() {
    if (!userSettings.enableAbstractCleanup) return;

    // Find abstract / description candidate elements
    const selectors = [
      '.abstract',
      '.abstracttextjpn',
      '.abstracttexteng',
      '.item_abstract',
      '[itemprop="description"]',
      '.biblio-contents',
      '.biblio-note',
      '.avlItem-note',
      '.toc-body',
      '#abstract',
      '.detailSection .text',
      '.dataSection .text'
    ];

    const elements = Array.from(document.querySelectorAll(selectors.join(', ')));

    // Also scan paragraphs or blocks that contain raw tag signatures
    document.querySelectorAll('.maincontents p, .maincontents div, .item_subData').forEach((el) => {
      if (elements.includes(el) || el.closest('.cinii-enh-abstract-container')) return;
      const text = el.textContent;
      if (
        text.includes('<jats:') ||
        text.includes('&lt;jats:') ||
        text.includes('&lt;p&gt;') ||
        text.includes('&lt;b&gt;') ||
        text.includes('&lt;i&gt;')
      ) {
        elements.push(el);
      }
    });

    elements.forEach((el) => {
      if (el.classList.contains('cinii-enh-abstract-processed') || el.closest('.cinii-enh-abstract-container')) {
        return;
      }

      const rawContent = el.innerHTML;
      const hasTags =
        rawContent.includes('&lt;') ||
        rawContent.includes('&amp;lt;') ||
        rawContent.includes('<jats:') ||
        rawContent.includes('</jats:') ||
        /<[a-z0-9_-]+:[a-z0-9_-]+/i.test(rawContent) ||
        /<(?:p|b|i|font|span|div|sec|br)[>\s]/i.test(rawContent);

      if (!hasTags) return;

      const cleanedContent = cleanAbstractHtml(rawContent);
      if (cleanedContent === rawContent) return;

      el.classList.add('cinii-enh-abstract-processed');

      // Build Container
      const container = document.createElement('div');
      container.className = 'cinii-enh-abstract-container';

      // Header Toolbar
      const toolbar = document.createElement('div');
      toolbar.className = 'cinii-enh-abstract-toolbar';

      const statusBadge = document.createElement('span');
      statusBadge.className = 'cinii-enh-abstract-status';
      statusBadge.innerHTML = `${SVGS.CLEAN}<span>抄録をスマート整形中</span>`;

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'cinii-enh-btn cinii-enh-btn-sm cinii-enh-btn-outline cinii-enh-toggle-view';
      toggleBtn.innerHTML = `${SVGS.CODE}<span>原文を表示</span>`;

      toolbar.appendChild(statusBadge);
      toolbar.appendChild(toggleBtn);

      // Content Box
      const contentBox = document.createElement('div');
      contentBox.className = 'cinii-enh-abstract-content is-formatted';
      contentBox.innerHTML = cleanedContent;

      let isFormatted = true;

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isFormatted = !isFormatted;
        if (isFormatted) {
          contentBox.className = 'cinii-enh-abstract-content is-formatted';
          contentBox.innerHTML = cleanedContent;
          statusBadge.innerHTML = `${SVGS.CLEAN}<span>抄録をスマート整形中</span>`;
          toggleBtn.innerHTML = `${SVGS.CODE}<span>原文を表示</span>`;
          toggleBtn.classList.remove('is-raw');
        } else {
          contentBox.className = 'cinii-enh-abstract-content is-raw';
          contentBox.textContent = rawContent;
          statusBadge.innerHTML = `${SVGS.CODE}<span>原文（生データ）を表示中</span>`;
          toggleBtn.innerHTML = `${SVGS.CLEAN}<span>整形表示に戻す</span>`;
          toggleBtn.classList.add('is-raw');
        }
      });

      // Insert container in place of element
      el.parentNode.insertBefore(container, el);
      container.appendChild(toolbar);
      container.appendChild(contentBox);
      el.style.display = 'none';
    });
  }

  // ==========================================
  // Initialization & Dynamic Page Watcher
  // ==========================================

  function runEnhancer() {
    if (isDetailPage()) {
      enhanceDetailPage();
    } else if (isSearchPage()) {
      enhanceSearchResults();
    }
    enhanceAbstracts();
  }

  // Load user settings first
  chrome.runtime.sendMessage({ action: 'GET_SETTINGS' }, (settings) => {
    if (settings) {
      userSettings = { ...userSettings, ...settings };
    }
    runEnhancer();
  });

  // Watch for dynamic DOM changes (CiNii pagination / tab switches)
  let observerDebounce = null;
  const observer = new MutationObserver(() => {
    if (observerDebounce) clearTimeout(observerDebounce);
    observerDebounce = setTimeout(() => {
      runEnhancer();
    }, 250);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();

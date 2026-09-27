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
    preferredCitation: 'bibtex',
    customTemplate: '{authors} ({year})「{title}」『{journal}』{volume}({issue}), pp.{pages}. {url}',
    customTemplateLabel: 'カスタム'
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
    CLOSE: `<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    GEAR: `<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`
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
    const targetEl = element === document ? (document.body || document.documentElement) : element;
    if (!targetEl) return null;

    // 1. Direct PDF link
    const pdfLinks = targetEl.querySelectorAll('a[href*=".pdf"]');
    for (const a of pdfLinks) {
      const href = a.getAttribute('href') || '';
      if (href && !href.startsWith('javascript:')) {
        return { url: a.href, label: 'PDF' };
      }
    }

    // 2. J-STAGE link (any J-STAGE URL)
    const jstageLinks = targetEl.querySelectorAll('a[href*="jstage.jst.go.jp"]');
    if (jstageLinks.length > 0) {
      return { url: jstageLinks[0].href, label: 'J-STAGE' };
    }

    // 3. Institutional repository link
    const repoLinks = targetEl.querySelectorAll('a[href*="repository"], a[href*="repo."], a[href*="ir.lib."]');
    if (repoLinks.length > 0) {
      return { url: repoLinks[0].href, label: '機関リポジトリ' };
    }

    // 4. CiNii specific bodypdf / fulltext buttons
    const bodyPdf = targetEl.querySelector('.bodypdf, a.bodylink');
    if (bodyPdf) {
      const href = bodyPdf.getAttribute('href') || bodyPdf.querySelector('a')?.getAttribute('href');
      if (href && !href.startsWith('javascript:')) {
        return { url: href.startsWith('http') ? href : window.location.origin + href, label: 'PDF' };
      }
    }

    const cftBtn = targetEl.querySelector('.cfullTextBtn, .fulltextitem a');
    if (cftBtn) {
      const href = cftBtn.getAttribute('href') || cftBtn.closest('a')?.getAttribute('href');
      if (href && !href.startsWith('javascript:')) {
        return { url: href.startsWith('http') ? href : window.location.origin + href, label: '本文リンク' };
      }
    }

    // 5. Open Access tags / classes
    if (targetEl.querySelector('.tag-oa, [class*="openaccess"], [class*="open-access"]')) {
      return { url: null, label: 'オープンアクセス' };
    }

    // 6. General text check for OA or full text
    const text = targetEl.textContent || '';
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

  function generateRIS(meta) {
    const lines = [
      'TY  - JOUR',
      `TI  - ${meta.title || 'Untitled'}`
    ];
    (meta.authors || []).forEach((a) => lines.push(`AU  - ${a}`));
    if (meta.journal) lines.push(`JO  - ${meta.journal}`);
    if (meta.year) lines.push(`PY  - ${meta.year}`);
    if (meta.volume) lines.push(`VL  - ${meta.volume}`);
    if (meta.issue) lines.push(`IS  - ${meta.issue}`);
    if (meta.firstPage) lines.push(`SP  - ${meta.firstPage}`);
    if (meta.lastPage) lines.push(`EP  - ${meta.lastPage}`);
    if (meta.doi) lines.push(`DO  - ${meta.doi}`);
    if (meta.url) lines.push(`UR  - ${meta.url}`);
    lines.push('ER  - ');
    return lines.join('\n');
  }

  function generateTSV(meta) {
    const headers = ['タイトル', '著者', '収録刊行物', '巻', '号', 'ページ', '出版年', 'DOI', 'URL'];
    const row = [
      meta.title || '',
      (meta.authors || []).join('; '),
      meta.journal || '',
      meta.volume || '',
      meta.issue || '',
      meta.pages || '',
      meta.year || '',
      meta.doi || '',
      meta.url || ''
    ];
    return `${headers.join('\t')}\n${row.join('\t')}`;
  }

  function generateCustomCitation(meta, templateStr) {
    const tmpl = templateStr || userSettings.customTemplate || '{authors} ({year})「{title}」『{journal}』{volume}({issue}), pp.{pages}. {url}';
    const authorsStr = (meta.authors && meta.authors.length > 0) ? meta.authors.join(', ') : '著者不明';
    const firstAuthor = (meta.authors && meta.authors[0]) ? meta.authors[0] : '著者不明';

    const replacements = {
      '{title}': meta.title || '',
      '{authors}': authorsStr,
      '{firstAuthor}': firstAuthor,
      '{year}': meta.year || '',
      '{journal}': meta.journal || '',
      '{volume}': meta.volume || '',
      '{issue}': meta.issue || '',
      '{pages}': meta.pages || '',
      '{firstPage}': meta.firstPage || '',
      '{lastPage}': meta.lastPage || '',
      '{doi}': meta.doi ? `https://doi.org/${meta.doi}` : '',
      '{url}': meta.url || '',
      '{publisher}': meta.publisher || ''
    };

    let result = tmpl;
    for (const [key, val] of Object.entries(replacements)) {
      result = result.split(key).join(val);
    }

    // Clean up empty parentheses or punctuation left by empty fields like () or , ,
    result = result
      .replace(/\(\s*\)/g, '')
      .replace(/\[\s*\]/g, '')
      .replace(/『\s*』/g, '')
      .replace(/「\s*」/g, '')
      .replace(/pp\.\s*(?=[,\.\s]|$)/g, '')
      .replace(/,\s*,/g, ',')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return result;
  }

  function generateAllCitations(meta) {
    const citations = {};

    // 1. Custom format (if configured or enabled)
    const customLabel = userSettings.customTemplateLabel || 'カスタム形式';
    citations.custom = {
      label: customLabel,
      text: generateCustomCitation(meta, userSettings.customTemplate)
    };

    // 2. Standard formats
    citations.bibtex = { label: 'BibTeX', text: generateBibTeX(meta) };
    citations.sist02 = { label: 'SIST02 (和文標準)', text: generateSIST02(meta) };
    citations.apa = { label: 'APA (第7版)', text: generateAPA(meta) };
    citations.ris = { label: 'RIS (EndNote / Mendeley)', text: generateRIS(meta) };
    citations.markdown = { label: 'Markdown', text: generateMarkdown(meta) };
    citations.mla = { label: 'MLA (第9版)', text: generateMLA(meta) };
    citations.chicago = { label: 'Chicago (著者-日付)', text: generateChicago(meta) };

    return citations;
  }

  function getPreferredCitation(meta, formatKey) {
    const key = formatKey || userSettings.preferredCitation || 'bibtex';
    switch (key) {
      case 'custom':
        return {
          key: 'custom',
          label: userSettings.customTemplateLabel || 'カスタム',
          text: generateCustomCitation(meta, userSettings.customTemplate)
        };
      case 'bibtex': return { key: 'bibtex', label: 'BibTeX', text: generateBibTeX(meta) };
      case 'sist02': return { key: 'sist02', label: 'SIST02', text: generateSIST02(meta) };
      case 'apa': return { key: 'apa', label: 'APA', text: generateAPA(meta) };
      case 'ris': return { key: 'ris', label: 'RIS', text: generateRIS(meta) };
      case 'markdown': return { key: 'markdown', label: 'Markdown', text: generateMarkdown(meta) };
      case 'mla': return { key: 'mla', label: 'MLA', text: generateMLA(meta) };
      case 'chicago': return { key: 'chicago', label: 'Chicago', text: generateChicago(meta) };
      default: return { key: 'bibtex', label: 'BibTeX', text: generateBibTeX(meta) };
    }
  }

  function createQuickCopyButton(metaProvider, extraClasses = '') {
    const prefKey = userSettings.preferredCitation || 'bibtex';
    const prefItem = getPreferredCitation({ authors: [] }, prefKey);
    const prefLabel = prefItem.label;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `cinii-enh-btn cinii-enh-btn-cite-quick ${extraClasses}`;
    btn.title = `設定済みフォーマット (${prefLabel}) をワンクリックで直接コピー`;
    btn.innerHTML = `${SVGS.COPY}<span>${escapeHtml(prefLabel)}</span>`;

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();

      const meta = typeof metaProvider === 'function' ? metaProvider() : metaProvider;
      if (!meta) return;

      const pref = getPreferredCitation(meta, userSettings.preferredCitation || 'bibtex');
      const originalHtml = btn.innerHTML;

      const success = await copyText(pref.text, `${pref.label} をクリップボードにコピーしました`);
      if (success) {
        btn.classList.add('is-copied');
        btn.innerHTML = `${SVGS.CHECK}<span>完了</span>`;
        setTimeout(() => {
          btn.classList.remove('is-copied');
          btn.innerHTML = originalHtml;
        }, 1600);
      }
    });

    return btn;
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
  // Settings Modal Dialog (CiNiiヘッダー歯車から開く設定画面)
  // ==========================================

  function updateAllQuickCopyButtons() {
    const prefItem = getPreferredCitation({ authors: [] }, userSettings.preferredCitation || 'bibtex');
    document.querySelectorAll('.cinii-enh-btn-cite-quick').forEach((btn) => {
      btn.title = `設定済みフォーマット (${prefItem.label}) をワンクリックで直接コピー`;
      btn.innerHTML = `${SVGS.COPY}<span>${escapeHtml(prefItem.label)}</span>`;
    });
  }

  function openSettingsModal() {
    document.querySelectorAll('.cinii-enh-modal-overlay').forEach((el) => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'cinii-enh-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cinii-enh-modal cinii-enh-settings-modal';

    // Sample metadata for live preview
    const sampleMeta = {
      title: 'CiNii Researchにおける文献情報管理と引用機能の高度化',
      authors: ['情報 太郎', '学術 花子'],
      year: '2026',
      journal: '情報知識学会誌',
      volume: '36',
      issue: '2',
      pages: '120-135',
      firstPage: '120',
      lastPage: '135',
      doi: '10.1234/example.2026.001',
      url: 'https://cir.nii.ac.jp/crid/1390000000000000000'
    };

    modal.innerHTML = `
      <div class="cinii-enh-modal-header">
        <div class="cinii-enh-modal-header-info">
          <span class="cinii-enh-modal-badge">CiNii Enhancer</span>
          <h2 class="cinii-enh-modal-title">拡張機能設定</h2>
        </div>
        <button type="button" class="cinii-enh-modal-close" aria-label="閉じる">${SVGS.CLOSE}</button>
      </div>
      <div class="cinii-enh-modal-body cinii-enh-settings-body">
        <!-- 1. Preferred Citation Format -->
        <div class="cinii-enh-form-group">
          <label class="cinii-enh-form-label" for="setting-preferred-format">
            クイックコピー優先フォーマット
          </label>
          <div class="cinii-enh-form-help">
            タイトル右横のボタン（例:「BibTeX」）をクリックした際に、1クリックで即時コピーされる形式です。
          </div>
          <select id="setting-preferred-format" class="cinii-enh-form-select">
            <option value="bibtex">BibTeX (LaTeX / Typst)</option>
            <option value="sist02">SIST02 (和文論文標準)</option>
            <option value="apa">APA (第7版)</option>
            <option value="ris">RIS (EndNote / Mendeley / Zotero)</option>
            <option value="markdown">Markdown (URL付き)</option>
            <option value="mla">MLA (第9版)</option>
            <option value="chicago">Chicago (著者-日付形式)</option>
            <option value="custom">カスタム形式 (下記テンプレート)</option>
          </select>
        </div>

        <!-- 2. Custom Citation Template Editor -->
        <div class="cinii-enh-form-group cinii-enh-custom-template-section">
          <div class="cinii-enh-form-header-row">
            <label class="cinii-enh-form-label" for="setting-custom-template">
              カスタム引用テンプレート設定
            </label>
            <div class="cinii-enh-template-label-input-wrap">
              <span class="cinii-enh-sublabel">ボタン表示名:</span>
              <input type="text" id="setting-custom-label" class="cinii-enh-form-input cinii-enh-form-input-sm" value="${escapeHtml(userSettings.customTemplateLabel || 'カスタム')}" placeholder="ボタン名 (例: カスタム)">
            </div>
          </div>
          <div class="cinii-enh-form-help">
            波括弧の変数（例: <code>{title}</code>）が文献情報に自動置換されます。
          </div>

          <!-- Variable insertion chips -->
          <div class="cinii-enh-chips-bar">
            <span class="cinii-enh-chips-title">変数を挿入:</span>
            <button type="button" class="cinii-enh-chip" data-var="{title}">{title} タイトル</button>
            <button type="button" class="cinii-enh-chip" data-var="{authors}">{authors} 著者一覧</button>
            <button type="button" class="cinii-enh-chip" data-var="{firstAuthor}">{firstAuthor} 筆頭著者</button>
            <button type="button" class="cinii-enh-chip" data-var="{year}">{year} 出版年</button>
            <button type="button" class="cinii-enh-chip" data-var="{journal}">{journal} 収録誌名</button>
            <button type="button" class="cinii-enh-chip" data-var="{volume}">{volume} 巻</button>
            <button type="button" class="cinii-enh-chip" data-var="{issue}">{issue} 号</button>
            <button type="button" class="cinii-enh-chip" data-var="{pages}">{pages} ページ</button>
            <button type="button" class="cinii-enh-chip" data-var="{doi}">{doi} DOI</button>
            <button type="button" class="cinii-enh-chip" data-var="{url}">{url} URL</button>
          </div>

          <textarea id="setting-custom-template" class="cinii-enh-form-textarea" rows="3" placeholder="{authors} ({year})「{title}」『{journal}』{volume}({issue}), pp.{pages}. {url}">${escapeHtml(userSettings.customTemplate || '')}</textarea>

          <!-- Presets -->
          <div class="cinii-enh-presets-row">
            <span class="cinii-enh-sublabel">プリセット:</span>
            <button type="button" class="cinii-enh-btn-preset" data-preset="{authors} ({year})「{title}」『{journal}』{volume}({issue}), pp.{pages}. {url}">和文（一般）</button>
            <button type="button" class="cinii-enh-btn-preset" data-preset="- [{title}]({url}) - {authors} ({year})">Markdownメモ</button>
            <button type="button" class="cinii-enh-btn-preset" data-preset="{authors}, &quot;{title},&quot; {journal}, vol. {volume}, no. {issue}, pp. {pages}, {year}.">英文論文調</button>
          </div>

          <!-- Live Preview -->
          <div class="cinii-enh-preview-box">
            <div class="cinii-enh-preview-title">リアルタイムプレビュー:</div>
            <div id="cinii-enh-template-preview" class="cinii-enh-preview-content"></div>
          </div>
        </div>

        <!-- 3. Toggles -->
        <div class="cinii-enh-form-group">
          <label class="cinii-enh-form-label">機能のオン/オフ</label>
          <div class="cinii-enh-toggle-list">
            <label class="cinii-enh-checkbox-item">
              <input type="checkbox" id="setting-enable-quick-copy" ${userSettings.enableSearchQuickCopy ? 'checked' : ''}>
              <span>検索結果カードに引用ボタンを表示</span>
            </label>
            <label class="cinii-enh-checkbox-item">
              <input type="checkbox" id="setting-enable-abstract-cleanup" ${userSettings.enableAbstractCleanup ? 'checked' : ''}>
              <span>抄録・検索結果のHTMLタグを自動整形</span>
            </label>
          </div>
        </div>

        <!-- 4. Unpaywall Email -->
        <div class="cinii-enh-form-group">
          <label class="cinii-enh-form-label" for="setting-unpaywall-email">
            Unpaywall 照会用メールアドレス
          </label>
          <input type="email" id="setting-unpaywall-email" class="cinii-enh-form-input" value="${escapeHtml(userSettings.unpaywallEmail || '')}" placeholder="your-email@example.com">
        </div>
      </div>

      <div class="cinii-enh-modal-footer">
        <span id="cinii-enh-setting-save-msg" class="cinii-enh-save-message"></span>
        <button type="button" id="cinii-enh-save-settings-btn" class="cinii-enh-btn cinii-enh-btn-primary">
          ${SVGS.CHECK}<span>設定を保存</span>
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const formatSelect = modal.querySelector('#setting-preferred-format');
    const templateTextarea = modal.querySelector('#setting-custom-template');
    const labelInput = modal.querySelector('#setting-custom-label');
    const previewEl = modal.querySelector('#cinii-enh-template-preview');

    formatSelect.value = userSettings.preferredCitation || 'bibtex';

    const updatePreview = () => {
      const tmpl = templateTextarea.value || '';
      previewEl.textContent = generateCustomCitation(sampleMeta, tmpl);
    };
    updatePreview();

    templateTextarea.addEventListener('input', updatePreview);

    // Variable insertion chips
    modal.querySelectorAll('.cinii-enh-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-var');
        const start = templateTextarea.selectionStart;
        const end = templateTextarea.selectionEnd;
        const val = templateTextarea.value;
        templateTextarea.value = val.substring(0, start) + v + val.substring(end);
        templateTextarea.focus();
        templateTextarea.selectionStart = templateTextarea.selectionEnd = start + v.length;
        updatePreview();
      });
    });

    // Preset buttons
    modal.querySelectorAll('.cinii-enh-btn-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        templateTextarea.value = btn.getAttribute('data-preset');
        updatePreview();
      });
    });

    // Close handler
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

    // Save handler
    const saveBtn = modal.querySelector('#cinii-enh-save-settings-btn');
    saveBtn.addEventListener('click', () => {
      const newSettings = {
        preferredCitation: formatSelect.value,
        customTemplate: templateTextarea.value.trim() || '{authors} ({year})「{title}」『{journal}』{volume}({issue}), pp.{pages}. {url}',
        customTemplateLabel: labelInput.value.trim() || 'カスタム',
        enableSearchQuickCopy: modal.querySelector('#setting-enable-quick-copy').checked,
        enableAbstractCleanup: modal.querySelector('#setting-enable-abstract-cleanup').checked,
        unpaywallEmail: modal.querySelector('#setting-unpaywall-email').value.trim() || 'academic-reader@example.com'
      };

      userSettings = { ...userSettings, ...newSettings };

      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'SAVE_SETTINGS', settings: newSettings }, () => {
          showToast('設定を保存しました');
          closeModal();
          updateAllQuickCopyButtons();
        });
      } else {
        showToast('設定を保存しました');
        closeModal();
        updateAllQuickCopyButtons();
      }
    });
  }

  // ==========================================
  // Header Settings Button Injection (CiNiiヘッダーの歯車ボタン)
  // ==========================================

  function injectHeaderSettingsButton() {
    if (document.getElementById('cinii-enh-header-settings-btn')) return;

    // Search for header navigation container
    const headerNav =
      document.querySelector('.header .nav, .header ul, .header-nav, #header ul, .navbar-nav, .user-menu, .globalNav, header .container, #header, .header, header');

    if (!headerNav) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'cinii-enh-header-settings-btn';
    btn.className = 'cinii-enh-header-settings-btn';
    btn.title = 'CiNii Enhancer 設定（引用形式・カスタムテンプレート等）';
    btn.innerHTML = `${SVGS.GEAR}<span>設定</span>`;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openSettingsModal();
    });

    if (headerNav.tagName === 'UL') {
      const li = document.createElement('li');
      li.className = 'cinii-enh-header-settings-li';
      li.appendChild(btn);
      headerNav.appendChild(li);
    } else {
      headerNav.appendChild(btn);
    }
  }

  // ==========================================
  // Detail Page Enhancement (詳細画面のみ実行)
  // ==========================================

  // Locate the actual paper/book title element (strictly excluding author sections)
  function findDetailTitleElement(metaTitle) {
    const cleanMeta = (metaTitle || '').trim().replace(/\s+/g, ' ');

    function isAuthorOrNonTitle(el) {
      if (!el) return true;
      return Boolean(
        el.closest('.authorslist, .author-name, .creator-name, .item-creator, .authors, [class*="author"], [class*="creator"]') ||
        el.querySelector('a[href*="/nrid/"], a[href*="/author/"]') ||
        el.classList.contains('authorslist') ||
        el.classList.contains('author') ||
        el.closest('.cinii-enh-modal')
      );
    }

    // 1. High-priority CiNii title selectors
    const titleSelectors = [
      '.item_mainTitle',
      'h1.item-title',
      'h1.title',
      '.itemTitle',
      '[property="dc:title"]',
      '[itemprop="headline"]',
      '[itemprop="name"]',
      '.detail-title',
      '.article-title',
      '.itemheading h1'
    ];

    for (const sel of titleSelectors) {
      const candidates = document.querySelectorAll(sel);
      for (const el of candidates) {
        if (isAuthorOrNonTitle(el)) continue;
        const text = el.textContent.trim().replace(/\s+/g, ' ');
        if (!cleanMeta || text === cleanMeta || text.includes(cleanMeta) || cleanMeta.includes(text)) {
          return el;
        }
      }
    }

    // 2. Headings that specifically match the paper/book title text
    if (cleanMeta) {
      const headings = document.querySelectorAll('h1, h2, h3, .title');
      for (const h of headings) {
        if (isAuthorOrNonTitle(h)) continue;
        const text = h.textContent.trim().replace(/\s+/g, ' ');
        if (text === cleanMeta || text.includes(cleanMeta) || (cleanMeta.length > 5 && text.length > 5 && (cleanMeta.startsWith(text) || text.startsWith(cleanMeta)))) {
          return h;
        }
      }
    }

    // 3. Fallback: First h1 or heading that is not an author or header/nav element
    const allH1 = document.querySelectorAll('h1');
    for (const h of allH1) {
      if (!isAuthorOrNonTitle(h) && !h.closest('#header, header, nav')) {
        return h;
      }
    }

    return null;
  }

  function enhanceDetailPage() {
    if (!userSettings.enableDetailToolbar) return;
    if (document.getElementById('cinii-enh-detail-title-actions')) return;

    const meta = extractDetailMetadata();
    if (!meta.title) return;

    // Locate the strictly identified title element
    const titleEl = findDetailTitleElement(meta.title);
    if (!titleEl) return;

    // Compact, inline action container directly to the right of the title
    const actionsWrapper = document.createElement('span');
    actionsWrapper.id = 'cinii-enh-detail-title-actions';
    actionsWrapper.className = 'cinii-enh-detail-title-actions';

    // 1. Quick Copy Button (One-click copy of preferred format e.g. BibTeX)
    const quickBtn = createQuickCopyButton(() => meta, 'cinii-enh-btn-sm');
    actionsWrapper.appendChild(quickBtn);

    // 2. Citation Modal Trigger Button
    const citeBtn = document.createElement('button');
    citeBtn.type = 'button';
    citeBtn.className = 'cinii-enh-btn cinii-enh-btn-sm cinii-enh-btn-outline cinii-enh-btn-detail-cite';
    citeBtn.innerHTML = `${SVGS.QUOTE}<span>引用</span>`;
    citeBtn.title = '全引用フォーマット（BibTeX, SIST02, APA, RIS等）の一覧を表示';

    citeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const citations = generateAllCitations(meta);
      openCitationModal(citations, meta.title);
    });

    actionsWrapper.appendChild(citeBtn);

    // 2. Direct PDF button next to title if available
    const pdfContainer = document.createElement('span');
    pdfContainer.className = 'cinii-enh-pdf-wrapper';

    if (meta.pdfUrl) {
      const pdfBtn = document.createElement('a');
      pdfBtn.className = 'cinii-enh-btn cinii-enh-btn-sm cinii-enh-btn-pdf';
      pdfBtn.href = meta.pdfUrl;
      pdfBtn.target = '_blank';
      pdfBtn.rel = 'noopener noreferrer';
      const label = meta.fullTextLabel ? `PDF (${meta.fullTextLabel})` : 'PDF';
      pdfBtn.innerHTML = `${SVGS.PDF}<span>${escapeHtml(label)}</span>${SVGS.EXTERNAL}`;
      pdfContainer.appendChild(pdfBtn);
    } else if (meta.doi) {
      chrome.runtime.sendMessage(
        { action: 'CHECK_UNPAYWALL', doi: meta.doi },
        (res) => {
          pdfContainer.innerHTML = '';
          if (res && res.success && res.is_oa && res.pdf_url) {
            const pdfBtn = document.createElement('a');
            pdfBtn.className = 'cinii-enh-btn cinii-enh-btn-sm cinii-enh-btn-pdf';
            pdfBtn.href = res.pdf_url;
            pdfBtn.target = '_blank';
            pdfBtn.rel = 'noopener noreferrer';
            const badgeType = res.host_type === 'repository' ? '機関OA' : 'OA';
            pdfBtn.innerHTML = `${SVGS.PDF}<span>PDF (${badgeType})</span>${SVGS.EXTERNAL}`;
            pdfContainer.appendChild(pdfBtn);
          } else {
            const domDirect = detectFullTextInElement(document);
            if (domDirect && domDirect.url) {
              const linkBtn = document.createElement('a');
              linkBtn.className = 'cinii-enh-btn cinii-enh-btn-sm cinii-enh-btn-pdf';
              linkBtn.href = domDirect.url;
              linkBtn.target = '_blank';
              linkBtn.rel = 'noopener noreferrer';
              linkBtn.innerHTML = `${SVGS.EXTERNAL}<span>${escapeHtml(domDirect.label || '本文')}</span>`;
              pdfContainer.appendChild(linkBtn);
            }
          }
        }
      );
    } else {
      const domDirect = detectFullTextInElement(document);
      if (domDirect && domDirect.url) {
        const linkBtn = document.createElement('a');
        linkBtn.className = 'cinii-enh-btn cinii-enh-btn-sm cinii-enh-btn-pdf';
        linkBtn.href = domDirect.url;
        linkBtn.target = '_blank';
        linkBtn.rel = 'noopener noreferrer';
        linkBtn.innerHTML = `${SVGS.EXTERNAL}<span>${escapeHtml(domDirect.label || '本文')}</span>`;
        pdfContainer.appendChild(linkBtn);
      }
    }

    actionsWrapper.appendChild(pdfContainer);

    // Append to title element so it renders neatly to its right
    titleEl.appendChild(actionsWrapper);
  }

  // ==========================================
  // Export Section Quick Copy (書き出しセクションの直接コピー)
  // ==========================================

  function enhanceExportSection() {
    // Search for export / display links in detail page
    // Patterns: "○○に書き出し", "○○で表示", "Export to ...", "Display in ..."
    const candidates = document.querySelectorAll('a, button, [role="button"]');

    candidates.forEach((el) => {
      if (el.classList.contains('cinii-enh-export-processed')) return;
      if (el.closest('.cinii-enh-modal')) return;

      const text = (el.textContent || '').trim();
      const isExportLink = /(?:に書き出し|で表示|Export to|Display in)/i.test(text);
      if (!isExportLink) return;

      el.classList.add('cinii-enh-export-processed');

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'cinii-enh-btn cinii-enh-btn-sm cinii-enh-btn-outline cinii-enh-btn-export-copy';
      copyBtn.title = `${text} のデータを直接クリップボードにコピー`;
      copyBtn.innerHTML = `${SVGS.COPY}<span>コピー</span>`;

      copyBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const originalHtml = copyBtn.innerHTML;
        copyBtn.disabled = true;
        copyBtn.innerHTML = `${SVGS.SPINNER}<span>取得中</span>`;

        try {
          let copied = false;
          const href = el.getAttribute('href');

          // 1. Fetch live export data from CiNii endpoint if valid URL
          if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
            try {
              const fullUrl = href.startsWith('http') ? href : window.location.origin + href;
              const res = await fetch(fullUrl, { credentials: 'same-origin' });
              if (res.ok) {
                const fetchedData = await res.text();
                if (fetchedData && fetchedData.trim().length > 0) {
                  await copyText(fetchedData, `${text} の内容をコピーしました`);
                  copied = true;
                }
              }
            } catch (fetchErr) {
              console.warn('[CiNii Enhancer] Direct export fetch failed, falling back to local generator:', fetchErr);
            }
          }

          // 2. High-precision local fallback generator
          if (!copied) {
            const meta = extractDetailMetadata();
            let fallbackText = '';

            if (/bibtex/i.test(text)) {
              fallbackText = generateBibTeX(meta);
            } else if (/(?:ris|endnote|refworks|mendeley)/i.test(text)) {
              fallbackText = generateRIS(meta);
            } else if (/tsv/i.test(text)) {
              fallbackText = generateTSV(meta);
            } else {
              fallbackText = generateSIST02(meta);
            }

            if (fallbackText) {
              await copyText(fallbackText, `${text} の内容をコピーしました`);
              copied = true;
            }
          }

          if (copied) {
            copyBtn.classList.add('is-copied');
            copyBtn.innerHTML = `${SVGS.CHECK}<span>完了</span>`;
            setTimeout(() => {
              copyBtn.classList.remove('is-copied');
              copyBtn.innerHTML = originalHtml;
              copyBtn.disabled = false;
            }, 1600);
          } else {
            copyBtn.innerHTML = originalHtml;
            copyBtn.disabled = false;
          }
        } catch (err) {
          console.error('[CiNii Enhancer] Export copy failed:', err);
          copyBtn.innerHTML = originalHtml;
          copyBtn.disabled = false;
          showToast('コピーに失敗しました');
        }
      });

      // Insert immediately after the export link/button
      if (el.nextSibling) {
        el.parentNode.insertBefore(copyBtn, el.nextSibling);
      } else {
        el.parentNode.appendChild(copyBtn);
      }
    });
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

  /**
   * Determines if a search result card represents a citeable academic publication
   * (e.g. paper, article, book, dissertation) rather than a person or research project.
   */
  function isCiteableItem(item, titleLink) {
    if (!item || !titleLink) return false;

    const itemHtml = item.innerHTML || '';
    const href = titleLink.href || '';

    // 1. Exclude Persons / Researchers (人物・研究者)
    const isPerson = Boolean(
      item.querySelector('.author_class, [class*="author_class"], [class*="person_class"], dl.author_class') ||
      item.classList.contains('author_class') ||
      itemHtml.includes('classIcon-author.svg') ||
      itemHtml.includes('tagIcon-person.svg') ||
      href.includes('/nrid/')
    );
    if (isPerson) return false;

    // 2. Exclude Research Projects / KAKEN (研究課題・プロジェクト)
    const isProject = Boolean(
      item.querySelector('.research_class, .project_class, dl.research_class, dl.project_class') ||
      item.classList.contains('research_class') ||
      item.classList.contains('project_class') ||
      itemHtml.includes('classIcon-research1.svg') ||
      href.includes('/kaken/') ||
      href.includes('/projects/')
    );
    if (isProject) return false;

    // 3. Exclude Research Data / Datasets (研究データ)
    const isData = Boolean(
      item.querySelector('.data_class, dl.data_class') ||
      item.classList.contains('data_class') ||
      itemHtml.includes('classIcon-data.svg')
    );
    if (isData) return false;

    // 4. Positive matches for papers, dissertations, and books
    const isExplicitCiteable = Boolean(
      item.querySelector('.paper_class, .book_class, .paper-dissertation_class, dl.paper_class, dl.book_class, dl.paper-dissertation_class') ||
      item.classList.contains('paper_class') ||
      item.classList.contains('book_class') ||
      item.classList.contains('paper-dissertation_class') ||
      itemHtml.includes('classIcon-article.svg') ||
      itemHtml.includes('classIcon-book.svg') ||
      itemHtml.includes('classIcon-dissertation.svg')
    );
    if (isExplicitCiteable) return true;

    // 5. Fallback: If it has an author list and is a publication CRID, treat as citeable
    const hasAuthors = Boolean(item.querySelector('.authorslist, .author-name, .item-creator'));
    const isCrid = Boolean(href && href.includes('/crid/'));
    return hasAuthors && isCrid;
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

    // Actions placed right next to the title link (Citations ONLY, no redundant PDF/OA buttons)
    const titleActions = document.createElement('span');
    titleActions.className = 'cinii-enh-title-actions';

    if (userSettings.enableSearchQuickCopy && isCiteableItem(item, titleLink)) {
      // Button 1: Quick Copy Button (Single click to copy preferred format e.g. BibTeX)
      const quickBtn = createQuickCopyButton(cardMeta, 'cinii-enh-btn-sm');
      titleActions.appendChild(quickBtn);

      // Button 2: Citation Modal Trigger Button
      const citeBtn = document.createElement('button');
      citeBtn.type = 'button';
      citeBtn.className = 'cinii-enh-btn cinii-enh-btn-sm cinii-enh-btn-cite-title';
      citeBtn.innerHTML = `${SVGS.QUOTE}<span>引用</span>`;
      citeBtn.title = '全引用フォーマット（BibTeX, SIST02, APA, RIS等）の一覧を表示';

      citeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const citations = generateAllCitations(cardMeta);
        openCitationModal(citations, cardMeta.title);
      });

      titleActions.appendChild(citeBtn);
    }

    if (titleActions.children.length > 0 && titleLink.parentNode) {
      titleLink.parentNode.insertBefore(titleActions, titleLink.nextSibling);
    }

    // 3. Clean title and snippets in this card (Plan A: Inline clean)
    if (userSettings.enableAbstractCleanup) {
      if (titleLink) {
        const rawTitle = titleLink.innerHTML || '';
        if (rawTitle.includes('&lt;') || rawTitle.includes('<jats:') || /<[a-z0-9_-]+:[a-z0-9_-]+/i.test(rawTitle)) {
          const cleanedTitle = cleanSearchSnippetHtml(rawTitle);
          if (cleanedTitle && cleanedTitle !== rawTitle) {
            titleLink.innerHTML = cleanedTitle;
          }
        }
      }

      const snippetTargets = item.querySelectorAll(
        '.item_subData, .description, .snippet, .item-abstract, [class*="description"], [class*="snippet"], p'
      );
      snippetTargets.forEach((el) => {
        if (!el || el.closest('.cinii-enh-item-toolbar')) return;
        const rawSnippet = el.innerHTML || '';
        const hasTags =
          rawSnippet.includes('&lt;') ||
          rawSnippet.includes('&amp;lt;') ||
          rawSnippet.includes('<jats:') ||
          rawSnippet.includes('</jats:') ||
          /<[a-z0-9_-]+:[a-z0-9_-]+/i.test(rawSnippet);

        if (hasTags) {
          const cleanedSnippet = cleanSearchSnippetHtml(rawSnippet);
          if (cleanedSnippet && cleanedSnippet !== rawSnippet) {
            el.innerHTML = cleanedSnippet;
          }
        }
      });
    }
  }

  // ==========================================
  // Abstract / Description HTML Cleaner (案3: HTMLタグ整形 + 原文切替)
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

  function cleanSearchSnippetHtml(raw) {
    if (!raw) return '';
    let text = raw;

    // Check if escaped tags exist
    if (text.includes('&lt;') || text.includes('&amp;lt;')) {
      text = text
        .replace(/&amp;lt;/gi, '<')
        .replace(/&amp;gt;/gi, '>')
        .replace(/&amp;quot;/gi, '"')
        .replace(/&amp;amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"');
    }

    // Normalize JATS tags to inline styles
    text = text
      .replace(/<\/?jats:italic[^>]*>/gi, (m) => m.startsWith('</') ? '</i>' : '<i>')
      .replace(/<\/?jats:bold[^>]*>/gi, (m) => m.startsWith('</') ? '</b>' : '<b>')
      .replace(/<\/?jats:sup[^>]*>/gi, (m) => m.startsWith('</') ? '</sup>' : '<sup>')
      .replace(/<\/?jats:sub[^>]*>/gi, (m) => m.startsWith('</') ? '</sub>' : '<sub>')
      .replace(/<\/?jats:underline[^>]*>/gi, (m) => m.startsWith('</') ? '</u>' : '<u>')
      .replace(/<jats:title[^>]*>/gi, '<strong>')
      .replace(/<\/jats:title>/gi, '</strong>: ')
      .replace(/<\/?jats:p[^>]*>/gi, ' ')
      .replace(/<\/?jats:[a-zA-Z0-9_-]+[^>]*>/gi, '');

    // Flatten structural blocks into inline flow
    text = text
      .replace(/<\/?(?:sec|section|article|div|header|footer)[^>]*>/gi, ' ')
      .replace(/<p[^>]*>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<\/?font[^>]*>/gi, '')
      .replace(/<\/?(?:script|style|iframe|object)[^>]*>/gi, '');

    // Sanitize via DOMParser
    const parsedDoc = new DOMParser().parseFromString(`<span>${text}</span>`, 'text/html');
    const root = parsedDoc.body.firstElementChild;
    if (!root) return text;

    const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'SUB', 'SUP', 'U', 'MARK', 'SPAN', 'BR']);
    const REMOVE_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED']);

    function sanitizeNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toUpperCase();
        if (REMOVE_TAGS.has(tag)) {
          node.remove();
          return;
        }

        const cls = node.getAttribute('class') || '';
        const isHighlight = cls.includes('highlight') || cls.includes('keyword') || tag === 'MARK';

        while (node.attributes.length > 0) {
          node.removeAttribute(node.attributes[0].name);
        }

        if (isHighlight) {
          node.setAttribute('class', 'cinii-enh-highlight');
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
    return root.innerHTML.replace(/\s{2,}/g, ' ').trim();
  }

  function enhanceAbstracts() {
    if (!userSettings.enableAbstractCleanup) return;

    // Target elements specifically designated for abstracts / descriptions
    const baseSelectors = [
      '.abstract',
      '.abstracttextjpn',
      '.abstracttexteng',
      '.item_abstract',
      '[itemprop="description"]',
      '#abstract',
      '.avlItem-note',
      '.toc-body'
    ];

    const elements = Array.from(document.querySelectorAll(baseSelectors.join(', ')));

    // Target sections explicitly labeled "説明", "抄録", "概要", "Abstract", "Description" in CiNii data grids
    document.querySelectorAll('.dataSection, .detailSection, dl, section').forEach((section) => {
      const titleEl = section.querySelector('.listSectionTitle, dt, h2, h3, .sectionTitle');
      if (!titleEl) return;
      const titleText = (titleEl.textContent || '').trim();
      if (/(?:説明|抄録|概要|Abstract|Description)/i.test(titleText)) {
        const bodyCandidates = section.querySelectorAll('dd, .text, p, [class*="body"]');
        bodyCandidates.forEach((b) => {
          if (!elements.includes(b)) elements.push(b);
        });
      }
    });

    elements.forEach((el) => {
      if (!el) return;
      // 1. Skip already processed elements
      if (el.classList.contains('cinii-enh-abstract-processed')) return;
      // 2. Skip elements inside an existing abstract container
      if (el.closest('.cinii-enh-abstract-container')) return;
      // 3. Skip ancestor/parent elements that contain an abstract container (avoids collateral damage!)
      if (el.querySelector('.cinii-enh-abstract-container')) return;
      // 4. Skip elements that contain large structural children (not a text block)
      if (el.querySelectorAll('div, section, article, table, dl, form').length > 1) return;

      const rawContent = el.innerHTML || '';
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
      statusBadge.innerHTML = `${SVGS.CLEAN}<span>HTMLタグを整形中</span>`;

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
          statusBadge.innerHTML = `${SVGS.CLEAN}<span>HTMLタグを整形中</span>`;
          toggleBtn.innerHTML = `${SVGS.CODE}<span>原文を表示</span>`;
          toggleBtn.classList.remove('is-raw');
        } else {
          contentBox.className = 'cinii-enh-abstract-content is-raw';
          contentBox.textContent = rawContent;
          statusBadge.innerHTML = `${SVGS.CODE}<span>原文（タグ未整形）を表示中</span>`;
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
    injectHeaderSettingsButton();
    if (isDetailPage()) {
      enhanceDetailPage();
      enhanceExportSection();
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
  const observer = new MutationObserver((mutations) => {
    // Ignore mutations occurring purely inside enhancer widgets
    const isPurelyInternal = mutations.every((m) => {
      const target = m.target;
      return Boolean(
        target && target.closest && (
          target.closest('.cinii-enh-abstract-container') ||
          target.closest('.cinii-enh-modal-overlay') ||
          target.closest('.cinii-enh-detail-title-actions') ||
          target.closest('.cinii-enh-btn-export-copy') ||
          target.closest('.cinii-enh-header-settings-btn')
        )
      );
    });
    if (isPurelyInternal) return;

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

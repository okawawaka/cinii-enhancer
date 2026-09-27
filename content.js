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
    enableFilter: true,
    enableSearchQuickCopy: true,
    enableSearchPdfDirect: true,
    enableDetailToolbar: true,
    preferredCitation: 'bibtex'
  };

  // SVGs (Strictly NO EMOJIS, scholarly vector icons)
  const SVGS = {
    QUOTE: `<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 0 4 1.75 6 5 8zm13 0c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 0 4 1.75 6 5 8z"/></svg>`,
    COPY: `<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    CHECK: `<svg class="cinii-enh-icon cinii-enh-icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    PDF: `<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    EXTERNAL: `<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    FILTER: `<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
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
      const titleEl = document.querySelector('h1.item-title, h1.title, .item-header-title, h1');
      if (titleEl) {
        meta.title = titleEl.textContent.trim().replace(/\s+/g, ' ');
      }
    }

    if (meta.authors.length === 0) {
      const authorEls = document.querySelectorAll('.author-name, .creator-name, .authors li, .item-creator a');
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

    // Look for direct full-text link in CiNii DOM (J-STAGE, IR, etc.)
    if (!meta.pdfUrl) {
      const directLink = findDirectFullTextLink(document);
      if (directLink) {
        meta.pdfUrl = directLink.url;
        meta.fullTextLabel = directLink.label;
      }
    }

    return meta;
  }

  /**
   * Scans a container (page or search card) for known full-text and PDF links
   */
  function findDirectFullTextLink(root) {
    // 1. Links with explicit text or attributes
    const candidateLinks = root.querySelectorAll('a[href]');
    let jstageLink = null;
    let repositoryLink = null;
    let pdfDirectLink = null;
    let generalFullTextLink = null;

    for (const a of candidateLinks) {
      const href = a.getAttribute('href') || '';
      const text = a.textContent.toLowerCase();
      const title = (a.getAttribute('title') || '').toLowerCase();

      if (href.endsWith('.pdf') || href.includes('.pdf?')) {
        pdfDirectLink = { url: a.href, label: 'PDF' };
        break;
      }
      if (href.includes('jstage.jst.go.jp/article/')) {
        jstageLink = { url: a.href, label: 'J-STAGE' };
      } else if (href.includes('repo.') || href.includes('/repository/') || href.includes('ir.lib.')) {
        repositoryLink = { url: a.href, label: '機関リポジトリ' };
      } else if (text.includes('本文') || text.includes('pdf') || title.includes('本文') || title.includes('pdf')) {
        if (!generalFullTextLink && !href.startsWith('javascript:')) {
          generalFullTextLink = { url: a.href, label: '本文リンク' };
        }
      }
    }

    return pdfDirectLink || jstageLink || repositoryLink || generalFullTextLink || null;
  }

  // ==========================================
  // Citation Formatters
  // ==========================================

  function generateBibTeX(meta) {
    const firstAuthor = meta.authors[0] || 'Unknown';
    // Generate clean cite key
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
    // 著者名. 論文名. 誌名. 出版年, 巻数, 号数, p. 開始頁-終了頁. URL/DOI.
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
    // Author, A. (Year). Title of article. Title of Periodical, volume(issue), pages. https://doi.org/...
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
    // Author. "Title." Journal, vol. X, no. Y, Year, pp. xx-yy. DOI/URL.
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
    // Author. Year. "Title." Journal vol (issue): xx-yy.
    const author = meta.authors.join(', ') || 'Unknown';
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
  // Popover Menu Builder
  // ==========================================

  function createCitationPopover(citations, onClose) {
    const popover = document.createElement('div');
    popover.className = 'cinii-enh-popover';

    const header = document.createElement('div');
    header.className = 'cinii-enh-popover-header';
    header.innerHTML = `
      <span class="cinii-enh-popover-title">引用形式を選択してコピー</span>
      <button type="button" class="cinii-enh-popover-close" aria-label="閉じる">${SVGS.CLOSE}</button>
    `;
    popover.appendChild(header);

    header.querySelector('.cinii-enh-popover-close').addEventListener('click', (e) => {
      e.stopPropagation();
      popover.remove();
      if (onClose) onClose();
    });

    const list = document.createElement('div');
    list.className = 'cinii-enh-popover-list';

    for (const [key, item] of Object.entries(citations)) {
      const row = document.createElement('div');
      row.className = 'cinii-enh-popover-item';

      const labelCol = document.createElement('div');
      labelCol.className = 'cinii-enh-popover-label-col';
      labelCol.innerHTML = `<strong>${escapeHtml(item.label)}</strong>`;

      const preview = document.createElement('div');
      preview.className = 'cinii-enh-popover-preview';
      preview.textContent = item.text.replace(/\n\s+/g, ' ');

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'cinii-enh-btn cinii-enh-btn-copy-item';
      copyBtn.innerHTML = `${SVGS.COPY}<span>コピー</span>`;

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

      labelCol.appendChild(preview);
      row.appendChild(labelCol);
      row.appendChild(copyBtn);
      list.appendChild(row);
    }

    popover.appendChild(list);
    return popover;
  }

  // Close popover when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.cinii-enh-popover') && !e.target.closest('.cinii-enh-cite-trigger')) {
      document.querySelectorAll('.cinii-enh-popover').forEach((p) => p.remove());
    }
  });

  // ==========================================
  // Detail Page Enhancement
  // ==========================================

  async function enhanceDetailPage() {
    if (!userSettings.enableDetailToolbar) return;
    if (document.getElementById('cinii-enh-detail-toolbar')) return;

    // Check if we are on a detail page
    const isDetailPage =
      window.location.pathname.includes('/crid/') ||
      document.querySelector('meta[name="citation_title"]') ||
      document.querySelector('.item-header, .item-details, .detail-header');

    if (!isDetailPage) return;

    const meta = extractDetailMetadata();
    if (!meta.title) return;

    // Locate anchor to mount toolbar
    const anchor =
      document.querySelector('.item-header') ||
      document.querySelector('h1') ||
      document.querySelector('.main-content, #main, .content');

    if (!anchor) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'cinii-enh-detail-toolbar';
    toolbar.className = 'cinii-enh-detail-toolbar';

    // Toolbar Header / Title
    const titleArea = document.createElement('div');
    titleArea.className = 'cinii-enh-toolbar-brand';
    titleArea.innerHTML = `<span class="cinii-enh-brand-label">CiNii Enhancer</span>`;
    toolbar.appendChild(titleArea);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'cinii-enh-btn-group';

    // 1. Citation Button
    const citeBtn = document.createElement('button');
    citeBtn.type = 'button';
    citeBtn.className = 'cinii-enh-btn cinii-enh-btn-primary cinii-enh-cite-trigger';
    citeBtn.innerHTML = `${SVGS.QUOTE}<span>引用をコピー</span>`;

    citeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const existing = toolbar.querySelector('.cinii-enh-popover');
      if (existing) {
        existing.remove();
        return;
      }
      const citations = generateAllCitations(meta);
      const popover = createCitationPopover(citations);
      toolbar.appendChild(popover);
    });

    btnGroup.appendChild(citeBtn);

    // 2. Full-Text / PDF Direct Button
    const pdfContainer = document.createElement('div');
    pdfContainer.className = 'cinii-enh-pdf-wrapper';

    if (meta.pdfUrl) {
      // Direct link already known
      const pdfBtn = document.createElement('a');
      pdfBtn.className = 'cinii-enh-btn cinii-enh-btn-success';
      pdfBtn.href = meta.pdfUrl;
      pdfBtn.target = '_blank';
      pdfBtn.rel = 'noopener noreferrer';
      const label = meta.fullTextLabel ? `PDF / 本文 (${meta.fullTextLabel})` : 'PDFを閲覧';
      pdfBtn.innerHTML = `${SVGS.PDF}<span>${escapeHtml(label)}</span>${SVGS.EXTERNAL}`;
      pdfContainer.appendChild(pdfBtn);
    } else if (meta.doi) {
      // Check Unpaywall API via background worker
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
            pdfBtn.className = 'cinii-enh-btn cinii-enh-btn-success';
            pdfBtn.href = res.pdf_url;
            pdfBtn.target = '_blank';
            pdfBtn.rel = 'noopener noreferrer';
            const badgeType = res.host_type === 'repository' ? '機関OA' : 'オープンアクセス';
            pdfBtn.innerHTML = `${SVGS.PDF}<span>PDF (${badgeType})</span>${SVGS.EXTERNAL}`;
            pdfContainer.appendChild(pdfBtn);
          } else {
            // No direct OA found via DOI, check for general full-text links on page
            const domLink = findDirectFullTextLink(document);
            if (domLink) {
              const linkBtn = document.createElement('a');
              linkBtn.className = 'cinii-enh-btn cinii-enh-btn-outline';
              linkBtn.href = domLink.url;
              linkBtn.target = '_blank';
              linkBtn.rel = 'noopener noreferrer';
              linkBtn.innerHTML = `${SVGS.EXTERNAL}<span>${escapeHtml(domLink.label || '本文リンク')}</span>`;
              pdfContainer.appendChild(linkBtn);
            } else {
              const noPdfSpan = document.createElement('span');
              noPdfSpan.className = 'cinii-enh-badge cinii-enh-badge-gray';
              noPdfSpan.textContent = '無料PDF未検出';
              pdfContainer.appendChild(noPdfSpan);
            }
          }
        }
      );
    } else {
      // No DOI and no direct link
      const domLink = findDirectFullTextLink(document);
      if (domLink) {
        const linkBtn = document.createElement('a');
        linkBtn.className = 'cinii-enh-btn cinii-enh-btn-outline';
        linkBtn.href = domLink.url;
        linkBtn.target = '_blank';
        linkBtn.rel = 'noopener noreferrer';
        linkBtn.innerHTML = `${SVGS.EXTERNAL}<span>${escapeHtml(domLink.label)}</span>`;
        pdfContainer.appendChild(linkBtn);
      }
    }

    btnGroup.appendChild(pdfContainer);
    toolbar.appendChild(btnGroup);

    // Insert toolbar before or after the anchor
    if (anchor.parentNode) {
      anchor.parentNode.insertBefore(toolbar, anchor.nextSibling);
    }
  }

  // ==========================================
  // Search Results Page Enhancement
  // ==========================================

  function enhanceSearchResults() {
    // Find all result item containers
    // CiNii uses various card classes such as .c-card, li.item, .search-result-item, or elements with crid links
    const cridLinks = document.querySelectorAll('a[href*="/crid/"]');
    if (cridLinks.length === 0) return;

    // Identify parent card container for each crid link
    const processedCards = new Set();
    const cards = [];

    cridLinks.forEach((link) => {
      // Avoid breadcrumbs or header links
      if (link.closest('header') || link.closest('.breadcrumb') || link.closest('#header')) return;

      // Find top-level item container
      let container = link.closest('li') || link.closest('.c-card') || link.closest('.item') || link.parentElement;
      if (container && !processedCards.has(container)) {
        processedCards.add(container);
        cards.push({ container, titleLink: link });
      }
    });

    if (cards.length === 0) return;

    // 1. Inject Instant Filter Bar if enabled
    if (userSettings.enableFilter) {
      injectFilterBar(cards);
    }

    // 2. Enhance each card
    cards.forEach(({ container, titleLink }) => {
      enhanceSearchCard(container, titleLink);
    });

    // Update filter counter
    updateFilterCounts();
  }

  function injectFilterBar(cards) {
    if (document.getElementById('cinii-enh-filter-bar')) return;

    // Find search results header or list parent
    const firstContainer = cards[0]?.container;
    if (!firstContainer || !firstContainer.parentNode) return;

    const listParent = firstContainer.parentNode;

    const bar = document.createElement('div');
    bar.id = 'cinii-enh-filter-bar';
    bar.className = 'cinii-enh-filter-bar';

    bar.innerHTML = `
      <div class="cinii-enh-filter-left">
        <span class="cinii-enh-filter-icon">${SVGS.FILTER}</span>
        <span class="cinii-enh-filter-title">文献フィルター:</span>
        <button type="button" id="cinii-enh-btn-filter-oa" class="cinii-enh-btn cinii-enh-btn-toggle">
          <span>本文・PDFあり のみ表示</span>
        </button>
      </div>
      <div class="cinii-enh-filter-right">
        <span id="cinii-enh-filter-count" class="cinii-enh-filter-count"></span>
      </div>
    `;

    listParent.parentNode.insertBefore(bar, listParent);

    const toggleBtn = bar.querySelector('#cinii-enh-btn-filter-oa');
    toggleBtn.addEventListener('click', () => {
      toggleBtn.classList.toggle('is-active');
      const isActive = toggleBtn.classList.contains('is-active');
      document.body.classList.toggle('cinii-enh-filter-oa-active', isActive);
      updateFilterCounts();
    });
  }

  function updateFilterCounts() {
    const countEl = document.getElementById('cinii-enh-filter-count');
    if (!countEl) return;

    const allCards = document.querySelectorAll('.cinii-enh-card-enhanced');
    const oaCards = document.querySelectorAll('.cinii-enh-card-enhanced[data-has-fulltext="true"]');

    const total = allCards.length;
    const oaCount = oaCards.length;

    const isActive = document.body.classList.contains('cinii-enh-filter-oa-active');
    if (isActive) {
      countEl.textContent = `本文あり ${oaCount} 件を表示中（全 ${total} 件中）`;
    } else {
      countEl.textContent = `全 ${total} 件中、本文・PDFあり: ${oaCount} 件`;
    }
  }

  function enhanceSearchCard(container, titleLink) {
    if (container.classList.contains('cinii-enh-card-enhanced')) return;
    container.classList.add('cinii-enh-card-enhanced');

    // Detect if this card has full text or PDF
    const textContent = container.textContent.toLowerCase();
    const innerHtml = container.innerHTML.toLowerCase();

    const directLink = findDirectFullTextLink(container);
    const hasOaBadge =
      textContent.includes('オープンアクセス') ||
      textContent.includes('本文あり') ||
      innerHtml.includes('icon-oa') ||
      innerHtml.includes('badge-oa') ||
      Boolean(directLink);

    container.setAttribute('data-has-fulltext', hasOaBadge ? 'true' : 'false');

    // Extract quick metadata for this card
    const cardMeta = {
      title: titleLink.textContent.trim().replace(/\s+/g, ' '),
      authors: [],
      journal: '',
      year: '',
      volume: '',
      issue: '',
      pages: '',
      doi: '',
      url: titleLink.href.split('?')[0].split('#')[0]
    };

    // Look for DOI
    const doiMatch = container.innerHTML.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
    if (doiMatch) cardMeta.doi = doiMatch[0];

    // Look for Year
    const yearMatch = textContent.match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) cardMeta.year = yearMatch[1];

    // Try finding authors / journal in typical card text
    const metaSnippets = container.querySelectorAll('.text-muted, .meta, .item-meta, p, span');
    metaSnippets.forEach((snippet) => {
      const text = snippet.textContent.trim();
      if (!text || text === cardMeta.title) return;
      if (text.includes('著') || text.includes('等') || (text.includes(',') && !text.includes('http'))) {
        if (cardMeta.authors.length === 0 && text.length < 120) {
          const splitAuthors = text.split(/[,、/]/).map((s) => s.trim()).filter(Boolean);
          if (splitAuthors.length > 0) cardMeta.authors = splitAuthors;
        }
      }
    });

    if (cardMeta.authors.length === 0) {
      cardMeta.authors = ['著作者'];
    }

    // Build Action Toolbar on Card
    const actionsBar = document.createElement('div');
    actionsBar.className = 'cinii-enh-card-actions';

    // 1. PDF / Full text direct button or badge
    if (userSettings.enableSearchPdfDirect) {
      if (directLink) {
        const pdfBtn = document.createElement('a');
        pdfBtn.className = 'cinii-enh-btn cinii-enh-btn-sm cinii-enh-btn-success';
        pdfBtn.href = directLink.url;
        pdfBtn.target = '_blank';
        pdfBtn.rel = 'noopener noreferrer';
        pdfBtn.innerHTML = `${SVGS.PDF}<span>${escapeHtml(directLink.label || 'PDF')}</span>`;
        actionsBar.appendChild(pdfBtn);
      } else if (hasOaBadge) {
        const badge = document.createElement('span');
        badge.className = 'cinii-enh-badge cinii-enh-badge-oa';
        badge.textContent = '本文あり';
        actionsBar.appendChild(badge);
      } else {
        const badge = document.createElement('span');
        badge.className = 'cinii-enh-badge cinii-enh-badge-muted';
        badge.textContent = '本文なし';
        actionsBar.appendChild(badge);
      }
    }

    // 2. Quick Citation Popover Button
    if (userSettings.enableSearchQuickCopy) {
      const citeBtn = document.createElement('button');
      citeBtn.type = 'button';
      citeBtn.className = 'cinii-enh-btn cinii-enh-btn-sm cinii-enh-btn-outline cinii-enh-cite-trigger';
      citeBtn.innerHTML = `${SVGS.QUOTE}<span>引用</span>`;

      citeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const existing = actionsBar.querySelector('.cinii-enh-popover');
        if (existing) {
          existing.remove();
          return;
        }
        const citations = generateAllCitations(cardMeta);
        const popover = createCitationPopover(citations);
        actionsBar.appendChild(popover);
      });

      actionsBar.appendChild(citeBtn);
    }

    // Attach actionsBar inside container
    container.appendChild(actionsBar);
  }

  // ==========================================
  // Initialization & Dynamic Page Watcher
  // ==========================================

  function runEnhancer() {
    enhanceDetailPage();
    enhanceSearchResults();
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

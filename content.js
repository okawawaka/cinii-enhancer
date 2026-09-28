/**
 * CiNii Research Enhancer - Content Script
 * Chromium Extension (Manifest V3)
 * Provides scholarly citation copying, item-type specific templates,
 * and HTML tag cleanup for CiNii Research (https://cir.nii.ac.jp/).
 */
(() => {
  'use strict';

  // ==============================================================================
  // 1. Constants & Default Settings
  // ==============================================================================

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

  let userSettings = { ...DEFAULT_SETTINGS };

  // Scalable academic vector icons (strictly NO Unicode emojis)
  const SVGS = {
    QUOTE: '<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 0 4 1.75 6 5 8zm13 0c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 0 4 1.75 6 5 8z"/></svg>',
    COPY: '<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    CHECK: '<svg class="cinii-enh-icon cinii-enh-icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    CLEAN: '<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    CODE: '<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    CLOSE: '<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    GEAR: '<svg class="cinii-enh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>'
  };

  // ==============================================================================
  // 2. Utility Functions
  // ==============================================================================

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message, duration = 2200) {
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

  async function copyText(text, successMessage = 'クリップボードにコピーしました') {
    const normalizedText = (text || '').trim().replace(/\r\n/g, '\n');
    try {
      let copied = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(normalizedText);
          copied = true;
        } catch (_) {
          // Fallback to execCommand if navigator.clipboard fails
        }
      }

      if (!copied) {
        const textarea = document.createElement('textarea');
        textarea.value = normalizedText;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copied = document.execCommand('copy');
        textarea.remove();
      }

      if (copied) {
        showToast(successMessage);
        return true;
      }
      throw new Error('Clipboard write operation failed');
    } catch (err) {
      console.error('[CiNii Enhancer] Copy failed:', err);
      showToast('コピーに失敗しました');
      return false;
    }
  }

  async function loadSettings() {
    try {
      const storage = chrome.storage?.sync || chrome.storage?.local;
      if (storage) {
        const data = await storage.get(DEFAULT_SETTINGS);
        userSettings = { ...DEFAULT_SETTINGS, ...data };
      }
    } catch (err) {
      console.warn('[CiNii Enhancer] Using default settings:', err);
    }
  }

  async function saveSettings(newSettings, callback) {
    userSettings = { ...userSettings, ...newSettings };
    try {
      const storage = chrome.storage?.sync || chrome.storage?.local;
      if (storage) {
        await storage.set(newSettings);
      }
      if (callback) callback();
    } catch (err) {
      console.error('[CiNii Enhancer] Failed to save settings:', err);
      if (callback) callback();
    }
  }

  function isDetailPage() {
    const p = window.location.pathname;
    return (
      p.includes('/crid/') ||
      p.includes('/articles/') ||
      p.includes('/books/') ||
      p.includes('/dissertations/')
    ) && Boolean(document.querySelector('.item_mainTitle, h1.item-title, .itemheading, #itemTitle'));
  }

  function isSearchPage() {
    const p = window.location.pathname;
    const s = window.location.search;
    return (
      p.includes('/search') ||
      p.includes('/all') ||
      p === '/articles' ||
      p === '/books' ||
      p === '/dissertations' ||
      p === '/projects' ||
      s.includes('q=') ||
      Boolean(document.querySelector('.listitem, .search-result-item, #searchResult, #result-list, .resultList, [class*="listitem"]'))
    );
  }

  // ==============================================================================
  // 3. Metadata Extraction Engine
  // ==============================================================================

  function extractDetailMetadata() {
    const currentUrl = window.location.href;
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
      publisher: '',
      publicationPlace: '',
      issn: '',
      isbn: '',
      itemType: 'article',
      url: currentUrl.split('?')[0].split('#')[0]
    };

    // 1. Highwire Press Meta Tags
    document.querySelectorAll('meta[name^="citation_"]').forEach((el) => {
      const name = el.getAttribute('name').toLowerCase();
      const content = (el.getAttribute('content') || '').trim();
      if (!content) return;

      if (name === 'citation_title') meta.title = content;
      else if (name === 'citation_author') meta.authors.push(content);
      else if (name === 'citation_journal_title') meta.journal = content;
      else if (name === 'citation_publication_date' || name === 'citation_date') {
        const m = content.match(/\b(19\d\d|20\d\d)\b/);
        if (m) meta.year = m[1];
      } else if (name === 'citation_volume') meta.volume = content;
      else if (name === 'citation_issue') meta.issue = content;
      else if (name === 'citation_firstpage') meta.firstPage = content;
      else if (name === 'citation_lastpage') meta.lastPage = content;
      else if (name === 'citation_doi') meta.doi = content;
      else if (name === 'citation_publisher') meta.publisher = content;
      else if (name === 'citation_publication_place' || name === 'citation_address') meta.publicationPlace = content;
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
            const list = Array.isArray(ld.author) ? ld.author : [ld.author];
            list.forEach((a) => {
              const name = typeof a === 'string' ? a : (a.name || '');
              if (name && !meta.authors.includes(name)) meta.authors.push(name);
            });
          }
          if (!meta.year && ld.datePublished) {
            const m = String(ld.datePublished).match(/\b(19\d\d|20\d\d)\b/);
            if (m) meta.year = m[1];
          }
        }
      }
    } catch (_) {}

    // 4. DOM Fallbacks for Title and Authors
    if (!meta.title) {
      const titleEl = document.querySelector('.item_mainTitle, h1.item-title, h1.title, .itemheading h1, h1');
      if (titleEl) meta.title = titleEl.textContent.trim().replace(/\s+/g, ' ');
    }

    if (meta.authors.length === 0) {
      document.querySelectorAll('.authorslist a, .author-name, .creator-name, .item-creator a').forEach((el) => {
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

    // DOI fallback
    if (!meta.doi) {
      const doiLink = document.querySelector('a[href*="doi.org/"]');
      if (doiLink) {
        const m = doiLink.href.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
        if (m) meta.doi = m[0];
      }
    }

    // 5. Item Type Classification
    if (
      currentUrl.includes('/books/') ||
      meta.isbn ||
      document.querySelector('.book_class, dl.book_class, [class*="book_class"], .classIcon-book') ||
      document.querySelector('meta[name="citation_isbn"]')
    ) {
      meta.itemType = 'book';
    } else if (
      currentUrl.includes('/dissertations/') ||
      document.querySelector('.paper-dissertation_class, dl.paper-dissertation_class, .classIcon-dissertation') ||
      document.querySelector('meta[name="citation_dissertation_institution"]')
    ) {
      meta.itemType = 'dissertation';
    } else {
      meta.itemType = 'article';
    }

    // 6. Publisher / Institution / Publication Place Fallback
    if (!meta.publisher) {
      const pubEl = document.querySelector('.item_publisher, .publisher, dd[class*="publisher"], .detail_publisher, .publisher-name');
      if (pubEl) {
        meta.publisher = pubEl.textContent.trim();
      } else if (meta.itemType === 'dissertation') {
        const instEl = document.querySelector('.institution, [class*="institution"], dd[class*="institution"]');
        if (instEl) meta.publisher = instEl.textContent.trim();
      }
    }

    if (!meta.publicationPlace) {
      const placeEl = document.querySelector('.publication_place, .pub_place, .item_pubplace, dd[class*="pubplace"]');
      if (placeEl) {
        meta.publicationPlace = placeEl.textContent.trim();
      }
    }

    // Separate "Place : Publisher" format if present
    if (meta.publisher) {
      const parts = meta.publisher.split(/[:：]/);
      if (parts.length >= 2) {
        if (!meta.publicationPlace) {
          meta.publicationPlace = parts[0].replace(/[,，]+$/, '').trim();
        }
        meta.publisher = parts.slice(1).join(':').trim();
      }
      const yearTailMatch = meta.publisher.match(/^(.*?)[,，\s]+(19\d\d|20\d\d)\s*$/);
      if (yearTailMatch) {
        meta.publisher = yearTailMatch[1].trim();
        if (!meta.year) meta.year = yearTailMatch[2];
      }
    }

    if (meta.publicationPlace) {
      meta.publicationPlace = meta.publicationPlace.replace(/[:：,，]+$/, '').trim();
    }

    return meta;
  }

  function isCiteableItem(item, titleLink) {
    if (!item || !titleLink) return false;
    const itemHtml = item.innerHTML || '';
    const href = titleLink.href || '';

    // Exclude Persons / Researchers
    if (
      item.querySelector('.author_class, [class*="author_class"], [class*="person_class"], dl.author_class') ||
      item.classList.contains('author_class') ||
      itemHtml.includes('classIcon-author.svg') ||
      itemHtml.includes('tagIcon-person.svg') ||
      href.includes('/nrid/')
    ) return false;

    // Exclude Research Projects (KAKEN)
    if (
      item.querySelector('.research_class, .project_class, dl.research_class, dl.project_class') ||
      item.classList.contains('research_class') ||
      item.classList.contains('project_class') ||
      itemHtml.includes('classIcon-research1.svg') ||
      href.includes('/kaken/') ||
      href.includes('/projects/')
    ) return false;

    // Exclude Research Datasets
    if (
      item.querySelector('.data_class, dl.data_class') ||
      item.classList.contains('data_class') ||
      itemHtml.includes('classIcon-data.svg')
    ) return false;

    // Positive matches
    if (
      item.querySelector('.paper_class, .book_class, .paper-dissertation_class, dl.paper_class, dl.book_class, dl.paper-dissertation_class') ||
      item.classList.contains('paper_class') ||
      item.classList.contains('book_class') ||
      item.classList.contains('paper-dissertation_class') ||
      itemHtml.includes('classIcon-article.svg') ||
      itemHtml.includes('classIcon-book.svg') ||
      itemHtml.includes('classIcon-dissertation.svg')
    ) return true;

    // Fallback: publication CRID with authors
    const hasAuthors = Boolean(item.querySelector('.authorslist, .author-name, .item-creator'));
    return hasAuthors && href.includes('/crid/');
  }

  function extractSearchCardMetadata(item, titleLink) {
    const titleText = titleLink.textContent.trim().replace(/\s+/g, ' ');
    const textContent = item.textContent || '';
    const itemHtml = item.innerHTML || '';
    const href = titleLink.href || '';

    const authors = [];
    item.querySelectorAll('.authorslist a, .author-name, .item-creator a').forEach((a) => {
      const name = a.textContent.trim();
      if (name && !authors.includes(name)) authors.push(name);
    });

    const yearMatch = textContent.match(/\b(19\d\d|20\d\d)\b/);
    const year = yearMatch ? yearMatch[1] : '';

    let doi = '';
    const doiMatch = itemHtml.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
    if (doiMatch) doi = doiMatch[0];

    let itemType = 'article';
    if (
      item.querySelector('.book_class, dl.book_class') ||
      item.classList.contains('book_class') ||
      itemHtml.includes('classIcon-book.svg') ||
      href.includes('/books/')
    ) {
      itemType = 'book';
    } else if (
      item.querySelector('.paper-dissertation_class, dl.paper-dissertation_class') ||
      item.classList.contains('paper-dissertation_class') ||
      itemHtml.includes('classIcon-dissertation.svg') ||
      href.includes('/dissertations/')
    ) {
      itemType = 'dissertation';
    }

    let publisher = '';
    let publicationPlace = '';
    const pubEl = item.querySelector('.publisher, [class*="publisher"], dd.publisher');
    if (pubEl) {
      publisher = pubEl.textContent.trim();
    } else {
      const m = textContent.match(/[:：]\s*([^\d,，\n]+)[,，]\s*(?:19|20)\d\d/);
      if (m) publisher = m[1].trim();
    }

    const placeEl = item.querySelector('.publication_place, .pub_place, [class*="pubplace"]');
    if (placeEl) {
      publicationPlace = placeEl.textContent.trim();
    }

    if (publisher) {
      const parts = publisher.split(/[:：]/);
      if (parts.length >= 2) {
        if (!publicationPlace) {
          publicationPlace = parts[0].replace(/[,，]+$/, '').trim();
        }
        publisher = parts.slice(1).join(':').trim();
      }
      const yearTailMatch = publisher.match(/^(.*?)[,，\s]+(19\d\d|20\d\d)\s*$/);
      if (yearTailMatch) {
        publisher = yearTailMatch[1].trim();
      }
    }

    if (publicationPlace) {
      publicationPlace = publicationPlace.replace(/[:：,，]+$/, '').trim();
    }

    let journal = '';
    const journalEl = item.querySelector('.journal, [class*="journal"], dd.source, .item_journal');
    if (journalEl) journal = journalEl.textContent.trim();

    return {
      title: titleText,
      authors: authors.length > 0 ? authors : ['著作者'],
      journal: journal,
      year: year,
      volume: '',
      issue: '',
      pages: '',
      doi: doi,
      publisher: publisher,
      publicationPlace: publicationPlace,
      itemType: itemType,
      url: href.split('?')[0].split('#')[0]
    };
  }

  // ==============================================================================
  // 4. Citation Generation Engine
  // ==============================================================================

  function generateBibTeX(meta) {
    const firstAuthor = meta.authors[0] || 'Unknown';
    const authorKey = firstAuthor.replace(/[\s,]+/g, '').replace(/[^\w]/g, '').toLowerCase() || 'item';
    const yearKey = meta.year || 'nodate';
    const firstWord = (meta.title || '').replace(/[^\w\s]/g, '').trim().split(/\s+/)[0].toLowerCase();
    const citeKey = `${authorKey}${yearKey}${firstWord ? '_' + firstWord : ''}`;
    const authorStr = meta.authors.join(' and ') || 'Unknown';

    let entryType = 'article';
    if (meta.itemType === 'book') entryType = 'book';
    else if (meta.itemType === 'dissertation') entryType = 'phdthesis';

    const fields = [
      `  title     = {{${meta.title || 'Untitled'}}}`,
      `  author    = {${authorStr}}`
    ];

    if (entryType === 'book') {
      if (meta.publicationPlace) fields.push(`  address   = {${meta.publicationPlace}}`);
      if (meta.publisher) fields.push(`  publisher = {${meta.publisher}}`);
      if (meta.year) fields.push(`  year      = {${meta.year}}`);
      if (meta.isbn) fields.push(`  isbn      = {${meta.isbn}}`);
    } else if (entryType === 'phdthesis') {
      if (meta.publisher) fields.push(`  school    = {${meta.publisher}}`);
      if (meta.year) fields.push(`  year      = {${meta.year}}`);
    } else {
      if (meta.journal) fields.push(`  journal   = {${meta.journal}}`);
      if (meta.year) fields.push(`  year      = {${meta.year}}`);
      if (meta.volume) fields.push(`  volume    = {${meta.volume}}`);
      if (meta.issue) fields.push(`  number    = {${meta.issue}}`);
      if (meta.pages) fields.push(`  pages     = {${meta.pages.replace('-', '--')}}`);
      if (meta.publisher) fields.push(`  publisher = {${meta.publisher}}`);
    }

    if (meta.doi) fields.push(`  doi       = {${meta.doi}}`);
    if (meta.url) fields.push(`  url       = {${meta.url}}`);

    return `@${entryType}{${citeKey},\n${fields.join(',\n')}\n}`;
  }

  function generateSIST02(meta) {
    const authors = meta.authors.join(', ') || '著者不明';

    if (meta.itemType === 'book') {
      let res = `${authors}. 『${meta.title}』.`;
      const pubParts = [];
      if (meta.publicationPlace) pubParts.push(meta.publicationPlace);
      if (meta.publisher) pubParts.push(meta.publisher);
      if (pubParts.length > 0) res += ` ${pubParts.join(', ')},`;
      if (meta.year) res += ` ${meta.year}.`;
      if (meta.pages) res += ` ${meta.pages}p.`;
      if (meta.url) res += ` ${meta.url}`;
      return res.replace(/\s{2,}/g, ' ').trim();
    }

    if (meta.itemType === 'dissertation') {
      let res = `${authors}. 『${meta.title}』. 博士論文,`;
      if (meta.publisher) res += ` ${meta.publisher},`;
      if (meta.year) res += ` ${meta.year}.`;
      if (meta.url) res += ` ${meta.url}`;
      return res.replace(/\s{2,}/g, ' ').trim();
    }

    let res = `${authors}. ${meta.title}.`;
    if (meta.journal) res += ` ${meta.journal}.`;

    const parts = [];
    if (meta.year) parts.push(meta.year);
    if (meta.volume && meta.issue) parts.push(`${meta.volume}(${meta.issue})`);
    else if (meta.volume) parts.push(meta.volume);
    else if (meta.issue) parts.push(`(${meta.issue})`);

    if (parts.length > 0) res += ` ${parts.join(', ')}`;
    if (meta.pages) res += `, p. ${meta.pages}.`;
    else res += '.';

    if (meta.doi) res += ` https://doi.org/${meta.doi}`;
    else if (meta.url) res += ` ${meta.url}`;

    return res.trim();
  }

  function generateAPA(meta) {
    let authorStr = 'Unknown';
    if (meta.authors.length > 0) {
      if (meta.authors.length === 1) authorStr = meta.authors[0];
      else if (meta.authors.length === 2) authorStr = `${meta.authors[0]} & ${meta.authors[1]}`;
      else authorStr = `${meta.authors[0]} et al.`;
    }
    const yearStr = meta.year ? `(${meta.year})` : '(n.d.)';

    if (meta.itemType === 'book') {
      let res = `${authorStr} ${yearStr}. *${meta.title}*.`;
      if (meta.publisher) res += ` ${meta.publisher}.`;
      if (meta.doi) res += ` https://doi.org/${meta.doi}`;
      else if (meta.url) res += ` ${meta.url}`;
      return res.trim();
    }

    if (meta.itemType === 'dissertation') {
      const inst = meta.publisher ? `, ${meta.publisher}` : '';
      let res = `${authorStr} ${yearStr}. *${meta.title}* [Doctoral dissertation${inst}].`;
      if (meta.url) res += ` ${meta.url}`;
      return res.trim();
    }

    let res = `${authorStr} ${yearStr}. ${meta.title}.`;
    if (meta.journal) {
      res += ` *${meta.journal}*`;
      if (meta.volume) {
        res += `, ${meta.volume}`;
        if (meta.issue) res += `(${meta.issue})`;
      }
      if (meta.pages) res += `, ${meta.pages}`;
      res += '.';
    }
    if (meta.doi) res += ` https://doi.org/${meta.doi}`;
    else if (meta.url) res += ` ${meta.url}`;
    return res.trim();
  }

  function generateMarkdown(meta) {
    const authors = meta.authors.join(', ') || '著者不明';
    const year = meta.year ? ` (${meta.year})` : '';
    const link = meta.url ? `[${meta.title}](${meta.url})` : meta.title;

    if (meta.itemType === 'book') {
      const pub = meta.publisher ? ` ${meta.publisher}.` : '';
      return `- ${authors}${year}. 『${link}』.${pub}`;
    }

    if (meta.itemType === 'dissertation') {
      const inst = meta.publisher ? `, ${meta.publisher}` : '';
      return `- ${authors}${year}. 『${link}』(博士論文${inst}).`;
    }

    let details = '';
    if (meta.journal) {
      details += ` *${meta.journal}*`;
      if (meta.volume) details += `, Vol.${meta.volume}`;
      if (meta.issue) details += ` No.${meta.issue}`;
      if (meta.pages) details += `, pp.${meta.pages}`;
    }
    return `- ${authors}${year}. 「${link}」.${details}`;
  }

  function generateMLA(meta) {
    const author = meta.authors[0] || 'Unknown';
    if (meta.itemType === 'book') {
      let res = `${author}. *${meta.title}*.`;
      if (meta.publisher) res += ` ${meta.publisher},`;
      if (meta.year) res += ` ${meta.year}.`;
      return res.trim();
    }
    if (meta.itemType === 'dissertation') {
      return `${author}. *${meta.title}*. ${meta.year || 'n.d.'}. ${meta.publisher || 'University'}, PhD dissertation.`;
    }
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
    if (meta.itemType === 'book') {
      let res = `${author}. ${year}. *${meta.title}*.`;
      if (meta.publicationPlace && meta.publisher) {
        res += ` ${meta.publicationPlace}: ${meta.publisher}.`;
      } else if (meta.publisher) {
        res += ` ${meta.publisher}.`;
      } else if (meta.publicationPlace) {
        res += ` ${meta.publicationPlace}.`;
      }
      return res.trim();
    }
    if (meta.itemType === 'dissertation') {
      return `${author}. ${year}. "${meta.title}." PhD diss., ${meta.publisher || 'University'}.`;
    }
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
    let ty = 'JOUR';
    if (meta.itemType === 'book') ty = 'BOOK';
    else if (meta.itemType === 'dissertation') ty = 'THES';

    const lines = [
      `TY  - ${ty}`,
      `TI  - ${meta.title || 'Untitled'}`
    ];
    (meta.authors || []).forEach((a) => lines.push(`AU  - ${a}`));
    if (meta.journal) lines.push(`JO  - ${meta.journal}`);
    if (meta.year) lines.push(`PY  - ${meta.year}`);
    if (meta.publicationPlace) lines.push(`CY  - ${meta.publicationPlace}`);
    if (meta.publisher) lines.push(`PB  - ${meta.publisher}`);
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
    const headers = ['タイトル', '著者', '種別', '収録刊行物/出版社', '出版地', '巻', '号', 'ページ', '出版年', 'DOI', 'URL'];
    const row = [
      meta.title || '',
      (meta.authors || []).join('; '),
      meta.itemType || 'article',
      meta.journal || meta.publisher || '',
      meta.publicationPlace || '',
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
    let tmpl = templateStr;
    if (!tmpl || userSettings.enableItemTypeTemplate !== false) {
      if (meta.itemType === 'book') {
        tmpl = templateStr || userSettings.customTemplateBook || '{authors} ({year})『{title}』{place}: {publisher}. {url}';
      } else if (meta.itemType === 'dissertation') {
        tmpl = templateStr || userSettings.customTemplateDissertation || '{authors} ({year})『{title}』博士論文, {publisher}. {url}';
      } else {
        tmpl = templateStr || userSettings.customTemplateArticle || userSettings.customTemplate || '{authors} ({year})「{title}」『{journal}』{volume}({issue}), pp.{pages}. {url}';
      }
    }

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
      '{publisher}': meta.publisher || '',
      '{place}': meta.publicationPlace || '',
      '{publicationPlace}': meta.publicationPlace || '',
      '{isbn}': meta.isbn || ''
    };

    let result = tmpl;
    for (const [key, val] of Object.entries(replacements)) {
      result = result.split(key).join(val);
    }

    return result
      .replace(/\(\s*\)/g, '')
      .replace(/\[\s*\]/g, '')
      .replace(/『\s*』/g, '')
      .replace(/「\s*」/g, '')
      .replace(/pp\.\s*(?=[,\.\s]|$)/g, '')
      .replace(/([』）\)\.\s])\s*[:：]\s*/g, '$1 ')
      .replace(/^[:：]\s*/g, '')
      .replace(/,\s*,/g, ',')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function generateAllCitations(meta) {
    const customLabel = userSettings.customTemplateLabel || 'カスタム形式';
    return {
      custom: { label: customLabel, text: generateCustomCitation(meta) },
      bibtex: { label: 'BibTeX', text: generateBibTeX(meta) },
      sist02: { label: 'SIST02 (和文標準)', text: generateSIST02(meta) },
      apa: { label: 'APA (第7版)', text: generateAPA(meta) },
      ris: { label: 'RIS (文献管理ソフト用)', text: generateRIS(meta) },
      markdown: { label: 'Markdown', text: generateMarkdown(meta) },
      mla: { label: 'MLA (第9版)', text: generateMLA(meta) },
      chicago: { label: 'Chicago (著者-日付)', text: generateChicago(meta) }
    };
  }

  function getPreferredCitation(meta, formatKey) {
    const key = formatKey || userSettings.preferredCitation || 'bibtex';
    switch (key) {
      case 'custom':
        return {
          key: 'custom',
          label: userSettings.customTemplateLabel || 'カスタム',
          text: generateCustomCitation(meta)
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

  // ==============================================================================
  // 5. UI Components & Modals
  // ==============================================================================

  function createQuickCopyButton(metaProvider, extraClasses = '') {
    const prefKey = userSettings.preferredCitation || 'bibtex';
    const prefItem = getPreferredCitation({ authors: [] }, prefKey);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `cinii-enh-btn cinii-enh-btn-cite-quick ${extraClasses}`;
    btn.title = `設定済みフォーマット (${prefItem.label}) を直接コピー`;
    btn.innerHTML = `${SVGS.COPY}<span>${escapeHtml(prefItem.label)}</span>`;

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const meta = typeof metaProvider === 'function' ? metaProvider() : metaProvider;
      if (!meta) return;

      const pref = getPreferredCitation(meta, userSettings.preferredCitation || 'bibtex');
      const originalHtml = btn.innerHTML;
      const success = await copyText(pref.text, `${pref.label} をコピーしました`);
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

  function updateAllQuickCopyButtons() {
    const prefItem = getPreferredCitation({ authors: [] }, userSettings.preferredCitation || 'bibtex');
    document.querySelectorAll('.cinii-enh-btn-cite-quick').forEach((btn) => {
      btn.title = `設定済みフォーマット (${prefItem.label}) を直接コピー`;
      btn.innerHTML = `${SVGS.COPY}<span>${escapeHtml(prefItem.label)}</span>`;
    });
  }

  function openCitationModal(citations, paperTitle) {
    document.querySelectorAll('.cinii-enh-modal-overlay').forEach((el) => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'cinii-enh-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cinii-enh-modal';

    const titleHtml = paperTitle ? `<div class="cinii-enh-modal-paper-title">${escapeHtml(paperTitle)}</div>` : '';

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
    for (const [, item] of Object.entries(citations)) {
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
          }, 1600);
        }
      });

      list.appendChild(row);
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.classList.add('cinii-enh-modal-open');

    const closeBtn = modal.querySelector('.cinii-enh-modal-close');
    if (closeBtn) closeBtn.focus();

    const closeModal = () => {
      overlay.remove();
      document.body.classList.remove('cinii-enh-modal-open');
      document.removeEventListener('keydown', onKeyDown);
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKeyDown);
  }

  function openSettingsModal() {
    document.querySelectorAll('.cinii-enh-modal-overlay').forEach((el) => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'cinii-enh-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cinii-enh-modal cinii-enh-settings-modal';

    const sampleMetaArticle = {
      title: 'CiNii Researchにおける文献情報管理と引用機能の高度化',
      authors: ['情報 太郎', '学術 花子'],
      year: '2026',
      journal: '情報知識学会誌',
      volume: '36',
      issue: '2',
      pages: '120-135',
      doi: '10.1234/example.2026.001',
      url: 'https://cir.nii.ac.jp/crid/1390000000000000000',
      itemType: 'article'
    };

    const sampleMetaBook = {
      title: '音響と言語処理の数理的基礎',
      authors: ['言語 健一', '音響 律子'],
      year: '2024',
      publicationPlace: '東京',
      publisher: 'サイエンス社',
      isbn: '978-4-00-000000-0',
      url: 'https://cir.nii.ac.jp/crid/1130000000000000000',
      itemType: 'book'
    };

    const sampleMetaDissertation = {
      title: '深層学習に基づく音響特徴抽出と音声解析手法の研究',
      authors: ['研究 幸雄'],
      year: '2025',
      publisher: '東京大学',
      url: 'https://cir.nii.ac.jp/crid/1110000000000000000',
      itemType: 'dissertation'
    };

    const tmplArticle = userSettings.customTemplateArticle || userSettings.customTemplate || '{authors} ({year})「{title}」『{journal}』{volume}({issue}), pp.{pages}. {url}';
    const tmplBook = userSettings.customTemplateBook || '{authors} ({year})『{title}』{place}: {publisher}. {url}';
    const tmplDissertation = userSettings.customTemplateDissertation || '{authors} ({year})『{title}』博士論文, {publisher}. {url}';
    const enableItemType = userSettings.enableItemTypeTemplate !== false;

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
            タイトル右横のボタンをクリックした際に直接コピーされる形式です。
          </div>
          <select id="setting-preferred-format" class="cinii-enh-form-select">
            <option value="bibtex">BibTeX (LaTeX / Typst)</option>
            <option value="sist02">SIST02 (和文論文標準)</option>
            <option value="apa">APA (第7版)</option>
            <option value="ris">RIS (EndNote / Mendeley / Zotero)</option>
            <option value="markdown">Markdown (URL付き)</option>
            <option value="mla">MLA (第9版)</option>
            <option value="chicago">Chicago (著者-日付形式)</option>
            <option value="custom">カスタム形式 (独自テンプレート)</option>
          </select>
        </div>

        <!-- 2. Custom Citation Template Editor with Item-Type Tabs -->
        <div class="cinii-enh-form-group cinii-enh-custom-template-section">
          <div class="cinii-enh-form-header-row">
            <label class="cinii-enh-form-label">
              カスタム引用テンプレート設定
            </label>
            <div class="cinii-enh-template-label-input-wrap">
              <span class="cinii-enh-sublabel">ボタン表示名:</span>
              <input type="text" id="setting-custom-label" class="cinii-enh-form-input cinii-enh-form-input-sm" value="${escapeHtml(userSettings.customTemplateLabel || 'カスタム')}" placeholder="例: カスタム">
            </div>
          </div>
          
          <div class="cinii-enh-toggle-row" style="margin-top: 4px; padding: 6px 10px;">
            <div class="cinii-enh-toggle-info">
              <span class="cinii-enh-toggle-title" style="font-size: 11.5px;">文献種別ごとに自動でテンプレートを使い分ける</span>
              <span class="cinii-enh-toggle-desc">有効時、図書には図書用、論文には論文用の設定を自動適用します。</span>
            </div>
            <label class="cinii-enh-toggle-control" for="setting-enable-itemtype-template">
              <input type="checkbox" id="setting-enable-itemtype-template" ${enableItemType ? 'checked' : ''}>
              <span class="cinii-enh-toggle-track"></span>
              <span id="badge-enable-itemtype-template" class="cinii-enh-status-badge ${enableItemType ? 'cinii-enh-badge-on' : 'cinii-enh-badge-off'}">
                ${enableItemType ? '有効' : '無効'}
              </span>
            </label>
          </div>

          <!-- Item Type Switcher Tabs -->
          <div class="cinii-enh-template-tabs">
            <button type="button" class="cinii-enh-template-tab-btn is-active" data-tab="article">論文（雑誌・紀要）</button>
            <button type="button" class="cinii-enh-template-tab-btn" data-tab="book">図書（単行本・書籍）</button>
            <button type="button" class="cinii-enh-template-tab-btn" data-tab="dissertation">学位論文</button>
          </div>

          <!-- Pane 1: Article -->
          <div id="pane-article" class="cinii-enh-template-pane is-active">
            <div class="cinii-enh-chips-bar">
              <span class="cinii-enh-chips-title">変数を挿入:</span>
              <button type="button" class="cinii-enh-chip" data-var="{title}">{title} 標題</button>
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
            <textarea id="setting-template-article" class="cinii-enh-form-textarea" rows="3" placeholder="{authors} ({year})「{title}」『{journal}』{volume}({issue}), pp.{pages}. {url}">${escapeHtml(tmplArticle)}</textarea>
            <div class="cinii-enh-presets-row">
              <span class="cinii-enh-sublabel">プリセット:</span>
              <button type="button" class="cinii-enh-btn-preset" data-target="article" data-preset="{authors} ({year})「{title}」『{journal}』{volume}({issue}), pp.{pages}. {url}">和文論文（標準）</button>
              <button type="button" class="cinii-enh-btn-preset" data-target="article" data-preset="- [{title}]({url}) - {authors} ({year})">Markdownメモ</button>
              <button type="button" class="cinii-enh-btn-preset" data-target="article" data-preset="{authors} ({year}). {title}. *{journal}*, {volume}({issue}), {pages}. {doi}">英文論文調</button>
            </div>
          </div>

          <!-- Pane 2: Book -->
          <div id="pane-book" class="cinii-enh-template-pane">
            <div class="cinii-enh-chips-bar">
              <span class="cinii-enh-chips-title">変数を挿入:</span>
              <button type="button" class="cinii-enh-chip" data-var="{title}">{title} 書名</button>
              <button type="button" class="cinii-enh-chip" data-var="{authors}">{authors} 著者一覧</button>
              <button type="button" class="cinii-enh-chip" data-var="{firstAuthor}">{firstAuthor} 筆頭著者</button>
              <button type="button" class="cinii-enh-chip" data-var="{year}">{year} 出版年</button>
              <button type="button" class="cinii-enh-chip" data-var="{place}">{place} 出版地</button>
              <button type="button" class="cinii-enh-chip" data-var="{publisher}">{publisher} 出版社</button>
              <button type="button" class="cinii-enh-chip" data-var="{isbn}">{isbn} ISBN</button>
              <button type="button" class="cinii-enh-chip" data-var="{url}">{url} URL</button>
            </div>
            <textarea id="setting-template-book" class="cinii-enh-form-textarea" rows="3" placeholder="{authors} ({year})『{title}』{place}: {publisher}. {url}">${escapeHtml(tmplBook)}</textarea>
            <div class="cinii-enh-presets-row">
              <span class="cinii-enh-sublabel">プリセット:</span>
              <button type="button" class="cinii-enh-btn-preset" data-target="book" data-preset="{authors} ({year})『{title}』{place}: {publisher}. {url}">和文書籍（標準）</button>
              <button type="button" class="cinii-enh-btn-preset" data-target="book" data-preset="- 『[{title}]({url})』{place}: {publisher}, {authors} ({year})">Markdown書籍</button>
              <button type="button" class="cinii-enh-btn-preset" data-target="book" data-preset="{authors} ({year}). *{title}*. {place}: {publisher}. {url}">英文書籍調</button>
            </div>
          </div>

          <!-- Pane 3: Dissertation -->
          <div id="pane-dissertation" class="cinii-enh-template-pane">
            <div class="cinii-enh-chips-bar">
              <span class="cinii-enh-chips-title">変数を挿入:</span>
              <button type="button" class="cinii-enh-chip" data-var="{title}">{title} 題目</button>
              <button type="button" class="cinii-enh-chip" data-var="{authors}">{authors} 著者</button>
              <button type="button" class="cinii-enh-chip" data-var="{year}">{year} 授与年</button>
              <button type="button" class="cinii-enh-chip" data-var="{publisher}">{publisher} 授与大学</button>
              <button type="button" class="cinii-enh-chip" data-var="{url}">{url} URL</button>
            </div>
            <textarea id="setting-template-dissertation" class="cinii-enh-form-textarea" rows="3" placeholder="{authors} ({year})『{title}』博士論文, {publisher}. {url}">${escapeHtml(tmplDissertation)}</textarea>
            <div class="cinii-enh-presets-row">
              <span class="cinii-enh-sublabel">プリセット:</span>
              <button type="button" class="cinii-enh-btn-preset" data-target="dissertation" data-preset="{authors} ({year})『{title}』博士論文, {publisher}. {url}">和文学位論文（標準）</button>
              <button type="button" class="cinii-enh-btn-preset" data-target="dissertation" data-preset="{authors} ({year}). *{title}* [Doctoral dissertation, {publisher}]. {url}">英文学位論文調</button>
            </div>
          </div>

          <!-- Live Preview Box -->
          <div class="cinii-enh-preview-box">
            <div class="cinii-enh-preview-title" id="cinii-enh-preview-title">リアルタイムプレビュー（論文）:</div>
            <div id="cinii-enh-template-preview" class="cinii-enh-preview-content"></div>
          </div>
        </div>

        <!-- 3. Feature Toggles -->
        <div class="cinii-enh-form-group">
          <label class="cinii-enh-form-label">機能のオン/オフ</label>
          <div class="cinii-enh-toggle-list">
            <div class="cinii-enh-toggle-row">
              <div class="cinii-enh-toggle-info">
                <span class="cinii-enh-toggle-title">検索結果カードに引用ボタンを表示</span>
                <span class="cinii-enh-toggle-desc">検索結果一覧の文献タイトルの右横に引用ボタンを配置します。</span>
              </div>
              <label class="cinii-enh-toggle-control" for="setting-enable-quick-copy">
                <input type="checkbox" id="setting-enable-quick-copy" ${userSettings.enableSearchQuickCopy ? 'checked' : ''}>
                <span class="cinii-enh-toggle-track"></span>
                <span id="badge-enable-quick-copy" class="cinii-enh-status-badge ${userSettings.enableSearchQuickCopy ? 'cinii-enh-badge-on' : 'cinii-enh-badge-off'}">
                  ${userSettings.enableSearchQuickCopy ? '有効' : '無効'}
                </span>
              </label>
            </div>
            <div class="cinii-enh-toggle-row">
              <div class="cinii-enh-toggle-info">
                <span class="cinii-enh-toggle-title">抄録・検索結果のHTMLタグを自動整形</span>
                <span class="cinii-enh-toggle-desc">抄録や抜粋文に含まれる不要なタグを除去・段落整形します。</span>
              </div>
              <label class="cinii-enh-toggle-control" for="setting-enable-abstract-cleanup">
                <input type="checkbox" id="setting-enable-abstract-cleanup" ${userSettings.enableAbstractCleanup ? 'checked' : ''}>
                <span class="cinii-enh-toggle-track"></span>
                <span id="badge-enable-abstract-cleanup" class="cinii-enh-status-badge ${userSettings.enableAbstractCleanup ? 'cinii-enh-badge-on' : 'cinii-enh-badge-off'}">
                  ${userSettings.enableAbstractCleanup ? '有効' : '無効'}
                </span>
              </label>
            </div>
          </div>
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
    document.body.classList.add('cinii-enh-modal-open');

    const formatSelect = modal.querySelector('#setting-preferred-format');
    const labelInput = modal.querySelector('#setting-custom-label');
    const enableItemTypeCb = modal.querySelector('#setting-enable-itemtype-template');
    const previewEl = modal.querySelector('#cinii-enh-template-preview');
    const previewTitleEl = modal.querySelector('#cinii-enh-preview-title');

    const textareaArticle = modal.querySelector('#setting-template-article');
    const textareaBook = modal.querySelector('#setting-template-book');
    const textareaDissertation = modal.querySelector('#setting-template-dissertation');

    let currentTab = 'article';
    formatSelect.value = userSettings.preferredCitation || 'bibtex';

    const getActiveTextarea = () => {
      if (currentTab === 'book') return textareaBook;
      if (currentTab === 'dissertation') return textareaDissertation;
      return textareaArticle;
    };

    const updatePreview = () => {
      let sample = sampleMetaArticle;
      let tmpl = textareaArticle.value || '';
      let typeLabel = '論文';

      if (currentTab === 'book') {
        sample = sampleMetaBook;
        tmpl = textareaBook.value || '';
        typeLabel = '図書（単行本）';
      } else if (currentTab === 'dissertation') {
        sample = sampleMetaDissertation;
        tmpl = textareaDissertation.value || '';
        typeLabel = '学位論文';
      }

      previewTitleEl.textContent = `リアルタイムプレビュー（${typeLabel}）:`;
      previewEl.textContent = generateCustomCitation(sample, tmpl);
    };
    updatePreview();

    textareaArticle.addEventListener('input', updatePreview);
    textareaBook.addEventListener('input', updatePreview);
    textareaDissertation.addEventListener('input', updatePreview);

    modal.querySelectorAll('.cinii-enh-template-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        currentTab = tab;

        modal.querySelectorAll('.cinii-enh-template-tab-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        modal.querySelectorAll('.cinii-enh-template-pane').forEach((p) => p.classList.remove('is-active'));
        const activePane = modal.querySelector(`#pane-${tab}`);
        if (activePane) activePane.classList.add('is-active');

        updatePreview();
      });
    });

    const setupToggle = (checkboxId, badgeId) => {
      const cb = modal.querySelector('#' + checkboxId);
      const bg = modal.querySelector('#' + badgeId);
      if (!cb || !bg) return;
      cb.addEventListener('change', () => {
        if (cb.checked) {
          bg.textContent = '有効';
          bg.className = 'cinii-enh-status-badge cinii-enh-badge-on';
        } else {
          bg.textContent = '無効';
          bg.className = 'cinii-enh-status-badge cinii-enh-badge-off';
        }
      });
    };
    setupToggle('setting-enable-quick-copy', 'badge-enable-quick-copy');
    setupToggle('setting-enable-abstract-cleanup', 'badge-enable-abstract-cleanup');
    setupToggle('setting-enable-itemtype-template', 'badge-enable-itemtype-template');

    modal.querySelectorAll('.cinii-enh-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-var');
        const targetTa = getActiveTextarea();
        const start = targetTa.selectionStart;
        const end = targetTa.selectionEnd;
        const val = targetTa.value;
        targetTa.value = val.substring(0, start) + v + val.substring(end);
        targetTa.focus();
        targetTa.selectionStart = targetTa.selectionEnd = start + v.length;
        updatePreview();
      });
    });

    modal.querySelectorAll('.cinii-enh-btn-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        const preset = btn.getAttribute('data-preset');
        if (target === 'book') textareaBook.value = preset;
        else if (target === 'dissertation') textareaDissertation.value = preset;
        else textareaArticle.value = preset;
        updatePreview();
      });
    });

    const closeModal = () => {
      overlay.remove();
      document.body.classList.remove('cinii-enh-modal-open');
      document.removeEventListener('keydown', onKeyDown);
    };

    const closeBtn = modal.querySelector('.cinii-enh-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKeyDown);

    const saveBtn = modal.querySelector('#cinii-enh-save-settings-btn');
    saveBtn.addEventListener('click', () => {
      const newSettings = {
        preferredCitation: formatSelect.value,
        customTemplate: textareaArticle.value.trim() || tmplArticle,
        customTemplateArticle: textareaArticle.value.trim() || tmplArticle,
        customTemplateBook: textareaBook.value.trim() || tmplBook,
        customTemplateDissertation: textareaDissertation.value.trim() || tmplDissertation,
        customTemplateLabel: labelInput.value.trim() || 'カスタム',
        enableItemTypeTemplate: enableItemTypeCb.checked,
        enableSearchQuickCopy: modal.querySelector('#setting-enable-quick-copy').checked,
        enableAbstractCleanup: modal.querySelector('#setting-enable-abstract-cleanup').checked
      };

      saveSettings(newSettings, () => {
        showToast('設定を保存しました');
        closeModal();
        updateAllQuickCopyButtons();
      });
    });
  }

  function injectHeaderSettingsButton() {
    if (document.getElementById('cinii-enh-header-settings-btn')) return;

    const utilityList = document.querySelector('.navbar-nav.menu-utility-list, .menu-utility-list');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'cinii-enh-header-settings-btn';
    btn.className = 'cinii-enh-header-settings-btn';
    btn.title = 'CiNii Enhancer 設定';
    btn.innerHTML = `${SVGS.GEAR}<span>設定</span>`;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openSettingsModal();
    });

    if (utilityList) {
      const li = document.createElement('li');
      li.className = 'cinii-enh-header-settings-li';
      li.appendChild(btn);
      utilityList.appendChild(li);
      return;
    }

    const fallbackContainer = document.querySelector('.navbar-topcontent, .headermenu, .navbar-header, #header ul, .navbar-nav, header');
    if (fallbackContainer) {
      if (fallbackContainer.tagName === 'UL') {
        const li = document.createElement('li');
        li.className = 'cinii-enh-header-settings-li';
        li.appendChild(btn);
        fallbackContainer.appendChild(li);
      } else {
        fallbackContainer.appendChild(btn);
      }
    }
  }

  // ==============================================================================
  // 6. Page Enhancements (Detail, Search, Export, Abstracts)
  // ==============================================================================

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

    const titleSelectors = [
      '.item_mainTitle',
      'h1.item-title',
      'h1.title',
      '.itemheading h1',
      '#itemTitle',
      '.detail-title'
    ];

    for (const sel of titleSelectors) {
      const candidates = document.querySelectorAll(sel);
      for (const el of candidates) {
        if (isAuthorOrNonTitle(el)) continue;
        const text = el.textContent.trim().replace(/\s+/g, ' ');
        if (text && cleanMeta && (text.includes(cleanMeta) || cleanMeta.includes(text))) {
          return el;
        }
      }
    }

    for (const sel of titleSelectors) {
      const el = document.querySelector(sel);
      if (el && !isAuthorOrNonTitle(el)) return el;
    }

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

    const titleEl = findDetailTitleElement(meta.title);
    if (!titleEl) return;

    const actionsWrapper = document.createElement('span');
    actionsWrapper.id = 'cinii-enh-detail-title-actions';
    actionsWrapper.className = 'cinii-enh-detail-title-actions';

    // 1. Quick Copy Button
    const quickBtn = createQuickCopyButton(() => meta, 'cinii-enh-btn-sm');
    actionsWrapper.appendChild(quickBtn);

    // 2. Citation Modal Trigger Button
    const citeBtn = document.createElement('button');
    citeBtn.type = 'button';
    citeBtn.className = 'cinii-enh-btn cinii-enh-btn-sm cinii-enh-btn-outline cinii-enh-btn-detail-cite';
    citeBtn.innerHTML = `${SVGS.QUOTE}<span>引用</span>`;
    citeBtn.title = '全引用フォーマット一覧を表示';

    citeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const citations = generateAllCitations(meta);
      openCitationModal(citations, meta.title);
    });

    actionsWrapper.appendChild(citeBtn);
    titleEl.appendChild(actionsWrapper);
  }

  function enhanceExportSection() {
    const exportLinks = document.querySelectorAll('a[href*="/export"], button[data-export], .export_link, .export-btn, [class*="export"] a');

    exportLinks.forEach((el) => {
      if (el.nextElementSibling && el.nextElementSibling.classList.contains('cinii-enh-btn-export-copy')) return;

      const linkText = (el.textContent || '').trim();
      const href = el.getAttribute('href') || '';

      const isCandidate =
        href.includes('/export') ||
        linkText.includes('表示') ||
        linkText.includes('書き出し') ||
        linkText.includes('出力') ||
        /BibTeX|TSV|RIS|RefWorks|EndNote/i.test(linkText);

      if (!isCandidate) return;

      let formatType = 'text';
      if (/bibtex/i.test(linkText) || href.includes('bibtex')) formatType = 'bibtex';
      else if (/tsv/i.test(linkText) || href.includes('tsv')) formatType = 'tsv';
      else if (/ris/i.test(linkText) || href.includes('ris')) formatType = 'ris';
      else if (/refworks/i.test(linkText) || href.includes('refworks')) formatType = 'refworks';
      else if (/endnote/i.test(linkText) || href.includes('endnote')) formatType = 'endnote';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'cinii-enh-btn cinii-enh-btn-export-copy';
      copyBtn.title = `${linkText}のデータを直接クリップボードにコピー`;
      copyBtn.innerHTML = `${SVGS.COPY}<span>コピー</span>`;

      copyBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const originalHtml = copyBtn.innerHTML;
        copyBtn.disabled = true;

        try {
          let copied = false;
          if (href && !href.startsWith('javascript:')) {
            const fetchUrl = href.startsWith('http') ? href : window.location.origin + href;
            const res = await fetch(fetchUrl);
            if (res.ok) {
              const textData = await res.text();
              if (textData && textData.trim()) {
                await copyText(textData, `${linkText}のデータをコピーしました`);
                copied = true;
              }
            }
          }

          if (!copied) {
            const meta = extractDetailMetadata();
            let fallbackData = '';
            if (formatType === 'bibtex') fallbackData = generateBibTeX(meta);
            else if (formatType === 'tsv') fallbackData = generateTSV(meta);
            else if (formatType === 'ris' || formatType === 'endnote' || formatType === 'refworks') fallbackData = generateRIS(meta);
            else fallbackData = generateSIST02(meta);

            if (fallbackData) {
              await copyText(fallbackData, `${linkText}のデータをコピーしました`);
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

      if (el.nextSibling) {
        el.parentNode.insertBefore(copyBtn, el.nextSibling);
      } else {
        el.parentNode.appendChild(copyBtn);
      }
    });
  }

  function enhanceSearchResults() {
    const resultItems = document.querySelectorAll('.listitem, .search-result-item, [class*="listitem"], .result-item, #searchResult li, .searchResultItem');
    if (resultItems.length === 0) return;

    resultItems.forEach((item) => {
      const isCardEnhanced = item.classList.contains('cinii-enh-card-enhanced');
      if (!isCardEnhanced) {
        item.classList.add('cinii-enh-card-enhanced');

        const titleLink = item.querySelector('.item_mainTitle a, .articletitle a, h2 a, h3 a, a[href*="/crid/"]');

        // Insert citation action buttons directly to the right of the title
        if (titleLink && userSettings.enableSearchQuickCopy && isCiteableItem(item, titleLink)) {
          const cardMeta = extractSearchCardMetadata(item, titleLink);
          const titleActions = document.createElement('span');
          titleActions.className = 'cinii-enh-title-actions';

          const quickBtn = createQuickCopyButton(cardMeta, 'cinii-enh-btn-sm');
          titleActions.appendChild(quickBtn);

          const citeBtn = document.createElement('button');
          citeBtn.type = 'button';
          citeBtn.className = 'cinii-enh-btn cinii-enh-btn-sm cinii-enh-btn-cite-title';
          citeBtn.innerHTML = `${SVGS.QUOTE}<span>引用</span>`;
          citeBtn.title = '全引用フォーマット一覧を表示';

          citeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const citations = generateAllCitations(cardMeta);
            openCitationModal(citations, cardMeta.title);
          });

          titleActions.appendChild(citeBtn);

          if (titleLink.parentNode) {
            titleLink.parentNode.insertBefore(titleActions, titleLink.nextSibling);
          }
        }
      }

      // Cleanup HTML/XML tags in search result card (Title, Description, Abstract, Snippets)
      if (userSettings.enableAbstractCleanup) {
        // 1. Title elements
        const titleElements = item.querySelectorAll('.item_mainTitle, .articletitle, h2, h3, a[href*="/crid/"]');
        titleElements.forEach((el) => {
          if (el.dataset.ciniiSnippetCleaned === 'true' || el.closest('.cinii-enh-title-actions')) return;
          const raw = el.innerHTML || '';
          if (hasRawHtmlOrJatsTags(raw)) {
            el.dataset.ciniiSnippetCleaned = 'true';
            const cleaned = cleanSearchSnippetHtml(raw);
            if (cleaned && cleaned !== raw) {
              el.innerHTML = cleaned;
            }
          }
        });

        // 2. Snippet, description, abstract, and note elements
        const snippetSelectors = [
          '.item_description',
          '.description',
          '.item_abstract',
          '.item-abstract',
          '.snippet',
          '.search-result-snippet',
          '.search_snippet',
          '.item_summary',
          '.summary',
          '.item_note',
          '.note',
          'dd',
          'p',
          '.item_body',
          '.lead'
        ];

        const snippetCandidates = item.querySelectorAll(snippetSelectors.join(', '));
        snippetCandidates.forEach((el) => {
          if (el.dataset.ciniiSnippetCleaned === 'true' || el.closest('.cinii-enh-title-actions')) return;
          const raw = el.innerHTML || '';
          if (hasRawHtmlOrJatsTags(raw)) {
            el.dataset.ciniiSnippetCleaned = 'true';
            const cleaned = cleanSearchSnippetHtml(raw);
            if (cleaned && cleaned !== raw) {
              el.innerHTML = cleaned;
            }
          }
        });
      }
    });
  }

  function enhanceSearchExportSection() {
    // 1. Dropdown form pattern (select + execute button)
    const selects = document.querySelectorAll('select');
    selects.forEach((sel) => {
      if (sel.dataset.ciniiEnhExportEnhanced === 'true') return;

      const optionsText = Array.from(sel.options).map((o) => (o.textContent || '').trim()).join(' ');
      const isExportSelect =
        sel.name === 'fileType' ||
        sel.id === 'fileType' ||
        /新しい(?:ウィンドウ|ウインドウ)で開く|操作を選択する|TSVで表示|BibTeXで表示|RISで表示|書き出し|出力/i.test(optionsText);

      if (!isExportSelect) return;
      sel.dataset.ciniiEnhExportEnhanced = 'true';

      const form = sel.form || sel.closest('form');
      let execBtn = null;

      const siblingBtn = sel.parentElement?.querySelector('button, input[type="submit"], input[type="button"], a.btn, .btn');
      if (siblingBtn && siblingBtn !== sel) {
        execBtn = siblingBtn;
      } else if (form) {
        execBtn = form.querySelector('button[type="submit"], input[type="submit"], button.btn, button:not(.cinii-enh-btn)');
      }

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'cinii-enh-btn cinii-enh-btn-export-copy cinii-enh-btn-search-export-copy';
      copyBtn.title = '選択した文献のデータを直接クリップボードにコピー';
      copyBtn.innerHTML = `${SVGS.COPY}<span>コピー</span>`;

      copyBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const checkedBoxes = Array.from(document.querySelectorAll(
          '.listitem input[type="checkbox"]:checked, .search-result-item input[type="checkbox"]:checked, input[name*="art"]:checked, input[name*="id"]:checked, input[name*="item"]:checked, input[name="chk"]:checked, input.checkItem:checked'
        )).filter((cb) => {
          const val = (cb.value || '').toLowerCase();
          const name = (cb.name || '').toLowerCase();
          const id = (cb.id || '').toLowerCase();
          if (!val || val === 'all' || val === 'on' || val === 'checkall') return false;
          if (name.includes('all') || id.includes('all') || cb.classList.contains('checkAll')) return false;
          return true;
        });

        if (checkedBoxes.length === 0) {
          showToast('文献が選択されていません。チェックボックスを選択してください');
          return;
        }

        const selectedOption = sel.options[sel.selectedIndex];
        const optText = (selectedOption ? selectedOption.textContent : '').trim();
        let optValue = (selectedOption ? selectedOption.value : '').toLowerCase();

        if (/操作を選択|新しい(?:ウィンドウ|ウインドウ)で開く|^$/i.test(optText) || !optValue) {
          const bibOpt = Array.from(sel.options).find((o) => /bibtex/i.test(o.textContent) || /bibtex/i.test(o.value));
          const tsvOpt = Array.from(sel.options).find((o) => /tsv/i.test(o.textContent) || /tsv/i.test(o.value));
          const targetOpt = (userSettings.preferredCitation === 'tsv' ? tsvOpt : bibOpt) || bibOpt || tsvOpt || sel.options[1];
          if (targetOpt) {
            sel.value = targetOpt.value;
            optValue = targetOpt.value.toLowerCase();
          } else {
            showToast('書き出し形式（BibTeXやTSVなど）を選択してください');
            return;
          }
        }

        const originalHtml = copyBtn.innerHTML;
        copyBtn.disabled = true;

        try {
          let copied = false;
          let exportFormatName = optText.replace(/で表示|に書き出し|で出力/g, '').trim() || '引用';

          // Background fetch using CiNii export form endpoint
          if (form && form.action) {
            const formData = new FormData(form);
            if (sel.name) formData.set(sel.name, sel.value);

            const method = (form.method || 'POST').toUpperCase();
            let fetchUrl = form.action;
            let fetchOptions = {
              method: method,
              credentials: 'include'
            };

            if (method === 'GET') {
              const urlObj = new URL(fetchUrl, window.location.origin);
              for (const [key, val] of formData.entries()) {
                urlObj.searchParams.append(key, val);
              }
              fetchUrl = urlObj.toString();
            } else {
              fetchOptions.body = formData;
            }

            const res = await fetch(fetchUrl, fetchOptions);
            if (res.ok) {
              const textData = await res.text();
              if (textData && textData.trim() && !textData.includes('<!DOCTYPE html>') && !textData.includes('<html')) {
                await copyText(textData, `${checkedBoxes.length}件の引用をコピーしました（${exportFormatName}）`);
                copied = true;
              }
            }
          }

          // Fallback: extract metadata from checked items directly
          if (!copied) {
            const selectedItems = checkedBoxes.map((cb) => cb.closest('.listitem, .search-result-item')).filter(Boolean);
            const metas = selectedItems.map((item) => {
              const link = item.querySelector('.item_mainTitle a, .articletitle a, h2 a, h3 a, a[href*="/crid/"]');
              return link ? extractSearchCardMetadata(item, link) : null;
            }).filter(Boolean);

            if (metas.length > 0) {
              let bulkData = '';
              const lowerFmt = optText.toLowerCase() + ' ' + optValue;

              if (lowerFmt.includes('bibtex')) {
                bulkData = metas.map((m) => generateBibTeX(m)).join('\n\n');
                exportFormatName = 'BibTeX';
              } else if (lowerFmt.includes('tsv')) {
                const headers = ['タイトル', '著者', '収録刊行物', '巻', '号', 'ページ', '出版年', '出版社', 'DOI', 'URL'];
                const rows = metas.map((m) => [
                  m.title,
                  m.authors.join('; '),
                  m.journal,
                  m.volume,
                  m.issue,
                  m.pages,
                  m.year,
                  m.publisher,
                  m.doi,
                  m.url
                ].map((f) => `"${String(f || '').replace(/"/g, '""')}"`).join('\t'));
                bulkData = headers.join('\t') + '\n' + rows.join('\n');
                exportFormatName = 'TSV';
              } else if (lowerFmt.includes('ris') || lowerFmt.includes('endnote') || lowerFmt.includes('refworks')) {
                bulkData = metas.map((m) => generateRIS(m)).join('\n\n');
                exportFormatName = 'RIS';
              } else {
                bulkData = metas.map((m) => generateSIST02(m)).join('\n');
                exportFormatName = '引用';
              }

              if (bulkData) {
                await copyText(bulkData, `${metas.length}件の引用をコピーしました（${exportFormatName}）`);
                copied = true;
              }
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
          console.error('[CiNii Enhancer] Bulk export copy failed:', err);
          copyBtn.innerHTML = originalHtml;
          copyBtn.disabled = false;
          showToast('コピーに失敗しました');
        }
      });

      const anchorEl = execBtn || sel;
      if (anchorEl.nextSibling) {
        anchorEl.parentNode.insertBefore(copyBtn, anchorEl.nextSibling);
      } else {
        anchorEl.parentNode.appendChild(copyBtn);
      }
    });

    // 2. Individual link pattern (if direct export links exist on search results)
    enhanceExportSection();
  }

  // ==============================================================================
  // 7. HTML Tag Sanitization & Abstract Enhancement
  // ==============================================================================

  function sanitizeNodeTree(node, allowedTags, removeTags, isSnippet = false) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toUpperCase();

      if (removeTags.has(tag)) {
        node.remove();
        return;
      }

      const cls = node.getAttribute('class') || '';
      const isHighlight = isSnippet && (cls.includes('highlight') || cls.includes('keyword') || tag === 'MARK');

      while (node.attributes.length > 0) {
        node.removeAttribute(node.attributes[0].name);
      }

      if (isHighlight) {
        node.setAttribute('class', 'cinii-enh-highlight');
      }

      const children = Array.from(node.childNodes);
      children.forEach((c) => sanitizeNodeTree(c, allowedTags, removeTags, isSnippet));

      if (!allowedTags.has(tag)) {
        while (node.firstChild) {
          node.parentNode.insertBefore(node.firstChild, node);
        }
        node.remove();
      }
    }
  }

  function cleanAbstractHtml(raw) {
    if (!raw) return '';
    let text = raw;

    if (text.includes('&lt;') || text.includes('&amp;lt;')) {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      text = doc.body.textContent || text;
      if (text.includes('&lt;')) {
        const doc2 = new DOMParser().parseFromString(text, 'text/html');
        text = doc2.body.textContent || text;
      }
    }

    text = text
      .replace(/<\/?jats:p[^>]*>/gi, (m) => m.startsWith('</') ? '</p>' : '<p>')
      .replace(/<\/?jats:italic[^>]*>/gi, (m) => m.startsWith('</') ? '</i>' : '<i>')
      .replace(/<\/?jats:bold[^>]*>/gi, (m) => m.startsWith('</') ? '</b>' : '<b>')
      .replace(/<\/?jats:sup[^>]*>/gi, (m) => m.startsWith('</') ? '</sup>' : '<sup>')
      .replace(/<\/?jats:sub[^>]*>/gi, (m) => m.startsWith('</') ? '</sub>' : '<sub>')
      .replace(/<\/?jats:underline[^>]*>/gi, (m) => m.startsWith('</') ? '</u>' : '<u>')
      .replace(/<\/?jats:title[^>]*>/gi, (m) => m.startsWith('</') ? '</strong><br>' : '<strong>')
      .replace(/<\/?jats:[a-zA-Z0-9_-]+[^>]*>/gi, '');

    const parsedDoc = new DOMParser().parseFromString(`<div>${text}</div>`, 'text/html');
    const root = parsedDoc.body.firstElementChild;
    if (!root) return text;

    const allowed = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'SUB', 'SUP', 'U', 'CODE', 'UL', 'OL', 'LI']);
    const remove = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED']);

    Array.from(root.childNodes).forEach((n) => sanitizeNodeTree(n, allowed, remove, false));
    return root.innerHTML.trim();
  }

  function hasRawHtmlOrJatsTags(str) {
    if (!str) return false;
    return (
      str.includes('&lt;') ||
      str.includes('&amp;lt;') ||
      str.includes('&#60;') ||
      str.includes('&#x3c;') ||
      str.includes('<jats:') ||
      str.includes('</jats:') ||
      /<[a-z0-9_-]+:[a-z0-9_-]+/i.test(str) ||
      /(?:&lt;|&amp;lt;|&#60;|&#x3c;)\s*\/?(?:jats:[a-z0-9_-]+|[a-z0-9_-]+:[a-z0-9_-]+|p|br|b|i|em|strong|sub|sup|u|font|span|div|sec|title)\b/i.test(str) ||
      /(?:&lt;|&amp;lt;|&#60;|&#x3c;)\s*\/?[a-z][a-z0-9_-]*(?:\s+[^&>]*)?(?:&gt;|&amp;gt;|&#62;|&#x3e;)/i.test(str)
    );
  }

  function cleanSearchSnippetHtml(raw) {
    if (!raw) return '';
    let text = raw;

    // Full multi-stage entity decoding using DOMParser
    if (text.includes('&lt;') || text.includes('&amp;lt;') || text.includes('&#60;') || text.includes('&#x3c;')) {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      text = doc.body.textContent || text;
      if (text.includes('&lt;') || text.includes('&#60;')) {
        const doc2 = new DOMParser().parseFromString(text, 'text/html');
        text = doc2.body.textContent || text;
      }
    }

    text = text
      .replace(/<\/?(?:jats:italic|italic)[^>]*>/gi, (m) => m.startsWith('</') ? '</i>' : '<i>')
      .replace(/<\/?(?:jats:bold|bold|b|strong)[^>]*>/gi, '')
      .replace(/<\/?(?:jats:sup|sup)[^>]*>/gi, (m) => m.startsWith('</') ? '</sup>' : '<sup>')
      .replace(/<\/?(?:jats:sub|sub)[^>]*>/gi, (m) => m.startsWith('</') ? '</sub>' : '<sub>')
      .replace(/<\/?(?:jats:underline|underline)[^>]*>/gi, (m) => m.startsWith('</') ? '</u>' : '<u>')
      .replace(/<jats:title[^>]*>/gi, '')
      .replace(/<\/jats:title>/gi, ': ')
      .replace(/<\/?(?:jats:p|p)[^>]*>/gi, ' ')
      .replace(/<\/?(?:jats:[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+)[^>]*>/gi, '')
      .replace(/<\/?(?:sec|section|article|div|header|footer|font)[^>]*>/gi, ' ')
      .replace(/<\/?(?:script|style|iframe|object|embed)[^>]*>/gi, '');

    const parsedDoc = new DOMParser().parseFromString(`<span>${text}</span>`, 'text/html');
    const root = parsedDoc.body.firstElementChild;
    if (!root) return text;

    const allowed = new Set(['I', 'EM', 'SUB', 'SUP', 'U', 'MARK', 'SPAN', 'BR']);
    const remove = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED']);

    Array.from(root.childNodes).forEach((n) => sanitizeNodeTree(n, allowed, remove, true));
    return root.innerHTML.replace(/\s{2,}/g, ' ').trim();
  }

  function enhanceAbstracts() {
    if (!userSettings.enableAbstractCleanup) return;

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

    document.querySelectorAll('.dataSection, .detailSection, dl, section').forEach((section) => {
      const titleEl = section.querySelector('.listSectionTitle, dt, h2, h3, .sectionTitle');
      if (!titleEl) return;
      const heading = titleEl.textContent.trim();
      if (/説明|抄録|概要|Abstract|Description/i.test(heading)) {
        const valEl = section.querySelector('dd, .sectionContent, p, .value');
        if (valEl && !elements.includes(valEl)) {
          elements.push(valEl);
        }
      }
    });

    elements.forEach((el) => {
      if (el.dataset.ciniiCleaned === 'true' || el.closest('.cinii-enh-modal')) return;

      const rawContent = el.innerHTML.trim();
      const needsCleanup =
        rawContent.includes('&lt;') ||
        rawContent.includes('<jats:') ||
        /<[a-z0-9_-]+:[a-z0-9_-]+/i.test(rawContent) ||
        (rawContent.includes('&amp;lt;') && rawContent.includes('&amp;gt;'));

      if (!needsCleanup) return;

      el.dataset.ciniiCleaned = 'true';
      const cleaned = cleanAbstractHtml(rawContent);

      const container = document.createElement('div');
      container.className = 'cinii-enh-abstract-container';

      const bar = document.createElement('div');
      bar.className = 'cinii-enh-abstract-bar';

      const statusTag = document.createElement('span');
      statusTag.className = 'cinii-enh-abstract-tag';
      statusTag.innerHTML = `${SVGS.CLEAN}<span>HTMLタグを整形中</span>`;

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'cinii-enh-abstract-toggle-btn';
      toggleBtn.innerHTML = `${SVGS.CODE}<span>原文を表示</span>`;

      bar.appendChild(statusTag);
      bar.appendChild(toggleBtn);

      const contentBox = document.createElement('div');
      contentBox.className = 'cinii-enh-abstract-content';
      contentBox.innerHTML = cleaned;

      let isCleaned = true;
      toggleBtn.addEventListener('click', () => {
        isCleaned = !isCleaned;
        if (isCleaned) {
          contentBox.innerHTML = cleaned;
          statusTag.innerHTML = `${SVGS.CLEAN}<span>HTMLタグを整形中</span>`;
          toggleBtn.innerHTML = `${SVGS.CODE}<span>原文を表示</span>`;
        } else {
          contentBox.textContent = rawContent;
          statusTag.innerHTML = `${SVGS.CODE}<span>原文表示中</span>`;
          toggleBtn.innerHTML = `${SVGS.CLEAN}<span>整形表示に戻す</span>`;
        }
      });

      container.appendChild(bar);
      container.appendChild(contentBox);

      el.innerHTML = '';
      el.appendChild(container);
    });
  }

  // ==============================================================================
  // 8. Lifecycle & Mutation Observer
  // ==============================================================================

  function runEnhancer() {
    injectHeaderSettingsButton();

    if (isDetailPage()) {
      enhanceDetailPage();
      enhanceExportSection();
      enhanceAbstracts();
    }

    if (isSearchPage()) {
      enhanceSearchResults();
      enhanceSearchExportSection();
    }
  }

  async function init() {
    await loadSettings();
    runEnhancer();

    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync' || areaName === 'local') {
          let updated = false;
          for (const [key, change] of Object.entries(changes)) {
            if (userSettings[key] !== change.newValue) {
              userSettings[key] = change.newValue;
              updated = true;
            }
          }
          if (updated) {
            updateAllQuickCopyButtons();
          }
        }
      });
    }

    let debounceTimer = null;
    const observer = new MutationObserver((mutations) => {
      const isInternal = mutations.some((m) => {
        const target = m.target;
        return (
          target &&
          target.nodeType === Node.ELEMENT_NODE &&
          (
            target.closest('.cinii-enh-abstract-container') ||
            target.closest('.cinii-enh-modal-overlay') ||
            target.closest('.cinii-enh-detail-title-actions') ||
            target.closest('.cinii-enh-btn-export-copy') ||
            target.closest('.cinii-enh-header-settings-btn') ||
            target.closest('.cinii-enh-title-actions') ||
            target.closest('.cinii-enh-btn-search-export-copy') ||
            target.closest('[data-cinii-snippet-cleaned="true"]')
          )
        );
      });

      if (isInternal) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        runEnhancer();
      }, 150);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

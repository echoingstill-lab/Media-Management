// ==UserScript==
// @name         媒体管理 - 豆瓣导出 CSV
// @namespace    https://media-management.local/
// @version      0.2.0
// @description  从豆瓣个人书影音页面导出 CSV，用于导入媒体管理。
// @match        *://*.douban.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const BUTTON_ID = 'media-management-douban-export';
  const DELAY_MS = 1500;
  const MAX_PAGES = 120;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getText(el) {
    return (el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function getMediaType(url = location.href) {
    const parsed = new URL(url, location.href);
    const host = parsed.hostname;
    const path = parsed.pathname;

    if (host.includes('movie.douban.com')) return 'movie';
    if (host.includes('book.douban.com')) return 'book';
    if (host.includes('music.douban.com')) return 'music';
    if (path.includes('/games')) return 'game';

    return 'other';
  }

  function getStatus(url = location.href) {
    const parsed = new URL(url, location.href);
    const status = parsed.searchParams.get('status');
    const path = parsed.pathname;

    if (status === 'collect' || path.includes('/collect')) return 'completed';
    if (status === 'do' || path.includes('/do')) return 'progress';
    if (status === 'wish' || path.includes('/wish')) return 'wishlist';

    return status || 'completed';
  }

  function parseRating(item) {
    const ratingEl =
      item.querySelector('[class*="rating"][class*="-t"]') ||
      item.querySelector('.rating');

    if (!ratingEl) return '';

    const cls = ratingEl.className || '';
    const match = cls.match(/rating(\d)-t/);
    if (match) return match[1];

    return '';
  }

  function parseDate(item) {
    const dateEl = item.querySelector('.date') || item.querySelector('.time');
    const text = getText(dateEl);
    const match = text.match(/\d{4}-\d{1,2}-\d{1,2}/);
    return match ? match[0] : text;
  }

  function parseOneItem(item, pageUrl) {
    const linkEl =
      item.querySelector('.title a') ||
      item.querySelector('h2 a') ||
      item.querySelector('.info a') ||
      item.querySelector('a[href*="/subject/"]');

    const title =
      getText(linkEl) ||
      getText(item.querySelector('.title')) ||
      getText(item.querySelector('h2'));

    const link = linkEl ? new URL(linkEl.href, pageUrl).href : '';
    const imgEl = item.querySelector('img');
    const cover = imgEl?.getAttribute('data-original') || imgEl?.src || '';

    const intro =
      getText(item.querySelector('.intro')) ||
      getText(item.querySelector('.pub')) ||
      getText(item.querySelector('.abstract'));

    const comment =
      getText(item.querySelector('.comment')) ||
      getText(item.querySelector('.short-note')) ||
      getText(item.querySelector('.tags'));

    return {
      title,
      type: getMediaType(pageUrl),
      status: getStatus(pageUrl),
      rating: parseRating(item),
      markedDate: parseDate(item),
      intro,
      comment,
      link,
      cover,
      sourcePage: pageUrl,
    };
  }

  function parsePage(html, pageUrl) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const items = Array.from(doc.querySelectorAll('.item, .subject-item, .doulist-item'));

    const rows = items
      .map(item => parseOneItem(item, pageUrl))
      .filter(row => row.title || row.link);

    const next =
      doc.querySelector('.paginator .next a') ||
      doc.querySelector('span.next a');

    const nextUrl = next ? new URL(next.getAttribute('href'), pageUrl).href : '';

    return { rows, nextUrl };
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  function toCsv(rows) {
    const headers = [
      'title',
      'type',
      'status',
      'rating',
      'markedDate',
      'intro',
      'comment',
      'link',
      'cover',
      'sourcePage',
    ];

    return '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => headers.map(key => csvEscape(row[key])).join(',')),
    ].join('\n');
  }

  function downloadCsv(rows) {
    const mediaType = getMediaType();
    const status = getStatus() || 'list';
    const date = new Date().toISOString().slice(0, 10);
    const filename = `douban-${mediaType}-${status}-${date}.csv`;

    const blob = new Blob([toCsv(rows)], {
      type: 'text/csv;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportAllPages(button) {
    const originalText = button.textContent;
    button.disabled = true;

    const allRows = [];
    let nextUrl = location.href;
    let page = 1;

    try {
      while (nextUrl && page <= MAX_PAGES) {
        button.textContent = `正在导出第 ${page} 页...`;

        const currentUrl = nextUrl;
        const html = page === 1
          ? document.documentElement.outerHTML
          : await fetch(currentUrl, { credentials: 'include' }).then(res => {
              if (!res.ok) throw new Error(`请求失败：${res.status}`);
              return res.text();
            });

        const result = parsePage(html, currentUrl);
        allRows.push(...result.rows);

        if (!result.nextUrl || result.nextUrl === nextUrl) break;

        nextUrl = result.nextUrl;
        page += 1;
        await sleep(DELAY_MS);
      }

      if (!allRows.length) {
        alert('没有识别到可导出的条目。请确认当前页面是豆瓣个人列表页。');
        return;
      }

      downloadCsv(allRows);
      alert(`导出完成，共 ${allRows.length} 条。`);
    } catch (error) {
      console.error(error);
      alert(`导出失败：${error.message || error}`);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function addButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.textContent = '导出 CSV';
    button.style.position = 'fixed';
    button.style.right = '24px';
    button.style.bottom = '24px';
    button.style.zIndex = '999999';
    button.style.padding = '10px 14px';
    button.style.border = '1px solid #DDDAC4';
    button.style.background = '#111214';
    button.style.color = '#DDDAC4';
    button.style.fontSize = '13px';
    button.style.fontWeight = '700';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 8px 24px rgba(0,0,0,.25)';
    button.addEventListener('click', () => exportAllPages(button));
    document.body.appendChild(button);
  }

  addButton();
})();

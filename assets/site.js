(() => {
  const body = document.body;
  const root = body.dataset.root || '';
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  };

  /* ── 夜读 ── */
  const themeBtn = document.getElementById('nightToggle');
  const applyTheme = (night) => {
    document.documentElement.classList.toggle('night', night);
    if (themeBtn) themeBtn.textContent = night ? '纸上' : '夜读';
    store.set('night', night);
  };
  applyTheme(store.get('night', window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches));
  if (themeBtn) themeBtn.addEventListener('click', () => applyTheme(!document.documentElement.classList.contains('night')));

  /* ── 目录抽屉 ── */
  const rail = document.getElementById('rail');
  const scrim = document.getElementById('railScrim');
  const railBtn = document.getElementById('railToggle');
  const toggleRail = (open) => {
    if (!rail) return;
    if (window.matchMedia('(max-width: 1080px)').matches) {
      rail.classList.toggle('is-open', open);
      if (scrim) scrim.classList.toggle('is-open', open);
      store.set('railOff', false);
    } else {
      body.classList.toggle('rail-off', !open);
      store.set('railOff', !open);
    }
  };
  if (rail) {
    if (window.matchMedia('(min-width: 1081px)').matches && store.get('railOff', false)) body.classList.add('rail-off');
    railBtn.addEventListener('click', () => {
      const closed = window.matchMedia('(max-width: 1080px)').matches
        ? !rail.classList.contains('is-open')
        : body.classList.contains('rail-off');
      toggleRail(closed);
    });
  }
  if (scrim) scrim.addEventListener('click', () => toggleRail(false));

  /* ── 阅读进度 ── */
  const bar = document.getElementById('progressBar');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    if (bar) bar.style.width = pct + '%';
    return pct;
  };

  const pageId = body.dataset.noteId || '';
  const readMap = store.get('read', {});
  const readState = document.getElementById('readState');

  if (pageId) {
    const saved = readMap[pageId];
    if (saved && saved > 3 && readState) readState.textContent = `上次读到 ${Math.round(saved)}%`;
    let current = saved || 0;
    let lastSave = 0;
    const tick = () => {
      const pct = onScroll();
      if (pct > current) current = pct;
      const now = Date.now();
      if (now - lastSave > 1200) {
        lastSave = now;
        readMap[pageId] = Math.round(current);
        store.set('read', readMap);
      }
      if (current >= 88 && readState && !readState.dataset.done) {
        readState.dataset.done = '1';
        readState.textContent = '已读';
      }
    };
    window.addEventListener('scroll', tick, { passive: true });
    tick();
  } else {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    document.querySelectorAll('.note-row[data-note]').forEach((row) => {
      if (readMap[row.dataset.note]) row.setAttribute('data-read', 'true');
    });
    document.querySelectorAll('.rail-note[data-note]').forEach((row) => {
      if (readMap[row.dataset.note]) row.setAttribute('data-read', 'true');
    });
  }

  /* ── 页边目录滚动跟随 ── */
  const links = [...document.querySelectorAll('.margin__link')];
  if (links.length) {
    const targets = links
      .map((link) => ({ link, el: document.getElementById(link.getAttribute('href').slice(1)) }))
      .filter((item) => item.el);
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          links.forEach((l) => l.classList.toggle('is-current', l.getAttribute('href') === '#' + id));
        });
      },
      { rootMargin: '-90px 0px -70% 0px', threshold: 0 }
    );
    targets.forEach((item) => spy.observe(item.el));
  }

  /* ── 检索 ── */
  const finder = document.getElementById('finder');
  const input = document.getElementById('finderInput');
  const resultsBox = document.getElementById('finderResults');
  const countBox = document.getElementById('finderCount');
  const openBtn = document.getElementById('searchOpen');
  const closeBtn = document.getElementById('finderClose');
  let entries = null;
  let loading = null;
  let selected = 0;
  let currentResults = [];

  const loadIndex = () => {
    if (entries) return Promise.resolve(entries);
    if (loading) return loading;
    const keys = ['math', 'major'];
    loading = Promise.all(
      keys.map(
        (key) =>
          new Promise((resolve) => {
            if (window.__SEARCH && window.__SEARCH[key]) return resolve();
            const script = document.createElement('script');
            script.src = `${root}assets/search/${key}.js`;
            script.onload = resolve;
            script.onerror = resolve;
            document.head.appendChild(script);
          })
      )
    ).then(() => {
      const data = window.__SEARCH || {};
      entries = [...(data.math || []), ...(data.major || [])];
      return entries;
    });
    return loading;
  };

  const openFinder = async () => {
    if (!finder) return;
    finder.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    input.value = '';
    resultsBox.innerHTML = '<div class="finder__empty">正在载入索引…</div>';
    input.focus();
    await loadIndex();
    resultsBox.innerHTML = '<div class="finder__empty">输入关键词，例如 洛必达、PV 操作、页表</div>';
    if (input.value) runSearch(input.value);
  };

  const closeFinder = () => {
    if (!finder) return;
    finder.hidden = true;
    document.documentElement.style.overflow = '';
    if (openBtn) openBtn.focus();
  };

  const snippet = (text, term) => {
    const idx = text.toLowerCase().indexOf(term);
    if (idx === -1) return '';
    const from = Math.max(0, idx - 42);
    const to = Math.min(text.length, idx + term.length + 78);
    const raw = (from > 0 ? '…' : '') + text.slice(from, to) + (to < text.length ? '…' : '');
    return raw.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
      .replace(new RegExp(escapeRe(term), 'gi'), (m) => `<mark>${m}</mark>`);
  };
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const runSearch = (querystring) => {
    const terms = querystring.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) {
      resultsBox.innerHTML = '<div class="finder__empty">输入关键词，例如 洛必达、PV 操作、页表</div>';
      countBox.textContent = '';
      return;
    }
    const scored = [];
    for (const entry of entries) {
      const title = entry.t.toLowerCase();
      const text = entry.x.toLowerCase();
      let ok = true;
      let score = 0;
      for (const term of terms) {
        const inTitle = title.includes(term);
        const inText = text.includes(term);
        if (!inTitle && !inText) { ok = false; break; }
        score += inTitle ? 18 : 0;
        score += inText ? 1 : 0;
      }
      if (!ok) continue;
      if (title.includes(terms[0])) score += 30;
      scored.push({ entry, score });
    }
    scored.sort((a, b) => b.score - a.score);
    currentResults = scored.slice(0, 24);
    selected = 0;
    countBox.textContent = `命中 ${scored.length} 篇`;
    if (!currentResults.length) {
      resultsBox.innerHTML = `<div class="finder__empty">没有找到「${escapeRe(querystring)}」</div>`;
      return;
    }
    resultsBox.innerHTML = currentResults
      .map(
        ({ entry }, i) => `<a class="result${i === 0 ? ' is-selected' : ''}" href="${root}${entry.u}" data-i="${i}">
        <div class="result__head"><span class="result__title">${escapeRe ? entry.t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])) : entry.t}</span><span class="result__cat">${entry.s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span></div>
        <div class="result__snippet">${snippet(entry.x, terms[0])}</div>
      </a>`
      )
      .join('');
  };

  let timer = null;
  if (input) {
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => runSearch(input.value), 110);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const items = [...resultsBox.querySelectorAll('.result')];
        if (!items.length) return;
        selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((el, i) => el.classList.toggle('is-selected', i === selected));
        items[selected].scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const target = resultsBox.querySelectorAll('.result')[selected];
        if (target) window.location.href = target.getAttribute('href');
      }
    });
  }
  if (openBtn) openBtn.addEventListener('click', openFinder);
  if (closeBtn) closeBtn.addEventListener('click', closeFinder);
  if (finder) finder.addEventListener('click', (event) => { if (event.target === finder) closeFinder(); });

  document.addEventListener('keydown', (event) => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '');
    if (event.key === 'Escape' && finder && !finder.hidden) { closeFinder(); return; }
    if ((event.key === '/' && !typing) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
      event.preventDefault();
      openFinder();
    }
  });

  window.addEventListener('pagehide', () => {
    if (pageId) store.set('read', readMap);
  });
})();

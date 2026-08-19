(() => {
  'use strict';

  // ---------- DOM ----------
  const dateEl = document.getElementById('date');
  const clockEl = document.getElementById('clock');
  const searchInput = document.getElementById('searchInput');
  const groupsEl = document.getElementById('groups');
  const addBtn = document.getElementById('addBtn');
  const editToggle = document.getElementById('editToggle');

  const overlay = document.getElementById('overlay');
  const modalTitle = document.getElementById('modalTitle');
  const closeModalBtn = document.getElementById('closeModal');
  const form = document.getElementById('shortcutForm');
  const nameInput = document.getElementById('nameInput');
  const urlInput = document.getElementById('urlInput');
  const groupInput = document.getElementById('groupInput');
  const iconPreview = document.getElementById('iconPreview');
  const chooseImageBtn = document.getElementById('chooseImageBtn');
  const useAutoBtn = document.getElementById('useAutoBtn');
  const imageInput = document.getElementById('imageInput');
  const submitBtn = document.getElementById('submitBtn');

  let shortcuts = [];
  let editingId = null;
  let tempIconData = null;
  let iconMode = 'auto'; // 'auto' | 'custom'

  // ---------- Clock / date ----------
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${h}:${m}`;
  }

  function updateDate() {
    const now = new Date();
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
    const month = now.toLocaleDateString('en-US', { month: 'short' });
    dateEl.textContent = `${weekday} ${month} ${now.getDate()}, ${now.getFullYear()}`.toUpperCase();
  }

  updateClock();
  updateDate();
  setInterval(updateClock, 1000);
  setInterval(updateDate, 60000);

  // ---------- Storage ----------
  const STORAGE_VERSION = 3;

  const DEFAULT_SHORTCUTS = [
    { name: 'Hiraeth', url: 'https://hiraeth-dev.github.io', group: 'work' },
    { name: 'Proton', url: 'https://mail.proton.me', group: 'work' },
    { name: 'Drive', url: 'https://drive.google.com', group: 'work' },
    { name: 'Gmail', url: 'https://mail.google.com', group: 'work' },
    { name: 'Gemini', url: 'https://gemini.google.com', group: 'work' },
    { name: 'ChatGPT', url: 'https://chatgpt.com', group: 'work' },
    { name: 'Syncthing', url: 'http://127.0.0.1:8384/', group: 'work' },
    { name: 'Keybr', url: 'https://keybr.com', group: 'play' },
    { name: 'Kick', url: 'https://kick.com/gmhikaru', group: 'play' },
    { name: 'Anime', url: 'https://everythingmoe.com', group: 'play' },
    { name: 'FMHY', url: 'https://fmhy.net/video#anime-streaming', group: 'play' },
    { name: 'YouShows', url: 'https://youshows.org/', group: 'play' },
  ];

  const DEFAULT_URLS = new Set(DEFAULT_SHORTCUTS.map((s) => s.url));

  function loadShortcuts() {
    return new Promise((resolve) => {
      const applyDefaults = () => {
        const defaults = DEFAULT_SHORTCUTS.map((s) => ({ ...s, icon: null, id: cryptoId() }));
        saveShortcuts(defaults);
        return defaults;
      };

      const mergeDefaults = (list, removed) => {
        const existingUrls = new Set(list.map((s) => s.url));
        const existingNames = new Set(list.map((s) => s.name.toLowerCase()));
        const missing = DEFAULT_SHORTCUTS
          .filter((s) => !existingUrls.has(s.url)
            && !existingNames.has(s.name.toLowerCase())
            && !removed.includes(s.url))
          .map((s) => ({ ...s, icon: null, id: cryptoId() }));
        if (missing.length) {
          const merged = [...list, ...missing];
          saveShortcuts(merged);
          return merged;
        }
        return list;
      };

      if (chrome?.storage?.local) {
        chrome.storage.local.get(['shortcuts', 'seedVersion', 'removedDefaults'], (res) => {
          if (res.seedVersion !== STORAGE_VERSION || !res.shortcuts?.length) {
            resolve(applyDefaults());
          } else {
            resolve(mergeDefaults(res.shortcuts, res.removedDefaults || []));
          }
        });
      } else {
        const list = JSON.parse(localStorage.getItem('shortcuts') || '[]');
        const version = Number(localStorage.getItem('seedVersion') || '0');
        const removed = JSON.parse(localStorage.getItem('removedDefaults') || '[]');
        if (version !== STORAGE_VERSION || !list.length) {
          resolve(applyDefaults());
        } else {
          resolve(mergeDefaults(list, removed));
        }
      }
    });
  }

  function saveShortcuts(data) {
    return new Promise((resolve) => {
      if (chrome?.storage?.local) {
        chrome.storage.local.set({ shortcuts: data, seedVersion: STORAGE_VERSION }, resolve);
      } else {
        localStorage.setItem('shortcuts', JSON.stringify(data));
        localStorage.setItem('seedVersion', String(STORAGE_VERSION));
        resolve();
      }
    });
  }

  // ---------- Favicon ----------
  function faviconUrl(pageUrl) {
    try {
      const url = new URL(chrome.runtime.getURL('/_favicon/'));
      url.searchParams.set('pageUrl', pageUrl);
      url.searchParams.set('size', '64');
      return url.toString();
    } catch (e) {
      try {
        const u = new URL(pageUrl);
        return 'https://www.google.com/s2/favicons?domain=' + u.hostname + '&sz=64';
      } catch (e2) {
        return '';
      }
    }
  }

  function initialColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 42%, 32%)`;
  }

  function makeInitialAvatar(name) {
    const span = document.createElement('span');
    span.className = 'initial-avatar';
    span.textContent = (name.trim()[0] || '?').toUpperCase();
    span.style.background = initialColor(name || '?');
    return span;
  }

  // ---------- Rendering ----------
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function renderShortcut(s) {
    const el = document.createElement('div');
    el.className = 'shortcut';
    el.tabIndex = 0;

    const img = document.createElement('img');
    img.alt = '';
    img.src = s.icon || faviconUrl(s.url);
    img.addEventListener('error', () => img.replaceWith(makeInitialAvatar(s.name)), { once: true });
    el.appendChild(img);

    const label = document.createElement('span');
    label.textContent = s.name;
    el.appendChild(label);

    const del = document.createElement('span');
    del.className = 'delete-badge';
    del.textContent = '×';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      removeShortcut(s.id);
    });
    el.appendChild(del);

    el.addEventListener('click', () => {
      if (document.body.classList.contains('edit-mode')) {
        openModal('edit', s.id);
      } else {
        window.location.href = s.url;
      }
    });

    return el;
  }

  function render() {
    groupsEl.innerHTML = '';
    if (!shortcuts.length) return;

    const groups = new Map();
    shortcuts.forEach((s) => {
      const g = s.group || 'Main';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(s);
    });

    groups.forEach((items, groupName) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'group';

      const labelRow = document.createElement('div');
      labelRow.className = 'group-label-row';
      labelRow.innerHTML = `
        <span class="line"></span>
        <span class="group-label">${escapeHtml(groupName.toUpperCase())}</span>
        <span class="line"></span>
      `;
      groupEl.appendChild(labelRow);

      const row = document.createElement('div');
      row.className = 'shortcut-row';
      items.forEach((s) => row.appendChild(renderShortcut(s)));
      groupEl.appendChild(row);

      groupsEl.appendChild(groupEl);
    });
  }

  function removeShortcut(id) {
    const removed = shortcuts.find((s) => s.id === id);
    shortcuts = shortcuts.filter((s) => s.id !== id);

    if (removed && DEFAULT_URLS.has(removed.url)) {
      getRemovedDefaults().then((list) => {
        if (!list.includes(removed.url)) list.push(removed.url);
        setRemovedDefaults(list).then(() => saveShortcuts(shortcuts).then(render));
      });
    } else {
      saveShortcuts(shortcuts).then(render);
    }
  }

  function getRemovedDefaults() {
    return new Promise((resolve) => {
      if (chrome?.storage?.local) {
        chrome.storage.local.get('removedDefaults', (res) => resolve(res.removedDefaults || []));
      } else {
        resolve(JSON.parse(localStorage.getItem('removedDefaults') || '[]'));
      }
    });
  }

  function setRemovedDefaults(list) {
    return new Promise((resolve) => {
      if (chrome?.storage?.local) {
        chrome.storage.local.set({ removedDefaults: list }, resolve);
      } else {
        localStorage.setItem('removedDefaults', JSON.stringify(list));
        resolve();
      }
    });
  }

  // ---------- Modal ----------
  function setIconPreview(dataUrl) {
    iconPreview.innerHTML = dataUrl ? `<img src="${dataUrl}" alt="">` : '<span>+</span>';
  }

  function populateGroupSelect(selected) {
    const existing = Array.from(new Set(shortcuts.map((s) => s.group || 'Main')));
    if (!existing.includes('Main')) existing.unshift('Main');

    groupInput.innerHTML = '';
    existing.forEach((g) => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      groupInput.appendChild(opt);
    });

    const newOpt = document.createElement('option');
    newOpt.value = '__new__';
    newOpt.textContent = '+ New group…';
    groupInput.appendChild(newOpt);

    groupInput.value = existing.includes(selected) ? selected : 'Main';
  }

  function openModal(mode, id = null) {
    editingId = mode === 'edit' ? id : null;
    const shortcut = editingId ? shortcuts.find((s) => s.id === editingId) : null;

    modalTitle.textContent = mode === 'edit' ? 'Edit shortcut' : 'Add shortcut';
    submitBtn.textContent = mode === 'edit' ? 'Save changes' : 'Add shortcut';

    nameInput.value = shortcut ? shortcut.name : '';
    urlInput.value = shortcut ? shortcut.url : '';
    populateGroupSelect(shortcut ? shortcut.group : 'Main');

    if (shortcut && shortcut.icon) {
      tempIconData = shortcut.icon;
      iconMode = 'custom';
      setIconPreview(shortcut.icon);
      useAutoBtn.disabled = false;
    } else {
      tempIconData = null;
      iconMode = 'auto';
      setIconPreview(null);
      useAutoBtn.disabled = true;
    }

    overlay.classList.add('open');
    setTimeout(() => nameInput.focus(), 50);
  }

  function closeModal() {
    overlay.classList.remove('open');
    form.reset();
    editingId = null;
    tempIconData = null;
    iconMode = 'auto';
    setIconPreview(null);
    useAutoBtn.disabled = true;
  }

  addBtn.addEventListener('click', () => openModal('add'));
  closeModalBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });

  editToggle.addEventListener('click', () => {
    document.body.classList.toggle('edit-mode');
    editToggle.classList.toggle('active');
  });

  chooseImageBtn.addEventListener('click', () => imageInput.click());

  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      tempIconData = e.target.result;
      iconMode = 'custom';
      setIconPreview(tempIconData);
      useAutoBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  });

  useAutoBtn.addEventListener('click', () => {
    if (useAutoBtn.disabled) return;
    tempIconData = null;
    iconMode = 'auto';
    setIconPreview(null);
    useAutoBtn.disabled = true;
  });

  groupInput.addEventListener('change', () => {
    if (groupInput.value === '__new__') {
      const name = window.prompt('New group name:');
      if (name && name.trim()) {
        const opt = document.createElement('option');
        opt.value = name.trim();
        opt.textContent = name.trim();
        groupInput.insertBefore(opt, groupInput.lastElementChild);
        groupInput.value = name.trim();
      } else {
        groupInput.value = 'Main';
      }
    }
  });

  function cryptoId() {
    return window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    if (!name || !url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    const group = groupInput.value === '__new__' ? 'Main' : groupInput.value;
    const icon = iconMode === 'custom' ? tempIconData : null;

    if (editingId) {
      const idx = shortcuts.findIndex((s) => s.id === editingId);
      if (idx > -1) shortcuts[idx] = { ...shortcuts[idx], name, url, group, icon };
    } else {
      shortcuts.push({ id: cryptoId(), name, url, group, icon });
    }

    await saveShortcuts(shortcuts);
    closeModal();
    render();
  });

  // ---------- Search ----------
  const BANGS = {
    '/rr': { home: 'https://www.reddit.com/', search: 'https://www.reddit.com/search/?q=' },
    '/yt': { home: 'https://www.youtube.com/', search: 'https://www.youtube.com/results?search_query=' },
    '/ss': { home: 'https://www.startpage.com/', search: 'https://www.startpage.com/sp/search?query=' },
    '/dd': { home: 'https://duckduckgo.com/', search: 'https://duckduckgo.com/?q=' },
  };

  function bangMatch(q) {
    const lower = q.toLowerCase();
    for (const bang of Object.keys(BANGS)) {
      if (lower === bang || lower.startsWith(bang + ' ')) return bang;
    }
    return null;
  }

  function handleBang(q) {
    const bang = bangMatch(q);
    if (!bang) return false;
    const query = q.slice(bang.length).trim();
    const target = query ? BANGS[bang].search + encodeURIComponent(query) : BANGS[bang].home;
    window.location.href = target;
    return true;
  }

  function looksLikeUrl(value) {
    return /^https?:\/\//i.test(value) || /^[\w-]+(\.[\w-]{2,})+(\/\S*)?$/.test(value);
  }

  function handleSearch(value) {
    const q = value.trim();
    if (!q) return;

    if (handleBang(q)) return;

    if (looksLikeUrl(q)) {
      window.location.href = /^https?:\/\//i.test(q) ? q : 'https://' + q;
      return;
    }

    if (chrome?.search?.query) {
      chrome.search.query({ text: q, disposition: 'CURRENT_TAB' });
    } else {
      window.location.href = 'https://www.google.com/search?q=' + encodeURIComponent(q);
    }
  }

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch(searchInput.value);
  });

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    const bang = bangMatch(q);
    searchInput.classList.toggle('bang-valid', !!bang);
    searchInput.classList.toggle('bang-invalid', q.startsWith('/') && !bang);
  });

  // Typing anywhere jumps focus to search (like most launcher-style new tabs)
  document.addEventListener('keydown', (e) => {
    if (overlay.classList.contains('open')) return;
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    searchInput.focus();
  });

  // ---------- Init ----------
  loadShortcuts().then((data) => {
    shortcuts = data;
    render();
  });
})();

(() => {
  const esc = v => String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const imageExt = /\.(jpe?g|png|gif|webp|avif)$/i;
  const apiTree = 'https://api.github.com/repos/ELIASADAMS/parazit-web/git/trees/main?recursive=1';
  const raw = path => path.split('/').map(encodeURIComponent).join('/');

  function yearFrom(name) {
    const full = name.match(/20\d{2}/)?.[0];
    if (full) return Number(full);
    const yy = name.match(/(?:^|\D)(\d{2})[./_-](?:\d{2})(?:\D|$)/)?.[1];
    return yy ? 2000 + Number(yy) : null;
  }

  function labelFromFolder(folder) {
    return folder.replace(/^\d+[._-]?\s*/, '').replace(/\s+/g, ' ').trim() || folder;
  }

  function markdown(md) {
    let html = esc(md).replace(/^### (.+)$/gm, '<h4>$1</h4>').replace(/^## (.+)$/gm, '<h3>$1</h3>').replace(/^# (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/gs, m => `<ul>${m}</ul>`);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return html.split(/\n{2,}/).map(block => /^<h|^<ul|^<blockquote/.test(block.trim()) ? block : `<p>${block.replace(/\n/g,'<br>')}</p>`).join('');
  }

  function ensureDialog() {
    let dialog = document.getElementById('materialDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'materialDialog';
    dialog.className = 'record-dialog material-dialog';
    dialog.innerHTML = '<button class="dialog-close" type="button" aria-label="Close">×</button><div id="materialDialogBody"></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('.dialog-close').onclick = () => dialog.close();
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    return dialog;
  }

  async function openText(item) {
    const dialog = ensureDialog();
    const body = document.getElementById('materialDialogBody');
    body.innerHTML = `<div class="eyebrow">TEXT MATERIAL</div><h2>${esc(item.title)}</h2><p class="materials-meta">${esc(item.category || '')}</p><div class="material-reading">LOADING…</div>`;
    dialog.showModal();
    try {
      const md = await fetch(raw(item.path), {cache:'no-store'}).then(r => { if (!r.ok) throw new Error('load'); return r.text(); });
      body.querySelector('.material-reading').innerHTML = markdown(md);
    } catch (_) { body.querySelector('.material-reading').textContent = 'TEXT COULD NOT BE LOADED.'; }
  }

  function openCollection(collection) {
    const dialog = ensureDialog();
    const body = document.getElementById('materialDialogBody');
    body.innerHTML = `<div class="eyebrow">IMAGE COLLECTION / ${esc(collection.year || 'UNDATED')}</div><h2>${esc(collection.title)}</h2><p class="materials-meta">${collection.images.length} IMAGE${collection.images.length === 1 ? '' : 'S'} / ${esc(collection.folder)}</p><div class="collection-grid">${collection.images.map((path,i) => `<figure><img src="${raw(path)}" alt="${esc(collection.title)} / ${String(i+1).padStart(3,'0')}" loading="lazy"><figcaption>${String(i+1).padStart(3,'0')}</figcaption></figure>`).join('')}</div>`;
    dialog.showModal();
  }

  async function scanImageCollections() {
    const data = await fetch(apiTree, {cache:'no-store'}).then(r => { if (!r.ok) throw new Error('GitHub tree unavailable'); return r.json(); });
    const groups = new Map();
    (data.tree || []).forEach(entry => {
      if (entry.type !== 'blob' || !entry.path.startsWith('images/')) return;
      const rest = entry.path.slice(7);
      const parts = rest.split('/');
      if (parts.length < 2 || !imageExt.test(parts.at(-1))) return;
      const folder = parts[0];
      if (!groups.has(folder)) groups.set(folder, []);
      groups.get(folder).push(entry.path);
    });
    return [...groups.entries()].map(([folder, images]) => ({folder, title:labelFromFolder(folder), year:yearFrom(folder), images:images.sort()})).sort((a,b) => (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title));
  }

  async function init() {
    const data = await fetch('materials.json', {cache:'no-store'}).then(r => r.json());
    const textRoot = document.getElementById('texts');
    const imageRoot = document.getElementById('images');
    const textItems = data.textMaterials || [];
    document.getElementById('textCount').textContent = String(textItems.length).padStart(2,'0');
    textRoot.innerHTML = textItems.map((x,i) => `<article class="material-card"><span class="eyebrow">TEXT / ${String(i+1).padStart(2,'0')}</span><h3>${esc(x.title)}</h3><p>${esc(x.category)}</p><button class="system-action material-open-text" type="button" data-text-index="${i}">OPEN ON SITE →</button></article>`).join('');
    textRoot.querySelectorAll('.material-open-text').forEach(button => button.addEventListener('click', () => openText(textItems[Number(button.dataset.textIndex)])));

    document.getElementById('updated').textContent = 'UPDATED ' + data.updated;
    imageRoot.innerHTML = '<div class="archive-empty">SCANNING IMAGE DIRECTORIES…</div>';
    try {
      const collections = await scanImageCollections();
      const big = collections.filter(x => /big archive/i.test(x.folder));
      const regular = collections.filter(x => !/big archive/i.test(x.folder));
      document.getElementById('imageCount').textContent = String(regular.length).padStart(2,'0') + ' / FOLDERS';
      imageRoot.innerHTML = regular.map((x,i) => `<article class="material-card"><img class="material-image" src="${raw(x.images[0])}" alt="${esc(x.title)}" loading="lazy"><span class="eyebrow">COLLECTION / ${String(i+1).padStart(2,'0')} / ${esc(x.year || 'UNDATED')}</span><h3>${esc(x.title)}</h3><p>${x.images.length} images · detected directly from the repository structure.</p><button class="system-action material-open-collection" type="button" data-folder="${esc(x.folder)}">OPEN COLLECTION →</button></article>`).join('');
      if (big.length) imageRoot.insertAdjacentHTML('beforeend', `<article class="material-card"><span class="eyebrow">ARCHIVE / EXCLUDED FROM FOLDER COUNT</span><h3>BIG ARCHIVE</h3><p>${big[0].images.length} images · preserved as a separate catch-all collection.</p><button class="system-action material-open-collection" type="button" data-folder="${esc(big[0].folder)}">OPEN BIG ARCHIVE →</button></article>`);
      imageRoot.querySelectorAll('.material-open-collection').forEach(button => button.addEventListener('click', () => { const c = collections.find(x => x.folder === button.dataset.folder); if (c) openCollection(c); }));
    } catch (error) {
      imageRoot.innerHTML = '<div class="archive-empty">AUTO-DETECTOR ERROR / FALLING BACK TO MATERIAL REGISTRY</div>';
      console.error(error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

(() => {
  const esc = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const gh = path => `https://github.com/ELIASADAMS/parazit-web/blob/main/${path.split('/').map(encodeURIComponent).join('/')}`;
  const key = material => material.path || material.folder || material.title;

  async function loadRelations() {
    return fetch('material-relations.json', {cache:'no-store'}).then(r => r.json());
  }

  function recordName(type, id) {
    const collections = {artist:'artists', exhibition:'exhibitions', artwork:'artworks', document:'documents', venue:'venues', snapshot:'snapshots'};
    const records = window.state?.[collections[type]] || [];
    const record = records.find(x => x.id === id);
    return record?.name || record?.title || id;
  }

  function relationsFor(type, id, relations) {
    return relations.relations.filter(item => item.records.some(ref => ref.type === type && ref.id === id));
  }

  function materialBlock(item) {
    const material = item.material;
    const linkTarget = material.path || material.folder;
    const count = material.imageCount ? ` / ${material.imageCount} IMAGES` : '';
    return `<div class="material-relation-row"><span class="eyebrow">${esc(material.kind)}${esc(count)}</span><strong>${esc(material.title)}</strong><small>${esc(item.note || '')}</small><a class="external-link" href="${gh(linkTarget)}" target="_blank" rel="noopener">OPEN MATERIAL ↗</a></div>`;
  }

  async function enhanceRecordDialog() {
    const data = await loadRelations();
    const original = window.openRecord;
    if (typeof original !== 'function' || original.__materialWrapped) return;
    const wrapped = function(type, id, updateHash = true) {
      original(type, id, updateHash);
      setTimeout(() => {
        const items = relationsFor(type, id, data);
        const detail = document.getElementById('recordDetail');
        if (!detail || !items.length) return;
        let section = detail.querySelector('.detail-materials');
        if (!section) {
          section = document.createElement('section');
          section.className = 'detail-materials';
          detail.appendChild(section);
        }
        section.innerHTML = `<div class="eyebrow">NEW MATERIALS / RECORD LINKS</div>${items.flatMap(item => item.records.filter(ref => ref.type === type && ref.id === id).map(() => materialBlock(item))).join('')}`;
      }, 30);
    };
    wrapped.__materialWrapped = true;
    window.openRecord = wrapped;
  }

  async function enhanceMaterialsPage() {
    const root = document.getElementById('materialsRelations');
    if (!root) return;
    const data = await loadRelations();
    root.innerHTML = data.relations.map(item => {
      const records = item.records.map(ref => `<a class="relation-chip" href="index.html#record=${encodeURIComponent(ref.type)}:${encodeURIComponent(ref.id)}">${esc(ref.type.toUpperCase())} / ${esc(recordName(ref.type, ref.id))}</a>`).join('');
      return `<article class="material-card"><span class="eyebrow">RECORD LINKS</span><h3>${esc(item.material.title)}</h3><p>${esc(item.note || '')}</p><div class="material-relation-links">${records || '<span class="materials-meta">UNRESOLVED / NEEDS SOURCE</span>'}</div></article>`;
    }).join('');
  }

  const style = document.createElement('style');
  style.textContent = '.detail-materials{margin-top:24px;border-top:1px solid var(--line,#111);padding-top:16px}.material-relation-row{border:1px solid var(--line,#111);padding:12px;margin-top:8px;display:grid;gap:6px}.material-relation-row small{font-size:11px;line-height:1.45;opacity:.75}.material-relation-links{display:flex;flex-wrap:wrap;gap:6px}.relation-chip{border:1px solid var(--line,#111);padding:6px 8px;font-size:10px;text-transform:uppercase}.relation-chip:hover{background:var(--ink,#111);color:var(--paper,#f4f1e8)}';
  document.head.appendChild(style);

  enhanceRecordDialog().catch(console.error);
  enhanceMaterialsPage().catch(console.error);
})();

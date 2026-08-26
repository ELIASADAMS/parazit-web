(() => {
  const esc = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const localImage = path => String(path || '').split('/').map(encodeURIComponent).join('/');
  let materialIndex = null;

  async function loadIndex(){
    if(materialIndex) return materialIndex;
    try { materialIndex = await fetch('material-index.json',{cache:'no-store'}).then(r=>r.ok?r.json():null); } catch {}
    return materialIndex;
  }
  async function loadRelations(){
    try { return await fetch('material-relations.json',{cache:'no-store'}).then(r=>r.json()); }
    catch { return {relations:[]}; }
  }
  function recordName(type,id){
    const collections={artist:'artists',exhibition:'exhibitions',artwork:'artworks',document:'documents',venue:'venues',snapshot:'snapshots'};
    const records=window.state?.[collections[type]]||[];
    const record=records.find(x=>x.id===id);
    return record?.name||record?.title||id;
  }
  function relationsFor(type,id,relations){return (relations.relations||[]).filter(item=>item.records.some(ref=>ref.type===type&&ref.id===id));}
  function materialImages(material){
    if(material.images?.length) return material.images.map(x=>typeof x==='string'?x:x.path).filter(Boolean);
    if(material.imageCount&&material.imagePattern){const pad=material.imagePad||3;return Array.from({length:material.imageCount},(_,i)=>`${material.folder}/${material.imagePattern.replace('{n}',String(i+1).padStart(pad,'0'))}`);}
    return [];
  }
  async function materialBlock(item){
    const m=item.material||{};
    let images=materialImages(m);
    const idx=await loadIndex();
    if(!images.length&&idx){const n=String(m.title||'').toLowerCase();const c=(idx.collections||[]).find(x=>String(x.title||'').toLowerCase()===n);if(c)images=c.images.map(x=>x.path);}
    const grid=images.length?`<div class="material-detail-grid">${images.map(path=>`<a href="${localImage(path)}" target="_blank" rel="noopener"><img src="${localImage(path)}" alt="${esc(m.title)}" loading="lazy"></a>`).join('')}</div>`:'';
    return `<div class="material-relation-row"><span class="eyebrow">${esc(m.kind||'IMAGE COLLECTION')}${images.length?` / ${images.length} IMAGES`:''}</span><strong>${esc(m.title||'Material')}</strong><small>${esc(item.note||'')}</small>${grid}<a class="material-open-collection" href="materials.html">OPEN COLLECTION →</a></div>`;
  }
  async function enhanceRecordDialog(){
    const data=await loadRelations();
    const original=window.openRecord;
    if(typeof original!=='function'||original.__materialWrapped)return;
    const wrapped=function(type,id,updateHash=true){
      original(type,id,updateHash);
      setTimeout(async()=>{
        const items=relationsFor(type,id,data),detail=document.getElementById('recordDetail');if(!detail)return;
        let section=detail.querySelector('.detail-materials');
        if(!items.length){if(section)section.remove();return;}
        if(!section){section=document.createElement('section');section.className='detail-materials';detail.appendChild(section);}
        const blocks=[];for(const item of items)blocks.push(await materialBlock(item));
        section.innerHTML=`<div class="eyebrow">IMAGE / TEXT MATERIALS</div>${blocks.join('')}`;
      },40);
    };
    wrapped.__materialWrapped=true;window.openRecord=wrapped;
  }
  async function enhanceMaterialsPage(){
    const root=document.getElementById('materialsRelations');if(!root)return;
    const data=await loadRelations();
    root.innerHTML=(data.relations||[]).map(item=>{const links=item.records.map(ref=>`<a class="relation-chip" href="index.html#record=${encodeURIComponent(ref.type)}:${encodeURIComponent(ref.id)}">${esc(ref.type.toUpperCase())} / ${esc(recordName(ref.type,ref.id))}</a>`).join('');return `<article class="material-card"><span class="eyebrow">RECORD LINKS</span><h3>${esc(item.material.title)}</h3><p>${esc(item.note||'')}</p><div class="material-relation-links">${links||'<span class="materials-meta">UNRESOLVED / SOURCE MATERIAL</span>'}</div></article>`;}).join('');
  }
  const style=document.createElement('style');style.textContent='.detail-materials{margin-top:24px;border-top:1px solid var(--line,#111);padding-top:16px}.material-relation-row{border:1px solid var(--line,#111);padding:12px;margin-top:8px;display:grid;gap:6px}.material-relation-row small{font-size:11px;line-height:1.45;opacity:.75}.material-detail-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:6px}.material-detail-grid img{width:100%;aspect-ratio:1;object-fit:cover;display:block;border:1px solid var(--line,#111)}.material-open-collection{font-size:10px;text-transform:uppercase}.material-relation-links{display:flex;flex-wrap:wrap;gap:6px}.relation-chip{border:1px solid var(--line,#111);padding:6px 8px;font-size:10px;text-transform:uppercase}@media(max-width:700px){.material-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}';document.head.appendChild(style);
  enhanceRecordDialog().catch(console.error);enhanceMaterialsPage().catch(console.error);
})();

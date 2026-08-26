document.addEventListener('DOMContentLoaded', async () => {
  try {
    let data = null;
    try { data = await fetch('material-index.json',{cache:'no-store'}).then(r=>r.ok?r.json():null); } catch {}
    if (!data) data = await fetch('materials.json',{cache:'no-store'}).then(r=>r.json());
    const collections = data.collections || data.imageCollections || [];
    const gallery = document.getElementById('galleryGrid');
    const esc=s=>String(s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
    const preview = item => item.images?.[0]?.path || item.preview || '';
    if (collections.length) {
      const old=document.querySelector('.materials-home-grid'); if(old?.parentElement) old.parentElement.remove();
      const strip=document.createElement('section'); strip.className='home-section';
      strip.innerHTML=`<div class="section-title"><span>IMAGE.ARCHIVE</span><a href="materials.html">OPEN FULL MATERIALS →</a></div><div class="record-grid materials-home-grid"></div>`;
      const grid=strip.querySelector('.materials-home-grid');
      grid.innerHTML=collections.map(item=>{const p=preview(item);return `<a class="record-card material-home-card" href="materials.html"><div class="material-home-image">${p?`<img class="record-image" src="${esc(p)}" alt="${esc(item.title)}" loading="lazy">`:''}</div><span class="record-info"><span class="record-id">IMAGE COLLECTION</span><span class="record-title">${esc(item.title)}</span><span class="record-meta">${item.year||''}${item.count?` · ${item.count} IMAGES`:''}</span></span></a>`}).join('');
      if(gallery) gallery.after(strip); else document.querySelector('main')?.appendChild(strip);
    }
    const relationScript=document.createElement('script'); relationScript.src='material-relations.js'; document.body.appendChild(relationScript);
  } catch(error){console.warn('Materials layer unavailable',error)}
});

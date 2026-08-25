document.addEventListener('DOMContentLoaded', async () => {
  try {
    const data = await fetch('materials.json', { cache: 'no-store' }).then(r => r.json());
    const gallery = document.getElementById('galleryGrid');
    if (!gallery || !data.imageCollections?.length) return;
    const strip = document.createElement('section');
    strip.className = 'home-section';
    strip.innerHTML = `<div class="section-title"><span>NEW.MATERIALS</span><a href="materials.html">OPEN MATERIALS →</a></div><div class="record-grid materials-home-grid"></div>`;
    const grid = strip.querySelector('.materials-home-grid');
    grid.innerHTML = data.imageCollections.map(item => `<a class="record-card" href="materials.html"><img class="record-image" src="${String(item.preview).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" alt="${String(item.title).replace(/&/g,'&amp;').replace(/</g,'&lt;')}" loading="lazy"><span class="record-info"><span class="record-id">MATERIAL</span><span class="record-title">${String(item.title).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span><span class="record-meta">SOURCE COLLECTION</span></span></a>`).join('');
    document.querySelector('[data-view="gallery"]')?.after(strip);
  } catch (error) {
    console.warn('Materials layer unavailable', error);
  }
});

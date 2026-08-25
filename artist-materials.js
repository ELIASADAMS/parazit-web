document.addEventListener('DOMContentLoaded', async () => {
  const view = document.querySelector('[data-view="index"]');
  if (!view) return;
  try {
    const data = await fetch('artist-materials.json', {cache:'no-store'}).then(r => r.json());
    const section = document.createElement('section');
    section.className = 'home-section artist-text-section';
    section.innerHTML = `<div class="section-title"><span>ARTISTS / TEXT-DOCUMENTED</span><span>${String(data.materials.length).padStart(2,'0')} TEXTS</span></div><div class="index-list artist-material-list"></div>`;
    const list = section.querySelector('.artist-material-list');
    list.innerHTML = data.materials.map((m,i) => {
      const artist = data.artists.find(a => a.materialIds?.includes(m.id));
      const title = artist?.name || m.title.replace(/ — text archive$/,'');
      return `<button type="button" class="index-row artist-material-row" data-material-path="${m.path}" data-material-title="${title}"><span class="index-num">TXT-${String(i+1).padStart(2,'0')}</span><span class="index-name">${title}</span><span class="index-role">${artist?.role || 'TEXT ARCHIVE'} → OPEN</span></button>`;
    }).join('');
    view.appendChild(section);
    list.addEventListener('click', async event => {
      const button = event.target.closest('[data-material-path]');
      if (!button) return;
      let dialog = document.getElementById('artistTextDialog');
      if (!dialog) {
        dialog = document.createElement('dialog'); dialog.id='artistTextDialog'; dialog.className='record-dialog material-dialog';
        dialog.innerHTML='<button class="dialog-close" type="button">×</button><div class="artist-text-body"></div>';
        document.body.appendChild(dialog); dialog.querySelector('.dialog-close').onclick=()=>dialog.close();
      }
      const body=dialog.querySelector('.artist-text-body');
      body.innerHTML=`<div class="eyebrow">ARTIST TEXT</div><h2>${button.dataset.materialTitle}</h2><div class="material-reading">LOADING…</div>`;
      dialog.showModal();
      try { const text=await fetch(button.dataset.materialPath,{cache:'no-store'}).then(r=>r.text()); body.querySelector('.material-reading').innerHTML='<p>'+text.replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])).replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')+'</p>'; } catch (_) { body.querySelector('.material-reading').textContent='TEXT COULD NOT BE LOADED.'; }
    });
  } catch (error) { console.warn('Artist text layer unavailable', error); }
});

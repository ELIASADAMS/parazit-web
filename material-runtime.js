/* Runtime material integration: keeps physical image folders source-first while making them visible from archive records. */
(function(){
  const API='https://api.github.com/repos/ELIASADAMS/parazit-web/contents/images?ref=main';
  const RAW=p=>'https://raw.githubusercontent.com/ELIASADAMS/parazit-web/main/'+p.split('/').map(encodeURIComponent).join('/');
  const norm=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const words=s=>norm(s).split(/\s+/).filter(w=>w.length>3);
  const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const known={
    'exh-readymades-2025':'images/07.25 вернисаж выставки реди-мейдов на Рентгена 4',
    'exh-bad-works-2015':'images/10 новых плохих работ'
  };
  async function list(path){const r=await fetch('https://api.github.com/repos/ELIASADAMS/parazit-web/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref=main');if(!r.ok)throw new Error('image directory unavailable');return r.json()}
  async function firstImage(folder){const files=await list(folder);const image=files.find(x=>x.type==='file'&&/\.(jpe?g|png|gif|webp)$/i.test(x.name));return image?RAW(image.path):null}
  async function run(){
    if(!window.state||!state.exhibitions)return;
    let root;try{root=await fetch(API).then(r=>r.json())}catch(e){return}
    const dirs=(root||[]).filter(x=>x.type==='dir'&&x.name.toLowerCase()!=='big archive');
    const explicit=new Map(Object.entries(known));
    // First use high-confidence material relations, then conservative title/year matching.
    try{const registry=await fetch('material-relations.json',{cache:'no-store'}).then(r=>r.json());(registry.relations||[]).forEach(m=>(m.records||[]).filter(r=>r.type==='exhibition').forEach(r=>{if(m.material?.folder)explicit.set(r.id,m.material.folder)}))}catch(e){}
    const assignments=new Map(explicit);
    state.exhibitions.forEach(ex=>{
      if(assignments.has(ex.id))return;
      const titleWords=words(ex.title).filter(w=>!['parazit','group','выставка','project','the'].includes(w));
      if(!titleWords.length)return;
      const candidates=dirs.map(d=>{const dn=norm(d.name);const score=titleWords.reduce((n,w)=>n+(dn.includes(w)?1:0),0);const year=String(ex.year||'');const yearHit=year&&dn.includes(year.slice(-2));return {d,score:score+(yearHit?0.5:0),yearHit}}).filter(x=>x.score>=Math.max(1,titleWords.length*0.5)).sort((a,b)=>b.score-a.score);
      if(candidates.length===1||(candidates[0]&&candidates[0].score>=2))assignments.set(ex.id,candidates[0].d.path);
    });
    for(const ex of state.exhibitions){const folder=assignments.get(ex.id);if(!folder)continue;try{const image=await firstImage(folder);if(image){ex.images=Array.from(new Set([image,...(ex.images||[])]));ex.materialFolder=folder}}catch(e){}}
    // Latest means actual date, not merely the highest year. This fixes the homepage poll as new records are added.
    const latest=[...state.exhibitions].sort((a,b)=>String(b.start||b.end||`${b.year||0}-01-01`).localeCompare(String(a.start||a.end||`${a.year||0}-01-01`))).slice(0,4);
    const host=document.getElementById('latestExhibitions');if(host)host.innerHTML=latest.map(window.exhibitionCard).join('');
    if(typeof window.renderGallery==='function')window.renderGallery();
    document.querySelectorAll('[data-record-type="exhibition"]').forEach(btn=>btn.addEventListener('click',()=>{}));
    // Add a direct collection button to every exhibition detail after the dialog opens.
    const dialog=document.getElementById('recordDialog');if(dialog&&!dialog.__materialObserver){dialog.__materialObserver=true;new MutationObserver(()=>{const id=(location.hash.match(/#record=exhibition:([^&]+)/)||[])[1];if(!id)return;const ex=state.exhibitions.find(x=>x.id===decodeURIComponent(id));if(!ex?.materialFolder)return;const detail=document.getElementById('recordDetail');if(!detail||detail.querySelector('.material-collection-link'))return;const section=document.createElement('section');section.className='detail-sources';section.innerHTML='<div class="eyebrow">IMAGE COLLECTION</div><a class="source-row material-collection-link" href="collection.html?folder='+encodeURIComponent(ex.materialFolder)+'"><span>PHOTOS</span><strong>OPEN FULL IMAGE COLLECTION ↗</strong></a>';detail.appendChild(section)}).observe(dialog,{childList:true,subtree:true});}
  }
  const timer=setInterval(()=>{if(window.state?.exhibitions?.length){clearInterval(timer);run()}},250);
})();
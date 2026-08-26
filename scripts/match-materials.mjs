import fs from 'node:fs/promises';
const norm=s=>s.toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/gi,' ').trim();
const tokens=s=>new Set(norm(s).split(/\s+/).filter(x=>x.length>2));
const data=JSON.parse(await fs.readFile('material-index.json','utf8'));
const exh=JSON.parse(await fs.readFile('exhibitions.json','utf8')).exhibitions;
const explicit={
 '07.25 вернисаж выставки реди-мейдов на Рентгена 4':'exh-readymades-2025',
 '10 новых плохих работ':'exh-bad-works-2015',
 'Truth about Cement':'exh-cementa-2014',
 'Chinese Pavilion':'exh-pavilion-2024'
};
function score(c,e){const a=tokens(c.title),b=tokens(`${e.title} ${e.titleRussian||''}`);let n=0;for(const t of a)if(b.has(t))n++;if(c.year&&e.year&&c.year===e.year)n+=2;return n}
for(const c of data.collections){let best=null; if(explicit[c.title]) best={id:explicit[c.title],score:100,reason:'explicit'}; else for(const e of exh){const s=score(c,e);if(s>=(c.year&&e.year===c.year?2:3)&&(!best||s>best.score))best={id:e.id,score:s,reason:'name/year'};} c.match=best||null;}
await fs.writeFile('material-matches.json',JSON.stringify({version:1,generatedAt:new Date().toISOString(),matches:data.collections.map(c=>({collectionId:c.id,title:c.title,match:c.match}))},null,2)+'\n');
console.log(`material matches: ${data.collections.filter(c=>c.match).length}/${data.collections.length}`);

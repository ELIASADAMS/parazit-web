import fs from 'node:fs/promises';
import path from 'node:path';
const ROOT=process.cwd(), IMAGE_ROOT=path.join(ROOT,'images'), OUT=path.join(ROOT,'material-index.json');
const IMAGE_EXT=/\.(jpe?g|png|gif|webp|avif|heic)$/i;
const norm=s=>s.toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/gi,' ').trim();
const yearOf=s=>{const m=String(s).match(/(?:19|20)\d{2}/);return m?Number(m[0]):null};
async function walk(dir,rel=''){const out=[];let es=[];try{es=await fs.readdir(dir,{withFileTypes:true})}catch{return out}for(const e of es){const abs=path.join(dir,e.name),r=path.join(rel,e.name);if(e.isDirectory())out.push({kind:'dir',path:r,name:e.name,children:await walk(abs,r)});else if(IMAGE_EXT.test(e.name))out.push({kind:'image',path:r,name:e.name})}return out}
const tree=await walk(IMAGE_ROOT);
const collections=tree.filter(x=>x.kind==='dir'&&norm(x.name)!=='big archive').map(d=>({id:'col-'+norm(d.name).replace(/\s+/g,'-').slice(0,80),title:d.name,year:yearOf(d.name),path:'images/'+d.path,images:d.children.filter(x=>x.kind==='image').map(x=>({name:x.name,path:'images/'+x.path})),count:d.children.filter(x=>x.kind==='image').length}));
const looseImages=tree.filter(x=>x.kind==='image').map(x=>({name:x.name,path:'images/'+x.path,year:yearOf(x.name)}));
const big=tree.find(x=>x.kind==='dir'&&norm(x.name)==='big archive');
await fs.writeFile(OUT,JSON.stringify({version:1,generatedAt:new Date().toISOString(),collectionCount:collections.length,collections,looseImages,bigArchive:big?{path:'images/'+big.path,count:big.children.filter(x=>x.kind==='image').length}:null},null,2)+'\n');
console.log(`material-index: ${collections.length} collections, ${looseImages.length} loose images`);

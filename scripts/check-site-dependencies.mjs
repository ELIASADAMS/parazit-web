import fs from 'node:fs/promises';
import path from 'node:path';
const roots=['.'];
const allowed=['.git','node_modules'];
const exts=new Set(['.html','.js','.css','.json']);
const forbidden=/(?:https?:\/\/)?(?:api\.)?github\.com|raw\.githubusercontent\.com|githubusercontent\.com/i;
const hits=[];
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){if(allowed.includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else if(exts.has(path.extname(e.name))){const s=await fs.readFile(p,'utf8');if(forbidden.test(s))hits.push(p)}}}
await walk('.');
if(hits.length){console.error('Site runtime dependency check failed:',hits);process.exit(1)}
console.log('Site runtime dependency check passed: no GitHub runtime URLs found.');

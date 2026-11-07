import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve('client/dist');
const manifest=JSON.parse(readFileSync(resolve(root,'manifest.webmanifest'),'utf8'));
assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');
assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));
for(const icon of manifest.icons){
 const png=readFileSync(resolve(root,icon.src.slice(1)));
 assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
 const [width,height]=icon.sizes.split('x').map(Number);
 assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);
}
const html=readFileSync(resolve(root,'index.html'),'utf8');
assert.match(html,/rel="manifest"/);assert.match(html,/rel="apple-touch-icon"/);
assert.ok(existsSync(resolve(root,'sw.js')));
const worker=readFileSync(resolve(root,'sw.js'),'utf8');
assert.match(worker,/index\.html/);assert.match(worker,/assets\/index-/);
assert.match(worker,/socket/);assert.match(worker,/api/);
console.log('PWA build verified: manifest, icon dimensions, Apple metadata, generated worker, precached app shell.');

'use strict';
// しば日和 3D のビルド。src/ を1つのHTMLにまとめ、Grant画像をData URLで埋め込む（画素は変更しない）。
const fs=require('node:fs'),path=require('node:path');
require('./node-version.cjs').requireFixedNode(); // 修正版のNode.jsでだけビルドする
const root=__dirname,source=path.join(root,'src');
const textureRoot=path.join(root,'assets','texture_proposals');
const files={BLACK:'grant-spritesheet.png',BROWN:'grant-brown-preview-v3.png',WHITE:'grant-white-preview-v2.png'};
const ORDER=['core.js','audio.js','art.js','grant.js','gfx.js','dogsprite.js','world3d.js','npc3d.js','fish.js','fishing3d.js','home3d.js','games3d.js','app.js'];
let graphics=fs.readFileSync(path.join(source,'grant.js'),'utf8');
for(const [key,file]of Object.entries(files))graphics=graphics.replace('/*__GRANT_'+key+'__*/','data:image/png;base64,'+fs.readFileSync(path.join(textureRoot,file)).toString('base64'));
let html=fs.readFileSync(path.join(source,'index.template.html'),'utf8');
const code=ORDER.map(f=>f==='grant.js'?graphics:fs.readFileSync(path.join(source,f),'utf8')).join('\n');
html=html.replace('/*__STYLE__*/',()=>fs.readFileSync(path.join(source,'style.css'),'utf8')).replace('/*__CODE__*/',()=>code);
fs.writeFileSync(path.join(root,'index.html'),html.replace('<!--__PWA__-->',''));
fs.writeFileSync(path.join(root,'pwa','index.html'),html.replace('<!--__PWA__-->','<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icon-192.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="しば日和"><script defer src="pwa.js"></script>'));
console.log('Built しば日和 3D with Node.js v'+process.versions.node+': index.html + pwa/index.html ('+ORDER.length+' scripts, Grant images embedded unchanged).');

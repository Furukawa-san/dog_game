'use strict';
// 公開URL（本番HTTPS）での確認。iPadのUA・画面サイズ・タッチを模した一時プロファイルのChromeで開く（実機の代わりではない）。
const fs=require('node:fs'),path=require('node:path');
const {launch,delay,root}=require('../browser-helper.cjs');
const URL_='https://shiba-biyori-20261010.pages.dev/';
const IPAD_UA='Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const results=[];const ok=(n,c,i='')=>results.push([c?'ok':'NG',n,i]);
(async()=>{const env=await launch(),c=env.cdp;try{
 await c.send('Emulation.setUserAgentOverride',{userAgent:IPAD_UA,platform:'iPad'});await c.send('Emulation.setDeviceMetricsOverride',{width:1180,height:820,deviceScaleFactor:2,mobile:true});await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 await c.send('Page.navigate',{url:URL_+'?qa=1'});await c.wait('!!window.__shibaQA && GrantGraphics.loaded',30000);
 ok('本番: 新しい3D版が起動する',await c.eval(`document.title.includes('3D') && !!__shibaQA.renderer && !__shibaQA.renderer.lost`));
 await c.wait('document.getElementById("offline-status")?.textContent.includes("準備ができた")',30000);ok('本番: オフライン準備が完了',true);
 const keys=await c.eval('caches.keys()');ok('本番: v4のキャッシュ',keys.some(k=>k.endsWith(require('node:fs').readFileSync(require('node:path').join(root,'pwa','service-worker.js'),'utf8').match(/RELEASE='([^']+)'/)[1])),keys.join(','));
 await c.eval(`document.querySelectorAll('dialog[open]').forEach(d=>d.close());(()=>{const s=__shibaQA.state;s.name='本番柴';s.tutorial=true;__shibaQA.replaceState(s);return true})()`);
 await c.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await c.send('Page.reload');await c.wait('!!window.__shibaQA && GrantGraphics.loaded',20000);await delay(600);
 ok('本番: 通信遮断で再起動しても記録が残り3D表示',await c.eval(`__shibaQA.state.name==='本番柴' && __shibaQA.renderer.stats.draws>0`));
 ok('本番: オフラインでミニゲーム完走',await c.eval(`(()=>{__shibaQA.launch('treat');const g=__shibaQA.game;document.getElementById('game-start').click();let t=0;while(!g.finished&&t<60){g.update(1/30);t+=1/30;}return g.finished&&!document.getElementById('result').hidden;})()`));
 await c.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await c.eval(`document.querySelectorAll('dialog[open]').forEach(d=>d.close());__shibaQA.showView('home');true`);await delay(800);
 const r=await c.send('Page.captureScreenshot',{format:'png'});fs.mkdirSync(path.join(root,'evidence','v4'),{recursive:true});fs.writeFileSync(path.join(root,'evidence','v4','05-public-home.png'),Buffer.from(r.data,'base64'));
 const external=c.events.filter(e=>e.method==='Network.requestWillBeSent').map(e=>e.params.request.url).filter(u=>/^https?:/.test(u)&&!u.startsWith(URL_));
 ok('本番: 別ホストへの通信がない',external.length===0,external.slice(0,3).join(' '));
 const ex=c.events.filter(e=>e.method==='Runtime.exceptionThrown');ok('本番: 実行時エラーがない',ex.length===0,ex.slice(0,2).map(e=>e.params.exceptionDetails.text).join(' | '));
}finally{await env.close();}
 const ng=results.filter(r=>r[0]!=='ok');for(const r of results)console.log(r[0],r[1],r[2]?'· '+r[2]:'');console.log((results.length-ng.length)+'/'+results.length+' passed');
 fs.writeFileSync(path.join(root,'evidence','v4','public-results.json'),JSON.stringify({at:new Date().toISOString(),url:URL_,realIPad:false,results},null,1));if(ng.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

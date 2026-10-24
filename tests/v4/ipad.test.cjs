'use strict';
// iPad運用を想定した検証（実機の代わりではない）:
//  1) PWA: Service Worker登録→オフライン準備→通信遮断で再起動→記録保持・3D描画・ゲーム完走、外部通信ゼロ
//  2) file:// で自己完結版 index.html を開いて起動
//  3) <dialog> が無い古いSafariを模して起動（ようこそ画面・設定が開ける）
// 表示は iPad 横 1180x820 / 縦 820x1180、DPR2、タッチ入力のエミュレーション。
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {launch,delay,root}=require('../browser-helper.cjs');
const results=[];const ok=(name,cond,info='')=>results.push([cond?'ok':'NG',name,info]);
const IPAD_UA='Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
async function ipad(c,portrait=false){await c.send('Emulation.setUserAgentOverride',{userAgent:IPAD_UA,platform:'iPad'});await c.send('Emulation.setDeviceMetricsOverride',{width:portrait?820:1180,height:portrait?1180:820,deviceScaleFactor:2,mobile:true});await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});}
const exceptions=c=>c.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails.exception?.description||e.params.exceptionDetails.text);
const finishGame=key=>`(()=>{__shibaQA.launch(${JSON.stringify(key)});const g=__shibaQA.game;document.getElementById('game-start').click();let t=0;while(!g.finished&&t<60){if(g.key==='race'&&g.phase==='play')g.control(g._s=g._s==='L'?'R':'L');g.update(1/30);t+=1/30;}return g.finished&&!document.getElementById('result').hidden;})()`;
(async()=>{
 // 1) PWA（Cloudflare同様に index.html を / へリダイレクトする配信を再現）
 {const env=await launch({canonicalRedirect:true}),c=env.cdp;try{
  await ipad(c);await c.send('Page.navigate',{url:env.url+'/pwa/index.html?qa=1'});await c.wait('!!window.__shibaQA');
  await c.wait('document.getElementById("offline-status")?.textContent.includes("準備ができた")',20000);await c.wait('!!navigator.serviceWorker.controller',10000);
  const keys=await c.eval('caches.keys()');ok('PWA: オフライン準備が完了し、v4のキャッシュがある',keys.some(k=>k.endsWith(require('node:fs').readFileSync(require('node:path').join(root,'pwa','service-worker.js'),'utf8').match(/RELEASE='([^']+)'/)[1])),keys.join(','));
  const manifest=await c.eval(`fetch('manifest.webmanifest').then(r=>r.json())`);ok('PWA: マニフェストに名前・アイコン・開始URL',manifest.short_name==='しば日和'&&manifest.icons.length===2&&manifest.start_url==='./index.html');
  await c.eval(`document.querySelectorAll('dialog[open]').forEach(d=>d.close());(()=>{const s=__shibaQA.state;s.name='オフライン柴';s.tutorial=true;__shibaQA.replaceState(s);return true})()`);
  await c.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await c.send('Page.reload');await c.wait('!!window.__shibaQA && GrantGraphics.loaded',15000);await delay(500);
  ok('PWA: 通信遮断のまま再起動して記録を保持',await c.eval('__shibaQA.state.name')==='オフライン柴');
  ok('PWA: オフラインでも3D描画が動く',await c.eval('!!__shibaQA.renderer && !__shibaQA.renderer.lost && __shibaQA.renderer.stats.draws>0'));
  ok('PWA: オフラインでミニゲームを完走',await c.eval(finishGame('frisbee')));
  await c.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  const external=c.events.filter(e=>e.method==='Network.requestWillBeSent').map(e=>e.params.request.url).filter(u=>/^https?:/.test(u)&&!u.startsWith(env.url));
  ok('PWA: 外部への通信がない',external.length===0,external.slice(0,3).join(' '));
  ok('PWA: 実行時エラーがない',exceptions(c).length===0,exceptions(c).slice(0,2).join(' | '));
 }finally{await env.close();}}
 // 2) file:// の自己完結版
 {const env=await launch(),c=env.cdp;try{
  await ipad(c,true);await c.send('Page.navigate',{url:pathToFileURL(path.join(root,'index.html')).href+'?qa=1'});await c.wait('!!window.__shibaQA && GrantGraphics.loaded',15000);await delay(600);
  ok('file://: 起動してGrant画像を読み込む',await c.eval('GrantGraphics.loaded && !GrantGraphics.error'));
  ok('file://: 3D描画が動く（縦向き）',await c.eval('!!__shibaQA.renderer && __shibaQA.renderer.stats.draws>0'));
  ok('file://: ようこそ画面が開く',await c.eval(`document.getElementById('welcome-dialog').open`));
  ok('file://: 実行時エラーがない',exceptions(c).length===0,exceptions(c).slice(0,2).join(' | '));
 }finally{await env.close();}}
 // 3) <dialog> が無い古いSafariを模す
 {const env=await launch(),c=env.cdp;try{
  await ipad(c);await c.send('Page.addScriptToEvaluateOnNewDocument',{source:'try{delete HTMLDialogElement.prototype.showModal;delete HTMLDialogElement.prototype.close;}catch(e){}'});
  await c.send('Page.navigate',{url:env.url+'/index.html?qa=1'});await c.wait('!!window.__shibaQA && GrantGraphics.loaded',15000);await delay(500);
  ok('旧Safari相当: showModalが無い環境を再現できている',await c.eval(`typeof HTMLDialogElement.prototype.showModal!=='function'`));
  ok('旧Safari相当: ようこそ画面が代替表示で開く',await c.eval(`(()=>{const d=document.getElementById('welcome-dialog');return d.open&&getComputedStyle(d).display!=='none'})()`));
  await c.eval(`document.getElementById('welcome-go').click();true`);await delay(300);
  ok('旧Safari相当: はじめる→閉じて遊べる',await c.eval(`!document.getElementById('welcome-dialog').open && __shibaQA.state.tutorial===true`));
  await c.eval(`document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById('settings-open').click();true`);
  ok('旧Safari相当: 設定が開いて閉じられる',await c.eval(`(()=>{const d=document.getElementById('settings-dialog');const a=d.open;d.querySelector('[data-close]').click();return a&&!d.open})()`));
  ok('旧Safari相当: 実行時エラーがない',exceptions(c).length===0,exceptions(c).slice(0,2).join(' | '));
 }finally{await env.close();}}
 const ng=results.filter(r=>r[0]!=='ok');for(const r of results)console.log(r[0],r[1],r[2]?'· '+r[2]:'');console.log((results.length-ng.length)+'/'+results.length+' passed');
 fs.mkdirSync(path.join(root,'evidence','v4'),{recursive:true});fs.writeFileSync(path.join(root,'evidence','v4','ipad-results.json'),JSON.stringify({at:new Date().toISOString(),realIPad:false,note:'Windows Chrome headless with iPad UA/size/touch emulation',results},null,1));if(ng.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
// 画面確認用の撮影（iPad縦 820x1180 / 横 1180x820）。出力先は引数のフォルダ（省略時 evidence/v4/shots）。
const fs=require('node:fs'),path=require('node:path');
const {launch,delay,root}=require('../browser-helper.cjs');
const out=path.resolve(process.argv[2]||path.join(root,'evidence','v4','shots'));fs.mkdirSync(out,{recursive:true});
(async()=>{const env=await launch(),c=env.cdp;const shot=async n=>{const r=await c.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,n+'.png'),Buffer.from(r.data,'base64'));console.log('saved',n);};
 try{
  for(const [tag,w,h] of [['portrait',820,1180],['landscape',1180,820]]){
   await c.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
   await c.send('Page.navigate',{url:env.url+'/index.html?qa=1'});await c.wait('!!window.__shibaQA && GrantGraphics.loaded');await delay(500);
   await c.eval(`(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());const s=__shibaQA.state;s.tutorial=true;s.coat='brown';s.fullness=40;s.energy=90;s.joy=90;s.clean=90;s.coins=2000;for(const id of ['neck_bandana','head_ribbon'])if(!s.owned.includes(id))ShibaCore.buy(s,id);s.equipped.neck='neck_bandana';s.equipped.head='head_ribbon';__shibaQA.replaceState(s);return true})()`);
   await delay(800);await c.eval(`document.querySelectorAll('dialog[open]').forEach(d=>d.close());true`);
   // ごはん: 選ぶとパネルが閉じて食べる
   await c.eval(`document.querySelector('[data-care="feed"]').click();true`);await delay(300);
   await c.eval(`(()=>{const b=document.querySelector('[data-food="meal"]'),r=b.getBoundingClientRect(),o={clientX:r.x+20,clientY:r.y+20,pointerId:3,bubbles:true,pointerType:'touch',buttons:1};b.dispatchEvent(new PointerEvent('pointerdown',o));b.dispatchEvent(new PointerEvent('pointerup',{...o,buttons:0}));return true})()`);
   await delay(2200);await shot(tag+'-1-eat');await delay(1500);
   // しつけ: 技を選ぶとパネルが畳まれる
   await c.eval(`document.querySelector('[data-care="lesson"]').click();true`);await delay(1600);await shot(tag+'-2-lesson-panel');
   await c.eval(`document.querySelector('[data-trick="paw"]')?.click();true`);await delay(1200);await shot(tag+'-3-lesson-after');
   await c.eval(`document.getElementById('lesson-bar-end').click();true`);await delay(300);
   // おさんぽ
   await c.eval(`(()=>{__shibaQA.launch('walk_park');document.getElementById('game-start').click();__shibaQA.step(5);return true})()`);await delay(500);await shot(tag+'-4-walk');
   await c.eval(`(()=>{__shibaQA.launch('athletic');document.getElementById('game-start').click();__shibaQA.step(5);return true})()`);await delay(500);await shot(tag+'-5-athletic');
   await c.eval(`__shibaQA.showView('home');true`);
  }
 }finally{await env.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

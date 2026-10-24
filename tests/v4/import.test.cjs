'use strict';
// 公開中の版で「記録を保存」したJSONを、新しい版の「記録を読み込む」で読み込み、記録がそのまま残るかを確かめる。
// 1) 公開URLの版で遊んだ状態を作り、exportData() でJSONを作る（公開版の書き出し処理そのもの）
// 2) 手元の新しい版で、ファイル選択（DOM.setFileInputFiles）→確認ダイアログ「置きかえる」
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {launch,delay,root}=require('../browser-helper.cjs');
const PUBLIC='https://shiba-biyori-20261010.pages.dev/';
const results=[];const ok=(n,c,i='')=>results.push([c?'ok':'NG',n,i]);
const pick=s=>({name:s.name,coat:s.coat,coins:s.coins,xp:s.xp,ageMs:s.ageMs,owned:[...s.owned].sort(),equipped:s.equipped,deco:s.deco,best:s.best,stars:s.stars,tricks:s.tricks,stamps:[...s.stamps].sort(),counts:s.counts,bond:s.bond});
(async()=>{
 let json=null,before=null;
 {const env=await launch(),c=env.cdp;try{
  await c.send('Page.navigate',{url:PUBLIC+'?qa=1'});await c.wait('!!window.__shibaQA && GrantGraphics.loaded',30000);
  await c.wait('document.getElementById("offline-status")?.textContent.includes("準備ができた")',30000);await delay(1500);await c.wait('!!window.__shibaQA && GrantGraphics.loaded',30000);await delay(500);
  json=await c.eval(`(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());const s=__shibaQA.state;s.name='セーブ柴';s.coat='black';s.tutorial=true;s.coins=4000;s.xp=900;s.ageMs=3*86400000;s.bond=55;
   for(const id of ['area_garden','area_road','area_sea','gear_wings','toy_frisbee','head_ribbon','neck_bandana','deco_plant','yard_pool'])ShibaCore.buy(s,id);s.equipped.head='head_ribbon';s.tricks.paw=40;s.best.frisbee=25;s.stars.frisbee=3;
   __shibaQA.replaceState(s);return __shibaQA.exportData();})()`);
  before=JSON.parse(json).state;ok('公開中の版でJSONを書き出せる',!!json&&JSON.parse(json).schemaVersion===3,'bytes='+json.length);
 }finally{await env.close();}}
 const file=path.join(os.tmpdir(),'shiba-record-v3-test.json');fs.writeFileSync(file,'﻿'+json+'\n');
 {const env=await launch(),c=env.cdp;try{
  await c.send('Page.navigate',{url:env.url+'/index.html?qa=1'});await c.wait('!!window.__shibaQA && GrantGraphics.loaded');await delay(500);
  ok('新しい版をはじめて開くと別の子（初期状態）',await c.eval(`__shibaQA.state.name!=='セーブ柴'`));
  await c.eval(`document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById('settings-open').click();true`);await delay(200);
  await c.send('DOM.enable');const {root:doc}=await c.send('DOM.getDocument',{depth:-1,pierce:true});const {nodeId}=await c.send('DOM.querySelector',{nodeId:doc.nodeId,selector:'#import-file'});
  await c.send('DOM.setFileInputFiles',{files:[file],nodeId});await delay(600);
  ok('読み込む前に確認が出る',await c.eval(`document.getElementById('confirm-dialog').open`));
  await c.eval(`document.getElementById('confirm-yes').click();true`);await delay(400);
  const after=await c.eval('__shibaQA.state');
  const a=pick(after),b=pick(before);
  for(const k of Object.keys(b)){const same=JSON.stringify(a[k])===JSON.stringify(b[k])||(k==='owned'&&b.owned.every(id=>a.owned.includes(id)))||(k==='ageMs'&&a.ageMs>=b.ageMs&&a.ageMs-b.ageMs<5*60000);/* 年齢は保存から読み込みまでの経過時間ぶん進む */ok('引き継がれる: '+k,same,same?'':JSON.stringify(a[k]).slice(0,80)+' / '+JSON.stringify(b[k]).slice(0,80));}
  await c.send('Page.reload');await c.wait('!!window.__shibaQA && GrantGraphics.loaded');await delay(400);
  ok('読み込んだ記録が自動保存され、開き直しても残る',await c.eval(`__shibaQA.state.name==='セーブ柴'&&__shibaQA.state.coins===${before.coins}`));
 }finally{await env.close();fs.rmSync(file,{force:true});}}
 const ng=results.filter(r=>r[0]!=='ok');for(const r of results)console.log(r[0],r[1],r[2]?'· '+r[2]:'');console.log((results.length-ng.length)+'/'+results.length+' passed');
 fs.mkdirSync(path.join(root,'evidence','v4'),{recursive:true});fs.writeFileSync(path.join(root,'evidence','v4','import-results.json'),JSON.stringify({at:new Date().toISOString(),from:PUBLIC,results},null,1));if(ng.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

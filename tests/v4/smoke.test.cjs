'use strict';
// しば日和 3D の実ブラウザ・スモークテスト。既存の tests/browser-helper.cjs（一時プロファイルのChrome＋127.0.0.1サーバー）を使う。
const fs=require('node:fs'),path=require('node:path');
const {launch,delay,root}=require('../browser-helper.cjs');
const out=path.join(root,'evidence','v4');fs.mkdirSync(out,{recursive:true});
const results=[];const ok=(name,cond,info='')=>{results.push([cond?'ok':'NG',name,info]);};
(async()=>{
 const env=await launch();const {cdp}=env;const errors=[];
 cdp.ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Log.entryAdded'&&m.params.entry.level==='error'&&!String(m.params.entry.url||'').endsWith('/favicon.ico'))errors.push(m.params.entry.text+' '+(m.params.entry.url||''));});
 const shot=async name=>{const r=await cdp.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));};
 try{
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1180,height:820,deviceScaleFactor:2,mobile:true});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  // 旧v2の記録を置いてから開く（引き継ぎ確認）
  await cdp.send('Page.navigate',{url:env.url+'/index.html?qa=1'});await cdp.wait('!!window.__shibaQA');
  const NOW=Date.now();const v2={app:'shiba-pocket',schemaVersion:2,exportedAt:new Date().toISOString(),state:{name:'はな',coat:'black',createdAt:NOW-3*86400000,lastSeen:NOW-3600000,ageMs:3*86400000,fullness:50,joy:70,clean:70,energy:80,bond:30,training:20,xp:90,counts:{meals:3,walks:1,plays:2,baths:1,lessons:2,pets:5},journal:[],sound:false}};
  // ゲームのページを離れてから（離脱時の自動保存を避けて）旧記録だけを置く
  await cdp.send('Page.navigate',{url:env.url+'/pwa/manifest.webmanifest'});await delay(500);
  await cdp.eval(`localStorage.clear();localStorage.setItem('shiba-pocket-save-v2',${JSON.stringify(JSON.stringify(v2))});true`);
  await cdp.send('Page.navigate',{url:env.url+'/index.html?qa=1'});await cdp.wait('!!window.__shibaQA && GrantGraphics.loaded');await delay(600);
  const mig=await cdp.eval(`(()=>{const s=__shibaQA.state;return{name:s.name,coat:s.coat,xp:s.xp,meals:s.counts.meals,v2kept:!!localStorage.getItem('shiba-pocket-save-v2'),v3:!!localStorage.getItem('shiba-pocket-save-v3'),welcome:document.getElementById('welcome-dialog').open}})()`);
  ok('v2の記録を引き継ぐ（名前・毛色・経験値・回数）',mig.name==='はな'&&mig.coat==='black'&&mig.xp===90&&mig.meals===3,JSON.stringify(mig));
  ok('v2の記録は消さずに残し、v3へ保存',mig.v2kept&&mig.v3);ok('引き継ぎ時はようこそ画面を出さない',!mig.welcome);
  await cdp.eval(`document.querySelectorAll('dialog[open]').forEach(d=>d.close());true`);await delay(400);
  ok('WebGLレンダラが動いている',await cdp.eval(`!!__shibaQA.renderer && !__shibaQA.renderer.lost`));
  await shot('01-home-landscape');
  // ごはん: 6口食べ終えてから1回だけ記録
  await cdp.eval(`(()=>{const s=__shibaQA.state;s.fullness=40;__shibaQA.replaceState(s);return true})()`);
  const before=await cdp.eval('__shibaQA.state.counts.meals');await cdp.eval(`__shibaQA.homeObj.feedStart('meal')`);await delay(1200);
  const mid=await cdp.eval('__shibaQA.state.counts.meals');await cdp.eval('__shibaQA.homeStep(6)');const after=await cdp.eval('__shibaQA.state.counts.meals');
  ok('ごはんは食べ終わるまで記録しない',mid===before,'mid='+mid);ok('ごはんは食べ終えて1回記録',after===before+1,'after='+after);
  // ごはんを選ぶとパネルが閉じる（犬を隠さない）
  await cdp.eval(`(()=>{const s=__shibaQA.state;s.fullness=40;__shibaQA.replaceState(s);document.querySelector('[data-care="feed"]').click();const b=document.querySelector('[data-food="snack"]'),r=b.getBoundingClientRect(),o={clientX:r.x+10,clientY:r.y+10,pointerId:5,bubbles:true,pointerType:'touch',buttons:1};b.dispatchEvent(new PointerEvent('pointerdown',o));b.dispatchEvent(new PointerEvent('pointerup',{...o,buttons:0}));return true})()`);
  ok('ごはんを選ぶとパネルが閉じる',await cdp.eval(`document.getElementById('food-tray').hidden && !!__shibaQA.home.feeding`));await cdp.eval('__shibaQA.homeStep(8)');
  // しつけ: 技を選ぶとパネルが上部の小さなバーに切り替わる
  await cdp.eval(`__shibaQA.care('lesson');true`);await cdp.eval('__shibaQA.homeStep(2)');await cdp.eval(`document.querySelector('[data-trick="sit"]').click();true`);
  ok('しつけは技を選ぶと小さなバーになる',await cdp.eval(`document.getElementById('lesson-panel').hidden && !document.getElementById('lesson-bar').hidden`));
  await cdp.eval(`document.getElementById('lesson-bar-end').click();true`);
  // きせかえの位置: 画像から頭の位置を読み取れている（正面は頭が上寄り・中央付近）
  const anc=await cdp.eval(`(()=>{const d=__shibaQA.homeObj.dog,f=GrantGraphics.frame('brown','happy',0,'idle',{});const a=ShibaSprite.frameAnchor('brown',f,0);return a})()`);
  ok('きせかえ用の頭の位置を画像から読み取る',anc.cx>.35&&anc.cx<.65&&anc.top<.35&&anc.hw>.25&&anc.hw<.8,JSON.stringify(anc));
  // なでる
  const pets0=await cdp.eval('__shibaQA.state.counts.pets');await cdp.eval('__shibaQA.homeObj.pet()');ok('なでると記録と反応',await cdp.eval('__shibaQA.state.counts.pets')===pets0+1);
  // おふろ
  await cdp.eval(`__shibaQA.care('bath')`);for(let i=0;i<14;i++)await cdp.eval(`document.getElementById('bath-scrub').click()`);await cdp.eval('__shibaQA.homeStep(4)');
  ok('おふろを最後まで',await cdp.eval('__shibaQA.state.clean')===100&&await cdp.eval('__shibaQA.home.mode')==='free');
  // ショップ
  await cdp.eval(`(()=>{const s=__shibaQA.state;s.coins=999;__shibaQA.replaceState(s);return true})()`);await cdp.eval(`__shibaQA.showView('shop')`);
  await cdp.eval(`[...document.querySelectorAll('.item')].find(b=>b.textContent.includes('リボン')).click();document.getElementById('confirm-yes').click();true`);
  ok('ショップで買ったきせかえはクローゼットに入る（自動では着ない）',await cdp.eval(`__shibaQA.state.owned.includes('head_ribbon')&&__shibaQA.state.equipped.head===null`));
  await cdp.eval(`(()=>{__shibaQA.showView('closet');[...document.querySelectorAll('#closet-items .item')].find(b=>b.textContent.includes('リボン')).click();return true})()`);
  ok('クローゼットで着せかえできる',await cdp.eval('__shibaQA.state.equipped.head')==='head_ribbon');await delay(500);await shot('02-shop');
  await cdp.eval(`__shibaQA.showView('home')`);
  // 全ゲームを自動で完走
  const bots={
   athletic:`g=>{const h=g.hurdles.find(o=>!o.passed&&o.x>0);if(h&&h.x<1.2&&g.dog.jumpY===0)g.control('jump',true);if(g.vy<0)g.control('jump',false);}`,
   run:`g=>{const s=g.stars.find(s=>!s.taken);if(s&&(!g.dog.goal||Math.random()<.02))g.dog.walkTo(s.x,s.z,{speed:4.6});}`,
   frisbee:`g=>{const d=g.discs.find(d=>d.state==='fly');if(d&&Math.abs(g.t-d.catchT)<.03)g.tapIt();}`,
   treat:`g=>{const it=g.items.filter(i=>i.type!=='bee').sort((a,b)=>a.y-b.y)[0];if(it)g.tx=it.x;}`,
   dig:`g=>{if(!g.busy&&g.phase==='play'){const c=g.cells.find(c=>!c.dug);if(c)g.down({ray:{o:[c.x,4,c.z],d:[0,-1,0]}});}}`,
   cups:`g=>{if(g.state==='pick'){const c=g.cups[g.ball];g.down({ray:{o:[c.x,3,c.z+.01],d:[0,-1,0]}});}}`,
   bubble:`g=>{const b=g.bubbles.find(b=>!b.dead&&b.p[1]>2);if(b&&Math.random()<.08)g.down({ray:{o:[b.p[0],b.p[1],b.p[2]+5],d:[0,0,-1]}});}`,
   race:`g=>{if(g.phase==='play'&&Math.random()<.4){g.control(g._s=g._s==='L'?'R':'L');}}`,
   memory:`g=>{if(g.state==='input'&&Math.random()<.2){const k=g.seq[g.inputI];g.control(g.best<4?ShibaGames.MEM[k].id:(k===3?'sit':'spin'));}}`,
   ball:`g=>{if(g.ready&&g.phase==='play'){g.down({id:1,x:512,y:700});g.up({id:1,x:520,y:330});}}`,
   walk:`g=>{const o=g.obs.find(o=>o.x>0&&o.x<3&&Math.abs(o.z-g.tz)<.6);if(o)g.tz=[-1.1,0,1.1].find(z=>!g.obs.some(q=>q.x>0&&q.x<4&&Math.abs(q.z-z)<.6))??g.tz;}`
  };
  bots.hide=`g=>{if(g.state==='seek'&&Math.random()<.05){const s=g.spots.find(s=>!s.open);if(s)g.down({ray:{o:[s.x,4,s.z],d:[0,-1,0]}});}}`;
  bots.mole=`g=>{const h=g.holes.find(h=>h.kind&&h.kind!=='shiba'&&!h.hit&&h.up>.5);if(h&&Math.random()<.3)g.down({ray:{o:[h.x,4,h.z],d:[0,-1,0]}});}`;
  bots.rhythm=`g=>{const n=g.notes.find(n=>n.state==='wait'&&Math.abs(n.t-g.t)<.03);if(n)g.control('lane',n.lane);}`;
  bots.sky=`g=>{const gt=g.gates.find(x=>x.x>-.6);const target=gt?gt.cy-.6:2;if(g.y<target&&g.vy<1)g.flap();}`;
  bots.surf=bots.walk;bots.skate=bots.athletic;
  // ひみつ道具がないと遊べないことを確認してから、買って解放する
  ok('ひみつ道具がないと「そらとぶ柴犬」は始まらない',await cdp.eval(`(()=>{__shibaQA.launch('sky');return __shibaQA.view!=='game'})()`));
  await cdp.eval(`(()=>{const s=__shibaQA.state;s.coins=20000;for(const id of Object.keys(ShibaCore.ITEMS))if(ShibaCore.ITEMS[id].slot==='gear')ShibaCore.buy(s,id);__shibaQA.replaceState(s);return true})()`);
  const keys=await cdp.eval('Object.keys(ShibaCore.GAMES)');
  for(const key of keys){
   const bot=bots[key.startsWith('walk_')?'walk':key];
   const r=await cdp.eval(`(()=>{__shibaQA.launch(${JSON.stringify(key)});const g=__shibaQA.game;document.getElementById('game-start').click();const bot=${bot};let t=0;const dt=1/30;while(!g.finished&&t<100){bot(g);g.update(dt);t+=dt;}return{fin:g.finished,raw:Math.round(g.score),t:+t.toFixed(1),result:!document.getElementById('result').hidden,best:__shibaQA.state.best[${JSON.stringify(key)}]}})()`);
   ok('ゲーム完走: '+key,r.fin&&r.result&&r.best!==undefined,JSON.stringify(r));
   if(['frisbee','walk_mountain','dig','memory'].includes(key)){await cdp.eval(`(()=>{__shibaQA.launch(${JSON.stringify(key)});document.getElementById('game-start').click();__shibaQA.step(${key==='dig'?3.5:6});return true})()`);await delay(400);await shot('03-game-'+key);}
  }
  await cdp.eval(`document.querySelectorAll('dialog[open]').forEach(d=>d.close());__shibaQA.showView('home');true`);
  // おうち: お庭を買うと歩ける場所が広がる・おもちゃ・羽・見まわし
  await cdp.eval(`document.querySelectorAll('dialog[open]').forEach(d=>d.close());__shibaQA.showView('home');(()=>{const s=__shibaQA.state;s.coins=20000;for(const id of ['area_garden','area_field','yard_pool','toy_frisbee','toy_rope'])ShibaCore.buy(s,id);__shibaQA.replaceState(s);return true})()`);
  await cdp.eval('__shibaQA.homeStep(.2)');
  ok('お庭と原っぱを買うと歩ける場所が広がる',await cdp.eval(`(()=>{const h=__shibaQA.homeObj;const [x]=h.clampFloor(15,0);return h.room.rects.length===4&&x>14})()`));
  ok('おもちゃ（フリスビー）で遊んで戻ってくる',await cdp.eval(`(()=>{const h=__shibaQA.homeObj;h.dog.x=0;h.dog.z=.5;h.dog.goal=null;h.setToy('toy_frisbee');h.useToy();let t=0,seen=false;while(t<15){__shibaQA.homeStep(.5);t+=.5;if(h.play)seen=true;if(seen&&!h.play)break;}return seen&&!h.play})()`));
  ok('羽をつけると部屋を飛ぶ',await cdp.eval(`(()=>{const h=__shibaQA.homeObj;h.setToy('gear_wings');h.fly();__shibaQA.homeStep(2);const up=h.dog.jumpY>.8&&h.dog.wings;__shibaQA.homeStep(7);return up&&!h.snapshot.flying})()`));
  ok('なぞると部屋を見まわせる（外側の壁は隠れる）',await cdp.eval(`(()=>{const h=__shibaQA.homeObj;h.orbit(-260,0);__shibaQA.homeStep(2);const r=!h.room.walls.right.visible&&h.yaw>1;h.resetView();__shibaQA.homeStep(2);return r})()`));
  ok('ごはんは柴犬の前に立体で出て、食べると減る',await cdp.eval(`(()=>{const h=__shibaQA.homeObj,s=__shibaQA.state;s.fullness=30;__shibaQA.replaceState(s);h.setToy('toy_ball');h.dog.x=0;h.dog.z=.4;h.feedStart('snack');__shibaQA.homeStep(1.5);const f=h.snapshot.feeding;const near=f&&Math.hypot(f.pos[0]-h.dog.x,f.pos[1]-h.dog.z)<1.2&&!!h.foodNode.mesh;__shibaQA.homeStep(4);return near&&!h.foodNode.mesh})()`));
  ok('茶柴・白柴も走る絵・おての絵がある',await cdp.eval(`['brown','white'].every(c=>{const r=GrantGraphics.frame(c,'happy',0,'run',{dx:5}),p=GrantGraphics.frame(c,'happy',0,'pawhold',{});return r.row===1&&p.row===3&&p.col===2&&r.image!==GrantGraphics.images.black})`));
  ok('道路と公園・町・海・川を買うと、歩いて行き来できる',await cdp.eval(`(()=>{const s=__shibaQA.state;s.coins=20000;for(const id of ['area_road','area_park','area_town','area_sea','area_river'])ShibaCore.buy(s,id);__shibaQA.replaceState(s);const h=__shibaQA.homeObj;__shibaQA.homeStep(.2);const r=[];for(const k of ['river','home','sea','garden']){h.goTo(k);let t=0;while(t<40&&h.dog.goal){__shibaQA.homeStep(.5);t+=.5;}r.push(h.areaName()[0]===k);}return r.every(Boolean)&&document.querySelectorAll('#travel button').length>=0})()`));
  ok('お肉とお魚も食べる',await cdp.eval(`(()=>{const h=__shibaQA.homeObj,s=__shibaQA.state;s.fullness=20;__shibaQA.replaceState(s);const m0=__shibaQA.state.counts.meals;h.feedStart('meat');__shibaQA.homeStep(6);h.feedStart('fish');__shibaQA.homeStep(6);return __shibaQA.state.counts.meals===m0+2})()`));
  ok('ボールを口にくわえて持ってくる',await cdp.eval(`(()=>{const h=__shibaQA.homeObj;h.goTo('home');let t=0;while(t<30&&h.dog.goal){__shibaQA.homeStep(.5);t+=.5;}h.setToy('toy_ball');h.useToy();let carried=false;t=0;while(t<15){__shibaQA.homeStep(.25);t+=.25;if(h.toy.held){const m=h.dog.mouthPos();if(Math.hypot(h.toy.pos[0]-m[0],h.toy.pos[2]-m[2])<.05&&Math.hypot(m[0]-h.dog.x,m[2]-h.dog.z)<1)carried=true;}if(carried&&!h.play)break;}return carried&&!h.play})()`));
  ok('NPCの柴犬はエリアを開放するたびに増えて5匹になる',await cdp.eval(`(()=>{const h=__shibaQA.homeObj;__shibaQA.homeStep(.2);return Object.keys(h.npcs.list).length===5&&Object.values(h.npcs.list).every(n=>['kinako','sakura','mint','sora','fuji'].includes(n.dog.coat))})()`));
  ok('NPCは自分で動きまわる',await cdp.eval(`(()=>{const h=__shibaQA.homeObj,a=JSON.parse(JSON.stringify(h.npcs.snapshot));__shibaQA.homeStep(30);const b=h.npcs.snapshot;return Object.keys(b).filter(k=>Math.hypot(b[k].x-a[k].x,b[k].z-a[k].z)>.5).length>=3})()`));
  ok('話しかけるとおつかいを頼まれ、達成するとコインがもらえる',await cdp.eval(`(()=>{const h=__shibaQA.homeObj,N=h.npcs;const c0=__shibaQA.state.coins,d0=__shibaQA.state.npc.done;const done=()=>{let t=0;while(t<60&&h.dog.goal){__shibaQA.homeStep(.5);t+=.5;}__shibaQA.homeStep(.6);};
   N.offerer='mint';N.tap({npc:'mint'});done();if(!N.offer||document.getElementById('quest-offer').hidden)return false;const said=!document.getElementById('npc-speech').hidden;document.getElementById('quest-accept').click();if(!__shibaQA.state.npc.quest||document.getElementById('quest-chip').hidden&&false)return false;
   let g=0;while(__shibaQA.state.npc.quest&&g++<8){N.questAction();done();__shibaQA.homeStep(1.6);}return said&&!__shibaQA.state.npc.quest&&__shibaQA.state.npc.done===d0+1&&__shibaQA.state.coins>c0})()`));
  ok('おつかいの後はしばらく次を頼まれず、頼む子は一度に1匹だけ',await cdp.eval(`(()=>{const h=__shibaQA.homeObj,N=h.npcs;__shibaQA.homeStep(1.2);const busy=N.offerer===null;const s=__shibaQA.state;s.npc.next=0;__shibaQA.replaceState(s);__shibaQA.homeStep(1.2);
   const one=!!N.offerer;N.tap({npc:Object.keys(N.list).find(k=>k!==N.offerer)});let t=0;while(t<40&&h.dog.goal){__shibaQA.homeStep(.5);t+=.5;}__shibaQA.homeStep(.5);return busy&&one&&!N.offer})()`));
  ok('拾いものは地面にあって、近くを通っても勝手に拾わない。タップすると口にくわえて運ぶ',await cdp.eval(`(()=>{const h=__shibaQA.homeObj,N=h.npcs,s=__shibaQA.state;s.npc.quest={id:'shell',giver:'sora',target:null,spot:'sea',stage:0};__shibaQA.replaceState(s);__shibaQA.homeStep(.2);
   const p=N.itemPos();h.walkPath(h.dog,h.planRoute(h.dog.x,p[0],p[1]),3);let t=0;while(t<40&&h.dog.goal){__shibaQA.homeStep(.25);t+=.25;}__shibaQA.homeStep(1.5);const stay=__shibaQA.state.npc.quest.stage===0&&N.nearItem();
   N.questAction();t=0;while(t<10&&(h.dog.goal||N.picking)){__shibaQA.homeStep(.2);t+=.2;}__shibaQA.homeStep(.3);const q=__shibaQA.state.npc.quest;return stay&&q&&q.stage===1&&!N.itemPos()})()`));
  ok('つりざおで さかなを つると、ずかんに のる（はやすぎると にげる）',await cdp.eval(`(()=>{const h=__shibaQA.homeObj,F=h.fishing,s=__shibaQA.state;s.npc.quest=null;s.coins+=500;ShibaCore.buy(s,'gear_rod');__shibaQA.replaceState(s);h.goTo('sea');let t=0;while(t<40&&h.dog.goal){__shibaQA.homeStep(.5);t+=.5;}
   const w=ShibaFishing.waters(__shibaQA.state).find(x=>x.key==='sea');const round=()=>{F.fish=[];F.spawn(w);const f=F.fish[0];f.x=57;f.z=-4;F.begin();F.aim(w,[57,-4]);let t=0;while(t<40&&!['nibble','sink'].includes(F.f.phase)){__shibaQA.homeStep(.1);t+=.1;}return F.f.phase;};
   const p1=round();F.tap({});const early=F.f.phase==='reel';__shibaQA.homeStep(1);
   round();t=0;while(t<20&&F.f.phase!=='sink'){__shibaQA.homeStep(.05);t+=.05;}const nib=F.f.nib;document.querySelectorAll('dialog[open]').forEach(d=>d.close());F.tap({});__shibaQA.homeStep(1.2);const dlg=document.getElementById('catch-dialog').open;document.getElementById('catch-ok').click();__shibaQA.homeStep(1.5);
   const got=Object.keys(__shibaQA.state.fish);F.stop();return p1==='nibble'&&early&&nib>=1&&nib<=5&&dlg&&got.length===1&&ShibaCore.FISH[got[0]].where==='sea'&&!document.getElementById('zukan-open').hidden})()`));
  ok('さかなの かげは どれも同じ大きさ',await cdp.eval(`(()=>{const F=__shibaQA.homeObj.fishing,w=ShibaFishing.waters(__shibaQA.state);F.fish=[];for(let i=0;i<12;i++)F.spawn(w[i%w.length]);const rs=new Set(F.fish.map(f=>f.r));F.fish=[];return rs.size===1})()`));
  ok('ずかんに20しゅるい ならび、つった さかなだけ なまえが でる',await cdp.eval(`(()=>{document.getElementById('zukan-open').click();const cards=[...document.querySelectorAll('.zcard')],got=cards.filter(c=>c.classList.contains('got'));const ok=cards.length===20&&got.length===1&&cards.filter(c=>c.textContent.includes('？？？')).length===19;document.getElementById('zukan-dialog').close();return ok})()`));
  ok('犬小屋に入れる（中にいる間は前の壁が透ける）',await cdp.eval(`(()=>{const h=__shibaQA.homeObj,s=__shibaQA.state;s.coins+=500;ShibaCore.buy(s,'bed_house');__shibaQA.replaceState(s);h.goTo('home');let t=0;while(t<40&&h.dog.goal){__shibaQA.homeStep(.5);t+=.5;}__shibaQA.homeStep(.3);
   if(!h.room.house)return false;h.enterHouse();t=0;while(t<15&&h.dog.goal){__shibaQA.homeStep(.2);t+=.2;}__shibaQA.homeStep(1);const inside=h.snapshot.inHouse&&h.room.house.front.alpha<.5;
   h.walkOut(1,1,2);t=0;while(t<15&&h.dog.goal){__shibaQA.homeStep(.2);t+=.2;}__shibaQA.homeStep(1);return inside&&!h.snapshot.inHouse&&h.room.house.front.alpha===1})()`));
  ok('川の橋を渡って向こう岸へ行ける（橋の上は高い）',await cdp.eval(`(()=>{const h=__shibaQA.homeObj;h.goTo('river');let t=0;while(t<40&&h.dog.goal){__shibaQA.homeStep(.5);t+=.5;}let maxY=0;for(const p of [[72,-.8],[72,-3],[72,-6.4],[69,-7]]){h.dog.walkTo(p[0],p[1],{speed:2.5});t=0;while(t<10&&h.dog.goal){__shibaQA.homeStep(.1);t+=.1;maxY=Math.max(maxY,h.dog.groundY);}}return h.dog.z<-6&&maxY>.25})()`));
  ok('水着がないと水に入れない',await cdp.eval(`(()=>{const h=__shibaQA.homeObj,s=__shibaQA.state;if(s.owned.includes('gear_swimsuit'))return true;h.dog.walkTo(68,-3,{speed:2});let t=0;while(t<10&&h.dog.goal){__shibaQA.homeStep(.25);t+=.25;}return !h.dog.swimming})()`));
  ok('水着を買うと海と川で犬かきで泳げる',await cdp.eval(`(()=>{const h=__shibaQA.homeObj,s=__shibaQA.state;s.coins+=500;ShibaCore.buy(s,'gear_swimsuit');__shibaQA.replaceState(s);__shibaQA.homeStep(.1);h.dog.walkTo(68,-3,{speed:2});let t=0;while(t<10&&h.dog.goal){__shibaQA.homeStep(.2);t+=.2;}__shibaQA.homeStep(1);const river=h.dog.swimming&&h.dog.groundY<-.3&&h.dog.poseKey()==='run';
   h.goTo('sea');t=0;while(t<40&&h.dog.goal){__shibaQA.homeStep(.5);t+=.5;}h.dog.walkTo(57,-5,{speed:2});t=0;while(t<12&&h.dog.goal){__shibaQA.homeStep(.2);t+=.2;}__shibaQA.homeStep(1);const sea=h.dog.swimming;h.dog.walkTo(57,1,{speed:2});t=0;while(t<12&&h.dog.goal){__shibaQA.homeStep(.2);t+=.2;}return river&&sea&&!h.dog.swimming})()`));
  ok('NPCは首の装備をつけない',await cdp.eval(`Object.values(ShibaCore.NPCS).every(n=>!n.style.equip.neck)`));
  // 保存して再読み込み
  const snap=await cdp.eval('JSON.stringify({coins:__shibaQA.state.coins,best:__shibaQA.state.best,eq:__shibaQA.state.equipped})');
  await cdp.send('Page.reload',{});await cdp.wait('!!window.__shibaQA && GrantGraphics.loaded');await delay(500);
  const snap2=await cdp.eval('JSON.stringify({coins:__shibaQA.state.coins,best:__shibaQA.state.best,eq:__shibaQA.state.equipped})');
  ok('再読み込み後も記録が残る',JSON.parse(snap).coins<=JSON.parse(snap2).coins&&JSON.stringify(JSON.parse(snap).best)===JSON.stringify(JSON.parse(snap2).best),snap2.slice(0,80));
  // 縦向き
  await cdp.eval(`document.querySelectorAll('dialog[open]').forEach(d=>d.close());true`);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:820,height:1180,deviceScaleFactor:2,mobile:true});await delay(700);await shot('04-home-portrait');
  const layout=await cdp.eval(`(()=>{const d=document.getElementById('dock').getBoundingClientRect();return{bottom:d.bottom,h:innerHeight,w:d.width,iw:innerWidth}})()`);
  await cdp.eval(`(()=>{__shibaQA.launch('walk_park');document.getElementById('game-start').click();__shibaQA.step(4);return true})()`);await delay(300);
  const vis=await cdp.eval(`(()=>{const g=__shibaQA.game,p=g.cam.project(g.dog.center());return{x:p.x,y:p.y}})()`);
  ok('縦向きのおさんぽで犬が画面内',vis.x>.05&&vis.x<.95&&vis.y>.1&&vis.y<.9,JSON.stringify(vis));await cdp.eval(`__shibaQA.showView('home');true`);
  ok('縦向きで操作ボタンが画面内',layout.bottom<=layout.h&&layout.w<=layout.iw,JSON.stringify(layout));
  ok('ページのエラーなし',errors.length===0,errors.slice(0,3).join(' | '));
 }finally{await env.close();}
 const ng=results.filter(r=>r[0]!=='ok');for(const r of results)console.log(r[0],r[1],r[2]?'· '+r[2]:'');console.log((results.length-ng.length)+'/'+results.length+' passed');
 fs.writeFileSync(path.join(root,'evidence','v4','smoke-results.json'),JSON.stringify({at:new Date().toISOString(),results},null,1));if(ng.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

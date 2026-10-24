/* しば日和 3D — 画面と状態をつなぐ。ユーザー文字列は textContent / value だけで扱う。 */
(function(){
'use strict';
const C=ShibaCore,AU=ShibaAudio,$=id=>document.getElementById(id),KEY3='shiba-pocket-save-v3',KEY2='shiba-pocket-save-v2';
const QA=new URLSearchParams(location.search).has('qa');
let state=C.fresh(),normalState=null,demo=false,storageOK=false,storageBlocked=false,firstRun=false;
let renderer=null,home=null,game=null,view='home',paused=false,last=0,hudT=0,speechT=0,toastTimer=0,confirmAction=null,celebrateQueue=[],playTab='play',shopTab='wear',slowT=0;
const particles=new Gfx.Particles(),canvas=$('gl');
/* iPadOS 14より前のSafari向け: replaceChildren が無ければ補う */
if(!Element.prototype.replaceChildren)Element.prototype.replaceChildren=function(...nodes){while(this.firstChild)this.removeChild(this.firstChild);for(const n of nodes)this.append(n);};
/* iPadOS 15.4より前のSafariには<dialog>がないので、最小限の代わりを用意する */
if(typeof HTMLDialogElement==='undefined'||typeof HTMLDialogElement.prototype.showModal!=='function'){
 for(const d of document.querySelectorAll('dialog')){
  Object.defineProperty(d,'open',{configurable:true,get(){return this.hasAttribute('open');}});
  d.showModal=function(){this.setAttribute('open','');this.classList.add('dlg-fallback');document.body.classList.add('dlg-open');};
  d.close=function(){if(!this.hasAttribute('open'))return;this.removeAttribute('open');this.classList.remove('dlg-fallback');if(!document.querySelector('dialog[open]'))document.body.classList.remove('dlg-open');this.dispatchEvent(new Event('close'));};
 }
}
/* iOSは指を離したとき・クリック時の操作で音を許可するので、そこでも音声を有効にする */
for(const ev of ['pointerup','touchend','click','keydown'])document.addEventListener(ev,()=>AU.unlock(),{capture:true,passive:true});
const STAGE_LABEL={puppy:'ころころ子犬',junior:'すくすく若犬',adult:'りっぱな成犬'};

/* ---------- 保存 ---------- */
function probeStorage(){
 try{const k=KEY3+'-probe';localStorage.setItem(k,'1');localStorage.removeItem(k);storageOK=true;}catch{storageOK=false;return;}
 const raw3=localStorage.getItem(KEY3),raw2=localStorage.getItem(KEY2),raw=raw3||raw2;
 if(!raw){firstRun=true;return;}
 try{state=C.validate(JSON.parse(raw));if(!raw3)toast('前の版の記録を引きついだよ。おかえりなさい！');}
 catch{storageBlocked=true;$('save-text').value=raw;toast('以前の記録を確認できません。設定で元のテキストを保管できます。');}
}
function save(){if(demo)return;if(storageOK&&!storageBlocked)try{localStorage.setItem(KEY3,JSON.stringify(C.pack(state)));}catch{storageOK=false;}updateSaveStatus();}
function updateSaveStatus(){$('save-status').textContent=demo?'おためし中 · いつもの記録は保護中':storageBlocked?'以前の記録を保護中 · 設定で確認してください':storageOK?'✓ この端末に自動保存中':'自動保存できません · 設定から記録を保存してね';}

/* ---------- 共通UI ---------- */
function toast(text,ms=3200){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').hidden=true;},ms);}
function say(text,ms=3200){
 if(game){$('game-status').textContent=text;clearTimeout(speechT);speechT=setTimeout(()=>{$('game-status').textContent='';},ms);return;}
 $('speech').textContent=text;$('speech').hidden=false;clearTimeout(speechT);speechT=setTimeout(()=>{$('speech').hidden=true;},ms);
}
function sceneCam(){return game?game.cam:home?.cam;}
function floatText(text,pos,cls=''){const cam=sceneCam();if(!cam)return;const p=cam.project(pos);if(!p.visible)return;const el=document.createElement('div');el.className='ft '+cls;el.textContent=text;el.style.left=(p.x*innerWidth)+'px';el.style.top=(p.y*innerHeight)+'px';$('fx').append(el);setTimeout(()=>el.remove(),1150);}
function callout(text,cls=''){const el=$('callout');el.hidden=true;el.className='callout '+cls;el.textContent=text;void el.offsetWidth;el.hidden=false;clearTimeout(el._t);el._t=setTimeout(()=>{el.hidden=true;},750);}
function celebrate(icon,title,copy,sound='fanfare'){celebrateQueue.push({icon,title,copy,sound});if(!$('celebrate-dialog').open)nextCelebrate();}
function nextCelebrate(){const c=celebrateQueue.shift();if(!c)return;$('cel-icon').textContent=c.icon;$('cel-title').textContent=c.title;$('cel-copy').textContent=c.copy;AU.play(c.sound);if(!anyDialogOpen())$('celebrate-dialog').showModal();else celebrateQueue.unshift(c);}
function anyDialogOpen(){return!!document.querySelector('dialog[open]');}
function afterChange(r){
 if(!r)return;if(r.levelUp)celebrate('🎉','レベル'+r.levelUp+'になった！',levelCopy(r.levelUp),'levelup');
 for(const id of r.stamps||[]){const s=C.STAMPS[id];toast('🏅 スタンプ「'+s.name+'」をゲット！ +'+20+'コイン');AU.play('stamp');}
 render();save();
}
function levelCopy(lv){const t=Object.values(C.TRICKS).find(t=>t.level===lv);return(t?'新しい技「'+t.name+'」を覚えられるようになったよ。':'なかよしが深まったね。')+' ごほうびに'+lv*10+'コイン。';}
function act(type,arg){const r=C.act(state,type,arg);if(r?.message&&!game)say(r.message,2600);afterChange(r);return r;}

/* ---------- HUD描画 ---------- */
function render(){
 const s=state,st=C.stage(s),lp=C.levelProgress(s);
 $('dog-name').textContent=s.name;$('stage-label').textContent=STAGE_LABEL[st];$('lv-badge').textContent='Lv.'+lp.level;$('xp-bar').style.width=(lp.ratio*100)+'%';$('xp-label').textContent='つぎのレベルまで '+(lp.need-lp.current);
 $('coin-pill').textContent='🪙 '+s.coins;$('shop-coins').textContent='🪙 '+s.coins;$('day-label').textContent=(Math.floor(s.ageMs/C.DAY)+1)+'日目';
 $('mood-label').textContent={happy:'ごきげん ♡',sad:'しょんぼり…',grumpy:'ひとやすみしたい'}[C.mood(s)];
 const defs=[['fullness','🍖','おなか','#e0b070'],['joy','💛','ごきげん','#a8c486'],['clean','🫧','きれい','#8fc2cf'],['energy','⚡','げんき','#c9a3c3']];
 const box=$('stats');if(!box.children.length){for(const [k,ic,l,col]of defs){const row=document.createElement('div');row.className='stat';row.dataset.k=k;const i=document.createElement('span');i.className='ic';i.textContent=ic;const right=document.createElement('div');const lab=document.createElement('div');lab.className='lab';const a=document.createElement('span');a.textContent=l;const b=document.createElement('b');lab.append(a,b);const m=document.createElement('div');m.className='meter';m.setAttribute('role','meter');m.setAttribute('aria-label',l);m.setAttribute('aria-valuemin','0');m.setAttribute('aria-valuemax','100');const bar=document.createElement('i');bar.style.background=col;m.append(bar);right.append(lab,m);row.append(i,right);box.append(row);}}
 for(const row of box.children){const k=row.dataset.k,v=Math.round(s[k]);row.querySelector('b').textContent=v;const m=row.querySelector('.meter');m.setAttribute('aria-valuenow',String(v));const bar=m.firstChild;bar.style.width=v+'%';bar.classList.toggle('low',v<30);}
 const pending=s.daily.missions.some(m=>m.done&&!m.claimed);$('mission-badge').hidden=!pending;$('zukan-open').hidden=!s.owned.includes('gear_rod');
 updateSaveStatus();
}

/* ---------- 画面切りかえ ---------- */
function hideSheets(){$('food-tray').hidden=true;$('toy-tray').hidden=true;$('bath-panel').hidden=true;$('lesson-panel').hidden=true;$('lesson-bar').hidden=true;}
function leaveHomeModes(msg){home.cancelFeed(msg);home.endBath();home.endLesson();home.fishing.stop();hideSheets();$('speech').hidden=true;$('npc-speech').hidden=true;$('quest-offer').hidden=true;home.npcs.offer=null;}
function showView(next,tab){
 if(game&&next!=='game'){game=null;particles.clear();document.body.classList.remove('in-game');$('fx').replaceChildren();}
 if(next!=='home'&&next!=='shop'&&next!=='closet')leaveHomeModes('途中の食べものを片づけたよ。記録は増えていません。');
 if(next!=='photo')stopCamera();
 view=next;paused=false;
 $('home-hud').hidden=!(next==='home');$('play-view').hidden=next!=='play';$('game-hud').hidden=next!=='game';$('shop-view').hidden=next!=='shop';$('closet-view').hidden=next!=='closet';$('photo-view').hidden=next!=='photo';
 for(const id of ['home-hud','play-view','game-hud','shop-view','closet-view','photo-view'])$(id).classList.toggle('active',!$(id).hidden);
 home.focusT=next==='shop'||next==='closet'?1:0;
 if(next==='closet')renderCloset();
 if(next==='play'){if(tab)playTab=tab;renderGames();}
 if(next==='shop')renderShop();
 if(next==='photo')drawPhoto();
 if(next==='home'){home.syncDog();render();}
}

/* ---------- おせわボタン ---------- */
function care(kind){
 AU.play('tap');
 if(kind==='play'||kind==='walk'){showView('play',kind);return;}
 if(kind==='shop'){showView('shop');return;}
 if(kind==='photo'){showView('photo');return;}
 if(kind==='closet'){showView('closet');return;}
 const panel={feed:'food-tray',toys:'toy-tray',bath:'bath-panel',lesson:'lesson-panel'}[kind],was=panel?(!$(panel).hidden||(kind==='lesson'&&!$('lesson-bar').hidden)):false;
 leaveHomeModes();if(was)return;
 if(kind==='feed'){$('food-tray').hidden=false;$('feeding-status').textContent='食べものを選ぶと、柴犬の前に置くよ。ドラッグで好きな場所にも置ける。';}
 if(kind==='toys'){renderToys();$('toy-tray').hidden=false;}
 if(kind==='bath'){home.startBath();$('bath-panel').hidden=false;}
 if(kind==='lesson'){home.startLesson();buildTricks();$('lesson-panel').hidden=false;$('lesson-msg').textContent='ことばを選んでね';$('praise').disabled=true;$('praise').textContent='できたら ほめる';$('wait-ok').hidden=true;}
 if(kind==='rest')home.startRest();
}
function buildTricks(){const box=$('tricks');box.replaceChildren();for(const [id,t]of Object.entries(C.TRICKS)){const b=document.createElement('button');const ok=C.trickUnlocked(state,id);b.className=ok?'':'locked';b.dataset.trick=id;const sp=document.createElement('span');sp.textContent=ok?t.icon:'🔒';const nm=document.createElement('div');nm.textContent=ok?t.name:'Lv.'+t.level;const bar=document.createElement('small'),bi=document.createElement('i');bi.style.width=(state.tricks[id]||0)+'%';bar.append(bi);b.append(sp,nm,bar);
 b.addEventListener('click',()=>{if(!ok){toast('「'+t.name+'」はレベル'+t.level+'で覚えられるよ。');return;}if(home.lesson?.busy)return;$('praise').disabled=true;$('praise').textContent='できたら ほめる';$('wait-ok').hidden=id!=='wait';$('wait-ok').disabled=false;$('wait-ok').textContent='よし！';$('lesson-msg').textContent=id==='wait'?'まて… 1.5秒がまんしたら「よし！」':'「'+t.name+'」！';$('lesson-panel').hidden=true;$('lesson-bar').hidden=false;$('lesson-bar-title').textContent=t.icon+' '+t.name;$('lesson-bar-msg').textContent=id==='wait'?'1.5秒がまんしたら「よし！」':'柴犬をよく見てね';home.command(id);});box.append(b);}}
const appHooks={
 feedStatus(t){$('feeding-status').textContent=t;},
 feedDone(kind){const r=act('feed',kind);$('feeding-status').textContent=r.ok?'ごちそうさま！ 全部食べたね。':'おなかいっぱい。またあとで食べよう。';},
 bathProgress(v,stage){if(v===null){$('bath-panel').hidden=true;return;}$('bath-bar').style.width=(v*100)+'%';$('bath-step').textContent=stage==='foam'?'柴犬を指でごしごし（あわあわ '+Math.round(v*100)+'%）':'シャワーで流そう（'+Math.round(v*100)+'%）';$('bath-scrub').textContent=stage==='foam'?'やさしく洗う':'シャワーで流す';},
 bathDone(){act('bath');$('bath-step').textContent='ぴかぴか、ふわふわ！';},
 lessonResult(ok,trick){if(ok){$('praise').disabled=false;$('praise').textContent='ほめる！';$('lesson-bar-msg').textContent='できたよ！ ほめてあげよう（柴犬タップでもOK）';}else{const r=act('lessonMiss',trick);$('lesson-bar-msg').textContent='おしい！ 「技をえらぶ」からもう一度';say(r.message||'おしい！',1800);buildTricks();}},
 lessonPraise(){const t=home.praise();if(!t)return;$('praise').disabled=true;$('praise').textContent='できたら ほめる';act('lesson',t);$('lesson-bar-msg').textContent='とっても上手！ 「'+C.TRICKS[t].name+'」が上達したよ';buildTricks();},
 lessonWaitReady(){$('wait-ok').textContent='よし！（いまだ！）';$('lesson-bar-msg').textContent='いまだ！「よし！」';},
 restDone(){say('すやすや… げんきが もどって きたよ。');}
};

/* ---------- おもちゃ ---------- */
function renderToys(){const box=$('toy-list');box.replaceChildren();const ids=Object.keys(C.ITEMS).filter(id=>C.ITEMS[id].slot==='toy'&&state.owned.includes(id));if(state.owned.includes('gear_wings'))ids.push('gear_wings');
 for(const id of ids){const it=C.ITEMS[id],b=document.createElement('button');b.className=home.toyId===id?'on':'';const i=document.createElement('span');i.textContent=it.icon;const sm=document.createElement('small');sm.textContent=id==='gear_wings'?'柴犬をタップで飛ぶ':(it.desc||'');b.append(i,document.createTextNode(it.name),sm);
  b.addEventListener('click',()=>{home.setToy(id);$('toy-tray').hidden=true;});box.append(b);}
 const missing=Object.keys(C.ITEMS).filter(id=>C.ITEMS[id].slot==='toy'&&!state.owned.includes(id)).length;$('toy-msg').textContent=missing?'ショップにあと'+missing+'種類のおもちゃがあるよ。':'おもちゃを全部そろえたね！';}
/* ---------- クローゼット（きせかえ・けいろ） ---------- */
const COATS=[['brown','茶柴'],['black','黒柴'],['white','白柴']];
function coatPicker(box,current,onPick){box.replaceChildren();for(const [coat,label]of COATS){const b=document.createElement('button');b.type='button';b.className=coat===current?'on':'';b.dataset.coat=coat;const cv=document.createElement('canvas');cv.width=cv.height=168;const c=cv.getContext('2d');ShibaArt.drawDog(c,84,100,120,coat,'adult','happy',0,'idle',false,{});b.append(cv,document.createTextNode(label));b.addEventListener('click',()=>{box.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));onPick(coat);});box.append(b);}}
function renderCloset(){
 coatPicker($('coat-pick'),state.coat,coat=>{state.coat=coat;afterLoad();save();home.dog.play('happy',1.2);$('closet-msg').textContent=COATS.find(c=>c[0]===coat)[1]+'になったよ。成長してもこの毛色のままだよ。';});
 const box=$('closet-items');box.replaceChildren();const own=Object.entries(C.ITEMS).filter(([id,it])=>C.WEAR_SLOTS.includes(it.slot)&&!it.retired&&state.owned.includes(id));
 if(!own.length){const p=document.createElement('p');p.className='small';p.textContent='まだ何もないよ。ショップの「きせかえ」で買うとここに入るよ。';box.append(p);}
 for(const [id,it]of own){const on=state.equipped[it.slot]===id,b=document.createElement('button');b.className='item owned'+(on?' on':'');const i=document.createElement('span');i.className='ii';i.textContent=it.icon;const n=document.createElement('span');n.textContent=it.name;const q=document.createElement('span');q.className='ip';q.textContent=on?'きている ✓':{neck:'くび',head:'あたま',face:'かお'}[it.slot];b.append(i,n,q);
  b.addEventListener('click',()=>{C.equip(state,id);AU.play('tap');home.syncDog();home.dog.play('happy',1);afterChange({stamps:C.checkStamps(state)});renderCloset();$('closet-msg').textContent=on?it.name+'をぬいだよ。':it.name+'を着たよ！';});box.append(b);}
}
/* ---------- ごはんのドラッグ ---------- */
let foodDrag=null;
function foodDown(e,kind){e.preventDefault();AU.unlock();foodDrag={id:e.pointerId,kind,x:e.clientX,y:e.clientY,moved:0,el:e.currentTarget};try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}$('food-ghost').textContent={meal:'🍚',snack:'🍪',milk:'🥛',meat:'🍖',fish:'🐟'}[kind];}
function foodMove(e){const d=foodDrag;if(!d||d.id!==e.pointerId)return;d.moved=Math.max(d.moved,Math.hypot(e.clientX-d.x,e.clientY-d.y));if(d.moved>16){const g=$('food-ghost');g.hidden=false;g.style.left=e.clientX+'px';g.style.top=e.clientY+'px';}}
function foodUp(e){const d=foodDrag;if(!d||d.id!==e.pointerId)return;foodDrag=null;$('food-ghost').hidden=true;try{d.el.releasePointerCapture(e.pointerId);}catch{}
 if(d.moved<=16){if(home.feedStart(d.kind))$('food-tray').hidden=true;return;}const el=document.elementFromPoint(e.clientX,e.clientY);if(el!==canvas){$('feeding-status').textContent='柴犬のところまで持っていってね。食べものは減っていないよ。';return;}if(home.dropFood(d.kind,pointerInfo(e,home.cam)))$('food-tray').hidden=true;}

/* ---------- 入力（キャンバス） ---------- */
const pointers=new Map();let pinch0=0;
function pointerInfo(e,cam){const x=e.clientX,y=e.clientY,nx=x/innerWidth*2-1,ny=1-y/innerHeight*2;return{id:e.pointerId,x,y,nx,ny,ray:cam.ray(nx,ny),pressed:pointers.has(e.pointerId)};}
function target(){if(view==='game'&&game&&!paused)return game;if((view==='home'||view==='shop')&&home)return home;return null;}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();AU.unlock();try{canvas.setPointerCapture(e.pointerId);}catch{}pointers.set(e.pointerId,[e.clientX,e.clientY]);
 if(pointers.size===2&&view!=='game'){const [a,b]=[...pointers.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);home.cancelPointer();return;}
 const t=target();if(t)t.down(pointerInfo(e,t.cam));});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);
 if(pointers.size===2&&pinch0&&view!=='game'){const [a,b]=[...pointers.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);home.pinch(d/pinch0);pinch0=d;return;}
 const t=target();if(t)t.move(pointerInfo(e,t.cam));});
function pointerEnd(e){if(!pointers.has(e.pointerId))return;const t=target();if(t&&pointers.size===1)t.up(pointerInfo(e,t.cam));pointers.delete(e.pointerId);if(pointers.size<2)pinch0=0;}
canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);home?.cancelPointer();});
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});

/* ---------- あそび選択 ---------- */
function renderGames(){
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===playTab));
 const box=$('games');box.replaceChildren();
 for(const [key,g]of Object.entries(C.GAMES)){if((playTab==='walk')!==(g.kind==='walk'))continue;
  const b=document.createElement('button');b.className='gcard';b.dataset.game=key;const i=document.createElement('span');i.className='gi';i.textContent=g.icon;const n=document.createElement('b');n.textContent=g.name;const p=document.createElement('p');p.textContent=g.desc;const st=document.createElement('span');st.className='gstars';const got=state.stars[key]||0;for(let k=0;k<3;k++){const s=document.createElement('span');s.textContent='★';if(k<got)s.className='on';st.append(s);}
  const locked=!C.unlocked(state,key);if(locked){b.classList.add('locked');const lk=document.createElement('span');lk.className='lock';lk.textContent='🔒 ショップの「'+C.ITEMS[g.unlock].name+'」で解放';b.append(i,n,p,lk);b.addEventListener('click',()=>{toast('「'+g.name+'」は、ショップのひみつ道具「'+C.ITEMS[g.unlock].name+'」を買うと遊べるよ。');});box.append(b);continue;}
  b.append(i,n,p,st);if(state.best[key]!==undefined){const best=document.createElement('span');best.className='gbest';best.textContent='ベスト '+state.best[key];b.append(best);}else{const nw=document.createElement('span');nw.className='new';nw.textContent='NEW';b.append(nw);}
  b.addEventListener('click',()=>{AU.play('tap');launch(key);});box.append(b);}
}
/* ---------- ミニゲーム ---------- */
function launch(key){
 if(!C.unlocked(state,key)){toast('この遊びはまだ解放されていないよ。');return;}
 particles.clear();$('fx').replaceChildren();game=null;
 try{game=ShibaGames.create(app,key,$('difficulty').value);}catch(e){console.error(e);toast('この遊びを開始できませんでした。');return;}
 showView('game');document.body.classList.add('in-game');const g=C.GAMES[key];$('game-title').textContent=g.icon+' '+g.name;$('game-left').textContent='';$('game-right').textContent='';$('game-status').textContent='';
 buildControls(game.controls);overlay('ready',g);
}
function overlay(kind,g){const o=$('game-overlay');o.hidden=kind==='none';$('result').hidden=true;if(kind==='none')return;
 $('overlay-icon').textContent=kind==='paused'?'☕':g.icon;$('overlay-title').textContent=kind==='paused'?'ひとやすみ中':g.name;$('overlay-copy').textContent=kind==='paused'?(g.reason||'準備ができたら、つづけよう。'):g.desc+howTo(game?.key);
 $('game-start').textContent=kind==='paused'?'つづける':'スタート';$('game-quit').hidden=kind!=='paused';}
function howTo(key){if(!key)return'';if(key.startsWith('walk_'))return' 上下になぞってレーン移動、タップかボタンでジャンプ。ゴールまで走ろう。';return{ball:' 画面を下から上へ指ではじくと投げられるよ。強さと向きで飛び方が変わる。',athletic:' 長押しするほど高く跳べるよ。',run:' 行きたいところを指でなぞってね。おともだちに近づくとあいさつ。',frisbee:' 白い輪がちょうど小さくなった瞬間にタップ！',treat:' 指で左右に動かして、口でキャッチ。',dig:' 土の山をタップすると掘るよ。ハズレのあとは犬がにおいでヒントをくれる。',cups:' ボールが入った箱を見失わないで。ヒントは1回だけ。',bubble:' シャボン玉をタップ。金色は+5、虹色はまわりもまとめてわれる。',race:' 下の左右ボタンを交互に連打！ 同じ側を続けて押すとつまずくよ。',memory:' 柴犬の技の順番をおぼえて、ボタンで同じ順に。',hide:' しげみをタップ。ハズレのときは、近いと鳴き声が大きくなるよ。',mole:' もぐらをタップ。柴犬をタップすると減点。',rhythm:' 輪が重なった瞬間に、音符と同じ色のボタンをタップ。',sky:' タップでパタパタ上がる。雲と鳥をよけて星を集めよう。',surf:' 上下になぞってコースを変える。大きな波でジャンプ！',skate:' タップでジャンプ、長押しで大ジャンプ。コーンを飛びこえよう。'}[key]||'';}
function buildControls(c){const box=$('gcontrols');box.replaceChildren();if(!c)return;
 const mk=(cls,html,label)=>{const b=document.createElement('button');b.className=cls;b.textContent=html;if(label)b.setAttribute('aria-label',label);box.append(b);return b;};
 if(c.type==='jump'){const b=mk('jump primary',c.label||'ジャンプ！');b.addEventListener('pointerdown',e=>{e.preventDefault();AU.unlock();game?.control('jump',true);});for(const ev of ['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,()=>game?.control('jump',false));}
 if(c.type==='race'){for(const [id,t]of [['L','🐾 ひだり'],['R','みぎ 🐾']]){const b=mk('pad '+id.toLowerCase(),t);b.addEventListener('pointerdown',e=>{e.preventDefault();AU.unlock();game?.control(id);});}}
 if(c.type==='memory'){const cols=['#e05d6f','#4a90d9','#e8a33d','#6fae6a'],ic=['🪑','🐾','⬇️','🌀'];c.items.forEach((it,k)=>{const b=document.createElement('button');b.className='mem';b.style.background=cols[k];const s=document.createElement('span');s.textContent=ic[k];b.append(s,document.createTextNode(it.label));b.dataset.mem=k;b.addEventListener('pointerdown',e=>{e.preventDefault();AU.unlock();game?.control(it.id);flashMem(k);});box.append(b);});}
 if(c.type==='rhythm'){const cols=['#e05d6f','#4a90d9','#6fae6a'];[0,1,2].forEach(k=>{const b=document.createElement('button');b.className='mem';b.style.background=cols[k];const sp=document.createElement('span');sp.textContent=['🔴','🔵','🟢'][k];b.append(sp,document.createTextNode(['ワン','ワワン','クーン'][k]));b.dataset.mem=k;b.addEventListener('pointerdown',e=>{e.preventDefault();AU.unlock();game?.control('lane',k);flashMem(k);});box.append(b);});}
 if(c.type==='hint'){const b=mk('hint',c.label);b.addEventListener('click',()=>{game?.control('hint');b.disabled=true;});}
}
function flashMem(k){const b=document.querySelector('[data-mem="'+k+'"]');if(!b)return;b.classList.add('lit');setTimeout(()=>b.classList.remove('lit'),380);}
function gameEnd(res){
 if(!game||game.key!==res.key)return;const diff=$('difficulty').value,r=C.reward(state,res.key,res.raw,diff);const g=C.GAMES[res.key];
 $('result').hidden=false;$('game-overlay').hidden=true;const stars=$('res-stars').children;for(let i=0;i<3;i++)stars[i].className=i<r.stars?'on':'';
 $('res-title').textContent=r.stars===3?'すばらしい！':r.stars===2?'よくできました！':r.stars===1?'おつかれさま！':'たのしかったね！';$('res-score').textContent=r.raw+' ポイント';$('res-detail').textContent=res.detail||'';
 const badges=$('res-badges');badges.replaceChildren();const add=(t,c='')=>{const s=document.createElement('span');s.textContent=t;s.className=c;badges.append(s);};
 add('🪙 +'+r.coins);add('✨ 経験値 +'+r.xp,'g');if(r.newBest&&r.prevBest!==undefined)add('🏆 ベスト更新！','r');if(r.prevBest===undefined)add('🎈 はじめてのきろく','g');if(r.levelUp)add('🎉 レベル'+r.levelUp+'！','r');
 for(const id of r.stamps)add('🏅 '+C.STAMPS[id].name,'g');
 AU.play(r.stars>=2?'fanfare':r.stars===1?'good':'lose');if(r.levelUp)setTimeout(()=>AU.play('levelup'),900);
 game.dog.play('happy',3);game.dog.forceSpeed=null;
 render();save();if(r.levelUp)celebrate('🎉','レベル'+r.levelUp+'になった！',levelCopy(r.levelUp),'levelup');
}
function pauseGame(reason){if(!game||game.finished||game.phase==='ready'||paused)return;paused=true;overlay('paused',{reason});}

/* ---------- ショップ ---------- */
const SHOP_TABS={wear:C.WEAR_SLOTS,room:[...C.ROOM_SLOTS,'deco'],yard:['area','yard'],toy:['toy'],gear:['gear']};
function renderShop(){
 document.querySelectorAll('[data-shop]').forEach(b=>b.classList.toggle('on',b.dataset.shop===shopTab));$('shop-coins').textContent='🪙 '+state.coins;
 const box=$('items');box.replaceChildren();const slots=SHOP_TABS[shopTab]||C.WEAR_SLOTS;
 for(const [id,it]of Object.entries(C.ITEMS)){if(!slots.includes(it.slot)||it.retired)continue;const owned=state.owned.includes(id),wear=C.WEAR_SLOTS.includes(it.slot),toggle=C.MULTI_SLOTS.includes(it.slot)||C.ROOM_SLOTS.includes(it.slot),on=toggle&&(C.MULTI_SLOTS.includes(it.slot)?state.deco.includes(id):state.equipped[it.slot]===id),needs=it.needs&&!state.owned.includes(it.needs);
  const b=document.createElement('button');b.className='item'+(owned?' owned':'')+(on?' on':'')+(needs?' locked':'');const i=document.createElement('span');i.className='ii';i.textContent=it.icon;const n=document.createElement('span');n.textContent=it.name;const p=document.createElement('span');p.className='ip';
  p.textContent=on?'おいている ✓':owned?(wear?'クローゼットにあるよ':toggle?'しまってある':'もっている ✓'):needs?'🔒 「'+C.ITEMS[it.needs].name+'」が先':(it.level&&C.level(state)<it.level?'🔒 Lv.'+it.level:'🪙 '+it.price);b.append(i,n,p);
  if(it.desc&&!owned){const d=document.createElement('span');d.className='idesc';d.textContent=it.desc;b.append(d);}
  b.addEventListener('click',()=>{if(owned){if(wear){showView('closet');return;}if(!toggle){if(it.slot==='toy'){showView('home');home.setToy(id);}else if(id==='gear_wings'){showView('home');home.setToy(id);}else toast(it.desc||it.name+'をもっているよ。');return;}
    C.equip(state,id);AU.play('tap');afterChange({stamps:C.checkStamps(state)});renderShop();$('shop-msg').textContent=on?it.name+'をしまったよ。':it.name+'をおいたよ！';return;}
   if(needs){toast('先に「'+C.ITEMS[it.needs].name+'」を買ってね。');return;}
   if(it.level&&C.level(state)<it.level){toast('レベル'+it.level+'から買えるよ。');return;}if(state.coins<it.price){toast('コインが足りないよ。あそんで集めよう！');AU.play('miss');return;}
   confirmation(it.name+'を買う？','🪙 '+it.price+'コインで買います。（いまのコイン：'+state.coins+'）',()=>{const r=C.buy(state,id);if(r.ok){AU.play('coin');home.syncDog();home.dog.play('happy',1.4);toast(r.message);afterChange({stamps:r.stamps});renderShop();if(it.slot==='area'){showView('home');home.resetView();home.yawT=.55;home.zoomT=1.3;}}else toast(r.message);},'買う');});
  box.append(b);}
}

/* ---------- おねがい・スタンプ ---------- */
function renderMissions(){const ul=$('missions');ul.replaceChildren();$('streak-label').textContent='なかよし '+state.daily.streak+'日れんぞく · 毎日ひらくとボーナス';
 for(const m of state.daily.missions){const def=C.MISSIONS[m.id];const li=document.createElement('li');li.className=m.done?'done':'';const t=document.createElement('div');t.className='mt';const b=document.createElement('b');b.textContent=def.label;const sm=document.createElement('small');sm.textContent=m.progress+' / '+def.goal;const bar=document.createElement('div');bar.className='mbar';const bi=document.createElement('i');bi.style.width=(m.progress/def.goal*100)+'%';bar.append(bi);t.append(b,sm,bar);
  const btn=document.createElement('button');btn.className=m.done&&!m.claimed?'primary':'secondary';btn.textContent=m.claimed?'うけとった':m.done?'うけとる +'+C.MISSION_REWARD:'まだ';btn.disabled=!m.done||m.claimed;btn.addEventListener('click',()=>{const g=C.claimMission(state,m.id);if(g){AU.play('coin');toast('🪙 +'+g+'コイン！'+(g>C.MISSION_REWARD?' 全部クリアのボーナスつき！':''));afterChange({stamps:C.checkStamps(state)});renderMissions();}});li.append(t,btn);ul.append(li);}}
function renderStamps(){const box=$('stamps');box.replaceChildren();const all=Object.entries(C.STAMPS);$('stamp-count').textContent=state.stamps.length+' / '+all.length+' こ あつめたよ（1こ +20コイン）';
 for(const [id,s]of all){const d=document.createElement('div');d.className='stamp'+(state.stamps.includes(id)?' got':'');const i=document.createElement('span');i.textContent=s.icon;d.append(i,document.createTextNode(s.name));box.append(d);}
 const rec=$('records');rec.replaceChildren();for(const [k,g]of Object.entries(C.GAMES)){const d=document.createElement('div');const st=state.stars[k]||0;d.textContent=g.icon+' '+g.name+' ';const b=document.createElement('b');b.textContent='★'.repeat(st)+'☆'.repeat(3-st);d.append(b,document.createTextNode(state.best[k]!==undefined?' ベスト'+state.best[k]:' まだ'));rec.append(d);}}

/* ---------- 設定 ---------- */
function syncSettings(){$('name-input').value=state.name;document.querySelectorAll('[name=coat]').forEach(e=>e.checked=e.value===state.coat);$('sound-toggle').textContent='効果音：'+(state.sound?'あり':'なし');$('music-toggle').textContent='BGM：'+(state.music?'あり':'なし');$('settings-message').textContent=storageBlocked?'以前の記録は自動で置きかえません。テキスト欄の内容を保存し、読み込みかリセットを選んでください。':demo?'おためし中です。この記録を通常の子に上書きしません。':'';
 const jl=$('journal-list');jl.replaceChildren();const rows=state.journal.length?state.journal:[{at:state.createdAt,text:'今日から、いっしょの暮らし。'}];for(const row of rows){const li=document.createElement('li'),sm=document.createElement('small');sm.textContent=new Date(row.at).toLocaleDateString('ja-JP');li.append(sm,document.createTextNode(row.text));jl.append(li);}}
function confirmation(title,copy,fn,label='置きかえる'){$('confirm-title').textContent=title;$('confirm-copy').textContent=copy;$('confirm-yes').textContent=label;confirmAction=fn;$('confirm-dialog').showModal();}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.rel='noopener';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function exportData(){const data=JSON.stringify(C.pack(state),null,2);$('save-text').value=data;download(new Blob([data],{type:'application/json'}),'shiba-record-v3.json');$('settings-message').textContent=(demo?'おためしの':'いつもの')+'記録を用意しました。保存できない場合は、テキスト欄をコピーしてください。';return data;}
function importData(text){if(demo){$('settings-message').textContent='記録を読み込む前に、おためしを終了してください。';return false;}
 try{if(typeof text!=='string'||text.length>200000)throw Error('size');const next=C.validate(JSON.parse(text.replace(/^﻿/,'').trim()));confirmation('この記録を読み込みますか？','今の子の記録を置きかえます。先に「記録を保存」でバックアップできます。',()=>{state=next;C.advance(state);storageBlocked=false;afterLoad();save();syncSettings();$('settings-message').textContent='記録を読み込みました。';});return true;}
 catch{$('settings-message').textContent='読み込めませんでした。今の記録はそのままです。JSON形式・バージョン・値を確認してください。';return false;}}
function enterDemo(kind){if(!demo){normalState=state;state=C.clone(state);demo=true;}state.lastSeen=Date.now();if(['puppy','junior','adult'].includes(kind))state.ageMs=kind==='puppy'?0:kind==='junior'?3*C.DAY:7*C.DAY;if(kind==='happy'){state.joy=90;state.energy=90;state.clean=90;state.fullness=70;}if(kind==='sad'){state.joy=20;state.fullness=22;state.energy=70;state.clean=70;}if(kind==='grumpy'){state.energy=15;state.clean=25;state.joy=60;}$('settings-dialog').close();showView('home');say('おためしで、ようすを みて みよう。');afterLoad();toast('おためし中 · いつもの記録には保存されません');}
function exitDemo(){if(!demo)return;state=normalState;normalState=null;demo=false;C.advance(state);showView('home');afterLoad();save();say('ただいま。いつもの きろくに もどったよ。');}
function afterLoad(){AU.setSfx(state.sound);AU.setMusic(state.music);home.syncDog();home.rebuild(true);render();}

/* ---------- 写真 ---------- */
let camera=null,cameraRequest=0,photo=null,photoHasDog=true,photoDog={x:.74,y:.74,size:.32},photoPose='idle',photoDrag=null,photoURL=null,photoRequest=0;
function stopCamera(){cameraRequest++;if(camera){camera.getTracks().forEach(t=>t.stop());camera=null;}$('camera-video').srcObject=null;$('camera-video').hidden=true;$('capture-shot').hidden=true;$('camera-stop').hidden=true;$('live-camera').disabled=false;}
async function liveCamera(){if(!navigator.mediaDevices?.getUserMedia){$('photo-message').textContent='この環境ではライブカメラを使えません。「カメラで撮影」か「写真を選ぶ」を使ってね。';return;}stopCamera();const req=++cameraRequest;$('live-camera').disabled=true;$('photo-message').textContent='カメラの許可を確認しています…';
 try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:960}},audio:false});if(req!==cameraRequest||view!=='photo'||document.hidden){stream.getTracks().forEach(t=>t.stop());return;}camera=stream;$('camera-video').srcObject=stream;$('camera-video').hidden=false;$('capture-shot').hidden=false;$('camera-stop').hidden=false;await $('camera-video').play();$('photo-message').textContent='この瞬間を撮ると、柴犬を合成できます。';}
 catch{if(req===cameraRequest){stopCamera();$('photo-message').textContent='カメラを開けませんでした。「写真を選ぶ」か「カメラで撮影」を使ってね。';}}}
async function readPhoto(file){if(!file)return;const token=++photoRequest;stopCamera();if(!file.type.startsWith('image/')||file.size>35*1024*1024){$('photo-message').textContent='35MB以下の画像を選んでね。';return;}let img,url;
 try{if(typeof createImageBitmap==='function')try{img=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{}if(!img){url=URL.createObjectURL(file);img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=url;});}if(token!==photoRequest){img.close?.();return;}setPhoto(img,img.width||img.naturalWidth,img.height||img.naturalHeight,true);img.close?.();$('photo-message').textContent='柴犬を指で動かして、ツーショットを保存してね。';}
 catch{$('photo-message').textContent='この画像を開けませんでした。JPEGかPNGの写真を試してね。';}finally{if(url)URL.revokeObjectURL(url);$('photo-file').value='';$('capture-file').value='';}}
function setPhoto(src,w,h,withDog){if(!w||!h||w*h>120000000)throw Error('image too large');const k=Math.min(1,1600/Math.max(w,h)),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(w*k));cv.height=Math.max(1,Math.round(h*k));cv.getContext('2d').drawImage(src,0,0,cv.width,cv.height);photo=cv;photoHasDog=withDog;photoDog={x:.74,y:.74,size:parseInt($('dog-size').value)/100};$('photo-save').disabled=false;$('photo-open').hidden=true;drawPhoto();}
function captureHome(){home.focusT=0;home.focus=0;home.update(0);home.render(renderer);const w=canvas.width,h=canvas.height,cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(canvas,0,0);setPhoto(cv,w,h,false);$('photo-message').textContent='おうちの3Dを撮ったよ。保存できます。';AU.play('sparkle');}
function drawPhoto(){const cv=$('photo-canvas');if(photo){cv.width=photo.width;cv.height=photo.height;cv.getContext('2d').drawImage(photo,0,0);}else{cv.width=1000;cv.height=750;const c=cv.getContext('2d');const g=c.createLinearGradient(0,0,0,750);g.addColorStop(0,'#e9f1e2');g.addColorStop(1,'#f6efe1');c.fillStyle=g;c.fillRect(0,0,1000,750);c.font='28px sans-serif';c.textAlign='center';c.fillStyle='#697e62';c.fillText('ふたりの思い出を、ここに。',500,140);}
 if(!photo||photoHasDog){const c=cv.getContext('2d'),size=photoDog.size*Math.min(cv.width,cv.height);ShibaArt.drawDog(c,photoDog.x*cv.width,photoDog.y*cv.height,size,state.coat,C.stage(state),'happy',.3,photoPose,true,{});ShibaSprite.drawAccessories2D?.(c,photoDog.x*cv.width,photoDog.y*cv.height,size,state,photoPose);}}
function photoPoint(e){const r=$('photo-canvas').getBoundingClientRect();return{x:C.clamp((e.clientX-r.left)/r.width,.1,.9),y:C.clamp((e.clientY-r.top)/r.height,.18,.9)};}
function captureShot(){const v=$('camera-video');if(!camera||!v.videoWidth){$('photo-message').textContent='カメラの準備ができるまで、少し待ってね。';return;}setPhoto(v,v.videoWidth,v.videoHeight,true);stopCamera();$('photo-message').textContent='撮れたよ！ 柴犬の位置を動かして保存しよう。';}
async function savePhoto(){if(!photo)return;const b=$('photo-save');b.disabled=true;try{const blob=await new Promise(res=>$('photo-canvas').toBlob(res,'image/png'));if(!blob)throw Error();if(photoURL)URL.revokeObjectURL(photoURL);photoURL=URL.createObjectURL(blob);$('photo-open').href=photoURL;$('photo-open').hidden=false;download(blob,'shiba-twoshot.png');$('photo-message').textContent='画像を用意しました。保存が始まらない場合は「画像を開く・保存」から、画像を長押しして保存してね。';}catch{$('photo-message').textContent='画像を保存できませんでした。もういちど試してね。';}finally{b.disabled=false;}}

/* ---------- メインループ ---------- */
const app={get state(){return state;},particles,portrait:false,viewW:innerWidth,viewH:innerHeight,say,floatText,callout,act,gameEnd,toast,npcSay,questOffer,questChanged,questDone,fishUI,fishCaught,
 memoryHighlight(k){if(k>=0)flashMem(k);},...appHooks};
let npcSpeech=null,npcSpeechT=0;
function npcSay(id,text,ms=3000){npcSpeech=id;$('npc-speech').textContent=text;$('npc-speech').hidden=false;clearTimeout(npcSpeechT);npcSpeechT=setTimeout(()=>{$('npc-speech').hidden=true;npcSpeech=null;},ms);}
function renderQuest(){const q=state.npc?.quest,chip=$('quest-chip');if(!q||view!=='home'||!$('fish-bar').hidden){chip.hidden=true;return;}chip.hidden=false;$('quest-text').textContent='🎒 '+C.questObjective(q);$('quest-go').textContent=home.npcs.nearItem()?'🐾 ひろう':'📍 いく';}
function questOffer(q){$('quest-offer-text').textContent=C.NPCS[q.giver].name+'：'+C.questText(q)+'（おれい 🪙'+C.QUESTS[q.id].reward+'）';$('quest-offer').hidden=false;}
function questChanged(){$('quest-offer').hidden=true;renderQuest();save();render();}
/* ---------- さかなつり ---------- */
function fishUI(text,alert){const b=$('fish-bar');if(text===null||view!=='home'){b.hidden=true;return;}$('fish-text').textContent=text;b.classList.toggle('alert',!!alert);b.hidden=false;}
function fishImg(id,sil){const src=ShibaFish.canvas(id,sil),cv=document.createElement('canvas');cv.width=src.width;cv.height=src.height;cv.getContext('2d').drawImage(src,0,0);return cv;}
function fishCaught(c){const r=C.catchFish(state,c.id,c.size);if(!r.ok)return;const f=C.FISH[c.id];
 $('catch-img').replaceChildren(fishImg(c.id));$('catch-name').textContent=f.name;$('catch-size').textContent=r.size+' cm'+(r.record?'　さいだい きろく！':'');$('catch-desc').textContent=f.desc;$('catch-coins').textContent='🪙 +'+r.coins+'コイン'+(f.rare>=3?'　めずらしい！':'');$('catch-new').hidden=!r.first;
 AU.play(r.first||f.rare>=3?'fanfare':'good');if(!anyDialogOpen())$('catch-dialog').showModal();else toast('🎣 '+f.name+'（'+r.size+'cm）が つれた！');afterChange({stamps:r.stamps,levelUp:r.levelUp});}
function renderZukan(){const got=state.fish||{},all=Object.keys(C.FISH);$('zukan-count').textContent=Object.keys(got).length+' / '+all.length+' しゅるい つったよ';$('zukan-detail').textContent='さかなを タップすると せつめいが でるよ。';
 for(const where of ['river','sea']){const box=$('zukan-'+where);box.replaceChildren();for(const id of all){const f=C.FISH[id];if(f.where!==where)continue;const g=got[id],b=document.createElement('button');b.type='button';b.className='zcard'+(g?' got':'');b.dataset.fish=id;
  const nm=document.createElement('span');nm.textContent=g?f.name:'？？？';const sm=document.createElement('small');sm.textContent=g?g.n+'ひき・さいだい '+g.big+'cm':'まだ つってないよ';b.append(fishImg(id,!g),nm,sm);
  b.addEventListener('click',()=>{$('zukan-detail').textContent=g?f.name+'：'+f.desc:'まだ つっていない さかなだよ。'+(where==='sea'?'うみ':'かわ')+'で さがしてみよう。';AU.play('tap');});box.append(b);}}}
function questDone(r){AU.play('fanfare');toast('🎒 おつかい たっせい！ 🪙 +'+r.coins+'コイン');afterChange({stamps:r.stamps||[]});renderQuest();}
let travelKey='';
function renderTravel(){const t=home.room?.travel||[],box=$('travel');if(t.length<2||view!=='home'){box.hidden=true;return;}box.hidden=false;const here=home.areaName()[0],key=t.map(x=>x[0]).join()+here;if(key===travelKey)return;travelKey=key;box.replaceChildren();
 for(const [k,name,icon]of t){const b=document.createElement('button');b.className=k===here?'on':'';b.textContent=icon+' '+name;b.addEventListener('click',()=>{home.goTo(k);});box.append(b);}}
function positionOverlays(){
 if(view!=='home'&&view!=='shop'){return;}const cam=home.cam,head=home.dog.headTop(),p=cam.project([head[0],head[1]+.15,head[2]]);
 const ns=$('npc-speech');if(!ns.hidden&&npcSpeech){const hp=home.npcs.headPos(npcSpeech);if(hp){const q=cam.project([hp[0],hp[1]+.2,hp[2]]);ns.style.left=C.clamp(q.x*innerWidth,170,innerWidth-170)+'px';ns.style.top=Math.max(90,q.y*innerHeight)+'px';ns.style.visibility=q.visible?'visible':'hidden';}}
 const sp=$('speech');if(!sp.hidden){sp.style.left=C.clamp(p.x*innerWidth,160,innerWidth-160)+'px';sp.style.top=Math.max(90,p.y*innerHeight)+'px';}
 const need=C.need(state),nb=$('need');const show=view==='home'&&need&&sp.hidden&&home.mode==='free'&&!home.feed&&home.dog.action!=='sleep';nb.hidden=!show;if(show){nb.textContent={hungry:'🍖',dirty:'🛁',tired:'💤',bored:'🎾'}[need];nb.style.left=(p.x*innerWidth+50)+'px';nb.style.top=(p.y*innerHeight+10)+'px';}
}
function frame(now){
 requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(document.hidden||!renderer||renderer.lost)return;
 app.viewW=innerWidth;app.viewH=innerHeight;app.portrait=innerHeight>innerWidth;
 if(view==='photo')return;renderer.resize();
 if(game){if(!paused){particles.update(dt);game.update(dt);}game.render(renderer);hudT-=dt;if(hudT<=0){hudT=.1;const h=game.hud();$('game-left').textContent=h.left;$('game-right').textContent=h.right;}}
 else{particles.update(dt);home.update(dt);home.render(renderer);positionOverlays();hudT-=dt;if(hudT<=0){hudT=.25;renderTravel();renderQuest();}}
 if(dt>.03){slowT+=dt;if(slowT>2&&renderer.dprCap>1.25){renderer.dprCap-=.25;slowT=0;}}else slowT=Math.max(0,slowT-dt*.5);
}

/* ---------- 起動 ---------- */
probeStorage();C.advance(state);const login=C.ensureDaily(state);
try{renderer=new Gfx.Renderer(canvas);}catch(e){$('nogl').hidden=false;console.error(e);}
home=new ShibaHome3D(app);
renderer&&(renderer.onLost=()=>{pauseGame('3D画面を休めています。');toast('3D画面を休めています。少し待ってね。');},renderer.onRestored=()=>{toast('3D画面が戻ったよ。');});
AU.setSfx(state.sound);AU.setMusic(state.music);
home.enter();render();save();
GrantGraphics.ready.then(()=>{if(GrantGraphics.error)toast('柴犬の画像を読み込めませんでした。開き直してね。');});
let welcomeCoat=state.coat;
if(firstRun||!state.tutorial){$('welcome-name').value=state.name;GrantGraphics.ready.then(()=>coatPicker($('welcome-coats'),welcomeCoat,c=>{welcomeCoat=c;}));$('welcome-dialog').showModal();}
else{if(login)celebrate('🌞','おかえりなさい！','なかよし '+login.streak+'日目。ログインボーナス +'+login.bonus+'コイン。きょうのおねがいも見てみてね。','fanfare');say(['おかえり！ いっしょに あそぼう！','まってたよ！','きょうもよろしくね！'][Math.floor(Math.random()*3)]);}
requestAnimationFrame(t=>{last=t;frame(t);});

/* ---------- イベント ---------- */
document.querySelectorAll('[data-care]').forEach(b=>b.addEventListener('click',()=>care(b.dataset.care)));
document.querySelectorAll('[data-close-sheet]').forEach(b=>b.addEventListener('click',()=>{hideSheets();home.cancelFeed();}));
$('view-reset').addEventListener('click',()=>{home.resetView();AU.play('tap');});
$('quest-accept').addEventListener('click',()=>{home.npcs.accept();});$('quest-decline').addEventListener('click',()=>{home.npcs.decline();$('quest-offer').hidden=true;});$('quest-go').addEventListener('click',()=>{AU.play('tap');home.npcs.questAction();});
$('fish-stop').addEventListener('click',()=>{AU.play('tap');home.fishing.stop();});$('catch-ok').addEventListener('click',()=>$('catch-dialog').close());
$('zukan-open').addEventListener('click',()=>{renderZukan();$('zukan-dialog').showModal();});
canvas.addEventListener('wheel',e=>{if(view==='game')return;e.preventDefault();home.pinch(e.deltaY>0?.92:1.08);},{passive:false});
document.querySelectorAll('[data-food]').forEach(b=>{b.addEventListener('pointerdown',e=>foodDown(e,b.dataset.food));b.addEventListener('pointermove',foodMove);b.addEventListener('pointerup',foodUp);b.addEventListener('pointercancel',()=>{foodDrag=null;$('food-ghost').hidden=true;});});
$('bath-scrub').addEventListener('click',()=>home.scrub(.32));$('bath-end').addEventListener('click',()=>{home.endBath();say('また あとで、おふろに はいろうね。');});
$('lesson-end').addEventListener('click',()=>{home.endLesson();hideSheets();});$('lesson-bar-end').addEventListener('click',()=>{home.endLesson();hideSheets();});$('lesson-more').addEventListener('click',()=>{const L=home.lesson;if(!L)return;if(L.trick==='wait')home.waitRelease();L.busy=false;L.canPraise=false;L.trick=null;$('praise').disabled=true;$('praise').textContent='できたら ほめる';$('wait-ok').hidden=true;buildTricks();$('lesson-bar').hidden=true;$('lesson-panel').hidden=false;$('lesson-msg').textContent='ことばを選んでね';});$('praise').addEventListener('click',()=>app.lessonPraise());
$('wait-ok').addEventListener('click',()=>{const r=home.waitRelease();$('wait-ok').hidden=true;if(r==='ok'){const a=act('lesson','wait');$('lesson-bar-msg').textContent='待てたね！ 「まて」が上達したよ';buildTricks();say(a.message||'できたね！');}else if(r==='early'){act('lessonMiss','wait');$('lesson-bar-msg').textContent='まだだったよ〜。「技をえらぶ」からもう一度';buildTricks();}});
document.querySelectorAll('[data-home]').forEach(b=>b.addEventListener('click',()=>{AU.play('tap');showView('home');}));
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{playTab=b.dataset.tab;renderGames();AU.play('tap');}));
document.querySelectorAll('[data-shop]').forEach(b=>b.addEventListener('click',()=>{shopTab=b.dataset.shop;renderShop();AU.play('tap');}));
$('game-start').addEventListener('click',()=>{if(!game)return;AU.unlock();if(paused){paused=false;overlay('none');return;}overlay('none');game.begin();});
$('game-quit').addEventListener('click',()=>{showView('play');toast('途中の回は記録に入りません。');});
$('game-pause').addEventListener('click',()=>pauseGame());
$('game-back').addEventListener('click',()=>{const k=game?.key,unfinished=game&&!game.finished;showView('play',k&&k.startsWith('walk_')?'walk':'play');if(unfinished&&game===null)toast('途中の回は記録に入りません。');});
$('res-again').addEventListener('click',()=>{if(game)launch(game.key);});$('res-more').addEventListener('click',()=>showView('play',game?.key.startsWith('walk_')?'walk':'play'));$('res-home').addEventListener('click',()=>{showView('home');home.dog.play('happy',1.5);say('ただいま！ たのしかったね。');});
$('missions-open').addEventListener('click',()=>{renderMissions();$('missions-dialog').showModal();});$('stamps-open').addEventListener('click',()=>{renderStamps();$('stamps-dialog').showModal();});
$('settings-open').addEventListener('click',()=>{syncSettings();$('settings-dialog').showModal();});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
for(const id of ['settings-dialog','missions-dialog','stamps-dialog','confirm-dialog','welcome-dialog','catch-dialog','zukan-dialog'])$(id).addEventListener('close',()=>setTimeout(nextCelebrate,50));
$('cel-ok').addEventListener('click',()=>{$('celebrate-dialog').close();});$('celebrate-dialog').addEventListener('close',()=>setTimeout(nextCelebrate,120));
$('welcome-go').addEventListener('click',()=>{AU.unlock();const name=$('welcome-name').value.trim();if(!name||Array.from(name).length>16||/[\u0000-\u001f]/.test(name)){toast('おなまえは1〜16文字で入力してね。');return;}state.name=name;state.coat=welcomeCoat;state.tutorial=true;$('welcome-dialog').close();afterLoad();save();home.dog.play('happy',2);AU.play('bark2');say('はじめまして、'+state.name+'だよ！ これからよろしくね。',4200);setTimeout(()=>toast('床をタッチすると歩くよ。なでたり、ボールで遊んだりしてね。',4200),1500);C.addCoins(state,500,false);save();render();celebrate('🎁','はじめてのプレゼント','はじめてのログイン記念に500コイン'+(login?'、ログインボーナス +'+login.bonus+'コイン':'')+'。ショップでおしゃれやおうちづくりをしてみよう！','fanfare');});
$('identity-save').addEventListener('click',()=>{const name=$('name-input').value.trim();if(!name||Array.from(name).length>16||/[\u0000-\u001f]/.test(name)){$('settings-message').textContent='おなまえは１〜16文字で入力してね。';return;}state.name=name;state.coat=document.querySelector('[name=coat]:checked')?.value||state.coat;afterLoad();save();$('settings-message').textContent='この子の名前と毛色を保存しました。';});
$('sound-toggle').addEventListener('click',()=>{state.sound=!state.sound;AU.setSfx(state.sound);AU.play('tap');syncSettings();save();});
$('music-toggle').addEventListener('click',()=>{AU.unlock();state.music=!state.music;AU.setMusic(state.music);syncSettings();save();});
$('export-save').addEventListener('click',exportData);$('text-export').addEventListener('click',()=>{$('save-text').value=JSON.stringify(C.pack(state),null,2);$('settings-message').textContent='このテキストを全部コピーして保管してね。';});
$('text-import').addEventListener('click',()=>importData($('save-text').value));
$('import-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;if(f.size>200000){$('settings-message').textContent='200KB以下の育成記録を選んでね。';e.target.value='';return;}try{importData(await f.text());}catch{$('settings-message').textContent='記録のファイルを開けませんでした。';}e.target.value='';});
$('reset-request').addEventListener('click',()=>{if(demo){$('settings-message').textContent='おためしを終えてから、はじめから育ててください。';return;}confirmation('はじめから育てますか？','今の記録は置きかわります。大切な記録は「記録を保存」で保管してね。',()=>{state=C.fresh();state.tutorial=true;C.ensureDaily(state);storageBlocked=false;afterLoad();save();syncSettings();say('はじめまして。これからよろしくね。');},'はじめから');});
$('confirm-no').addEventListener('click',()=>{confirmAction=null;$('confirm-dialog').close();});$('confirm-yes').addEventListener('click',()=>{const fn=confirmAction;confirmAction=null;$('confirm-dialog').close();fn?.();});$('confirm-dialog').addEventListener('cancel',()=>{confirmAction=null;});
document.querySelectorAll('[data-demo]').forEach(b=>b.addEventListener('click',()=>enterDemo(b.dataset.demo)));
$('home-shot').addEventListener('click',captureHome);$('photo-file').addEventListener('change',e=>readPhoto(e.target.files[0]));$('capture-file').addEventListener('change',e=>readPhoto(e.target.files[0]));$('live-camera').addEventListener('click',liveCamera);$('camera-stop').addEventListener('click',stopCamera);$('capture-shot').addEventListener('click',captureShot);$('photo-save').addEventListener('click',savePhoto);
$('dog-size').addEventListener('input',()=>{photoDog.size=parseInt($('dog-size').value)/100;drawPhoto();$('photo-open').hidden=true;});
document.querySelectorAll('[data-pose]').forEach(b=>b.addEventListener('click',()=>{photoPose=b.dataset.pose;document.querySelectorAll('[data-pose]').forEach(x=>x.classList.toggle('on',x===b));drawPhoto();$('photo-open').hidden=true;}));
$('photo-canvas').addEventListener('pointerdown',e=>{if(camera||(photo&&!photoHasDog))return;e.preventDefault();photoDrag=e.pointerId;try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}Object.assign(photoDog,photoPoint(e));drawPhoto();$('photo-open').hidden=true;});
$('photo-canvas').addEventListener('pointermove',e=>{if(photoDrag!==e.pointerId)return;e.preventDefault();Object.assign(photoDog,photoPoint(e));drawPhoto();});for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('photo-canvas').addEventListener(ev,()=>{photoDrag=null;});
function suspend(){pauseGame('画面を離れたので、時間を止めています。');stopCamera();home.cancelFeed('途中の食べものを片づけたよ。記録は増えていません。');foodDrag=null;$('food-ghost').hidden=true;C.advance(state);save();AU.suspend();}
window.addEventListener('pagehide',suspend);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else{C.advance(state);const l=C.ensureDaily(state);if(l)celebrate('🌞','あたらしい一日！','なかよし '+l.streak+'日目。ボーナス +'+l.bonus+'コイン。','fanfare');render();save();AU.resume();}});
window.addEventListener('orientationchange',()=>{pauseGame('画面の向きが変わりました。準備ができたら、つづけよう。');home.cancelPointer();});
setInterval(()=>{if(document.hidden)return;C.advance(state);const l=C.ensureDaily(state);if(l)celebrate('🌞','あたらしい一日！','なかよし '+l.streak+'日目。ボーナス +'+l.bonus+'コイン。','fanfare');render();save();},30000);
if(QA)window.__shibaQA={get state(){return C.clone(state);},get home(){return home.snapshot;},get homeObj(){return home;},get game(){return game;},get view(){return view;},get renderer(){return renderer;},get storageOK(){return storageOK;},get demo(){return demo;},
 replaceState(s){state=C.validate(C.pack(s));afterLoad();save();},launch,showView,care,act,importData,exportData,setPhoto,enterDemo,exitDemo,captureHome,
 step(sec){if(!game)return;sec=C.clamp(Number(sec)||0,0,120);for(let t=0;t<sec;t+=1/30){particles.update(1/30);game.update(1/30);}},
 homeStep(sec){sec=C.clamp(Number(sec)||0,0,30);for(let t=0;t<sec;t+=1/30){particles.update(1/30);home.update(1/30);}}};
})();

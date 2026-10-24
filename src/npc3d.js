/* NPCの柴犬5匹: 開放したエリアに住み、エリアを行き来し、ときどきプレイヤーの家に遊びに来る。
   話しかけると吹き出しでしゃべり、おつかいを頼む。おつかいは開放ずみのNPCとエリアだけを使う。
   おつかいを頼むのは一度に1匹だけ。終えたあとは少し間をあける（core の QUEST_GAP）。
   拾いものは地面に置いてあり、タップすると柴犬が拾って口にくわえて運ぶ。 */
(function(root){
'use strict';
const {v3,raySphere,TAU}=Gfx;
const C=()=>root.ShibaCore,W=()=>root.ShibaWorld,AU=n=>root.ShibaAudio.play(n);
// 拾いものの場所（各エリアの中）
const SPOT_POS={garden:[8.8,1.6],field:[17,1.8],park:[31.5,2.6],town:[45,2.4],sea:[57.5,1.8],river:[70.5,1.5]};
function areaRect(home){const W_=W();if(home==='field')return{x0:W_.FIELD.x0+.6,x1:W_.FIELD.x1-1.2,z0:W_.FIELD.z0+1.4,z1:W_.FIELD.z1-.8};const a=W_.AREAS[home];return{x0:a.x0+1,x1:a.x1-1,z0:a.z0+1,z1:a.z1-1};}
// 拾いものを置く位置: おつかいごとに少しずらす（記録には残さず、おつかいの中身から決める）
function itemSpot(q){const p=SPOT_POS[q.spot];if(!p)return null;let h=7;for(const ch of q.id+(q.target||'')+q.giver)h=(h*31+ch.charCodeAt(0))%9973;const a=h/9973*TAU,r=.4+(h%5)*.2;return[p[0]+Math.cos(a)*r,p[1]+Math.sin(a)*r*.5];}
// いま口にくわえて運んでいるもの（絵文字）
function carryIcon(q){if(!q)return null;const st=C().questSteps(q)[q.stage];if(!st||st.type!=='npc')return null;const d=C().QUESTS[q.id];if(d.kind==='visit')return null;if(d.kind==='relay'&&q.stage===1)return'✉️';return d.icon;}

class Npcs{
 constructor(home){this.home=home;this.list={};this.talking=null;this.offer=null;this.offerer=null;this.offerT=0;this.picking=null;this.handoff=null;this.key='';this.t=0;}
 get app(){return this.home.app;}get state(){return this.home.state;}
 sync(){const s=this.state,ids=C().unlockedNpcs(s),key=ids.join();if(key===this.key)return;this.key=key;
  for(const id of Object.keys(this.list))if(!ids.includes(id))delete this.list[id];
  for(const id of ids){if(this.list[id])continue;const def=C().NPCS[id],st=def.style||{},d=new ShibaSprite({coat:def.coat,stage:'adult',equip:st.equip||{}});d.size=st.size||1;const r=areaRect(def.home);d.x=r.x0+(r.x1-r.x0)*(.3+Math.random()*.4);d.z=(r.z0+r.z1)/2+(Math.random()-.5);d.mood='happy';d.lastDx=Math.random()<.5?1:-1;
   this.list[id]={id,def,st,dog:d,idleT:1+Math.random()*3,where:def.home,mode:'home',outT:0,busy:false};}}
 /* ---------- おつかいを頼む子をえらぶ（一度に1匹） ---------- */
 pickOfferer(){const s=this.state,Cc=C();if(this.offer)return;if(!Cc.questReady(s)){this.offerer=null;return;}
  if(this.offerer&&this.list[this.offerer]&&Cc.questOptions(s,this.offerer).length)return;
  const ids=Object.keys(this.list).filter(id=>Cc.questOptions(s,id).length);this.offerer=ids.length?ids[Math.floor(Math.random()*ids.length)]:null;}
 /* ---------- 行き来: ふだんは自分のエリア。ときどき別のエリアや家へ出かけて、しばらくしたら帰る ---------- */
 randIn(home,n){if(home==='field'||W().AREAS[home]){const q=areaRect(home);return[q.x0+Math.random()*(q.x1-q.x0),q.z0+Math.random()*(q.z1-q.z0)];}
  // エリア以外（プレイヤーの家・お庭）では今いる場所のまわりを歩く
  const d=n?n.dog:null;return this.home.clampFloor((d?d.x:0)+(Math.random()-.5)*3,(d?d.z:0)+(Math.random()-.5)*2);}
 go(n,x,z,label,onArrive){const d=n.dog,far=Math.abs(x-d.x),sp=(n.st.speed||1)*(far>12?6:far>4?2.4:1.25);n.where=label;this.home.walkPath(d,this.home.planRoute(d.x,x,z),sp,onArrive);}
 think(n,dt){const d=n.dog;if(n.busy||d.goal||this.talking===n.id)return;n.outT-=dt;n.idleT-=dt;if(n.idleT>0)return;
  const s=this.state,st=n.st,r=Math.random(),homeKey=n.def.home;
  if(n.mode!=='home'&&n.outT<=0){const [x,z]=this.randIn(homeKey);n.mode='home';n.idleT=3;this.go(n,x,z,homeKey);return;}
  if(n.mode==='home'){
   const others=C().unlockedNpcs(s).map(id=>C().NPCS[id].home).filter(h=>h!==homeKey);
   if(r<.025&&others.length){const h=others[Math.floor(Math.random()*others.length)],[x,z]=this.randIn(h);n.mode='out';n.outT=14+Math.random()*12;n.idleT=2;this.go(n,x,z,h);return;}
   if(r<.045&&s.owned.includes('area_garden')){const inRoom=Math.random()<.5,x=inRoom?-1.5+Math.random()*3:5.5+Math.random()*4,z=inRoom?.8+Math.random()*.9:Math.random()*1.6-.6;n.mode='visit';n.outT=12+Math.random()*10;n.idleT=4;
    this.go(n,x,z,'home',()=>{d.faceTo(this.home.dog.x,this.home.dog.z);d.play('happy',1.6);if(Math.hypot(d.x-this.home.dog.x,d.z-this.home.dog.z)<6)this.say(n.id,'あそびに きたよ〜！',2200);});return;}
  }
  if(r<.62){const [x,z]=this.randIn(n.mode==='home'?homeKey:n.where,n);n.idleT=1.5+Math.random()*2.5;
   // 近くを歩きまわる（遠すぎる時は少し手前まで）
   const tx=d.x+Math.max(-6,Math.min(6,x-d.x)),tz=z;const [cx,cz]=this.home.clampFloor(tx,tz);this.go(n,cx,cz,n.where);return;}
  const act=(st.idle||['sit'])[Math.floor(Math.random()*(st.idle||['sit']).length)],dur=act==='sleep'?6+Math.random()*4:2+Math.random()*2;d.play(act,dur);n.idleT=dur+.5;}
 update(dt){this.sync();this.t+=dt;for(const n of Object.values(this.list)){this.think(n,dt);if(n.dog.goal){const [x,z]=this.home.clampFloor(n.dog.x,n.dog.z);n.dog.x=x;n.dog.z=z;}n.dog.update(dt);}
  this.offerT-=dt;if(this.offerT<=0){this.offerT=1;this.pickOfferer();}
  // 拾う動作: くんくん → くわえる
  const pk=this.picking;if(pk){pk.t+=dt;if(pk.t>=1.15){this.picking=null;this.pick(pk.key);}}
  if(this.handoff){this.handoff.t+=dt;if(this.handoff.t>1.6)this.handoff=null;}
  if(this.talking){this.talkT-=dt;if(!this.list[this.talking]||this.talkT<=0)this.talking=null;}}
 /* ---------- 拾いもの ---------- */
 spotStep(){const q=this.state.npc?.quest;if(!q)return null;const st=C().questSteps(q)[q.stage];return st&&st.type==='spot'?st:null;}
 itemPos(){const q=this.state.npc?.quest;if(!q||!this.spotStep())return null;const p=itemSpot(q);return p?this.home.clampFloor(p[0],p[1]):null;}
 nearItem(){const p=this.itemPos(),d=this.home.dog;return!!p&&!this.picking&&Math.hypot(p[0]-d.x,p[1]-d.z)<1.4;}
 // 拾いもののところへ行って、くんくん嗅いでから口にくわえる
 tapItem(){const p=this.itemPos();if(!p||this.picking)return false;const d=this.home.dog,side=d.x<p[0]?-1:1,[tx,tz]=this.home.clampFloor(p[0]+side*.42,p[1]+.12),far=Math.hypot(tx-d.x,tz-d.z),key=this.spotStep().key;
  const start=()=>{if(!this.spotStep()||this.spotStep().key!==key)return;d.goal=null;d.faceTo(p[0],p[1]);d.play('sniff',.8);AU('tap');this.picking={key,t:0};};
  if(far<.25)start();else this.home.walkPath(d,this.home.planRoute(d.x,tx,tz),far>10?6:2.8,start);return true;}
 // そばまで行くだけ（拾うのはタップか「ひろう」ボタン）
 walkToItem(){const p=this.itemPos();if(!p)return;const d=this.home.dog,side=d.x<p[0]?-1:1,[tx,tz]=this.home.clampFloor(p[0]+side*.8,p[1]+.25),far=Math.hypot(tx-d.x,tz-d.z);
  this.home.walkPath(d,this.home.planRoute(d.x,tx,tz),far>10?6:2.8,()=>{d.faceTo(p[0],p[1]);d.play('tilt',1);const q=this.state.npc.quest;if(q)this.home.say('あった！ '+C().QUESTS[q.id].item+'だ。タップして ひろおう。',2600);});}
 pick(key){const s=this.state,q=s.npc.quest;if(!q)return;const st=C().questSteps(q)[q.stage];if(!st||st.type!=='spot'||st.key!==key)return;const d=C().QUESTS[q.id],p=this.itemPos()||SPOT_POS[key];C().questStep(s,'spot',key);AU('sparkle');
  this.app.particles.emit('sparkle',[p[0],.5,p[1]],{count:8,vel:[0,1,0],velSpread:1.4,life:.8,size:.2});this.home.dog.play('happy',1.2);this.home.say(d.item+'を ひろったよ！ くわえて はこぶね。',3000);this.app.questChanged();}
 /* ---------- タップ ---------- */
 hit(ray){let best=null,bd=1e9;for(const n of Object.values(this.list)){const t=raySphere(ray,n.dog.center(),n.dog.height*.5);if(t>0&&t<bd){bd=t;best=n;}}
  const p=this.itemPos();if(p&&!this.picking){const t=raySphere(ray,[p[0],.3,p[1]],.55);if(t>0&&t<bd)return{item:true};}
  return best?{npc:best.id}:null;}
 tap(target){if(target.item){this.tapItem();return;}
  const n=this.list[target.npc];if(!n)return;const d=this.home.dog;n.dog.goal=null;n.busy=true;n.idleT=12;
  // そばまで行ってから話す
  const side=d.x<n.dog.x?-1:1,[tx,tz]=this.home.clampFloor(n.dog.x+side*.95,n.dog.z+.15),far=Math.hypot(tx-d.x,tz-d.z);
  const talk=()=>{d.faceTo(n.dog.x,n.dog.z);n.dog.faceTo(d.x,d.z);n.dog.play('happy',1.2);this.talk(n);};
  if(far<1.2)talk();else this.home.walkPath(d,this.home.planRoute(d.x,tx,tz),far>10?6:2.8,talk);}
 chat(n){return n.def.talk[Math.floor(Math.random()*n.def.talk.length)];}
 talk(n){const s=this.state,Cc=C(),q=s.npc.quest;AU('bark');this.talking=n.id;this.talkT=5;
  if(q){const st=Cc.questSteps(q)[q.stage];
   if(st&&st.type==='npc'&&st.key===n.id){const d=Cc.QUESTS[q.id],relayFirst=d.kind==='relay'&&q.stage===0,visitFirst=d.kind==='visit'&&q.stage===0,icon=carryIcon(q);
    if(icon)this.handoff={icon,to:n.id,t:0,from:this.home.dog.mouthPos()};
    const r=Cc.questStep(s,'npc',n.id);this.app.questChanged();
    if(r.done){this.offerer=null;this.say(n.id,(d.kind==='visit'?'そっか、げんき だったんだね！ ありがとう！':d.item+'、ありがとう！ うれしいな。')+' おれいに 🪙'+r.coins+'コイン どうぞ。',3600);this.app.questDone(r);n.dog.play('happy',2);}
    else if(relayFirst)this.say(n.id,'わあ、ありがとう！ おへんじを かいたよ。'+Cc.NPCS[q.giver].name+'に とどけてね。',3600);
    else if(visitFirst)this.say(n.id,'ぼくは げんき だよ！ '+Cc.NPCS[q.giver].name+'に よろしくね。',3400);
    else this.say(n.id,'ありがとう！',2400);
    n.busy=false;return;}
   if(q.giver===n.id){this.say(n.id,Cc.questObjective(q)+'、おねがいね！',2800);n.busy=false;return;}
   this.say(n.id,this.chat(n)+' おつかい ちゅう なんだね、がんばって！',3000);n.busy=false;return;}
  // おつかいを頼むのは、えらばれた1匹だけ。ほかの子はおしゃべりだけ
  const nq=n.id===this.offerer&&Cc.questReady(s)?Cc.newQuest(s,n.id):null;
  if(!nq){this.say(n.id,this.chat(n),2800);n.busy=false;return;}
  this.offer=nq;this.say(n.id,Cc.questText(nq),6000);this.app.questOffer(nq);n.busy=false;}
 accept(){const q=this.offer;if(!q)return false;this.offer=null;this.offerer=null;this.state.npc.quest=q;this.say(q.giver,'ありがとう！ よろしくね。',2200);AU('good');this.app.questChanged();return true;}
 decline(){if(!this.offer)return;this.say(this.offer.giver,'そっか、また こんど おねがいね。',2000);this.offer=null;this.offerer=null;C().questDecline(this.state);this.app.questChanged();}
 say(id,text,ms){this.app.npcSay(id,(C().NPCS[id]?.name||'')+'「'+text+'」',ms);}
 headPos(id){const n=this.list[id];return n?n.dog.headTop():null;}
 targetPos(){const q=this.state.npc?.quest;if(!q)return null;const st=C().questSteps(q)[q.stage];if(!st)return null;if(st.type==='spot')return this.itemPos();const n=this.list[st.key];return n?[n.dog.x,n.dog.z]:null;}
 goToTarget(){const q=this.state.npc?.quest;if(!q)return;const st=C().questSteps(q)[q.stage];if(!st)return;if(st.type==='spot')this.walkToItem();else if(this.list[st.key])this.tap({npc:st.key});}
 // おつかいチップのボタン: 拾いものの近くなら「ひろう」、それ以外は「いく」
 questAction(){if(this.nearItem())this.tapItem();else this.goToTarget();}
 /* ---------- 描画 ---------- */
 render(r){const s=this.state,q=s.npc?.quest,st=q?C().questSteps(q)[q.stage]:null,t=this.t,E=Gfx.emojiCanvas;
  for(const n of Object.values(this.list)){n.dog.shadow(r);n.dog.draw(r);const h=n.dog.headTop();
   if(st&&st.type==='npc'&&st.key===n.id)r.sprite('gift',[h[0],h[1]+.22+Math.sin(t*4)*.05,h[2]],.4);
   else if(!q&&!this.offer&&this.offerer===n.id)r.sprite('exclaim',[h[0],h[1]+.16+Math.sin(t*4)*.05,h[2]],.34);}
  // 地面の拾いもの（拾う動作中は口へ持ち上がる）
  const p=this.itemPos();if(p){const d=C().QUESTS[q.id],pk=this.picking,k=pk?Math.max(0,Math.min(1,(pk.t-.75)/.4)):0,m=this.home.dog.mouthPos();
   const pos=[p[0]+(m[0]-p[0])*k,.26+Math.sin(t*3)*.04*(1-k)+(m[1]-.26)*k,p[1]+(m[2]-p[1])*k];r.icon('e'+d.icon,E(d.icon),pos,.5-.18*k,1,.05);
   if(!pk){r.shadow(p[0],0,p[1],.3,.28);if(Math.sin(t*2.2)>.2)r.sprite('sparkle',[p[0]+.22,.55+Math.sin(t*3)*.05,p[1]],.26,[1,1,1,.9],t);}}
  // 口にくわえて運んでいるもの
  const ci=carryIcon(q);if(ci&&!this.handoff){const m=this.home.dog.mouthPos();r.icon('e'+ci,E(ci),[m[0],m[1]-.04,m[2]+.02],.32,1,.12);}
  // わたすときは、相手の頭の上へ飛んでいく
  const ho=this.handoff;if(ho){const n=this.list[ho.to];if(n){const h=n.dog.headTop(),k=Math.min(1,ho.t/.5),pos=[ho.from[0]+(h[0]-ho.from[0])*k,ho.from[1]+(h[1]+.3-ho.from[1])*k+Math.sin(k*Math.PI)*.4,ho.from[2]+(h[2]-ho.from[2])*k];r.icon('e'+ho.icon,E(ho.icon),pos,.36,Math.min(1,(1.6-ho.t)*2),.12);}}}
 get snapshot(){return Object.fromEntries(Object.values(this.list).map(n=>[n.id,{x:+n.dog.x.toFixed(2),z:+n.dog.z.toFixed(2),where:n.where,coat:n.dog.coat}]));}
}
root.ShibaNpcs=Npcs;root.ShibaNpcs.SPOT_POS=SPOT_POS;root.ShibaNpcs.itemSpot=itemSpot;
})(globalThis);

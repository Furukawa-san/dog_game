/* 3Dのおうち。自由に見まわせるカメラ、床タッチで移動、なでる、おもちゃ選び、羽で飛ぶ、
   ごはんの立体（6口で減る・食べ終えて1回だけ記録）、おふろ、しつけ（技の動作）、ねんね、お庭・原っぱ、自由行動。 */
(function(root){
'use strict';
const {Camera,Node,v3,damp,TAU,rayPlaneY,raySphere,Geo}=Gfx;
const C=()=>root.ShibaCore,W=()=>root.ShibaWorld,AU=n=>root.ShibaAudio.play(n);
const TOY_HOME=[1.4,1.1];

class Home{
 constructor(app){
  this.app=app;this.cam=new Camera();
  this.yaw=0;this.yawT=0;this.pitch=.42;this.pitchT=.42;this.zoom=1;this.zoomT=1;this.focus=0;this.focusT=0;this.tgt=[0,.8,-.2];
  this.dog=new ShibaSprite();this.dog.size=1.3;this.dog.x=0;this.dog.z=.4;this.time='';this.roomKey='';
  this.toyId='toy_ball';this.toy=this.makeToy('toy_ball');this.bubbles=[];this.flight=null;
  this.foodNode=new Node(null);this.tub=null;this.mode='free';this.feed=null;this.idleT=3;this.pointer=null;this.strokeT=0;this.lastPet=0;this.play=null;
  this.bath=null;this.lesson=null;this.introT=0;this.npcs=new ShibaNpcs(this);this.fishing=new ShibaFishing(this);this.houseA=1;this.houseFocus=false;
 }
 get state(){return this.app.state;}
 enter(){this.rebuild(true);this.syncDog();this.introT=1;this.zoom=1.15;this.mode='free';}
 exit(){this.cancelFeed();this.endBath(false);this.endLesson();this.fishing.stop();this.pointer=null;}
 syncDog(){const s=this.state;this.dog.setCoat(s.coat,C().stage(s),{neck:s.equipped.neck,head:s.equipped.head,face:s.equipped.face});this.dog.wings=this.toyId==='gear_wings'&&s.owned.includes('gear_wings');}
 rebuild(force){const s=this.state,t=W().timeOfDay(),key=t+JSON.stringify(s.equipped)+s.deco.join()+s.owned.filter(id=>id.startsWith('area_')).join();if(!force&&key===this.roomKey)return;this.roomKey=key;this.time=t;this.room=W().buildRoom(s,t);this.env=W().homeEnv(t,this.room.garden);
  if(!s.owned.includes(this.toyId))this.setToy('toy_ball');}
 clampFloor(x,z){return W().clampToRects(this.room.rects,x,z);}
 say(t,ms){this.app.say(t,ms);}
 emote(img,n=1,o={}){const p=this.dog.headTop();this.app.particles.emit(img,[p[0],p[1]+.1,p[2]],{count:n,vel:[0,.9,0],velSpread:.6,life:o.life||1.2,size:o.size||.32,spread:.3,gravity:o.gravity||0});}
 busy(){return this.mode!=='free'||!!this.feed;}

 /* ---------- カメラ ---------- */
 orbit(dx,dy){this.yawT=Math.max(-1.35,Math.min(1.35,this.yawT-dx*.006));this.pitchT=Math.max(.12,Math.min(1.25,this.pitchT+dy*.004));}
 pinch(scale){this.zoomT=Math.max(.5,Math.min(1.5,this.zoomT/scale));}
 resetView(){this.yawT=0;this.pitchT=.42;this.zoomT=1;}
 updateCamera(dt){
  const d=this.dog,f=this.focus,out=d.x>3.6;
  let tg=out?[d.x,.7,Math.max(-9,d.z-.3)]:[0,.8,-.2];
  if(this.flight)tg=[d.x*.5,1.3,d.z*.5-.2];
  const ft=this.fishing.camTarget();if(ft)tg=ft;
  tg=v3.lerp(tg,[d.x,.45,d.z+.2],f);
  for(let i=0;i<3;i++)this.tgt[i]=damp(this.tgt[i],tg[i],4,dt);
  this.yaw=damp(this.yaw,this.yawT,7,dt);this.pitch=damp(this.pitch,this.pitchT,7,dt);this.zoom=damp(this.zoom,this.zoomT,5,dt);this.focus=damp(this.focus,this.focusT,4,dt);
  // つりの間は少し上から見下ろして、ウキが柴犬にかくれないようにする
  this.fishPitch=damp(this.fishPitch||0,ft?1:0,4,dt);const pitch=this.pitch+(Math.max(this.pitch,.85)-this.pitch)*this.fishPitch;
  const dist=7.6*this.zoom*(1-f*.42)*(1+this.fishPitch*.1),cp=Math.cos(pitch);
  this.cam.pos=[this.tgt[0]+Math.sin(this.yaw)*cp*dist,Math.max(.4,this.tgt[1]+Math.sin(pitch)*dist),this.tgt[2]+Math.cos(this.yaw)*cp*dist];this.cam.target=[...this.tgt];this.cam.fov=(this.app.portrait?58:46)*Math.PI/180;
  // 外側から見ている壁は隠す
  const R=W().ROOM,w=this.room.walls,p=this.cam.pos;w.left.visible=p[0]>R.x0+.2;w.right.visible=p[0]<R.x1-.2;w.back.visible=p[2]>R.z0+.2;
 }

 /* ---------- 入力 ---------- */
 down(info){
  if(this.pointer)return;const onDog=this.dog.hitTest(info.ray);this.pointer={id:info.id,sx:info.x,sy:info.y,lx:info.x,ly:info.y,onDog,moved:0,t:performance.now(),stroke:0};
  if(this.mode==='bath'&&onDog)this.scrub(.2);
 }
 move(info){
  const p=this.pointer;if(!p||p.id!==info.id)return;const dx=info.x-p.lx,dy=info.y-p.ly;p.moved+=Math.hypot(dx,dy);p.lx=info.x;p.ly=info.y;
  const onDog=this.dog.hitTest(info.ray);
  if(this.mode==='bath'){if(onDog)this.scrub(Math.hypot(dx,dy)/260);return;}
  if((p.onDog||p.stroke>0)&&onDog&&this.mode!=='lesson'&&!this.flight){p.stroke+=Math.hypot(dx,dy);this.stroke(Math.hypot(dx,dy));return;}
  if(p.moved>12)this.orbit(dx,dy);
 }
 up(info){const p=this.pointer;if(!p||p.id!==info.id)return;this.pointer=null;if(p.moved<14&&performance.now()-p.t<600)this.tap(info,p.onDog);}
 cancelPointer(){this.pointer=null;}
 tap(info,onDog){
  const ray=info.ray;
  if(this.mode==='lesson'){if(onDog&&this.lesson?.canPraise)this.app.lessonPraise();return;}
  if(this.mode==='bath'||this.feed||this.flight)return;
  if(this.fishing.tap(ray))return;
  for(const b of this.bubbles)if(!b.dead&&raySphere(ray,b.p,.25)>0){this.popBubble(b);return;}
  if(!onDog){const nh=this.npcs.hit(ray);if(nh){if(this.dog.action==='sleep')this.wake();this.endPlay();this.npcs.tap(nh);return;}}
  if(onDog){if(this.toyId==='gear_wings'&&this.state.owned.includes('gear_wings'))this.fly();else this.pet();return;}
  if(this.toy&&!this.toy.held&&raySphere(ray,[this.toy.pos[0],this.toy.pos[1]+.05,this.toy.pos[2]],.42)>0){this.useToy();return;}
  const H=this.room.house;if(H&&!onDog&&!this.inHouse()&&raySphere(ray,[H.x,.7,H.z],1)>0){this.enterHouse();return;}
  const hit=rayPlaneY(ray,0);if(!hit)return;const [x,z]=this.clampFloor(hit[0],hit[2]);
  if(this.dog.action==='sleep')this.wake();
  this.endPlay();this.walkOut(x,z,Math.hypot(x-this.dog.x,z-this.dog.z)>2.5?3.2:1.8);this.idleT=6;this.app.particles.emit('dot',[x,.05,z],{count:6,vel:[0,.6,0],velSpread:1.2,life:.5,size:.12,color:'#ffffff'});
 }
 pet(){
  if(this.dog.action==='sleep'){this.wake();return;}
  const r=this.app.act('pet');if(!r?.ok)return;const m=C().mood(this.state);this.endPlay();this.dog.goal=null;
  if(m==='happy'){this.dog.play('happy',1.3);this.dog.excite=3;this.emote('heart',3);AU('bark');}
  else if(m==='sad'){this.dog.play('sadlook',1.6);this.emote('heart',1);AU('sad');}
  else{this.dog.play('refuse',1.4);this.emote('anger',1);AU('grumpy');}
  this.dog.setLook(this.cam.pos);this.idleT=5;
 }
 stroke(dist){
  this.strokeT+=dist;if(this.dog.action==='sleep')return;
  if(this.strokeT>70){this.strokeT=0;this.emote('heart',1,{size:.26});this.dog.play(C().mood(this.state)==='grumpy'?'refuse':'wiggle',1);this.dog.goal=null;
   const now=performance.now();if(now-this.lastPet>1400){this.lastPet=now;const r=this.app.act('pet');if(r?.ok&&Math.random()<.4)AU('squeak');}}
 }
 wake(){this.dog.play('stretch',1.1);this.emote('sparkle',2);this.say('ふわぁ… おはよう！');this.idleT=4;}

 /* ---------- おもちゃ ---------- */
 makeToy(id){if(id==='gear_wings')return null;const [x,z]=TOY_HOME;return{id,pos:[x,id==='toy_ball'?.15:0,z],vel:[0,0,0],held:false,node:new Node(id==='toy_ball'?W().ballMesh():W().toyMesh(id)),spin:0};}
 setToy(id){if(!this.state.owned.includes(id))return false;this.endPlay();this.bubbles=[];this.toyId=id;this.toy=this.makeToy(id);this.syncDog();
  const it=C().ITEMS[id];this.say(id==='gear_wings'?'はねを つけたよ！ しばいぬを タップすると とぶよ。':it.name+'で あそぼう！ タップしてね。',2600);AU('tap');return true;}
 endPlay(){if(!this.play)return;if(this.toy)this.toy.held=false;if(['shake','eat','dig'].includes(this.dog.action))this.dog.stop();this.play=null;}
 useToy(){
  const t=this.toy;if(!t||this.busy())return;if(this.dog.action==='sleep')this.wake();this.endPlay();this.idleT=8;
  if(t.id==='toy_ball'){const a=Math.random()*TAU;t.vel=[Math.cos(a)*4.5,3.2,Math.sin(a)*3.5-1];t.pos[1]=Math.max(t.pos[1],.15);AU('whoosh');this.play={kind:'fetch'};this.dog.excite=4;this.say('ボールだ！ まてまて〜',2000);}
  else if(t.id==='toy_frisbee'){const R=this.room.rects.find(q=>this.dog.x>=q.x0-.3&&this.dog.x<=q.x1+.3&&this.dog.z>=q.z0-.3&&this.dog.z<=q.z1+.3)||this.room.rects[0],tx=R.x0+Math.random()*(R.x1-R.x0),tz=R.z0+Math.random()*(R.z1-R.z0);t.flight={from:[...t.pos],to:[tx,0,tz],T:1.3,t:0};AU('whoosh');this.play={kind:'frisbee'};this.dog.walkTo(tx,tz+.2,{speed:4});this.say('フリスビー！',1600);}
  else if(t.id==='toy_rope'){this.play={kind:'rope',t:0};this.dog.walkTo(t.pos[0]-.45,t.pos[2]+.1,{speed:2.6,onArrive:()=>{if(this.play?.kind!=='rope')return;t.held=true;this.play.t=0;this.play.tug=true;this.dog.faceTo(this.cam.pos[0],this.cam.pos[2]);this.say('ぐいぐい！ ひっぱりっこ！',2200);AU('grumpy');}});}
  else if(t.id==='toy_duck'){AU('squeak');t.vel=[(Math.random()-.5)*2,3,(Math.random()-.5)*2];this.play={kind:'duck'};this.dog.walkTo(t.pos[0],t.pos[2]+.3,{speed:3.4,onArrive:()=>{if(this.play?.kind!=='duck')return;this.dog.play('jump',.5);this.dog.jumpV=3.6;t.held=true;this.play.carry=3;AU('squeak');this.emote('heart',2);}});}
  else if(t.id==='toy_bone'){this.play={kind:'bone',t:0};this.dog.walkTo(t.pos[0]-.4,t.pos[2]+.15,{speed:2.4,onArrive:()=>{if(this.play?.kind!=='bone')return;t.held=true;this.dog.faceTo(this.cam.pos[0],this.cam.pos[2]);this.dog.play('eat',4.5);this.play.chew=4.5;this.say('かじかじ… おいしい！',2200);}});}
  else if(t.id==='toy_bubble'){AU('bubble');for(let i=0;i<9;i++)this.bubbles.push({p:[t.pos[0]+(Math.random()-.5)*.3,.5,t.pos[2]],v:[(Math.random()-.5)*1.6,.35+Math.random()*.4,(Math.random()-.5)*1.4],r:.12+Math.random()*.1,age:0,dead:false});this.play={kind:'bubble'};this.say('シャボンだま！ パクッ！',1800);}
 }
 popBubble(b,byDog){if(b.dead)return;b.dead=true;AU('pop');this.app.particles.emit('sparkle',b.p,{count:4,vel:[0,.6,0],velSpread:1,life:.5,size:.16});if(byDog){this.emote('heart',1,{size:.22});}}
 updateToy(dt){
  const t=this.toy,d=this.dog,pl=this.play;
  // シャボン玉
  for(const b of this.bubbles){b.age+=dt;b.v[1]=Math.max(-.1,b.v[1]-.05*dt);for(let i=0;i<3;i++)b.p[i]+=b.v[i]*dt;b.v[0]*=Math.exp(-.4*dt);b.v[2]*=Math.exp(-.4*dt);[b.p[0],b.p[2]]=this.clampFloor(b.p[0],b.p[2]);if(b.age>9||b.p[1]>3)b.dead=true;if(!b.dead&&v3.dist(b.p,d.headTop())<b.r+.35)this.popBubble(b,true);}
  this.bubbles=this.bubbles.filter(b=>!b.dead);
  if(pl?.kind==='bubble'){const b=this.bubbles.sort((a,c)=>Math.hypot(a.p[0]-d.x,a.p[2]-d.z)-Math.hypot(c.p[0]-d.x,c.p[2]-d.z))[0];if(!b){this.endPlay();this.app.act('fetch');}else{if(!d.goal||Math.random()<dt*4)d.walkTo(...this.clampFloor(b.p[0],b.p[2]+.1),{speed:3});if(Math.hypot(b.p[0]-d.x,b.p[2]-d.z)<.5&&d.jumpY===0&&b.p[1]<2){d.jumpV=3.8;d.play('jump',.5);}}}
  // 犬のジャンプ（共通）
  if(d.jumpV!==undefined){d.jumpV-=12*dt;d.jumpY=Math.max(0,d.jumpY+d.jumpV*dt);if(d.jumpY===0)d.jumpV=undefined;}
  if(!t)return;t.node.pos=t.pos;
  if(pl?.kind==='give'){pl.t-=dt;if(pl.t<=0)this.giveToy();}
  if(t.held){const m=d.mouthPos(),sc=t.id==='toy_ball'?.15:.05;t.pos=[m[0],m[1]-sc,m[2]];if(pl?.tug){pl.t+=dt;d.x+=Math.sin(pl.t*7)*dt*.4;t.spin=Math.sin(pl.t*18)*.4;if(Math.floor(pl.t*2)%2)d.play('shake',.5);else d.play('refuse',.5);if(pl.t>3.2){this.endPlay();t.pos=[d.x+.5,0,d.z+.3];d.play('happy',1.2);this.emote('heart',3);this.app.act('fetch');AU('bark2');}}
   if(pl?.carry!==undefined){pl.carry-=dt;if(!d.goal)d.walkTo(...this.clampFloor(d.x+(Math.random()-.5)*2.5,d.z+(Math.random()-.5)*2),{speed:2});if(pl.carry<=0){d.goal=null;this.play={kind:'return'};this.returnToy();}}
   if(pl?.chew!==undefined){pl.chew-=dt;t.pos=[d.x+.12,.03,d.z+.32];if(Math.random()<dt*2)AU('eat');if(pl.chew<=0){t.held=false;this.play=null;this.app.act('fetch');this.emote('heart',2);}}
   return;}
  if(t.flight){const f=t.flight;f.t+=dt;const k=Math.min(1,f.t/f.T);t.pos=[f.from[0]+(f.to[0]-f.from[0])*k,.1+Math.sin(k*Math.PI)*1.8,f.from[2]+(f.to[2]-f.from[2])*k];t.spin+=dt*14;
   if(k>.7&&Math.hypot(t.pos[0]-d.x,t.pos[2]-d.z)<.7&&t.pos[1]<1.6){t.flight=null;t.held=true;d.jumpV=4;d.play('catch',.6);AU('perfect');this.emote('star',3);this.play={kind:'return'};this.returnToy();}
   else if(k>=1){t.flight=null;t.pos[1]=0;AU('land');this.play={kind:'fetch'};}return;}
  if(t.id==='toy_ball'||t.id==='toy_duck'||t.id==='toy_frisbee'){
   const bd=this.room.bounds,floor=t.id==='toy_ball'?.15:0;t.vel[1]-=12*dt;for(let i=0;i<3;i++)t.pos[i]+=t.vel[i]*dt;
   if(t.pos[1]<floor){t.pos[1]=floor;if(t.vel[1]<-1.2){t.vel[1]*=-.5;AU('land');}else t.vel[1]=0;t.vel[0]*=Math.exp(-1.8*dt);t.vel[2]*=Math.exp(-1.8*dt);}
   const [cx,cz]=this.clampFloor(t.pos[0],t.pos[2]);if(cx!==t.pos[0])t.vel[0]*=-.6;if(cz!==t.pos[2])t.vel[2]*=-.6;t.pos[0]=cx;t.pos[2]=cz;
   if(pl?.kind==='fetch'){const dd=Math.hypot(t.pos[0]-d.x,t.pos[2]-d.z);if(dd<.5&&Math.hypot(t.vel[0],t.vel[2])<2.2&&t.pos[1]<.5){t.held=true;t.vel=[0,0,0];this.play={kind:'return'};this.returnToy();}else if(!d.goal||Math.random()<dt*6)d.walkTo(...this.clampFloor(t.pos[0],t.pos[2]),{speed:3.4});}}
 }
 returnToy(){const t=this.toy,d=this.dog,to=v3.norm([this.cam.pos[0]-this.tgt[0],0,this.cam.pos[2]-this.tgt[2]]),[hx,hz]=this.clampFloor(this.tgt[0]+to[0]*1.8,this.tgt[2]+to[2]*1.8);this.say('くわえて もってくるよ！',1400);
  d.walkTo(hx,hz,{speed:2.8,onArrive:()=>{if(this.play?.kind!=='return')return;d.faceTo(this.cam.pos[0],this.cam.pos[2]);d.play('sit',1.2);this.say('はい、どうぞ！',1600);AU('bark');this.play={kind:'give',t:1};}});}
 giveToy(){const t=this.toy,d=this.dog;t.held=false;const m=d.mouthPos();t.pos=[m[0],t.id==='toy_ball'?.15:0,m[2]+.1];t.vel=[0,0,0];this.play=null;d.play('happy',1.4);this.emote('heart',2);AU('bark2');const r=this.app.act('fetch');if(r?.message)this.say(r.message);}

 /* ---------- 犬小屋: 中に入れる（中にいる間は前の壁が透ける） ---------- */
 inHouse(){const H=this.room.house,d=this.dog;return!!H&&Math.abs(d.x-H.x)<.85&&d.z>H.z-.8&&d.z<H.z+.68;}
 enterHouse(then){const H=this.room.house,d=this.dog;if(!H||this.busy()||this.flight)return false;this.endPlay();if(d.action==='sleep')d.stop();
  this.walkPath(d,[...this.planRoute(d.x,H.door[0],H.door[1]),H.inside],1.6,()=>{d.faceTo(this.cam.pos[0],this.cam.pos[2]);if(then){then();return;}d.play('down',6);this.emote('heart',2);this.say('おうちの なかで ごろん。ゆかを タップすると でてくるよ。',2600);AU('happy');this.idleT=6;});return true;}
 // 小屋の中からは、入口を通って出る
 walkOut(x,z,speed){const d=this.dog,H=this.room.house;if(H&&this.inHouse()&&!(Math.abs(x-H.x)<.85&&z<H.z+.68))this.walkPath(d,[H.door,[x,z]],speed);else d.walkTo(x,z,{speed});}
 /* ---------- おでかけ: 行き先ボタンで走っていく ---------- */
 goTo(key){if(this.mode==='fish')this.fishing.stop();const sp=this.room.travel.find(t=>t[0]===key);if(!sp||this.busy()||this.flight)return false;this.endPlay();if(this.dog.action==='sleep')this.dog.stop();const [x,z]=this.clampFloor(sp[3],sp[4]);const far=Math.hypot(x-this.dog.x,z-this.dog.z);
  const speed=far>12?8:far>4?5:2.5,arrive=()=>{this.dog.faceTo(this.cam.pos[0],this.cam.pos[2]);this.dog.play('happy',1.2);this.say(sp[2]+' '+sp[1]+'に ついたよ！',1800);AU('bark');this.idleT=4;};
  const d=this.dog,path=this.planRoute(d.x,x,z);
  const step=i=>{if(i>=path.length){arrive();return;}d.walkTo(path[i][0],path[i][1],{speed,onArrive:()=>step(i+1)});};step(0);this.say(sp[1]+'へ いこう！',1400);AU('tap');this.idleT=20;return true;}
 /* 道順: 部屋⇔お庭はドアを通る。遠い所へは道（z=0）に出て、道ぞいに走ってから向かう（NPCも使う） */
 planRoute(fromX,x,z){const legs=[],inRoom=v=>v<3.6,onRoad=v=>v>10.6;let cx=fromX;
  if(inRoom(cx)&&!inRoom(x)){legs.push([3.2,0],[5,0]);cx=5;}
  if(!inRoom(cx)&&inRoom(x)){if(onRoad(cx)){legs.push([cx,0],[10,0]);cx=10;}legs.push([5,0],[3.2,0]);cx=3.2;}
  if(!inRoom(x)&&Math.abs(x-cx)>6&&(onRoad(x)||onRoad(cx))){legs.push([cx,0],[x,0]);}
  legs.push([x,z]);return legs.map(p=>this.clampFloor(p[0],p[1]));}
 walkPath(d,path,speed,arrive){const step=i=>{if(i>=path.length){arrive?.();return;}d.walkTo(path[i][0],path[i][1],{speed,onArrive:()=>step(i+1)});};step(0);}
 /* 地面の高さ（橋）と水の中（水着があるとき）。水の中では体が沈み、犬かきで泳ぐ */
 applyGround(d,dt,main){const W_=W(),s=this.state,wet=W_.waterAt(s,d.x,d.z),target=wet?-.42:W_.groundHeight(s,d.x,d.z);d.groundY+= (target-d.groundY)*Math.min(1,dt*10);
  if(wet&&!d.swimming){d.swimming=true;AU('splash');this.app.particles.emit('drop',[d.x,.1,d.z],{count:10,vel:[0,2.2,0],velSpread:2,gravity:7,life:.7,size:.12});if(main){this.say('いぬかき、すいすい〜！',1800);}}
  else if(!wet&&d.swimming){d.swimming=false;if(main){d.play('shake',1);AU('shake');}}
  if(d.swimming&&Math.random()<dt*(d.goal?14:5))this.app.particles.emit(Math.random()<.5?'drop':'dot',[d.x+(Math.random()-.5)*.5,.05,d.z+(Math.random()-.5)*.3],{vel:[0,1.2,0],velSpread:1,gravity:5,life:.5,size:.09,color:'#ffffff'});}
 areaName(){const d=this.dog;const t=this.room.travel;let best=t[0],bd=1e9;for(const s of t){const dd=Math.abs(s[3]-d.x);if(dd<bd){bd=dd;best=s;}}return best;}
 /* ---------- 羽で飛ぶ ---------- */
 fly(){if(this.busy()||this.flight)return;if(this.dog.action==='sleep')this.wake();this.endPlay();this.dog.goal=null;this.flight={t:0,T:7,cx:this.tgt[0],cz:-.1,r:2.2,sx:this.dog.x,sz:this.dog.z};this.dog.flying=true;this.dog.play('happy');AU('whoosh');this.say('とんだー！ ふわふわ〜',2400);this.app.act('fetch');}
 updateFlight(dt){const f=this.flight;if(!f)return;const d=this.dog;f.t+=dt;const k=f.t/f.T,a=f.t*1.1,lift=Math.min(1,f.t*1.5)*Math.min(1,(f.T-f.t)*1.5);
  const ox=f.cx+Math.sin(a)*f.r,oz=f.cz+Math.cos(a)*f.r*.7,bl=Math.min(1,f.t*1.2);d.x=f.sx+(ox-f.sx)*bl;d.z=f.sz+(oz-f.sz)*bl;if(f.t>f.T-1){const e=(f.t-(f.T-1));f.sx=f.sx;d.x=ox+(f.sx-ox)*0;}d.jumpY=lift*(1.3+Math.sin(f.t*3)*.25);d.vel=[Math.cos(a),-Math.sin(a)];d.speed=0;d.forceSpeed=lift>.2?3:0;
  if(Math.random()<dt*10)this.app.particles.emit('sparkle',d.center(),{vel:[0,-.3,0],velSpread:.4,life:.8,size:.14});
  if(f.t>=f.T){this.flight=null;d.flying=false;d.jumpY=0;d.forceSpeed=null;[d.x,d.z]=this.clampFloor(d.x,d.z);d.play('happy',1.2);this.emote('heart',2);AU('land');}}

 /* ---------- ごはん: 柴犬の前に立体のごはんを置き、6口で減る ---------- */
 feedStart(kind){
  if(this.busy()||this.flight)return false;const s=this.state;C().advance(s);
  if(s.fullness>=88){this.dog.goal=null;this.dog.play('refuse',1.6);this.emote('anger');this.say('おなか いっぱい。いまは たべないよ。また あとでね。');AU('grumpy');this.app.feedStatus('おなかいっぱい。食べものは減っていないよ。');return false;}
  this.endPlay();if(this.dog.action==='sleep')this.dog.stop();this.dog.goal=null;
  const d=this.dog,to=v3.norm([this.cam.pos[0]-d.x,0,this.cam.pos[2]-d.z]),[fx,fz]=this.clampFloor(d.x+to[0]*.85,d.z+to[2]*.85),token=Math.random();
  this.feed={kind,phase:'appear',elapsed:0,bite:-1,token,state:s,pos:[fx,fz],pop:0};this.foodNode.mesh=W().foodFigure(kind,1);this.foodNode.pos=[fx,0,fz];this.foodNode.setScale(.01);
  this.focusT=.55;AU('pop');this.app.particles.emit('sparkle',[fx,.3,fz],{count:6,vel:[0,1,0],velSpread:1.2,life:.6,size:.18});
  this.say({milk:'ミルクだ！',snack:'おやつだ！',meat:'おにくだ！ やったー！',fish:'おさかな！ いい におい！'}[kind]||'わーい、ごはん！',1600);AU('bark');this.app.feedStatus('食べものを置いたよ。');
  // 食べものの横（カメラから見て少し奥）へ行って、食べものの方を向く
  const [ex,ez]=this.clampFloor(fx-to[0]*.62,fz-to[2]*.62);d.walkTo(ex,ez,{speed:2.4,onArrive:()=>{if(this.feed?.token!==token)return;d.faceTo(fx,fz);d.play(kind==='milk'?'drink':'eat');this.feed.phase='eat';}});
  return true;
 }
 dropFood(kind,info){const hit=rayPlaneY(info.ray,0),onDog=this.dog.hitTest(info.ray);if(!onDog&&!hit)return false;const near=onDog||Math.hypot(hit[0]-this.dog.x,hit[2]-this.dog.z)<1.6;if(!near){this.app.feedStatus('柴犬の近くに置いてね。食べものは減っていないよ。');return false;}return this.feedStart(kind);}
 updateFeed(dt){
  const f=this.feed;if(!f)return;if(f.state!==this.state){this.cancelFeed();return;}
  f.pop=Math.min(1,f.pop+dt*3.5);this.foodNode.setScale(1.5*Gfx.ease.back(f.pop));
  if(f.phase!=='eat')return;f.elapsed+=Math.min(.1,dt);const bite=Math.min(6,Math.floor(f.elapsed/.42));
  if(bite!==f.bite){f.bite=bite;this.foodNode.mesh=W().foodFigure(f.kind,1-bite/6);this.app.feedStatus('もぐもぐ '+bite+' / 6');if(bite>0&&bite<6){AU('eat');this.app.particles.emit('dot',[f.pos[0],.35,f.pos[1]],{count:5,vel:[0,1.3,0],velSpread:1.2,gravity:5,life:.5,size:.07,color:f.kind==='milk'?'#ffffff':'#a8714a'});}}
  if(f.elapsed>=2.65){this.feed=null;this.foodNode.mesh=null;this.focusT=0;this.dog.play('happy',1.4);this.dog.excite=3;this.emote('heart',2);this.app.feedDone(f.kind);}
 }
 cancelFeed(msg){if(!this.feed)return;this.feed=null;this.foodNode.mesh=null;this.focusT=this.mode==='free'?0:this.focusT;if(['eat','drink'].includes(this.dog.action))this.dog.stop();this.dog.goal=null;if(msg)this.app.feedStatus(msg);}

 /* ---------- おふろ ---------- */
 startBath(){
  if(this.busy()||this.flight)return;this.endPlay();this.mode='bath';this.focusT=1;
  const g=new Geo();g.cyl('#c99a6a',{s:[1.05,.55,1.05]},1.06,1,28,false);g.cyl('#b88a5c',{p:[0,.5,0],s:[1.1,.07,1.1]},1,1,28,false);g.torus('#8a6a4a',{p:[0,.2,0]},1.03,.03,28,6);g.torus('#8a6a4a',{p:[0,.42,0]},1.07,.03,28,6);g.cyl('#a9d8e6',{p:[0,.35,0],s:[1,.01,1]},1,1,28);
  this.tub=new Node(g.mesh(),{pos:[0,0,.6]});this.dog.goal=null;this.dog.x=0;this.dog.z=.6;this.dog.faceTo(0,6);this.dog.play('bath');this.bath={foam:0,stage:'foam',rinse:0,t:0};this.dog.setTint([.88,.88,.9]);
  this.say('おふろだよ。ゆびで ごしごし、あわあわに してね。');this.app.bathProgress(0,'foam');
 }
 scrub(amount){
  const b=this.bath;if(!b||b.stage==='shake'||b.stage==='done')return;const c=this.dog.center();
  if(b.stage==='foam'){b.foam=Math.min(1,b.foam+amount*.55);for(let i=0;i<2;i++)this.app.particles.emit('bubble',[c[0]+(Math.random()-.5)*.7,c[1]+(Math.random()-.2)*.6,c[2]+.3],{vel:[0,.15,0],velSpread:.2,life:2.6,size:.12+Math.random()*.14,spread:.1});if(Math.random()<.3)AU('bubble');
   this.app.bathProgress(b.foam,'foam');if(b.foam>=1){b.stage='rinse';this.say('あわあわ！ こんどは シャワーで ながそう。もう いちど ごしごし。');AU('good');}}
  else if(b.stage==='rinse'){b.rinse=Math.min(1,b.rinse+amount*.65);for(let i=0;i<3;i++)this.app.particles.emit('drop',[c[0]+(Math.random()-.5)*.6,c[1]+.9,c[2]+.25],{vel:[0,-2.5,0],velSpread:.4,gravity:6,life:.6,size:.14});if(Math.random()<.2)AU('splash');
   this.app.bathProgress(b.rinse,'rinse');if(b.rinse>=1){b.stage='shake';b.t=0;this.dog.play('shake',1.4);AU('shake');this.say('ぶるぶるぶる〜！');}}
 }
 updateBath(dt){const b=this.bath;if(!b)return;b.t+=dt;
  if(b.stage==='shake'){const c=this.dog.center();for(let i=0;i<3;i++){const a=Math.random()*TAU;this.app.particles.emit('drop',c,{vel:[Math.cos(a)*3,1.5,Math.sin(a)*3],velSpread:1,gravity:7,life:.7,size:.12});}
   if(b.t>1.4){b.stage='done';b.t=0;this.dog.setTint(null);this.dog.play('happy',1.6);this.emote('sparkle',6,{size:.3});AU('sparkle');this.app.bathDone();}}
  if(b.stage==='done'&&b.t>1.8)this.endBath(true);
 }
 endBath(){if(!this.bath&&!this.tub)return;this.bath=null;this.tub=null;this.dog.setTint(null);if(this.mode==='bath')this.mode='free';this.focusT=0;if(['bath','shake'].includes(this.dog.action))this.dog.stop();this.app.bathProgress(null);}

 /* ---------- しつけ: 技の動作を実際に見せる ---------- */
 startLesson(){if(this.busy()||this.flight)return;this.endPlay();this.mode='lesson';this.focusT=1;this.lesson={busy:false,canPraise:false,trick:null};
  const [x,z]=this.clampFloor(this.dog.x>3.6?this.dog.x:0,.9);this.dog.walkTo(x,z,{speed:2.4,onArrive:()=>{this.dog.faceTo(this.cam.pos[0],this.cam.pos[2]);this.dog.play('stand');this.say('しっぽ ふりふり、ことばを まってるよ。',1800);}});this.dog.setLook(this.cam.pos);}
 command(trick){
  const L=this.lesson;if(!L||L.busy)return;L.busy=true;L.canPraise=false;L.trick=trick;const s=this.state,ok=Math.random()<C().lessonChance(s,trick);this.dog.goal=null;this.dog.faceTo(this.cam.pos[0],this.cam.pos[2]);
  const T=C().TRICKS[trick];this.app.floatText(T.name+'！',this.dog.headTop(),'cmd');AU('tap');this.dog.play('stand');
  if(trick==='wait'){this.dog.play('wait');this.app.particles.emit('meat',[this.dog.x,.25,this.dog.z+.55],{life:3.2,size:.3,vel:[0,0,0],velSpread:0,spread:0});L.waitT=0;L.waitOk=false;this.say('まて…まて…',1500);return;}
  setTimeout(()=>{if(this.lesson!==L||this.mode!=='lesson'||L.trick!==trick)return;
   if(ok){const anim={sit:['sit',Infinity],paw:['paw',Infinity],down:['down',Infinity],spin:['spin',1.25],beg:['beg',3],bang:['bang',3.2]}[trick]||['sit',2];this.dog.play(anim[0],anim[1]);this.app.floatText('ワン！',this.dog.headTop(),'good');AU('bark');
    if(trick==='spin')setTimeout(()=>{if(this.lesson===L)this.dog.play('sit');},1250);
    if(trick==='bang')this.app.particles.emit('star',this.dog.center(),{count:3,vel:[0,.8,0],velSpread:.8,life:1,size:.2});
    L.canPraise=true;this.app.lessonResult(true,trick);AU('good');}
   else{const miss=['tilt','bark','sniff'][Math.floor(Math.random()*3)];this.dog.play(miss,1.6);this.emote('question');this.app.lessonResult(false,trick);L.busy=false;setTimeout(()=>{if(this.lesson===L)this.dog.play('stand');},1600);}
  },650);
 }
 praise(){const L=this.lesson;if(!L||!L.canPraise)return null;L.canPraise=false;L.busy=false;this.dog.play('happy',1.4);this.dog.excite=3;this.emote('heart',3);AU('bark2');setTimeout(()=>{if(this.lesson===L&&this.mode==='lesson')this.dog.play('stand');},1400);return L.trick;}
 waitRelease(){const L=this.lesson;if(!L||L.trick!=='wait')return null;const ok=L.waitT>=1.5;this.app.particles.list=this.app.particles.list.filter(p=>p.img!=='meat');L.trick=null;if(ok){this.dog.play('eat',1);setTimeout(()=>{if(this.lesson===L){this.dog.play('happy',1.2);this.emote('heart',3);}},900);L.busy=false;AU('eat');return'ok';}
  this.dog.play('jump',.6);this.emote('exclaim');L.busy=false;setTimeout(()=>{if(this.lesson===L)this.dog.play('sit');},1200);return'early';}
 endLesson(){if(!this.lesson)return;this.lesson=null;if(this.mode==='lesson')this.mode='free';this.focusT=0;this.dog.stop();this.app.particles.list=this.app.particles.list.filter(p=>p.img!=='meat');}

 /* ---------- ねんね ---------- */
 startRest(){if(this.busy()||this.flight)return;this.endPlay();if(this.room.house){this.say('おうちで ねんね…',1600);this.enterHouse(()=>{this.dog.play('sleep',9);this.app.act('rest');this.app.restDone();});return;}const [bx,bz]=this.room.bed;this.say('ふかふかのベッドへ…',1600);this.dog.walkTo(bx,bz+.15,{speed:1.6,onArrive:()=>{this.dog.faceTo(this.cam.pos[0],this.cam.pos[2]);this.dog.play('sleep',9);this.app.act('rest');this.app.restDone();}});}

 /* ---------- 自由行動（お庭のかざりでも遊ぶ） ---------- */
 autonomy(dt){
  const d=this.dog;if(this.busy()||this.play||this.flight||d.goal)return;
  if(d.action==='sleep'){if(Math.random()<dt*.8)this.app.particles.emit('zzz',d.headTop(),{vel:[.15,.35,0],velSpread:.1,life:2,size:.22});return;}
  if(d.action!=='idle')return;
  this.idleT-=dt;if(this.idleT>0)return;this.idleT=5+Math.random()*6;
  const s=this.state,rects=this.room.rects,r=Math.random(),sp=this.room.spots;
  if(this.inHouse()){if(r<.55)d.play(Math.random()<.5?'down':'sleep',5+Math.random()*4);else{const q=rects[0];this.walkOut(q.x0+Math.random()*(q.x1-q.x0),.3+Math.random()*1.2,1.3);}return;}
  if(s.energy<30||this.time==='night'&&r<.2){if(this.room.house){this.enterHouse(()=>d.play('sleep',12));return;}const [bx,bz]=this.room.bed;d.walkTo(bx,bz+.15,{speed:1.2,onArrive:()=>{d.play('sleep',12);}});return;}
  if(s.fullness<45&&r<.5){d.play('sniff',2);this.say('おなかすいたなぁ… ごはんほしいな。',2400);this.emote('meat',1);return;}
  const yard=Object.entries(sp).filter(([k,v])=>v);
  const near=yard.filter(([k,v])=>Math.abs(v[0]-d.x)<14);if(near.length&&r<.35){const [k,[x,z]]=near[Math.floor(Math.random()*near.length)];const [tx,tz]=this.clampFloor(x,z+.9);d.walkTo(tx,tz,{speed:2,onArrive:()=>{
   if(k==='pool'||k==='fountain'||k==='pond'||k==='parkpond'||k==='beach'||k==='river'){d.play('happy',2);for(let i=0;i<10;i++)this.app.particles.emit('drop',d.center(),{vel:[0,2,0],velSpread:2,gravity:6,life:.8,size:.12});AU('splash');this.say(k==='pool'?'ぱちゃぱちゃ！ つめたーい！':'おみず、きらきら！',2000);}
   else if(k==='sandbox'){d.play('dig',2.4);AU('dig');for(let i=0;i<8;i++)this.app.particles.emit('dot',[d.x,.2,d.z+.3],{vel:[0,2,1],velSpread:1.5,gravity:8,life:.7,size:.09,color:'#e0c890'});}
   else if(k==='slide'){d.play('happy',1.6);AU('whoosh');this.say('すべりだい、しゅーっ！',1800);this.emote('star',2);}
   else if(k==='crosswalk'){d.play('sit',2);this.say('みぎ みて、ひだり みて…',1800);}
   else if(k==='tree'){d.play('look',2);this.app.particles.emit('apple',[x,1.6,z],{vel:[0,0,0],gravity:4,life:1,size:.25});AU('land');}
   else{d.play('sniff',2.2);this.app.particles.emit('flower',d.headTop(),{count:2,vel:[0,.6,0],velSpread:.5,life:1.2,size:.22});}}});return;}
  if(r<.6){const here=rects.filter(q=>Math.abs((q.x0+q.x1)/2-d.x)<12),pool=here.length?here:rects,q=pool[Math.floor(Math.random()*pool.length)];d.walkTo(q.x0+Math.random()*(q.x1-q.x0),q.z0+Math.random()*(q.z1-q.z0),{speed:1.1+Math.random()});}
  else if(r<.68){d.play('sniff',2.2);}
  else if(r<.76&&this.toy&&!this.toy.held&&this.toy.id==='toy_ball'){d.walkTo(this.toy.pos[0]-.4,this.toy.pos[2],{speed:1.8,onArrive:()=>{if(this.toy){this.toy.vel=[(Math.random()-.5)*3,1.5,(Math.random()-.5)*3];AU('land');d.play('happy',1);}}});}
  else if(r<.82){d.play('spin',1);}
  else if(r<.88&&C().mood(s)==='happy'){d.play('bark',.9);AU('bark');}
  else{d.play('tilt',1.6);}
 }
 update(dt){
  this.rebuild(false);const s=this.state,d=this.dog;d.mood=C().mood(s);
  if(!this.bath)d.setTint(s.clean<40?[.92,.86,.78]:null);
  if(!this.pointer&&!d.goal&&this.mode==='free')d.setLook(this.cam.pos);
  d.update(dt);this.applyGround(d,dt,true);this.npcs.update(dt);this.fishing.update(dt);for(const n of Object.values(this.npcs.list))this.applyGround(n.dog,dt,false);this.updateToy(dt);this.updateFlight(dt);this.updateFeed(dt);this.updateBath(dt);this.autonomy(dt);
  if(this.lesson?.trick==='wait'){this.lesson.waitT+=dt;if(!this.lesson.waitOk&&this.lesson.waitT>=1.5){this.lesson.waitOk=true;this.app.lessonWaitReady();}}
  if(d.goal&&!this.flight){const [x,z]=this.clampFloor(d.x,d.z);d.x=x;d.z=z;}
  const H=this.room.house;if(H){const ins=this.inHouse();this.houseA=damp(this.houseA,ins?.3:1,6,dt);H.front.alpha=this.houseA>.97?1:this.houseA;
   if(ins&&this.mode==='free'&&!this.feed){this.focusT=.45;this.houseFocus=true;}else if(this.houseFocus){this.houseFocus=false;if(this.mode==='free')this.focusT=0;}}
  this.introT=Math.max(0,this.introT-dt);this.updateCamera(dt);
 }
 render(r){
  if(!r.begin(this.cam,this.env))return;r.draw(this.room.node);
  if(this.foodNode.mesh){r.draw(this.foodNode);r.shadow(this.foodNode.pos[0],0,this.foodNode.pos[2],.6,.25);}
  const t=this.toy;if(t){t.node.pos=t.pos;t.node.rot=t.id==='toy_ball'?[t.node.rot[0]+Math.hypot(t.vel[0],t.vel[2])*.06,0,0]:[0,t.spin,0];r.draw(t.node);if(!t.held)r.shadow(t.pos[0],0,t.pos[2],.22*Math.max(.4,1-t.pos[1]*.3),.26);}
  for(const b of this.bubbles)r.sprite('bubble',b.p,b.r*2,[1,1,1,.95]);
  if(this.tub)r.draw(this.tub);
  this.fishing.render(r);this.npcs.render(r);this.dog.shadow(r);this.dog.draw(r);this.app.particles.render(r);r.end();
 }
 get snapshot(){return{x:this.dog.x,z:this.dog.z,action:this.dog.action,mode:this.mode,goal:!!this.dog.goal,feeding:this.feed?{kind:this.feed.kind,bite:this.feed.bite,phase:this.feed.phase,pos:this.feed.pos}:null,bath:this.bath?{...this.bath}:null,time:this.time,toy:this.toyId,flying:!!this.flight,play:this.play?.kind||null,yaw:this.yawT,pitch:this.pitchT,inHouse:this.inHouse(),fishing:this.fishing.snapshot};}
}
root.ShibaHome3D=Home;
})(globalThis);

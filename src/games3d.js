/* 3Dミニゲーム集。犬は元のGrant画像（ShibaSprite）、舞台は3D。
   共通: カウントダウン→プレイ→結果。生スコアは core.GAMES の★しきい値で評価。 */
(function(root){
'use strict';
const {Camera,Node,Geo,Props,v3,damp,TAU,rayPlaneY,raySphere,mix}=Gfx;
const C=()=>root.ShibaCore,W=()=>root.ShibaWorld,AU=(n,a)=>root.ShibaAudio.play(n,a);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const meshCache=new Map();const M=(k,fn)=>{if(!meshCache.has(k))meshCache.set(k,fn().mesh());return meshCache.get(k);};
const gemMesh=(c='#f2c14e')=>M('gem'+c,()=>new Geo().sphere(c,{s:[.18,.26,.18]},4,2));
function rayPlaneZ(ray,z=0){if(Math.abs(ray.d[2])<1e-5)return null;const t=(z-ray.o[2])/ray.d[2];if(t<0)return null;return v3.add(ray.o,v3.scale(ray.d,t));}

class Game{
 constructor(app,key,diff){
  this.app=app;this.key=key;this.diff=diff;this.sp={gentle:.85,normal:1,challenge:1.2}[diff]||1;
  this.cam=new Camera();this.cam.fov=50*Math.PI/180;this.P=app.particles;this.t=0;this.score=0;this.phase='ready';this.cd=0;this.finished=false;
  const s=app.state;this.dog=this.makeDog(s.coat,{neck:s.equipped.neck,head:s.equipped.head,face:s.equipped.face},C().stage(s));
  this.rand=W().mulberry((Math.random()*2**31)|0);this.env=W().outEnv('field');this.scene=null;this.setup();
 }
 makeDog(coat,equip,stage='adult'){const d=new ShibaSprite({coat,stage,equip:equip||{}});d.mood='happy';d.size=1.15;return d;}
 begin(){if(this.phase==='ready'){this.phase='count';this.cd=3;this.lastCd=4;}}
 update(dt){
  if(this.phase==='count'){this.cd-=dt;const n=Math.ceil(this.cd);if(n!==this.lastCd&&n>0){this.lastCd=n;this.app.callout(String(n),'count');AU('count');}if(this.cd<=0){this.phase='play';this.app.callout('スタート！','go');AU('go');this.onStart?.();}}
  else if(this.phase==='play'){this.t+=dt;this.step(dt);}
  if(this.ending){this.ending.left-=dt;if(this.ending.left<=0){const d=this.ending.detail();this.ending=null;this.finish(d);}}
  this.animate(dt);
 }
 animate(dt){this.dog.update(dt);}
 step(){}
 endIn(sec,detail){if(!this.ending&&!this.finished)this.ending={left:sec,detail};}
 finish(detail=''){if(this.finished)return;this.finished=true;this.phase='done';this.dog.forceSpeed=null;this.dog.forceDx=null;this.app.gameEnd({key:this.key,raw:Math.max(0,Math.round(this.score)),detail});}
 render(r){const asp=r.canvas.width/Math.max(1,r.canvas.height),REF=1.44,base=50*Math.PI/180;this.cam.fov=asp<REF?Math.min(1.45,2*Math.atan(Math.tan(base/2)*REF/asp)):base;
  if(this.side){const k=clamp(asp/REF,.45,1),fx=this.side.follow?this.dog.x:0;this.cam.pos[0]=this.side.px*k+fx;this.cam.target[0]=this.side.tx*k+fx;}
  if(!r.begin(this.cam,this.env))return;if(this.scene)r.draw(this.scene);this.draw(r);this.P.render(r);r.end();}
 draw(r){this.dog.shadow(r);this.dog.draw(r);}
 hud(){return{left:'',right:''};}
 down(){}move(){}up(){}control(){}
 get controls(){return null;}
 pop(img,pos,n=6,o={}){this.P.emit(img,pos,{count:n,vel:[0,1.6,0],velSpread:2,gravity:o.g??3,life:o.life||.8,size:o.size||.22,spread:.2,color:o.color});}
 float(text,pos,cls){this.app.floatText(text,pos,cls);}
 secs(v){return Math.max(0,Math.ceil(v))+'秒';}
}

/* ---------- おさんぽ（5コース） ---------- */
const TILE=16;
function walkTile(course,seed){
 const g=new Geo(),rnd=W().mulberry(seed),O=W().OUT[course];
 Props.ground(g,TILE,30,O.ground[0],O.ground[1],0,10,16);
 if(course!=='surfsea')g.box((p,n,e,wp)=>mix(O.path,'#ffffff',Math.abs(Math.sin(wp[0]*2.1))<.06?.25:0),{p:[0,.01,0],s:[TILE,.02,3.6]});
 g.box(mix(O.path,'#7a6a50',.25),{p:[0,.012,1.85],s:[TILE,.024,.12]});g.box(mix(O.path,'#7a6a50',.25),{p:[0,.012,-1.85],s:[TILE,.024,.12]});
 const back=x=>-2.9-rnd()*4,front=()=>2.8+rnd()*1.5;
 if(course==='sea'){g.box('#6fb7d2',{p:[0,.012,-8.4],s:[TILE,.02,10]});for(let i=0;i<6;i++)g.box('#e9f7fb',{p:[(rnd()-.5)*TILE,.03,-3.8-rnd()*5],s:[1.4,.02,.08]});for(let i=0;i<3;i++){const x=(rnd()-.5)*TILE;g.cyl('#a07a52',{p:[x,0,-2.7],r:[0,0,.15],s:[.1,2.2,.1]},.7,1,6);for(let k=0;k<5;k++){const a=k/5*TAU;g.sphere('#5fa86a',{p:[x+.3+Math.cos(a)*.5,2.15,-2.7+Math.sin(a)*.5],s:[.55,.08,.18],r:[0,a,0]},8,4);}}for(let i=0;i<5;i++)g.sphere('#f2c0a2',{p:[(rnd()-.5)*TILE,.05,front()],s:[.12,.06,.1]},6,4);}
 else if(course==='river'){g.box('#78bcd6',{p:[0,.012,-3.9],s:[TILE,.02,2]});for(let i=0;i<7;i++)g.box('#d9f0f7',{p:[(rnd()-.5)*TILE,.03,-3.3-rnd()*1.2],s:[.9,.02,.05]});for(let i=0;i<4;i++)Props.tree(g,(rnd()-.5)*TILE,-6-rnd()*3,1+rnd()*.5);for(let i=0;i<6;i++)Props.rock(g,(rnd()-.5)*TILE,-2.75,.5+rnd()*.3,'#a3aaa0');}
 else if(course==='town'){for(let i=0;i<3;i++)Props.house(g,-TILE/2+2.6+i*5.2+rnd(),-4.6,1.3+rnd()*.3,['#f1e3c8','#e6d2c2','#dfe8d4','#f2dccb'][Math.floor(rnd()*4)],['#c96b4f','#6f8fb5','#8f6a5a'][Math.floor(rnd()*3)]);for(let i=0;i<2;i++){const x=-TILE/2+4+i*8;g.cyl('#5b6770',{p:[x,0,-2.5],s:[.05,2.2,.05]},1,1,6);g.sphere('#fff3c4',{p:[x,2.25,-2.5],s:.15},8,6);}}
 else if(course==='mountain'){for(let i=0;i<6;i++)Props.pine(g,(rnd()-.5)*TILE,back(),1+rnd()*.7);for(let i=0;i<4;i++)Props.rock(g,(rnd()-.5)*TILE,-2.7-rnd(),.7+rnd()*.5);}
 else if(course==='flower'){for(let i=0;i<60;i++)Props.flower(g,(rnd()-.5)*TILE,i%2?-2.3-rnd()*6:2.3+rnd()*3,['#f28ab2','#f7d35c','#ffffff','#c9a7f4','#f08a3c'][i%5]);for(let i=0;i<3;i++)Props.tree(g,(rnd()-.5)*TILE,-8-rnd()*3,1.2,'#f4b6c9','#f8cfdc');}
 else if(course==='snow'){for(let i=0;i<6;i++){const x=(rnd()-.5)*TILE,z=back();Props.pine(g,x,z,1+rnd()*.7);g.cone('#ffffff',{p:[x,1.5,z],s:[.5,.9,.5]},8);}for(let i=0;i<5;i++)g.sphere('#ffffff',{p:[(rnd()-.5)*TILE,.1,front()],s:[.5,.25,.4]},10,6);}
 else if(course==='night'){for(let i=0;i<3;i++)Props.house(g,-TILE/2+2.6+i*5.2+rnd(),-4.6,1.3+rnd()*.3,['#4d5677','#5a5070','#465a6a'][Math.floor(rnd()*3)],'#2e3550');for(let i=0;i<3;i++){const x=-TILE/2+2+i*5.5;g.cyl('#3a4050',{p:[x,0,-2.4],s:[.05,2.2,.05]},1,1,6);g.sphere('#ffe89a',{p:[x,2.25,-2.4],s:.18},8,6);g.disk('#6c6a5a',{p:[x,.015,-1.6],s:[1.2,1,.8]},16);}}
 else if(course==='surfsea'){g.box('#5fb0d6',{p:[0,.02,0],s:[TILE,.02,30]});for(let i=0;i<14;i++)g.box('#e9f7fb',{p:[(rnd()-.5)*TILE,.04,(rnd()-.5)*12],s:[1.2+rnd(),.02,.07]});g.box('#f1e1b6',{p:[0,.03,-9],s:[TILE,.04,6]});for(let i=0;i<3;i++){const x=(rnd()-.5)*TILE;g.cyl('#a07a52',{p:[x,0,-7.5],r:[0,0,.15],s:[.1,2.2,.1]},.7,1,6);for(let k=0;k<5;k++){const a=k/5*TAU;g.sphere('#5fa86a',{p:[x+.3+Math.cos(a)*.5,2.15,-7.5+Math.sin(a)*.5],s:[.55,.08,.18],r:[0,a,0]},8,4);}}}
 else{for(let i=0;i<5;i++)Props.tree(g,(rnd()-.5)*TILE,back(),.9+rnd()*.5);for(let i=0;i<3;i++)Props.bush(g,(rnd()-.5)*TILE,-2.6,.8);g.box('#b78457',{p:[(rnd()-.5)*10,.35,-2.6],s:[1.3,.08,.4]});}
 if(course!=='snow'&&course!=='surfsea')for(let i=0;i<8;i++)Props.flower(g,(rnd()-.5)*TILE,course==='sea'?front()+1:front(),['#f4a6c1','#ffffff','#f7d35c','#c9a7f4'][i%4]);
 return g.mesh();
}
function walkBackdrop(course){const g=new Geo();if(course==='night'){g.sphere('#fff6cf',{p:[8,10,-26],s:1.4},14,10);for(let i=0;i<40;i++)g.sphere('#ffffff',{p:[-30+((i*7.3)%60),6+((i*3.7)%9),-27],s:.08},4,3);return new Node(g.mesh(),{emissive:1});}
 if(course==='snow'){for(let i=0;i<7;i++){const x=-30+i*11;g.cone('#e8eef5',{p:[x,0,-28],s:[7+i%3*2,6+(i%3)*3,5]},10);}}
 if(course==='mountain'||course==='park'||course==='river'||course==='flower'){for(let i=0;i<7;i++){const x=-30+i*11;g.cone(i%2?'#8fb29a':'#9fbfa6',{p:[x,0,-28],s:[7+i%3*2,6+(i%3)*3,5]},10);g.cone('#f4f7f2',{p:[x,(6+(i%3)*3)*.72,-28],s:[(7+i%3*2)*.28,(6+(i%3)*3)*.28,1.4]},10);}}
 for(let i=0;i<5;i++)Props.cloud(g,-24+i*12,9+(i%2)*2,-26,1.8);return new Node(g.mesh());}
function boardMesh(kind){return M('board'+kind,()=>{const g=new Geo();if(kind==='surf'){g.sphere((p)=>Math.abs(p[2])<.12?'#e05d6f':'#ffffff',{s:[.95,.05,.32]},16,6);}else{g.box('#3b5ba5',{p:[0,.06,0],s:[.9,.04,.26]});for(const x of [-.3,.3])for(const z of [-.1,.1])g.cyl('#f2c14e',{p:[x,0,z],r:[Math.PI/2,0,0],s:[.05,.04,.05]},1,1,8);}return g;});}
function obstacleMesh(course){return M('ob'+course,()=>{const g=new Geo();
 if(course==='town'){g.box('#f1f1f1',{p:[0,.03,0],s:[.6,.06,.6]});g.cone((p)=>Math.abs(p[1]-.45)<.12?'#ffffff':'#ef7f4f',{p:[0,.06,0],s:[.24,.7,.24]},14);}
 else if(course==='sea')g.blob((u)=>[u[0]*(1+.25*Math.max(0,-u[2])),u[1],u[2]],(u)=>mix('#f4c3a6','#fde7d6',Math.abs(Math.sin(Math.atan2(u[0],u[2])*5))),{p:[0,.14,0],s:[.38,.2,.36]},16,10);
 else if(course==='mountain'||course==='surfsea')Props.rock(g,0,0,1.1,course==='surfsea'?'#7d8790':'#9aa39c');
 else if(course==='snow'){g.sphere('#ffffff',{p:[0,.3,0],s:.32},12,8);g.sphere('#ffffff',{p:[0,.75,0],s:.22},12,8);g.cone('#f08a3c',{p:[0,.75,.2],r:[Math.PI/2,0,0],s:[.04,.14,.04]},6);for(const x of [-.07,.07])g.sphere('#222',{p:[x,.82,.19],s:.025},4,3);g.cyl('#d9534f',{p:[0,.92,0],s:[.16,.12,.16]},.8,1,10);}
 else if(course==='night'){g.box('#b78457',{p:[0,.25,0],s:[.55,.5,.5]});g.box('#9a6d44',{p:[0,.51,0],s:[.57,.03,.52]});}
 else if(course==='flower'){g.cyl('#d58b62',{s:[.28,.4,.28]},1.15,1,14);for(let i=0;i<6;i++){const a=i/6*TAU;g.sphere(['#f28ab2','#f7d35c','#c9a7f4'][i%3],{p:[Math.cos(a)*.16,.55,Math.sin(a)*.16],s:.12},8,6);}g.sphere('#7fb069',{p:[0,.45,0],s:[.3,.15,.3]},10,6);}
 else if(course==='river')g.disk('#6aaecb',{p:[0,.03,0],s:[.62,1,.48]},20).disk('#a7d6e6',{p:[.08,.035,.06],s:[.25,1,.16]},12);
 else{g.cyl('#d58b62',{s:[.28,.4,.28]},1.15,1,14);g.sphere('#7fb069',{p:[0,.58,0],s:[.36,.3,.32]},10,7);g.sphere('#f4a6c1',{p:[.12,.75,.1],s:.07},6,4);}
 return g;});}
class Walk extends Game{
 setup(){
  this.course=this.key.slice(5);const c=C().COURSES[this.course];this.duration=c.duration;this.speed=c.speed*this.sp;this.env=W().outEnv(this.course,{fogNear:18,fogFar:55});
  this.tiles=[0,1,2].map(i=>new Node(walkTile(this.course,i*31+7)));this.back=walkBackdrop(this.course);this.ob=obstacleMesh(this.course);
  this.dog.forceSpeed=0;this.dog.forceDx=1;this.tz=0;this.vy=0;this.obs=[];this.coins=[];this.spawnT=1.2;this.coinT=.6;this.dist=0;this.hits=0;this.got=0;this.inv=0;this.goal=null;this.drag=null;
  this.cam.pos=[1.7,2.5,5.6];this.cam.target=[2.7,.55,-.3];this.side={px:1.7,tx:2.7};
 }
 get controls(){return{type:'jump'};}
 onStart(){this.dog.forceSpeed=5;}
 control(n){if(n==='jump')this.jump();}
 jump(){if(this.phase!=='play'||this.dog.jumpY>.01)return;this.vy=5.6;AU('jump');}
 down(i){this.drag={id:i.id,sx:i.x,sy:i.y,moved:0};}
 move(i){if(!this.drag||this.drag.id!==i.id)return;this.drag.moved=Math.hypot(i.x-this.drag.sx,i.y-this.drag.sy);const h=rayPlaneY(i.ray,0);if(h&&this.drag.moved>8)this.tz=clamp(h[2],-1.35,1.35);}
 up(i){if(this.drag&&this.drag.id===i.id&&this.drag.moved<10)this.jump();this.drag=null;}
 step(dt){
  const v=this.speed;this.dist+=v*dt;this.inv=Math.max(0,this.inv-dt);
  this.vy-=15*dt;this.dog.jumpY=Math.max(0,this.dog.jumpY+this.vy*dt);if(this.dog.jumpY===0)this.vy=Math.max(0,this.vy);
  this.dog.z=damp(this.dog.z,this.tz,10,dt);
  const left=this.duration-this.t;
  if(left>3){this.spawnT-=dt;if(this.spawnT<=0){this.spawnT=(1.25+this.rand()*.8)/this.sp;const lanes=[-1.1,0,1.1],a=Math.floor(this.rand()*3);this.obs.push({x:24,z:lanes[a],hit:false});if(this.diff==='challenge'&&this.rand()<.3)this.obs.push({x:24,z:lanes[(a+1+Math.floor(this.rand()*2))%3],hit:false});}
   this.coinT-=dt;if(this.coinT<=0){this.coinT=(2.2+this.rand())/this.sp;const z=[-1.1,0,1.1][Math.floor(this.rand()*3)],air=this.rand()<.3;for(let k=0;k<3;k++)this.coins.push({x:27+k*1.1,z,y:air?1.25:.45,taken:false});}}
  else if(!this.goal){this.goal={x:v*3};}
  for(const o of this.obs){o.x-=v*dt;if(!o.hit&&Math.abs(o.x)<.45&&Math.abs(o.z-this.dog.z)<.5&&this.dog.jumpY<.32){o.hit=true;if(!this.inv){this.hits++;this.inv=1;this.dog.play('dizzy',.6);AU('hit');this.float('ぽこん',this.dog.headTop(),'bad');this.app.say('ぽこん。だいじょうぶ！ あいている みちへ いこう。',1500);}}}
  for(const c of this.coins){c.x-=v*dt;if(!c.taken&&Math.abs(c.x)<.5&&Math.abs(c.z-this.dog.z)<.55&&Math.abs(c.y-(this.dog.jumpY+.45))<.55){c.taken=true;this.got++;AU('coin');this.pop('sparkle',[0,c.y,c.z],4);}}
  this.obs=this.obs.filter(o=>o.x>-8);this.coins=this.coins.filter(c=>c.x>-8&&!c.taken);
  if(this.goal){this.goal.x-=v*dt;if(this.goal.x<=0){this.score=clamp(10-this.hits*2,0,10)+Math.floor(this.got/2);this.pop('star',[0,1.2,0],14,{size:.3});this.finish('きらきら '+this.got+'こ · ぽこん '+this.hits+'回');}}
 }
 animate(dt){this.dog.update(dt);}
 draw(r){
  const off=this.dist%TILE;this.tiles.forEach((n,i)=>{n.pos=[(i-1)*TILE-off+TILE*.5,0,0];r.draw(n);});r.draw(this.back);
  const tmp=new Node(this.ob);for(const o of this.obs){tmp.pos=[o.x,0,o.z];r.draw(tmp);r.shadow(o.x,0,o.z,.4,.22);}
  for(const c of this.coins)r.sprite('coin',[c.x,c.y,c.z],.42,[1,1,1,1],Math.sin(this.t*4+c.x)*.2);
  if(this.goal){const g=new Node(M('goal',()=>{const q=new Geo();for(const z of [-2,2])q.cyl('#e9c46a',{p:[0,0,z],s:[.09,2.6,.09]},1,1,8);q.box((p)=>((Math.floor((p[0]+.5)*8)+Math.floor((p[1]+.5)*2))%2)?'#ffffff':'#e05d6f',{p:[0,2.5,0],s:[.12,.5,4.2]});return q;}),{pos:[this.goal.x,0,0]});r.draw(g);}
  this.dog.alpha=this.inv&&Math.floor(this.t*12)%2?.45:1;this.dog.shadow(r);if(this.board)r.draw(new Node(boardMesh(this.board),{pos:[this.dog.x,this.dog.jumpY+.02,this.dog.z],rot:[0,0,Math.sin(this.t*3)*.05]}));this.dog.draw(r);
 }
 hud(){return{left:'✨ '+this.got,right:Math.min(100,Math.floor(this.t/this.duration*100))+'% · ぽこん '+this.hits};}
}

/* ---------- ボール投げ ---------- */
class Ball extends Game{
 setup(){
  this.scene=W().buildField({seed:3,keepClear:(x,z)=>Math.abs(x)<5&&z>-18&&z<6});this.cam.pos=[0,2.1,6.6];this.cam.target=[0,.4,-6];
  this.ballN=new Node(W().ballMesh('#d8b775'));this.ballP=[.4,.9,3.8];this.flight=null;this.throws=0;this.catches=0;this.ready=true;this.newTarget();
  this.dog.x=1.3;this.dog.z=3.4;this.home=[1.3,3.4];this.swipe=null;this.trail=[];
 }
 newTarget(){this.target=[(this.rand()-.5)*6,-(7+this.rand()*7)];this.wind=(this.rand()-.5)*2*(this.diff==='gentle'?.6:1);}
 down(i){if(this.phase!=='play'||!this.ready)return;this.swipe={id:i.id,x:i.x,y:i.y,t:performance.now(),pts:[[i.x,i.y]]};}
 move(i){if(this.swipe?.id===i.id)this.swipe.pts.push([i.x,i.y]);}
 up(i){const s=this.swipe;this.swipe=null;if(!s||s.id!==i.id||!this.ready||this.phase!=='play')return;const dx=i.x-s.x,dy=s.y-i.y,len=Math.hypot(dx,dy);
  if(dy<30){this.app.say('ボールを うえに はじいて なげてね。',1500);return;}
  const H=this.app.viewH,power=clamp(len/(H*.5),.25,1.25),dist=4+power*11,ang=clamp(dx/len,-.7,.7)*.55;
  const start=[...this.ballP],land=[start[0]+Math.sin(ang)*dist+this.wind*dist*.12,0,start[2]-Math.cos(ang)*dist],T=.9+dist*.035;
  this.flight={start,land,T,t:0,h:1.6+dist*.17,caught:false,bounced:false};this.ready=false;this.throws++;AU('whoosh');
  // 犬は落下点へ走る
  this.dog.walkTo(land[0],land[2]+.2,{speed:7.5});this.dog.excite=4;
 }
 step(dt){
  const f=this.flight;if(!f){return;}
  if(!f.done){f.t+=dt;const p=Math.min(1,f.t/f.T);this.ballP=[f.start[0]+(f.land[0]-f.start[0])*p,f.start[1]*(1-p)+.15+4*f.h*p*(1-p),f.start[2]+(f.land[2]-f.start[2])*p];
   const dd=Math.hypot(this.dog.x-this.ballP[0],this.dog.z-this.ballP[2]);
   if(!f.caught&&p>.7&&dd<.7&&this.ballP[1]<1.9){f.caught=true;f.done=true;this.dog.goal=null;this.dog.play('catch',.6);this.dog.jumpY=.01;this.jumpV=4;this.catches++;AU('perfect');this.float('ダイレクトキャッチ！',this.dog.headTop(),'good');this.scoreLanding(f.land,2);}
   else if(p>=1){f.done=true;AU('land');this.scoreLanding(f.land,0);}}
  else{f.after=(f.after||0)+dt;if(!f.picked&&Math.hypot(this.dog.x-this.ballP[0],this.dog.z-this.ballP[2])<.5){f.picked=true;}
   if(!f.picked&&!this.dog.goal)this.dog.walkTo(this.ballP[0],this.ballP[2]+.2,{speed:7});
   if(f.picked||f.caught){const m=this.dog.mouthPos();this.ballP=[m[0],m[1],m[2]+.1];if(!f.returning){f.returning=true;this.dog.walkTo(this.home[0],this.home[1],{speed:6,onArrive:()=>{this.dog.faceTo(0,10);this.dog.play('happy',1);this.flight=null;this.ballP=[.4,.9,3.8];this.newTarget();if(this.throws>=5)this.endIn(0.5,()=>'キャッチ '+this.catches+'回');else this.ready=true;}});}}}
  if(this.jumpV!==undefined){this.jumpV-=14*dt;this.dog.jumpY=Math.max(0,this.dog.jumpY+this.jumpV*dt);if(this.dog.jumpY===0)this.jumpV=undefined;}
 }
 scoreLanding(land,bonus){const d=Math.hypot(land[0]-this.target[0],land[2]-this.target[1]);const pts=d<.75?5:d<1.5?3:d<2.3?1:0;this.score+=pts+bonus;const t=pts===5?'まん中！ +'+(pts+bonus):pts?'+'+(pts+bonus):bonus?'+'+bonus:'おしい！';this.float(t,[land[0],1,land[2]],pts>=3?'good':'');if(pts===5){AU('sparkle');this.pop('star',[land[0],.3,land[2]],10);}this.app.say(pts?'ナイス！ とってきてくれるよ。':'とってくるね！ つぎは かぜも みてね。',1600);}
 draw(r){
  const ring=M('rings',()=>{const g=new Geo();g.disk('#f4f1e6',{p:[0,.012,0],s:[2.3,1,2.3]},40);g.disk('#9cc0e6',{p:[0,.016,0],s:[1.5,1,1.5]},36);g.disk('#f2c14e',{p:[0,.02,0],s:[.75,1,.75]},30);return g;});
  r.draw(new Node(ring,{pos:[this.target[0],0,this.target[1]]}));
  // 風の旗
  const flag=new Node(M('flag',()=>new Geo().cyl('#8a6a4a',{s:[.04,2,.04]},1,1,6).box('#e05d6f',{p:[.35,1.75,0],s:[.7,.4,.02]})),{pos:[this.target[0]+2.8,0,this.target[1]],scl:[Math.sign(this.wind)||1,1,1]});r.draw(flag);
  this.ballN.pos=this.ballP;this.ballN.rot[0]+=.2;r.draw(this.ballN);r.shadow(this.ballP[0],0,this.ballP[2],.17,.25);
  if(this.swipe&&this.swipe.pts.length>1){const last=this.swipe.pts[this.swipe.pts.length-1];const len=Math.hypot(last[0]-this.swipe.x,this.swipe.y-last[1]),pw=clamp(len/(this.app.viewH*.5),.25,1.25),dist=4+pw*11,ang=clamp((last[0]-this.swipe.x)/Math.max(1,len),-.7,.7)*.55;for(let k=1;k<=8;k++){const p=k/8,x=this.ballP[0]+Math.sin(ang)*dist*p,z=this.ballP[2]-Math.cos(ang)*dist*p;r.sprite('dot',[x,.05+4*(1.6+dist*.17)*p*(1-p)*.5,z],.16,[1,1,1,.8]);}}
  this.dog.shadow(r);this.dog.draw(r);
 }
 hud(){const w=Math.abs(this.wind)<.15?'風なし':(this.wind>0?'風 →':'← 風')+(Math.abs(this.wind)>.6?'つよい':'');return{left:this.score+'ポイント',right:Math.min(5,this.throws)+' / 5投 · '+w};}
}

/* ---------- アスレチック ---------- */
class Athletic extends Game{
 setup(){
  this.scene=null;this.tiles=[0,1,2].map(i=>new Node(M('athTile'+i,()=>{const g=new Geo(),rnd=W().mulberry(i*13+5);Props.ground(g,TILE,30,'#a9d18e','#93c27a',0,10,14);g.box('#ecdcb7',{p:[0,.01,0],s:[TILE,.02,2.2]});for(let k=0;k<4;k++)Props.tree(g,(rnd()-.5)*TILE,-4-rnd()*5,1+rnd()*.5);for(let k=0;k<3;k++)Props.bush(g,(rnd()-.5)*TILE,-2.2,.8);for(let k=0;k<6;k++)Props.flower(g,(rnd()-.5)*TILE,2+rnd()*2,['#f4a6c1','#f7d35c','#ffffff'][k%3]);return g;})));
  this.back=walkBackdrop('park');this.env=W().outEnv('park');this.cam.pos=[2,1.7,5.8];this.cam.target=[2.6,.95,0];this.side={px:2,tx:2.6};this.dog.forceDx=1;this.dog.forceSpeed=0;
  this.vy=0;this.hold=false;this.hurdles=[];this.treats=[];this.spawnT=1.5;this.dist=0;this.combo=0;this.best=0;this.cleared=0;this.hits=0;this.duration=30;this.speed=6*this.sp;this.inv=0;
 }
 get controls(){return{type:'jump',hold:true};}
 onStart(){this.dog.forceSpeed=5;}
 control(n,on){if(n==='jump'){if(on!==false){this.hold=true;this.jump();}else this.hold=false;}}
 jump(){if(this.phase!=='play'||this.dog.jumpY>.01)return;this.vy=6.4;AU('jump');}
 down(){this.hold=true;this.jump();}up(){this.hold=false;}
 step(dt){
  const v=this.speed*(1+this.t/60);this.dist+=v*dt;this.inv=Math.max(0,this.inv-dt);
  const g=this.vy>0&&this.hold?11:24;this.vy-=g*dt;this.dog.jumpY=Math.max(0,this.dog.jumpY+this.vy*dt);if(this.dog.jumpY===0){if(this.vy<-1)AU('land');this.vy=Math.max(0,this.vy);}
  this.dog.play(this.dog.jumpY>.05?'jump':'idle');
  if(this.t<this.duration-1.5){this.spawnT-=dt;if(this.spawnT<=0){this.spawnT=(1.4+this.rand()*.9)/this.sp;const h=this.rand()<.35+this.t/80?.75:.48;this.hurdles.push({x:20,h,hit:false,passed:false});if(this.rand()<.7)this.treats.push({x:20+v*.45,y:h+1+this.rand()*.4,taken:false});}}
  for(const o of this.hurdles){o.x-=v*dt;if(!o.hit&&!o.passed&&Math.abs(o.x)<.32&&this.dog.jumpY<o.h-.04){o.hit=true;this.hits++;this.combo=0;this.inv=.8;this.dog.play('dizzy',.5);AU('hit');this.float('あっ！',this.dog.headTop(),'bad');}
   if(!o.passed&&o.x<-.35){o.passed=true;if(!o.hit){this.cleared++;this.combo++;this.best=Math.max(this.best,this.combo);this.score+=2+(this.combo>=5?1:0);if(this.combo%5===0){this.float(this.combo+'れんぞく！',this.dog.headTop(),'good');AU('perfect');}else AU('good');}}}
  for(const tr of this.treats){tr.x-=v*dt;if(!tr.taken&&Math.abs(tr.x)<.45&&Math.abs(tr.y-(this.dog.jumpY+.6))<.55){tr.taken=true;this.score++;AU('coin');this.pop('sparkle',[0,tr.y,0],5);}}
  this.hurdles=this.hurdles.filter(o=>o.x>-6);this.treats=this.treats.filter(o=>o.x>-6&&!o.taken);
  if(this.t>=this.duration)this.finish('ジャンプ成功 '+this.cleared+'回 · 最高'+this.best+'れんぞく');
 }
 draw(r){
  const off=this.dist%TILE;this.tiles.forEach((n,i)=>{n.pos=[(i-1)*TILE-off+TILE*.5,0,0];r.draw(n);});r.draw(this.back);
  if(this.cones){for(const o of this.hurdles){r.draw(new Node(obstacleMesh('town'),{pos:[o.x,0,0],scl:[1,o.h/.7+.3,1]}));r.shadow(o.x,0,0,.4,.2);}}
  else for(const o of this.hurdles){const mesh=M('hurdle'+o.h,()=>{const g=new Geo();for(const z of [-.7,.7])g.cyl('#f4f1e6',{p:[0,0,z],s:[.05,o.h+.05,.05]},1,1,8);g.box((p)=>Math.floor((p[2]+.5)*6)%2?'#ffffff':'#e05d6f',{p:[0,o.h,0],s:[.1,.1,1.5]});return g;});r.draw(new Node(mesh,{pos:[o.x,0,0]}));r.shadow(o.x,0,0,.5,.16);}
  for(const tr of this.treats)r.sprite('bone',[tr.x,tr.y,0],.45,[1,1,1,1],Math.sin(this.t*5)*.2);
  this.dog.alpha=this.inv&&Math.floor(this.t*12)%2?.45:1;this.dog.shadow(r);if(this.board)r.draw(new Node(boardMesh(this.board),{pos:[this.dog.x,this.dog.jumpY+.02,this.dog.z]}));this.dog.draw(r);
 }
 hud(){return{left:this.score+'ポイント · '+this.combo+'れんぞく',right:'のこり '+this.secs(this.duration-this.t)};}
}

/* ---------- ドッグラン ---------- */
class Run extends Game{
 setup(){
  const fx=6.5,fz=4.5;this.F={fx,fz};const g=new Geo();Props.ground(g,60,60,'#b2d896','#9ccb82',0,24,24);g.plane('#c8e2aa',{p:[0,.008,0],s:[fx*2,1,fz*2]});
  Props.fence(g,-fx,-fz,fx,-fz);Props.fence(g,-fx,fz,fx,fz);Props.fence(g,-fx,-fz,-fx,fz);Props.fence(g,fx,-fz,fx,fz);
  const rnd=this.rand;this.rocks=[];for(let i=0;i<4;i++){let x,z,tries=0;do{x=(rnd()-.5)*(fx*2-3);z=(rnd()-.5)*(fz*2-2.5);tries++;}while(tries<30&&(Math.hypot(x,z)<1.5||this.rocks.some(o=>Math.hypot(o.x-x,o.z-z)<2.2)));this.rocks.push({x,z,r:.55});if(i%2)Props.rock(g,x,z,1.1);else Props.bush(g,x,z,1.1);}
  for(let i=0;i<12;i++){const a=i/12*TAU;Props.tree(g,Math.cos(a)*(fx+4+rnd()*3),Math.sin(a)*(fz+4+rnd()*3),1+rnd()*.5);}
  for(let i=0;i<5;i++)Props.cloud(g,(rnd()-.5)*50,11,-30,2.2);
  this.scene=new Node(g.mesh());this.cam.pos=[0,9.5,9.2];this.cam.target=[0,0,.4];
  this.stars=[];for(let i=0;i<8;i++){let x,z,tries=0;do{x=(rnd()-.5)*(fx*2-1.5);z=(rnd()-.5)*(fz*2-1.5);tries++;}while(tries<60&&(this.rocks.some(o=>Math.hypot(o.x-x,o.z-z)<1.3)||this.stars.some(s=>Math.hypot(s.x-x,s.z-z)<1.6)||Math.hypot(x,z)<1.2));this.stars.push({x,z,taken:false});}
  this.friends=[['black','white'],['white','brown'],['brown','black']].find(p=>p[0]!==this.app.state.coat&&p[1]!==this.app.state.coat)||['white','black'];
  this.friends=this.friends.map((coat,i)=>{const d=this.makeDog(coat,{});d.x=i?4:-4;d.z=i?2:-2;d.cool=0;return d;});
  this.target=null;this.got=0;this.greets=0;this.duration={gentle:50,normal:45,challenge:38}[this.diff]||45;
 }
 down(i){this.setTarget(i);}move(i){if(i.pressed)this.setTarget(i);}
 setTarget(i){if(this.phase!=='play')return;const h=rayPlaneY(i.ray,0);if(!h)return;this.target=[clamp(h[0],-this.F.fx+.5,this.F.fx-.5),clamp(h[2],-this.F.fz+.5,this.F.fz-.5)];this.dog.walkTo(this.target[0],this.target[1],{speed:4.6});}
 animate(dt){this.dog.update(dt);for(const f of this.friends){f.update(dt);if(!f.goal&&this.phase==='play'&&Math.random()<dt*.8)f.walkTo((Math.random()-.5)*(this.F.fx*2-1),(Math.random()-.5)*(this.F.fz*2-1),{speed:1.5+Math.random()});f.cool=Math.max(0,f.cool-dt);}}
 step(dt){
  const d=this.dog;for(const o of this.rocks){const dx=d.x-o.x,dz=d.z-o.z,dd=Math.hypot(dx,dz),min=o.r+.35;if(dd<min){d.x=o.x+dx/dd*min;d.z=o.z+dz/dd*min;}}
  for(const f of this.friends)for(const o of this.rocks){const dx=f.x-o.x,dz=f.z-o.z,dd=Math.hypot(dx,dz),min=o.r+.35;if(dd<min){f.x=o.x+dx/dd*min;f.z=o.z+dz/dd*min;f.goal=null;}}
  for(const s of this.stars)if(!s.taken&&Math.hypot(s.x-d.x,s.z-d.z)<.6){s.taken=true;this.got++;this.score+=2;AU('coin');this.pop('sparkle',[s.x,.6,s.z],8);this.float('+2',[s.x,1,s.z],'good');}
  for(const f of this.friends)if(!f.cool&&Math.hypot(f.x-d.x,f.z-d.z)<.85){f.cool=4;this.greets++;this.score++;f.goal=null;f.faceTo(d.x,d.z);f.play('happy',1);this.pop('heart',f.headTop(),3,{g:0});AU('bark2');this.app.say('おともだちと、こんにちは。♡',1400);}
  if(this.got===8){const bonus=Math.floor((this.duration-this.t)/3);this.score+=bonus;this.finish('きらきら 8こ全部！ ボーナス+'+bonus);}
  else if(this.t>=this.duration)this.finish('きらきら '+this.got+'こ · あいさつ '+this.greets+'回');
 }
 draw(r){for(const s of this.stars)if(!s.taken){r.draw(new Node(gemMesh(),{pos:[s.x,.55+Math.sin(this.t*3+s.x)*.08,s.z],rot:[0,this.t*2,0]}));r.shadow(s.x,0,s.z,.2,.18);}
  for(const f of this.friends){f.shadow(r);f.draw(r);}this.dog.shadow(r);this.dog.draw(r);if(this.target)r.sprite('ring',[this.target[0],.05,this.target[1]],.5,[1,1,1,.5]);}
 hud(){return{left:'✨ '+this.got+' / 8',right:'のこり '+this.secs(this.duration-this.t)};}
}

/* ---------- フリスビー（タイミング） ---------- */
class Frisbee extends Game{
 setup(){
  this.scene=W().buildField({seed:11,keepClear:(x,z)=>Math.abs(z)<4&&x>-4&&x<16});this.cam.pos=[1.6,1.6,5.9];this.cam.target=[2.4,1.15,0];this.side={px:1.6,tx:2.4};this.dog.forceDx=1;this.dog.x=0;this.dog.z=0;
  this.discs=[];this.n=0;this.total=12;this.nextT=1;this.perfect=0;this.good=0;this.combo=0;this.best=0;this.jv=undefined;
  this.discMesh=M('disc',()=>new Geo().cyl('#4a90d9',{p:[0,-.02,0],s:[.3,.05,.3]},1,1,22).torus('#ffffff',{p:[0,.02,0]},.24,.02,22,5));
 }
 spawn(){const T=Math.max(.95,1.75-this.n*.07)/this.sp,y=1+this.rand()*.7;this.discs.push({t0:this.t,T,y,state:'fly',x:12,catchT:this.t+T});this.n++;}
 down(){this.tapIt();}control(n){if(n==='jump')this.tapIt();}
 get controls(){return{type:'jump',label:'キャッチ！'};}
 tapIt(){if(this.phase!=='play')return;const d=this.discs.find(x=>x.state==='fly');if(!d||this.dog.jumpY>.01)return;const dt=this.t-d.catchT,a=Math.abs(dt);
  this.jv=5.4;this.dog.play('catch',.7);AU('jump');
  if(a<.09){d.state='caught';this.perfect++;this.combo++;this.score+=3;this.float('PERFECT!',[0,2.2,0],'perfect');AU('perfect');this.pop('star',[0,1.6,0],10);}
  else if(a<.2){d.state='caught';this.good++;this.combo++;this.score+=1;this.float('GOOD',[0,2.2,0],'good');AU('good');}
  else if(dt<0&&a<.5){this.float('はやい！',[0,2.2,0],'bad');AU('miss');this.combo=0;}
  else{this.float('ミス',[0,2.2,0],'bad');this.combo=0;AU('miss');}
  if(this.combo&&this.combo%4===0){this.score+=2;this.float(this.combo+'れんぞく +2',[0,2.7,0],'good');}this.best=Math.max(this.best,this.combo);}
 step(dt){
  this.nextT-=dt;if(this.nextT<=0&&this.n<this.total&&!this.discs.some(d=>d.state==='fly')){this.spawn();this.nextT=.7+this.rand()*.6;}
  for(const d of this.discs){const p=(this.t-d.t0)/d.T;if(d.state==='fly'){d.x=12*(1-p);d.yy=d.y+Math.sin(p*Math.PI)*1.2*(1-p);if(this.t-d.catchT>.22){d.state='missed';this.combo=0;this.float('ミス',[0,2.2,0],'bad');AU('miss');this.dog.play('sadlook',.8);}}
   else if(d.state==='missed'){d.x-=6*dt;d.yy=Math.max(.05,d.yy-2.5*dt);}
   else if(d.state==='caught'){const m=this.dog.mouthPos();d.x=m[0]+.15;d.yy=m[1];}}
  if(this.jv!==undefined){this.jv-=15*dt;this.dog.jumpY=Math.max(0,this.dog.jumpY+this.jv*dt);if(this.dog.jumpY===0){this.jv=undefined;this.discs=this.discs.filter(d=>d.state!=='caught');}}
  this.discs=this.discs.filter(d=>d.x>-6);
  if(this.n>=this.total&&!this.discs.some(d=>d.state==='fly')&&this.jv===undefined&&!this.endT)this.endT=this.t;
  if(this.endT&&this.t-this.endT>.8)this.finish('PERFECT '+this.perfect+' · GOOD '+this.good+' · 最高'+this.best+'れんぞく');
 }
 draw(r){
  for(const d of this.discs){r.draw(new Node(this.discMesh,{pos:[d.x,d.yy??d.y,0],rot:[.25,this.t*12,0]}));r.shadow(d.x,0,0,.25,.18);
   if(d.state==='fly'){const left=d.catchT-this.t,k=clamp(left/d.T,0,1);r.sprite('ring',[0,d.y+.45,0],.75+k*2.2,k<.08?[1,.85,.3,1]:[1,1,1,.85]);}}
  this.dog.shadow(r);this.dog.draw(r);
 }
 hud(){return{left:this.score+'ポイント · '+this.combo+'れんぞく',right:Math.min(this.n,this.total)+' / '+this.total+'まい'};}
}

/* ---------- おやつキャッチ ---------- */
class Treat extends Game{
 setup(){
  const g=new Geo();Props.ground(g,50,40,'#b2d896','#9ccb82',0,20,20);Props.tree(g,-4,-3,2.4);Props.tree(g,4.5,-3.5,2.1);Props.tree(g,0,-6,2.8);for(let i=0;i<10;i++)Props.flower(g,(Math.random()-.5)*10,1+Math.random()*2,['#f4a6c1','#f7d35c','#ffffff'][i%3]);for(let i=0;i<4;i++)Props.cloud(g,-12+i*8,8,-20,1.8);
  this.scene=new Node(g.mesh());this.cam.pos=[0,2.1,6.6];this.cam.target=[0,1.75,0];this.dog.x=0;this.dog.z=0;this.dog.faceTo(0,10);this.tx=0;
  this.items=[];this.spawnT=.6;this.duration=30;this.caught=0;this.stun=0;this.combo=0;
 }
 down(i){this.aim(i);}move(i){if(i.pressed)this.aim(i);}
 aim(i){const h=rayPlaneZ(i.ray,0);if(h)this.tx=clamp(h[0],-3.6,3.6);}
 step(dt){
  const k=this.t/this.duration;this.stun=Math.max(0,this.stun-dt);
  this.spawnT-=dt;if(this.spawnT<=0&&this.t<this.duration-1){this.spawnT=(.85-k*.4)/this.sp;const r=this.rand(),type=r<.13?'bee':r<.2?'goldstar':['meat','bone','cookie','apple'][Math.floor(this.rand()*4)];this.items.push({type,x:(this.rand()-.5)*7,y:6.5,vy:-(2.3+k*2.2)*this.sp*(type==='bee'?.8:1),wob:this.rand()*6});}
  const d=this.dog;if(!this.stun){const nx=damp(d.x,this.tx,9,dt),vx=(nx-d.x)/dt;d.x=nx;d.forceSpeed=Math.abs(vx)>.4?3:0;d.forceDx=vx>0?1:-1;}else d.forceSpeed=0;
  const mouth=d.height*.55;
  for(const it of this.items){it.y+=it.vy*dt;if(it.type==='bee')it.x+=Math.sin(this.t*4+it.wob)*dt*1.5;
   if(!it.done&&Math.abs(it.x-d.x)<.55&&it.y<mouth+.45&&it.y>mouth-.35){it.done=true;
    if(it.type==='bee'){this.score=Math.max(0,this.score-2);this.stun=1;this.combo=0;d.play('dizzy',1);AU('hit');this.float('チクッ！ -2',d.headTop(),'bad');}
    else{const pts=it.type==='goldstar'?3:1;this.combo++;this.score+=pts+(this.combo>=10?1:0);this.caught++;d.play('happy',.4);AU(it.type==='goldstar'?'sparkle':'eat');this.pop(it.type==='goldstar'?'star':'sparkle',[it.x,it.y,0],5);this.float('+'+(pts+(this.combo>=10?1:0)),[it.x,it.y+.5,0],'good');}}
   if(!it.done&&it.y<.1){it.done=true;if(it.type!=='bee'){this.combo=0;this.pop('dot',[it.x,.1,0],4,{color:'#ffffff',size:.12});}}}
  this.items=this.items.filter(i=>!i.done);
  if(this.t>=this.duration)this.finish('キャッチ '+this.caught+'こ');
 }
 draw(r){for(const it of this.items){r.sprite(it.type,[it.x,it.y,.05],it.type==='bee'?.62:.7,[1,1,1,1],Math.sin(this.t*3+it.wob)*.3);r.shadow(it.x,0,0,.18*clamp(1-it.y/7,.3,1),.18);}this.dog.alpha=this.stun&&Math.floor(this.t*10)%2?.5:1;this.dog.shadow(r);this.dog.draw(r);}
 hud(){return{left:this.score+'ポイント'+(this.combo>=5?' · '+this.combo+'れんぞく':''),right:'のこり '+this.secs(this.duration-this.t)};}
}

/* ---------- たからほり ---------- */
class Dig extends Game{
 setup(){
  const g=new Geo();Props.ground(g,50,50,'#a9d18e','#93c27a',0,20,20);g.plane('#c7b08a',{p:[0,.006,0],s:[8.6,1,6]});Props.fence(g,-4.6,-3.4,4.6,-3.4,'#c9a77a');for(let i=0;i<6;i++)Props.tree(g,-10+i*4,-7-Math.random()*2,1.2);for(let i=0;i<8;i++)Props.flower(g,-4+i*1.1,3.4,['#f4a6c1','#f7d35c','#ffffff'][i%3]);
  this.scene=new Node(g.mesh());this.cam.pos=[0,6.2,6.4];this.cam.target=[0,0,.35];
  this.cells=[];for(let r=0;r<3;r++)for(let c=0;c<4;c++)this.cells.push({x:-2.55+c*1.7,z:-1.75+r*1.75,r,c,dug:false,item:null});
  const idx=[...this.cells.keys()];for(let i=idx.length-1;i>0;i--){const j=Math.floor(this.rand()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}
  const kinds=[['bone',2,'ほね'],['coin',3,'コイン'],['gem',5,'宝石'],['bear',3,'ぬいぐるみ']];idx.slice(0,4).forEach((k,i)=>this.cells[k].item=kinds[i]);if(this.rand()<.7)this.cells[idx[4]].item=['shoe',0,'ふるいくつ'];
  this.digs=this.diff==='challenge'?7:this.diff==='normal'?8:9;this.found=0;this.busy=false;this.dog.x=0;this.dog.z=2.6;this.reveals=[];
  this.mound=M('mound',()=>new Geo().blob((u)=>[u[0],Math.max(-.2,u[1]),u[2]],(u)=>mix('#9c7650','#b88e63',u[1]),{s:[.6,.28,.5]},16,10).sphere('#6fae6a',{p:[.3,.2,.1],s:[.08,.1,.04]},6,4));
  this.hole=M('hole',()=>new Geo().disk('#4a3424',{p:[0,.015,0],s:[.42,1,.34]},20).blob(null,'#a07a52',{p:[.5,0,.15],s:[.3,.18,.25]},12,8));
 }
 down(i){if(this.phase!=='play'||this.busy||this.digs<=0||this.ending)return;let best=null,bd=1e9;for(const c of this.cells){if(c.dug)continue;const t=raySphere(i.ray,[c.x,.15,c.z],.75);if(t>0&&t<bd){bd=t;best=c;}}if(!best)return;
  this.busy=true;AU('tap');this.dog.walkTo(best.x-.05,best.z+.55,{speed:4,onArrive:()=>{this.dog.faceTo(best.x,best.z);this.dog.play('dig',1.3);AU('dig');this.digT=1.3;this.digCell=best;}});}
 step(dt){
  if(this.digT>0){this.digT-=dt;const c=this.digCell;if(Math.random()<dt*20)this.P.emit('dot',[c.x,.2,c.z],{vel:[(Math.random()-.5)*2,2.2,1],velSpread:1,gravity:9,life:.6,size:.1,color:'#9c7650'});if(Math.random()<dt*3)AU('dig');
   if(this.digT<=0){c.dug=true;this.digs--;this.busy=false;
    if(c.item){const [img,pts,name]=c.item;this.reveals.push({img,x:c.x,z:c.z,t:0});if(pts>0){this.found++;this.score+=pts;AU('sparkle');this.float(name+' +'+pts,[c.x,1.5,c.z],'good');this.dog.play('happy',1.2);}else{AU('miss');this.float(name+'…',[c.x,1.5,c.z],'');this.dog.play('tilt',1.2);}}
    else{const near=this.cells.filter(o=>!o.dug&&o.item&&o.item[1]>0&&Math.abs(o.r-c.r)<=1&&Math.abs(o.c-c.c)<=1).length;this.dog.play('sniff',1.4);AU('miss');this.app.say(near?'くんくん… この ちかくに '+near+'こ あるみたい！':'くんくん… このへんには なさそう。',2400);this.float(near?'あつい！':'さむい…',[c.x,1.3,c.z],near?'good':'');}
    if(this.found>=4){this.score+=4;this.float('ぜんぶ見つけた！ +4',[0,2,0],'perfect');AU('fanfare');this.endIn(0.9,()=>'宝もの '+this.found+'こ');}
    else if(this.digs<=0)this.endIn(0.9,()=>'宝もの '+this.found+'こ');}}
  for(const r of this.reveals)r.t+=dt;
 }
 draw(r){const n=new Node(null);for(const c of this.cells){n.mesh=c.dug?this.hole:this.mound;n.pos=[c.x,0,c.z];r.draw(n);}
  for(const v of this.reveals){const y=.4+Math.min(1,v.t*3)*.7+Math.sin(v.t*4)*.05;r.sprite(v.img,[v.x,y,v.z],.6,[1,1,1,1]);}
  this.dog.shadow(r);this.dog.draw(r);}
 hud(){return{left:'宝もの '+this.found+' / 4 · '+this.score+'ポイント',right:'あと '+this.digs+'回ほれる'};}
}

/* ---------- どのはこ？ ---------- */
class Cups extends Game{
 setup(){
  const g=new Geo();Props.ground(g,50,50,'#b2d896','#9ccb82',0,20,20);g.box('#c99a6a',{p:[0,.35,0],s:[6.4,.1,2.4]});for(const x of [-2.9,2.9])for(const z of [-1,1])g.box('#a87a50',{p:[x,.15,z],s:[.12,.3,.12]});for(let i=0;i<6;i++)Props.tree(g,-12+i*5,-8,1.3);
  this.scene=new Node(g.mesh());this.cam.pos=[0,3.6,5.8];this.cam.target=[0,.5,0];this.dog.x=3.75;this.dog.z=1.05;this.dog.play('sit');
  this.cols=['#e05d6f','#4a90d9','#f2c14e','#6fae6a'];this.round=0;this.rounds=6;this.correct=0;this.hint=1;this.state='idle';this.wait=.6;this.cups=[];this.ballN=new Node(W().ballMesh('#f08a3c'));
 }
 get controls(){return{type:'hint',label:'においをかぐ（1回）'};}
 setupRound(){const n=this.round>=3?4:3,xs=n===3?[-1.7,0,1.7]:[-2.25,-.75,.75,2.25];this.cups=xs.map((x,i)=>({x,z:0,y:0,base:x,col:this.cols[i]}));this.ball=Math.floor(this.rand()*n);this.swaps=[3,4,6,6,8,9][this.round];this.swapDur=([.62,.55,.45,.45,.38,.32][this.round])/this.sp;this.state='show';this.st=0;this.picked=null;this.slots=xs.slice();this.order=[...this.cups.keys()];}
 step(dt){
  if(this.state==='idle'){this.wait-=dt;if(this.wait<=0){if(this.round>=this.rounds){this.finish('正解 '+this.correct+' / '+this.rounds);return;}this.setupRound();this.app.say('ボールは ここ！ よく みててね。',1500);}return;}
  this.st+=dt;const bc=this.cups[this.ball];
  if(this.state==='show'){bc.y=Math.sin(Math.min(1,this.st/1.4)*Math.PI)*.9;if(this.st>1.5){bc.y=0;this.state='shuffle';this.st=0;this.swapI=0;this.nextSwap();}}
  else if(this.state==='shuffle'){const s=this.sw,p=Math.min(1,this.st/this.swapDur),e=Gfx.ease.inOut(p);const A=this.cups[s.a],B=this.cups[s.b];A.x=s.ax+(s.bx-s.ax)*e;A.z=Math.sin(e*Math.PI)*.7;B.x=s.bx+(s.ax-s.bx)*e;B.z=-Math.sin(e*Math.PI)*.7;
   if(p>=1){A.z=B.z=0;this.swapI++;if(this.swapI>=this.swaps){this.state='pick';this.app.say('どの はこかな？ タップしてね。',1600);}else{this.st=0;this.nextSwap();}}}
  else if(this.state==='reveal'){const c=this.cups[this.picked];c.y=Math.min(.9,this.st*3);if(this.picked!==this.ball&&this.st>.5)bc.y=Math.min(.9,(this.st-.5)*3);if(this.st>1.9){for(const c of this.cups)c.y=0;this.round++;this.state='idle';this.wait=.4;}}
 }
 nextSwap(){const n=this.cups.length;let a=Math.floor(this.rand()*n),b=Math.floor(this.rand()*(n-1));if(b>=a)b++;this.sw={a,b,ax:this.cups[a].x,bx:this.cups[b].x};AU('whoosh');}
 down(i){if(this.state!=='pick')return;let best=-1,bd=1e9;this.cups.forEach((c,k)=>{const t=raySphere(i.ray,[c.x,.75,c.z],.55);if(t>0&&t<bd){bd=t;best=k;}});if(best<0)return;this.picked=best;this.state='reveal';this.st=0;
  const ok=best===this.ball;if(ok){this.correct++;const pts=3+(this.round>=3?1:0);this.score+=pts;AU('perfect');this.float('せいかい！ +'+pts,[this.cups[best].x,2,0],'perfect');this.dog.play('happy',1.4);this.pop('heart',this.dog.headTop(),3,{g:0});}else{AU('miss');this.float('ざんねん',[this.cups[best].x,2,0],'bad');this.dog.play('sadlook',1.4);}
  setTimeout(()=>{if(!this.finished&&this.state!=='shuffle')this.dog.play('sit');},1500);}
 control(n){if(n==='hint'&&this.hint>0&&this.state==='pick'){this.hint--;const right=Math.random()<.8?this.ball:Math.floor(this.rand()*this.cups.length);const c=this.cups[right];this.dog.walkTo(c.x+.2,1.1,{speed:3,onArrive:()=>{this.dog.play('sniff',1.6);this.app.say('くんくん… ここかも？',1800);setTimeout(()=>{if(!this.finished)this.dog.walkTo(3.75,1.05,{speed:3,onArrive:()=>this.dog.play('sit')});},1700);}});AU('tap');}}
 draw(r){
  const n=new Node(null);this.cups.forEach((c,i)=>{n.mesh=M('cup'+c.col,()=>new Geo().cyl(c.col,{s:[.42,.82,.42]},.72,1,22).sphere(mix(c.col,'#ffffff',.3),{p:[0,.84,0],s:[.14,.06,.14]},10,6).torus(mix(c.col,'#000000',.15),{p:[0,.04,0]},.42,.035,22,6));n.pos=[c.x,.4+c.y,c.z];r.draw(n);r.shadow(c.x,.4,c.z,.45,.25);});
  if(this.cups.length&&(this.state==='show'||this.state==='reveal')){const b=this.cups[this.ball];this.ballN.pos=[b.x,.55,b.z];r.draw(this.ballN);}
  this.dog.shadow(r);this.dog.draw(r);}
 hud(){return{left:'正解 '+this.correct+' · '+this.score+'ポイント',right:'ラウンド '+Math.min(this.rounds,this.round+1)+' / '+this.rounds};}
}

/* ---------- シャボン玉 ---------- */
class Bubble extends Game{
 setup(){
  this.scene=W().buildField({key:'park',seed:21,keepClear:(x,z)=>Math.abs(x)<6&&z>-5&&z<6});const g=new Geo();g.box('#e9b8a8',{p:[0,.4,0],s:[.9,.8,.6]});g.cyl('#7fb7d9',{p:[0,.8,0],s:[.18,.4,.18]},1,1,10);g.torus('#ffffff',{p:[0,1.25,0],r:[Math.PI/2,0,0]},.22,.04,16,6);this.machine=new Node(g.mesh(),{pos:[0,0,-2.5]});
  this.cam.pos=[0,2.2,6.3];this.cam.target=[0,1.9,0];this.bubbles=[];this.spawnT=.3;this.duration=30;this.combo=0;this.comboT=0;this.pops=0;this.dog.x=-1.5;this.dog.z=.8;this.jv=undefined;
 }
 step(dt){
  this.spawnT-=dt;if(this.spawnT<=0&&this.t<this.duration-.5){this.spawnT=.32/this.sp;const r=this.rand();this.bubbles.push({p:[(this.rand()-.5)*1.2,1.3,-2.3+this.rand()*.4],v:[(this.rand()-.5)*2.2,.6+this.rand()*.6,.8+this.rand()*1.2],r:.22+this.rand()*.22,type:r<.06?'gold':r<.1?'rainbow':'n',ph:this.rand()*6,age:0});}
  this.comboT=Math.max(0,this.comboT-dt);if(!this.comboT)this.combo=0;
  for(const b of this.bubbles){b.age+=dt;b.v[0]+=Math.sin(this.t*1.7+b.ph)*dt*.6;b.v[0]*=Math.exp(-.3*dt);b.v[2]*=Math.exp(-.6*dt);for(let k=0;k<3;k++)b.p[k]+=b.v[k]*dt;b.p[0]=clamp(b.p[0],-4.5,4.5);
   const h=this.dog.headTop();if(!b.dead&&v3.dist(b.p,h)<b.r+.3){this.popB(b,true);}}
  this.bubbles=this.bubbles.filter(b=>!b.dead&&b.p[1]<7.5);
  if(this.jv!==undefined){this.jv-=14*dt;this.dog.jumpY=Math.max(0,this.dog.jumpY+this.jv*dt);if(this.dog.jumpY===0)this.jv=undefined;}
  if(this.t>=this.duration)this.finish('わった数 '+this.pops+'こ');
 }
 popB(b,byDog){if(b.dead)return;b.dead=true;this.pops++;this.combo++;this.comboT=1.1;let pts=b.type==='gold'?5:1+Math.floor(this.combo/6);if(byDog)pts+=1;this.score+=pts;AU('pop');this.pop(b.type==='gold'?'star':'sparkle',b.p,6,{g:1});this.float((byDog?'パクッ +':'+')+pts,b.p,b.type==='gold'?'perfect':'good');
  if(b.type==='rainbow'){AU('sparkle');for(const o of this.bubbles)if(!o.dead&&v3.dist(o.p,b.p)<1.8)this.popB(o,false);}}
 down(i){if(this.phase!=='play')return;let best=null,bd=1e9;for(const b of this.bubbles){if(b.dead)continue;const t=raySphere(i.ray,b.p,b.r*1.25);if(t>0&&t<bd){bd=t;best=b;}}
  if(best){this.popB(best,false);const tx=clamp(best.p[0],-3.5,3.5),tz=clamp(best.p[2],-1,2.5);this.dog.walkTo(tx,tz,{speed:5,onArrive:()=>{if(this.jv===undefined){this.jv=4.6;this.dog.play('jump',.6);}}});}else{this.combo=0;}}
 draw(r){r.draw(this.machine);for(const b of this.bubbles){const col=b.type==='gold'?[1,.85,.35,1]:b.type==='rainbow'?[1,.75,1,1]:[1,1,1,.95];r.sprite('bubble',b.p,b.r*2,col);r.shadow(b.p[0],0,b.p[2],b.r*.7,.08);}this.dog.shadow(r);this.dog.draw(r);}
 hud(){return{left:this.score+'ポイント'+(this.combo>=3?' · '+this.combo+'コンボ':''),right:'のこり '+this.secs(this.duration-this.t)};}
}

/* ---------- かけっこ ---------- */
class Race extends Game{
 setup(){
  this.len=42;const g=new Geo();Props.ground(g,140,40,'#a9d18e','#93c27a',0,40,14);g.box('#d9a77a',{p:[this.len/2,.01,0],s:[this.len+16,.02,3.6]});for(const z of [-.6,.6])g.box('#ffffff',{p:[this.len/2,.022,z],s:[this.len+16,.01,.05]});
  g.box((p)=>((Math.floor((p[2]+.5)*8)+Math.floor((p[0]+.5)*2))%2)?'#ffffff':'#333333',{p:[this.len,.025,0],s:[.6,.01,3.6]});for(const z of [-1.9,1.9])g.cyl('#e9c46a',{p:[this.len,0,z],s:[.08,2.4,.08]},1,1,8);g.box('#e05d6f',{p:[this.len,2.3,0],s:[.1,.4,3.9]});
  for(let i=0;i<14;i++){Props.tree(g,-6+i*5,-4.5-(i%3),1.2);}for(let i=0;i<10;i++)Props.flower(g,-4+i*5,2.6,['#f4a6c1','#f7d35c','#ffffff'][i%3]);
  for(let i=0;i<4;i++){for(let k=0;k<5;k++)g.sphere(['#e05d6f','#4a90d9','#f2c14e','#6fae6a','#c9a7f4'][k],{p:[8+i*10+k*.5,.25,-2.4],s:.22},8,6);}
  this.scene=new Node(g.mesh());const coats=['brown','black','white'].filter(c=>c!==this.app.state.coat);
  this.rivals=coats.map((c,i)=>{const d=this.makeDog(c,{});d.z=i?-1.2:0;d.x=0;d.forceDx=1;d.forceSpeed=0;d.v=0;d.base={gentle:4.5,normal:5.5,challenge:6.4}[this.diff]*(i?1:.96);d.fin=0;return d;});
  this.dog.z=1.2;this.dog.x=0;this.dog.forceDx=1;this.dog.forceSpeed=0;this.v=0;this.last=null;this.fin=0;this.order=[];this.taps=0;
 }
 get controls(){return{type:'race'};}
 control(n){if(this.phase!=='play'||this.fin)return;if(n!=='L'&&n!=='R')return;this.taps++;if(this.last===n){this.v*=.75;this.dog.play('dizzy',.25);AU('miss');}else{this.v=Math.min(9.5,this.v+.85);AU('tap');}this.last=n;}
 down(i){this.control(i.x<this.app.viewW/2?'L':'R');}
 step(dt){
  this.v=Math.max(0,this.v-(this.v*.9+.6)*dt);this.dog.x+=this.v*dt;this.dog.forceSpeed=this.v;
  for(const d of this.rivals){if(d.fin)continue;const lead=this.dog.x-d.x,target=d.base+Math.sin(this.t*1.3+d.z*3)*.5+clamp(lead*.08,-.4,.6);d.v=damp(d.v,target,2,dt);d.x+=d.v*dt;d.forceSpeed=d.v;if(d.x>=this.len){d.fin=this.t;this.order.push('rival');d.forceSpeed=0;d.play('happy');}}
  if(!this.fin&&this.dog.x>=this.len){this.fin=this.t;this.order.push('me');this.dog.forceSpeed=0;const rank=this.order.indexOf('me')+1;this.rank=rank;this.score=rank===1?10:rank===2?6:3;this.float(rank+'着！',this.dog.headTop(),rank===1?'perfect':'good');AU(rank===1?'fanfare':'good');this.dog.play('happy',3);this.pop('star',this.dog.headTop(),rank===1?14:6);this.endIn(1.5,()=>rank+'着 · '+this.fin.toFixed(1)+'秒');}
  if(this.t>40&&!this.fin){this.fin=this.t;this.rank=3;this.score=1;this.finish('時間切れ');}
 }
 animate(dt){this.dog.update(dt);for(const d of this.rivals)d.update(dt);this.side={px:1.5,tx:2.5,follow:true};this.cam.pos[1]=2.6;this.cam.pos[2]=8;this.cam.target[1]=.6;this.cam.target[2]=0;}
 draw(r){for(const d of this.rivals){d.shadow(r);d.draw(r);}this.dog.shadow(r);this.dog.draw(r);}
 hud(){const pos=1+this.rivals.filter(d=>d.x>this.dog.x).length;return{left:'いま '+pos+'位',right:Math.min(100,Math.floor(this.dog.x/this.len*100))+'%'};}
}

/* ---------- おぼえてポーズ ---------- */
const MEM=[{id:'sit',name:'おすわり',act:'sit'},{id:'paw',name:'おて',act:'paw'},{id:'down',name:'ふせ',act:'down'},{id:'spin',name:'くるりん',act:'spin'}];
class Memory extends Game{
 setup(){
  const g=new Geo();Props.ground(g,40,40,'#b2d896','#9ccb82',0,16,16);g.disk('#f4e2c0',{p:[0,.01,0],s:[2.2,1,2.2]},40);g.torus('#e9c46a',{p:[0,.02,0],s:[1,.15,1]},2.2,.06,40,4);for(let i=0;i<7;i++)Props.tree(g,-9+i*3,-6-(i%2)*2,1.2);for(let i=0;i<10;i++)Props.flower(g,-4+i*.9,2.8,['#f4a6c1','#f7d35c','#ffffff'][i%3]);
  this.scene=new Node(g.mesh());this.cam.pos=[0,1.9,4.6];this.cam.target=[0,.65,0];this.dog.faceTo(0,10);this.dog.play('sit');
  this.seq=[];this.lives=this.diff==='gentle'?3:2;this.state='idle';this.wait=.8;this.best=0;this.inputI=0;
 }
 get controls(){return{type:'memory',items:MEM.map(m=>({id:m.id,label:m.name}))};}
 step(dt){
  if(this.state==='idle'){this.wait-=dt;if(this.wait<=0){if(this.seq.length<this.best+2)this.seq.push(Math.floor(this.rand()*4));this.state='show';this.si=-1;this.st=0;this.app.say('よく みててね！',1200);}return;}
  if(this.state==='show'){this.st-=dt;if(this.st<=0){this.si++;if(this.si>=this.seq.length){this.state='input';this.inputI=0;this.app.memoryHighlight(-1);this.app.say('おなじ じゅんばんで、ボタンを おしてね。',1600);this.dog.play('sit');return;}const k=this.seq[this.si],gap=Math.max(.55,1-this.best*.06)/this.sp;this.perform(k);this.app.memoryHighlight(k);this.st=gap;}}
 }
 perform(k){const m=MEM[k];this.dog.play(m.act,m.act==='spin'?.9:.7);AU('trick',k*2);}
 control(id){if(this.state!=='input')return;const k=MEM.findIndex(m=>m.id===id);if(k<0)return;this.perform(k);
  if(k===this.seq[this.inputI]){this.inputI++;if(this.inputI>=this.seq.length){this.best=this.seq.length;this.score=this.best;this.float('できた！ '+this.best+'こ',this.dog.headTop(),'perfect');AU('perfect');this.state='idle';this.wait=1.1;setTimeout(()=>{if(!this.finished)this.dog.play('happy',.8);},300);}}
  else{this.lives--;AU('miss');this.float('ちがうよ〜',this.dog.headTop(),'bad');this.dog.play('tilt',1);if(this.lives<=0){this.state='done';this.endIn(0.9,()=>'最高 '+this.best+'こ れんぞく');}else{this.state='idle';this.wait=1.3;this.app.say('もう いっかい、おなじ じゅんばんを みせるね。',1500);}}}
 hud(){return{left:'きろく '+this.best+'こ',right:'のこり '+'♥'.repeat(Math.max(0,this.lives))};}
}


/* ---------- スケボー（ひみつ道具で解放） ---------- */
class Skate extends Athletic{
 setup(){super.setup();this.cones=true;this.board='skate';this.speed=7.4*this.sp;this.duration=32;this.env=W().outEnv('town');
  this.tiles=[0,1,2].map(i=>new Node(M('skTile'+i,()=>{const g=new Geo(),rnd=W().mulberry(i*17+3);Props.ground(g,TILE,30,'#cfd8c0','#c3cdb2',0,10,14);g.box('#bfc3c6',{p:[0,.01,0],s:[TILE,.02,2.4]});for(let k=0;k<3;k++)Props.house(g,-TILE/2+2.6+k*5.2+rnd(),-4.6,1.3+rnd()*.3,['#f1e3c8','#e6d2c2','#dfe8d4'][k%3],['#c96b4f','#6f8fb5','#8f6a5a'][k%3]);return g;})));this.back=walkBackdrop('town');}
 onStart(){this.dog.forceSpeed=0;this.dog.play('idle');}
 step(dt){super.step(dt);this.dog.forceSpeed=0;if(this.dog.jumpY<.05)this.dog.play('sit');}
}

/* ---------- なみのり（ひみつ道具で解放） ---------- */
class Surf extends Walk{
 setup(){this.key='walk_sea';super.setup();this.key='surf';this.course='surfsea';this.tiles=[0,1,2].map(i=>new Node(walkTile('surfsea',i*29+11)));this.back=walkBackdrop('sea');this.ob=obstacleMesh('surfsea');this.env=W().outEnv('sea',{fogNear:18,fogFar:55});this.board='surf';this.duration=32;this.speed=8*this.sp;}
 onStart(){this.dog.forceSpeed=0;this.dog.play('sit');}
 step(dt){super.step(dt);this.dog.forceSpeed=0;if(this.dog.jumpY<.05)this.dog.play('sit');this.dog.yOff=Math.sin(this.t*3)*.05;if(Math.random()<dt*8)this.P.emit('drop',[this.dog.x-.4,.1,this.dog.z],{vel:[-2,1,0],velSpread:.8,gravity:5,life:.5,size:.1});}
 finish(detail){if(this.finished)return;super.finish(detail);}
}

/* ---------- そらとぶ柴犬（ひみつ道具で解放） ---------- */
class Sky extends Game{
 setup(){
  this.env=W().outEnv('sky',{fogNear:25,fogFar:80});const g=new Geo();for(let i=0;i<9;i++)Props.cloud(g,-20+i*6,-1-(i%3)*1.2,-14-(i%2)*4,2.2);Props.ground(g,140,40,'#a9d18e','#93c27a',-6,30,10);this.scene=new Node(g.mesh());
  this.cam.pos=[2,2.2,8.6];this.cam.target=[2.6,2.2,0];this.side={px:2,tx:2.6};this.dog.wings=true;this.dog.flying=true;this.dog.forceDx=1;this.dog.forceSpeed=0;
  this.y=2;this.vy=0;this.gates=[];this.stars=[];this.birds=[];this.spawnT=1.2;this.lives=3;this.inv=0;this.duration=40;this.speed=5*this.sp;this.passed=0;this.got=0;
 }
 get controls(){return{type:'jump',label:'パタパタ！'};}
 control(n,on){if(n==='jump'&&on!==false)this.flap();}
 down(){this.flap();}
 flap(){if(this.phase!=='play')return;this.vy=4.2;AU('jump');this.P.emit('sparkle',[this.dog.x-.3,this.y+.4,0],{count:2,vel:[-1,0,0],velSpread:.6,life:.5,size:.14});}
 step(dt){
  const v=this.speed*(1+this.t/80);this.inv=Math.max(0,this.inv-dt);this.vy-=9*dt;this.y+=this.vy*dt;
  if(this.y<.3){this.y=.3;this.vy=Math.max(0,this.vy);this.hurt();}if(this.y>4.6){this.y=4.6;this.vy=Math.min(0,this.vy);}
  this.dog.jumpY=this.y;this.dog.forceSpeed=this.vy>0?4:1;
  this.spawnT-=dt;if(this.spawnT<=0&&this.t<this.duration-2){this.spawnT=(1.9+this.rand()*.6)/this.sp;const gap=1.7-Math.min(.5,this.t/80),cy=1.2+this.rand()*2.4;this.gates.push({x:16,cy,gap,passed:false});this.stars.push({x:16,y:cy,taken:false});if(this.rand()<.35)this.birds.push({x:20,y:.8+this.rand()*3.4,ph:this.rand()*6});}
  const dy=this.y+.6;
  for(const gt of this.gates){gt.x-=v*dt;if(!gt.passed&&Math.abs(gt.x)<.6&&Math.abs(dy-gt.cy)>gt.gap/2)this.hurt();if(!gt.passed&&gt.x<-.6){gt.passed=true;this.passed++;this.score++;AU('good');}}
  for(const st of this.stars){st.x-=v*dt;if(!st.taken&&Math.abs(st.x)<.6&&Math.abs(st.y-dy)<.6){st.taken=true;this.got++;this.score+=2;AU('coin');this.pop('star',[0,st.y,0],6);}}
  for(const b of this.birds){b.x-=(v+1.5)*dt;b.y+=Math.sin(this.t*3+b.ph)*dt*.6;if(Math.abs(b.x)<.55&&Math.abs(b.y-dy)<.5)this.hurt();}
  this.gates=this.gates.filter(o=>o.x>-8);this.stars=this.stars.filter(o=>o.x>-8&&!o.taken);this.birds=this.birds.filter(o=>o.x>-8);
  if(this.lives<=0)this.endIn(.8,()=>'星 '+this.got+'こ · くぐった雲 '+this.passed);else if(this.t>=this.duration)this.finish('星 '+this.got+'こ · くぐった雲 '+this.passed);
 }
 hurt(){if(this.inv||this.ending)return;this.lives--;this.inv=1.2;AU('hit');this.dog.play('dizzy',.5);this.float(this.lives>0?'いたっ！':'おしまい',[0,this.y+1,0],'bad');}
 draw(r){
  const cl=M('skycloud',()=>Props.cloud(new Geo(),0,0,0,.9));
  for(const gt of this.gates){for(const sgn of [-1,1]){const yy=gt.cy+sgn*(gt.gap/2+.75);for(let k=0;k<3;k++)r.draw(new Node(cl,{pos:[gt.x,yy+sgn*k*1.1,0]}));}}
  for(const st of this.stars)r.sprite('goldstar',[st.x,st.y,.1],.55,[1,1,1,1],Math.sin(this.t*4)*.3);
  for(const b of this.birds)r.sprite('bee',[b.x,b.y,.1],.6,[1,1,1,1],Math.sin(this.t*10)*.2);
  this.dog.alpha=this.inv&&Math.floor(this.t*12)%2?.45:1;this.dog.draw(r);
 }
 hud(){return{left:'⭐ '+this.got+' · '+this.score+'ポイント',right:'♥'.repeat(Math.max(0,this.lives))+' · のこり '+this.secs(this.duration-this.t)};}
}

/* ---------- かくれんぼ ---------- */
class Hide extends Game{
 setup(){
  const g=new Geo();Props.ground(g,60,60,'#b2d896','#9ccb82',0,24,24);for(let i=0;i<10;i++)Props.tree(g,-14+i*3,-9-(i%2)*2,1.4);for(let i=0;i<14;i++)Props.flower(g,-6+i*.9,3.2,['#f4a6c1','#f7d35c','#ffffff'][i%3]);this.scene=new Node(g.mesh());
  this.cam.pos=[0,5.4,7.4];this.cam.target=[0,0,-.6];this.dog.x=0;this.dog.z=2.4;this.dog.play('sit');
  this.spots=[];for(let r=0;r<2;r++)for(let c=0;c<4;c++)this.spots.push({x:-3.6+c*2.4+(r?1.2:0),z:-2.6+r*2.2,shake:0,open:false});
  this.friend=this.makeDog(['black','white','brown'].find(c=>c!==this.app.state.coat),{});this.friend.size=.9;this.round=0;this.rounds=5;this.tries=0;this.state='hide';this.wait=.8;this.found=0;
 }
 newRound(){for(const s of this.spots){s.open=false;s.shake=0;}this.hidden=Math.floor(this.rand()*this.spots.length);this.tries=0;this.state='seek';this.friend.alpha=0;this.app.say('もういいよ〜！ どこにかくれたかな？',1800);AU('bark');}
 down(i){if(this.state!=='seek'||this.phase!=='play')return;let best=-1,bd=1e9;this.spots.forEach((s,k)=>{if(s.open)return;const t=raySphere(i.ray,[s.x,.5,s.z],.8);if(t>0&&t<bd){bd=t;best=k;}});if(best<0)return;
  const s=this.spots[best];s.open=true;s.shake=.5;this.tries++;AU('dig');
  if(best===this.hidden){const pts=Math.max(1,5-this.tries);this.score+=pts;this.found++;this.friend.x=s.x;this.friend.z=s.z+.5;this.friend.alpha=1;this.friend.play('happy',1.5);this.float('みつけた！ +'+pts,[s.x,1.6,s.z],'perfect');AU('perfect');this.dog.play('happy',1.2);this.state='found';this.wait=1.6;}
  else{const h=this.spots[this.hidden],d=Math.hypot(h.x-s.x,h.z-s.z);this.float(d<2.6?'ちかい！':'ちがうみたい',[s.x,1.4,s.z],d<2.6?'good':'');AU(d<2.6?'bark':'miss');this.dog.play('sniff',1);if(this.tries>=4){this.friend.x=h.x;this.friend.z=h.z+.5;this.friend.alpha=1;h.open=true;this.float('ここだったよ',[h.x,1.6,h.z],'');this.state='found';this.wait=1.6;}}}
 step(dt){for(const s of this.spots)s.shake=Math.max(0,s.shake-dt);
  if(this.state==='hide'||this.state==='found'){this.wait-=dt;if(this.wait<=0){if(this.round>=this.rounds){this.finish('みつけた '+this.found+' / '+this.rounds);return;}this.round++;this.newRound();}}}
 animate(dt){this.dog.update(dt);this.friend.update(dt);}
 draw(r){const bush=M('hidebush',()=>Props.bush(new Geo(),0,0,1.6,'#7fb069'));
  if(this.friend.alpha>0){this.friend.shadow(r);this.friend.draw(r);}
  for(const s of this.spots){r.draw(new Node(bush,{pos:[s.x+Math.sin(this.t*40)*s.shake*.15,0,s.z],scl:s.open?[.75,.6,.75]:[1,1,1]}));}
  this.dog.shadow(r);this.dog.draw(r);}
 hud(){return{left:'みつけた '+this.found+' · '+this.score+'ポイント',right:'ラウンド '+Math.min(this.rounds,Math.max(1,this.round))+' / '+this.rounds};}
}

/* ---------- もぐらポン ---------- */
class Mole extends Game{
 setup(){
  const g=new Geo();Props.ground(g,50,50,'#a9d18e','#93c27a',0,20,20);for(let i=0;i<8;i++)Props.tree(g,-12+i*3.4,-8,1.3);
  this.holes=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++){const x=-2.4+c*2.4,z=-2.4+r*2;this.holes.push({x,z,up:0,kind:null,t:0,hit:false});g.disk('#5a4030',{p:[x,.01,z],s:[.55,1,.42]},20);g.torus('#9c7650',{p:[x,.02,z],s:[1,.4,.78]},.58,.1,20,6);}
  this.scene=new Node(g.mesh());this.cam.pos=[0,6.4,6.4];this.cam.target=[0,0,-.4];this.dog.x=3.9;this.dog.z=1.2;this.dog.play('sit');this.spawnT=.6;this.duration=30;this.hits=0;
 }
 down(i){if(this.phase!=='play')return;let best=null,bd=1e9;for(const h of this.holes){if(!h.kind||h.hit||h.up<.3)continue;const t=raySphere(i.ray,[h.x,.45*h.up,h.z],.6);if(t>0&&t<bd){bd=t;best=h;}}if(!best)return;
  best.hit=true;best.t=Math.min(best.t,.25);if(best.kind==='shiba'){this.score=Math.max(0,this.score-2);AU('sad');this.float('いたた… -2',[best.x,1.2,best.z],'bad');}else{const pts=best.kind==='gold'?3:1;this.score+=pts;this.hits++;AU(best.kind==='gold'?'sparkle':'pop');this.float('+'+pts,[best.x,1.2,best.z],best.kind==='gold'?'perfect':'good');this.pop('star',[best.x,.6,best.z],4);this.dog.play('bark',.5);}}
 step(dt){const k=this.t/this.duration;this.spawnT-=dt;
  if(this.spawnT<=0&&this.t<this.duration-.8){this.spawnT=(.75-k*.35)/this.sp;const free=this.holes.filter(h=>!h.kind);if(free.length){const h=free[Math.floor(this.rand()*free.length)],r=this.rand();h.kind=r<.12?'shiba':r<.2?'gold':'mole';h.t=(1.3-k*.5)/this.sp;h.hit=false;}}
  for(const h of this.holes){if(!h.kind){h.up=damp(h.up,0,12,dt);continue;}h.t-=dt;h.up=damp(h.up,h.t>0&&!h.hit?1:0,12,dt);if(h.t<=-.3||(h.hit&&h.up<.05)){h.kind=null;}}
  if(this.t>=this.duration)this.finish('もぐら '+this.hits+'ひき');}
 draw(r){const mole=M('mole',()=>{const g=new Geo();g.sphere('#8d6748',{p:[0,.35,0],s:[.38,.45,.36]},14,10);g.sphere('#f2c9a8',{p:[0,.38,.3],s:[.15,.11,.08]},10,6);g.sphere('#e07a8a',{p:[0,.42,.37],s:.05},6,4);for(const x of [-.12,.12])g.sphere('#222',{p:[x,.55,.3],s:.04},6,4);return g;});
  const gold=M('moleg',()=>{const g=new Geo();g.sphere('#f2c14e',{p:[0,.35,0],s:[.38,.45,.36]},14,10);g.sphere('#fff3c4',{p:[0,.38,.3],s:[.15,.11,.08]},10,6);for(const x of [-.12,.12])g.sphere('#222',{p:[x,.55,.3],s:.04},6,4);return g;});
  for(const h of this.holes){if(!h.kind||h.up<.02)continue;const y=-.9+h.up*.9;if(h.kind==='shiba'){r.billboard(r.texture('grant-'+(['black','white','brown'].find(c=>c!==this.app.state.coat)),GrantGraphics.images[['black','white','brown'].find(c=>c!==this.app.state.coat)]),[0,0,192,208],[h.x,y-.1,h.z],[1.1,0,0],[0,1.2,0],false,[1,1,1],1);}else r.draw(new Node(h.kind==='gold'?gold:mole,{pos:[h.x,y,h.z],scl:h.hit?[1.1,.7,1.1]:[1,1,1]}));}
  this.dog.shadow(r);this.dog.draw(r);}
 hud(){return{left:this.score+'ポイント',right:'のこり '+this.secs(this.duration-this.t)};}
}

/* ---------- わんわんリズム ---------- */
class Rhythm extends Game{
 setup(){
  const g=new Geo();Props.ground(g,50,50,'#b2d896','#9ccb82',0,20,20);g.disk('#f4e2c0',{p:[0,.01,0],s:[2.4,1,1.6]},36);for(let i=0;i<8;i++)Props.tree(g,-12+i*3.4,-8,1.3);for(let i=0;i<12;i++)Props.flower(g,-5+i*.9,3,['#f4a6c1','#f7d35c','#ffffff'][i%3]);
  this.scene=new Node(g.mesh());this.cam.pos=[0,2.6,7];this.cam.target=[0,1.3,0];this.dog.x=-2.6;this.dog.z=.4;this.dog.play('sit');this.dog.forceDx=1;
  this.notes=[];const bpm=100+(this.diff==='challenge'?30:this.diff==='normal'?15:0),beat=60/bpm;let t=2;for(let i=0;i<32;i++){t+=beat*(this.rand()<.25?.5:1);this.notes.push({t,lane:Math.floor(this.rand()*3),state:'wait'});}
  this.end=t+1.5;this.travel=2.2;this.combo=0;this.perfect=0;this.good=0;
 }
 get controls(){return{type:'rhythm'};}
 control(n,lane){if(n!=='lane'||this.phase!=='play')return;const cand=this.notes.filter(x=>x.state==='wait'&&x.lane===lane).sort((a,b)=>Math.abs(a.t-this.t)-Math.abs(b.t-this.t))[0];AU('trick',lane*2);
  if(!cand||Math.abs(cand.t-this.t)>.3){this.combo=0;return;}const d=Math.abs(cand.t-this.t);cand.state='hit';
  if(d<.08){this.score+=2;this.perfect++;this.combo++;this.float('PERFECT',this.pos(cand),'perfect');}else{this.score+=1;this.good++;this.combo++;this.float('GOOD',this.pos(cand),'good');}
  if(this.combo%8===0){this.score+=2;this.float(this.combo+'コンボ +2',[0,2.8,0],'good');}this.dog.play(['bark','happy','tilt'][lane],.4);}
 pos(n){const k=(n.t-this.t)/this.travel;return[k*6-.6,2.1-n.lane*.55,.3];}
 step(){for(const n of this.notes)if(n.state==='wait'&&this.t-n.t>.3){n.state='miss';this.combo=0;}if(this.t>=this.end)this.finish('PERFECT '+this.perfect+' · GOOD '+this.good);}
 draw(r){const cols=[[1,.45,.5,1],[.45,.6,1,1],[.5,.85,.5,1]];
  for(let l=0;l<3;l++)r.sprite('ring',[-.6,2.1-l*.55,.25],.55,[1,1,1,.9]);
  for(const n of this.notes){if(n.state!=='wait')continue;const k=(n.t-this.t)/this.travel;if(k>1.1||k<-.2)continue;r.sprite('note',this.pos(n),.5,cols[n.lane]);}
  this.dog.shadow(r);this.dog.draw(r);}
 hud(){return{left:this.score+'ポイント'+(this.combo>=4?' · '+this.combo+'コンボ':''),right:Math.round(Math.min(1,this.t/this.end)*100)+'%'};}
}

const REGISTRY={ball:Ball,athletic:Athletic,run:Run,frisbee:Frisbee,treat:Treat,dig:Dig,cups:Cups,bubble:Bubble,race:Race,memory:Memory,hide:Hide,mole:Mole,rhythm:Rhythm,sky:Sky,surf:Surf,skate:Skate};
function create(app,key,diff){const Cls=key.startsWith('walk_')?Walk:REGISTRY[key];if(!Cls)throw Error('unknown game '+key);return new Cls(app,key,diff);}
root.ShibaGames={create,MEM};
})(globalThis);

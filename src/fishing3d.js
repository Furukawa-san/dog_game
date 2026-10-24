/* さかなつり: つりざおを持っていると、うみと かわに さかなの かげが ときどき あらわれる（いないときもある）。
   かげをタップ → 水べへ行って ウキを なげる → 近くの さかなが よってきて つんつん（5回までの どこかで ウキが しずむ）
   → しずんだ瞬間に タップすると つれる。早すぎたり おそすぎたりすると にげる。 */
(function(root){
'use strict';
const {v3,rayPlaneY,Geo,Node}=Gfx;
const C=()=>root.ShibaCore,W=()=>root.ShibaWorld,AU=n=>root.ShibaAudio.play(n);
const CAST=5.2,SINK_WINDOW=1.1;
let cylM=null,floatM=null;
const cyl=()=>cylM||(cylM=new Geo().cyl('#ffffff',{p:[0,0,0],s:[1,1,1]},1,1,6,false).mesh());
const floatMesh=()=>floatM||(floatM=new Geo().sphere((p)=>p[1]>.05?'#e8453c':'#fbf8f2',{s:.085},12,8).cyl('#e8453c',{p:[0,.05,0],s:[.012,.12,.012]},1,1,5).mesh());
// a→b の細い棒（つりざお・糸）の行列
function segMat(a,b,r){const d=v3.sub(b,a),L=v3.len(d)||1e-4,y=v3.scale(d,1/L);let x=v3.cross(y,[0,0,1]);if(v3.len(x)<.1)x=v3.cross(y,[1,0,0]);x=v3.scale(v3.norm(x),r);const z=v3.scale(v3.norm(v3.cross(x,y)),r);
 return new Float32Array([x[0],x[1],x[2],0,d[0],d[1],d[2],0,z[0],z[1],z[2],0,a[0],a[1],a[2],1]);}
// つりができる水の範囲（エリアを開放していると使える）
function waters(s){const W_=W(),out=[];
 if(s.owned.includes('area_sea')){const S=W_.AREAS.sea;out.push({key:'sea',x0:S.x0+1,x1:S.x1-1,z0:S.z0-5.2,z1:S.z0-.75,y:0,shore:S.z0+.6,max:3});}
 if(s.owned.includes('area_river')){const R=W_.AREAS.river,RV=W_.RIVER;out.push({key:'river',x0:R.x0+.8,x1:R.x1-.8,z0:RV.w0+.45,z1:RV.w1-.45,y:.006,shore:R.z0+.55,far:RV.w0-.35,bridge:[RV.bx0-.5,RV.bx1+.5],max:2});}
 return out;}
const inW=(w,x,z,m=0)=>x>=w.x0-m&&x<=w.x1+m&&z>=w.z0-m&&z<=w.z1+m;
// かげは どれも同じ大きさ（つり上げるまで、なんの さかなか わからない）
const SHADOW_R=.32;

class Fishing{
 constructor(home){this.home=home;this.fish=[];this.f=null;this.spawnT={};this.t=0;this.hinted={};}
 get app(){return this.home.app;}get state(){return this.home.state;}
 has(){return this.state.owned.includes('gear_rod');}
 active(){return!!this.f;}
 /* ---------- さかなの かげ ---------- */
 spawn(w){const a=Math.random()*Math.PI*2;let x=w.x0+Math.random()*(w.x1-w.x0);if(w.bridge&&x>w.bridge[0]&&x<w.bridge[1])x=w.bridge[1]+1;
  this.fish.push({w:w.key,x,z:w.z0+Math.random()*(w.z1-w.z0),hx:Math.cos(a),hz:Math.sin(a),r:SHADOW_R,life:25+Math.random()*20,t:0,turn:1+Math.random()*2,state:'swim',a:0});}
 updateFish(dt){const s=this.state,ws=this.has()?waters(s):[];const byKey=Object.fromEntries(ws.map(w=>[w.key,w]));
  for(const w of ws){if(this.spawnT[w.key]===undefined){this.spawnT[w.key]=2+Math.random()*4;const n=Math.floor(Math.random()*(w.max));for(let i=0;i<n;i++)this.spawn(w);}
   this.spawnT[w.key]-=dt;if(this.spawnT[w.key]<=0){this.spawnT[w.key]=5+Math.random()*6;const n=this.fish.filter(f=>f.w===w.key&&f.state!=='flee').length;if(n<w.max&&Math.random()<.55)this.spawn(w);}}
  const hooked=this.f?.fish;
  for(const f of this.fish){const w=byKey[f.w];if(!w){f.dead=true;continue;}f.t+=dt;
   if(f.state==='flee'){f.a-=dt*.8;f.x+=f.hx*dt*1.4;f.z+=f.hz*dt*1.4;if(f.a<=0)f.dead=true;continue;}
   f.a=Math.min(1,f.a+dt*.6);if(f!==hooked&&f.t>f.life){f.state='flee';continue;}
   if(f.state==='swim'){f.turn-=dt;if(f.turn<=0){f.turn=1.5+Math.random()*2.5;const a=Math.atan2(f.hz,f.hx)+(Math.random()-.5)*1.8;f.hx=Math.cos(a);f.hz=Math.sin(a);}
    f.x+=f.hx*dt*.28;f.z+=f.hz*dt*.28;if(f.x<w.x0||f.x>w.x1){f.hx*=-1;f.x=Math.max(w.x0,Math.min(w.x1,f.x));}if(f.z<w.z0||f.z>w.z1){f.hz*=-1;f.z=Math.max(w.z0,Math.min(w.z1,f.z));}}
   else if(f.state==='come'&&this.f){const p=this.f.float,dx=p[0]-f.x,dz=p[2]-f.z,d=Math.hypot(dx,dz)||1;f.hx=dx/d;f.hz=dz/d;if(d>.3){f.x+=f.hx*dt*.55;f.z+=f.hz*dt*.55;}}
   else if(f.state==='bite'&&this.f){const p=this.f.float;f.x+=(p[0]-f.hx*.28-f.x)*Math.min(1,dt*4);f.z+=(p[2]-f.hz*.28-f.z)*Math.min(1,dt*4);}}
  this.fish=this.fish.filter(f=>!f.dead);}
 /* ---------- 立ち位置・ざおの先 ---------- */
 shoreFor(w,tx,tz){const d=this.home.dog;let z=w.shore;if(w.far!==undefined&&d.z<W().RIVER.w0)z=w.far;let x=Math.max(w.x0,Math.min(w.x1,tx));return this.home.clampFloor(x,z);}
 tip(){const d=this.home.dog,m=d.mouthPos(),f=this.f,side=f?Math.sign(f.target[0]-d.x)||1:1,toward=f?Math.sign(f.target[2]-d.z)||-1:-1;return[m[0]+side*.2,m[1]+.7,m[2]+toward*.5];}
 /* ---------- 入力 ---------- */
 waterAt(ray){const p=rayPlaneY(ray,0);if(!p)return null;for(const w of waters(this.state))if(inW(w,p[0],p[2],.3))return{w,p:[Math.max(w.x0,Math.min(w.x1,p[0])),Math.max(w.z0,Math.min(w.z1,p[2]))]};return null;}
 shadowAt(ray){const p=rayPlaneY(ray,0);if(!p)return null;let best=null,bd=1e9;for(const f of this.fish){if(f.state==='flee')continue;const d=Math.hypot(f.x-p[0],f.z-p[2]);if(d<f.r+.45&&d<bd){bd=d;best=f;}}return best;}
 // タップを使ったら true
 tap(ray){if(!this.has())return false;const f=this.f;
  if(f){if(f.phase==='nibble'){this.escape('early');return true;}
   if(f.phase==='sink'){this.catch();return true;}
   if(f.phase==='wait'||f.phase==='ready'){const sh=this.shadowAt(ray),hit=sh?{w:waters(this.state).find(w=>w.key===sh.w),p:[sh.x,sh.z]}:this.waterAt(ray);if(hit&&hit.w){this.aim(hit.w,hit.p);return true;}this.stop();return false;}
   return true;}
  const sh=this.shadowAt(ray);if(sh){const w=waters(this.state).find(w=>w.key===sh.w);if(w){this.begin();this.aim(w,[sh.x,sh.z]);return true;}}
  // 水着がないときは、水をタップしても つりを はじめる
  if(!this.state.owned.includes('gear_swimsuit')){const hit=this.waterAt(ray);if(hit){this.begin();this.aim(hit.w,hit.p);return true;}}
  return false;}
 begin(){const h=this.home;if(h.dog.action==='sleep')h.dog.stop();h.endPlay();h.mode='fish';this.f={phase:'ready',float:null,fish:null,target:[0,0,0],w:null,t:0};this.ui('ready');}
 stop(){if(!this.f)return;const fi=this.f.fish;if(fi&&fi.state!=='flee')fi.state='swim';this.f=null;if(this.home.mode==='fish')this.home.mode='free';this.app.fishUI(null);}
 // ねらう場所が遠ければ、水べまで歩いてから なげる
 aim(w,p){const f=this.f,d=this.home.dog;if(f.fish&&f.fish.state!=='flee')f.fish.state='swim';f.fish=null;f.float=null;f.w=w;f.target=[p[0],w.y,p[1]];
  const [sx,sz]=this.shoreFor(w,p[0],p[1]),near=Math.hypot(sx-d.x,sz-d.z)<.5&&!d.swimming;
  // 立ち位置から遠すぎる所は、届くところまで
  const dz=f.target[2]-sz,dx=f.target[0]-sx,dd=Math.hypot(dx,dz);if(dd>CAST){f.target[0]=sx+dx/dd*CAST;f.target[2]=sz+dz/dd*CAST;}
  if(near){this.cast();return;}f.phase='walk';this.ui('walk');const tok=f.tok=Math.random();this.home.walkPath(d,this.home.planRoute(d.x,sx,sz),Math.hypot(sx-d.x,sz-d.z)>10?6:2.6,()=>{if(this.f===f&&f.tok===tok)this.cast();});}
 cast(){const f=this.f,d=this.home.dog;d.goal=null;d.faceTo(f.target[0],f.target[2]);d.play('sit');f.phase='cast';f.t=0;f.from=this.tip();AU('whoosh');this.ui('wait');}
 escape(why){const f=this.f;if(f.fish){f.fish.state='flee';const a=Math.atan2(f.fish.hz,f.fish.hx)+Math.PI;f.fish.hx=Math.cos(a);f.fish.hz=Math.sin(a);}f.fish=null;f.phase='reel';f.t=0;f.from=[...f.float];AU('miss');this.home.dog.play('sadlook',1.2);
  this.ui(why==='early'?'early':why==='late'?'late':'none');}
 catch(){const f=this.f,fi=f.fish;if(!fi)return;fi.dead=true;this.fish=this.fish.filter(x=>x!==fi);const id=C().pickFish(fi.w);f.caught={id,size:C().fishSize(id)};f.fish=null;f.phase='catch';f.t=0;f.from=[...f.float];
  AU('perfect');AU('splash');for(let i=0;i<14;i++)this.app.particles.emit('drop',f.float,{vel:[0,2.6,0],velSpread:2.2,gravity:7,life:.8,size:.12});this.ui('caught');}
 /* ---------- 毎フレーム ---------- */
 update(dt){this.t+=dt;this.updateFish(dt);const f=this.f,d=this.home.dog;
  if(!f){this.hint();return;}
  if(!this.has()){this.stop();return;}
  f.t+=dt;
  if(f.phase==='cast'){const k=Math.min(1,f.t/.7),to=f.target;f.float=[f.from[0]+(to[0]-f.from[0])*k,f.from[1]+(to[1]-f.from[1])*k+Math.sin(k*Math.PI)*1.1,f.from[2]+(to[2]-f.from[2])*k];
   if(k>=1){f.phase='wait';f.t=0;AU('splash');this.app.particles.emit('ring',[to[0],to[1]+.03,to[2]],{life:.8,size:.4,vel:[0,0,0],velSpread:0,grow:1.2});for(let i=0;i<6;i++)this.app.particles.emit('drop',to,{vel:[0,1.8,0],velSpread:1.4,gravity:7,life:.6,size:.1});}}
  else if(f.phase==='wait'){f.float=[f.target[0],f.target[1]+.02+Math.sin(this.t*2.4)*.012,f.target[2]];
   if(!f.fish){let best=null,bd=1.7;for(const fi of this.fish){if(fi.state!=='swim'||fi.w!==f.w.key)continue;const dd=Math.hypot(fi.x-f.float[0],fi.z-f.float[2]);if(dd<bd){bd=dd;best=fi;}}if(best){best.state='come';f.fish=best;}}
   else if(Math.hypot(f.fish.x-f.float[0],f.fish.z-f.float[2])<.36){f.fish.state='bite';f.phase='nibble';f.nib=0;f.sinkAt=1+Math.floor(Math.random()*5);f.next=.7+Math.random()*.6;f.dip=0;this.ui('nibble');}
   if(f.t>15&&!f.fish){f.phase='reel';f.t=0;f.from=[...f.float];this.ui('nofish');}}
  else if(f.phase==='nibble'){f.next-=dt;f.dip=Math.max(0,f.dip-dt*4);f.float=[f.target[0],f.target[1]+.02-f.dip*.06,f.target[2]];
   if(f.next<=0){f.nib++;if(f.nib>=f.sinkAt){f.phase='sink';f.t=0;AU('pop');AU('bark');this.app.particles.emit('ring',[f.float[0],f.float[1]+.03,f.float[2]],{life:.6,size:.5,vel:[0,0,0],velSpread:0,grow:1});this.app.callout('いまだ！','good');this.ui('sink');}
    else{f.dip=1;f.next=.65+Math.random()*.7;AU('tap');this.app.particles.emit('ring',[f.float[0],f.float[1]+.02,f.float[2]],{life:.5,size:.28,vel:[0,0,0],velSpread:0,grow:.8});this.app.floatText('つんつん',[f.float[0],f.float[1]+.4,f.float[2]]);}}}
  else if(f.phase==='sink'){f.float=[f.target[0],f.target[1]-.1-Math.sin(f.t*20)*.015,f.target[2]];if(Math.random()<dt*12)this.app.particles.emit('drop',f.float,{vel:[0,1.4,0],velSpread:1,gravity:7,life:.4,size:.08});if(f.t>SINK_WINDOW)this.escape('late');}
  else if(f.phase==='reel'){const k=Math.min(1,f.t/.45),to=this.tip();f.float=v3.lerp(f.from,to,k);if(k>=1){f.phase='ready';f.float=null;this.ui(f.lastMsg||'ready',true);}}
  else if(f.phase==='catch'){const k=Math.min(1,f.t/.8),m=d.headTop(),to=[m[0],m[1]+.55,m[2]+.1];f.pos=[f.from[0]+(to[0]-f.from[0])*k,f.from[1]+(to[1]-f.from[1])*k+Math.sin(k*Math.PI)*1.2,f.from[2]+(to[2]-f.from[2])*k];f.float=v3.lerp(f.from,this.tip(),k);
   if(f.t>.8&&!f.shown){f.shown=true;d.play('happy',2);this.home.emote('star',3);this.app.fishCaught(f.caught);}
   if(f.t>2.2){f.phase='ready';f.float=null;f.caught=null;this.ui('ready');}}}
 // 海や川に来たら、一度だけ つりの やりかたを教える
 hint(){if(!this.has()||this.home.mode!=='free')return;const d=this.home.dog;for(const w of waters(this.state)){if(this.hinted[w.key])continue;if(d.x>w.x0-1&&d.x<w.x1+1&&Math.abs(d.z-w.shore)<3){this.hinted[w.key]=true;this.app.toast('🎣 さかなの かげを タップすると、つりが できるよ！',4200);}}}
 ui(kind,keep){const T={ready:'さかなの かげを タップして、ウキを なげよう。',walk:'みずべへ いくよ…',wait:'さかなが よってくるのを まとう。（ほかの ばしょを タップすると なげなおせるよ）',nibble:'つんつん… まだだよ。ウキが しずんだら タップ！',sink:'いまだ！ タップ！',
  early:'はやすぎた！ さかなが にげちゃった… もう いちど なげよう。',late:'あっ、にげられちゃった… もう いちど なげよう。',nofish:'さかなが こないね。かげの ちかくに なげて みよう。',caught:'つれた！'};
  if(this.f&&!keep&&['early','late','nofish'].includes(kind))this.f.lastMsg=kind;else if(this.f&&!keep&&kind!=='ready')this.f.lastMsg=null;this.app.fishUI(T[kind]||T.ready,kind==='sink');}
 camTarget(){const f=this.f;if(!f||!f.float)return null;const d=this.home.dog;return[(d.x+f.float[0])/2,.6,(d.z+f.float[2])/2+.4];}
 /* ---------- 描画 ---------- */
 render(r){for(const f of this.fish){const a=f.a*.5,y=f.w==='sea'?0:.006;r.shadow(f.x,y,f.z,f.r,a);r.shadow(f.x-f.hx*f.r*.95,y,f.z-f.hz*f.r*.95,f.r*.55,a*.9);r.shadow(f.x+f.hx*f.r*.55,y,f.z+f.hz*f.r*.55,f.r*.7,a*.8);}
  const f=this.f;if(!f||f.phase==='walk'&&!f.float&&false)return;
  // つりざお（口にくわえる）と糸
  const m=this.home.dog.mouthPos(),tip=this.tip();r.drawMesh(cyl(),segMat(m,tip,.022),[.55,.36,.2]);
  const end=f.float||[tip[0],tip[1]-.35,tip[2]],n=8;let prev=tip;for(let i=1;i<=n;i++){const k=i/n,p=v3.lerp(tip,end,k);p[1]-=Math.sin(k*Math.PI)*Math.min(.35,v3.dist(tip,end)*.08);r.drawMesh(cyl(),segMat(prev,p,.006),[.95,.95,.95]);prev=p;}
  if(f.float){const nd=this.fnode||(this.fnode=new Node(floatMesh()));nd.pos=f.float;r.draw(nd);}
  if(f.phase==='sink'&&f.float)r.sprite('exclaim',[f.float[0],f.float[1]+.55+Math.sin(this.t*12)*.04,f.float[2]],.42);
  if(f.phase==='catch'&&f.pos&&f.caught){const k=Math.min(1,f.t/.8),h=.45+.4*k;r.icon('fish:'+f.caught.id,root.ShibaFish.canvas(f.caught.id),f.pos,h,1,.2);}}
 get snapshot(){const f=this.f;return{fish:this.fish.map(x=>({w:x.w,x:+x.x.toFixed(2),z:+x.z.toFixed(2),state:x.state})),phase:f?f.phase:null,nib:f?.nib||0,sinkAt:f?.sinkAt||0};}
}
root.ShibaFishing=Fishing;root.ShibaFishing.waters=waters;
})(globalThis);

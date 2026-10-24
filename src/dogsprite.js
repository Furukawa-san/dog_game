/* 元のGrant画像の柴犬を、3D空間の中で動かす。
   - 画像の画素は変更しない（そのまま板に貼る）。足元に3Dの影。
   - 黒柴: スプライトシートの全ポーズ（走り左右・おて・よろこぶ・しょんぼり・おふろ・ぷんぷん・食べる・16方向の顔向き）
   - 茶柴・白柴: 承認済みの1枚絵を、移動・反転・傾き・伸び縮み・回転で動かし、食べる・技などの動作を見せる
   - きせかえ: 表示中のフレームの不透明な部分から頭の位置と幅を読み取り、そこに重ねる */
(function(root){
'use strict';
const {v3,damp,TAU}=Gfx;
const G=()=>root.GrantGraphics;
const accCache=new Map();
function accessoryCanvas(id){
 if(accCache.has(id))return accCache.get(id);
 const it=root.ShibaCore.ITEMS[id];if(!it)return null;const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');c.textAlign='center';c.textBaseline='middle';const emoji=(t,y=64,s=100)=>{c.font=s+'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';c.fillText(t,64,y);};
 const col=it.color||'#d9534f';
 if(it.slot==='collar'){c.lineWidth=13;c.lineCap='round';c.strokeStyle=col;c.beginPath();c.moveTo(10,44);c.quadraticCurveTo(64,84,118,44);c.stroke();c.strokeStyle='rgba(0,0,0,.18)';c.lineWidth=3;c.beginPath();c.moveTo(12,52);c.quadraticCurveTo(64,92,116,52);c.stroke();
  if(it.bell){c.fillStyle='#f3c74c';c.beginPath();c.arc(64,80,13,0,TAU);c.fill();c.fillStyle='#9a7420';c.fillRect(60,82,8,4);}else{c.fillStyle='#e8d29a';c.beginPath();c.arc(64,76,8,0,TAU);c.fill();}}
 else if(id==='neck_scarf')emoji('🧣',60);
 else if(it.slot==='neck'){c.fillStyle=col;c.beginPath();c.moveTo(8,30);c.quadraticCurveTo(64,52,120,30);c.lineTo(64,116);c.closePath();c.fill();if(it.dots){c.fillStyle='#fff';for(const [x,y]of [[40,48],[70,54],[92,42],[62,82],[50,64],[80,66],[66,100]]){c.beginPath();c.arc(x,y,5,0,TAU);c.fill();}}c.strokeStyle='rgba(0,0,0,.18)';c.lineWidth=3;c.stroke();}
 else if(id==='head_ribbon')emoji('🎀');else if(id==='head_crown')emoji('👑');else if(id==='head_straw')emoji('👒');
 else if(id==='head_flower'){c.font='42px "Apple Color Emoji","Segoe UI Emoji",sans-serif';[['🌸',22,78],['🌼',44,66],['🌷',64,62],['🌼',84,66],['🌸',106,78]].forEach(([e,x,y])=>c.fillText(e,x,y));}
 else if(id==='head_beret'){c.fillStyle=col;c.beginPath();c.ellipse(60,76,54,26,-.15,0,TAU);c.fill();c.fillRect(56,42,8,14);}
 else if(id==='face_glasses')emoji('👓');else if(id==='face_sunglasses')emoji('🕶');
 else if(id==='head_tophat')emoji('🎩');else if(id==='head_cap')emoji('🧢');
 else if(id==='neck_bowtie'){c.fillStyle=col;c.beginPath();c.moveTo(64,52);c.lineTo(20,30);c.lineTo(20,78);c.closePath();c.moveTo(64,52);c.lineTo(108,30);c.lineTo(108,78);c.closePath();c.fill();c.beginPath();c.arc(64,54,11,0,TAU);c.fill();c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.arc(60,50,4,0,TAU);c.fill();}
 else if(id==='neck_lei'){c.font='30px "Apple Color Emoji","Segoe UI Emoji",sans-serif';for(let i=0;i<9;i++){const a=Math.PI*(.08+i*.105);c.fillText(['🌺','🌼','🌸'][i%3],64-Math.cos(a)*48,40+Math.sin(a)*36);}}
 else if(id==='neck_cape'){c.fillStyle=col;c.beginPath();c.moveTo(14,28);c.quadraticCurveTo(64,46,114,28);c.lineTo(124,120);c.quadraticCurveTo(64,104,4,120);c.closePath();c.fill();c.fillStyle='#f2c14e';c.beginPath();c.arc(64,40,9,0,TAU);c.fill();}
 else if(id==='head_bunny'){for(const x of [40,88]){c.fillStyle='#ffffff';c.beginPath();c.ellipse(x,56,16,46,x<64?-.18:.18,0,TAU);c.fill();c.strokeStyle='#ddd';c.lineWidth=3;c.stroke();c.fillStyle='#f6b3c8';c.beginPath();c.ellipse(x,62,7,30,x<64?-.18:.18,0,TAU);c.fill();}}
 else if(id==='head_santa'){c.fillStyle='#d9534f';c.beginPath();c.moveTo(18,96);c.quadraticCurveTo(60,4,104,40);c.quadraticCurveTo(84,60,110,96);c.closePath();c.fill();c.fillStyle='#ffffff';c.fillRect(14,88,100,22);c.beginPath();c.arc(104,40,13,0,TAU);c.fill();}
 else if(id==='head_party'){c.fillStyle=col;c.beginPath();c.moveTo(64,8);c.lineTo(98,110);c.lineTo(30,110);c.closePath();c.fill();c.fillStyle='#5b8fd1';for(const [x,y]of [[56,60],[72,84],[60,96],[70,40]]){c.beginPath();c.arc(x,y,5,0,TAU);c.fill();}c.fillStyle='#e05d6f';c.beginPath();c.arc(64,10,9,0,TAU);c.fill();}
 else if(id==='face_heart'||id==='face_star'){c.fillStyle=col;c.strokeStyle='#5a3a30';c.lineWidth=4;const shape=(x)=>{c.beginPath();if(id==='face_heart'){c.moveTo(x,78);c.bezierCurveTo(x-34,54,x-22,28,x,46);c.bezierCurveTo(x+22,28,x+34,54,x,78);}else{for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?12:28;c.lineTo(x+Math.cos(a)*r,56+Math.sin(a)*r);}}c.closePath();c.fill();c.stroke();};shape(36);shape(92);c.beginPath();c.moveTo(56,56);c.lineTo(72,56);c.stroke();}
 accCache.set(id,cv);return cv;
}
/* フレームの不透明部分から頭の位置を読み取る（結果はフレームごとに保存） */
const anchorCache=new Map();let probe=null;
function frameAnchor(key,f,side){
 const ck=key+':'+f.sx+','+f.sy+':'+side;if(anchorCache.has(ck))return anchorCache.get(ck);
 let out={cx:.5,top:.1,hw:.55};
 try{
  const w=72,h=Math.max(8,Math.round(72*f.sh/f.sw));probe=probe||document.createElement('canvas');probe.width=w;probe.height=h;const c=probe.getContext('2d',{willReadFrequently:true});c.clearRect(0,0,w,h);c.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,0,0,w,h);
  const d=c.getImageData(0,0,w,h).data,A=(x,y)=>d[(y*w+x)*4+3]>60;let top=h,bot=-1,l=w,r=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(A(x,y)){if(y<top)top=y;if(y>bot)bot=y;if(x<l)l=x;if(x>r)r=x;}
  if(bot>top){const H=bot-top,y1=top+Math.round(H*.42),cols=new Array(w).fill(0);for(let y=top;y<=y1;y++)for(let x=0;x<w;x++)if(A(x,y))cols[x]++;
   const cl=[];let cur=null;for(let x=0;x<w;x++){if(cols[x]>1){if(!cur||x-cur.x1>2){cur={x0:x,x1:x,m:0};cl.push(cur);}cur.x1=x;cur.m+=cols[x];}}
   let pick=null;
   // 横向き（走り）は進行方向側の端の4割を頭とみなす。正面は一番大きなかたまり。
   const span=Math.max(4,Math.round((r-l)*.4));if(side>0)pick={x0:r-span,x1:r};else if(side<0)pick={x0:l,x1:l+span};else pick=cl.sort((a,b)=>b.m-a.m)[0];
   if(pick){let ht=h;for(let y=top;y<=y1&&ht===h;y++)for(let x=pick.x0;x<=pick.x1;x++)if(A(x,y)){ht=y;break;}
    out={cx:(pick.x0+pick.x1+1)/2/w,top:ht/h,hw:(pick.x1-pick.x0+1)/w};}}
 }catch{}
 anchorCache.set(ck,out);return out;
}
// 頭の幅を基準にした、きせかえの位置（頭頂からの下がり具合）と大きさ
const SLOT={head:{y:.12,s:.62},face:{y:.5,s:.8},collar:{y:.86,s:.8},neck:{y:.9,s:.8}};

class ShibaSprite{
 constructor(o={}){this.coat=o.coat||'brown';this.stage=o.stage||'adult';this.equip={...(o.equip||{})};this.pos=[0,0,0];this.heading=0;this.speed=0;this.goal=null;this.action='idle';this.actionT=0;this.actionDur=Infinity;this.mood='happy';this.jumpY=0;this.forceSpeed=null;this.forceDx=null;this.look=null;this.t=Math.random()*5;this.excite=0;this.size=1;this.tint=null;this.alpha=1;this.lastDx=1;this.cam=null;this.wings=false;this.flying=false;this.vel=[0,0];this.yOff=0;this.rot=0;this.squash=1;this.widen=1;this.flipSpin=1;this.off=[0,0];this.mouthW=null;this.groundY=0;this.swimming=false;}
 get x(){return this.pos[0];}set x(v){this.pos[0]=v;}
 get z(){return this.pos[2];}set z(v){this.pos[2]=v;}
 get growth(){return{puppy:.79,junior:.9,adult:1}[this.stage]||1;}
 get height(){return 1.32*this.growth*this.size;}
 get scale(){return this.growth*this.size;}
 get single(){return false;}
 setCoat(coat,stage,equip){this.coat=coat;this.stage=stage;if(equip)this.equip={...equip};}
 setTint(t){this.tint=t;}
 setLook(p){this.look=p;}
 play(action,dur=Infinity){if(this.action!==action||dur!==Infinity)this.actionT=0;this.action=action;this.actionDur=dur;}
 stop(){this.action='idle';this.actionDur=Infinity;}
 walkTo(x,z,o={}){this.goal={x,z,speed:o.speed||1.5,onArrive:o.onArrive||null};if(!['idle','walk'].includes(this.action))this.stop();}
 faceTo(x,z){this.heading=Math.atan2(x-this.x,z-this.z);}
 headTop(){return[this.x,this.groundY+this.jumpY+this.yOff+this.height*this.squash*.9,this.z];}
 mouthPos(){const r=this.mouthRel;return r?[this.x+r[0],this.groundY+this.jumpY+this.yOff+r[1],this.z+r[2]]:[this.x,this.jumpY+this.height*.55,this.z+.1];}
 center(){return[this.x,this.groundY+this.jumpY+this.yOff+this.height*.42,this.z];}
 updateMove(dt){
  const g=this.goal;if(!g){this.speed=damp(this.speed,0,9,dt);this.vel=[0,0];return;}
  const dx=g.x-this.x,dz=g.z-this.z,d=Math.hypot(dx,dz);
  if(d<.05){this.goal=null;this.speed=0;this.vel=[0,0];g.onArrive?.();return;}
  this.heading=Math.atan2(dx,dz);const target=Math.min(g.speed,d*3+.35);this.speed=damp(this.speed,target,7,dt);const step=Math.min(d,this.speed*dt);
  this.vel=[dx/d*this.speed,dz/d*this.speed];this.x+=dx/d*step;this.z+=dz/d*step;
 }
 update(dt){
  this.t+=dt;this.actionT+=dt;this.excite=Math.max(0,this.excite-dt);if(this.actionT>=this.actionDur){this.action='idle';this.actionDur=Infinity;}
  this.updateMove(dt);
  const a=this.action,t=this.t,at=this.actionT,k=Math.min(1,at*5),S=this.single,dir=this.lastDx||1;let y=0,rot=0,sq=1,wd=1,spin=1;
  const moving=(this.forceSpeed??this.speed)>.05;
  if(moving&&S){y=Math.abs(Math.sin(t*12))*.05*this.scale;rot=Math.sin(t*12)*.05;}
  else if(!moving){
   switch(a){
    case 'happy':case 'wiggle':case 'bellyup':y=Math.abs(Math.sin(t*8))*.12*this.scale;if(S)rot=Math.sin(t*16)*.06;break;
    case 'beg':y=Math.abs(Math.sin(t*6))*.05*this.scale;if(S){sq=1.12;wd=.92;rot=Math.sin(t*10)*.05;}break;
    case 'bang':rot=-dir*Math.min(1,at*4)*1.45;break;
    case 'tilt':rot=.22;break;
    case 'dizzy':rot=Math.sin(t*6)*.25;break;
    case 'shake':rot=Math.sin(t*40)*.12*Math.min(1,(this.actionDur-at)*2);break;
    case 'down':sq=.72;wd=1.12;y=-.02;break;
    case 'sleep':sq=S?.76:.86;wd=S?1.1:1;if(S)rot=-dir*.06;y=Math.sin(t*1.6)*.006;break;
    case 'stretch':sq=.88;wd=1.08;rot=-dir*.12;break;
    case 'bark':y=Math.max(0,Math.sin(at*14))*.04;break;
    case 'sniff':y=Math.sin(t*14)*.012;if(S)rot=-dir*(.16+Math.sin(t*7)*.05);break;
    case 'dig':y=Math.sin(t*14)*.012;if(S){rot=-dir*(.24+Math.sin(t*20)*.06);sq=.94;}break;
    case 'eat':case 'drink':if(S){rot=-dir*.3*k;y=-.03*k+Math.abs(Math.sin(t*(a==='eat'?11:16)))*-.03;sq=1-.04*Math.abs(Math.sin(t*11));}break;
    case 'refuse':rot=Math.sin(t*9)*.1;break;
    case 'sadlook':if(S){sq=.95;rot=-dir*.05;}break;
    case 'sit':case 'wait':if(S){sq=1-.1*Math.sin(Math.min(1,at*3.5)*Math.PI);}break;
    case 'paw':if(S){rot=dir*(.1+Math.sin(t*8)*.04);sq=1.03;}break;
    case 'spin':spin=Math.cos(Math.min(1,at/.9)*TAU*2);y=Math.sin(Math.min(1,at/.9)*Math.PI)*.08;break;
    case 'jump':case 'catch':if(S){sq=1.08;wd=.94;}break;
    case 'idle':y=Math.sin(t*2.2)*.006;break;
   }
  }
  // 犬らしい技の動き
  this.off=[0,0];
  if(!moving){
   if(a==='spin'){const p=Math.min(1,at/1.2),an=Gfx.ease.inOut(p)*TAU;this.off=[Math.sin(an)*.38,(1-Math.cos(an))*.26];spin=1;y=0;}
   if(a==='sit'&&at<.5){sq=at<.22?1.04:1-.1*Math.sin((at-.22)/.28*Math.PI);}
   if(a==='down'){sq=at<.25?.92:.62;wd=at<.25?1.04:1.18;y=-.03;}
   if(a==='beg'){y=.04+Math.abs(Math.sin(t*8))*.05;rot=Math.sin(t*8)*.04;}
   if(a==='paw'&&at>.6){y=Math.sin(t*9)*.012;}
   if(a==='bang'){const left=this.actionDur-at;rot=left<.45?0:-dir*Math.min(1,at*4)*1.5+(at>.6&&left>.8?Math.sin(t*20)*.03:0);y=left<.45?Math.sin((.45-left)/.45*Math.PI)*.18:0;}
  }
  this.flipSpin=spin;
  const fast=['happy','bark','shake','dizzy','dig','eat','drink','spin'].includes(a);
  this.yOff=damp(this.yOff,y,fast?40:14,dt);this.rot=damp(this.rot,rot,fast?30:10,dt);this.squash=damp(this.squash,sq,12,dt);this.widen=damp(this.widen,wd,12,dt);
 }
 poseKey(){
  const a=this.action;if(this.swimming)return'run';if((this.forceSpeed??this.speed)>.05)return'run';
  if(a==='spin'&&this.actionT<1.15)return'run';if(a==='stand')return this.lastDx<0?'standL':'standR';
  if(a==='sit'&&this.actionT<.22)return'standR';if(a==='down')return this.actionT<.25?'sit':'down';if(a==='bang'&&this.actionDur-this.actionT>.45)return'sit';
  if(['eat','drink','dig'].includes(a))return'eat';if(a==='paw')return this.actionT<.3?'sit':this.actionT<.55?'pawup':'pawhold';if(a==='beg')return'beg';if(a==='sit'||a==='wait'||a==='down')return'sit';if(['happy','wiggle','bellyup','catch','jump'].includes(a))return'happy';
  if(a==='bath'||a==='shake')return'bath';if(a==='sleep')return'sleep';return'idle';
 }
 frameMood(){const a=this.action;if(a==='refuse'||a==='grumpy')return'grumpy';if(a==='sadlook')return'sad';return this.mood;}
 screenDx(){
  const cam=this.cam;if(this.forceDx!==null)return this.forceDx;if(!cam)return this.lastDx;
  if(this.action==='spin'&&this.actionT<1.15){const an=Gfx.ease.inOut(Math.min(1,this.actionT/1.2))*TAU;return Math.cos(an)>=0?1:-1;}
  const vx=this.vel[0]||Math.sin(this.heading),vz=this.vel[1]||Math.cos(this.heading),d=vx*cam.r[0]+vz*cam.r[2];if(Math.abs(d)>.05)this.lastDx=d>0?1:-1;
  return this.lastDx;
 }
 lookVec(){const cam=this.cam;if(!cam||!this.look)return null;const h=this.headTop(),d=v3.sub(this.look,h);const lx=v3.dot(d,cam.r),ly=v3.dot(d,cam.u);if(Math.hypot(lx,ly)<.15)return null;return[lx*100,-ly*100];}
 draw(r){
  const gg=G();if(!gg)return;this.cam=r.cam;const key=this.poseKey(),dx=this.screenDx();
  const lookOk=['idle','sit','wait','look','tilt','down'].includes(this.action)&&key==='idle';
  const f=gg.frame(this.coat,this.frameMood(),this.t,key,{dx:dx*10,look:lookOk?this.lookVec():null});if(!f)return;
  const tex=r.texture('grant-'+this.coat,f.image);if(!tex)return;
  const spin=this.flipSpin,flip=spin<0?!f.flip:f.flip,cam=r.cam,H=this.height*this.squash,W=this.height*f.sw/f.sh*this.widen*Math.max(.08,Math.abs(spin));
  let R=v3.norm([cam.r[0],0,cam.r[2]]),U=v3.norm(v3.add([0,1,0],v3.scale(cam.u,.35)));
  if(this.rot){const c=Math.cos(this.rot),s=Math.sin(this.rot);[R,U]=[v3.add(v3.scale(R,c),v3.scale(U,s)),v3.add(v3.scale(R,-s),v3.scale(U,c))];}
  const foot=.06,swimBob=this.swimming?Math.sin(this.t*5)*.035:0,base=[this.x+this.off[0],this.groundY+swimBob+this.jumpY+this.yOff-H*foot,this.z+this.off[1]];
  if(Math.abs(this.rot)>1){base[1]+=W*.22;}
  const tint=this.tint||[1,1,1];r.billboard(tex,[f.sx,f.sy,f.sw,f.sh],base,v3.scale(R,W),v3.scale(U,H),flip,tint,this.alpha,0,base);
  // 羽（ひみつ道具）: 背中に2枚、飛ぶときは大きくはばたく
  if(this.wings&&root.ShibaWorld){const wt=r.texture('wing2',root.ShibaWorld.wingCanvas()),fl=Math.sin(this.t*(this.flying?26:7)),ww=this.height*.38;
   // 胴体（顔より下）の左右に左右1枚ずつ。付け根を中心に、速くパタパタ回す
   const sideView=key==='run';
   for(const side of [-1,1]){const dir=sideView?-dx:side,ang=sideView?-dx*(.45+side*.2+fl*(this.flying?.5:.2)):side*(.25+fl*(this.flying?.55:.22)),c=Math.cos(ang),sn=Math.sin(ang),Rw=v3.add(v3.scale(R,c*dir),v3.scale(U,sn*(sideView?-dx*dir:1))),Uw=v3.add(v3.scale(R,-sn*(sideView?-dx:side)),v3.scale(U,c));
    // 横向きは背中のまん中から後ろ向きに2枚、正面は胴体の左右に1枚ずつ
    const root0=v3.add(base,v3.add(v3.scale(R,sideView?-dx*W*.06:W*.14*side),v3.scale(U,H*(sideView?.42:.3))));const p=v3.add(root0,v3.scale(Rw,ww*.5-ww*.11));r.billboard(wt,null,v3.sub(p,v3.scale(Uw,ww*.15)),v3.scale(Rw,ww),v3.scale(Uw,ww),false,[1,1,1],this.alpha,-.08,base);}}
  // おて（1枚絵）: 前足のあたりに足あとを出して、手を出したのが分かるようにする
  if(this.single&&this.action==='paw'){const p=v3.add(base,v3.add(v3.scale(R,W*.2*dx),v3.scale(U,H*(.42+Math.sin(this.t*8)*.03))));r.sprite('paw',v3.add(p,v3.scale(v3.norm(v3.sub(cam.pos,p)),.05)),W*.28,[1,1,1,1],-dx*.4);}
  // きせかえ
  const side=(key==='run'||f.row===1||f.row===2)?(f.row===2?-1:f.row===1?1:(dx<0?-1:1)):0,A=frameAnchor(this.coat,f,side),mirror=flip?-1:1;
  const hwH=A.hw*f.sw/f.sh; // 頭の幅（フレームの高さに対する割合）
  const toCam=v3.norm(v3.sub(cam.pos,base));
  // 口の位置（おもちゃをくわえる場所）: 頭の下のほう。横向きは頭の前側
  {const mx=(A.cx+side*A.hw*.28-.5)*mirror,my=1-(A.top+hwH*(side?.7:.8))-foot;this.mouthW=v3.add(v3.add(base,v3.add(v3.scale(R,W*mx),v3.scale(U,H*my))),v3.scale(toCam,.14));this.mouthRel=[this.mouthW[0]-this.x,this.mouthW[1]-this.groundY-this.jumpY-this.yOff,this.mouthW[2]-this.z];}
  const e=this.equip;if(key==='sleep'||Math.abs(spin)<.35||Math.abs(this.rot)>.9)return;
  const put=(id,slot,bias)=>{const cv=accessoryCanvas(id);if(!cv)return;const t=r.texture('acc-'+id,cv),sl=SLOT[slot],w=W*A.hw*sl.s;
   const fx=(A.cx-.5)*mirror,fy=1-(A.top+hwH*sl.y)-foot;const p=v3.add(base,v3.add(v3.scale(R,W*fx),v3.scale(U,H*fy)));
   r.billboard(t,null,v3.add(v3.sub(p,v3.scale(U,w*.5)),v3.scale(toCam,.03+bias*.01)),v3.scale(R,w),v3.scale(U,w),mirror<0,tint,this.alpha,.05+bias*.01,base);};
  if(e.neck)put(e.neck,'neck',2);if(e.face)put(e.face,'face',3);if(e.head)put(e.head,'head',4);
 }
 shadow(r,y=0,alpha=.3){if(this.swimming)return;y+=this.groundY;const lift=this.jumpY+Math.max(0,this.yOff);r.shadow(this.x+this.off[0],y,this.z+this.off[1],.36*this.scale*this.widen*Math.max(.5,1-lift*.7),alpha*Math.max(.35,1-lift));}
 hitTest(ray){return Gfx.raySphere(ray,this.center(),this.height*.45)>0;}
}
ShibaSprite.frameAnchor=frameAnchor;
root.ShibaSprite=ShibaSprite;
})(globalThis);

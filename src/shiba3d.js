/* 手続き的に組み立てる3Dの柴犬。毛色3種（裏白の模様つき）、成長段階、きせかえ、ポーズのなめらかな切りかえ。 */
(function(root){
'use strict';
const {Geo,Node,mix,hex,damp,TAU,v3}=Gfx;
// 元のGrantイラストの配色: 栗色/黒/白 × クリームの裏白、麻呂眉、こげ茶の輪郭線。
const COATS={
 brown:{fur:'#a2582f',top:'#86452a',cream:'#f6e7cf',tan:'#bf7442',inner:'#f6e7cf',brow:'#f4e1c3',nose:'#1f1715',eye:'#2a1710',paw:'#f6e7cf',line:'#4b2414'},
 black:{fur:'#2e2b2a',top:'#1f1d1d',cream:'#f4e6cf',tan:'#d39a55',inner:'#f1e1c8',brow:'#dfa45e',nose:'#141212',eye:'#24160f',paw:'#f4e6cf',line:'#16110f'},
 white:{fur:'#f2e6d2',top:'#e6d5ba',cream:'#fffaf0',tan:'#ead8bb',inner:'#fbf1e2',brow:'#e9d5b4',nose:'#2c201c',eye:'#2a1a12',paw:'#fffaf0',line:'#8c7458'}
};
const sm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
function coatMix(C,c,top=0){ // c: 0=毛色, 1=クリーム（裏白）。黒柴は境目にタンが入る。
 let col=C===COATS.black?(c<.5?mix(C.fur,C.tan,sm(.28,.5,c)):mix(C.tan,C.cream,sm(.52,.72,c))):mix(C.fur,C.cream,sm(.25,.75,c));
 if(top>0)col=mix(col,C.top,top*(1-c));
 return col;
}
// 毛並み: 方向でゆらぐ小さな房（輪郭がふさふさに見える）と色ムラ
function tuft(u,f=1){const n=Math.sin(u[0]*17.3*f+u[1]*5.1)*Math.sin(u[1]*21.7*f-u[2]*9.4)*Math.sin(u[2]*15.9*f+u[0]*7.3);return Math.max(0,n);}
function streak(u){return(Math.sin(u[0]*41+u[1]*13)*Math.sin(u[2]*37-u[1]*29))*.5+.5;}
function furTone(col,u,amt=.06){const k=Math.sin(u[0]*61+u[1]*23+Math.sin(u[2]*47)*2)*.5+.5;return mix(col,'#000000',k*amt*.6);}
const cache=new Map();
function cached(key,fn){if(!cache.has(key))cache.set(key,fn());return cache.get(key);}

function buildMeshes(coat){
 const C=COATS[coat]||COATS.brown;
 return cached('dog:'+coat,()=>{
  const m={};
  // 胴: 深い胸、少しくびれた腰、平らな背中。胸にV字の裏白。
  m.torso=new Geo().blob((u)=>{let [x,y,z]=u;if(y>0)y*=.86;if(y<0)y*=1+.3*sm(-.1,.7,z);y+=.16*Math.max(0,-y)*Math.exp(-Math.pow((z+.3)/.3,2));x*=1+.06*sm(.2,.8,Math.abs(z));const f=1+.05*tuft(u)*(.4+sm(.3,.9,z)*sm(.3,-.4,y)*1.6);return[x*f,y*f,z*f];},
   (u)=>{const w=.12+.34*sm(-.7,.35,u[1]),bib=sm(.42,.62,u[2])*sm(w+.06,w-.06,Math.abs(u[0])),belly=sm(-.55,-.8,u[1]);return furTone(coatMix(C,Math.max(bib,belly),sm(.25,.95,u[1])*.8),u);},{s:[.28,.27,.5]},28,18).mesh();
  // 首まわりのふさふさ
  m.neck=new Geo().blob((u)=>{const f=1+.12*tuft(u,1.2)*sm(.3,-.6,u[1]);return[u[0]*f*1.05,u[1]*f,u[2]*f];},
   (u)=>{const w=.1+.5*sm(-.8,.4,u[1]),bib=sm(.05,.45,u[2])*sm(w+.08,w-.08,Math.abs(u[0]));return furTone(coatMix(C,bib,sm(.4,1,u[1])*.5),u);},{p:[0,.1,.07],r:[.62,0,0],s:[.2,.25,.2]},22,14).mesh();
  // 頭: 横に張った頬毛、少し平らな頭頂。目の下から頬・あごが裏白、目のまわりと額は毛色。
  m.head=new Geo().blob((u)=>{let [x,y,z]=u;if(y>.1)y*=.9;const cheek=sm(.25,-.45,y)*sm(-.7,.25,z);x*=1+.24*cheek;y-=.1*cheek*Math.abs(u[0]);z*=1-.08*sm(.4,1,y);const f=1+.09*tuft(u,1.1)*sm(.1,-.5,y)*sm(.2,.7,Math.abs(u[0]))+.025*tuft(u,2);return[x*f,y*f,z*f];},
   (u)=>{const ax=Math.abs(u[0]),b=-.2+.3*sm(.1,.45,ax)-.55*sm(.58,.92,ax),face=sm(b+.06,b-.06,u[1])*sm(-.25,.15,u[2]),throat=sm(-.55,-.8,u[1]);return furTone(coatMix(C,Math.max(face,throat),sm(.35,.95,u[1])*.7),u,.05);},{s:[.25,.215,.225]},30,20).mesh();
  // マズル: くさび形。鼻すじの付け根だけ毛色。
  m.muzzle=new Geo().blob((u)=>{let [x,y,z]=u;const fr=Math.max(0,z);x*=1-.32*fr;y*=1-.22*fr;if(y>0)y*=.8;return[x,y-.08*fr*fr,z];},
   (u)=>coatMix(C,1-sm(.45,.9,u[1])*sm(.1,-.6,u[2])*(coat==='white'?0:.8)),{p:[0,-.072,.185],s:[.118,.098,.15]},22,14).mesh();
  m.nose=new Geo().blob((u)=>[u[0]*(1-.25*Math.max(0,-u[1])),u[1],u[2]],C.nose,{p:[0,-.04,.325],s:[.046,.033,.032]},14,10).sphere('#ffffff',{p:[-.012,-.028,.348],s:[.012,.007,.006]},6,4).mesh();
  // にっこり口（ω形の線）
  const mouth=new Geo(),lineR=()=>.0058;mouth.tube(C.line,null,[[0,-.07,.335],[0,-.088,.33],[0,-.098,.322]],lineR,6);
  for(const sx of [-1,1]){const pts=[];for(let i=0;i<=10;i++){const a=i/10;pts.push([sx*(.004+a*.07),-.098-Math.sin(a*Math.PI)*.016+a*a*.03,.322-a*a*.06]);}mouth.tube(C.line,null,pts,lineR,6);}
  m.mouth=mouth.mesh();
  m.tongue=new Geo().blob(null,'#ee8790',{s:[.04,.013,.055]},12,8).mesh();
  // 大きなこげ茶の目、白い光が2つ
  m.eye=new Geo().blob(null,C.eye,{s:[.046,.05,.028]},16,12).sphere('#ffffff',{p:[.014,.02,.022],s:.014},8,6).sphere('#ffffff',{p:[-.014,-.016,.022],s:.006},6,4).mesh();
  m.brow=new Geo().blob(null,C.brow,{s:[.03,.02,.014]},10,6).mesh();
  // 耳: 付け根が太い三角。内側はクリームの毛。
  m.ear=new Geo().cone((p,n)=>n[2]>.2&&Math.abs(p[0])<.72&&p[1]<.8?mix(C.inner,C.fur,sm(.5,.8,p[1])*.4):mix(C.fur,C.top,.35),{s:[.098,.19,.056]},18).mesh();
  // 前脚: 外側は毛色、内側の前面と足先は裏白。黒柴は境目がタン。指の線つきの足。
  const paw=(g)=>g.blob((u)=>[u[0]*(1+.08*Math.max(0,u[2])),u[1]*(u[1]<0?.6:1),u[2]],(u)=>u[2]>.55&&u[1]>-.1&&Math.abs(u[0])<.6&&Math.abs(Math.sin(u[0]*7.2))<.09?mix(C.paw,C.line,.7):C.paw,{p:[0,-.43,.03],s:[.082,.054,.098]},16,10);
  const frontLeg=side=>{const g=new Geo();g.blob((u)=>{const tp=1-.12*sm(.5,-.9,u[1]);const f=1+.06*tuft(u,1.4)*sm(-.6,.2,-u[2]);return[u[0]*tp*f,u[1],u[2]*tp*f];},(u,n,p,wp)=>{const inner=sm(.25,.75,-side*u[0]*.85+u[2]*.3),low=sm(-.3,-.4,wp[1]);return furTone(coatMix(C,Math.max(inner*.95,low)),u,.05);},{p:[0,-.2,0],s:[.084,.235,.088]},16,12);paw(g);return g.mesh();};
  const rearLeg=side=>{const g=new Geo();g.blob((u)=>{const f=1+.09*tuft(u,1.3)*sm(.2,-.8,u[2]);return[u[0]*f,u[1]*f,u[2]*f];},(u)=>furTone(coatMix(C,Math.max(sm(-.4,-.85,u[2])*sm(.1,-.6,u[1])*.85,sm(.3,.8,-side*u[0])*sm(0,-.6,u[1])*.8),sm(.3,1,u[1])*.5),u),{p:[0,-.08,-.02],s:[.11,.18,.13]},18,12);
   g.blob((u)=>[u[0]*(1-.15*sm(.5,-.9,u[1])),u[1],u[2]],(u,n,p,wp)=>furTone(coatMix(C,Math.max(sm(-.3,-.4,wp[1]),sm(.4,.9,-side*u[0])*.8)),u,.05),{p:[0,-.24,-.01],s:[.074,.2,.08]},14,10);paw(g);return g.mesh();};
  m.frontLegL=frontLeg(-1);m.frontLegR=frontLeg(1);m.rearLegL=rearLeg(-1);m.rearLegR=rearLeg(1);
  // ふさふさの巻き尾。内側（体に向く面）が裏白。
  const path=[],R=.13,Cc=[0,0,R];for(let i=0;i<=30;i++){const u=i/30,a=u*1.45*Math.PI,r=R*(1-u*.2);path.push([u*.08,Cc[1]+r*Math.sin(a),Cc[2]-r*Math.cos(a)]);}
  m.tail=new Geo().tube((p,n,e)=>{const toC=v3.norm([0,Cc[1]-p[1],Cc[2]-p[2]]),inner=v3.dot(n,toC);return furTone(coatMix(C,Math.max(sm(-.15,.45,inner),sm(.88,1,e?e[0]:0)*.5),sm(.2,-.6,inner)*.5),[p[0]*9,p[1]*9,p[2]*9],.08);},null,path,u=>(.074*(1-u*.45)+.024*Math.sin(u*Math.PI))*(1+.12*Math.max(0,Math.sin(u*90))),14).mesh();
  m.line=hex(C.line);
  return m;
 });
}
function accessoryMesh(id){
 const it=ShibaCore.ITEMS[id];if(!it)return null;const col=it.color;
 return cached('acc:'+id,()=>{const g=new Geo();
  if(it.slot==='collar'){g.torus(col,{},.17,.026,22,8);if(it.bell)g.sphere('#f3c74c',{p:[0,-.02,.19],s:.04},10,7);else g.sphere('#e8d29a',{p:[0,-.01,.185],s:[.025,.03,.012]},8,5);}
  else if(it.slot==='neck'){if(id==='neck_scarf'){g.torus(col,{},.17,.055,22,10);g.box(mix(col,'#ffffff',.2),{p:[.1,-.12,.15],r:[0,0,.3],s:[.08,.2,.04]});}
   else g.cone((p)=>it.dots&&((Math.sin(p[0]*22)*Math.sin(p[1]*22+1))>.55)?'#ffffff':col,{p:[0,.02,.14],r:[Math.PI+.5,0,0],s:[.2,.24,.07]},14),g.torus(col,{},.172,.03,22,8);}
  else if(id==='head_ribbon'){g.cone(col,{p:[-.02,0,0],r:[0,0,Math.PI/2],s:[.075,.1,.04]},10);g.cone(col,{p:[.02,0,0],r:[0,0,-Math.PI/2],s:[.075,.1,.04]},10);g.sphere(mix(col,'#ffffff',.25),{s:.036},8,6);}
  else if(id==='head_beret'){g.sphere(col,{p:[0,.035,0],s:[.2,.07,.2]},16,8);g.cyl(col,{p:[0,.09,0],s:[.015,.04,.015]},1,1,6);}
  else if(id==='head_straw'){g.cyl(col,{p:[0,0,0],s:[.34,.022,.34]},1,1,22);g.cyl(col,{p:[0,.02,0],s:[.17,.14,.17]},.85,1,18);g.cyl('#d9534f',{p:[0,.03,0],s:[.172,.04,.172]},1,1,18,false);}
  else if(id==='head_flower'){g.torus('#6fa35b',{},.16,.022,20,6);const cs=['#f4a7c0','#ffffff','#f7d35c','#f4a7c0','#c9a7f4','#ffffff','#f7d35c'];for(let i=0;i<7;i++){const a=i/7*TAU;g.sphere(cs[i],{p:[Math.cos(a)*.16,.02,Math.sin(a)*.16],s:.04},8,5);}}
  else if(id==='head_crown'){g.cyl(col,{},1.12,1,16,false);for(let i=0;i<5;i++){const a=i/5*TAU;g.cone(col,{p:[Math.cos(a)*.12,.08,Math.sin(a)*.12],s:[.035,.07,.035]},6);g.sphere(i%2?'#e05d6f':'#5b8fd1',{p:[Math.cos(a)*.135,.045,Math.sin(a)*.135],s:.018},6,4);}return new Geo().cyl(col,{s:[.13,.085,.13]},1.12,1,16,false).merge(g).mesh();}
  else if(id==='face_glasses'){for(const x of [-.095,.095])g.torus(col,{p:[x,0,0],r:[Math.PI/2,0,0]},.052,.008,18,5);g.box(col,{p:[0,.005,0],s:[.09,.01,.01]});}
  else if(id==='face_sunglasses'){for(const x of [-.095,.095])g.sphere(col,{p:[x,0,0],s:[.062,.046,.014]},12,6);g.box(col,{p:[0,.012,0],s:[.1,.012,.012]});}
  return g.mesh();});
}

const BASE={bodyY:.52,pitch:0,roll:0,yOff:0,neckP:0,headP:0,headY:0,headR:0,earL:0,earR:0,tailA:.35,tailLift:0,eyes:1,tongue:0,legs:[0,0,0,0],legS:[1,1,1,1]};
function clonePose(p){return{...p,legs:[...p.legs],legS:[...p.legS]};}

class Shiba{
 constructor(o={}){
  this.root=new Node();this.coat=o.coat||'brown';this.stage=o.stage||'adult';this.equip={...(o.equip||{})};
  this.P=clonePose(BASE);this.t=Math.random()*10;this.action='idle';this.actionT=0;this.actionDur=Infinity;this.speed=0;this.forceSpeed=null;this.heading=0;this.phase=0;this.wag=0;this.blink=1;this.blinkT=2+Math.random()*3;this.look=null;this.yawOff=0;this.mood='happy';this.jumpY=0;this.goal=null;this.tint=null;this.excite=0;
  this.build();
 }
 get x(){return this.root.pos[0];}set x(v){this.root.pos[0]=v;}
 get z(){return this.root.pos[2];}set z(v){this.root.pos[2]=v;}
 get scale(){return this.root.scl[0];}
 build(){
  const m=buildMeshes(this.coat),R=this.root;R.clear();
  const st={puppy:[.66,1.3],junior:[.84,1.12],adult:[1,1]}[this.stage]||[1,1];R.setScale(st[0]);
  const body=this.body=R.add(new Node(null,{pos:[0,.52,0]}));
  this.fur=[];const fur=n=>{this.fur.push(n);return n;};
  body.add(fur(new Node(m.torso)));
  const neck=this.neck=body.add(new Node(null,{pos:[0,.12,.34]}));neck.add(fur(new Node(m.neck)));
  const head=this.head=neck.add(new Node(null,{pos:[0,.21,.16]}));const hs=st[1];head.setScale(hs);
  head.add(fur(new Node(m.head)),fur(new Node(m.muzzle)),new Node(m.nose),new Node(m.mouth));
  this.tongue=head.add(new Node(m.tongue,{pos:[0,-.13,.27]}));
  this.eyes=[head.add(new Node(m.eye,{pos:[-.098,.035,.198]})),head.add(new Node(m.eye,{pos:[.098,.035,.198]}))];
  this.eyes[0].rot=[0,-.32,0];this.eyes[1].rot=[0,.32,0];
  if(this.coat!=='white')for(const x of [-.085,.085])head.add(new Node(m.brow,{pos:[x,.098,.2]}));
  this.ears=[head.add(new Node(m.ear,{pos:[-.125,.15,-.01]})),head.add(new Node(m.ear,{pos:[.125,.15,-.01]}))];for(const e of this.ears)this.fur.push(e);
  this.legs=[[-.14,-.06,.3,m.frontLegR],[.14,-.06,.3,m.frontLegL],[-.15,-.04,-.3,m.rearLegR],[.15,-.04,-.3,m.rearLegL]].map(([x,y,z,mesh])=>fur(body.add(new Node(mesh,{pos:[x,y,z]}))));
  this.tail=fur(body.add(new Node(m.tail,{pos:[0,.2,-.4]})));
  this.acc={};
  for(const slot of ['collar','neck']){const id=this.equip[slot];if(id){const n=neck.add(new Node(accessoryMesh(id),{pos:[0,.1,.075],rot:[.62,0,0]}));this.acc[slot]=n;}}
  const hid=this.equip.head;if(hid){const pos={head_ribbon:[.12,.2,.03],head_beret:[.02,.19,-.02],head_straw:[0,.17,-.01],head_flower:[0,.19,0],head_crown:[0,.19,0]}[hid]||[0,.2,0];const rot={head_ribbon:[0,0,-.45],head_beret:[0,0,-.25],head_straw:[-.08,0,0],head_flower:[.12,0,0],head_crown:[.05,0,0]}[hid]||[0,0,0];this.acc.head=head.add(new Node(accessoryMesh(hid),{pos,rot}));}
  const fid=this.equip.face;if(fid)this.acc.face=head.add(new Node(accessoryMesh(fid),{pos:[0,.038,.23]}));
  const ol={c:m.line,w:.0105},olThin={c:m.line,w:.006};for(const n of this.fur)n.outline=ol;for(const n of [...this.eyes])n.outline=olThin;
  for(const n of Object.values(this.acc))n.outline={c:hex('#3a2a20'),w:.007};
  this.applyTint();
 }
 setLook(p){this.look=p;}
 setCoat(coat,stage,equip){const e=JSON.stringify(equip||this.equip);if(coat===this.coat&&stage===this.stage&&e===JSON.stringify(this.equip))return;this.coat=coat;this.stage=stage;this.equip={...(equip||this.equip)};this.build();}
 setTint(t){this.tint=t;this.applyTint();}
 applyTint(){for(const n of this.fur)n.tint=this.tint;}
 play(action,dur=Infinity){if(this.action!==action||dur!==Infinity){this.actionT=0;}this.action=action;this.actionDur=dur;}
 stop(){this.action='idle';this.actionDur=Infinity;}
 walkTo(x,z,o={}){this.goal={x,z,speed:o.speed||1.5,onArrive:o.onArrive||null,face:o.face};if(['sit','down','sleep','bellyup','bang','beg','paw'].includes(this.action))this.stop();}
 faceTo(x,z){this.heading=Math.atan2(x-this.x,z-this.z);}
 headTop(){return this.head.worldPos([0,.36,0]);}
 mouthPos(){return this.head.worldPos([0,-.1,.32]);}
 updateMove(dt){
  const g=this.goal;if(!g){this.speed=damp(this.speed,0,8,dt);return;}
  const dx=g.x-this.x,dz=g.z-this.z,d=Math.hypot(dx,dz);
  if(d<.06){this.goal=null;this.speed=0;if(g.face!==undefined)this.heading=g.face;g.onArrive?.();return;}
  const want=Math.atan2(dx,dz);let diff=want-this.heading;diff=Math.atan2(Math.sin(diff),Math.cos(diff));this.heading+=diff*Math.min(1,dt*8);
  const target=Math.min(g.speed,d*3+.3)*(Math.abs(diff)>1.2?.25:1);this.speed=damp(this.speed,target,6,dt);
  const step=Math.min(d,this.speed*dt);this.x+=Math.sin(this.heading)*step;this.z+=Math.cos(this.heading)*step;
 }
 update(dt){
  this.t+=dt;this.actionT+=dt;this.excite=Math.max(0,this.excite-dt);if(this.actionT>=this.actionDur){this.action='idle';this.actionDur=Infinity;}
  this.updateMove(dt);
  const sp=this.forceSpeed??this.speed,T=clonePose(BASE),t=this.t,a=this.action,k=Math.min(1,this.actionT/.35);
  // 歩き・走り
  if(sp>.05&&['idle','walk'].includes(a)){
   const f=1.4+sp*.95;this.phase+=TAU*f*dt;const ph=this.phase,amp=Math.min(.75,.28+sp*.12);
   if(sp>3.6){T.legs=[Math.sin(ph)*amp*1.1,Math.sin(ph+.4)*amp*1.1,Math.sin(ph+Math.PI)*amp,Math.sin(ph+Math.PI+.4)*amp];T.pitch=Math.sin(ph)*.1;T.yOff=Math.abs(Math.sin(ph))*.07;T.earL=T.earR=.55;T.tongue=.8;}
   else{T.legs=[Math.sin(ph)*amp,Math.sin(ph+Math.PI)*amp,Math.sin(ph+Math.PI)*amp,Math.sin(ph)*amp];T.yOff=Math.abs(Math.sin(ph))*.025*(1+sp*.3);T.headP=Math.sin(ph*2)*.04;T.earL=T.earR=Math.min(.4,sp*.1);}
   T.tailA=.45;
  }else this.phase=0;
  // 気分
  if(this.mood==='sad'&&a==='idle'){T.neckP=.4;T.headP=.15;T.earL=T.earR=.85;T.tailLift=-.6;T.tailA=.05;T.eyes=.72;}
  if(this.mood==='grumpy'&&a==='idle'){T.earL=T.earR=.5;T.headY=.45;T.tailA=.02;T.eyes=.55;}
  if(this.mood==='happy'&&a==='idle'&&sp<.05){T.tailA=.55;T.tongue=this.excite>0?.7+Math.sin(t*7)*.2:0;T.yOff=Math.sin(t*2.2)*.006;}
  // 動作
  const sitBase=()=>{T.bodyY=.43;T.pitch=-.5;T.legs=[.5,.5,-.85,-.85];T.legS=[1,1,.82,.82];T.headP=.42;T.tailLift=.6;};
  switch(a){
   case 'sit':sitBase();T.tailA=.4;T.tongue=this.excite>0?.7:0;break;
   case 'paw':sitBase();T.legs[1]=-1.05+Math.sin(t*6)*.08;T.headR=.12;T.tailA=.6;T.tongue=.8;break;
   case 'down':T.bodyY=.25;T.pitch=.04;T.legs=[-1.45,-1.45,-1.35,-1.35];T.legS=[.78,.78,.6,.6];T.headP=-.15;T.tailLift=.4;T.tailA=.3;break;
   case 'beg':T.bodyY=.46;T.pitch=-1.15;T.legs=[.55+Math.sin(t*9)*.15,.55-Math.sin(t*9)*.15,-.25,-.25];T.legS=[.7,.7,.62,.62];T.headP=1;T.tailLift=.9;T.tailA=.8;T.tongue=1;T.eyes=.4;break;
   case 'eat':T.neckP=1.05;T.headP=.45+Math.sin(t*11)*.12;T.pitch=.12;T.legs=[-.12,-.12,-.12,-.12];T.tailA=.6;T.earL=T.earR=.2;break;
   case 'drink':T.neckP=1.1;T.headP=.5+Math.sin(t*16)*.06;T.pitch=.12;T.legs=[-.12,-.12,-.12,-.12];T.tailA=.4;break;
   case 'sniff':T.neckP=.8;T.headP=.35;T.headY=Math.sin(t*5)*.3;T.tailA=.5;T.pitch=.06;T.legs=[-.06,-.06,-.06,-.06];break;
   case 'sleep':T.bodyY=.24;T.pitch=.04;T.legs=[-1.45,-1.45,-1.35,-1.35];T.legS=[.78,.78,.6,.6];T.neckP=.75;T.headP=-.2;T.headY=.35;T.headR=.25;T.eyes=.05;T.earL=T.earR=.45;T.tailA=0;T.tailLift=.5;T.yOff=Math.sin(t*1.6)*.008;break;
   case 'jump':T.legs=[-.95,-.95,.85,.85];T.pitch=-.18;T.earL=T.earR=.6;T.tailA=.7;T.tongue=.8;break;
   case 'catch':T.legs=[-1.1,-1.1,.9,.9];T.pitch=-.45;T.neckP=-.35;T.headP=-.3;T.earL=T.earR=.7;T.tailA=.8;break;
   case 'spin':{const p=Math.min(1,this.actionT/.9);this.yawOff=Gfx.ease.inOut(p)*TAU;const f=1.4+3;this.phase+=TAU*f*dt;T.legs=[Math.sin(this.phase)*.5,Math.sin(this.phase+Math.PI)*.5,Math.sin(this.phase+Math.PI)*.5,Math.sin(this.phase)*.5];T.tailA=.8;T.tongue=1;if(p>=1){this.yawOff=0;}break;}
   case 'bang':T.bodyY=.3;T.roll=1.5;T.legs=[-.35,-.25,.3,.35];T.eyes=.06;T.tongue=1;T.tailA=0;T.earL=T.earR=.3;break;
   case 'bellyup':T.bodyY=.32;T.roll=2.75;T.legs=[-.7+Math.sin(t*5)*.25,-.6-Math.sin(t*5.5)*.25,.5,.6];T.legS=[.75,.75,.7,.7];T.tongue=1;T.eyes=.35;T.tailA=.6;T.headY=-.3;break;
   case 'shake':T.roll=Math.sin(t*38)*.34*Math.min(1,(this.actionDur-this.actionT)*2);T.headR=Math.sin(t*38+.7)*.5;T.earL=Math.sin(t*38)*.8;T.earR=-Math.sin(t*38)*.8;T.eyes=.3;break;
   case 'happy':T.yOff=Math.abs(Math.sin(t*8.5))*.11;T.legs=[Math.sin(t*17)*.4-.3,Math.sin(t*17)*.4-.3,.2,.2];T.tailA=1;T.tongue=1;T.eyes=.32;T.earL=T.earR=.3;T.headP=-.15;break;
   case 'wiggle':T.roll=Math.sin(t*12)*.12;T.tailA=1;T.tongue=1;T.eyes=.32;T.headR=Math.sin(t*6)*.15;break;
   case 'tilt':T.headR=.42;T.earL=.15;T.earR=-.1;T.tailA=.2;break;
   case 'refuse':T.headY=Math.sin(t*9)*.5;T.earL=T.earR=.5;T.tailA=.05;T.eyes=.55;break;
   case 'sadlook':T.neckP=.45;T.headP=.2;T.earL=T.earR=.9;T.tailLift=-.6;T.tailA=.03;T.eyes=.7;break;
   case 'dig':T.pitch=.32;T.neckP=.55;T.headP=.2;T.legs=[Math.sin(t*20)*.85-.35,-Math.sin(t*20)*.85-.35,-.3,-.3];T.tailA=.9;T.earL=T.earR=.3;break;
   case 'bark':T.headP=-.25+Math.max(0,Math.sin(this.actionT*14))*-.15;T.yOff=Math.max(0,Math.sin(this.actionT*14))*.03;T.tongue=.6;T.tailA=.7;T.earL=T.earR=-.1;break;
   case 'stretch':T.bodyY=.42;T.pitch=.35;T.legs=[-1.1,-1.1,-.3,-.3];T.legS=[.9,.9,1,1];T.headP=-.5;T.eyes=.2;T.tongue=.9;break;
   case 'dizzy':T.headR=Math.sin(t*6)*.4;T.roll=Math.sin(t*6)*.12;T.eyes=.2;T.tailA=0;T.earL=T.earR=.7;break;
   case 'look':T.headP=-.3;T.tailA=.6;break;
   case 'wait':sitBase();T.headP=.28;T.tailA=.12;T.eyes=1;break;
  }
  if(a!=='spin')this.yawOff=0;
  // 視線
  if(this.look&&['idle','sit','down','wait','look','beg','paw','walk'].includes(a)&&this.mood!=='grumpy'){
   const hp=this.head.worldPos(),dx=this.look[0]-hp[0],dy=this.look[1]-hp[1],dz=this.look[2]-hp[2];let yaw=Math.atan2(dx,dz)-(this.heading+this.yawOff);yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));
   if(Math.abs(yaw)<2){T.headY+=Math.max(-.9,Math.min(.9,yaw))*.85;T.headP+=Math.max(-.6,Math.min(.5,-Math.atan2(dy,Math.hypot(dx,dz))))*.6;}
  }
  // まばたき
  this.blinkT-=dt;if(this.blinkT<0){this.blink=.08;if(this.blinkT<-.12){this.blinkT=2+Math.random()*4;}}else this.blink=1;
  // なめらかに追従
  const P=this.P,rate=a==='shake'||a==='dig'||a==='happy'||a==='bark'?30:sp>.05?14:9;
  for(const key of Object.keys(BASE)){if(key==='legs'||key==='legS'){for(let i=0;i<4;i++)P[key][i]=damp(P[key][i],T[key][i],rate*(key==='legs'&&sp>.05?1.6:1),dt);}else P[key]=damp(P[key],T[key],rate,dt);}
  this.wag+=dt*(8+P.tailA*10);
  this.apply();
 }
 apply(){
  const P=this.P;this.root.rot[1]=this.heading+this.yawOff;
  this.body.pos[1]=P.bodyY+P.yOff+this.jumpY;this.body.rot[0]=P.pitch;this.body.rot[2]=P.roll;
  this.neck.rot[0]=P.neckP;this.head.rot[0]=P.headP;this.head.rot[1]=P.headY;this.head.rot[2]=P.headR;
  this.ears[0].rot=[-.12-P.earL,0,.3];this.ears[1].rot=[-.12-P.earR,0,-.3];
  for(let i=0;i<4;i++){this.legs[i].rot[0]=P.legs[i];this.legs[i].scl[1]=P.legS[i];}
  this.tail.rot=[P.tailLift,0,Math.sin(this.wag)*P.tailA*.55];
  const e=Math.max(.05,P.eyes*this.blink);for(const n of this.eyes)n.scl[1]=e;
  this.tongue.visible=P.tongue>.06;this.tongue.scl=[1,1,Math.max(.01,P.tongue)];this.tongue.pos[1]=-.13-P.tongue*.01+Math.sin(this.t*14)*.004*P.tongue;
 }
 shadow(r,y=0,alpha=.34){const s=this.scale,lift=this.jumpY+this.P.yOff;r.shadow(this.x,y,this.z,.52*s*Math.max(.5,1-lift*.8),alpha*Math.max(.35,1-lift));}
 hitTest(ray){const c=this.body.worldPos([0,.05,.05]);return Gfx.raySphere(ray,c,.55*this.scale)>0;}
}
root.Shiba3D=Shiba;root.ShibaCoats=COATS;
})(globalThis);

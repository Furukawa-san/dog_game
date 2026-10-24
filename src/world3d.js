/* 3Dの舞台: おうち（部屋・お庭・原っぱ、時間帯・家具）、食べもの・おもちゃの立体、屋外の環境プリセット */
(function(root){
'use strict';
const {Geo,Node,Props,mix,hex,TAU}=Gfx;
const ITEMS=()=>root.ShibaCore.ITEMS;
const ROOM={x0:-4,x1:4,z0:-3,z1:2.4,h:3.2};
const HOUSE={w:1.9,d:1.5,h:1.4,door:.86,dz:-.25};   // 犬小屋の大きさ（ベッドの位置が基準）
const DOOR={z0:-1.5,z1:1.3};                 // お庭へ出る右の壁の開口
const GARDEN={x0:4,x1:11.2,z0:-3.4,z1:2.8};
const FIELD={x0:11.2,x1:22,z0:-6,z1:4.2};
// 道路（お庭の右から東へ）と、道ぞいのおでかけエリア
const ROAD={x0:11,z0:-.9,z1:.9};
const AREAS={
 park:{id:'area_park',name:'こうえん',icon:'🛝',x0:23,x1:37,z0:-6.5,z1:4.6},
 town:{id:'area_town',name:'まち',icon:'🏘',x0:37,x1:51,z0:-6,z1:4.4},
 sea:{id:'area_sea',name:'うみ',icon:'🏖',x0:51,x1:65,z0:-2.6,z1:4.6},
 river:{id:'area_river',name:'かわ',icon:'🏞',x0:65,x1:79,z0:-1.6,z1:4.6}
};
// 川（向こう岸・橋）と、水着で入れる水の範囲
const RIVER={w0:-4.2,w1:-1.8,far:-10.5,bx0:71.3,bx1:72.7,bz0:-4.75,bz1:-1.25};
function onBridge(x,z){return x>=RIVER.bx0&&x<=RIVER.bx1&&z>=RIVER.bz0&&z<=RIVER.bz1;}
function waterAt(state,x,z){if(!state.owned.includes('gear_swimsuit'))return false;const S=AREAS.sea,R=AREAS.river;
 if(state.owned.includes(S.id)&&x>=S.x0&&x<=S.x1&&z<S.z0+.15)return true;
 if(state.owned.includes(R.id)&&x>=R.x0&&x<=R.x1&&z>RIVER.w0&&z<RIVER.w1&&!onBridge(x,z))return true;return false;}
/* 地面の高さ: 橋の上は高く（両はしはスロープ）、水の中は沈む */
function groundHeight(state,x,z){if(state.owned.includes('area_river')&&onBridge(x,z)){const e=Math.min(z-RIVER.bz0,RIVER.bz1-z);return .3*Math.min(1,e/.35);}return 0;}
function roadEnd(state){let e=state.owned.includes('area_road')?23:0;for(const a of Object.values(AREAS))if(state.owned.includes(a.id))e=Math.max(e,a.x1);return e;}
/* 行き先（おでかけボタン用）: [キー, 名前, アイコン, x, z] */
function travelSpots(state){const o=state.owned,t=[['home','おうち','🏠',0,.6]];if(o.includes('area_garden'))t.push(['garden','おにわ','🌳',7.6,.2]);if(o.includes('area_field'))t.push(['field','はらっぱ','🌾',16.5,1]);
 for(const [k,a]of Object.entries(AREAS))if(o.includes(a.id))t.push([k,a.name,a.icon,(a.x0+a.x1)/2,k==='sea'||k==='river'?1.6:1.4]);return t;}

function timeOfDay(date=new Date()){const h=date.getHours()+date.getMinutes()/60;return h>=5&&h<9?'morning':h>=9&&h<16?'day':h>=16&&h<19?'evening':'night';}
const TIMES={
 morning:{win:['#f8d6b4','#cfe6f2'],sun:[.62,.55,.45],sky:[.5,.5,.52],ground:[.36,.33,.3],dir:[.6,.9,.7],out:['#f6c8a4','#fbe9d6'],label:'あさ'},
 day:{win:['#7fc0ec','#dff0fb'],sun:[.58,.56,.5],sky:[.52,.55,.58],ground:[.36,.34,.31],dir:[-.3,1,.6],out:['#8ccbf0','#e7f4ea'],label:'ひる'},
 evening:{win:['#ee8f6c','#f8d49a'],sun:[.66,.48,.34],sky:[.46,.42,.45],ground:[.34,.28,.25],dir:[-.8,.6,.5],out:['#ee9a74','#fbd9a8'],label:'ゆうがた'},
 night:{win:['#16224a','#3b4f7d'],sun:[.32,.3,.36],sky:[.34,.36,.48],ground:[.22,.2,.24],dir:[.2,1,.4],out:['#1c2a55','#46598a'],label:'よる'}
};
function homeEnv(time,outdoor){const t=TIMES[time];const top=outdoor?t.out[0]:'#efe6d6',bot=outdoor?t.out[1]:'#f6efe4';return{skyTop:top,skyBottom:bot,fog:bot,fogNear:outdoor?28:30,fogFar:outdoor?70:60,sunDir:t.dir,sun:t.sun,sky:t.sky,ground:t.ground};}

/* 歩ける場所（長方形の集まり） */
function walkRects(state){
 const r=[{x0:ROOM.x0+.5,x1:ROOM.x1-.5,z0:ROOM.z0+.55,z1:ROOM.z1-.1}];
 if(state.owned.includes('area_garden')){r.push({x0:3,x1:5,z0:DOOR.z0+.35,z1:DOOR.z1-.35});r.push({x0:GARDEN.x0+.6,x1:GARDEN.x1-(state.owned.includes('area_field')||state.owned.includes('area_road')?0:.6),z0:GARDEN.z0+.6,z1:GARDEN.z1-.3});}
 if(state.owned.includes('area_field'))r.push({x0:FIELD.x0-.6,x1:FIELD.x1-1,z0:FIELD.z0+1,z1:FIELD.z1-.6});
 const end=roadEnd(state);if(end&&state.owned.includes('area_garden'))r.push({x0:ROAD.x0-.6,x1:end-.6,z0:ROAD.z0+.15,z1:ROAD.z1-.15});
 for(const a of Object.values(AREAS))if(state.owned.includes(a.id))r.push({x0:a.x0,x1:a.x1-.01,z0:a.z0+.5,z1:a.z1-.5});
 if(state.owned.includes('area_river')){const R=AREAS.river;r.push({x0:RIVER.bx0+.15,x1:RIVER.bx1-.15,z0:RIVER.bz0-.1,z1:RIVER.bz1+.2});r.push({x0:R.x0+.4,x1:R.x1-.4,z0:RIVER.far,z1:RIVER.w0+.05});}
 if(state.owned.includes('gear_swimsuit')){const S=AREAS.sea,R=AREAS.river;if(state.owned.includes(S.id))r.push({x0:S.x0+.2,x1:S.x1-.2,z0:S.z0-7,z1:S.z0+.6});if(state.owned.includes(R.id))r.push({x0:R.x0+.2,x1:R.x1-.2,z0:RIVER.w0-.1,z1:R.z0+.6});}
 return r;
}
function clampToRects(rects,x,z){let best=null,bd=1e9;for(const q of rects){const cx=Math.min(q.x1,Math.max(q.x0,x)),cz=Math.min(q.z1,Math.max(q.z0,z)),d=(cx-x)**2+(cz-z)**2;if(d<bd){bd=d;best=[cx,cz];}}return best;}

function grass(g,x0,x1,z0,z1,c1,c2){g.plane((p,n,e,wp)=>{const k=(Math.sin(wp[0]*1.7+wp[2]*.9)*.5+.5)*(Math.sin(wp[2]*2.3-wp[0]*.4)*.5+.5);return mix(c1,c2,k*.8);},{p:[(x0+x1)/2,-.004,(z0+z1)/2],s:[x1-x0,1,z1-z0]},Math.max(4,Math.round((x1-x0)*1.5)),Math.max(4,Math.round((z1-z0)*1.5)));}
function buildRoom(state,time){
 const it=ITEMS(),eq=state.equipped,wall=hex(it[eq.wall]?.color||'#f6eedd'),rugC=it[eq.rug]?.color||'#e9d8bb',g=new Geo(),T=TIMES[time];
 const garden=state.owned.includes('area_garden'),field=state.owned.includes('area_field'),has=id=>state.deco.includes(id);
 // 床: 木の板
 g.plane((p,n,e,wp)=>{const row=Math.floor((wp[2]+10)*1.6),off=(row%2)*.9,k=Math.floor((wp[0]+10+off)/1.8),seam=Math.abs(((wp[2]+10)*1.6)%1-.5)>.47||Math.abs(((wp[0]+10+off)/1.8)%1-.5)>.49;const base=eq.wall==='wall_wood'?['#c99c6c','#c29467','#cfa475','#bd8f60'][(row*3+k)%4]:['#d9b48a','#d2ab80','#dcb98f','#cfa67b'][(row*3+k)%4];return seam?mix(base,'#a57a52',.45):base;},{p:[0,0,-.3],s:[8,1,5.4]},32,22);
 // かべ: 後ろ・左・右を別々にして、外から見るときは隠す
 const wallC=(p,n,e,wp)=>eq.wall==='wall_wood'?mix(wall,'#b8946a',(Math.abs(Math.sin(wp[0]*5+wp[2]*5))>.96?.5:0)):mix(wall,'#ffffff',(Math.sin(wp[0]*9+wp[2]*9)>.94?.18:0));
 const back=new Geo(),left=new Geo(),right=new Geo();
 back.box(wallC,{p:[0,ROOM.h/2,ROOM.z0-.05],s:[8.2,ROOM.h,.1]});back.box('#c79a6c',{p:[0,.09,ROOM.z0+.01],s:[8,.18,.06]});
 left.box(wallC,{p:[ROOM.x0-.05,ROOM.h/2,-.3],s:[.1,ROOM.h,5.6]});left.box('#c79a6c',{p:[ROOM.x0+.01,.09,-.3],s:[.06,.18,5.4]});
 if(garden){const seg=(z0,z1)=>{right.box(wallC,{p:[ROOM.x1+.05,ROOM.h/2,(z0+z1)/2],s:[.1,ROOM.h,z1-z0]});right.box('#c79a6c',{p:[ROOM.x1-.01,.09,(z0+z1)/2],s:[.06,.18,z1-z0]});};seg(ROOM.z0-.1,DOOR.z0);seg(DOOR.z1,ROOM.z1+.1);
  right.box(wallC,{p:[ROOM.x1+.05,ROOM.h-.4,(DOOR.z0+DOOR.z1)/2],s:[.1,.8,DOOR.z1-DOOR.z0]});right.box('#fbf6ec',{p:[ROOM.x1+.05,ROOM.h-.82,(DOOR.z0+DOOR.z1)/2],s:[.16,.06,DOOR.z1-DOOR.z0+.1]});
  for(const z of [DOOR.z0,DOOR.z1])right.box('#fbf6ec',{p:[ROOM.x1+.05,(ROOM.h-.8)/2,z],s:[.16,ROOM.h-.8,.07]});right.box('#b58a5e',{p:[ROOM.x1+.3,.04,(DOOR.z0+DOOR.z1)/2],s:[.6,.08,DOOR.z1-DOOR.z0]});}
 else{right.box(wallC,{p:[ROOM.x1+.05,ROOM.h/2,-.3],s:[.1,ROOM.h,5.6]});right.box('#c79a6c',{p:[ROOM.x1-.01,.09,-.3],s:[.06,.18,5.4]});}
 // 窓（時間帯で空の色）
 const wx=.6,wy=1.85,ww=2.2,wh=1.35,Z=ROOM.z0;back.plane((p)=>mix(T.win[0],T.win[1],p[2]+.5),{p:[wx,wy,Z+.02],r:[Math.PI/2,0,0],s:[ww,1,wh]});
 if(time==='night'){back.sphere('#fff6cf',{p:[wx+.6,wy+.35,Z+.03],s:[.16,.16,.02]},12,8);for(let i=0;i<9;i++)back.sphere('#ffffff',{p:[wx-.9+((i*.37)%1.8),wy-.4+((i*.53)%1),Z+.03],s:[.02,.02,.01]},4,3);}
 else{back.sphere(time==='evening'?'#ffb27a':'#fff2c2',{p:[wx-.65,wy+.3,Z+.03],s:[.18,.18,.02]},12,8);for(const [x,y,s]of [[.2,.35,.22],[.6,.42,.16]])back.sphere('#ffffff',{p:[wx+x,wy+y-.1,Z+.03],s:[s*1.6,s*.6,.02]},10,6);back.sphere('#9cc98a',{p:[wx,wy-.75,Z+.03],s:[1.2,.25,.02]},14,6);}
 const fr='#fbf6ec';back.box(fr,{p:[wx,wy+wh/2,Z+.06],s:[ww+.16,.08,.1]});back.box(fr,{p:[wx,wy-wh/2,Z+.09],s:[ww+.3,.08,.18]});back.box(fr,{p:[wx-ww/2,wy,Z+.06],s:[.08,wh,.1]});back.box(fr,{p:[wx+ww/2,wy,Z+.06],s:[.08,wh,.1]});back.box(fr,{p:[wx,wy,Z+.06],s:[.05,wh,.06]});
 for(const sx of [-1,1])back.box((p,n,e,wp)=>mix('#e9b8a8','#f3d0c4',Math.sin(wp[0]*30)*.5+.5),{p:[wx+sx*(ww/2+.28),wy+.05,Z+.14],s:[.42,wh+.4,.06]});
 back.cyl('#c79a6c',{p:[wx-ww/2-.6,wy+wh/2+.22,Z+.18],r:[0,0,-Math.PI/2],s:[.025,ww+1.2,.025]},1,1,6);
 if(has('deco_frame')){back.box('#b78457',{p:[-2.2,2,Z+.04],s:[.9,.7,.05]});back.plane((p)=>mix('#f2c9a0','#a9d3a5',p[2]+.5),{p:[-2.2,2,Z+.075],r:[Math.PI/2,0,0],s:[.74,1,.54]});back.sphere('#c98b5a',{p:[-2.2,1.95,Z+.08],s:[.12,.12,.01]},10,6);}
 if(has('deco_shelf')){left.box('#b78457',{p:[ROOM.x0+.25,.9,-1.2],s:[.45,1.8,1.4]});for(let s=0;s<3;s++)for(let i=0;i<6;i++)left.box(['#d9534f','#5b8fd1','#e9c46a','#6fae6a','#c9a7f4','#f4a6c1'][(i+s)%6],{p:[ROOM.x0+.32,.32+s*.55,-1.75+i*.2],s:[.3,.36+((i*7+s)%3)*.04,.13]});}
 // ラグ
 g.disk(rugC,{p:[0,.012,.3],s:[2.3,1,1.55]},40);g.disk(mix(rugC,'#ffffff',.18),{p:[0,.022,.3],s:[1.9,1,1.25]},40);
 if(eq.rug==='rug_star')for(let i=0;i<12;i++){const a=i*2.4,r=Math.sqrt(i/12)*1.6;g.sphere('#f6e27a',{p:[Math.cos(a)*r,.03,.3+Math.sin(a)*r*.62],s:[.07,.012,.07]},6,3);}
 if(eq.rug==='rug_check')for(let i=-3;i<=3;i++){g.box('#ffffff',{p:[i*.5,.03,.3],s:[.08,.006,2.2]});g.box('#ffffff',{p:[0,.036,.3+i*.32],s:[3.6,.006,.06]});}
 // ベッド
 const bed=it[eq.bed]?.color||'#c98b5a',BX=-2.75,BZ=-1.95;
 // 犬小屋: 柴犬が入れる大きさ。前の壁は別にして、中にいるときは透けて見えるようにする
 let house=null;
 if(eq.bed==='bed_house'){const H=HOUSE,hz=BZ+H.dz,hw=H.w/2,hd=H.d/2,wc=bed,dk=mix(bed,'#000000',.18),hg=new Geo(),fg=new Geo();
  hg.box(wc,{p:[BX,H.h/2,hz-hd+.05],s:[H.w,H.h,.1]});for(const sx of [-1,1])hg.box(wc,{p:[BX+sx*(hw-.05),H.h/2,hz],s:[.1,H.h,H.d]});
  hg.cyl('#8b4d34',{p:[BX,H.h,hz],r:[0,Math.PI/4,0],s:[H.w*.8,.85,H.d*.86]},0,1,4);hg.box(dk,{p:[BX,.03,hz],s:[H.w-.2,.04,H.d-.2]});
  hg.cyl('#f2d9b6',{p:[BX,.05,hz-.1],s:[.6,.08,.45]},1,1,20);hg.box('#fbf3e6',{p:[BX+.3,.85,hz-hd+.11],s:[.34,.28,.02]});hg.sphere('#e05d6f',{p:[BX+.3,.85,hz-hd+.125],s:[.07,.06,.01]},8,5);
  const dw=H.door,dh=1.05,side=(H.w-dw)/2;for(const sx of [-1,1])fg.box(wc,{p:[BX+sx*(dw/2+side/2),H.h/2,hz+hd-.05],s:[side,H.h,.1]});fg.box(wc,{p:[BX,(H.h+dh)/2,hz+hd-.05],s:[dw,H.h-dh,.1]});
  fg.box(dk,{p:[BX,dh,hz+hd+.01],s:[dw+.1,.08,.06]});for(const sx of [-1,1])fg.box(dk,{p:[BX+sx*(dw/2+.03),dh/2,hz+hd+.01],s:[.06,dh,.06]});fg.box('#fbf3e6',{p:[BX,H.h-.12,hz+hd+.02],s:[.5,.16,.02]});
  house={x:BX,z:hz,door:[BX,hz+hd+.45],inside:[BX,hz-.05],body:new Node(hg.mesh()),front:new Node(fg.mesh())};}
 else if(eq.bed==='bed_sofa'){g.box(bed,{p:[BX,.25,BZ],s:[1.7,.4,1.1]});g.box(mix(bed,'#000000',.12),{p:[BX,.6,BZ-.45],s:[1.7,.7,.25]});for(const sx of [-1,1])g.box(mix(bed,'#000000',.08),{p:[BX+sx*.82,.45,BZ],s:[.2,.55,1.1]});g.box(mix(bed,'#ffffff',.25),{p:[BX,.47,BZ+.05],s:[1.35,.08,.85]});}
 else if(eq.bed==='bed_basket'){g.cyl((p,n,e,wp)=>mix(bed,'#a8783e',Math.abs(Math.sin(wp[1]*40))),{p:[BX,0,BZ],s:[.8,.32,.62]},1.12,1,24,false);g.cyl('#f6efe0',{p:[BX,.07,BZ],s:[.72,.12,.54]},1,1,24);}
 else{g.torus(bed,{p:[BX,.14,BZ],s:[1,.9,1]},.7,.17,28,10);g.cyl(mix(bed,'#fff3e0',.55),{p:[BX,.03,BZ],s:[.66,.12,.66]},1,1,24);}
 // おわん（かざり）
 const BW=[2.2,-2.25],WW=[3.15,-2.3];
 for(const [x,z,inner]of [[BW[0],BW[1],'#7b5a44'],[WW[0],WW[1],'#8cc9e0']]){g.cyl('#e7a07f',{p:[x,0,z],s:[.36,.16,.36]},1.15,1,20,false);g.cyl(inner,{p:[x,.02,z],s:[.33,.12,.33]},1,1,20);}
 // かざり
 if(has('deco_plant')){g.cyl('#d58b62',{p:[-3.4,0,.9],s:[.3,.55,.3]},1.2,1,14);g.cyl('#6b4a32',{p:[-3.4,.5,.9],s:[.32,.08,.32]},1,1,14);for(let i=0;i<7;i++){const a=i/7*TAU;g.sphere(i%2?'#6fae6a':'#5c9a5a',{p:[-3.4+Math.cos(a)*.22,.9+(i%3)*.12,.9+Math.sin(a)*.22],r:[Math.cos(a)*.5,0,Math.sin(a)*.5],s:[.12,.35,.06]},8,6);}}
 if(has('deco_lamp')){g.cyl('#8a6a4a',{p:[3.4,0,-2.5],s:[.25,.04,.25]},1,1,14);g.cyl('#8a6a4a',{p:[3.4,0,-2.5],s:[.03,1.6,.03]},1,1,6);g.cyl(time==='night'?'#fff1c4':'#f4e2c0',{p:[3.4,1.45,-2.5],s:[.32,.4,.32]},.55,1,16,false);}
 if(has('deco_bear')){const X=-1.7,Z2=-2.6;g.sphere('#c08a5a',{p:[X,.28,Z2],s:[.26,.28,.22]},12,8);g.sphere('#c08a5a',{p:[X,.66,Z2],s:.2},12,8);for(const sx of [-1,1]){g.sphere('#c08a5a',{p:[X+sx*.15,.82,Z2],s:.07},8,6);g.sphere('#c08a5a',{p:[X+sx*.24,.3,Z2+.08],s:[.09,.12,.09]},8,6);}g.sphere('#f0d2b0',{p:[X,.62,Z2+.17],s:[.09,.07,.06]},8,6);g.sphere('#2b1d16',{p:[X,.65,Z2+.22],s:.03},6,4);}
 if(has('deco_tree')){Props.pine(g,3.3,.9,.8);for(let i=0;i<8;i++){const a=i*1.9,h=.5+(i%4)*.3;g.sphere(['#e05d6f','#f3c74c','#5b8fd1'][i%3],{p:[3.3+Math.cos(a)*(.5-h*.18),h,.9+Math.sin(a)*(.5-h*.18)],s:.06},6,4);}g.cone('#f3c74c',{p:[3.3,1.85,.9],s:[.1,.15,.1]},5);}
 if(has('deco_aquarium')){g.box('#8a6a4a',{p:[-1,.3,-2.65],s:[1,.6,.45]});g.box('#9fd6ea',{p:[-1,.85,-2.65],s:[.9,.5,.38]});g.box('#e4c98f',{p:[-1,.62,-2.65],s:[.88,.04,.36]});for(const [x,y,c]of [[-1.2,.85,'#f08a3c'],[-.85,.95,'#f2c14e']])g.sphere(c,{p:[x,y,-2.5],s:[.07,.045,.03]},8,5);g.cone('#5fa86a',{p:[-.7,.64,-2.7],s:[.05,.3,.05]},5);}
 if(has('deco_piano')){g.box('#2b2b30',{p:[1.9,.55,-2.6],s:[1.3,1.1,.5]});g.box('#ffffff',{p:[1.9,.8,-2.3],s:[1.2,.05,.2]});for(let i=0;i<8;i++)g.box('#222',{p:[1.42+i*.14,.835,-2.34],s:[.05,.03,.11]});g.box('#2b2b30',{p:[1.9,.4,-2.0],s:[.6,.06,.3]});}
 if(has('deco_balloons')){for(const [x,z,c,h]of [[-3.3,-2.4,'#e05d6f',2.2],[-3.0,-2.6,'#f2c14e',2.5],[-2.75,-2.3,'#5b8fd1',2.0]]){g.sphere(c,{p:[x,h,z],s:[.24,.3,.24]},12,8);g.cyl('#ffffff',{p:[x,0,z],s:[.006,h-.3,.006]},1,1,4,false);}}
 if(has('deco_cactus')){g.cyl('#d58b62',{p:[3.5,0,1.6],s:[.2,.3,.2]},1.15,1,12,false);g.cyl('#6b4a32',{p:[3.5,.25,1.6],s:[.21,.03,.21]},1,1,12);g.sphere('#6fae6a',{p:[3.5,.55,1.6],s:[.13,.3,.13]},10,8);g.sphere('#6fae6a',{p:[3.62,.6,1.6],s:[.06,.14,.06]},8,6);g.sphere('#f4a6c1',{p:[3.5,.86,1.6],s:.05},6,4);}
 // お庭
 if(garden){
  grass(g,GARDEN.x0,GARDEN.x1+(field||roadEnd(state)?0:3),GARDEN.z0-3,GARDEN.z1+2.5,'#a9d18e','#93c27a');
  for(let i=0;i<5;i++)g.disk('#cbbfa8',{p:[4.8+i*.85,.01,-.1+Math.sin(i)*.2],s:[.32,1,.26]},12);
  const fb=GARDEN.z0+.2;Props.fence(g,GARDEN.x0,fb,GARDEN.x1,fb,'#e8dcc2');Props.fence(g,GARDEN.x0,GARDEN.z1,GARDEN.x1,GARDEN.z1,'#e8dcc2');
  if(!field&&!roadEnd(state))Props.fence(g,GARDEN.x1,fb,GARDEN.x1,GARDEN.z1,'#e8dcc2');else{Props.fence(g,GARDEN.x1,fb,GARDEN.x1,-1.2,'#e8dcc2');Props.fence(g,GARDEN.x1,1.2,GARDEN.x1,GARDEN.z1,'#e8dcc2');}
  Props.bush(g,4.6,-2.8,.9);Props.tree(g,10.4,-3.9,1.3);Props.tree(g,5.4,-4.4,1.1);
  for(let i=0;i<6;i++)Props.flower(g,4.5+i*1.1,2.55,['#f4a6c1','#ffffff','#f7d35c'][i%3]);
  for(let i=0;i<4;i++)Props.cloud(g,2+i*7,9+(i%2),-18,1.8);
  if(has('yard_pool')){g.cyl('#5b8fd1',{p:[7.4,0,-1.4],s:[1,.3,1]},1,1,28,false);g.torus('#f28ab2',{p:[7.4,.3,-1.4]},1,.1,28,8);g.cyl('#8fd4ec',{p:[7.4,.22,-1.4],s:[.96,.01,.96]},1,1,28);}
  if(has('yard_flowers')){g.box('#9c7650',{p:[5.6,.1,-2.5],s:[2,.2,.6]});for(let i=0;i<9;i++)Props.flower(g,4.75+i*.2,-2.45+((i%2)?.12:-.12),['#f28ab2','#f7d35c','#ffffff','#c9a7f4','#f08a3c'][i%5]);}
  if(has('yard_sandbox')){g.box('#c99a6a',{p:[9.4,.12,1.3],s:[1.6,.24,1.2]});g.box('#ecd9a8',{p:[9.4,.2,1.3],s:[1.46,.06,1.06]});g.cone('#e05d6f',{p:[9.1,.2,1.1],s:[.12,.2,.12]},8);}
  if(has('yard_tree')){Props.tree(g,9.9,-2.2,1.5,'#6fa35b','#86bf6f');for(let i=0;i<7;i++){const a=i*2.3;g.sphere('#e0453c',{p:[9.9+Math.cos(a)*.6,1.7+Math.sin(i)*.3,-2.2+Math.sin(a)*.5],s:.09},8,6);}}
  if(has('yard_bench')){g.box('#b78457',{p:[6.2,.42,-2.7],s:[1.6,.08,.45]});g.box('#b78457',{p:[6.2,.75,-2.9],s:[1.6,.4,.06]});for(const x of [5.5,6.9])g.box('#7a5a3c',{p:[x,.2,-2.7],s:[.08,.4,.4]});}
  if(has('yard_fountain')){g.cyl('#cfd3d6',{p:[7.6,0,1.2],s:[.8,.35,.8]},1,1,24);g.cyl('#8fd4ec',{p:[7.6,.3,1.2],s:[.72,.01,.72]},1,1,24);g.cyl('#cfd3d6',{p:[7.6,.3,1.2],s:[.12,.7,.12]},1,1,10);g.cyl('#cfd3d6',{p:[7.6,1,1.2],s:[.35,.12,.35]},1.2,1,16);}
 }
 // 原っぱ
 if(field){
  grass(g,FIELD.x0,FIELD.x1+4,FIELD.z0-4,FIELD.z1+3,'#b2d896','#9ccb82');
  g.disk('#7fc0dc',{p:[17.5,.012,-3.3],s:[2.4,1,1.6]},32);g.disk('#a6daec',{p:[17.3,.014,-3.4],s:[1.6,1,1]},28);
  for(let i=0;i<10;i++){const x=FIELD.x0+1+(i*2.3)%10,z=FIELD.z0-1+((i*1.7)%2);if(i%3)Props.tree(g,x,z,1.1+(i%3)*.3);else Props.pine(g,x,z,1.3);}
  for(let i=0;i<30;i++)Props.flower(g,FIELD.x0+1+((i*1.37)%10),FIELD.z0+1.5+((i*2.11)%8),['#f4a6c1','#ffffff','#f7d35c','#c9a7f4'][i%4]);
  for(let i=0;i<4;i++)Props.bush(g,FIELD.x1-1-i*2.2,FIELD.z1-.4,1);Props.rock(g,14,2,1.2);
 }
 // 道路とおでかけエリア
 const end=garden?roadEnd(state):0,own=id=>state.owned.includes(id);
 if(end){
  if(!field)grass(g,FIELD.x0,23,-5,4.5,'#a9d18e','#9cca80');
  g.box('#8e9399',{p:[(ROAD.x0+end)/2,.012,0],s:[end-ROAD.x0,.02,ROAD.z1-ROAD.z0]});
  for(let x=ROAD.x0+1;x<end-.5;x+=2)g.box('#f4f1e6',{p:[x,.024,0],s:[.9,.005,.08]});
  for(const z of [ROAD.z0-.12,ROAD.z1+.12])g.box('#d9d5cc',{p:[(ROAD.x0+end)/2,.03,z],s:[end-ROAD.x0,.06,.24]});
  // 道のおわりは通せんぼ
  g.box((p)=>Math.floor((p[2]+.5)*6)%2?'#ffffff':'#e05d6f',{p:[end+.2,.5,0],s:[.12,.2,2.2]});for(const z of [-1,1])g.box('#7a7f88',{p:[end+.2,.25,z],s:[.08,.5,.08]});
  if(!field)for(let i=0;i<4;i++){Props.tree(g,13+i*2.6,-3.6-(i%2),1.1);Props.bush(g,13.8+i*2.6,2.6,.8);}
 }
 if(own('area_park')){const A=AREAS.park;grass(g,A.x0,A.x1,A.z0-4,A.z1+2,'#9fd08a','#8cc478');
  g.disk('#e9dcb8',{p:[30,.006,-.4],s:[5.5,1,3.4]},40);
  g.box('#e05d6f',{p:[27,.9,-3.6],s:[.9,.08,2.6],r:[.6,0,0]});g.box('#5b8fd1',{p:[27,1.15,-4.8],s:[1,.08,.8]});for(const x of [26.6,27.4])g.box('#9aa0a6',{p:[x,.6,-5.2],s:[.08,1.2,.08]});
  for(const x of [32,34])g.box('#c99a6a',{p:[x,1.1,-3.8],s:[.1,2.2,.1]});g.box('#c99a6a',{p:[33,2.2,-3.8],s:[2.2,.1,.1]});for(const x of [32.6,33.4]){g.cyl('#555',{p:[x,1,-3.8],s:[.012,1.2,.012]},1,1,4,false);g.box('#f2c14e',{p:[x,.95,-3.8],s:[.4,.06,.25]});}
  g.disk('#7fc0dc',{p:[35,.012,2.6],s:[1.6,1,1.1]},28);for(let i=0;i<8;i++)Props.tree(g,A.x0+1+i*1.8,A.z0-1.5-(i%2),1.2+(i%3)*.2);for(let i=0;i<16;i++)Props.flower(g,A.x0+1+i*.8,A.z1-.2,['#f4a6c1','#f7d35c','#ffffff'][i%3]);
  g.box('#b78457',{p:[24.8,.42,-2],s:[.45,.08,1.5]});g.box('#b78457',{p:[24.6,.72,-2],s:[.06,.4,1.5]});}
 if(own('area_town')){const A=AREAS.town;g.plane((p,n,e,wp)=>(Math.floor(wp[0]*1.4)+Math.floor(wp[2]*1.4))%2?'#d8d4cc':'#cfcac0',{p:[(A.x0+A.x1)/2,.004,(A.z0+A.z1)/2],s:[A.x1-A.x0,1,A.z1-A.z0+6]},28,18);
  const cols=['#f1e3c8','#e6d2c2','#dfe8d4','#f2dccb'],roofs=['#c96b4f','#6f8fb5','#8f6a5a','#7aa36b'];for(let i=0;i<5;i++)Props.house(g,A.x0+1.6+i*2.7,-4.4,1.4,cols[i%4],roofs[i%4]);
  for(let i=0;i<4;i++)Props.house(g,A.x0+2.2+i*3.2,5.6,.8,cols[(i+2)%4],roofs[(i+1)%4],Math.PI);
  for(let i=0;i<4;i++){const x=A.x0+2+i*3.6;g.cyl('#5b6770',{p:[x,0,-2.2],s:[.05,2.2,.05]},1,1,6);g.sphere('#fff3c4',{p:[x,2.25,-2.2],s:.15},8,6);}
  for(let i=0;i<6;i++)g.box('#ffffff',{p:[44,.026,-.6+i*.24],s:[1.6,.005,.12]});g.box('#e05d6f',{p:[48.5,.8,-2.4],s:[.7,1.6,.6]});g.box('#cfe8f5',{p:[48.5,1,-2.08],s:[.5,.6,.02]});}
 if(own('area_sea')){const A=AREAS.sea;g.plane((p,n,e,wp)=>mix('#f1e1b6','#e8d4a2',(Math.sin(wp[0]*1.3)*Math.sin(wp[2]*1.7)+1)/2),{p:[(A.x0+A.x1)/2,.004,(A.z0+A.z1)/2+1],s:[A.x1-A.x0,1,A.z1-A.z0+2]},20,10);
  g.box('#5fb0d6',{p:[(A.x0-16+A.x1)/2,.006,A.z0-6],s:[A.x1-A.x0+16,.01,12]});/* 海の水は海エリアの東端（川の手前）まで */for(let i=0;i<14;i++)g.box('#e9f7fb',{p:[A.x0+((i*3.1)%14),.014,A.z0-.4-((i*1.7)%5)],s:[1.4,.01,.08]});
  for(let i=0;i<3;i++){const x=A.x0+1.5+i*5.5;g.cyl('#a07a52',{p:[x,0,A.z0-.2],r:[0,0,.15],s:[.1,2.4,.1]},.7,1,6);for(let k=0;k<5;k++){const a=k/5*TAU;g.sphere('#5fa86a',{p:[x+.35+Math.cos(a)*.55,2.35,A.z0-.2+Math.sin(a)*.55],s:[.6,.08,.2],r:[0,a,0]},8,4);}}
  g.cyl('#e9e2d4',{p:[61.5,0,-1.6],s:[.04,1.8,.04]},1,1,6);g.cone((p,n,e,wp)=>Math.floor(Math.atan2(wp[2]+1.6,wp[0]-61.5)*2.5+10)%2?'#e05d6f':'#ffffff',{p:[61.5,1.5,-1.6],s:[1.2,.5,1.2]},16);g.box('#5b8fd1',{p:[60.9,.02,-.9],s:[1.4,.02,.8]});
  for(let i=0;i<6;i++)g.sphere('#f2c0a2',{p:[A.x0+1+i*2.1,.05,A.z0+.6+(i%3)*.8],s:[.12,.06,.1]},6,4);Props.rock(g,63,-1.8,1.2,'#8f9aa0');}
 if(own('area_river')){const A=AREAS.river,cz=(RIVER.w0+RIVER.w1)/2;
  // 手前の岸と向こう岸（どちらも陸）。遠くまで草地を広げる
  grass(g,A.x0,A.x1,-24,A.z1+2,'#a6d095','#92c084');
  g.box('#78bcd6',{p:[(A.x0+A.x1)/2,.01,cz],s:[A.x1-A.x0,.01,RIVER.w1-RIVER.w0]});for(let i=0;i<10;i++)g.box('#d9f0f7',{p:[A.x0+.6+((i*1.37)%13),.018,RIVER.w0+.3+((i*.7)%1.8)],s:[.9,.005,.05]});
  // 木の橋（両はしにスロープ、手すり）
  g.box('#b78457',{p:[72,.25,cz],s:[1.4,.1,3.1]});for(const s of [-1,1])g.box('#a8784c',{p:[72,.12,cz+s*1.72],r:[s*.62,0,0],s:[1.4,.06,.62]});
  for(const x of [71.35,72.65]){g.box('#9a6d44',{p:[x,.62,cz],s:[.07,.06,3.1]});for(let k=0;k<4;k++)g.box('#9a6d44',{p:[x,.45,cz-1.4+k*.93],s:[.07,.36,.07]});}
  for(let i=0;i<7;i++)if(i!==3)Props.rock(g,A.x0+1+i*2,RIVER.w1+.05,.5+(i%3)*.15,'#a3aaa0');
  // 向こう岸: 小道・ベンチ・木・丘
  g.box('#e3d6b2',{p:[(A.x0+A.x1)/2,.006,-6.4],s:[A.x1-A.x0,.012,1.1]});g.box('#e3d6b2',{p:[72,.006,-5.3],s:[1.1,.012,1.4]});
  g.box('#b78457',{p:[68.5,.42,-7.6],s:[1.5,.08,.45]});g.box('#b78457',{p:[68.5,.72,-7.8],s:[1.5,.4,.06]});
  for(let i=0;i<7;i++)Props.tree(g,A.x0+1+i*2.1,-9.2-(i%2)*1.4,1.2+(i%3)*.2);for(let i=0;i<5;i++)Props.pine(g,A.x0+2+i*2.6,-13-(i%2),1.4);
  for(let i=0;i<4;i++)g.cone(i%2?'#8fb29a':'#9fbfa6',{p:[A.x0+2+i*4,0,-19],s:[4,3+(i%2),3]},10);
  for(let i=0;i<10;i++)Props.flower(g,A.x0+1+i*1.3,A.z1-.3,['#f4a6c1','#ffffff','#f7d35c'][i%3]);for(let i=0;i<8;i++)Props.flower(g,A.x0+1.5+i*1.6,-5.2,['#c9a7f4','#ffffff','#f7d35c'][i%3]);}
 // ラグ上のマット(ゲームで使う位置の目安)
 const node=new Node(g.mesh()),walls={back:new Node(back.mesh(),{emissive:time==='night'?.18:.42}),left:new Node(left.mesh(),{emissive:time==='night'?.18:.42}),right:new Node(right.mesh(),{emissive:time==='night'?.18:.42})};
 node.add(walls.back,walls.left,walls.right);if(house)node.add(house.body,house.front);
 const spots={pool:has('yard_pool')?[7.4,-1.4]:null,sandbox:has('yard_sandbox')?[9.4,1.3]:null,flowers:has('yard_flowers')?[5.6,-2.1]:null,fountain:has('yard_fountain')?[7.6,1.2]:null,tree:has('yard_tree')?[9.9,-1.6]:null,pond:field?[17.5,-1.4]:null,slide:own('area_park')?[27,-2.4]:null,parkpond:own('area_park')?[35,1.4]:null,beach:own('area_sea')?[56,-2.1]:null,river:own('area_river')?[69,-1.1]:null,crosswalk:own('area_town')?[44,0]:null};
 return{node,walls,house,bowl:BW,water:WW,bed:house?house.inside:[BX,BZ],rects:walkRects(state),garden,field,spots,travel:travelSpots(state),bounds:{x0:ROOM.x0+.5,x1:(field?FIELD.x1-1:garden?GARDEN.x1-.6:ROOM.x1-.5),z0:ROOM.z0+.55,z1:ROOM.z1-.1}};
}
/* 食べもの（おうちに置く立体）。amount=1→満杯、0→空 */
function foodFigure(kind,amount){
 const g=new Geo(),a=Math.max(0,Math.min(1,amount));
 if(kind==='meat'){g.cyl('#f6efe0',{s:[.46,.04,.46]},1,1,24);g.torus('#c98b5a',{p:[0,.04,0]},.46,.025,24,6);if(a>0){const k=.35+.65*a;g.blob((u)=>[u[0]*(1+.15*u[2]),u[1],u[2]],(u)=>u[1]>.4?'#c4553e':'#9e3b2b',{p:[-.05,.13,0],s:[.26*k,.12*k,.2*k]},14,10);g.cyl('#f4ead8',{p:[.15*k,.13,0],r:[0,0,-Math.PI/2],s:[.035,.2,.035]},1,1,8);for(const z of [-.04,.04])g.sphere('#f4ead8',{p:[.36*k+.05,.13,z],s:.05},8,6);}}
 else if(kind==='fish'){g.cyl('#dbe9f4',{s:[.5,.04,.36]},1,1,24);g.torus('#5b8fc1',{p:[0,.04,0],s:[1,1,.72]},.5,.022,24,6);if(a>0){const L=.42*Math.max(.25,a);g.blob((u)=>[u[0],u[1]*(1-.5*Math.abs(u[0])),u[2]],(u)=>u[1]>.2?'#8da4b8':'#e8ecef',{p:[-.05+(.42-L)*.5,.12,0],s:[L,.08,.1]},16,8);g.cone('#8da4b8',{p:[-.05+(.42-L)*.5-L-.02,.12,0],r:[0,0,Math.PI/2],s:[.09,.14,.03]},6);if(a>.5)g.sphere('#222',{p:[-.05+L*.75,.15,.06],s:.02},4,3);}}
 else if(kind==='snack'){g.cyl('#f6efe0',{p:[0,0,0],s:[.42,.04,.42]},1,1,24);g.torus('#e7a07f',{p:[0,.04,0]},.42,.025,24,6);const n=Math.ceil(a*3);
  for(let i=0;i<n;i++){const ang=i*2.1,x=Math.cos(ang)*.14,z=Math.sin(ang)*.1;g.cyl('#d9a066',{p:[x-.1,.09,z],r:[0,ang,Math.PI/2],s:[.04,.2,.04]},1,1,8);for(const s of [-1,1])for(const t of [-1,1])g.sphere('#d9a066',{p:[x+Math.cos(ang)*.1*s-.0+Math.sin(ang)*.03*t,.09,z-Math.sin(ang)*.1*s+Math.cos(ang)*.03*t],s:.045},8,6);}}
 else if(kind==='milk'){g.cyl('#7fb0d9',{s:[.36,.2,.36]},1.15,1,24,false);g.torus('#5b8fc1',{p:[0,.2,0]},.36,.025,24,6);if(a>0)g.cyl('#fffdf4',{p:[0,.03,0],s:[.33,.04+.13*a,.33]},1,1,24);}
 else{g.cyl('#e05d6f',{s:[.38,.2,.38]},1.15,1,24,false);g.torus('#c94a5b',{p:[0,.2,0]},.38,.028,24,6);g.cyl('#7b4a34',{p:[0,.02,0],s:[.35,.05,.35]},1,1,24);
  const n=Math.ceil(a*34);for(let i=0;i<n;i++){const ang=i*2.4,r=Math.sqrt(i/34)*.3;g.sphere(i%4?'#a8714a':'#8d5b3a',{p:[Math.cos(ang)*r,.12+(1-r/.3)*.12*a,Math.sin(ang)*r],s:.045},6,4);}
  if(a>.5)g.sphere('#f2b38a',{p:[.06,.24+.04*a,.02],s:[.09,.05,.07]},8,6);}
 return g.mesh();
}
function bowlFood(kind,amount){return foodFigure(kind,amount);}
function ballMesh(color='#e9534f'){return new Geo().sphere((p)=>Math.abs(p[1])<.18?'#ffffff':color,{s:.15},14,10).mesh();}
/* おもちゃ */
const toyCache={};
function toyMesh(id){if(toyCache[id])return toyCache[id];const g=new Geo();
 if(id==='toy_frisbee'){g.cyl('#4a90d9',{p:[0,-.02,0],s:[.26,.04,.26]},1,1,22);g.torus('#ffffff',{p:[0,.02,0]},.21,.018,22,5);}
 else if(id==='toy_rope'){const pts=[];for(let i=0;i<=16;i++){const t=i/16;pts.push([-.4+t*.8,.06,Math.sin(t*Math.PI*2)*.06]);}g.tube((p,n,e)=>e&&Math.floor(e[0]*12)%2?'#e05d6f':'#f6efe0',null,pts,()=>.035,8);for(const x of [-.42,.42])g.sphere('#f2c14e',{p:[x,.06,0],s:.07},8,6);}
 else if(id==='toy_duck'){g.sphere('#f7d35c',{p:[0,.12,0],s:[.16,.12,.13]},12,8);g.sphere('#f7d35c',{p:[.11,.24,0],s:.09},10,8);g.cone('#f08a3c',{p:[.2,.24,0],r:[0,0,-Math.PI/2],s:[.035,.08,.035]},6);for(const z of [-.04,.04])g.sphere('#222',{p:[.17,.27,z],s:.014},4,3);}
 else if(id==='toy_bone'){g.cyl('#f4ead8',{p:[-.18,.06,0],r:[0,0,-Math.PI/2],s:[.045,.36,.045]},1,1,8);for(const x of [-.2,.2])for(const z of [-.05,.05])g.sphere('#f4ead8',{p:[x,.06,z],s:.065},8,6);}
 else if(id==='toy_bubble'){g.cyl('#c9a7f4',{s:[.08,.22,.08]},1,1,10);g.torus('#c9a7f4',{p:[0,.36,0],r:[Math.PI/2,0,0]},.11,.02,16,5);g.cyl('#c9a7f4',{p:[0,.2,0],s:[.015,.06,.015]},1,1,4);}
 else return ballMesh();
 return toyCache[id]=g.mesh();}
/* 屋外 */
const OUT={
 park:{skyTop:'#8ccbf0',skyBottom:'#e7f4ea',fog:'#e7f4ea',ground:['#a9d18e','#93c27a'],path:'#efe0bc'},
 town:{skyTop:'#9cc7ea',skyBottom:'#f4ece0',fog:'#f4ece0',ground:['#cfd8c0','#c3cdb2'],path:'#c9c9c4'},
 sea:{skyTop:'#7cc4ee',skyBottom:'#e3f4f6',fog:'#e3f4f6',ground:['#f1e1b6','#e8d4a2'],path:'#f6e8c4'},
 mountain:{skyTop:'#93c3e6',skyBottom:'#e6efe4',fog:'#e6efe4',ground:['#98bf84','#86ad74'],path:'#d8c6a2'},
 river:{skyTop:'#8fcbea',skyBottom:'#e4f2e7',fog:'#e4f2e7',ground:['#a6d095','#92c084'],path:'#e8dcb9'},
 flower:{skyTop:'#9fd3f2',skyBottom:'#fbeef2',fog:'#fbeef2',ground:['#b9dd9a','#a6d088'],path:'#f4e6c8'},
 snow:{skyTop:'#a9cbe6',skyBottom:'#f2f6fa',fog:'#f2f6fa',ground:['#f6f9fc','#e4ecf3'],path:'#dfe7ef'},
 night:{skyTop:'#101a3e',skyBottom:'#3c4f80',fog:'#2c3b66',ground:['#5e6a80','#4f5a70'],path:'#7a7f8c'},
 surfsea:{skyTop:'#7cc4ee',skyBottom:'#e3f4f6',fog:'#e3f4f6',ground:['#5fb0d6','#56a6cc'],path:'#5fb0d6'},
 sky:{skyTop:'#6fb8ee',skyBottom:'#e6f4fb',fog:'#e6f4fb',ground:['#a9d18e','#93c27a'],path:'#efe0bc'},
 field:{skyTop:'#8ccbf0',skyBottom:'#eef6e8',fog:'#eef6e8',ground:['#b2d896','#9ccb82'],path:'#efe0bc'},
 sunset:{skyTop:'#f0a47c',skyBottom:'#fde3b6',fog:'#fde3b6',ground:['#a7c98a','#94b97a'],path:'#efe0bc'}
};
function outEnv(key,o={}){const e=OUT[key]||OUT.park,night=key==='night';return{skyTop:e.skyTop,skyBottom:e.skyBottom,fog:e.fog,fogNear:o.fogNear??22,fogFar:o.fogFar??70,sunDir:o.sunDir||[-.4,1,.5],sun:o.sun||(night?[.36,.36,.46]:[.58,.55,.48]),sky:night?[.4,.42,.56]:[.5,.54,.58],ground:night?[.24,.24,.3]:[.36,.35,.3]};}
/* 公園っぽい広場（ミニゲーム共通） */
function buildField(o={}){
 const key=o.key||'field',e=OUT[key]||OUT.field,g=new Geo(),R=o.size||30;
 Props.ground(g,R*2.4,R*2.4,e.ground[0],e.ground[1],0,30,30);
 const rnd=mulberry(o.seed||7);
 for(let i=0;i<(o.trees??22);i++){const a=rnd()*TAU,d=R*.55+rnd()*R*.5;const x=Math.cos(a)*d,z=Math.sin(a)*d-(o.shiftZ||0);if(o.keepClear&&o.keepClear(x,z))continue;if(rnd()<.35)Props.pine(g,x,z,1+rnd()*.8);else Props.tree(g,x,z,1+rnd()*.7);}
 for(let i=0;i<(o.flowers??40);i++){const x=(rnd()-.5)*R*1.4,z=(rnd()-.5)*R*1.4;if(o.keepClear&&o.keepClear(x,z))continue;Props.flower(g,x,z,['#f4a6c1','#ffffff','#f7d35c','#c9a7f4'][i%4]);}
 for(let i=0;i<(o.bushes??10);i++){const a=rnd()*TAU,d=R*.4+rnd()*R*.4,x=Math.cos(a)*d,z=Math.sin(a)*d;if(o.keepClear&&o.keepClear(x,z))continue;Props.bush(g,x,z,1+rnd()*.6);}
 for(let i=0;i<5;i++)Props.cloud(g,(rnd()-.5)*60,12+rnd()*6,-35-rnd()*20,2+rnd()*2);
 return new Node(g.mesh());
}
/* 羽の絵（板に貼る） */
let wingCv=null;
/* コミック調のパタパタ羽: 丸い上辺、下は3つの丸いギザギザ、太い黒ふち。左下が付け根。 */
function wingCanvas(){if(wingCv)return wingCv;const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');
 const path=()=>{c.beginPath();c.moveTo(14,108);c.bezierCurveTo(10,60,40,18,92,14);c.bezierCurveTo(118,13,124,34,110,44);c.arc(96,54,15,-.6,2.3);c.arc(70,74,17,-.9,2.5);c.arc(42,94,17,-1.1,2.8);c.closePath();};
 c.lineJoin='round';c.lineWidth=10;c.strokeStyle='#1f1a17';path();c.stroke();c.fillStyle='#ffffff';path();c.fill();
 c.strokeStyle='#d6dde6';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(30,92);c.quadraticCurveTo(50,56,84,40);c.moveTo(52,80);c.quadraticCurveTo(68,62,92,52);c.stroke();
 c.fillStyle='rgba(255,255,255,.9)';c.beginPath();c.ellipse(70,30,16,7,-.4,0,TAU);c.fill();return wingCv=cv;}
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
root.ShibaWorld={ROOM,HOUSE,DOOR,GARDEN,FIELD,ROAD,AREAS,RIVER,onBridge,waterAt,groundHeight,roadEnd,travelSpots,TIMES,timeOfDay,homeEnv,buildRoom,walkRects,clampToRects,foodFigure,bowlFood,ballMesh,toyMesh,wingCanvas,OUT,outEnv,buildField,mulberry};
})(globalThis);

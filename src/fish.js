/* さかなの絵（20種）。キャンバスに横向き（頭が左）で描く。ずかん・つれた瞬間・3Dの中で使う。
   ふつうの魚は共通の体＋ひれ＋もよう、エビ・カニ・タコ・イカ・ウナギ・エンゼルフィッシュは専用の描き方。 */
(function(root){
'use strict';
const TAU=Math.PI*2,LINE='#2a2320',CW=256,CH=160;
function grad(c,y0,y1,top,bot,mid){const g=c.createLinearGradient(0,y0,0,y1);g.addColorStop(0,top);if(mid)g.addColorStop(.5,mid);g.addColorStop(1,bot);return g;}
function stroke(c,w=4,col=LINE){c.lineWidth=w;c.strokeStyle=col;c.lineJoin='round';c.lineCap='round';c.stroke();}
function eye(c,x,y,r,ring){if(ring){c.beginPath();c.arc(x,y,r+3,0,TAU);c.fillStyle=ring;c.fill();}c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle='#fffdf6';c.fill();stroke(c,2.5);c.beginPath();c.arc(x-r*.12,y,r*.58,0,TAU);c.fillStyle='#1d1a18';c.fill();c.beginPath();c.arc(x-r*.35,y-r*.3,r*.22,0,TAU);c.fillStyle='#ffffff';c.fill();}
/* 共通の魚の体: 頭が左、x0=口、x1=尾のつけね */
function bodyPath(c,p){const {x0,x1,cy,h}=p,L=x1-x0,mx=x0+L*(p.hx||.38),ht=h*(p.top||1),hb=h*(p.bot||1),tb=p.tb||h*.28,ny=p.ny||0;
 c.beginPath();c.moveTo(x0,cy+ny);c.bezierCurveTo(x0+L*.03,cy-ht*.75,mx-L*.2,cy-ht,mx,cy-ht);c.bezierCurveTo(mx+L*.32,cy-ht,x1-L*.14,cy-tb,x1,cy-tb);
 c.lineTo(x1,cy+tb);c.bezierCurveTo(x1-L*.14,cy+tb,mx+L*.32,cy+hb,mx,cy+hb);c.bezierCurveTo(mx-L*.2,cy+hb,x0+L*.03,cy+hb*.75,x0,cy+ny);c.closePath();}
function tail(c,p){const {x1,cy,h}=p,tb=p.tb||h*.28,t=p.tail||{},tl=t.len||36,ts=t.spread||h*.9,col=p.fin||p.topC;c.beginPath();
 if(t.type==='round'){c.moveTo(x1-4,cy-tb);c.bezierCurveTo(x1+tl*.9,cy-ts,x1+tl*1.1,cy+ts,x1-4,cy+tb);}
 else if(t.type==='moon'){c.moveTo(x1-4,cy-tb*.6);c.quadraticCurveTo(x1+tl*.5,cy-ts*.5,x1+tl*.9,cy-ts);c.quadraticCurveTo(x1+tl*.45,cy,x1+tl*.9,cy+ts);c.quadraticCurveTo(x1+tl*.5,cy+ts*.5,x1-4,cy+tb*.6);}
 else if(t.type==='cut'){c.moveTo(x1-4,cy-tb);c.lineTo(x1+tl,cy-ts);c.quadraticCurveTo(x1+tl*.85,cy,x1+tl,cy+ts);c.lineTo(x1-4,cy+tb);}
 else{c.moveTo(x1-4,cy-tb);c.quadraticCurveTo(x1+tl*.4,cy-ts*.6,x1+tl,cy-ts);c.quadraticCurveTo(x1+tl*.6,cy-ts*.2,x1+tl*.5,cy);c.quadraticCurveTo(x1+tl*.6,cy+ts*.2,x1+tl,cy+ts);c.quadraticCurveTo(x1+tl*.4,cy+ts*.6,x1-4,cy+tb);}
 c.closePath();c.fillStyle=col;c.fill();stroke(c,3.5);
 if(t.rays){c.save();c.clip();c.strokeStyle='rgba(0,0,0,.18)';c.lineWidth=1.5;for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(x1,cy);c.lineTo(x1+tl,cy+i*ts/3);c.stroke();}c.restore();}}
// ひれ: at=体のどこ(0..1)から to まで、上(dorsal)か下か。kind: round/spiny/sail/small/lobe
// 体のふちの高さ（ひれの位置を決める）
function edge(p,t){const hx=p.hx||.38;return t<hx?p.h*(.75+.25*Math.sin(t/hx*Math.PI/2)):p.h*(1-.72*Math.pow((t-hx)/(1-hx),1.6));}
function fin(c,p,f){const {x0,x1,cy}=p,L=x1-x0,a=x0+L*f.at,b=x0+L*f.to,up=f.down?1:-1,e=edge(p,(f.at+f.to)/2)*(f.down?(p.bot||1):(p.top||1)),base=cy+up*e*(f.base||.6),hh=f.h+e*(1-(f.base||.6)),col=f.col||p.fin||p.topC;c.beginPath();
 if(f.kind==='spiny'){c.moveTo(a,base);const n=f.n||5;for(let i=0;i<=n;i++){const x=a+(b-a)*i/n,k=f.shape?f.shape(i/n):1-i/n*.4;c.lineTo(x+(b-a)/n*.3,base+up*hh*k);c.lineTo(x+(b-a)/n*.6,base+up*hh*k*.55);}c.lineTo(b,base);}
 else if(f.kind==='sail'){c.moveTo(a,base);c.quadraticCurveTo(a+(b-a)*.1,base+up*hh*1.1,a+(b-a)*.55,base+up*hh);c.quadraticCurveTo(b,base+up*hh*.5,b,base);}
 else if(f.kind==='lobe'){const mx=(a+b)/2;c.moveTo(a,base);c.quadraticCurveTo(a,base+up*hh*.6,mx,base+up*hh);c.quadraticCurveTo(b+6,base+up*hh*.9,b,base);}
 else{c.moveTo(a,base);c.quadraticCurveTo(a+(b-a)*.25,base+up*hh*1.05,a+(b-a)*.6,base+up*hh*.95);c.quadraticCurveTo(b,base+up*hh*.7,b,base);}
 c.closePath();c.fillStyle=col;c.fill();stroke(c,3);}
function pectoral(c,p,o={}){const {x0,x1,cy,h}=p,L=x1-x0,x=x0+L*(o.at||.26),y=cy+h*(o.y||.25),l=o.len||28;c.beginPath();c.moveTo(x,y-4);c.quadraticCurveTo(x+l*.7,y-6,x+l,y+l*.35);c.quadraticCurveTo(x+l*.4,y+l*.3,x,y+5);c.closePath();c.fillStyle=o.col||p.fin||p.topC;c.fill();stroke(c,2.5);}
function scales(c,p,col='rgba(255,255,255,.22)',step=10){c.strokeStyle=col;c.lineWidth=1.6;for(let x=p.x0+(p.x1-p.x0)*.22;x<p.x1;x+=step)for(let y=p.cy-p.h;y<p.cy+p.h;y+=step*.8){c.beginPath();c.arc(x+((y/step|0)%2)*step*.5,y,step*.5,-1.2,1.2);c.stroke();}}
function dots(c,p,col,n,r,area){let s=7;const rnd=()=>{s=(s*9301+49297)%233280;return s/233280;};c.fillStyle=col;for(let i=0;i<n;i++){const x=p.x0+(p.x1-p.x0)*(area?area[0]+rnd()*(area[1]-area[0]):.2+rnd()*.85),y=p.cy-p.h+rnd()*p.h*(area&&area[2]?area[2]:2);c.beginPath();c.arc(x,y,r*(.6+rnd()*.6),0,TAU);c.fill();}}
function gill(c,p,at=.2){const x=p.x0+(p.x1-p.x0)*at;c.beginPath();c.moveTo(x,p.cy-p.h*.55);c.quadraticCurveTo(x+9,p.cy,x,p.cy+p.h*.55);stroke(c,2.5,'rgba(42,35,32,.55)');}
function mouth(c,p,o={}){const x=p.x0,y=p.cy+(p.ny||0);c.beginPath();c.moveTo(x+1,y);c.lineTo(x+(o.len||10),y+(o.dy||3));stroke(c,2.5);}
function whiskers(c,p,n,len=16){const x=p.x0+4,y=p.cy+(p.ny||0)+3;for(let i=0;i<n;i++){c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-len*.5,y+4+i*3,x-len*.7,y+8+i*6);stroke(c,2.2);}}
/* 共通の魚: ひれ → 尾 → 体（もようは体の形で切りぬく）→ 目・口 */
function fish(c,p){for(const f of p.fins||[])fin(c,p,f);tail(c,p);bodyPath(c,p);c.fillStyle=grad(c,p.cy-p.h,p.cy+p.h,p.topC,p.botC,p.midC);c.fill();
 if(p.pattern){c.save();bodyPath(c,p);c.clip();p.pattern(c,p);c.restore();}bodyPath(c,p);stroke(c,4);
 gill(c,p,p.gill||.22);if(p.pec!==false)pectoral(c,p,p.pec||{});const L=p.x1-p.x0;eye(c,p.x0+L*(p.eye?.at||.1),p.cy-p.h*(p.eye?.y??.25),p.eye?.r||7,p.eye?.ring);mouth(c,p,p.mouth||{});if(p.whisk)whiskers(c,p,p.whisk,p.whiskLen);if(p.after)p.after(c,p);}
const D={
 funa(c){fish(c,{x0:40,x1:192,cy:84,h:36,hx:.4,topC:'#6c6a3c',midC:'#a69a5c',botC:'#e2d49a',fin:'#857a46',tail:{len:40,spread:32,rays:1},fins:[{at:.36,to:.72,h:20},{at:.66,to:.8,h:12,down:1}],pattern:(c,p)=>scales(c,p,'rgba(255,255,230,.25)',11),eye:{r:7}});},
 ayu(c){fish(c,{x0:30,x1:200,cy:86,h:24,hx:.36,topC:'#56654e',midC:'#a8b49a',botC:'#eef0e2',fin:'#d9c25a',tail:{len:36,spread:26,rays:1},fins:[{at:.38,to:.55,h:26,col:'#5d6650'},{at:.82,to:.88,h:8,col:'#5d6650'},{at:.66,to:.8,h:10,down:1}],pattern:(c,p)=>{c.fillStyle='#f2cf3a';c.beginPath();c.ellipse(p.x0+(p.x1-p.x0)*.3,p.cy-2,14,8,-.2,0,TAU);c.fill();},eye:{r:6}});},
 dojo(c){fish(c,{x0:28,x1:208,cy:84,h:14,hx:.3,tb:9,topC:'#7d6236',midC:'#a8875a',botC:'#dcc89c',fin:'#a8875a',tail:{type:'round',len:24,spread:14},fins:[{at:.56,to:.66,h:9,base:.5}],pattern:(c,p)=>dots(c,p,'rgba(60,40,20,.6)',38,2.6),eye:{r:4,at:.06},gill:.13,pec:{at:.14,len:14,y:.4},whisk:3,whiskLen:18,mouth:{len:5}});},
 bass(c){fish(c,{x0:28,x1:192,cy:84,h:34,hx:.4,ny:4,topC:'#4b6a36',midC:'#8aa65e',botC:'#ece8c8',fin:'#6a8648',tail:{type:'cut',len:34,spread:30,rays:1},fins:[{at:.3,to:.56,h:24,kind:'spiny',n:6},{at:.55,to:.74,h:20},{at:.66,to:.8,h:14,down:1}],pattern:(c,p)=>{c.fillStyle='rgba(30,50,20,.55)';for(let i=0;i<7;i++){c.beginPath();c.ellipse(p.x0+52+i*20,p.cy+2,11,7,0,0,TAU);c.fill();}},eye:{r:7,at:.12,y:.32},mouth:{len:30,dy:-6},
  after:(c,p)=>{c.beginPath();c.moveTo(p.x0,p.cy+4);c.lineTo(p.x0+30,p.cy-2);c.lineTo(p.x0+26,p.cy+8);c.closePath();c.fillStyle='#3a2a22';c.fill();}});},
 gill(c){fish(c,{x0:52,x1:178,cy:82,h:46,hx:.45,topC:'#556868',midC:'#7f8f7c',botC:'#efbe7a',fin:'#6b7a70',tail:{len:30,spread:30,rays:1},fins:[{at:.3,to:.78,h:16,kind:'spiny',n:7,base:.7},{at:.55,to:.82,h:16,down:1,base:.7}],pattern:(c,p)=>{c.fillStyle='rgba(40,50,60,.25)';for(let i=0;i<6;i++)c.fillRect(p.x0+40+i*14,p.cy-p.h,6,p.h*2);c.strokeStyle='#5ab0e8';c.lineWidth=3;c.beginPath();c.moveTo(p.x0+6,p.cy+6);c.lineTo(p.x0+26,p.cy+12);c.stroke();},eye:{r:7,at:.12},gill:.22,
  after:(c,p)=>{c.beginPath();c.ellipse(p.x0+36,p.cy-6,7,9,0,0,TAU);c.fillStyle='#14142a';c.fill();}});},
 koi(c){fish(c,{x0:30,x1:196,cy:84,h:32,hx:.38,topC:'#fbf7ee',botC:'#f4efe4',fin:'#fbe6d0',tail:{len:42,spread:34,rays:1},fins:[{at:.36,to:.74,h:16,col:'#f6d2b0'},{at:.7,to:.82,h:10,down:1,col:'#fbe6d0'}],pattern:(c,p)=>{c.fillStyle='#f0702a';for(const [x,y,rx,ry]of [[60,70,24,18],[112,76,26,22],[160,66,20,14],[44,90,10,8]]){c.beginPath();c.ellipse(x,y,rx,ry,.3,0,TAU);c.fill();}scales(c,p,'rgba(200,120,60,.25)',11);},eye:{r:6},whisk:2,whiskLen:14});},
 ito(c){fish(c,{x0:24,x1:204,cy:84,h:26,hx:.34,ny:2,topC:'#5a4a38',midC:'#a8806a',botC:'#e8d0b8',fin:'#7a5a48',tail:{type:'cut',len:32,spread:24,rays:1},fins:[{at:.4,to:.54,h:18},{at:.84,to:.89,h:8},{at:.68,to:.8,h:12,down:1}],pattern:(c,p)=>{const g=c.createLinearGradient(p.x0,0,p.x1,0);g.addColorStop(.4,'rgba(200,90,80,0)');g.addColorStop(1,'rgba(200,90,80,.55)');c.fillStyle=g;c.fillRect(p.x0,p.cy-p.h,p.x1-p.x0,p.h*2);dots(c,p,'#2a2018',46,2.2,[.15,1,1.2]);},eye:{r:6,at:.09},mouth:{len:20,dy:2},gill:.2});},
 medaka(c){fish(c,{x0:52,x1:188,cy:84,h:22,hx:.42,ny:-6,topC:'#f0a63e',midC:'#f6c57a',botC:'#fdeccc',fin:'#f8cf8a',tail:{type:'cut',len:28,spread:20,rays:1},fins:[{at:.72,to:.82,h:12},{at:.5,to:.88,h:12,down:1}],eye:{r:11,at:.14,y:.15},mouth:{len:6,dy:-3},pec:{at:.3,len:18}});},
 tai(c){fish(c,{x0:34,x1:190,cy:88,h:42,hx:.36,top:1.1,bot:.8,topC:'#e0414f',midC:'#f07884',botC:'#fbd2d2',fin:'#e5606a',tail:{len:38,spread:32,rays:1},fins:[{at:.22,to:.7,h:24,kind:'spiny',n:9},{at:.6,to:.8,h:14,down:1,base:.55}],pattern:(c,p)=>dots(c,p,'#52b0ee',22,2.6,[.2,.9,1.1]),eye:{r:8,at:.12,y:.3,ring:'#f8d050'}});},
 coela(c){const p={x0:28,x1:190,cy:84,h:36,hx:.4,topC:'#2c4868',midC:'#3f6286',botC:'#6a8aa8',fin:'#3a5878',tail:{type:'round',len:44,spread:30},fins:[{at:.3,to:.42,h:22,kind:'spiny',n:4},{at:.62,to:.74,h:22,kind:'lobe'},{at:.58,to:.7,h:22,kind:'lobe',down:1},{at:.32,to:.42,h:18,kind:'lobe',down:1}],pec:{at:.24,len:30,col:'#3a5878'},
  pattern:(c,p)=>{c.fillStyle='rgba(240,248,255,.85)';let s=3;const r=()=>{s=(s*9301+49297)%233280;return s/233280;};for(let i=0;i<18;i++){c.beginPath();c.ellipse(p.x0+30+r()*140,p.cy-p.h+8+r()*p.h*1.7,3+r()*5,2+r()*3,r()*3,0,TAU);c.fill();}},eye:{r:8,at:.1,ring:'#d8c070'}};
  fish(c,p);c.beginPath();c.moveTo(p.x1+30,p.cy);c.lineTo(p.x1+44,p.cy);stroke(c,5);c.beginPath();c.ellipse(p.x1+48,p.cy,9,6,0,0,TAU);c.fillStyle='#3a5878';c.fill();stroke(c,2.5);},
 maguro(c){fish(c,{x0:22,x1:196,cy:84,h:34,hx:.42,tb:7,topC:'#1c2c50',midC:'#5a78a8',botC:'#eef2f6',fin:'#2a3a60',tail:{type:'moon',len:40,spread:44},fins:[{at:.3,to:.44,h:18,kind:'spiny',n:4},{at:.46,to:.58,h:24,kind:'sail',col:'#e8c040'},{at:.5,to:.62,h:22,kind:'sail',down:1,col:'#e8c040'}],pec:{at:.24,len:40,y:0},eye:{r:7,at:.08},
  after:(c,p)=>{for(let i=0;i<6;i++){const x=p.x0+(p.x1-p.x0)*(.66+i*.05);for(const s of [-1,1]){c.beginPath();c.moveTo(x,p.cy+s*p.h*.45*(1-i*.1));c.lineTo(x+5,p.cy+s*(p.h*.45*(1-i*.1)+7));c.lineTo(x+7,p.cy+s*p.h*.4*(1-i*.1));c.closePath();c.fillStyle='#f2c83a';c.fill();stroke(c,1.5);}}}});},
 sake(c){fish(c,{x0:30,x1:198,cy:84,h:30,hx:.38,ny:3,topC:'#46607a',midC:'#c9d6dc',botC:'#f2f0ee',fin:'#7a8a94',tail:{len:36,spread:28,rays:1},fins:[{at:.4,to:.54,h:22},{at:.84,to:.89,h:8},{at:.68,to:.8,h:12,down:1}],pattern:(c,p)=>{c.fillStyle='rgba(240,140,140,.5)';c.fillRect(p.x0,p.cy-6,p.x1-p.x0,16);dots(c,p,'#1e2a34',30,2.4,[.3,1,.8]);},eye:{r:6,at:.09},mouth:{len:16,dy:2},
  after:(c,p)=>{c.beginPath();c.moveTo(p.x1+4,p.cy-10);c.arc(p.x1+18,p.cy-14,2.4,0,TAU);c.fillStyle='#1e2a34';c.fill();}});},
 sanma(c){fish(c,{x0:20,x1:214,cy:84,h:13,hx:.45,tb:5,topC:'#29467a',midC:'#8aa6c8',botC:'#f2f5f8',fin:'#3a5684',tail:{len:24,spread:16},fins:[{at:.72,to:.8,h:10,base:.5},{at:.72,to:.8,h:10,down:1,base:.5}],eye:{r:5,at:.08,y:.2},pec:{at:.16,len:14,y:.3},mouth:{len:4},
  after:(c,p)=>{c.beginPath();c.moveTo(p.x0+2,p.cy-3);c.lineTo(p.x0-12,p.cy+1);c.lineTo(p.x0+2,p.cy+3);c.closePath();c.fillStyle='#f2c83a';c.fill();stroke(c,2);for(let i=0;i<5;i++){const x=p.x0+(p.x1-p.x0)*(.82+i*.035);for(const s of [-1,1]){c.beginPath();c.moveTo(x,p.cy+s*5);c.lineTo(x+3,p.cy+s*10);c.lineTo(x+5,p.cy+s*5);c.fillStyle='#3a5684';c.fill();}}}});},
 aji(c){fish(c,{x0:34,x1:196,cy:84,h:30,hx:.4,tb:7,topC:'#5f8384',midC:'#c8d2b8',botC:'#f2f2ea',fin:'#c8c070',tail:{len:38,spread:32},fins:[{at:.3,to:.44,h:18,kind:'spiny',n:5},{at:.46,to:.82,h:12},{at:.5,to:.82,h:10,down:1}],pattern:(c,p)=>{c.fillStyle='rgba(232,214,100,.45)';c.fillRect(p.x0,p.cy-4,p.x1-p.x0,10);c.strokeStyle='#4d5a50';c.lineWidth=2;c.beginPath();c.moveTo(p.x0+30,p.cy-8);c.quadraticCurveTo(p.x0+80,p.cy-12,p.x0+96,p.cy);for(let x=p.x0+96;x<p.x1;x+=6)c.lineTo(x+3,p.cy+((x/6|0)%2?-3:3));c.stroke();},eye:{r:8,at:.11},
  after:(c,p)=>{c.beginPath();c.arc(p.x0+38,p.cy-14,4,0,TAU);c.fillStyle='#2a2a2a';c.fill();}});},
 /* ---- 専用の描き方 ---- */
 unagi(c){const path=()=>{c.beginPath();c.moveTo(34,70);c.bezierCurveTo(80,40,110,110,150,80);c.bezierCurveTo(180,58,205,84,228,100);};
  c.lineCap='round';c.lineJoin='round';path();c.lineWidth=30;c.strokeStyle=LINE;c.stroke();path();c.lineWidth=24;c.strokeStyle='#4d5a3e';c.stroke();
  c.save();c.translate(0,7);path();c.lineWidth=8;c.strokeStyle='#cfc890';c.stroke();c.restore();
  c.save();c.translate(0,-11);c.beginPath();c.moveTo(84,58);c.bezierCurveTo(110,92,130,92,150,70);c.bezierCurveTo(180,50,205,74,224,88);c.lineWidth=5;c.strokeStyle='#6e7a52';c.stroke();c.restore();
  c.beginPath();c.ellipse(30,72,18,14,-.4,0,TAU);c.fillStyle='#4d5a3e';c.fill();stroke(c,4);c.beginPath();c.moveTo(14,76);c.lineTo(28,80);stroke(c,2.5);
  c.beginPath();c.moveTo(46,78);c.quadraticCurveTo(58,86,52,96);c.quadraticCurveTo(44,90,44,82);c.fillStyle='#6e7a52';c.fill();stroke(c,2);eye(c,26,66,5);},
 angel(c){const cx=118,cy=82;c.beginPath();c.moveTo(cx-6,cy-28);c.quadraticCurveTo(cx+30,cy-60,cx+44,cy-74);c.quadraticCurveTo(cx+50,cy-30,cx+40,cy-8);c.closePath();c.fillStyle='#e8e6dc';c.fill();stroke(c,3);
  c.beginPath();c.moveTo(cx-6,cy+28);c.quadraticCurveTo(cx+30,cy+60,cx+44,cy+74);c.quadraticCurveTo(cx+50,cy+30,cx+40,cy+8);c.closePath();c.fillStyle='#e8e6dc';c.fill();stroke(c,3);
  c.beginPath();c.moveTo(cx+44,cy-14);c.quadraticCurveTo(cx+76,cy-30,cx+74,cy);c.quadraticCurveTo(cx+76,cy+30,cx+44,cy+14);c.closePath();c.fillStyle='#e8e6dc';c.fill();stroke(c,3);
  for(const s of [0,1]){c.beginPath();c.moveTo(cx-10,cy+20);c.quadraticCurveTo(cx-6+s*6,cy+60,cx+4+s*8,cy+72);stroke(c,2.5,'#c9c5b4');}
  const body=()=>{c.beginPath();c.moveTo(cx-48,cy);c.quadraticCurveTo(cx-30,cy-36,cx+10,cy-34);c.quadraticCurveTo(cx+46,cy-20,cx+48,cy);c.quadraticCurveTo(cx+46,cy+20,cx+10,cy+34);c.quadraticCurveTo(cx-30,cy+36,cx-48,cy);c.closePath();};
  body();c.fillStyle=grad(c,cy-36,cy+36,'#d8d6c8','#f6f4ec');c.fill();c.save();body();c.clip();c.fillStyle='#262626';for(const x of [cx-22,cx+6,cx+34])c.fillRect(x-5,cy-40,10,80);c.restore();
  body();stroke(c,4);eye(c,cx-30,cy-6,7);c.beginPath();c.moveTo(cx-48,cy);c.lineTo(cx-40,cy+3);stroke(c,2.5);},
 ebi(c){const seg=[[150,74,24,20],[128,66,22,20],[106,64,20,18],[86,68,18,16],[70,78,16,14],[60,92,14,12]];
  c.strokeStyle=LINE;c.lineWidth=2.5;for(let i=0;i<5;i++){c.beginPath();c.moveTo(150-i*18,92);c.lineTo(146-i*18,112);c.lineTo(140-i*18,118);c.stroke();}
  c.beginPath();c.moveTo(178,64);c.quadraticCurveTo(120,10,30,30);stroke(c,2.5);c.beginPath();c.moveTo(178,70);c.quadraticCurveTo(110,30,24,60);stroke(c,2.5);
  c.beginPath();c.moveTo(56,100);c.lineTo(34,92);c.lineTo(30,112);c.lineTo(46,120);c.lineTo(60,106);c.closePath();c.fillStyle='#f08a4a';c.fill();stroke(c,3);
  for(const [x,y,rx,ry]of seg.slice().reverse()){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle='#f39256';c.fill();stroke(c,3);c.beginPath();c.ellipse(x,y-ry*.35,rx*.8,ry*.25,0,0,TAU);c.fillStyle='rgba(255,220,190,.55)';c.fill();}
  c.beginPath();c.moveTo(172,62);c.quadraticCurveTo(206,52,214,50);c.quadraticCurveTo(204,64,174,78);c.closePath();c.fillStyle='#f39256';c.fill();stroke(c,3);
  c.beginPath();c.ellipse(178,70,26,22,0,0,TAU);c.fillStyle='#f6a066';c.fill();stroke(c,3.5);eye(c,186,60,6);},
 kani(c){const cx=128,cy=94;c.strokeStyle=LINE;
  for(const s of [-1,1])for(let i=0;i<4;i++){c.beginPath();c.moveTo(cx+s*30,cy+4+i*7);c.lineTo(cx+s*(62+i*6),cy-4+i*10);c.lineTo(cx+s*(76+i*6),cy+22+i*8);c.lineWidth=9;c.strokeStyle=LINE;c.stroke();c.lineWidth=5;c.strokeStyle='#e0503a';c.stroke();}
  for(const s of [-1,1]){c.beginPath();c.moveTo(cx+s*30,cy-10);c.lineTo(cx+s*54,cy-34);c.lineWidth=11;c.strokeStyle=LINE;c.stroke();c.lineWidth=7;c.strokeStyle='#e0503a';c.stroke();
   c.beginPath();c.ellipse(cx+s*62,cy-50,18,14,s*.6,0,TAU);c.fillStyle='#e8583e';c.fill();stroke(c,3.5);c.beginPath();c.moveTo(cx+s*66,cy-56);c.lineTo(cx+s*84,cy-72);c.lineTo(cx+s*74,cy-50);c.closePath();c.fillStyle='#e8583e';c.fill();stroke(c,3);}
  for(const s of [-1,1]){c.beginPath();c.moveTo(cx+s*10,cy-26);c.lineTo(cx+s*14,cy-44);stroke(c,3);eye(c,cx+s*14,cy-46,6);}
  c.beginPath();c.ellipse(cx,cy,44,30,0,0,TAU);c.fillStyle=grad(c,cy-30,cy+30,'#e8583e','#c43a2a');c.fill();stroke(c,4);c.fillStyle='rgba(255,210,180,.6)';for(const [x,y]of [[-16,-10],[10,-14],[-4,4],[20,2]]){c.beginPath();c.arc(cx+x,cy+y,4,0,TAU);c.fill();}
  c.beginPath();c.moveTo(cx-8,cy+14);c.quadraticCurveTo(cx,cy+18,cx+8,cy+14);stroke(c,2.5);},
 tako(c){const cx=128;for(let i=0;i<8;i++){const a=(i/7-.5)*2.6,x0=cx+Math.sin(a)*24,y0=96;const path=()=>{c.beginPath();c.moveTo(x0,y0);c.bezierCurveTo(x0+Math.sin(a)*40,y0+20,x0+Math.sin(a)*70,y0+44,x0+Math.sin(a)*58+(i%2?10:-10),y0+52);};
   path();c.lineWidth=17;c.strokeStyle=LINE;c.lineCap='round';c.stroke();path();c.lineWidth=12;c.strokeStyle='#e25a4e';c.stroke();
   c.fillStyle='#f9d8c8';for(let k=1;k<4;k++){const t=k/4,x=x0+Math.sin(a)*(40*t*1.4)*(1-t*.3),y=y0+t*48;c.beginPath();c.arc(x+2,y+3,2.6,0,TAU);c.fill();}}
  c.beginPath();c.ellipse(cx,64,42,46,0,0,TAU);c.fillStyle=grad(c,18,110,'#ef6a5c','#d8463a');c.fill();stroke(c,4);c.beginPath();c.ellipse(cx-14,42,10,7,-.5,0,TAU);c.fillStyle='rgba(255,255,255,.45)';c.fill();
  eye(c,cx-16,78,8);eye(c,cx+16,78,8);c.beginPath();c.ellipse(cx,98,9,7,0,0,TAU);c.fillStyle='#d8463a';c.fill();stroke(c,3);c.beginPath();c.arc(cx,98,3,0,TAU);c.fillStyle=LINE;c.fill();},
 ika(c){const cy=80;for(let i=0;i<8;i++){c.beginPath();c.moveTo(72,cy-10+i*3);c.quadraticCurveTo(46,cy-20+i*6,24,cy-26+i*8);c.lineWidth=7;c.strokeStyle=LINE;c.lineCap='round';c.stroke();c.lineWidth=4;c.strokeStyle='#f2e2d8';c.stroke();}
  for(const s of [-1,1]){c.beginPath();c.moveTo(70,cy+s*4);c.quadraticCurveTo(30,cy+s*30,12,cy+s*20);c.lineWidth=5;c.strokeStyle=LINE;c.stroke();c.lineWidth=2.5;c.strokeStyle='#f2e2d8';c.stroke();c.beginPath();c.ellipse(12,cy+s*20,7,4,s*.4,0,TAU);c.fillStyle='#f2e2d8';c.fill();stroke(c,2);}
  c.beginPath();c.moveTo(198,cy);c.lineTo(236,cy-34);c.lineTo(228,cy);c.lineTo(236,cy+34);c.closePath();c.fillStyle='#f4e4da';c.fill();stroke(c,3.5);
  const mantle=()=>{c.beginPath();c.moveTo(96,cy-22);c.quadraticCurveTo(170,cy-30,232,cy);c.quadraticCurveTo(170,cy+30,96,cy+22);c.closePath();};mantle();c.fillStyle=grad(c,cy-30,cy+30,'#f6e8de','#ead2c4');c.fill();
  c.save();mantle();c.clip();c.fillStyle='rgba(222,120,100,.55)';let s=5;const r=()=>{s=(s*9301+49297)%233280;return s/233280;};for(let i=0;i<40;i++){c.beginPath();c.arc(100+r()*130,cy-28+r()*56,1.5+r()*2.5,0,TAU);c.fill();}c.restore();mantle();stroke(c,4);
  c.beginPath();c.ellipse(84,cy,22,20,0,0,TAU);c.fillStyle='#f2e2d8';c.fill();stroke(c,3.5);eye(c,80,cy-4,9);}
};
const cache=new Map();
/* sil=true は まだつっていない魚のかげ（ずかん用） */
function canvas(id,sil=false){const key=id+(sil?':s':'');let cv=cache.get(key);if(cv)return cv;cv=document.createElement('canvas');cv.width=CW;cv.height=CH;const c=cv.getContext('2d');
 if(D[id])D[id](c);if(sil){c.globalCompositeOperation='source-in';c.fillStyle='#58626e';c.fillRect(0,0,CW,CH);c.globalCompositeOperation='source-over';}cache.set(key,cv);return cv;}
root.ShibaFish={canvas,ids:Object.keys(D),W:CW,H:CH};
})(globalThis);

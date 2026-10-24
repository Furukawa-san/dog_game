/* Grant画像はbuild.cjsでそのまま埋め込む（元ファイルは変更しない）。
   黒柴のスプライトシート（全ポーズ）から、起動時に茶柴・白柴の全ポーズを色変えで作る。 */
(function(root){
'use strict';
const A=root.ShibaArt,images={},assets={black:'/*__GRANT_BLACK__*/',brown:'/*__GRANT_BROWN__*/',white:'/*__GRANT_WHITE__*/'};
let loaded=false,error=null;
const originals={};
const ready=Promise.all(Object.entries(assets).map(([coat,src])=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>{originals[coat]=im;res();};im.onerror=()=>rej(new Error('Grant image could not be decoded'));im.src=src;}))).then(()=>{
 images.black=originals.black;
 for(const coat of ['brown','white']){try{images[coat]=recolor(originals.black,coat);}catch(e){images[coat]=originals.black;}}
 loaded=true;return images;}).catch(e=>{error=e;return images;});
/* 色変え: 黒い毛→茶/白、タン→明るいクリーム、線と目は濃い色のまま。大きな暗い影は毛の色にする（白柴） */
const RECOLOR={brown:{line:[46,18,8],fur:[150,80,40],hi:[196,122,72],tan:[244,214,176],shadow:null},white:{line:[92,70,56],fur:[228,216,196],hi:[250,246,236],tan:[246,232,208],shadow:[204,190,168]},
 // NPCの柴犬（やさしい色）
 kinako:{line:[74,50,22],fur:[226,190,128],hi:[246,224,182],tan:[250,238,214],shadow:[206,168,108]},
 sakura:{line:[92,40,54],fur:[236,172,186],hi:[250,214,222],tan:[252,238,232],shadow:[214,150,166]},
 mint:{line:[30,72,60],fur:[150,206,186],hi:[208,238,226],tan:[236,248,240],shadow:[128,184,164]},
 sora:{line:[34,58,96],fur:[150,190,232],hi:[212,230,250],tan:[236,244,252],shadow:[128,168,212]},
 fuji:{line:[60,44,98],fur:[186,166,222],hi:[226,214,246],tan:[242,236,252],shadow:[164,144,202]}};
function recolor(img,coat,scale=1){
 const P=RECOLOR[coat],w=Math.round(img.width*scale),h=Math.round(img.height*scale),cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');c.drawImage(img,0,0,w,h);const id=c.getImageData(0,0,w,h),d=id.data,n=w*h;
 const L=new Float32Array(n);for(let i=0;i<n;i++){const j=i*4;L[i]=d[j+3]>100?.3*d[j]+.59*d[j+1]+.11*d[j+2]:255;}
 let mean=null;if(P.shadow){const S=new Float64Array((w+1)*(h+1));for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){row+=L[y*w+x];S[(y+1)*(w+1)+x+1]=S[y*(w+1)+x+1]+row;}}mean=new Float32Array(n);const R=5;for(let y=0;y<h;y++){const y0=Math.max(0,y-R),y1=Math.min(h,y+R+1);for(let x=0;x<w;x++){const x0=Math.max(0,x-R),x1=Math.min(w,x+R+1);mean[y*w+x]=(S[y1*(w+1)+x1]-S[y0*(w+1)+x1]-S[y1*(w+1)+x0]+S[y0*(w+1)+x0])/((x1-x0)*(y1-y0));}}}
 const sm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);},mx=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
 const light=coat==='white',e0=light?10:14,e1=light?26:30,f1=light?85:95;
 for(let i=0;i<n;i++){const j=i*4;if(d[j+3]===0)continue;const r=d[j],g=d[j+1],b=d[j+2],l=L[i],M=Math.max(r,g,b),m=Math.min(r,g,b),sat=(M-m)/(M+1);let col=null;
  if(l<110&&sat<.45){const t=sm(e0,e1,l),u=sm(e1,f1,l);col=mx(mx(P.line,P.fur,t),P.hi,u);if(mean){const k=1-sm(26,40,mean[i]);col=mx(col,P.shadow,k*(1-t));}}
  else if(sat>.3&&r>g&&g>b&&l>110){col=mx([r,g,b],P.tan,sm(.3,.6,sat)*.85);}
  if(col){d[j]=col[0];d[j+1]=col[1];d[j+2]=col[2];}}
 c.putImageData(id,0,0);return cv;
}
const sequences={idle:[0,6,3],right:[1,8,11],left:[2,8,11],paw:[3,4,3],happy:[4,5,6],sad:[5,8,4],bath:[6,6,4],grumpy:[7,6,3],eat:[8,6,8]};
// 1枚で止める技のポーズ: おて=前足を上げた絵、ちんちん=後ろ足で立った絵、おすわり=最初の絵
const HOLD={pawhold:[3,2],pawup:[3,1],beg:[4,2],sit:[0,0],down:[8,0],standR:[1,7],standL:[2,7]};
function frame(coat,mood,t,pose,opt={}){
 const im=sheet(coat);if(!im)return null;const cw=im.width/8,ch=im.height/11;
 if(HOLD[pose]){const [row,col]=HOLD[pose];return{image:im,sx:col*cw,sy:row*ch,sw:cw,sh:ch,row,col,flip:false};}
 let key=pose==='run'?((opt.dx||1)<0?'left':'right'):pose==='paw'?'paw':pose==='happy'?'happy':pose==='bath'?'bath':pose==='eat'?'eat':pose==='sleep'?'sad':mood==='grumpy'?'grumpy':mood==='sad'?'sad':'idle';
 let [row,count,fps]=sequences[key],col=Math.floor(Math.max(0,t)*fps)%count;
 if(key==='idle'&&opt.look&&Math.hypot(...opt.look)>4){const [dx,dy]=opt.look;const k=(Math.round(Math.atan2(dx,-dy)/Math.PI/2*16)+16)%16;row=9+Math.floor(k/8);col=k%8;}
 if(pose==='sit'){row=0;col=0;}
 return{image:im,sx:col*cw,sy:row*ch,sw:cw,sh:ch,row,col,flip:false};
}
/* 毛色の絵を取り出す。NPCの色は初めて使うときに作る（輪郭がぼやけないよう元と同じ大きさ） */
function sheet(coat){if(images[coat])return images[coat];if(!originals.black)return null;if(!RECOLOR[coat])return images.black;try{images[coat]=recolor(originals.black,coat,1);}catch(e){images[coat]=originals.black;}return images[coat];}
function drawDog(c,x,y,size=220,coat='black',stage='puppy',mood='happy',t=0,pose='idle',shadow=true,opt={}){
 const f=frame(coat,mood,t,pose,opt);if(!f){c.save();c.fillStyle='#71846d';c.font='14px sans-serif';c.textAlign='center';c.fillText(error?'画像を読み込めませんでした':'この子の準備中…',x,y);c.restore();return;}
 const growth=stage==='puppy'?.79:stage==='junior'?.9:1,high=size*1.3*growth,w=high*192/208;
 const bob=pose==='run'?Math.sin(t*12)*size*.018:pose==='happy'?Math.abs(Math.sin(t*7))*-size*.025:pose==='eat'?Math.sin(t*12)*size*.012:Math.sin(t*2)*size*.005;
 c.save();if(shadow)A.ellipse(c,x,y+high*.43,w*.36,high*.045,'#61755222');c.translate(x,y+bob);if(f.flip)c.scale(-1,1);c.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,-w/2,-high*.59,w,high);c.restore();
 c.save();if(mood==='sad'){A.ellipse(c,x-w*.19,y-high*.24+Math.sin(t*3)*3,high*.014,high*.026,'#8fc6e1');A.ellipse(c,x+w*.19,y-high*.24+Math.sin(t*3)*3,high*.014,high*.026,'#8fc6e1');}
 if(mood==='grumpy'||pose==='full'){c.strokeStyle='#b66a56';c.lineWidth=2;c.beginPath();c.moveTo(x+w*.32,y-high*.5);c.lineTo(x+w*.42,y-high*.4);c.moveTo(x+w*.42,y-high*.5);c.lineTo(x+w*.32,y-high*.4);c.stroke();}
 if(pose==='sleep'){c.font=Math.max(12,high*.075)+'px sans-serif';c.fillStyle='#779077';c.fillText('z z',x+w*.36,y-high*.5);}
 if(pose==='bath')for(let i=0;i<7;i++)A.ellipse(c,x+Math.sin(t+i*3)*w*.4,y-high*.1-i*high*.08-(t*12%13),high*.04,high*.04,'#c9e7edb0','#98c4cb');
 c.restore();
}
function drawFood(c,x,y,size,kind,remaining=1){
 const a=Math.max(0,Math.min(1,remaining));c.save();c.translate(x,y);c.scale(size/100,size/100);c.lineWidth=2;
 if(kind==='milk'){A.round(c,-26,-38,52,68,9,'#e5f0ef','#98b9bb');A.round(c,-22,25-a*56,44,a*56,5,'#fffdf2');A.ellipse(c,0,-38,26,7,'#fcfffc','#98b9bb');c.strokeStyle='#9bbaae';c.beginPath();c.moveTo(9,-36);c.lineTo(19,-66);c.stroke();A.ellipse(c,0,33,25,5,'#8b9d8b22');}
 else if(kind==='snack'){A.ellipse(c,0,17,45,10,'#efe2cd');const r=33*Math.sqrt(a);if(a>.02){A.ellipse(c,0,-9,r,r,'#cca174','#a87552');for(let i=0;i<7;i++){const angle=i*2.4;A.ellipse(c,Math.cos(angle)*r*.65,-9+Math.sin(angle)*r*.65,2.5,2.5,'#88644c');}}}
 else{A.ellipse(c,0,25,46,13,'#c99c78');A.round(c,-44,0,88,28,10,'#c99c78');A.ellipse(c,0,0,44,15,'#f4dfbf','#b88b68');for(let i=0;i<Math.ceil(a*13);i++){const angle=i*2.4,rad=Math.sqrt(i/13)*31;A.ellipse(c,Math.cos(angle)*rad,-3+Math.sin(angle)*rad*.35,7,5,'#91664b','#7c563e');}}
 c.restore();
}
A.drawDog=drawDog;A.drawFood=drawFood;
root.GrantGraphics={ready,frame,images,originals,sheet,get loaded(){return loaded;},get error(){return error;},sequences};
})(globalThis);

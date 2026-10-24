/* 小さな自作WebGLエンジン。外部ライブラリなし。
   - Geo: 球・箱・円柱・トーラス・チューブを頂点色つきで合成
   - Node: 位置/回転/拡大の階層
   - Renderer: 半球光+太陽光のやわらかいトゥーン調、フォグ、丸影、ビルボード粒子、空のグラデーション */
(function(root){
'use strict';
/* ---------- 数学 ---------- */
const TAU=Math.PI*2;
const v3={
 add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],scale:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
 dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 len:a=>Math.hypot(a[0],a[1],a[2]),norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];},
 lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],dist:(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])
};
function m4(){const m=new Float32Array(16);m[0]=m[5]=m[10]=m[15]=1;return m;}
const _t=new Float32Array(16);
function mul(out,a,b){for(let c=0;c<4;c++){const b0=b[c*4],b1=b[c*4+1],b2=b[c*4+2],b3=b[c*4+3];for(let r=0;r<4;r++)_t[c*4+r]=a[r]*b0+a[4+r]*b1+a[8+r]*b2+a[12+r]*b3;}out.set(_t);return out;}
function trs(out,p,r,s){
 const cx=Math.cos(r[0]),sx=Math.sin(r[0]),cy=Math.cos(r[1]),sy=Math.sin(r[1]),cz=Math.cos(r[2]),sz=Math.sin(r[2]);
 out[0]=(cy*cz+sy*sx*sz)*s[0];out[1]=(cx*sz)*s[0];out[2]=(-sy*cz+cy*sx*sz)*s[0];out[3]=0;
 out[4]=(-cy*sz+sy*sx*cz)*s[1];out[5]=(cx*cz)*s[1];out[6]=(sy*sz+cy*sx*cz)*s[1];out[7]=0;
 out[8]=(sy*cx)*s[2];out[9]=(-sx)*s[2];out[10]=(cy*cx)*s[2];out[11]=0;
 out[12]=p[0];out[13]=p[1];out[14]=p[2];out[15]=1;return out;
}
function normalMat(out,m){
 const a00=m[0],a01=m[1],a02=m[2],a10=m[4],a11=m[5],a12=m[6],a20=m[8],a21=m[9],a22=m[10];
 const b01=a22*a11-a12*a21,b11=-a22*a10+a12*a20,b21=a21*a10-a11*a20;let det=a00*b01+a01*b11+a02*b21;if(!det)det=1e-6;const id=1/det;
 out[0]=b01*id;out[3]=(-a22*a01+a02*a21)*id;out[6]=(a12*a01-a02*a11)*id;
 out[1]=b11*id;out[4]=(a22*a00-a02*a20)*id;out[7]=(-a12*a00+a02*a10)*id;
 out[2]=b21*id;out[5]=(-a21*a00+a01*a20)*id;out[8]=(a11*a00-a01*a10)*id;return out;
}
function transformPoint(m,p){return[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
function perspective(out,fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);out.fill(0);out[0]=f/aspect;out[5]=f;out[10]=(far+near)*nf;out[11]=-1;out[14]=2*far*near*nf;return out;}
function hex(c){if(Array.isArray(c))return c;if(typeof c!=='string')return[1,1,1];const h=c.replace('#','');return[parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255];}
function mix(a,b,t){a=hex(a);b=hex(b);return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
const ease={out:t=>1-(1-t)*(1-t),inOut:t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,back:t=>{const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);},elastic:t=>t===0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-.75)*TAU/3)+1};
function damp(a,b,k,dt){return a+(b-a)*(1-Math.exp(-k*dt));}

/* ---------- カメラ ---------- */
class Camera{
 constructor(){this.pos=[0,3,6];this.target=[0,0,0];this.fov=45*Math.PI/180;this.near=.25;this.far=160;this.aspect=1;this.view=m4();this.proj=m4();this.vp=m4();this.f=[0,0,-1];this.r=[1,0,0];this.u=[0,1,0];}
 update(aspect){
  this.aspect=aspect||this.aspect;const f=v3.norm(v3.sub(this.target,this.pos));let r=v3.cross(f,[0,1,0]);if(v3.len(r)<1e-4)r=[1,0,0];r=v3.norm(r);const u=v3.cross(r,f);this.f=f;this.r=r;this.u=u;const e=this.pos,v=this.view;
  v[0]=r[0];v[4]=r[1];v[8]=r[2];v[12]=-v3.dot(r,e);v[1]=u[0];v[5]=u[1];v[9]=u[2];v[13]=-v3.dot(u,e);v[2]=-f[0];v[6]=-f[1];v[10]=-f[2];v[14]=v3.dot(f,e);v[3]=v[7]=v[11]=0;v[15]=1;
  perspective(this.proj,this.fov,this.aspect,this.near,this.far);mul(this.vp,this.proj,this.view);return this;
 }
 project(p){const m=this.vp,x=m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],y=m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return{x:(x/w*.5+.5),y:(.5-y/w*.5),w,visible:w>0};}
 ray(nx,ny){const t=Math.tan(this.fov/2);return{o:[...this.pos],d:v3.norm(v3.add(this.f,v3.add(v3.scale(this.r,nx*t*this.aspect),v3.scale(this.u,ny*t))))};}
}
function rayPlaneY(ray,h=0){if(Math.abs(ray.d[1])<1e-5)return null;const t=(h-ray.o[1])/ray.d[1];if(t<0)return null;return v3.add(ray.o,v3.scale(ray.d,t));}
function raySphere(ray,c,r){const oc=v3.sub(ray.o,c),b=v3.dot(oc,ray.d),q=v3.dot(oc,oc)-r*r,h=b*b-q;if(h<0)return-1;const t=-b-Math.sqrt(h);return t>0?t:-1;}

/* ---------- ジオメトリ ---------- */
class Geo{
 constructor(){this.data=[];}
 static tf(t){if(!t)return m4();if(t instanceof Float32Array)return t;return trs(m4(),t.p||[0,0,0],t.r||[0,0,0],Array.isArray(t.s)?t.s:[t.s??1,t.s??1,t.s??1]);}
 push(verts,norms,color,t,extra){
  const M=Geo.tf(t),N=normalMat(new Float32Array(9),M),fn=typeof color==='function',base=fn?null:hex(color);
  for(let i=0;i+2<verts.length;i+=3){const a=transformPoint(M,verts[i]),b=transformPoint(M,verts[i+1]),c=transformPoint(M,verts[i+2]),fnm=v3.cross(v3.sub(b,a),v3.sub(c,a)),nm=v3.add(norms[i],v3.add(norms[i+1],norms[i+2])),wn=[N[0]*nm[0]+N[3]*nm[1]+N[6]*nm[2],N[1]*nm[0]+N[4]*nm[1]+N[7]*nm[2],N[2]*nm[0]+N[5]*nm[1]+N[8]*nm[2]];if(v3.dot(fnm,wn)<0){[verts[i+1],verts[i+2]]=[verts[i+2],verts[i+1]];[norms[i+1],norms[i+2]]=[norms[i+2],norms[i+1]];if(extra)[extra[i+1],extra[i+2]]=[extra[i+2],extra[i+1]];}}
  for(let i=0;i<verts.length;i++){const p=verts[i],n=norms[i],wp=transformPoint(M,p);let wn=[N[0]*n[0]+N[3]*n[1]+N[6]*n[2],N[1]*n[0]+N[4]*n[1]+N[7]*n[2],N[2]*n[0]+N[5]*n[1]+N[8]*n[2]];wn=v3.norm(wn);const c=fn?hex(color(p,n,extra?extra[i]:null,wp)):base;this.data.push(wp[0],wp[1],wp[2],wn[0],wn[1],wn[2],c[0],c[1],c[2]);}
  return this;
 }
 sphere(color,t,seg=18,rings=12){const V=[],N=[],pt=(i,j)=>{const th=i/rings*Math.PI,ph=j/seg*TAU;return[Math.sin(th)*Math.cos(ph),Math.cos(th),Math.sin(th)*Math.sin(ph)];};
  for(let i=0;i<rings;i++)for(let j=0;j<seg;j++){const a=pt(i,j),b=pt(i+1,j),c=pt(i+1,j+1),d=pt(i,j+1);if(i>0){V.push(a,d,b);N.push(a,d,b);}if(i<rings-1){V.push(b,d,c);N.push(b,d,c);}}return this.push(V,N,color,t);}
 blob(shape,color,t,seg=26,rings=18){
  const G=[];for(let i=0;i<=rings;i++){const row=[],th=i/rings*Math.PI;for(let j=0;j<=seg;j++){const ph=j/seg*TAU,u=[Math.sin(th)*Math.cos(ph),Math.cos(th),Math.sin(th)*Math.sin(ph)];row.push({u,p:shape?shape(u):u});}G.push(row);}
  for(let i=0;i<=rings;i++)for(let j=0;j<=seg;j++){const v=G[i][j];if(i===0||i===rings){v.n=v3.norm(v.p);continue;}const jp=G[i][(j+1)%seg],jm=G[i][(j-1+seg)%seg],ip=G[i+1][j],im=G[i-1][j];let n=v3.norm(v3.cross(v3.sub(ip.p,im.p),v3.sub(jp.p,jm.p)));if(v3.dot(n,v.u)<0)n=v3.scale(n,-1);v.n=n;}
  for(let j=0;j<=seg;j++){G[0][j].n=v3.norm(v3.add(G[1][j].n,[0,.6,0]));G[rings][j].n=v3.norm(v3.add(G[rings-1][j].n,[0,-.6,0]));}
  const V=[],N=[],E=[];for(let i=0;i<rings;i++)for(let j=0;j<seg;j++){const a=G[i][j],b=G[i+1][j],c=G[i+1][j+1],d=G[i][j+1];for(const q of [a,b,c,a,c,d]){V.push(q.p);N.push(q.n);E.push(q.u);}}
  return this.push(V,N,color?(typeof color==='function'?(p,n,e,wp)=>color(e,n,p,wp):color):'#ffffff',t,E);}
 box(color,t){const V=[],N=[];for(const [ax,sg]of [[0,1],[0,-1],[1,1],[1,-1],[2,1],[2,-1]]){const j=(ax+1)%3,k=(ax+2)%3,q=[];for(const [a,b]of [[-1,-1],[1,-1],[1,1],[-1,1]]){const p=[0,0,0];p[ax]=sg*.5;p[j]=a*.5;p[k]=b*.5;q.push(p);}const n=[0,0,0];n[ax]=sg;const tri=sg>0?[q[0],q[1],q[2],q[0],q[2],q[3]]:[q[0],q[2],q[1],q[0],q[3],q[2]];V.push(...tri);for(let i=0;i<6;i++)N.push(n);}return this.push(V,N,color,t);}
 cyl(color,t,rTop=1,rBot=1,seg=16,caps=true){const V=[],N=[],slope=(rBot-rTop);for(let i=0;i<seg;i++){const a=i/seg*TAU,b=(i+1)/seg*TAU,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);const A=[ca*rBot,0,sa*rBot],B=[cb*rBot,0,sb*rBot],C=[cb*rTop,1,sb*rTop],D=[ca*rTop,1,sa*rTop],na=v3.norm([ca,slope,sa]),nb=v3.norm([cb,slope,sb]);
  V.push(A,C,B,A,D,C);N.push(na,nb,nb,na,na,nb);if(caps){if(rBot>0){V.push([0,0,0],A,B);N.push([0,-1,0],[0,-1,0],[0,-1,0]);}if(rTop>0){V.push([0,1,0],C,D);N.push([0,1,0],[0,1,0],[0,1,0]);}}}return this.push(V,N,color,t);}
 cone(color,t,seg=16){return this.cyl(color,t,0,1,seg,true);}
 torus(color,t,R=1,r=.3,seg=24,side=10,arc=TAU){const V=[],N=[],pt=(i,j)=>{const u=i/seg*arc,w=j/side*TAU,cx=Math.cos(u),sx=Math.sin(u);return{p:[(R+r*Math.cos(w))*cx,r*Math.sin(w),(R+r*Math.cos(w))*sx],n:[Math.cos(w)*cx,Math.sin(w),Math.cos(w)*sx]};};
  for(let i=0;i<seg;i++)for(let j=0;j<side;j++){const a=pt(i,j),b=pt(i+1,j),c=pt(i+1,j+1),d=pt(i,j+1);V.push(a.p,c.p,b.p,a.p,d.p,c.p);N.push(a.n,c.n,b.n,a.n,d.n,c.n);}return this.push(V,N,color,t);}
 tube(color,t,path,radius,side=10){ // path: [[x,y,z]...], radius: fn(u)->r
  const V=[],N=[],E=[],rings=[];let b1=null;for(let i=0;i<path.length;i++){const prev=path[Math.max(0,i-1)],next=path[Math.min(path.length-1,i+1)],tg=v3.norm(v3.sub(next,prev));if(!b1){const ref=Math.abs(tg[1])>.9?[1,0,0]:[0,1,0];b1=v3.norm(v3.cross(tg,ref));}else{b1=v3.norm(v3.sub(b1,v3.scale(tg,v3.dot(b1,tg))));}const b2=v3.cross(tg,b1),u=i/(path.length-1),r=radius(u),ring=[];for(let j=0;j<=side;j++){const w=j/side*TAU,n=v3.add(v3.scale(b1,Math.cos(w)),v3.scale(b2,Math.sin(w)));ring.push({p:v3.add(path[i],v3.scale(n,r)),n,e:[u,j/side]});}rings.push(ring);}
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<side;j++){const a=rings[i][j],b=rings[i+1][j],c=rings[i+1][j+1],d=rings[i][j+1];for(const q of [a,b,c,a,c,d]){V.push(q.p);N.push(q.n);E.push(q.e);}}
  const end=rings[rings.length-1],tip=path[path.length-1],tg=v3.norm(v3.sub(tip,path[path.length-2]));for(let j=0;j<side;j++){V.push(tip,end[j+1].p,end[j].p);N.push(tg,tg,tg);E.push([1,0],[1,0],[1,0]);}
  return this.push(V,N,color,t,E);}
 disk(color,t,seg=24){const V=[],N=[];for(let i=0;i<seg;i++){const a=i/seg*TAU,b=(i+1)/seg*TAU;V.push([0,0,0],[Math.cos(b),0,Math.sin(b)],[Math.cos(a),0,Math.sin(a)]);N.push([0,1,0],[0,1,0],[0,1,0]);}return this.push(V,N,color,t);}
 plane(color,t,nx=1,nz=1){const V=[],N=[],up=[0,1,0];for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const x0=i/nx-.5,x1=(i+1)/nx-.5,z0=j/nz-.5,z1=(j+1)/nz-.5;V.push([x0,0,z0],[x0,0,z1],[x1,0,z1],[x0,0,z0],[x1,0,z1],[x1,0,z0]);for(let k=0;k<6;k++)N.push(up);}return this.push(V,N,color,t);}
 merge(g){for(const v of g.data)this.data.push(v);return this;}
 mesh(){return new Mesh(new Float32Array(this.data));}
}
class Mesh{constructor(data){this.data=data;this.count=data.length/9;this.buf=null;this.gen=-1;this.radius=0;let r=0;for(let i=0;i<data.length;i+=9)r=Math.max(r,Math.hypot(data[i],data[i+1],data[i+2]));this.radius=r;}
 dispose(r){if(r&&this.buf&&this.gen===r.gen&&!r.gl.isContextLost())r.gl.deleteBuffer(this.buf);this.buf=null;this.gen=-1;}}

/* ---------- シーングラフ ---------- */
class Node{
 constructor(mesh=null,o={}){this.mesh=mesh;this.pos=o.pos||[0,0,0];this.rot=o.rot||[0,0,0];this.scl=o.scl||[1,1,1];this.children=[];this.visible=true;this.tint=o.tint||null;this.alpha=o.alpha??1;this.emissive=o.emissive||0;this.local=m4();this.world=m4();this.parent=null;this.name=o.name||'';this.outline=o.outline||null;}
 add(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}return nodes[0];}
 remove(n){const i=this.children.indexOf(n);if(i>=0)this.children.splice(i,1);n.parent=null;}
 clear(){this.children.length=0;}
 updateWorld(parent){trs(this.local,this.pos,this.rot,this.scl);if(parent)mul(this.world,parent,this.local);else this.world.set(this.local);for(const c of this.children)c.updateWorld(this.world);}
 worldPos(local=[0,0,0]){return transformPoint(this.world,local);}
 setScale(s){this.scl[0]=this.scl[1]=this.scl[2]=s;return this;}
}

/* ---------- シェーダ ---------- */
const VS_SOLID=`attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;uniform mat4 uVP;uniform mat4 uM;uniform mat3 uNM;varying vec3 vN;varying vec3 vC;varying vec3 vW;
void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=uNM*aN;vC=aC;gl_Position=uVP*w;}`;
const FS_SOLID=`precision mediump float;varying vec3 vN;varying vec3 vC;varying vec3 vW;uniform vec3 uSun;uniform vec3 uSunC;uniform vec3 uSkyC;uniform vec3 uGndC;uniform vec3 uFog;uniform vec2 uFogR;uniform vec3 uEye;uniform vec4 uTint;uniform float uEmi;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float d=dot(n,uSun);float l=smoothstep(-.08,.32,d)*.72+max(d,0.)*.28;vec3 hemi=mix(uGndC,uSkyC,n.y*.5+.5);vec3 base=vC*uTint.rgb;vec3 v=normalize(uEye-vW);float rim=pow(1.-clamp(dot(n,v),0.,1.),3.);vec3 col=base*(hemi+uSunC*l)+rim*.16*uSkyC;col=mix(col,base*1.05,uEmi);float f=clamp((distance(uEye,vW)-uFogR.x)/(uFogR.y-uFogR.x),0.,1.);gl_FragColor=vec4(mix(col,uFog,f),uTint.a);}`;
const VS_OUT=`attribute vec3 aP;attribute vec3 aN;uniform mat4 uVP;uniform mat4 uM;uniform float uW;void main(){gl_Position=uVP*(uM*vec4(aP+normalize(aN)*uW,1.));}`;
const FS_OUT=`precision mediump float;uniform vec3 uCol;uniform vec3 uFog;uniform vec2 uFogR;void main(){gl_FragColor=vec4(uCol,1.);}`;
const VS_BB=`attribute vec2 aQ;uniform mat4 uVP;uniform vec3 uPos;uniform vec3 uR;uniform vec3 uU;uniform vec4 uRect;uniform float uFlip;varying vec2 vUV;void main(){vec3 p=uPos+uR*(aQ.x-.5)+uU*aQ.y;float u=mix(aQ.x,1.-aQ.x,uFlip);vUV=uRect.xy+vec2(u,1.-aQ.y)*uRect.zw;gl_Position=uVP*vec4(p,1.);}`;
const FS_BB=`precision mediump float;uniform sampler2D uTex;uniform vec4 uTint;varying vec2 vUV;void main(){vec4 c=texture2D(uTex,vUV);float a=c.a*uTint.a;if(a<.03)discard;gl_FragColor=vec4(c.rgb*uTint.rgb*uTint.a,a);}`;
const VS_SHADOW=`attribute vec2 aQ;uniform mat4 uVP;uniform vec4 uC;varying vec2 vQ;void main(){vQ=aQ;gl_Position=uVP*vec4(uC.x+aQ.x*uC.w,uC.y,uC.z+aQ.y*uC.w,1.);}`;
const FS_SHADOW=`precision mediump float;varying vec2 vQ;uniform float uA;void main(){float d=length(vQ);float a=(1.-smoothstep(.15,1.,d))*uA;gl_FragColor=vec4(.18,.2,.16,a);}`;
const VS_SPRITE=`attribute vec3 aP;attribute vec2 aUV;attribute vec4 aCol;uniform mat4 uVP;varying vec2 vUV;varying vec4 vCol;void main(){vUV=aUV;vCol=aCol;gl_Position=uVP*vec4(aP,1.);}`;
const FS_SPRITE=`precision mediump float;uniform sampler2D uTex;varying vec2 vUV;varying vec4 vCol;void main(){vec4 t=texture2D(uTex,vUV);float a=t.a*vCol.a;if(a<.01)discard;gl_FragColor=vec4(t.rgb*vCol.rgb*vCol.a,a);}`;
const VS_SKY=`attribute vec2 aQ;varying float vY;void main(){vY=aQ.y*.5+.5;gl_Position=vec4(aQ,.9999,1.);}`;
const FS_SKY=`precision mediump float;varying float vY;uniform vec3 uTop;uniform vec3 uBot;void main(){gl_FragColor=vec4(mix(uBot,uTop,smoothstep(0.,1.,vY)),1.);}`;

/* ---------- 粒子用アトラス ---------- */
const ATLAS=['heart','star','sparkle','bubble','note','zzz','drop','dot','coin','square','anger','bone','leaf','flower','puff','ring','meat','cookie','apple','bee','gem','shoe','bear','gift','fish','onigiri','goldstar','question','exclaim','milk','rice','paw'];
const EMOJI={heart:'❤️',star:'⭐',sparkle:'✨',note:'🎵',zzz:'💤',drop:'💧',anger:'💢',bone:'🦴',leaf:'🍃',flower:'🌸',meat:'🍖',cookie:'🍪',apple:'🍎',bee:'🐝',gem:'💎',shoe:'👟',bear:'🧸',gift:'🎁',fish:'🐟',onigiri:'🍙',goldstar:'🌟',question:'❓',exclaim:'❗',milk:'🥛',rice:'🍚',paw:'🐾'};
function buildAtlas(){
 const cell=128,cv=document.createElement('canvas');cv.width=cell*8;cv.height=cell*4;const c=cv.getContext('2d');c.textAlign='center';c.textBaseline='middle';
 ATLAS.forEach((name,i)=>{const x=(i%8)*cell+cell/2,y=Math.floor(i/8)*cell+cell/2;c.save();
  if(EMOJI[name]){c.font='96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';c.fillText(EMOJI[name],x,y+6);}
  else if(name==='bubble'){const g=c.createRadialGradient(x-18,y-18,4,x,y,56);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.25,'rgba(220,245,255,.35)');g.addColorStop(.8,'rgba(180,220,255,.25)');g.addColorStop(1,'rgba(160,140,255,.75)');c.fillStyle=g;c.beginPath();c.arc(x,y,56,0,TAU);c.fill();c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=3;c.stroke();}
  else if(name==='dot'){const g=c.createRadialGradient(x,y,0,x,y,60);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.5,'rgba(255,255,255,.8)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.beginPath();c.arc(x,y,60,0,TAU);c.fill();}
  else if(name==='coin'){c.fillStyle='#f0b93a';c.beginPath();c.arc(x,y,52,0,TAU);c.fill();c.fillStyle='#ffd966';c.beginPath();c.arc(x,y,42,0,TAU);c.fill();c.fillStyle='#d99a1e';c.font='bold 58px sans-serif';c.fillText('★',x,y+4);}
  else if(name==='square'){c.fillStyle='#fff';c.fillRect(x-40,y-26,80,52);}
  else if(name==='puff'){c.fillStyle='rgba(255,255,255,.95)';for(const [dx,dy,r]of [[-24,8,30],[0,-10,38],[26,6,30],[0,14,30]]){c.beginPath();c.arc(x+dx,y+dy,r,0,TAU);c.fill();}}
  else if(name==='ring'){c.strokeStyle='#fff';c.lineWidth=10;c.beginPath();c.arc(x,y,52,0,TAU);c.stroke();}
  c.restore();});
 return cv;
}

/* 絵文字1文字のキャンバス（3Dの中に拾いものなどを置くとき） */
const emojiCv=new Map();
function emojiCanvas(ch){let cv=emojiCv.get(ch);if(cv)return cv;cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');c.textAlign='center';c.textBaseline='middle';c.font='100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';c.fillText(ch,64,70);emojiCv.set(ch,cv);return cv;}

/* ---------- レンダラ ---------- */
class Renderer{
 constructor(canvas){
  this.canvas=canvas;this.gen=0;this.lost=false;this.dprCap=2;this.onLost=null;this.onRestored=null;this.stats={draws:0,tris:0};
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.onLost?.();});
  canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.init();this.onRestored?.();});
  this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'})||canvas.getContext('experimental-webgl');
  if(!this.gl)throw Error('WebGL unavailable');this.init();
 }
 init(){
  const gl=this.gl;this.gen++;
  const prog=(vs,fs,attrs,unis)=>{const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));const o={p,a:{},u:{}};for(const a of attrs)o.a[a]=gl.getAttribLocation(p,a);for(const u of unis)o.u[u]=gl.getUniformLocation(p,u);return o;};
  this.solid=prog(VS_SOLID,FS_SOLID,['aP','aN','aC'],['uVP','uM','uNM','uSun','uSunC','uSkyC','uGndC','uFog','uFogR','uEye','uTint','uEmi']);
  this.outP=prog(VS_OUT,FS_OUT,['aP','aN'],['uVP','uM','uW','uCol']);
  this.bbP=prog(VS_BB,FS_BB,['aQ'],['uVP','uPos','uR','uU','uRect','uFlip','uTex','uTint']);
  this.quad01=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad01);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,1,1,0,0,1,1,0,1]),gl.STATIC_DRAW);this.texCache=new Map();
  this.shadowP=prog(VS_SHADOW,FS_SHADOW,['aQ'],['uVP','uC','uA']);
  this.spriteP=prog(VS_SPRITE,FS_SPRITE,['aP','aUV','aCol'],['uVP','uTex']);
  this.skyP=prog(VS_SKY,FS_SKY,['aQ'],['uTop','uBot']);
  this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]),gl.STATIC_DRAW);
  this.spriteBuf=gl.createBuffer();this.spriteData=new Float32Array(9*6*600);
  this.atlasCanvas=this.atlasCanvas||buildAtlas();this.atlas=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.atlas);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.atlasCanvas);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.frontFace(gl.CCW);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  this.nm=new Float32Array(9);this.mvTmp=m4();
 }
 resize(){const c=this.canvas,dpr=Math.min(root.devicePixelRatio||1,this.dprCap),w=Math.max(1,Math.round(c.clientWidth*dpr)),h=Math.max(1,Math.round(c.clientHeight*dpr));if(c.width!==w||c.height!==h){c.width=w;c.height=h;}return c.width/c.height;}
 upload(mesh){const gl=this.gl;if(mesh.gen===this.gen&&mesh.buf)return;mesh.buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buf);gl.bufferData(gl.ARRAY_BUFFER,mesh.data,gl.STATIC_DRAW);mesh.gen=this.gen;}
 begin(cam,env,size){
  const gl=this.gl;if(this.lost||gl.isContextLost())return false;
  const w=size?size.w:this.canvas.width,h=size?size.h:this.canvas.height;gl.viewport(0,0,w,h);cam.update(w/h);this.cam=cam;this.env=env;this.trans=[];this.shadows=[];this.sprites=[];this.outlines=[];this.boards=[];this.stats.draws=0;this.stats.tris=0;
  gl.clearColor(0,0,0,size?0:1);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  if(!env.noSky){const s=this.skyP;gl.useProgram(s.p);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.enableVertexAttribArray(s.a.aQ);gl.vertexAttribPointer(s.a.aQ,2,gl.FLOAT,false,0,0);gl.uniform3fv(s.u.uTop,hex(env.skyTop||env.fog));gl.uniform3fv(s.u.uBot,hex(env.skyBottom||env.fog));gl.drawArrays(gl.TRIANGLES,0,6);gl.disableVertexAttribArray(s.a.aQ);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);}
  const p=this.solid;gl.useProgram(p.p);gl.uniformMatrix4fv(p.u.uVP,false,cam.vp);gl.uniform3fv(p.u.uSun,v3.norm(env.sunDir||[-.4,1,.5]));gl.uniform3fv(p.u.uSunC,hex(env.sun||[.55,.52,.46]));gl.uniform3fv(p.u.uSkyC,hex(env.sky||[.62,.66,.7]));gl.uniform3fv(p.u.uGndC,hex(env.ground||[.42,.4,.36]));gl.uniform3fv(p.u.uFog,hex(env.fog||'#ffffff'));gl.uniform2f(p.u.uFogR,env.fogNear??40,env.fogFar??120);gl.uniform3fv(p.u.uEye,cam.pos);
  gl.enableVertexAttribArray(p.a.aP);gl.enableVertexAttribArray(p.a.aN);gl.enableVertexAttribArray(p.a.aC);return true;
 }
 drawMesh(mesh,world,tint,alpha=1,emissive=0){
  if(alpha<1){const c=transformPoint(world,[0,0,0]);this.trans.push({mesh,world:new Float32Array(world),tint,alpha,emissive,d:v3.dist(c,this.cam.pos)});return;}
  this._draw(mesh,world,tint,alpha,emissive);
 }
 _draw(mesh,world,tint,alpha,emissive){
  const gl=this.gl,p=this.solid;this.upload(mesh);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buf);gl.vertexAttribPointer(p.a.aP,3,gl.FLOAT,false,36,0);gl.vertexAttribPointer(p.a.aN,3,gl.FLOAT,false,36,12);gl.vertexAttribPointer(p.a.aC,3,gl.FLOAT,false,36,24);
  gl.uniformMatrix4fv(p.u.uM,false,world);gl.uniformMatrix3fv(p.u.uNM,false,normalMat(this.nm,world));const t=tint||[1,1,1];gl.uniform4f(p.u.uTint,t[0],t[1],t[2],alpha);gl.uniform1f(p.u.uEmi,emissive);gl.drawArrays(gl.TRIANGLES,0,mesh.count);this.stats.draws++;this.stats.tris+=mesh.count/3;
 }
 draw(node,parentWorld){if(!node.visible)return;if(!parentWorld)node.updateWorld(null);this._walk(node);}
 _walk(node){if(!node.visible)return;if(node.mesh){this.drawMesh(node.mesh,node.world,node.tint,node.alpha,node.emissive);if(node.outline&&node.alpha>=1)this.outlines.push(node);}for(const c of node.children)this._walk(c);}
 /* 画像テクスチャ（Grant画像やアクセサリ）。コンテキスト復帰時は自動で再転送 */
 texture(key,source){let t=this.texCache.get(key);if(t&&t.gen===this.gen)return t;if(!source)return null;const gl=this.gl,max=gl.getParameter(gl.MAX_TEXTURE_SIZE),w=source.width||source.naturalWidth,h=source.height||source.naturalHeight;if(!w||!h||w>max||h>max)return null;const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);t={tex,w,h,gen:this.gen};this.texCache.set(key,t);return t;}
 /* 立った板（ビルボード）。pos=足元の中心、R/U=幅と高さのベクトル、rect=画像内の切り出し(px) */
 billboard(tex,rect,pos,R,U,flip=false,tint=null,alpha=1,bias=0,sortPos=null){if(!tex)return;this.boards.push({tex,rect,pos,R,U,flip,tint:tint||[1,1,1],alpha,d:v3.dist(sortPos||pos,this.cam.pos)-bias,seq:this.boards.length});}
 /* カメラを向く絵（キャンバスから作る）。pos=絵の中心、h=高さ */
 icon(key,cv,pos,h,alpha=1,bias=0,flip=false){const t=this.texture('icon:'+key,cv);if(!t)return;const v=this.cam.view,R=[v[0],v[4],v[8]],U=[v[1],v[5],v[9]],w=h*t.w/t.h;this.billboard(t,null,[pos[0]-U[0]*h/2,pos[1]-U[1]*h/2,pos[2]-U[2]*h/2],v3.scale(R,w),v3.scale(U,h),flip,null,alpha,bias,pos);}
 shadow(x,y,z,r,a=.32){this.shadows.push([x,y+.012,z,r,a]);}
 sprite(name,pos,size,col,rot=0){const i=ATLAS.indexOf(name);if(i<0)return;this.sprites.push({i,pos,size,col:col||[1,1,1,1],rot});}
 end(){
  const gl=this.gl,cam=this.cam;
  if(this.outlines.length){const sp=this.solid,o=this.outP;gl.disableVertexAttribArray(sp.a.aC);gl.useProgram(o.p);gl.uniformMatrix4fv(o.u.uVP,false,cam.vp);gl.cullFace(gl.FRONT);gl.enableVertexAttribArray(o.a.aP);gl.enableVertexAttribArray(o.a.aN);
   for(const n of this.outlines){this.upload(n.mesh);gl.bindBuffer(gl.ARRAY_BUFFER,n.mesh.buf);gl.vertexAttribPointer(o.a.aP,3,gl.FLOAT,false,36,0);gl.vertexAttribPointer(o.a.aN,3,gl.FLOAT,false,36,12);gl.uniformMatrix4fv(o.u.uM,false,n.world);gl.uniform1f(o.u.uW,n.outline.w);gl.uniform3fv(o.u.uCol,n.outline.c);gl.drawArrays(gl.TRIANGLES,0,n.mesh.count);this.stats.draws++;}
   gl.cullFace(gl.BACK);gl.useProgram(sp.p);gl.enableVertexAttribArray(sp.a.aC);}
  if(this.shadows.length){const s=this.shadowP;const sp=this.solid;gl.disableVertexAttribArray(sp.a.aP);gl.disableVertexAttribArray(sp.a.aN);gl.disableVertexAttribArray(sp.a.aC);gl.useProgram(s.p);gl.uniformMatrix4fv(s.u.uVP,false,cam.vp);gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.enableVertexAttribArray(s.a.aQ);gl.vertexAttribPointer(s.a.aQ,2,gl.FLOAT,false,0,0);gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1,-2);for(const [x,y,z,r,a]of this.shadows){gl.uniform4f(s.u.uC,x,y,z,r);gl.uniform1f(s.u.uA,a);gl.drawArrays(gl.TRIANGLES,0,6);}gl.disable(gl.POLYGON_OFFSET_FILL);gl.enable(gl.CULL_FACE);gl.disableVertexAttribArray(s.a.aQ);gl.depthMask(true);
   gl.useProgram(this.solid.p);gl.enableVertexAttribArray(sp.a.aP);gl.enableVertexAttribArray(sp.a.aN);gl.enableVertexAttribArray(sp.a.aC);}
  if(this.boards.length){const sp=this.solid,b=this.bbP;gl.disableVertexAttribArray(sp.a.aP);gl.disableVertexAttribArray(sp.a.aN);gl.disableVertexAttribArray(sp.a.aC);gl.useProgram(b.p);gl.uniformMatrix4fv(b.u.uVP,false,cam.vp);gl.bindBuffer(gl.ARRAY_BUFFER,this.quad01);gl.enableVertexAttribArray(b.a.aQ);gl.vertexAttribPointer(b.a.aQ,2,gl.FLOAT,false,0,0);gl.disable(gl.CULL_FACE);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.activeTexture(gl.TEXTURE0);gl.uniform1i(b.u.uTex,0);
   gl.depthMask(false);this.boards.sort((a,c)=>(c.d-a.d)||(a.seq-c.seq));for(const o of this.boards){gl.bindTexture(gl.TEXTURE_2D,o.tex.tex);gl.uniform3fv(b.u.uPos,o.pos);gl.uniform3fv(b.u.uR,o.R);gl.uniform3fv(b.u.uU,o.U);const r=o.rect||[0,0,o.tex.w,o.tex.h];gl.uniform4f(b.u.uRect,(r[0]+.5)/o.tex.w,(r[1]+.5)/o.tex.h,(r[2]-1)/o.tex.w,(r[3]-1)/o.tex.h);gl.uniform1f(b.u.uFlip,o.flip?1:0);gl.uniform4f(b.u.uTint,o.tint[0],o.tint[1],o.tint[2],o.alpha);gl.drawArrays(gl.TRIANGLES,0,6);this.stats.draws++;}
   gl.depthMask(true);gl.disableVertexAttribArray(b.a.aQ);gl.enable(gl.CULL_FACE);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(sp.p);gl.enableVertexAttribArray(sp.a.aP);gl.enableVertexAttribArray(sp.a.aN);gl.enableVertexAttribArray(sp.a.aC);}
  if(this.trans.length){this.trans.sort((a,b)=>b.d-a.d);gl.depthMask(false);for(const t of this.trans)this._draw(t.mesh,t.world,t.tint,t.alpha,t.emissive);gl.depthMask(true);}
  const sp=this.solid;gl.disableVertexAttribArray(sp.a.aP);gl.disableVertexAttribArray(sp.a.aN);gl.disableVertexAttribArray(sp.a.aC);
  if(this.sprites.length)this._sprites();
 }
 _sprites(){
  const gl=this.gl,cam=this.cam,v=cam.view,R=[v[0],v[4],v[8]],U=[v[1],v[5],v[9]],d=this.spriteData;let k=0;
  const list=this.sprites.slice(0,600).map(s=>({s,dd:v3.dist(s.pos,cam.pos)})).sort((a,b)=>b.dd-a.dd);
  for(const {s}of list){const u0=(s.i%8)/8,v0=Math.floor(s.i/8)/4,u1=u0+1/8,v1=v0+1/4,h=s.size/2,c=Math.cos(s.rot),sn=Math.sin(s.rot);
   const corner=(x,y)=>{const rx=x*c-y*sn,ry=x*sn+y*c;return[s.pos[0]+(R[0]*rx+U[0]*ry)*h,s.pos[1]+(R[1]*rx+U[1]*ry)*h,s.pos[2]+(R[2]*rx+U[2]*ry)*h];};
   const q=[[corner(-1,-1),u0,v1],[corner(1,-1),u1,v1],[corner(1,1),u1,v0],[corner(-1,-1),u0,v1],[corner(1,1),u1,v0],[corner(-1,1),u0,v0]];
   for(const [p,uu,vv]of q){d[k++]=p[0];d[k++]=p[1];d[k++]=p[2];d[k++]=uu;d[k++]=vv;d[k++]=s.col[0];d[k++]=s.col[1];d[k++]=s.col[2];d[k++]=s.col[3];}}
  const p=this.spriteP;gl.useProgram(p.p);gl.uniformMatrix4fv(p.u.uVP,false,cam.vp);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.atlas);gl.uniform1i(p.u.uTex,0);gl.bindBuffer(gl.ARRAY_BUFFER,this.spriteBuf);gl.bufferData(gl.ARRAY_BUFFER,d.subarray(0,k),gl.DYNAMIC_DRAW);
  for(const [a,n,o]of [['aP',3,0],['aUV',2,12],['aCol',4,20]]){gl.enableVertexAttribArray(p.a[a]);gl.vertexAttribPointer(p.a[a],n,gl.FLOAT,false,36,o);}gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.TRIANGLES,0,k/9);gl.enable(gl.CULL_FACE);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);for(const a of ['aP','aUV','aCol'])gl.disableVertexAttribArray(p.a[a]);this.stats.draws++;
 }
 /* 透過背景で描いて2Dキャンバスにする（写真合成・アイコン用） */
 snapshot(w,h,drawFn){
  const gl=this.gl;if(this.lost||gl.isContextLost())return null;const fb=gl.createFramebuffer(),tex=gl.createTexture(),rb=gl.createRenderbuffer();
  gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,rb);
  let out=null;try{if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE){drawFn({w,h});const px=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d'),img=c.createImageData(w,h);for(let y=0;y<h;y++)img.data.set(px.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);c.putImageData(img,0,0);}}
  finally{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteFramebuffer(fb);gl.deleteTexture(tex);gl.deleteRenderbuffer(rb);}
  return out;
 }
}

/* ---------- 粒子 ---------- */
class Particles{
 constructor(){this.list=[];}
 emit(img,pos,o={}){const n=o.count||1;for(let i=0;i<n;i++){const sp=o.spread??.3,vs=o.velSpread??.6,v=o.vel||[0,1,0];this.list.push({img,pos:[pos[0]+(Math.random()-.5)*sp,pos[1]+(Math.random()-.5)*sp*.5,pos[2]+(Math.random()-.5)*sp],vel:[v[0]+(Math.random()-.5)*vs,v[1]+(Math.random()-.5)*vs*.5,v[2]+(Math.random()-.5)*vs],life:o.life||1,age:0,size:o.size||.3,grow:o.grow??0,g:o.gravity??0,col:o.color?[...hex(o.color),1]:[1,1,1,1],rot:(Math.random()-.5)*(o.rot??.6),spin:(Math.random()-.5)*(o.spin??0),fade:o.fade??.35,drag:o.drag??0,follow:o.follow||null});}}
 update(dt){for(const p of this.list){p.age+=dt;p.vel[1]-=p.g*dt;if(p.drag){const k=Math.exp(-p.drag*dt);p.vel=p.vel.map(x=>x*k);}p.pos[0]+=p.vel[0]*dt;p.pos[1]+=p.vel[1]*dt;p.pos[2]+=p.vel[2]*dt;p.rot+=p.spin*dt;}this.list=this.list.filter(p=>p.age<p.life);}
 render(r){for(const p of this.list){const k=p.age/p.life,a=k>1-p.fade?(1-k)/p.fade:Math.min(1,p.age*12);let pos=p.pos;if(p.follow){const w=p.follow.node.worldPos(p.follow.local);pos=[w[0]+p.pos[0],w[1]+p.pos[1],w[2]+p.pos[2]];}r.sprite(p.img,pos,p.size*(1+p.grow*k),[p.col[0],p.col[1],p.col[2],a*p.col[3]],p.rot);}}
 clear(){this.list.length=0;}
}

/* ---------- 共通の小物ジオメトリ ---------- */
const Props={
 tree(g,x,z,s=1,leaf='#7fb069',leaf2='#9cc77f'){g.cyl('#9b7653',{p:[x,0,z],s:[.13*s,1*s,.13*s]},.8,1,8,false);g.sphere(leaf,{p:[x,1.25*s,z],s:[.75*s,.7*s,.75*s]},10,7);g.sphere(leaf2,{p:[x+.25*s,1.6*s,z+.1*s],s:[.5*s,.45*s,.5*s]},10,7);g.sphere(leaf,{p:[x-.3*s,1.5*s,z-.15*s],s:[.45*s,.42*s,.45*s]},10,7);return g;},
 pine(g,x,z,s=1){g.cyl('#8a6a4a',{p:[x,0,z],s:[.11*s,.5*s,.11*s]},1,1,6,false);g.cone('#4f8a5b',{p:[x,.4*s,z],s:[.7*s,1.1*s,.7*s]},9);g.cone('#5f9d69',{p:[x,1*s,z],s:[.52*s,.9*s,.52*s]},9);g.cone('#6fae77',{p:[x,1.55*s,z],s:[.34*s,.7*s,.34*s]},9);return g;},
 bush(g,x,z,s=1,c='#86b46f'){g.sphere(c,{p:[x,.3*s,z],s:[.55*s,.42*s,.5*s]},10,7);g.sphere(mix(c,'#ffffff',.12),{p:[x+.3*s,.25*s,z+.1*s],s:[.35*s,.3*s,.35*s]},8,6);return g;},
 flower(g,x,z,c='#f4a6c1'){g.cyl('#6f9e5a',{p:[x,0,z],s:[.015,.22,.015]},1,1,4,false);for(let i=0;i<5;i++){const a=i/5*TAU;g.sphere(c,{p:[x+Math.cos(a)*.05,.24,z+Math.sin(a)*.05],s:.045},6,4);}g.sphere('#f7d35c',{p:[x,.245,z],s:.035},6,4);return g;},
 rock(g,x,z,s=1,c='#9aa39c'){g.sphere(c,{p:[x,.18*s,z],s:[.45*s,.32*s,.38*s],r:[0,x*3,0]},9,6);g.sphere(mix(c,'#ffffff',.1),{p:[x+.2*s,.12*s,z+.15*s],s:[.25*s,.18*s,.22*s]},7,5);return g;},
 house(g,x,z,s=1,wall='#f1e3c8',roof='#c96b4f',rotY=0){g.box(wall,{p:[x,.75*s,z],s:[1.5*s,1.5*s,1.3*s],r:[0,rotY,0]});g.cyl(roof,{p:[x,1.5*s,z],s:[1.15*s,.8*s,1.15*s],r:[0,Math.PI/4+rotY,0]},0,1,4,true);g.box('#8a5a3c',{p:[x+Math.sin(rotY)*.66*s,.38*s,z+Math.cos(rotY)*.66*s],s:[.36*s,.76*s,.03],r:[0,rotY,0]});g.box('#bfe0ef',{p:[x+Math.sin(rotY+.0)*.66*s+Math.cos(rotY)*.42*s,.95*s,z+Math.cos(rotY)*.66*s-Math.sin(rotY)*.42*s],s:[.3*s,.3*s,.03],r:[0,rotY,0]});return g;},
 fence(g,x0,z0,x1,z1,c='#d9c29a'){const len=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.round(len/.7)),ang=Math.atan2(x1-x0,z1-z0);for(let i=0;i<=n;i++){const t=i/n;g.box(c,{p:[x0+(x1-x0)*t,.32,z0+(z1-z0)*t],s:[.1,.64,.1]});}g.box(c,{p:[(x0+x1)/2,.45,(z0+z1)/2],s:[.05,.08,len],r:[0,ang,0]});g.box(c,{p:[(x0+x1)/2,.22,(z0+z1)/2],s:[.05,.08,len],r:[0,ang,0]});return g;},
 cloud(g,x,y,z,s=1){for(const [dx,dy,r]of [[0,0,1],[.9,-.15,.75],[-.9,-.2,.7],[.4,.35,.7]])g.sphere('#ffffff',{p:[x+dx*s,y+dy*s,z],s:[r*s,r*.75*s,r*.7*s]},10,7);return g;},
 ground(g,w,d,c1,c2,y=0,nx=24,nz=24){return g.plane((p,n,e,wp)=>{const k=(Math.sin(wp[0]*1.7+wp[2]*.9)*.5+.5)*(Math.sin(wp[2]*2.3-wp[0]*.4)*.5+.5);return mix(c1,c2,k*.8);},{p:[0,y,0],s:[w,1,d]},nx,nz);}
};

root.Gfx={TAU,v3,m4,mul,trs,transformPoint,hex,mix,ease,damp,Camera,Geo,Mesh,Node,Renderer,Particles,Props,rayPlaneY,raySphere,ATLAS,emojiCanvas};
})(globalThis);

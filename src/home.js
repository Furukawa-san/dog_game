/* Touch-first home motion and transaction-like feeding. No timers or saved-state schema changes. */
(function(root){
'use strict';
const A=ShibaArt,C=ShibaCore;
class HomeCompanion{
 constructor(canvas,options){this.canvas=canvas;this.options=options;this.active=false;this.x=.5;this.y=.68;this.target={x:.5,y:.68};this.look=[0,0];this.pointer=null;this.drag=null;this.feeding=null;this.selected=null;this.token=0;this.lastBite=-1;this.abort=new AbortController();const opts={signal:this.abort.signal};this.scene=canvas.parentElement;this.ghost=document.getElementById('food-ghost');this.status=document.getElementById('feeding-status');
 this.scene.addEventListener('pointerdown',e=>this.down(e),opts);this.scene.addEventListener('pointermove',e=>this.move(e),opts);this.scene.addEventListener('pointerup',e=>this.up(e),opts);for(const name of ['pointercancel','lostpointercapture'])this.scene.addEventListener(name,e=>{if(e.pointerId===this.pointer)this.release();},opts);
 for(const b of document.querySelectorAll('[data-food]')){const cv=b.querySelector('canvas');A.drawFood(cv.getContext('2d'),44,46,65,b.dataset.food,1);b.addEventListener('pointerdown',e=>this.foodDown(e,b.dataset.food),opts);b.addEventListener('click',e=>{if(e.detail===0&&!this.feeding){this.selected=b.dataset.food;this.message('選んだ食べものを、柴犬までドラッグ。タップでも渡せるよ。');}},opts);}
 window.addEventListener('pointermove',e=>this.foodMove(e),opts);window.addEventListener('pointerup',e=>this.foodUp(e),opts);window.addEventListener('lostpointercapture',e=>{if(this.drag?.id===e.pointerId)this.cancel('ドラッグをやめました。もういちど選んでね。');},opts);
 window.addEventListener('pointercancel',e=>{if(this.drag?.id===e.pointerId)this.cancel('ドラッグをやめました。もういちど選んでね。');},opts);
 document.getElementById('food-cancel').addEventListener('click',()=>this.cancel('食べものを片づけたよ。またあとでね。'),opts);
 }
 message(s){this.status.textContent=s;this.options.onMessage(s);}
 point(e){const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
 enabled(){return this.active&&!document.hidden&&!document.querySelector('dialog[open]');}
 down(e){if(!this.enabled()||this.feeding||this.drag||e.target.closest('#pet-button')||this.pointer!==null)return;e.preventDefault();this.pointer=e.pointerId;try{this.scene.setPointerCapture(e.pointerId);}catch{}this.follow(this.point(e));}
 move(e){if(this.pointer!==e.pointerId||!this.enabled())return;e.preventDefault();this.follow(this.point(e));}
 up(e){if(this.pointer===e.pointerId)this.release();}
 release(){const id=this.pointer;this.pointer=null;if(id!==null)try{if(this.scene.hasPointerCapture(id))this.scene.releasePointerCapture(id);}catch{}}
 follow(p){this.look=[(p.x-this.x)*900,(p.y-this.y)*this.canvas.height];this.target={x:C.clamp(p.x,.19,.81),y:C.clamp(p.y,.6,.75)};}
 pet(){if(!this.enabled()||this.feeding)return;if(this.selected){const food=this.selected;this.selected=null;this.offer(food,{x:this.x,y:this.y});}else this.options.onPet();}
 foodDown(e,kind){if(!this.enabled()||this.feeding||this.drag)return;e.preventDefault();this.release();this.selected=null;this.target={x:this.x,y:this.y};this.drag={id:e.pointerId,kind,element:e.currentTarget,clientX:e.clientX,clientY:e.clientY};try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}this.foodMove(e);this.message('食べものを柴犬のところへ持っていこう。');this.sync();}
 foodMove(e){if(!this.drag||e.pointerId!==this.drag.id)return;e.preventDefault();this.drag.clientX=e.clientX;this.drag.clientY=e.clientY;this.ghost.hidden=false;this.ghost.style.left=(e.clientX-44)+'px';this.ghost.style.top=(e.clientY-51)+'px';const g=this.ghost.getContext('2d');g.clearRect(0,0,100,100);A.drawFood(g,50,53,70,this.drag.kind,1);}
 foodUp(e){if(!this.drag||e.pointerId!==this.drag.id)return;e.preventDefault();const d=this.drag,p=this.point(e);this.drag=null;this.ghost.hidden=true;try{d.element.releasePointerCapture(e.pointerId);}catch{}if(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1){if(!this.offer(d.kind,p))this.selected=null;}else{this.selected=d.kind;this.message('食べものを選んだよ。柴犬へドラッグ、または柴犬をタップして渡してね。');}this.sync();}
 offer(kind,p){if(!this.enabled()||this.feeding||!['meal','snack','milk'].includes(kind))return false;const size=this.size();if(Math.abs((p.x-this.x)*900)>size*.53||Math.abs((p.y-this.y)*this.canvas.height)>size*.57){this.message('柴犬の近くに置いてね。食べものは減っていないよ。');return false;}
 const state=this.options.getState();C.advance(state);if(state.fullness>=88){this.options.onRefuse?.();this.message('おなかいっぱい。いまは食べないよ。またあとでね。');return false;}
 this.target={x:this.x,y:this.y};this.feeding={kind,elapsed:0,bite:0,remaining:1,token:++this.token,stateRef:state};this.selected=null;this.lastBite=-1;this.message(kind==='milk'?'ごくごく… ゆっくり飲んでいるよ。':'もぐもぐ… ゆっくり食べているよ。');this.sync();return true;
 }
 size(){return Math.min(335,this.canvas.height*.53);}
 step(dt){if(!this.enabled())return;const f=this.feeding;if(f){if(f.stateRef!==this.options.getState()){this.cancel('食べものを片づけたよ。');return;}f.elapsed+=Math.min(.1,Math.max(0,dt));f.bite=Math.min(6,Math.floor(f.elapsed/.42));f.remaining=1-f.bite/6;if(f.bite!==this.lastBite){this.lastBite=f.bite;this.status.textContent='もぐもぐ '+f.bite+' / 6';}
 if(f.elapsed>=2.65){this.feeding=null;this.token++;this.sync();const result=this.options.onFeed(f.kind);this.status.textContent=result.ok?'ごちそうさま！ 全部食べたね。':'おなかいっぱい。またあとで食べよう。';}return;}
 const dx=this.target.x-this.x,dy=this.target.y-this.y,len=Math.hypot(dx,dy);this.moving=len>.006;if(this.moving){const k=Math.min(1,dt*3.4);this.x+=dx*k;this.y+=dy*k;}else{this.x=this.target.x;this.y=this.target.y;}
 }
 draw(c,t,pose){const size=this.size(),state=this.options.getState(),x=this.x*900,y=this.y*this.canvas.height,f=this.feeding;
 if(this.drag||this.selected){c.save();c.strokeStyle='#729968';c.lineWidth=5;c.setLineDash([10,8]);c.beginPath();c.ellipse(x,y+size*.32,size*.52,size*.22,0,0,Math.PI*2);c.stroke();c.restore();}
 A.drawDog(c,x,y,size,state.coat,C.stage(state),C.mood(state),t,f?'eat':this.moving?'run':pose,true,{dx:this.look[0],look:!this.moving&&pose==='idle'?this.look:null});
 if(f){A.drawFood(c,x+size*.35,y+size*.29,size*.35,f.kind,f.remaining);if(f.bite>0&&f.bite<6){for(let i=0;i<4;i++){const progress=(f.elapsed%.42)/.42;A.ellipse(c,x+Math.sin(i*4)*size*.06,y-size*.16+progress*size*.1,2.5,2.5,f.kind==='milk'?'#fdfbf2':'#c49a6e');}}}
 const hit=document.getElementById('pet-button'),s=size*(state.coat==='black'?.91:.94);hit.style.left=(this.x*100-s/900*50)+'%';hit.style.top=(this.y*100-s/this.canvas.height*59)+'%';hit.style.width=(s/900*100)+'%';hit.style.height=(s/this.canvas.height*103)+'%';hit.disabled=!!f;hit.style.pointerEvents=this.drag?'none':'auto';
 }
 sync(){for(const b of document.querySelectorAll('[data-food]'))b.disabled=!!this.feeding;document.getElementById('food-cancel').hidden=!this.feeding&&!this.drag&&!this.selected;}
 cancel(message){const had=!!(this.drag||this.feeding||this.selected);const d=this.drag;this.drag=null;this.feeding=null;this.selected=null;this.token++;this.ghost.hidden=true;this.release();if(d)try{d.element.releasePointerCapture(d.id);}catch{}this.sync();if(had&&message)this.message(message);}
 resume(){this.active=true;}
 pause(){this.active=false;this.cancel('途中の食べものを片づけたよ。記録は増えていません。');}
 get snapshot(){return{x:this.x,y:this.y,target:{...this.target},look:[...this.look],moving:!!this.moving,drag:!!this.drag,feeding:this.feeding?{kind:this.feeding.kind,bite:this.feeding.bite,remaining:this.feeding.remaining,elapsed:this.feeding.elapsed}:null,active:this.active};}
}
root.ShibaHome=HomeCompanion;
})(globalThis);

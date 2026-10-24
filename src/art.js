/* Original Canvas artwork. Replace drawDog here to use a future verified Grant asset. */
(function(root){
'use strict';
const palettes={black:{fur:'#41464b',edge:'#363d40',light:'#535b60',inner:'#bc9c86'},brown:{fur:'#ca905d',edge:'#8d674b',light:'#dfa974',inner:'#a67c65'},white:{fur:'#f2ead9',edge:'#b4aa95',light:'#fff8e9',inner:'#d3b8a2'}};
function ellipse(c,x,y,rx,ry,fill,stroke){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
function path(c,d,fill,stroke){c.beginPath();d(c);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function round(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
function drawDog(c,x,y,size=220,coat='black',stage='puppy',mood='happy',t=0,pose='idle',shadow=true){
 c.save();c.translate(x,y);c.scale(size/240,size/240);c.lineWidth=3;c.lineCap='round';c.lineJoin='round';
 const p=palettes[coat]||palettes.black,cream='#fff0d6',head=stage==='puppy'?1:stage==='junior'?.93:.85,body=stage==='adult'?1.16:stage==='junior'?1.05:.92;
 let bob=pose==='run'?Math.sin(t*13)*5:pose==='happy'?Math.abs(Math.sin(t*8))*-8:Math.sin(t*2.3)*2;
 if(shadow)ellipse(c,0,104,88,13,'#65754822');
 c.translate(0,bob);
 // Curled tail, gently wagging.
 c.save();c.translate(70,51);c.rotate(Math.sin(t*6)*.15);c.lineWidth=28;c.strokeStyle=p.edge;path(c,q=>{q.moveTo(0,18);q.bezierCurveTo(48,0,44,-45,15,-44);q.bezierCurveTo(-4,-42,-5,-16,14,-15);},null,p.edge);c.lineWidth=23;path(c,q=>{q.moveTo(0,18);q.bezierCurveTo(48,0,44,-45,15,-44);q.bezierCurveTo(-4,-42,-5,-16,14,-15);},null,p.fur);c.restore();c.lineWidth=3;
 ellipse(c,0,56,64*body,53,p.fur,p.edge);ellipse(c,0,65,42*body,37,cream);
 const step=pose==='run'?Math.sin(t*12)*6:0;
 round(c,-58,73+step,36,33,16,p.fur,p.edge);round(c,22,73-step,36,33,16,p.fur,p.edge);
 ellipse(c,-40,98+step,18,10,cream);ellipse(c,40,98-step,18,10,cream);
 if(pose==='sit'){ellipse(c,-24,71,14,29,p.fur,p.edge);ellipse(c,24,71,14,29,p.fur,p.edge);ellipse(c,-24,95,14,9,cream);ellipse(c,24,95,14,9,cream);}
 if(pose==='paw'){ellipse(c,59,54,16,23,p.fur,p.edge);ellipse(c,60,37,16,12,cream);}
 // Round puppy face and soft triangular ears.
 c.save();c.translate(0,-18);c.scale(head,head);
 path(c,q=>{q.moveTo(-80,-39);q.quadraticCurveTo(-90,-95,-60,-105);q.quadraticCurveTo(-31,-92,-24,-61);},p.fur,p.edge);
 path(c,q=>{q.moveTo(80,-39);q.quadraticCurveTo(90,-95,60,-105);q.quadraticCurveTo(31,-92,24,-61);},p.fur,p.edge);
 path(c,q=>{q.moveTo(-70,-65);q.lineTo(-62,-91);q.quadraticCurveTo(-47,-86,-41,-65);q.closePath();},p.inner);
 path(c,q=>{q.moveTo(70,-65);q.lineTo(62,-91);q.quadraticCurveTo(47,-86,41,-65);q.closePath();},p.inner);
 ellipse(c,0,-14,90,77,p.fur,p.edge);
 path(c,q=>{q.moveTo(-89,-6);q.bezierCurveTo(-74,12,-61,5,-42,20);q.quadraticCurveTo(0,2,42,20);q.bezierCurveTo(61,5,74,12,89,-6);q.bezierCurveTo(85,58,32,67,0,65);q.bezierCurveTo(-32,67,-85,58,-89,-6);},cream);
 // The tan markings and cream brows are deliberately soft.
 ellipse(c,-39,-39,16,7,coat==='white'?'#e2cfb3':'#d8ad83');ellipse(c,39,-39,16,7,coat==='white'?'#e2cfb3':'#d8ad83');
 c.strokeStyle='#292f32';c.lineWidth=4;
 if(mood==='happy'||pose==='happy'||pose==='eat'||pose==='bath'){
 path(c,q=>{q.moveTo(-56,-15);q.quadraticCurveTo(-42,-27,-28,-16);},null,'#292f32');path(c,q=>{q.moveTo(28,-16);q.quadraticCurveTo(42,-27,56,-15);},null,'#292f32');
 }else if(mood==='grumpy'){
 path(c,q=>{q.moveTo(-56,-22);q.lineTo(-30,-14);},null,'#292f32');path(c,q=>{q.moveTo(56,-22);q.lineTo(30,-14);},null,'#292f32');
 }else{
 ellipse(c,-42,-18,7,8,'#292f32');ellipse(c,42,-18,7,8,'#292f32');ellipse(c,-44,-21,2,2,'#fff');ellipse(c,40,-21,2,2,'#fff');
 }
 ellipse(c,-63,6,13,7,'#e6b2a28c');ellipse(c,63,6,13,7,'#e6b2a28c');
 path(c,q=>{q.moveTo(-12,13);q.quadraticCurveTo(0,6,12,13);q.quadraticCurveTo(9,26,0,27);q.quadraticCurveTo(-9,26,-12,13);},'#333d3d');
 c.lineWidth=2.6;
 path(c,q=>{q.moveTo(0,27);q.lineTo(0,33);q.quadraticCurveTo(-7,42,-14,35);q.moveTo(0,33);q.quadraticCurveTo(7,42,14,35);},null,'#574c43');
 if(mood==='happy'||pose==='eat'){path(c,q=>{q.moveTo(-8,37);q.quadraticCurveTo(0,58,8,37);},'#d49a90');}
 if(mood==='sad'){ellipse(c,-53,8+Math.sin(t*3)*3,4,7,'#91c7d4');ellipse(c,53,8+Math.sin(t*3)*3,4,7,'#91c7d4');}
 if(mood==='grumpy'){c.strokeStyle='#d29173';path(c,q=>{q.moveTo(73,-51);q.lineTo(83,-42);q.moveTo(83,-51);q.lineTo(73,-42);},null,'#d29173');}
 c.restore();
 // Sage bandana with a warm little tag.
 path(c,q=>{q.moveTo(-31,32);q.quadraticCurveTo(0,43,31,32);q.lineTo(8,59);q.closePath();},'#779887');ellipse(c,0,44,6,6,'#e7ca8e');
 if(pose==='sleep'){c.font='bold 20px sans-serif';c.fillStyle='#7a927a';c.fillText('z z',65,-91-Math.sin(t)*5);}
 if(pose==='bath'){for(let i=0;i<7;i++){const bx=Math.sin(i*7+t)*95,by=20-i*27-(t*25%24);ellipse(c,bx,by,8+i%3*4,8+i%3*4,'#c6e4e98c','#a6cbd290');}}
 if(pose==='happy'){c.font='22px sans-serif';c.fillStyle='#dcad93';c.fillText('♥',-109,-60+Math.sin(t*2)*6);c.fillText('♥',83,-91+Math.cos(t*2)*6);}
 if(pose==='eat'){round(c,-60,109,120,25,10,'#d4bda1');ellipse(c,0,109,60,12,'#eee1bc');for(let i=0;i<10;i++)ellipse(c,Math.cos(i)*35,109+Math.sin(i)*4,5,3,'#aa8160');}
 c.restore();
}
function tree(c,x,y,s=1,color='#a8bd8d'){c.save();c.translate(x,y);c.scale(s,s);round(c,-5,0,10,50,3,'#9e8c6e');ellipse(c,0,-17,39,45,color);ellipse(c,-22,-1,27,30,color);ellipse(c,23,-6,28,31,color);c.restore();}
function home(c,w,h,t=0){c.save();c.scale(w/900,h/670);c.clearRect(0,0,900,670);c.fillStyle='#f8f4e8';c.fillRect(0,0,900,670);round(c,76,45,748,398,85,'#e9efd9');c.save();c.beginPath();c.roundRect(76,45,748,398,85);c.clip();c.fillStyle='#edf1e3';c.fillRect(76,45,748,240);ellipse(c,730,123,34,34,'#f7e6ba');ellipse(c,270+Math.sin(t*.06)*30,147,74,19,'#fffdf1');ellipse(c,313+Math.sin(t*.06)*30,135,47,26,'#fffdf1');path(c,q=>{q.moveTo(60,353);q.quadraticCurveTo(263,248,435,348);q.quadraticCurveTo(682,234,860,329);q.lineTo(900,500);q.lineTo(0,500);},'#dbe5c6');tree(c,166,313,1.4);tree(c,759,301,1.6);tree(c,665,316,.8,'#b7c69a');for(let i=0;i<14;i++){const x=100+i*52,y=359+Math.sin(i*7)*26;ellipse(c,x,y,3,5,'#c6cf9e');}c.restore();c.strokeStyle='#d7dbbf';c.lineWidth=5;path(c,q=>{q.moveTo(450,45);q.lineTo(450,300);q.moveTo(76,274);q.lineTo(824,274);},null,'#d7dbbf');round(c,67,426,766,15,7,'#e0d8be');c.fillStyle='#f3ead9';c.fillRect(0,441,900,229);for(let i=0;i<5;i++)path(c,q=>{q.moveTo(0,465+i*52);q.lineTo(900,465+i*52);},null,'#eae0cb');ellipse(c,452,562,222,67,'#e1d6be');ellipse(c,452,562,202,56,'#f0e4ce');round(c,124,387,56,66,9,'#c3b390');tree(c,151,362,.65,'#97b19c');round(c,694,509,104,44,12,'#d6b58e');ellipse(c,746,511,49,10,'#e8d7b3');ellipse(c,746,512,38,5,'#9abbb9');c.restore();}
const courses={park:{name:'公園',icon:'🌳',desc:'木かげとお花。植木ばちをよけよう。',sky:'#e8eedc',ground:'#cfdcba',path:'#f4e5c3',obstacle:'pot',speed:145,duration:26},town:{name:'町',icon:'🏘',desc:'小さな家々。コーンに気をつけて。',sky:'#f1e6db',ground:'#e4dbcb',path:'#c8ccca',obstacle:'cone',speed:170,duration:27},sea:{name:'海',icon:'🐚',desc:'きらきら波打ちぎわ。貝をよけよう。',sky:'#d7edf0',ground:'#b5d9db',path:'#f2dfb3',obstacle:'shell',speed:155,duration:26},mountain:{name:'山',icon:'⛰',desc:'くねくね山道。岩をよけて進もう。',sky:'#e1e9de',ground:'#a9bf98',path:'#d4c3a4',obstacle:'rock',speed:185,duration:28},river:{name:'川',icon:'💧',desc:'川のせせらぎ。水たまりをよけよう。',sky:'#e4efe3',ground:'#b4d1c4',path:'#e6ddbb',obstacle:'puddle',speed:165,duration:27}};
function scenery(c,key,t=0,w=900,h=600){const a=courses[key]||courses.park;c.save();c.scale(w/900,h/600);c.fillStyle=a.ground;c.fillRect(0,0,900,600);if(key==='sea'||key==='river'){c.fillStyle=key==='sea'?'#8bbdc6':'#8ab8bf';c.fillRect(key==='sea'?630:35,0,key==='sea'?270:145,600);for(let i=0;i<12;i++){path(c,q=>{let yy=(i*57+t*20)%650-30;q.moveTo(key==='sea'?654:48,yy);q.quadraticCurveTo(key==='sea'?760:105,yy+15,key==='sea'?890:168,yy);},null,'#d5efef');}}
 path(c,q=>{q.moveTo(250,0);q.bezierCurveTo(310,200,230,400,265,600);q.lineTo(635,600);q.bezierCurveTo(650,400,570,200,650,0);q.closePath();},a.path);
 for(let i=0;i<6;i++){const y=(i*140+t*50)%850-120;if(key==='town'){round(c,65,y,110,100,11,i%2?'#cbad93':'#acc0b0');path(c,q=>{q.moveTo(55,y);q.lineTo(120,y-35);q.lineTo(185,y);q.closePath();},'#b38165');round(c,103,y+38,25,48,3,'#f5e8ca');round(c,716,y+25,118,85,10,'#b9c4c5');}else if(key==='mountain'){path(c,q=>{q.moveTo(15,y+95);q.lineTo(116,y-42);q.lineTo(221,y+95);q.closePath();},'#879d79');tree(c,750,y+50,1.1,'#718b70');}else if(key==='sea'){ellipse(c,190,y+35,24,9,'#f8edcc');c.font='35px sans-serif';c.fillText('✦',730,y+25);}else{tree(c,200,y,.8);tree(c,735,y+55,1.2);ellipse(c,110,y+45,9,6,'#edd6a5');ellipse(c,811,y,8,5,'#d2aba1');}}
 c.restore();}
function obstacle(c,type,x,y){c.save();c.translate(x,y);c.lineWidth=3;if(type==='cone'){path(c,q=>{q.moveTo(-23,24);q.lineTo(0,-28);q.lineTo(23,24);q.closePath();},'#da9274','#ab755c');round(c,-31,23,62,10,5,'#b7a183');round(c,-13,-1,26,9,3,'#f7e6d3');}else if(type==='rock'){path(c,q=>{q.moveTo(-35,17);q.lineTo(-22,-20);q.lineTo(12,-31);q.lineTo(36,3);q.lineTo(22,24);q.closePath();},'#9b9d8b','#858975');}else if(type==='shell'){ellipse(c,0,3,31,23,'#e5bca1','#c3987f');for(let i=0;i<5;i++)path(c,q=>{q.moveTo(0,24);q.lineTo(-25+i*12,-10);},null,'#cba18a');}else if(type==='puddle'){ellipse(c,0,4,43,21,'#91b9bd');ellipse(c,-6,1,25,11,'#b8d1d2');}else{round(c,-25,-3,50,36,7,'#c09b79');round(c,-31,-9,62,12,5,'#caa47b');tree(c,0,-18,.5,'#8fa97f');}c.restore();}
root.ShibaArt={drawDog,home,scenery,obstacle,courses,round,ellipse,tree,palettes};
})(globalThis);


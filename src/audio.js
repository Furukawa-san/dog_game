/* 合成音だけで鳴らす効果音とBGM。音声ファイルや外部通信は使わない。 */
(function(root){
'use strict';
let ac=null,master=null,sfxGain=null,musicGain=null,sfxOn=true,musicOn=false,musicTimer=0,step=0;
function ctx(){
 if(!ac){const AC=root.AudioContext||root.webkitAudioContext;if(!AC)return null;ac=new AC();master=ac.createGain();master.gain.value=.9;master.connect(ac.destination);sfxGain=ac.createGain();sfxGain.gain.value=.5;sfxGain.connect(master);musicGain=ac.createGain();musicGain.gain.value=.11;musicGain.connect(master);}
 return ac;
}
function unlock(){const a=ctx();if(a&&a.state!=='running'&&a.state!=='closed')a.resume().catch(()=>{});if(musicOn)startMusic();}
function tone(freq,dur=.15,type='sine',vol=.5,slide=0,delay=0,dest){
 const a=ctx();if(!a)return;const t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+dur);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g);g.connect(dest||sfxGain);o.start(t);o.stop(t+dur+.05);
}
function noise(dur=.1,vol=.3,freq=1200,delay=0,q=1){
 const a=ctx();if(!a)return;const t=a.currentTime+delay,len=Math.max(1,Math.floor(a.sampleRate*dur)),buf=a.createBuffer(1,len,a.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
 const src=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();src.buffer=buf;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;g.gain.value=vol;src.connect(f);f.connect(g);g.connect(sfxGain);src.start(t);
}
const N=n=>440*Math.pow(2,(n-69)/12);
const sounds={
 tap(){tone(880,.07,'triangle',.25,1.2);},
 pop(){tone(520+Math.random()*200,.09,'sine',.45,2.4);noise(.04,.15,3000);},
 coin(){tone(N(88),.08,'square',.12);tone(N(93),.22,'square',.12,0,.07);},
 jump(){tone(330,.2,'triangle',.35,2.2);},
 land(){noise(.06,.2,400);},
 hit(){tone(220,.25,'sawtooth',.18,.5);noise(.12,.2,600);},
 good(){tone(N(76),.1,'triangle',.3);tone(N(81),.16,'triangle',.3,0,.08);},
 perfect(){[76,81,85,88].forEach((n,i)=>tone(N(n),.14,'triangle',.28,0,i*.06));},
 miss(){tone(300,.22,'sine',.3,.6);},
 happy(){bark(1);},
 bark(){bark(1);},
 bark2(){bark(1);bark(1.08,.2);},
 sad(){tone(520,.35,'sine',.25,.62);tone(470,.45,'sine',.2,.6,.3);},
 grumpy(){tone(180,.3,'sawtooth',.12,.85);},
 eat(){for(let i=0;i<3;i++)noise(.05,.35,1800+Math.random()*800,i*.11,2);},
 splash(){noise(.35,.35,900,0,.6);noise(.25,.2,2500,.05,.8);},
 bubble(){tone(700+Math.random()*500,.12,'sine',.2,1.8);},
 shake(){for(let i=0;i<6;i++)noise(.05,.2,2200,i*.05,1.5);},
 dig(){noise(.12,.35,500,0,.8);noise(.1,.25,700,.12,.8);},
 whoosh(){noise(.3,.25,1400,0,.5);},
 sparkle(){[96,100,103,108].forEach((n,i)=>tone(N(n),.18,'sine',.12,0,i*.05));},
 start(){[72,76,79].forEach((n,i)=>tone(N(n),.16,'triangle',.3,0,i*.1));},
 count(){tone(N(72),.12,'square',.12);},
 go(){tone(N(84),.35,'square',.14);},
 fanfare(){[72,76,79,84,79,84].forEach((n,i)=>tone(N(n),i===5?.5:.16,'triangle',.3,0,i*.13));},
 levelup(){[72,76,79,84,88,91,96].forEach((n,i)=>tone(N(n),.2,'square',.12,0,i*.08));},
 stamp(){tone(N(79),.1,'triangle',.3);tone(N(91),.3,'triangle',.3,0,.1);},
 lose(){[67,64,60].forEach((n,i)=>tone(N(n),.25,'triangle',.25,0,i*.18));},
 squeak(){tone(1200,.12,'sine',.25,1.6);},
 snore(){tone(110,.6,'sine',.12,1.3);},
 trick(n=0){tone(N([72,76,79,84,88,91,95][n%7]),.25,'triangle',.3);}
};
function bark(pitch=1,delay=0){tone(560*pitch,.09,'square',.12,.55,delay);tone(820*pitch,.12,'triangle',.28,.5,delay+.01);noise(.07,.18,1400*pitch,delay,2);}
function play(name,arg){if(!sfxOn)return;try{ctx();if(ac&&ac.state!=='running'&&ac.state!=='closed')ac.resume().catch(()=>{});sounds[name]?.(arg);}catch{}}
/* やさしいBGM: ペンタトニックの小さなループ */
const melody=[72,74,76,79,81,79,76,74,72,76,79,84,81,79,76,79];
const bass=[48,48,55,55,53,53,55,55];
function startMusic(){
 if(musicTimer||!musicOn)return;const a=ctx();if(!a||a.state!=='running'){return;}
 musicTimer=setInterval(()=>{if(!musicOn||a.state!=='running')return;const i=step++%32;
  if(i%2===0){const n=melody[(i/2)%16];if(Math.random()>.18)tone(N(n),.42,'triangle',.5,0,0,musicGain);}
  if(i%4===0)tone(N(bass[(i/4)%8]),.7,'sine',.7,0,0,musicGain);
  if(i%8===4)tone(N(melody[(i+5)%16]+12),.25,'sine',.25,0,.12,musicGain);
 },260);
}
function stopMusic(){clearInterval(musicTimer);musicTimer=0;}
function setSfx(v){sfxOn=!!v;}
function setMusic(v){musicOn=!!v;if(musicOn)startMusic();else stopMusic();}
function suspend(){stopMusic();if(ac&&ac.state==='running')ac.suspend().catch(()=>{});}
function resume(){if(ac&&ac.state!=='running'&&ac.state!=='closed')ac.resume().then(()=>{if(musicOn)startMusic();}).catch(()=>{});else if(musicOn)startMusic();}
root.ShibaAudio={play,unlock,setSfx,setMusic,suspend,resume,get context(){return ac;}};
})(globalThis);

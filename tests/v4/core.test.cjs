'use strict';
// しば日和 3D 状態エンジン(schema v3)の単体テスト。Node標準機能のみ。
const assert=require('node:assert/strict'),path=require('node:path');
const C=require(path.join(__dirname,'..','..','src','core.js'));
const results=[];const test=(name,fn)=>{try{fn();results.push(['ok',name]);}catch(e){results.push(['NG',name,e.message]);}};
const NOW=Date.now();

test('fresh state validates as v3',()=>{const s=C.fresh(NOW);C.ensureDaily(s,NOW);const back=C.validate(C.pack(s),NOW);assert.equal(back.coins,s.coins);assert.equal(back.daily.missions.length,3);});
test('v2 backup migrates to v3 and keeps identity',()=>{
 const v2={name:'ぽち',coat:'black',createdAt:NOW-3*C.DAY,lastSeen:NOW-C.HOUR,ageMs:3*C.DAY,fullness:50,joy:60,clean:70,energy:80,bond:40,training:30,xp:120,counts:{meals:5,walks:2,plays:3,baths:1,lessons:4,pets:9},journal:[{at:NOW-C.DAY,text:'ごはんをおいしく食べた'}],sound:false};
 const s=C.validate({app:'shiba-pocket',schemaVersion:2,state:v2},NOW);
 assert.equal(s.name,'ぽち');assert.equal(s.coat,'black');assert.equal(s.xp,120);assert.equal(s.counts.meals,5);assert.equal(s.tutorial,true);assert.ok(s.coins>=50);assert.equal(s.equipped.collar,null);
 C.validate(C.pack(s),NOW);
});
test('invalid data is rejected',()=>{
 const s=C.fresh(NOW);for(const bad of [{...s,coins:-1},{...s,owned:['nope']},{...s,equipped:{...s.equipped,head:'head_crown'}},{...s,extra:1},{...s,stars:{ball:4}},{...s,name:''}]){assert.throws(()=>C.validate({app:'shiba-pocket',schemaVersion:3,state:bad},NOW));}
 assert.throws(()=>C.validate({app:'shiba-pocket',schemaVersion:9,state:s},NOW));assert.throws(()=>C.validate(null,NOW));
});
test('feeding refuses when full and records once',()=>{const s=C.fresh(NOW);s.fullness=90;assert.equal(C.act(s,'feed','meal',NOW).ok,false);s.fullness=40;const r=C.act(s,'feed','meal',NOW);assert.equal(r.ok,true);assert.equal(s.counts.meals,1);});
test('reward gives coins, stars, best and missions',()=>{
 const s=C.fresh(NOW);C.ensureDaily(s,NOW);const c0=s.coins;const r=C.reward(s,'frisbee',30,'normal',NOW);
 assert.equal(r.stars,3);assert.ok(r.coins>0);assert.equal(s.best.frisbee,30);assert.equal(s.stars.frisbee,3);assert.ok(s.coins>c0);
 const r2=C.reward(s,'frisbee',10,'gentle',NOW);assert.equal(r2.newBest,false);assert.equal(s.best.frisbee,30);assert.equal(s.stars.frisbee,3);
 assert.throws(()=>C.reward(s,'unknown',1,'gentle',NOW));
});
test('every game has a 3-step star threshold',()=>{for(const [k,g]of Object.entries(C.GAMES)){assert.equal(g.stars.length,3,k);assert.ok(g.stars[0]<g.stars[1]&&g.stars[1]<g.stars[2],k);}assert.equal(Object.keys(C.GAMES).filter(k=>!k.startsWith('walk_')).length,16);assert.equal(Object.keys(C.GAMES).filter(k=>k.startsWith('walk_')).length,8);});
test('daily missions: same day stable, next day streak',()=>{
 const s=C.fresh(NOW);const a=C.ensureDaily(s,NOW);assert.ok(a.bonus>0);const ids=s.daily.missions.map(m=>m.id);assert.equal(C.ensureDaily(s,NOW+C.HOUR),null);assert.deepEqual(s.daily.missions.map(m=>m.id),ids);
 const b=C.ensureDaily(s,NOW+C.DAY);assert.equal(b.streak,2);const c=C.ensureDaily(s,NOW+4*C.DAY);assert.equal(c.streak,1);
});
test('mission claim pays once and all-clear bonus',()=>{const s=C.fresh(NOW);C.ensureDaily(s,NOW);for(const m of s.daily.missions){m.done=true;m.progress=C.MISSIONS[m.id].goal;}const c0=s.coins;const g1=C.claimMission(s,s.daily.missions[0].id);assert.equal(g1,C.MISSION_REWARD);assert.equal(C.claimMission(s,s.daily.missions[0].id),0);C.claimMission(s,s.daily.missions[1].id);const g3=C.claimMission(s,s.daily.missions[2].id);assert.equal(g3,C.MISSION_REWARD+C.MISSION_BONUS);assert.equal(s.coins,c0+3*C.MISSION_REWARD+C.MISSION_BONUS);});
test('shop: buy, equip toggles, level lock, not enough coins',()=>{
 const s=C.fresh(NOW);s.coins=1000;assert.equal(C.buy(s,'head_ribbon').ok,true);assert.equal(s.equipped.head,null);C.equip(s,'head_ribbon');assert.equal(s.equipped.head,'head_ribbon');C.equip(s,'head_ribbon');assert.equal(s.equipped.head,null);
 assert.equal(C.buy(s,'head_crown').ok,false);s.xp=C.levelXp(5);assert.equal(C.buy(s,'head_crown').ok,true);
 s.coins=0;assert.equal(C.buy(s,'deco_tree').ok,false);s.coins=500;C.buy(s,'deco_tree');assert.ok(s.deco.includes('deco_tree'));C.equip(s,'deco_tree');assert.ok(!s.deco.includes('deco_tree'));
 C.validate(C.pack(s),NOW);
});
test('collars are retired: not sold, not equipped by default, old saves still load',()=>{const s=C.fresh(NOW);assert.equal(s.equipped.collar,null);s.coins=999;assert.equal(C.buy(s,'collar_blue').ok,false);s.owned.push('collar_red');s.equipped.collar='collar_red';C.validate(C.pack(s),NOW);C.equip(s,'collar_red');assert.equal(s.equipped.collar,null);});
test('unlock items open games and courses; garden needed for yard',()=>{const s=C.fresh(NOW);s.coins=5000;assert.equal(C.unlocked(s,'sky'),false);assert.throws(()=>C.reward(s,'sky',10,'gentle',NOW));C.buy(s,'gear_wings');assert.equal(C.unlocked(s,'sky'),true);C.reward(s,'sky',10,'gentle',NOW);
 assert.equal(C.unlocked(s,'walk_snow'),false);C.buy(s,'gear_boots');assert.equal(C.unlocked(s,'walk_snow'),true);
 assert.equal(C.buy(s,'yard_pool').ok,false);assert.equal(C.buy(s,'area_field').ok,false);C.buy(s,'area_garden');assert.equal(C.buy(s,'yard_pool').ok,true);assert.ok(s.deco.includes('yard_pool'));assert.equal(C.buy(s,'area_field').ok,true);
 C.buy(s,'toy_frisbee');assert.ok(s.owned.includes('toy_ball')&&s.owned.includes('toy_frisbee'));C.validate(C.pack(s),NOW);});
test('old v3 saves get starter toy on load',()=>{const s=C.fresh(NOW);s.owned=s.owned.filter(id=>id!=='toy_ball');const back=C.validate(C.pack(s),NOW);assert.ok(back.owned.includes('toy_ball'));});
test('meat and fish can be fed',()=>{const s=C.fresh(NOW);s.fullness=30;assert.equal(C.act(s,'feed','meat',NOW).ok,true);s.fullness=30;assert.equal(C.act(s,'feed','fish',NOW).ok,true);assert.equal(s.counts.meals,2);});
test('road and outing areas: road needed first, save stays valid',()=>{const s=C.fresh(NOW);s.coins=9000;C.buy(s,'area_garden');assert.equal(C.buy(s,'area_sea').ok,false);assert.equal(C.buy(s,'area_road').ok,true);for(const id of ['area_park','area_town','area_sea','area_river'])assert.equal(C.buy(s,id).ok,true);C.validate(C.pack(s),NOW);assert.ok(C.checkStamps(s).includes('traveler')||s.stamps.includes('traveler'));});
test('a save made by the current public version loads with everything kept',()=>{const s=C.fresh(NOW);s.name='テスト柴';s.coat='black';s.coins=1234;s.xp=777;s.owned.push('area_garden','toy_frisbee','gear_wings','head_ribbon');s.equipped.head='head_ribbon';s.deco.push();s.tutorial=true;const back=C.validate(JSON.parse(JSON.stringify(C.pack(s))),NOW);for(const k of ['name','coat','coins','xp'])assert.equal(back[k],s[k]);assert.deepEqual(back.equipped,s.equipped);for(const id of s.owned)assert.ok(back.owned.includes(id));});
test('NPC quests: 20 kinds, only unlocked NPCs and areas are used',()=>{assert.equal(Object.keys(C.QUESTS).length,20);const s=C.fresh(NOW);assert.deepEqual(C.unlockedNpcs(s),[]);s.owned.push('area_garden','area_field');assert.deepEqual(C.unlockedNpcs(s),['kinako']);
 const ids=new Set(C.questOptions(s,'kinako').map(o=>o.id));assert.deepEqual([...ids].sort(),['apple','clover']);
 s.owned.push('area_road','area_park');for(const o of C.questOptions(s,'sakura')){for(const k of [o.target,o.giver])if(k)assert.ok(C.npcUnlocked(s,k));if(o.spot)assert.ok(C.spotUnlocked(s,o.spot));}
 s.owned.push('area_town','area_sea','area_river');const all=new Set();for(const g of C.unlockedNpcs(s))for(const o of C.questOptions(s,g))all.add(o.id);assert.equal(all.size,20);});
test('NPC quest completes step by step and pays coins once',()=>{const s=C.fresh(NOW);s.owned.push('area_garden','area_field','area_road','area_park');s.npc.quest={id:'reply',giver:'sakura',target:'kinako',spot:null,stage:0};const c0=s.coins;
 assert.equal(C.questStep(s,'npc','sakura').ok,false);assert.equal(C.questStep(s,'npc','kinako').done,false);C.validate(C.pack(s),NOW);const r=C.questStep(s,'npc','sakura');assert.equal(r.done,true);assert.equal(s.coins,c0+C.QUESTS.reply.reward+20*r.stamps.length);assert.equal(s.npc.quest,null);assert.equal(s.npc.done,1);assert.equal(C.questStep(s,'npc','sakura').ok,false);});
test('saves made before NPCs load fine (npc added)',()=>{const p=C.pack(C.fresh(NOW));delete p.state.npc;const back=C.validate(p,NOW);assert.deepEqual(back.npc,{done:0,quest:null,next:0});assert.deepEqual(back.fish,{});const bad=C.pack(C.fresh(NOW));bad.state.npc.quest={id:'nope',giver:'x',target:null,spot:null,stage:0};assert.throws(()=>C.validate(bad,NOW));});
test('swimsuit is a gear item and saves stay valid',()=>{const s=C.fresh(NOW);s.coins=999;assert.equal(C.ITEMS.gear_swimsuit.slot,'gear');assert.equal(C.buy(s,'gear_swimsuit').ok,true);C.validate(C.pack(s),NOW);});
test('quests are spaced out: none right after finishing or declining',()=>{const s=C.fresh(NOW);s.owned.push('area_garden','area_field','area_road','area_park');assert.equal(C.questReady(s,NOW),true);
 s.npc.quest={id:'letter',giver:'sakura',target:'kinako',spot:null,stage:0};assert.equal(C.questReady(s,NOW),false);C.questStep(s,'npc','kinako',NOW);assert.equal(s.npc.quest,null);
 assert.equal(C.questReady(s,NOW+C.QUEST_GAP-1000),false);assert.equal(C.questReady(s,NOW+C.QUEST_GAP),true);
 const t=C.fresh(NOW);C.questDecline(t,NOW);assert.equal(C.questReady(t,NOW+30000),false);assert.equal(C.questReady(t,NOW+C.QUEST_GAP_DECLINE),true);
 const far=C.pack(C.fresh(NOW));far.state.npc.next=NOW+30*C.DAY;assert.equal(C.validate(far,NOW).npc.next,NOW);});
test('speech and quest text are written in hiragana (no kanji)',()=>{const K=/[一-鿿]/;for(const n of Object.values(C.NPCS)){for(const t of n.talk)assert.ok(!K.test(t),t);assert.ok(!K.test(n.style.desc),n.style.desc);}
 for(const sp of Object.values(C.SPOTS))assert.ok(!K.test(sp.name),sp.name);const s=C.fresh(NOW);s.owned.push('area_garden','area_field','area_road','area_park','area_town','area_sea','area_river');
 for(const g of C.unlockedNpcs(s))for(const o of C.questOptions(s,g)){const q={...o,stage:0};assert.ok(!K.test(C.questText(q)),C.questText(q));for(let i=0;i<C.questSteps(q).length;i++){q.stage=i;assert.ok(!K.test(C.questObjective(q)),C.questObjective(q));}}
 for(const f of Object.values(C.FISH))assert.ok(!K.test(f.desc),f.desc);});
test('fishing: 20 fish (10 river, 10 sea) and the rod is needed',()=>{const names=Object.values(C.FISH).map(f=>f.name);assert.equal(names.length,20);
 assert.deepEqual(Object.values(C.FISH).filter(f=>f.where==='river').map(f=>f.name).sort(),['アユ','イトウ','ウナギ','エンゼルフィッシュ','コイ','ドジョウ','フナ','ブラックバス','ブルーギル','メダカ'].sort());
 assert.deepEqual(Object.values(C.FISH).filter(f=>f.where==='sea').map(f=>f.name).sort(),['アジ','イカ','エビ','カニ','サケ','サンマ','シーラカンス','タイ','タコ','マグロ'].sort());
 for(let i=0;i<200;i++){assert.equal(C.FISH[C.pickFish('river')].where,'river');assert.equal(C.FISH[C.pickFish('sea')].where,'sea');}
 const s=C.fresh(NOW);assert.equal(C.catchFish(s,'tai',30).ok,false);s.coins=999;C.buy(s,'gear_rod');const c0=s.coins,r=C.catchFish(s,'tai',30);assert.equal(r.ok,true);assert.equal(r.first,true);assert.equal(s.coins>c0,true);
 const r2=C.catchFish(s,'tai',44);assert.equal(r2.first,false);assert.equal(r2.record,true);assert.deepEqual(s.fish.tai,{n:2,big:44});assert.ok(s.stamps.includes('angler'));
 const back=C.validate(C.pack(s),NOW);assert.deepEqual(back.fish,s.fish);const bad=C.pack(s);bad.state.fish.nope={n:1,big:3};assert.throws(()=>C.validate(bad,NOW));});
test('lessons: unlock by level and proficiency grows',()=>{const s=C.fresh(NOW);assert.equal(C.trickUnlocked(s,'sit'),true);assert.equal(C.trickUnlocked(s,'bang'),false);C.act(s,'lesson','sit',NOW);assert.equal(s.tricks.sit,10);C.act(s,'lessonMiss','sit',NOW);assert.equal(s.tricks.sit,13);const p=C.lessonChance(s,'sit');assert.ok(p>=.3&&p<=.97);});
test('stamps are awarded once with coins',()=>{const s=C.fresh(NOW);s.counts.meals=1;const c0=s.coins;const got=C.checkStamps(s);assert.ok(got.includes('first_meal'));assert.equal(s.coins,c0+20*got.length);assert.deepEqual(C.checkStamps(s),[]);});
test('offline progress is capped at 48h and floors stay',()=>{const s=C.fresh(NOW);s.lastSeen=NOW-30*C.DAY;C.advance(s,NOW);assert.equal(s.ageMs,48*C.HOUR);assert.ok(s.fullness>=20&&s.joy>=25&&s.clean>=25);});

const ng=results.filter(r=>r[0]!=='ok');for(const r of results)console.log(r[0],r[1],r[2]||'');console.log(results.length-ng.length+'/'+results.length+' passed');if(ng.length)process.exitCode=1;

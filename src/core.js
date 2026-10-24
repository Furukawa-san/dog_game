/* しば日和 3D — 育成状態エンジン (schema v3)。DOMに依存しない。v2の記録を読み込んで移行できる。 */
(function(root){
'use strict';
const VERSION=3,APP='shiba-pocket',HOUR=3600000,DAY=86400000;
const STATS=['fullness','joy','clean','energy','bond','training'];
const COUNTS=['meals','walks','plays','baths','lessons','pets'];
const clamp=(n,a=0,b=100)=>Math.min(b,Math.max(a,n));

/* ---- カタログ ---- */
const COURSES={
 park:{name:'公園',icon:'🌳',desc:'木かげとお花の道。植木ばちをよけよう。',speed:7.2,duration:30},
 town:{name:'町',icon:'🏘',desc:'小さな家々の間。コーンに気をつけて。',speed:8,duration:32},
 sea:{name:'海',icon:'🐚',desc:'波打ちぎわを走ろう。貝をよけてね。',speed:7.6,duration:30},
 mountain:{name:'山',icon:'⛰',desc:'くねくね山道。岩をジャンプ！',speed:8.6,duration:32},
 river:{name:'川',icon:'💧',desc:'川のせせらぎ。水たまりをよけよう。',speed:8.2,duration:31},
 flower:{name:'お花畑',icon:'🌷',desc:'一面のお花の中をおさんぽ。ちょうちょと競争！',speed:7.4,duration:30,unlock:'gear_basket'},
 snow:{name:'雪山',icon:'⛄',desc:'まっしろな雪の道。雪だるまをよけよう。',speed:8.4,duration:32,unlock:'gear_boots'},
 night:{name:'夜の町',icon:'🌙',desc:'ランタンを持って、星空の下をおさんぽ。',speed:7.8,duration:31,unlock:'gear_lantern'}
};
// stars: 生スコアの★1/★2/★3しきい値。kind: 報酬の種類。
const GAMES={
 ball:{name:'ボール投げ',icon:'🎾',desc:'指をはじいて投げる。輪のまん中をねらおう。',stars:[8,15,22],kind:'play'},
 athletic:{name:'アスレチック',icon:'🪵',desc:'タップでジャンプ。長押しで高く跳ぶ！',stars:[10,20,30],kind:'play'},
 run:{name:'ドッグラン',icon:'🐕',desc:'指で自由に走って、きらきらを集めよう。',stars:[10,16,22],kind:'play'},
 frisbee:{name:'フリスビー',icon:'🥏',desc:'輪がちょうど重なった瞬間にタップ！',stars:[12,22,30],kind:'play'},
 treat:{name:'おやつキャッチ',icon:'🍖',desc:'空から降るおやつをキャッチ。ハチに注意！',stars:[15,28,40],kind:'play'},
 dig:{name:'たからほり',icon:'💎',desc:'においをたよりに、宝ものを掘りあてよう。',stars:[6,12,18],kind:'play'},
 cups:{name:'どのはこ？',icon:'📦',desc:'ボールが入った箱を、目で追いかけよう。',stars:[6,12,18],kind:'play'},
 bubble:{name:'シャボン玉',icon:'🫧',desc:'シャボン玉をタップでわろう。連続で高得点！',stars:[25,55,90],kind:'play'},
 race:{name:'かけっこ',icon:'🏁',desc:'左右のボタンを交互にタップして一等賞へ！',stars:[3,6,10],kind:'play'},
 memory:{name:'おぼえてポーズ',icon:'🧠',desc:'柴犬が見せた技の順番を、まねしてね。',stars:[4,6,8],kind:'play'},
 hide:{name:'かくれんぼ',icon:'🙈',desc:'おともだちの柴犬はどこ？ しげみをタップしてさがそう。',stars:[5,9,13],kind:'play'},
 mole:{name:'もぐらポン',icon:'🕳',desc:'穴から出てくるもぐらをタップ。柴犬が出たらさわらないでね。',stars:[15,28,40],kind:'play'},
 rhythm:{name:'わんわんリズム',icon:'🎵',desc:'音符がわっかに重なったらタップ。いっしょに歌おう！',stars:[20,40,60],kind:'play'},
 sky:{name:'そらとぶ柴犬',icon:'🪽',desc:'羽で空をとぶ！ タップでパタパタ、雲をよけて星を集めよう。',stars:[8,16,26],kind:'play',unlock:'gear_wings'},
 surf:{name:'なみのり',icon:'🏄',desc:'サーフボードで波に乗ろう。上下で動いて、岩をよけて貝を集める。',stars:[10,18,26],kind:'play',unlock:'gear_surf'},
 skate:{name:'スケボー',icon:'🛹',desc:'スケボーで町を走る。タップでジャンプ、長押しで大ジャンプ！',stars:[12,24,36],kind:'play',unlock:'gear_skate'}
};
for(const [k,c]of Object.entries(COURSES))GAMES['walk_'+k]={name:c.name+'のおさんぽ',icon:c.icon,desc:c.desc,stars:[8,13,17],kind:'walk',course:k,unlock:c.unlock};

const TRICKS={
 sit:{name:'おすわり',icon:'🪑',level:1},paw:{name:'おて',icon:'🐾',level:1},down:{name:'ふせ',icon:'⬇️',level:2},
 wait:{name:'まて',icon:'✋',level:3},spin:{name:'くるりん',icon:'🌀',level:4},beg:{name:'ちんちん',icon:'🙌',level:6},bang:{name:'ばーん',icon:'💥',level:8}
};

// slot: collar/neck/head/face (きせかえ), rug/bed/wall (おへや), deco (飾りは複数おける)
// 首輪(collar)は販売終了(retired)。以前の記録を読めるよう定義だけ残し、表示・販売はしない。
const ITEMS={
 collar_red:{slot:'collar',name:'赤い首輪',icon:'🔴',price:0,color:'#d9534f',retired:true},
 collar_blue:{slot:'collar',name:'青い首輪',icon:'🔵',price:40,color:'#4a7fc1',retired:true},
 collar_green:{slot:'collar',name:'みどりの首輪',icon:'🟢',price:40,color:'#5ea06a',retired:true},
 collar_bell:{slot:'collar',name:'鈴つき首輪',icon:'🔔',price:90,color:'#c0392b',bell:true,retired:true},
 neck_bandana:{slot:'neck',name:'赤いバンダナ',icon:'🧣',price:60,color:'#d9534f'},
 neck_bandana_blue:{slot:'neck',name:'水玉バンダナ',icon:'💠',price:70,color:'#5b8fd1',dots:true},
 neck_scarf:{slot:'neck',name:'ふわふわマフラー',icon:'🧶',price:110,color:'#e9c46a'},
 head_ribbon:{slot:'head',name:'リボン',icon:'🎀',price:60,color:'#ef7fa6'},
 head_beret:{slot:'head',name:'ベレー帽',icon:'🎨',price:100,color:'#7d4e9e'},
 head_straw:{slot:'head',name:'むぎわら帽子',icon:'👒',price:130,color:'#e6c47a'},
 head_flower:{slot:'head',name:'花かんむり',icon:'🌸',price:120,color:'#f4a7c0'},
 head_crown:{slot:'head',name:'おうかん',icon:'👑',price:320,color:'#f2c14e',level:5},
 face_glasses:{slot:'face',name:'まるメガネ',icon:'👓',price:90,color:'#5a4632'},
 face_sunglasses:{slot:'face',name:'サングラス',icon:'🕶',price:140,color:'#222222'},
 neck_bowtie:{slot:'neck',name:'ちょうネクタイ',icon:'🎀',price:80,color:'#3b5ba5'},
 neck_lei:{slot:'neck',name:'お花のレイ',icon:'🌺',price:100,color:'#f28ab2'},
 neck_cape:{slot:'neck',name:'ヒーローマント',icon:'🦸',price:180,color:'#d9534f'},
 head_tophat:{slot:'head',name:'シルクハット',icon:'🎩',price:150,color:'#222222'},
 head_cap:{slot:'head',name:'キャップ',icon:'🧢',price:90,color:'#4a7fc1'},
 head_bunny:{slot:'head',name:'うさみみ',icon:'🐰',price:110,color:'#ffffff'},
 head_santa:{slot:'head',name:'サンタぼうし',icon:'🎅',price:140,color:'#d9534f'},
 head_party:{slot:'head',name:'パーティーぼうし',icon:'🥳',price:90,color:'#f2c14e'},
 face_heart:{slot:'face',name:'ハートメガネ',icon:'💖',price:120,color:'#e05d8a'},
 face_star:{slot:'face',name:'スターメガネ',icon:'⭐',price:120,color:'#f2c14e'},
 rug_basic:{slot:'rug',name:'ベージュのラグ',icon:'🟫',price:0,color:'#e9d8bb'},
 rug_mint:{slot:'rug',name:'ミントのラグ',icon:'🟩',price:50,color:'#bfe3cf'},
 rug_pink:{slot:'rug',name:'さくらのラグ',icon:'🌸',price:50,color:'#f6cdd6'},
 rug_star:{slot:'rug',name:'星空のラグ',icon:'🌌',price:100,color:'#5b6aa8'},
 bed_basic:{slot:'bed',name:'まるクッション',icon:'🛏',price:0,color:'#c98b5a'},
 bed_sofa:{slot:'bed',name:'ふかふかソファ',icon:'🛋',price:150,color:'#6f9ec4'},
 bed_house:{slot:'bed',name:'犬小屋',icon:'🏠',price:220,color:'#c0704a'},
 wall_basic:{slot:'wall',name:'クリームのかべ',icon:'🧱',price:0,color:'#f6eedd'},
 wall_mint:{slot:'wall',name:'ミントのかべ',icon:'🌿',price:60,color:'#d7ecdf'},
 wall_sakura:{slot:'wall',name:'さくらのかべ',icon:'🌷',price:60,color:'#f7dde2'},
 wall_sky:{slot:'wall',name:'青空のかべ',icon:'☁️',price:80,color:'#d4e7f7'},
 deco_plant:{slot:'deco',name:'観葉植物',icon:'🪴',price:40},
 deco_lamp:{slot:'deco',name:'スタンドライト',icon:'💡',price:60},
 deco_shelf:{slot:'deco',name:'本だな',icon:'📚',price:80},
 deco_bear:{slot:'deco',name:'くまのぬいぐるみ',icon:'🧸',price:70},
 deco_tree:{slot:'deco',name:'ちいさなツリー',icon:'🎄',price:120},
 deco_frame:{slot:'deco',name:'思い出の写真立て',icon:'🖼',price:50},
 deco_aquarium:{slot:'deco',name:'金魚の水そう',icon:'🐠',price:110},
 deco_piano:{slot:'deco',name:'ちいさなピアノ',icon:'🎹',price:200},
 deco_balloons:{slot:'deco',name:'ふうせん',icon:'🎈',price:60},
 deco_cactus:{slot:'deco',name:'サボテン',icon:'🌵',price:40},
 rug_check:{slot:'rug',name:'チェックのラグ',icon:'🟥',price:70,color:'#e9a39b'},
 wall_wood:{slot:'wall',name:'木のかべ',icon:'🪵',price:90,color:'#e2c49c'},
 bed_basket:{slot:'bed',name:'かごベッド',icon:'🧺',price:120,color:'#d8a865'},
 /* おもちゃ: おうちで選んで遊べる */
 toy_ball:{slot:'toy',name:'ボール',icon:'🔴',price:0,desc:'タップすると転がって、取ってくるよ。'},
 toy_frisbee:{slot:'toy',name:'フリスビー',icon:'🥏',price:80,desc:'遠くへ飛ばすと、ジャンプしてキャッチ！'},
 toy_rope:{slot:'toy',name:'ロープ',icon:'🪢',price:60,desc:'タップすると、ひっぱりっこ。'},
 toy_duck:{slot:'toy',name:'ぴよぴよアヒル',icon:'🐤',price:70,desc:'鳴らすと、とびついて遊ぶよ。'},
 toy_bone:{slot:'toy',name:'ほねガム',icon:'🦴',price:50,desc:'ラグの上でかじかじ。'},
 toy_bubble:{slot:'toy',name:'シャボンだま',icon:'🫧',price:90,desc:'部屋にシャボン玉。ジャンプでパクッ。'},
 /* ひみつ道具: 買うと新しい遊びやコースが解放される */
 gear_wings:{slot:'gear',name:'天使の羽',icon:'🪽',price:300,desc:'おうちで柴犬をタップすると部屋を飛びまわる。遊び「そらとぶ柴犬」が解放。'},
 gear_surf:{slot:'gear',name:'サーフボード',icon:'🏄',price:240,desc:'遊び「なみのり」が解放。'},
 gear_skate:{slot:'gear',name:'スケートボード',icon:'🛹',price:200,desc:'遊び「スケボー」が解放。'},
 gear_basket:{slot:'gear',name:'花かご',icon:'🧺',price:150,desc:'おさんぽ「お花畑」が解放。'},
 gear_boots:{slot:'gear',name:'雪ぐつ',icon:'🥾',price:200,desc:'おさんぽ「雪山」が解放。'},
 gear_lantern:{slot:'gear',name:'ランタン',icon:'🏮',price:180,desc:'おさんぽ「夜の町」が解放。'},
 gear_swimsuit:{slot:'gear',name:'水着',icon:'🩱',price:220,desc:'海と川に入って、犬かきで泳げるようになる。'},
 gear_rod:{slot:'gear',name:'つりざお',icon:'🎣',price:250,desc:'うみと かわで さかなつりが できる。さかなの かげを タップして なげよう。つった さかなは ずかんに のるよ。'},
 /* おうちのエリア */
 area_garden:{slot:'area',name:'お庭',icon:'🌳',price:400,desc:'おうちの横にお庭ができて、外へ出られるよ。'},
 area_field:{slot:'area',name:'ひろい原っぱ',icon:'🌾',price:700,desc:'お庭の先に原っぱが広がる。池もあるよ。',needs:'area_garden'},
 area_road:{slot:'area',name:'おでかけの道路',icon:'🛣',price:350,desc:'お庭の外に道ができる。道の先に公園・町・海・川を作れるよ。',needs:'area_garden'},
 area_park:{slot:'area',name:'公園',icon:'🛝',price:500,desc:'すべり台とブランコ、池のある公園。',needs:'area_road'},
 area_town:{slot:'area',name:'町',icon:'🏘',price:600,desc:'お店や家がならぶ町。横断歩道もあるよ。',needs:'area_road'},
 area_sea:{slot:'area',name:'海',icon:'🏖',price:700,desc:'砂浜とヤシの木。波打ちぎわでぱちゃぱちゃ。',needs:'area_road'},
 area_river:{slot:'area',name:'川',icon:'🏞',price:600,desc:'せせらぎと木の橋。川辺でお水あそび。',needs:'area_road'},
 /* お庭のかざり（お庭が必要） */
 yard_pool:{slot:'yard',name:'ビニールプール',icon:'🏊',price:160,needs:'area_garden'},
 yard_flowers:{slot:'yard',name:'花だん',icon:'🌻',price:90,needs:'area_garden'},
 yard_sandbox:{slot:'yard',name:'すなば',icon:'⛱',price:110,needs:'area_garden'},
 yard_tree:{slot:'yard',name:'りんごの木',icon:'🍎',price:150,needs:'area_garden'},
 yard_bench:{slot:'yard',name:'ベンチ',icon:'🪑',price:80,needs:'area_garden'},
 yard_fountain:{slot:'yard',name:'ふんすい',icon:'⛲',price:220,needs:'area_garden'}
};
const WEAR_SLOTS=['collar','neck','head','face'],ROOM_SLOTS=['rug','bed','wall'];
const STARTER=['rug_basic','bed_basic','wall_basic','toy_ball'];
const MULTI_SLOTS=['deco','yard'],OWN_SLOTS=['toy','gear','area'];
function unlocked(s,key){const g=GAMES[key];return!!g&&(!g.unlock||s.owned.includes(g.unlock));}

const MISSIONS={
 feed2:{label:'ごはんを2回あげる',event:'feed',goal:2},
 pet5:{label:'5回なでなでする',event:'pet',goal:5},
 play2:{label:'あそびを2回する',event:'play',goal:2},
 walk1:{label:'おさんぽに1回行く',event:'walk',goal:1},
 bath1:{label:'おふろに入れる',event:'bath',goal:1},
 lesson2:{label:'しつけを2回成功させる',event:'lesson',goal:2},
 star3:{label:'どれかの遊びで★3をとる',event:'star3',goal:1},
 coin40:{label:'コインを40枚あつめる',event:'coin',goal:40},
 rest1:{label:'ひとやすみさせる',event:'rest',goal:1},
 games3:{label:'ちがう遊びを3種類する',event:'variety',goal:3}
};
const MISSION_REWARD=15,MISSION_BONUS=30;


/* ---- NPCの柴犬（エリアを開放すると増える）とおつかい ---- */
const NPCS={
 kinako:{name:'きなこ',coat:'kinako',area:'area_field',home:'field',color:'#e6c486',style:{size:1.0,speed:.8,equip:{head:'head_straw'},idle:['sleep','down','sniff','sit'],desc:'のんびりやさん。はらっぱで おひるねが だいすき'},talk:['のんびり おひるね びよりだね〜。','はらっぱの かぜ、きもちいいよ。','きなこもちって、わたしの なまえの もとなんだ。']},
 sakura:{name:'さくら',coat:'sakura',area:'area_park',home:'park',color:'#efb3bf',style:{size:.86,speed:1.35,equip:{head:'head_ribbon'},idle:['happy','spin','happy','wiggle'],desc:'げんき いっぱいの こいぬ。こうえんを はしりまわる'},talk:['すべりだい、いっしょに すべろ！','こうえんの おはな、きょうも きれいだよ。','ブランコって、ちょっと こわいよね。']},
 mint:{name:'ミント',coat:'mint',area:'area_town',home:'town',color:'#9fd3bf',style:{size:1.0,speed:1.15,equip:{head:'head_cap'},idle:['sniff','tilt','bark','sit'],desc:'しっかりもの。まちの ことなら なんでも しってる'},talk:['まちの パンやさん、いい におい！','おうだんほどうは、みぎ みて ひだり みてね。','きょうは おつかい びよりだね。']},
 sora:{name:'そら',coat:'sora',area:'area_sea',home:'sea',color:'#a3c6ea',style:{size:.95,speed:1.2,equip:{face:'face_sunglasses'},idle:['dig','sniff','happy','sit'],desc:'うみが だいすき。かいがら あつめの めいじん'},talk:['なみの おと、きこえる？','かいがら あつめが すきなんだ。','つりざおが あれば、うみで さかなつりが できるよ！']},
 fuji:{name:'ふじ',coat:'fuji',area:'area_river',home:'river',color:'#c3b1e1',style:{size:1.1,speed:.75,equip:{head:'head_beret',face:'face_glasses'},idle:['sit','tilt','down','sniff'],desc:'ものしりで おだやか。かわべで かんがえごと'},talk:['かわの せせらぎで、ひとやすみ。','きの はし、ぎしぎし いうよ。','おさかなの かげ、さっき みえたよ！']}
};
// 拾いものの場所（エリア）: そのエリアを開放していないと使わない
const SPOTS={garden:{name:'おにわ',area:'area_garden'},field:{name:'はらっぱ',area:'area_field'},park:{name:'こうえん',area:'area_park'},town:{name:'まち',area:'area_town'},sea:{name:'うみ',area:'area_sea'},river:{name:'かわ',area:'area_river'}};
// おつかい20種。kind: deliver=Tへ届ける / fetch=拾ってGへ / fetchgive=拾ってTへ / relay=Tへ届けて返事をGへ / visit=Tに会ってGへ報告 / lost=Tのエリアで拾ってTへ
const QUESTS={
 letter:{kind:'deliver',icon:'💌',item:'おてがみ',reward:30,ask:'{T}に おてがみを とどけて くれる？'},
 bouquet:{kind:'deliver',icon:'💐',item:'はなたば',reward:35,ask:'{T}に はなたばを わたしたいの。おねがい できる？'},
 book:{kind:'deliver',icon:'📕',item:'えほん',reward:30,ask:'{T}に かりた えほん、かえして きて くれる？'},
 bento:{kind:'deliver',icon:'🍱',item:'おべんとう',reward:40,ask:'{T}が おべんとうを わすれちゃった みたい。とどけて！'},
 ballback:{kind:'deliver',icon:'⚽',item:'ボール',reward:30,ask:'{T}の ボール、まちがえて もってきちゃった。かえして くれる？'},
 cookie:{kind:'deliver',icon:'🍪',item:'クッキー',reward:35,ask:'クッキーを やいたの。{T}にも おすそわけ したいな。'},
 card:{kind:'deliver',icon:'🎂',item:'おたんじょうびカード',reward:45,ask:'きょうは {T}の おたんじょうび なんだ。カードを とどけて！'},
 water:{kind:'deliver',icon:'🥤',item:'すいとう',reward:30,ask:'{T}、のどが かわいて ないかな。すいとうを もっていって！'},
 shell:{kind:'fetch',spot:'sea',icon:'🐚',item:'かいがら',reward:40,ask:'うみの すなはまに、きれいな かいがらが おちてるよ。ひろって きて！'},
 stone:{kind:'fetch',spot:'river',icon:'🪨',item:'まるい いし',reward:40,ask:'かわらに まるくて すべすべの いしが あるよ。ひろって きて！'},
 flower:{kind:'fetch',spot:'park',icon:'🌼',item:'おはな',reward:35,ask:'こうえんに おはなが さいてるよ。ひとつ もって きて。'},
 bread:{kind:'fetch',spot:'town',icon:'🥐',item:'クロワッサン',reward:40,ask:'まちの パンやさんの まえに、クロワッサンを おいて もらったの。とって きて！'},
 clover:{kind:'fetch',spot:'field',icon:'🍀',item:'よつばの クローバー',reward:50,ask:'はらっぱで よつばの クローバーを みつけたの。とって きて。'},
 apple:{kind:'fetch',spot:'garden',icon:'🍎',item:'りんご',reward:30,ask:'きみの おにわに りんごが おちてたよ。ひとつ わけて くれない？'},
 starfish:{kind:'fetchgive',spot:'sea',icon:'⭐',item:'ヒトデ',reward:50,ask:'うみで ヒトデを ひろって、{T}に みせて あげて！'},
 acorn:{kind:'fetchgive',spot:'park',icon:'🌰',item:'どんぐり',reward:45,ask:'こうえんの どんぐりを ひろって、{T}に とどけて ほしいな。'},
 reply:{kind:'relay',icon:'✉️',item:'おてがみ',reward:55,ask:'{T}に おてがみを とどけて、おへんじを もらって きて くれる？'},
 recipe:{kind:'relay',icon:'📜',item:'レシピ',reward:55,ask:'{T}に レシピを みせて、かんそうを きいて きて！'},
 checkup:{kind:'visit',icon:'👀',item:'',reward:30,ask:'{T}、さいきん げんき かな？ あって ようすを みて きて。'},
 lost:{kind:'lost',icon:'🧣',item:'おとしもの',reward:50,ask:'{T}が おとしものを したんだって。{TA}で ひろって、とどけて あげて！'}
};
// おつかいの間隔: 終えたら3分、ことわったら1分は、次のおつかいを頼まれない
const QUEST_GAP=3*60000,QUEST_GAP_DECLINE=60000;
function npcUnlocked(s,id){const n=NPCS[id];return!!n&&s.owned.includes(n.area);}
function unlockedNpcs(s){return Object.keys(NPCS).filter(id=>npcUnlocked(s,id));}
function spotUnlocked(s,k){return!!SPOTS[k]&&s.owned.includes(SPOTS[k].area);}
// 今の開放状況で出せるおつかいの組み合わせ
function questOptions(s,giver){
 const npcs=unlockedNpcs(s),out=[];if(!npcs.includes(giver))return out;
 for(const [id,q]of Object.entries(QUESTS)){
  const others=npcs.filter(n=>n!==giver);
  if(q.kind==='deliver'||q.kind==='relay'||q.kind==='visit')for(const t of others)out.push({id,giver,target:t,spot:null});
  else if(q.kind==='fetch'){if(spotUnlocked(s,q.spot))out.push({id,giver,target:null,spot:q.spot});}
  else if(q.kind==='fetchgive'){if(spotUnlocked(s,q.spot))for(const t of others)out.push({id,giver,target:t,spot:q.spot});}
  else if(q.kind==='lost')for(const t of others)out.push({id,giver,target:t,spot:NPCS[t].home});
 }
 return out;
}
function questReady(s,now=Date.now()){return!!s.npc&&!s.npc.quest&&now>=(s.npc.next||0);}
function questDecline(s,now=Date.now()){if(s.npc&&!s.npc.quest)s.npc.next=now+QUEST_GAP_DECLINE;}
function newQuest(s,giver,rnd=Math.random){const o=questOptions(s,giver);if(!o.length)return null;const q=o[Math.floor(rnd()*o.length)];return{...q,stage:0};}
// おつかいの手順: [{type:'npc'|'spot', key}]
function questSteps(q){const d=QUESTS[q.id];if(!d)return[];
 if(d.kind==='deliver')return[{type:'npc',key:q.target}];
 if(d.kind==='fetch')return[{type:'spot',key:q.spot},{type:'npc',key:q.giver}];
 if(d.kind==='fetchgive'||d.kind==='lost')return[{type:'spot',key:q.spot},{type:'npc',key:q.target}];
 if(d.kind==='relay')return[{type:'npc',key:q.target},{type:'npc',key:q.giver}];
 if(d.kind==='visit')return[{type:'npc',key:q.target},{type:'npc',key:q.giver}];return[];}
function questText(q){const d=QUESTS[q.id];const T=q.target?NPCS[q.target].name:'',TA=q.target?SPOTS[NPCS[q.target].home].name:'';return d.ask.replace(/\{T\}/g,T).replace(/\{TA\}/g,TA);}
function questObjective(q){const step=questSteps(q)[q.stage];if(!step)return'';const d=QUESTS[q.id];
 if(step.type==='spot')return d.icon+' '+SPOTS[step.key].name+'で '+d.item+'を ひろう';
 const n=NPCS[step.key].name,last=q.stage===questSteps(q).length-1;
 if(d.kind==='visit')return last?'👀 '+n+'に ほうこく する':'👀 '+n+'に あいに いく';
 if(d.kind==='relay'&&last)return'✉️ '+n+'に おへんじを とどける';return d.icon+' '+n+'に '+(d.item||'')+'を とどける';}
// 手順を1つ進める。終わったらコインを渡す
function questStep(s,type,key,now=Date.now()){const q=s.npc.quest;if(!q)return{ok:false};const step=questSteps(q)[q.stage];if(!step||step.type!==type||step.key!==key)return{ok:false};
 q.stage++;if(q.stage<questSteps(q).length)return{ok:true,done:false};
 const d=QUESTS[q.id],coins=d.reward;s.npc.quest=null;s.npc.next=now+QUEST_GAP;s.npc.done=Math.min(999999,s.npc.done+1);addCoins(s,coins);s.bond=clamp(s.bond+2);s.xp=Math.min(1000000,s.xp+5);log(s,'おつかい「'+(d.item||'ようすみ')+'」を やりとげた',now);return{ok:true,done:true,coins,stamps:checkStamps(s)};}
function freshNpc(){return{done:0,quest:null,next:0};}

/* ---- さかなつり（つりざおで、うみと かわの さかなを つる。ずかんに のこる） ---- */
// rare: 1=よく つれる 〜 4=まぼろし。size: つれる大きさ(cm)
const FISH={
 funa:{name:'フナ',where:'river',rare:1,size:[10,25],desc:'かわや いけに すむ、まるっこい さかな。'},
 ayu:{name:'アユ',where:'river',rare:2,size:[12,25],desc:'きれいな かわが だいすき。すいかの ような においが するんだって。'},
 dojo:{name:'ドジョウ',where:'river',rare:1,size:[8,15],desc:'ほそながくて、くちに ひげが ある。どろの なかが すき。'},
 unagi:{name:'ウナギ',where:'river',rare:3,size:[40,80],desc:'にょろにょろ ながい さかな。とおい うみで うまれるよ。'},
 bass:{name:'ブラックバス',where:'river',rare:2,size:[25,50],desc:'おおきな くちで なんでも ぱくっ。'},
 gill:{name:'ブルーギル',where:'river',rare:1,size:[10,20],desc:'ほっぺが あおい、ひらべったい さかな。'},
 angel:{name:'エンゼルフィッシュ',where:'river',rare:3,size:[8,15],desc:'せびれと しりびれが ながい、てんしの ような さかな。'},
 koi:{name:'コイ',where:'river',rare:2,size:[30,70],desc:'くちに ひげが 4ほん。もようが きれい。'},
 ito:{name:'イトウ',where:'river',rare:3,size:[60,120],desc:'まぼろしの おおきな さかな。めったに あえない！'},
 medaka:{name:'メダカ',where:'river',rare:1,size:[2,4],desc:'ちいさくて、めが おおきい。むれで およぐよ。'},
 tai:{name:'タイ',where:'sea',rare:2,size:[25,50],desc:'あかくて きれい。おいわいの ときの さかな。'},
 coela:{name:'シーラカンス',where:'sea',rare:4,size:[100,180],desc:'おおむかしから すがたが かわらない「いきた かせき」。'},
 ebi:{name:'エビ',where:'sea',rare:1,size:[10,20],desc:'ながい ひげと まがった せなか。うしろに ぴょんと にげる。'},
 kani:{name:'カニ',where:'sea',rare:1,size:[10,25],desc:'はさみを ちょきちょき。よこに あるくよ。'},
 tako:{name:'タコ',where:'sea',rare:2,size:[30,60],desc:'あしが 8ほん。すみを はいて にげる。'},
 ika:{name:'イカ',where:'sea',rare:2,size:[20,40],desc:'あしが 10ぽん。からだの いろを かえられる。'},
 maguro:{name:'マグロ',where:'sea',rare:3,size:[100,250],desc:'うみを はやく およぐ、おおきな さかな。'},
 sake:{name:'サケ',where:'sea',rare:2,size:[50,80],desc:'うまれた かわに かえってくる、たびする さかな。'},
 sanma:{name:'サンマ',where:'sea',rare:1,size:[25,35],desc:'ほそながくて ぎんいろ。くちの さきが きいろい。'},
 aji:{name:'アジ',where:'sea',rare:1,size:[15,30],desc:'ぎんいろで、よこに ぎざぎざの うろこが ならぶ。'}
};
const FISH_COINS={1:8,2:15,3:30,4:60},FISH_WEIGHT={1:10,2:4,3:1.3,4:.45};
// どの魚がかかるか（場所ごと、めずらしさで重みづけ）
function pickFish(where,rnd=Math.random){const list=Object.entries(FISH).filter(([k,f])=>f.where===where);let sum=0;for(const [,f]of list)sum+=FISH_WEIGHT[f.rare];let r=rnd()*sum;for(const [k,f]of list){r-=FISH_WEIGHT[f.rare];if(r<=0)return k;}return list[0][0];}
function fishSize(id,rnd=Math.random){const [a,b]=FISH[id].size;return Math.round(a+(b-a)*Math.pow(rnd(),1.6));}
// つれた魚を記録する（はじめての魚はコインが多め）
function catchFish(s,id,size,now=Date.now()){const f=FISH[id],before=level(s);if(!f||!s.owned.includes('gear_rod'))return{ok:false};size=Math.max(1,Math.min(1000,Math.round(size)));
 const prev=s.fish[id],first=!prev,record=!first&&size>prev.big;s.fish[id]={n:Math.min(99999,(prev?prev.n:0)+1),big:Math.max(prev?prev.big:0,size)};
 const coins=FISH_COINS[f.rare]+(first?10:0);addCoins(s,coins);s.joy=clamp(s.joy+3);s.xp=Math.min(1000000,s.xp+3);if(first)log(s,'はじめて '+f.name+'を つった（'+size+'cm）',now);
 const lv=level(s);if(lv>before)addCoins(s,lv*10,false);return{ok:true,first,record,coins,size,levelUp:lv>before?lv:0,stamps:checkStamps(s)};}

const levelXp=n=>10*n*(n-1);
function level(s){let n=1;while(n<60&&s.xp>=levelXp(n+1))n++;return n;}
function levelProgress(s){const n=level(s),a=levelXp(n),b=levelXp(n+1);return{level:n,current:s.xp-a,need:b-a,ratio:clamp((s.xp-a)/(b-a),0,1)};}

const STAMPS={
 first_meal:{name:'はじめてのごはん',icon:'🍚',test:s=>s.counts.meals>=1},
 meals20:{name:'ごはん20回',icon:'🍱',test:s=>s.counts.meals>=20},
 first_walk:{name:'はじめてのおさんぽ',icon:'🌿',test:s=>s.counts.walks>=1},
 all_courses:{name:'5つの道を制覇',icon:'🗺',test:s=>Object.entries(COURSES).filter(([k,c])=>!c.unlock).every(([k])=>s.best['walk_'+k]!==undefined)},
 all_games:{name:'あそびの達人',icon:'🎪',test:s=>Object.entries(GAMES).filter(([k,g])=>!k.startsWith('walk_')&&!g.unlock).every(([k])=>s.best[k]!==undefined)},
 flyer:{name:'空とぶ柴犬',icon:'🪽',test:s=>s.best.sky!==undefined},
 toybox:{name:'おもちゃばこ',icon:'🧸',test:s=>s.owned.filter(id=>ITEMS[id]?.slot==='toy').length>=4},
 explorer:{name:'ひろいおうち',icon:'🏞',test:s=>s.owned.includes('area_field')},
 helper:{name:'おつかい名人',icon:'🎒',test:s=>s.npc&&s.npc.done>=10},
 traveler:{name:'おでかけ名人',icon:'🧭',test:s=>['area_park','area_town','area_sea','area_river'].every(id=>s.owned.includes(id))},
 collector:{name:'ひみつ道具あつめ',icon:'🎒',test:s=>s.owned.filter(id=>ITEMS[id]?.slot==='gear').length>=3},
 first_star3:{name:'はじめての★3',icon:'⭐',test:s=>Object.values(s.stars).some(v=>v>=3)},
 star3x5:{name:'★3を5つ',icon:'🌟',test:s=>Object.values(s.stars).filter(v=>v>=3).length>=5},
 pets50:{name:'なでなで50回',icon:'🤲',test:s=>s.counts.pets>=50},
 bath5:{name:'おふろ好き',icon:'🛁',test:s=>s.counts.baths>=5},
 lessons10:{name:'がんばり屋さん',icon:'📖',test:s=>s.counts.lessons>=10},
 all_tricks:{name:'技マスター',icon:'🎓',test:s=>Object.keys(TRICKS).every(k=>s.tricks[k]>=60)},
 junior:{name:'若犬になった',icon:'🌱',test:s=>s.ageMs>=2*DAY},
 adult:{name:'りっぱな成犬',icon:'🌳',test:s=>s.ageMs>=5*DAY},
 level5:{name:'レベル5',icon:'5️⃣',test:s=>level(s)>=5},
 level10:{name:'レベル10',icon:'🔟',test:s=>level(s)>=10},
 shopper:{name:'はじめてのおかいもの',icon:'🛍',test:s=>s.owned.some(id=>!STARTER.includes(id))},
 fashion:{name:'おしゃれさん',icon:'👗',test:s=>['neck','head','face'].every(k=>s.equipped[k])},
 decorator:{name:'おへやづくり',icon:'🏡',test:s=>s.deco.filter(id=>ITEMS[id]?.slot==='deco').length>=3},
 streak3:{name:'3日つづけて',icon:'📅',test:s=>s.daily.streak>=3},
 streak7:{name:'1週間なかよし',icon:'🗓',test:s=>s.daily.streak>=7},
 rich:{name:'コイン500枚',icon:'💰',test:s=>s.coinsEarned>=500},
 bond100:{name:'こころの友',icon:'💖',test:s=>s.bond>=100},
 angler:{name:'はじめての つり',icon:'🎣',test:s=>Object.keys(s.fish||{}).length>=1},
 fish10:{name:'さかな はかせ',icon:'🐟',test:s=>Object.keys(s.fish||{}).length>=10},
 fishall:{name:'ずかん コンプリート',icon:'🏆',test:s=>Object.keys(s.fish||{}).length>=Object.keys(FISH).length}
};
const STAMP_REWARD=20;

/* ---- 状態 ---- */
function fresh(now=Date.now()){return{name:'こむぎ',coat:'brown',createdAt:now,lastSeen:now,ageMs:0,fullness:64,joy:75,clean:78,energy:85,bond:5,training:0,xp:0,counts:Object.fromEntries(COUNTS.map(k=>[k,0])),journal:[],sound:true,
 music:true,coins:50,coinsEarned:0,owned:[...STARTER],equipped:{collar:null,neck:null,head:null,face:null,rug:'rug_basic',bed:'bed_basic',wall:'wall_basic'},deco:[],
 best:{},stars:{},tricks:Object.fromEntries(Object.keys(TRICKS).map(k=>[k,0])),stamps:[],daily:{day:'',missions:[],streak:0,played:[]},tutorial:false,npc:freshNpc(),fish:{}};}
function clone(s){return JSON.parse(JSON.stringify(s));}
function advance(s,now=Date.now()){
 const ms=clamp(now-s.lastSeen,0,48*HOUR),h=ms/HOUR;
 s.ageMs=Math.min(30*DAY,s.ageMs+ms);s.lastSeen=Math.max(s.lastSeen,now);
 s.fullness=Math.max(20,s.fullness-h*1.5);s.joy=Math.max(25,s.joy-h*.65);s.clean=Math.max(25,s.clean-h*.9);s.energy=Math.min(100,s.energy+h*2);return ms;
}
function stage(s){return s.ageMs<2*DAY?'puppy':s.ageMs<5*DAY?'junior':'adult';}
function mood(s){return s.energy<22||s.clean<28?'grumpy':s.joy<38||s.fullness<28?'sad':'happy';}
function need(s){const list=[['fullness',45,'hungry'],['clean',45,'dirty'],['energy',35,'tired'],['joy',45,'bored']].filter(([k,lim])=>s[k]<lim).sort((a,b)=>s[a[0]]-s[b[0]]);return list[0]?.[2]||null;}
function log(s,msg,now=Date.now()){s.journal.unshift({at:now,text:String(msg).slice(0,100)});s.journal=s.journal.slice(0,30);}

/* ---- 毎日のおねがい ---- */
function dayKey(now=Date.now()){const d=new Date(now);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function hashStr(str){let h=2166136261;for(const ch of str){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function ensureDaily(s,now=Date.now()){
 const key=dayKey(now);if(s.daily.day===key)return null;
 const prev=s.daily.day,yesterday=dayKey(now-DAY);
 s.daily.streak=prev===yesterday?Math.min(999,s.daily.streak+1):1;
 const ids=Object.keys(MISSIONS),picked=[];let h=hashStr(key+s.createdAt);
 while(picked.length<3){h=Math.imul(h^(h>>>15),2246822507)>>>0;const id=ids[h%ids.length];if(!picked.includes(id))picked.push(id);}
 s.daily.day=key;s.daily.missions=picked.map(id=>({id,progress:0,done:false,claimed:false}));s.daily.played=[];
 const bonus=10+Math.min(7,s.daily.streak)*5;addCoins(s,bonus);
 return{streak:s.daily.streak,bonus};
}
function track(s,event,amount=1){
 const changed=[];
 for(const m of s.daily.missions){const def=MISSIONS[m.id];if(!def||m.done||def.event!==event)continue;m.progress=Math.min(def.goal,m.progress+amount);if(m.progress>=def.goal){m.done=true;changed.push(m.id);}}
 return changed;
}
function claimMission(s,id){const m=s.daily.missions.find(x=>x.id===id);if(!m||!m.done||m.claimed)return 0;m.claimed=true;let gain=MISSION_REWARD;if(s.daily.missions.every(x=>x.claimed))gain+=MISSION_BONUS;addCoins(s,gain,false);return gain;}
function addCoins(s,n,countMission=true){n=Math.max(0,Math.round(n));s.coins=Math.min(9999999,s.coins+n);s.coinsEarned=Math.min(99999999,s.coinsEarned+n);if(countMission)track(s,'coin',n);return n;}

function checkStamps(s){const got=[];for(const [id,def]of Object.entries(STAMPS))if(!s.stamps.includes(id)&&def.test(s)){s.stamps.push(id);addCoins(s,STAMP_REWARD,false);got.push(id);}return got;}

/* ---- 行動 ---- */
function lessonChance(s,trick){const p=s.tricks[trick]||0,m=mood(s);return clamp(.5+p/100*.45+(m==='happy'?.05:m==='sad'?-.08:-.15),.3,.97);}
function trickUnlocked(s,trick){return!!TRICKS[trick]&&level(s)>=TRICKS[trick].level;}
function act(s,type,arg,now=Date.now()){
 advance(s,now);ensureDaily(s,now);
 const before=level(s);let r={ok:false};
 if(type==='feed'){
  const foods={meal:[27,3,'ごはん'],snack:[12,9,'おやつ'],milk:[18,5,'ミルク'],meat:[30,7,'おにく'],fish:[24,8,'おさかな']},f=foods[arg];if(!f)return{ok:false};
  if(s.fullness>=88)return{ok:false,message:'おなか いっぱい。あとで たべようね。',reaction:'full'};
  s.fullness=clamp(s.fullness+f[0]);s.joy=clamp(s.joy+f[1]);s.counts.meals++;s.xp+=2;log(s,f[2]+'をおいしく食べた',now);track(s,'feed');r={ok:true,message:f[2]+'、おいしい！',reaction:'eat'};
 }else if(type==='pet'){
  const m=mood(s);s.counts.pets++;s.bond=clamp(s.bond+1);s.joy=clamp(s.joy+(m==='happy'?3:1));track(s,'pet');
  r={ok:true,message:m==='happy'?'だいすき！ なでなで、うれしいな。':m==='sad'?'くぅん…そばにいてくれてありがとう。':'むぅ… すこし やすみたいな。',reaction:m};
 }else if(type==='bath'){
  s.clean=100;s.joy=clamp(s.joy+8);s.bond=clamp(s.bond+2);s.counts.baths++;s.xp+=5;log(s,'おふろでふわふわになった',now);track(s,'bath');r={ok:true,message:'ぴかぴか、ふわふわ！',reaction:'bath'};
 }else if(type==='lesson'){
  const t=TRICKS[arg];if(!t)return{ok:false};
  s.tricks[arg]=clamp(s.tricks[arg]+10);s.training=clamp(s.training+5);s.bond=clamp(s.bond+3);s.joy=clamp(s.joy+5);s.counts.lessons++;s.xp+=6;log(s,'「'+t.name+'」が上手にできた',now);track(s,'lesson');
  r={ok:true,message:'できたね！ とっても じょうず。',reaction:'happy'};
 }else if(type==='lessonMiss'){
  if(!TRICKS[arg])return{ok:false};s.tricks[arg]=clamp(s.tricks[arg]+3);r={ok:true,message:'おしい！ もういちどやってみよう。',reaction:'idle'};
 }else if(type==='rest'){
  s.energy=clamp(s.energy+24);s.joy=clamp(s.joy+3);track(s,'rest');r={ok:true,message:'ひとやすみ。げんきが もどったよ。',reaction:'sleep'};
 }else if(type==='fetch'){
  s.joy=clamp(s.joy+4);s.bond=clamp(s.bond+1);s.energy=clamp(s.energy-2);r={ok:true,message:'ボール、とってきたよ！',reaction:'happy'};
 }else return{ok:false};
 r.levelUp=level(s)>before?level(s):0;r.stamps=checkStamps(s);return r;
}
function starsFor(key,raw){const g=GAMES[key];if(!g)return 0;return g.stars.filter(v=>raw>=v).length;}
function reward(s,key,raw,difficulty='gentle',now=Date.now()){
 const g=GAMES[key];if(!g)throw Error('unknown game');if(!unlocked(s,key))throw Error('locked game');
 advance(s,now);ensureDaily(s,now);
 raw=Math.max(0,Math.min(100000,Math.round(raw)));
 const stars=starsFor(key,raw),norm=clamp(stars*5+Math.min(5,raw/Math.max(1,g.stars[2])*5),0,20),before=level(s);
 if(g.kind==='walk'){s.counts.walks++;s.clean=clamp(s.clean-8);s.energy=clamp(s.energy-9);track(s,'walk');}else{s.counts.plays++;s.energy=clamp(s.energy-6);track(s,'play');}
 s.fullness=clamp(s.fullness-6);s.joy=clamp(s.joy+10+norm/2);s.bond=clamp(s.bond+4);
 const xp=8+Math.floor(norm);s.xp=Math.min(1000000,s.xp+xp);
 const mult={gentle:1,normal:1.15,challenge:1.3}[difficulty]||1,coins=Math.round((5+norm*1.2+stars*3)*mult);
 const prevBest=s.best[key],newBest=prevBest===undefined||raw>prevBest;if(newBest)s.best[key]=raw;
 const prevStars=s.stars[key]||0;if(stars>prevStars)s.stars[key]=stars;
 if(!s.daily.played.includes(key)){s.daily.played.push(key);track(s,'variety');}
 if(stars>=3)track(s,'star3');
 addCoins(s,coins);
 log(s,g.name+'で楽しく過ごした'+(stars?'（★'+stars+'）':''),now);
 const lv=level(s);if(lv>before)addCoins(s,lv*10,false);
 const stamps=checkStamps(s);
 return{raw,stars,coins,xp,newBest,prevBest,levelUp:lv>before?lv:0,stamps,norm};
}

/* ---- ショップ ---- */
function buy(s,id){const it=ITEMS[id];if(!it||it.retired)return{ok:false,message:'その品物はありません。'};if(s.owned.includes(id))return{ok:false,message:'もう持っているよ。'};if(it.level&&level(s)<it.level)return{ok:false,message:'レベル'+it.level+'から買えるよ。'};if(it.needs&&!s.owned.includes(it.needs))return{ok:false,message:'先に「'+ITEMS[it.needs].name+'」を買ってね。'};if(s.coins<it.price)return{ok:false,message:'コインが足りないよ。あそんで集めよう！'};
 s.coins-=it.price;s.owned.push(id);
 // きせかえはクローゼットへしまう。おへや・お庭のものはすぐ置く。
 let message=it.name+'を手に入れた！';
 if(WEAR_SLOTS.includes(it.slot))message=it.name+'をクローゼットにしまったよ。';
 else if(!OWN_SLOTS.includes(it.slot))equip(s,id);
 if(it.slot==='gear')message=it.name+'を手に入れた！ '+(it.desc||'');
 if(it.slot==='area')message=it.name+'ができたよ！ おうちが広くなった。';
 log(s,it.name+'を手に入れた');return{ok:true,message,stamps:checkStamps(s)};}
function equip(s,id){const it=ITEMS[id];if(!it||!s.owned.includes(id))return false;
 if(it.retired){if(s.equipped[it.slot]===id)s.equipped[it.slot]=null;return true;}
 if(OWN_SLOTS.includes(it.slot))return true;
 if(MULTI_SLOTS.includes(it.slot)){const i=s.deco.indexOf(id);if(i>=0)s.deco.splice(i,1);else s.deco.push(id);}
 else if(WEAR_SLOTS.includes(it.slot)&&s.equipped[it.slot]===id)s.equipped[it.slot]=null;
 else s.equipped[it.slot]=id;
 checkStamps(s);return true;}

/* ---- 保存・検査・移行 ---- */
function migrateV2(old,now=Date.now()){
 const s=fresh(now);for(const k of ['name','coat','createdAt','lastSeen','ageMs','xp','sound',...STATS])s[k]=old[k];
 s.counts={...old.counts};s.journal=old.journal.slice(0,30);s.music=false;s.tutorial=true;s.coins=50+Math.min(300,old.xp);
 s.tricks.sit=Math.min(60,old.training);s.tricks.paw=Math.min(60,old.training);return s;
}
function validateV2(s,now){
 const fail=()=>{throw new Error('このバックアップは読み込めません。形式・値・バージョンを確認してください。');};
 const allowed=['name','coat','createdAt','lastSeen','ageMs','fullness','joy','clean','energy','bond','training','xp','counts','journal','sound'];
 if(Object.keys(s).some(k=>!allowed.includes(k))||allowed.some(k=>!Object.prototype.hasOwnProperty.call(s,k)))fail();
 baseChecks(s,now,12,fail);
}
function baseChecks(s,now,journalMax,fail){
 if(typeof s.name!=='string'||!s.name.trim()||Array.from(s.name).length>16||/[\u0000-\u001f\u007f]/.test(s.name)||!['black','brown','white'].includes(s.coat)||typeof s.sound!=='boolean')fail();
 for(const k of STATS)if(!Number.isFinite(s[k])||s[k]<0||s[k]>100)fail();
 for(const k of ['createdAt','lastSeen'])if(!Number.isSafeInteger(s[k])||s[k]<0||s[k]>now+DAY)fail();
 if(!Number.isSafeInteger(s.ageMs)||s.ageMs<0||s.ageMs>30*DAY||!Number.isSafeInteger(s.xp)||s.xp<0||s.xp>1000000)fail();
 if(!s.counts||typeof s.counts!=='object'||Array.isArray(s.counts)||Object.keys(s.counts).length!==COUNTS.length)fail();
 for(const k of COUNTS)if(!Number.isSafeInteger(s.counts[k])||s.counts[k]<0||s.counts[k]>1000000)fail();
 if(!Array.isArray(s.journal)||s.journal.length>journalMax)fail();
 for(const row of s.journal)if(!row||typeof row!=='object'||Object.keys(row).length!==2||!Number.isSafeInteger(row.at)||row.at<0||row.at>now+DAY||typeof row.text!=='string'||row.text.length>100||/[\u0000-\u001f]/.test(row.text))fail();
}
const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
function validateV3(s,now){
 const fail=()=>{throw new Error('このバックアップは読み込めません。形式・値・バージョンを確認してください。');};
 const allowed=Object.keys(fresh());
 if(Object.keys(s).some(k=>!allowed.includes(k))||allowed.some(k=>!Object.prototype.hasOwnProperty.call(s,k)))fail();
 baseChecks(s,now,30,fail);
 if(typeof s.music!=='boolean'||typeof s.tutorial!=='boolean')fail();
 for(const k of ['coins','coinsEarned'])if(!Number.isSafeInteger(s[k])||s[k]<0||s[k]>99999999)fail();
 if(!Array.isArray(s.owned)||s.owned.length>Object.keys(ITEMS).length||new Set(s.owned).size!==s.owned.length||s.owned.some(id=>!ITEMS[id]))fail();
 if(!isObj(s.equipped)||Object.keys(s.equipped).length!==WEAR_SLOTS.length+ROOM_SLOTS.length)fail();
 for(const slot of [...WEAR_SLOTS,...ROOM_SLOTS]){const v=s.equipped[slot];if(v===null&&WEAR_SLOTS.includes(slot))continue;if(typeof v!=='string'||!ITEMS[v]||ITEMS[v].slot!==slot||!s.owned.includes(v))fail();}
 if(!Array.isArray(s.deco)||new Set(s.deco).size!==s.deco.length||s.deco.some(id=>!ITEMS[id]||!MULTI_SLOTS.includes(ITEMS[id].slot)||!s.owned.includes(id)))fail();
 if(!isObj(s.best)||!isObj(s.stars))fail();
 for(const [k,v]of Object.entries(s.best))if(!GAMES[k]||!Number.isSafeInteger(v)||v<0||v>100000)fail();
 for(const [k,v]of Object.entries(s.stars))if(!GAMES[k]||!Number.isSafeInteger(v)||v<0||v>3)fail();
 if(!isObj(s.tricks)||Object.keys(s.tricks).length!==Object.keys(TRICKS).length)fail();
 for(const k of Object.keys(TRICKS))if(!Number.isFinite(s.tricks[k])||s.tricks[k]<0||s.tricks[k]>100)fail();
 if(!Array.isArray(s.stamps)||new Set(s.stamps).size!==s.stamps.length||s.stamps.some(id=>!STAMPS[id]))fail();
 const d=s.daily;if(!isObj(d)||Object.keys(d).length!==4||typeof d.day!=='string'||!(d.day===''||/^\d{4}-\d{2}-\d{2}$/.test(d.day))||!Number.isSafeInteger(d.streak)||d.streak<0||d.streak>999)fail();
 if(!Array.isArray(d.missions)||d.missions.length>3||!Array.isArray(d.played)||d.played.length>Object.keys(GAMES).length||d.played.some(k=>!GAMES[k]))fail();
 for(const m of d.missions)if(!isObj(m)||Object.keys(m).length!==4||!MISSIONS[m.id]||!Number.isSafeInteger(m.progress)||m.progress<0||m.progress>MISSIONS[m.id].goal||typeof m.done!=='boolean'||typeof m.claimed!=='boolean')fail();
 const n=s.npc;if(!isObj(n)||Object.keys(n).length!==3||!Number.isSafeInteger(n.done)||n.done<0||n.done>999999||!Number.isSafeInteger(n.next)||n.next<0)fail();
 if(!isObj(s.fish)||Object.keys(s.fish).length>Object.keys(FISH).length)fail();
 for(const [k,v]of Object.entries(s.fish))if(!FISH[k]||!isObj(v)||Object.keys(v).length!==2||!Number.isSafeInteger(v.n)||v.n<1||v.n>99999||!Number.isSafeInteger(v.big)||v.big<1||v.big>1000)fail();
 if(n.quest!==null){const q=n.quest;if(!isObj(q)||Object.keys(q).length!==5||!QUESTS[q.id]||!NPCS[q.giver]||!(q.target===null||NPCS[q.target])||!(q.spot===null||SPOTS[q.spot])||!Number.isSafeInteger(q.stage)||q.stage<0||q.stage>=questSteps(q).length)fail();}
}
function validate(obj,now=Date.now()){
 if(!obj||obj.app!==APP||!obj.state||!isObj(obj.state))throw new Error('このバックアップは読み込めません。形式・値・バージョンを確認してください。');
 if(obj.schemaVersion===2){validateV2(obj.state,now);return migrateV2(clone(obj.state),now);}
 if(obj.schemaVersion!==VERSION)throw new Error('このバックアップは読み込めません。形式・値・バージョンを確認してください。');
 // おつかい機能より前に保存した記録には npc が無いので、空の状態を足してから確かめる
 const st=clone(obj.state);if(!Object.prototype.hasOwnProperty.call(st,'npc'))st.npc=freshNpc();
 // つり機能より前の記録: つった魚の記録とおつかいの間隔を足す。間隔は時計がずれても長く待たせない
 if(!Object.prototype.hasOwnProperty.call(st,'fish'))st.fish={};
 if(isObj(st.npc)&&!Object.prototype.hasOwnProperty.call(st.npc,'next'))st.npc.next=0;
 if(isObj(st.npc)&&Number.isSafeInteger(st.npc.next)&&st.npc.next>now+QUEST_GAP)st.npc.next=now;
 validateV3(st,now);const out=st;for(const id of STARTER)if(!out.owned.includes(id))out.owned.push(id);return out;
}
function pack(s){return{app:APP,schemaVersion:VERSION,exportedAt:new Date().toISOString(),state:clone(s)};}

const api={VERSION,APP,HOUR,DAY,COURSES,GAMES,TRICKS,ITEMS,WEAR_SLOTS,ROOM_SLOTS,MISSIONS,STAMPS,MISSION_REWARD,MISSION_BONUS,clamp,fresh,clone,advance,stage,mood,need,act,reward,starsFor,validate,pack,level,levelXp,levelProgress,ensureDaily,track,claimMission,addCoins,checkStamps,lessonChance,trickUnlocked,buy,equip,dayKey,migrateV2,unlocked,MULTI_SLOTS,OWN_SLOTS,NPCS,SPOTS,QUESTS,npcUnlocked,unlockedNpcs,spotUnlocked,questOptions,newQuest,questSteps,questText,questObjective,questStep,questReady,questDecline,QUEST_GAP,QUEST_GAP_DECLINE,FISH,FISH_COINS,pickFish,fishSize,catchFish};
root.ShibaCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

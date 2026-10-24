'use strict';
// ビルド・テストに使うNode.jsの確認。2026-10-21のNode.jsセキュリティ更新（10件、最大High）の修正版以上でなければ止める。
// 修正版: 26.12.1 / 24.22.1 / 22.23.4（それより古い系列はサポート終了のため不可）
const FIXED={26:[12,1],24:[22,1],22:[23,4]};
function checkNode(version=process.versions.node){
 const [maj,min,pat]=version.split('.').map(Number),need=FIXED[maj];
 if(!need){const ok=maj>26;return{ok,message:ok?'':'Node.js v'+version+' はサポート外の系列です。26.12.1 / 24.22.1 / 22.23.4 以上に更新してください。'};}
 const ok=min>need[0]||(min===need[0]&&pat>=need[1]);
 return{ok,message:ok?'':'Node.js v'+version+' は脆弱性の修正前です。v'+maj+'.'+need.join('.')+' 以上に更新してください。'};
}
function requireFixedNode(){const r=checkNode();if(!r.ok){console.error(r.message);process.exit(1);}}
module.exports={FIXED,checkNode,requireFixedNode};
if(require.main===module){const r=checkNode();console.log(r.ok?'OK: Node.js v'+process.versions.node+' は修正版です。':r.message);process.exitCode=r.ok?0:1;}

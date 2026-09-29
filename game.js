// ================= game.js : วงกลมสู้ศึก (Black/White Theme) =================
const http = require('http');
const os = require('os');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const MAXMSG = 800000;
const MAXCONN = 300;

// ============ USER ACCOUNTS ============
const USERS_FILE = path.join(__dirname, 'users.json');
let users = {};
try { users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch(e) { users = {}; }
function saveUsers() { try { fs.writeFileSync(USERS_FILE, JSON.stringify(users)); } catch(e) {} }
function hashKey(name, passkey) {
  return crypto.createHash('sha256').update(name.toLowerCase() + '::' + passkey).digest('hex');
}

// ============ ROOMS (in-memory) ============
const rooms = new Map(); // id -> { id, mode, size, bossType, hostId, hostName, hostWins, peers:[], createdAt }
let roomSeq = 0;
function cleanRooms() {
  const now = Date.now();
  rooms.forEach((r, id) => {
    if (r.peers.length === 0 && now - r.createdAt > 60000) rooms.delete(id);
    else if (now - r.createdAt > 30 * 60 * 1000 && r.peers.length < r.size) rooms.delete(id);
  });
}
setInterval(cleanRooms, 30000);

// ============ LEADERBOARD (server-side, per account) ============
const LB_FILE = path.join(__dirname, 'leaderboard.json');
const leaderboard = [];
function loadLB() {
  try {
    const arr = JSON.parse(fs.readFileSync(LB_FILE, 'utf8'));
    if (Array.isArray(arr)) arr.forEach(e => {
      if (e && typeof e.name === 'string') leaderboard.push({ name: String(e.name).slice(0,16), wins: Math.max(0,Math.floor(Number(e.wins)||0)) });
    });
    leaderboard.sort((a,b)=>b.wins-a.wins);
  } catch(e){}
}
function saveLB() { try { fs.writeFileSync(LB_FILE, JSON.stringify(leaderboard)); } catch(e){} }
function updateLB(name, wins) {
  let e = leaderboard.find(x => x.name === name);
  if (e) e.wins = Math.max(e.wins, wins);
  else leaderboard.push({ name, wins });
  leaderboard.sort((a,b)=>b.wins-a.wins);
  if (leaderboard.length > 50) leaderboard.length = 50;
  saveLB();
}
loadLB();

const HTML = String.raw`<!DOCTYPE html>
<html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">
<title>◉ วงกลมสู้ศึก</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;padding:0;background:#08080c;color:#e8e8ee;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;min-height:100vh;overflow-x:hidden}
body{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}
#bgfx{position:fixed;inset:0;pointer-events:none;z-index:0}
.screen{display:none;position:relative;z-index:1;padding:14px;max-width:560px;margin:auto;min-height:calc(100vh - 40px)}
.screen.on{display:block}
#battle{max-width:900px;padding:6px}
h1{text-align:center;margin:16px 0 20px;font-weight:700;letter-spacing:.12em;font-size:24px;color:#fff;
  text-shadow:0 0 30px rgba(255,255,255,.35),0 0 60px rgba(255,255,255,.15)}
h1::before{content:'◯ ';opacity:.5;font-weight:400}
h3{margin:16px 0 8px;font-size:13px;letter-spacing:.08em;color:#cfcfd8;font-weight:600;text-align:center;text-transform:uppercase}
button{background:rgba(20,20,26,.92);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:12px;
  padding:11px 16px;font-size:15px;margin:3px;font-family:inherit;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  transition:transform .1s,background .2s,border-color .2s,box-shadow .2s;backdrop-filter:blur(8px)}
button:hover{background:rgba(40,40,50,.95);border-color:rgba(255,255,255,.35);box-shadow:0 0 18px rgba(255,255,255,.12)}
button:active{transform:scale(.96)}
button.on{background:linear-gradient(180deg,#f8f8fa,#c8c8d2);color:#0a0a0f;border-color:#fff;box-shadow:0 0 22px rgba(255,255,255,.4)}
button:disabled{opacity:.35;cursor:not-allowed}
button:disabled:hover{background:rgba(20,20,26,.92);border-color:rgba(255,255,255,.18)}
button.big{display:flex;width:100%;padding:14px;font-size:15px;margin:8px 0;
  background:linear-gradient(180deg,rgba(240,240,248,.98),rgba(180,180,195,.9));color:#0a0a0f;
  border-color:rgba(255,255,255,.5);letter-spacing:.04em;font-weight:700}
button.big:hover{background:linear-gradient(180deg,#fff,#d8d8e2);box-shadow:0 0 26px rgba(255,255,255,.35)}
button.big.gray{background:rgba(20,20,26,.92);color:#e8e8ee;border-color:rgba(255,255,255,.18)}
button.big.gray:hover{background:rgba(40,40,50,.95)}
button.big.dark{background:linear-gradient(180deg,rgba(30,25,40,.95),rgba(15,12,20,.95));border-color:rgba(180,140,255,.4);color:#e8dcff}
button.big.red{background:linear-gradient(180deg,rgba(60,10,20,.95),rgba(30,5,10,.95));border-color:rgba(255,120,140,.4);color:#ffd0d8}
button.big.cyan{background:linear-gradient(180deg,rgba(10,40,50,.95),rgba(5,20,30,.95));border-color:rgba(120,220,255,.4);color:#c8f0ff}
button.big.purple{background:linear-gradient(180deg,rgba(40,15,60,.95),rgba(20,8,30,.95));border-color:rgba(200,140,255,.4);color:#e8d0ff}
button.big.gold{background:linear-gradient(180deg,rgba(60,45,10,.95),rgba(30,22,5,.95));border-color:rgba(255,215,120,.5);color:#fff0c8}
button.green{background:linear-gradient(180deg,rgba(20,60,40,.95),rgba(10,30,20,.95));border-color:rgba(120,255,180,.4)}
button.red{background:rgba(50,15,25,.9);border-color:rgba(255,120,140,.35)}
button.warn{background:rgba(60,50,15,.9);border-color:rgba(255,220,120,.35)}
button.num{padding:14px 18px;font-size:22px;font-weight:700;min-width:60px;
  background:linear-gradient(180deg,rgba(30,30,40,.95),rgba(15,15,22,.95));border-color:rgba(255,255,255,.2)}
input[type=text],input[type=password]{width:100%;padding:12px;border-radius:10px;
  border:1px solid rgba(255,255,255,.2);background:rgba(10,10,15,.9);color:#fff;font-size:16px;font-family:inherit;letter-spacing:.05em}
input[type=text]:focus,input[type=password]:focus{outline:0;border-color:rgba(255,255,255,.6);box-shadow:0 0 0 3px rgba(255,255,255,.12)}
.card{display:flex;align-items:center;gap:10px;background:rgba(15,15,20,.85);border:1px solid rgba(255,255,255,.14);
  border-radius:14px;padding:12px;margin:8px 0;transition:border-color .2s,box-shadow .2s;backdrop-filter:blur(8px)}
.card.act{border-color:rgba(255,255,255,.6);box-shadow:0 0 20px rgba(255,255,255,.18)}
.card canvas{width:64px;height:64px;border-radius:50%;background:#0a0a0f;border:2px solid rgba(255,255,255,.25);flex-shrink:0}
.card .info{flex:1;font-size:13.5px;line-height:1.6;min-width:0;word-break:break-word;color:#d8d8e0}
.card .actions{display:flex;flex-direction:column;gap:4px;flex-shrink:0}
.card .actions button{padding:7px 10px;font-size:12px;margin:0;min-width:64px}
.card .empty{flex:1;text-align:center;padding:6px 0}
.menu-grid{display:grid;grid-template-columns:1fr;gap:10px;margin-top:14px}
.menu-card{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;padding:18px 16px;
  background:linear-gradient(135deg,rgba(20,20,28,.95),rgba(12,12,18,.95));
  border:1px solid rgba(255,255,255,.14);border-radius:16px;cursor:pointer;
  transition:transform .15s,border-color .25s,box-shadow .25s;backdrop-filter:blur(10px)}
.menu-card:hover{border-color:rgba(255,255,255,.4);box-shadow:0 0 30px rgba(255,255,255,.12);transform:translateY(-2px)}
.menu-card:active{transform:scale(.98)}
.menu-card .mc-icon{width:52px;height:52px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);font-size:26px}
.menu-card .mc-meta{flex:1;min-width:0}
.menu-card .mc-title{font-size:16px;font-weight:700;letter-spacing:.04em;color:#fff}
.menu-card .mc-sub{font-size:12px;color:#9a9aa8;margin-top:3px}
.menu-card .mc-arrow{font-size:20px;color:#7a7a88;flex-shrink:0}
.cwrap{position:relative;width:288px;height:288px;margin:14px auto;border-radius:50%;overflow:hidden;
  border:2px dashed rgba(255,255,255,.35);
  background:repeating-conic-gradient(rgba(255,255,255,.03) 0 25%,rgba(0,0,0,0) 0 50%) 0 0/24px 24px;
  box-shadow:0 0 30px rgba(255,255,255,.1) inset}
#dc{width:288px;height:288px;touch-action:none;image-rendering:pixelated;display:block}
.bar2{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px;margin:4px 0}
#fbar,#efbar{display:flex;flex-wrap:wrap;justify-content:center;gap:4px}
#fbar button,#efbar button{min-width:36px;padding:8px}
.sk{background:rgba(12,12,18,.85);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:12px;margin:8px 0}
.row{display:flex;align-items:center;gap:10px;font-size:13px;margin:6px 0}
.row span{width:170px;color:#b8b8c8}
.row input[type=range]{flex:1;accent-color:#fff}
.row b{width:44px;text-align:right;color:#fff;font-variant-numeric:tabular-nums}
.hud{display:flex;gap:4px;margin-bottom:6px;flex-wrap:nowrap}
.hb{flex:1;min-width:0;font-size:10px;line-height:1.3}
.hb>b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#d8d8e0;font-size:11px}
.hb .bar{height:10px;border-radius:5px;background:rgba(10,10,15,.9);border:1px solid rgba(255,255,255,.14);overflow:hidden}
.hb .bar i{display:block;height:100%;background:linear-gradient(90deg,#fff,#a8a8b8);transition:width .15s linear}
.hb.me .bar{border-color:rgba(255,255,255,.7);box-shadow:0 0 10px rgba(255,255,255,.4)}
.hb.me>b{color:#fff}
.hb.boss .bar i{background:linear-gradient(90deg,#5a0000,#ff3355)}
.hb.boss>b{color:#ff5566}
.hb.boss.rage .bar i{background:linear-gradient(90deg,#ff0000,#fff,#ff0000);background-size:200% 100%;animation:rageBar .6s linear infinite}
.hb.boss.rage>b{color:#ff2244;text-shadow:0 0 8px #ff2244}
@keyframes rageBar{from{background-position:0% 0}to{background-position:200% 0}}
.hb small{font-size:10px;opacity:.7;color:#b8b8c8}
#bc{width:100%;max-width:360px;display:block;margin:auto;border-radius:14px;box-shadow:0 0 40px rgba(255,255,255,.1)}
#res,#wait{display:none;position:fixed;inset:0;background:rgba(5,5,10,.94);z-index:9;text-align:center;padding-top:30vh;font-size:24px;backdrop-filter:blur(8px)}
#toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(10,10,15,.95);padding:12px 20px;border-radius:22px;
  border:1px solid rgba(255,255,255,.25);display:none;z-index:99;font-size:14px;backdrop-filter:blur(8px);
  box-shadow:0 0 24px rgba(255,255,255,.15);color:#fff;max-width:90vw;text-align:center}
#cnt{text-align:center;font-size:13px;opacity:.85;margin:8px 0;color:#b8b8c8}
.tag{display:inline-block;padding:2px 9px;border-radius:8px;font-size:11px;background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.18);margin-left:4px;vertical-align:middle;color:#e8e8ee}
.skef-wrap{position:relative;width:256px;height:256px;margin:14px auto;
  background:#0a0a0f;border:2px solid rgba(255,255,255,.3);border-radius:12px;overflow:hidden;
  background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);
  background-size:32px 32px;box-shadow:0 0 24px rgba(255,255,255,.15)}
.skef-layer{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;touch-action:none}
.skef-ghost{opacity:.28;pointer-events:none}
.skef-info{text-align:center;font-size:12px;color:#b8b8c8;margin:6px 0}
.eff-btn{width:100%;margin-top:6px;background:rgba(20,20,28,.9);border-color:rgba(255,255,255,.18);font-size:12px;padding:8px}
.eff-btn:hover{background:rgba(40,40,50,.95)}
.eff-btn.hit{background:rgba(28,20,32,.9);border-color:rgba(200,140,255,.3)}
.bal-info{font-size:11.5px;color:#b0b0c0;text-align:center;margin-top:8px;padding:10px;background:rgba(10,10,15,.7);
  border-radius:10px;border:1px dashed rgba(255,255,255,.18);line-height:1.7}
.hint{text-align:center;font-size:12px;opacity:.6;margin:6px 0;color:#b8b8c8}
.layer-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px;padding:8px;
  background:rgba(10,10,15,.7);border-radius:8px;border:1px solid rgba(255,255,255,.14);margin:8px 0}
.layer-bar .lbl{font-size:12px;color:#b8b8c8;margin-right:4px}
.layer-bar button{padding:6px 10px;font-size:12px;margin:0}
.lb-row{display:flex;align-items:center;gap:10px;padding:12px;background:rgba(15,15,20,.85);
  border:1px solid rgba(255,255,255,.12);border-radius:12px;margin:6px 0;backdrop-filter:blur(6px)}
.lb-rank{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;
  font-weight:700;font-size:15px;flex-shrink:0;border:2px solid rgba(255,255,255,.2);color:#fff}
.lb-rank.r1{background:linear-gradient(180deg,#fff,#c0c0d0);color:#000;box-shadow:0 0 14px rgba(255,255,255,.5)}
.lb-rank.r2{background:linear-gradient(180deg,#d8d8e0,#8888a0);color:#000}
.lb-rank.r3{background:linear-gradient(180deg,#a8a8b8,#686878);color:#fff}
.lb-name{flex:1;font-size:14px;font-weight:600;color:#fff}
.lb-wins{font-size:15px;color:#fff;font-weight:700;font-variant-numeric:tabular-nums;text-shadow:0 0 8px rgba(255,255,255,.3)}
.lb-empty{text-align:center;padding:24px;opacity:.6;font-size:13px;color:#b8b8c8}
.lb-you{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.4)}
.online-opt{background:rgba(10,10,15,.7);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:12px;margin:8px 0}
.online-opt .row2{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
.wpn-btn{padding:12px 16px;font-size:14px;min-width:90px;background:rgba(20,20,28,.9);border-color:rgba(255,255,255,.18)}
.wpn-btn.on{background:linear-gradient(180deg,#fff,#c0c0d0);color:#000;border-color:#fff;box-shadow:0 0 18px rgba(255,255,255,.4)}
.wpn-btn.locked{opacity:.35}
.wpn-btn.kn{background:linear-gradient(180deg,rgba(60,10,20,.9),rgba(30,5,10,.9));border-color:rgba(255,120,140,.4);color:#ffd0d8}
.wpn-btn.kn.on{background:linear-gradient(180deg,#ff4466,#8a0a20);border-color:#fff;color:#fff}
.wpn-btn.lk{background:linear-gradient(180deg,rgba(60,50,10,.9),rgba(30,22,5,.9));border-color:rgba(255,220,120,.4);color:#fff0c8}
.wpn-btn.lk.on{background:linear-gradient(180deg,#ffd166,#8a6d28);border-color:#fff;color:#1a0e05}
#suckBox{display:none;position:fixed;left:0;right:0;bottom:0;padding:12px 14px 16px;z-index:20;text-align:center;
  background:linear-gradient(0deg,rgba(30,5,10,.96),rgba(20,5,10,.55));
  border-top:2px solid #ff3355;box-shadow:0 -8px 30px rgba(255,50,80,.35);backdrop-filter:blur(6px)}
#suckBox h4{margin:0 0 6px;font-size:14px;color:#ff8899;font-weight:700;letter-spacing:.05em;text-shadow:0 0 12px #ff3355}
#suckBtn{width:132px;height:132px;border-radius:50%;font-size:24px;font-weight:700;margin:8px auto 6px;display:block;
  background:radial-gradient(circle at 30% 30%,#ff6a8a,#5a1828);border:4px solid #ff8899;color:#fff;
  box-shadow:0 0 28px rgba(255,85,102,.5),inset 0 0 18px rgba(0,0,0,.5);
  cursor:pointer;touch-action:manipulation;user-select:none;-webkit-user-select:none;
  font-family:inherit;animation:suckPulse .6s ease-in-out infinite alternate}
#suckBtn:active{transform:scale(.92)}
@keyframes suckPulse{from{box-shadow:0 0 20px rgba(255,85,102,.5),inset 0 0 18px rgba(0,0,0,.5)}to{box-shadow:0 0 42px rgba(255,85,102,.8),inset 0 0 18px rgba(0,0,0,.5)}}
#suckInfo{display:flex;justify-content:center;gap:20px;font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}
.combo-tag{display:inline-block;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:700;
  background:linear-gradient(90deg,rgba(255,255,255,.95),rgba(200,200,210,.9));color:#0a0a0f;box-shadow:0 0 12px rgba(255,255,255,.3);margin:4px 0}
.combo-tag.ts{background:linear-gradient(90deg,#8a4aff,#7fdcff);color:#fff;box-shadow:0 0 14px rgba(138,74,255,.5)}
#btnMinionEdit{display:none;background:linear-gradient(180deg,rgba(60,30,60,.95),rgba(30,15,30,.95));border-color:rgba(255,140,200,.4)}
#minionHint{display:none;text-align:center;font-size:12px;color:#ff88cc;margin:6px 0}
.boss-btn{padding:10px 12px;font-size:13px;min-width:88px;flex-direction:column;gap:2px;background:rgba(20,20,28,.9);border-color:rgba(255,255,255,.18)}
.boss-btn .bname{font-weight:700;font-size:13px}
.boss-btn .bhp{font-size:10px;opacity:.75}
#endlessHUD{display:none;text-align:center;padding:8px;margin-bottom:6px;border-radius:10px;
  background:linear-gradient(180deg,rgba(40,40,60,.6),rgba(15,15,25,.6));
  border:1px solid rgba(255,255,255,.25);box-shadow:0 0 20px rgba(255,255,255,.1)}
#endlessHUD .wv{font-size:20px;font-weight:700;color:#fff;letter-spacing:.06em;text-shadow:0 0 12px rgba(255,255,255,.4)}
#endlessHUD .info{display:flex;justify-content:space-around;font-size:13px;margin-top:4px;font-variant-numeric:tabular-nums;color:#d8d8e0}
#endlessHUD .info b{color:#fff}
#waveBanner{display:none;position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);z-index:8;
  text-align:center;pointer-events:none;font-size:38px;font-weight:800;color:#fff;letter-spacing:.08em;
  text-shadow:0 0 24px rgba(255,255,255,.6),0 0 48px rgba(255,255,255,.3);animation:waveIn .5s ease-out}
@keyframes waveIn{from{transform:translate(-50%,-50%) scale(.3);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
#waveBanner small{display:block;font-size:18px;color:#d8d8e0;margin-top:8px;font-weight:600}
.shop-item{display:flex;flex-direction:column;gap:8px;background:linear-gradient(180deg,rgba(20,20,28,.9),rgba(12,12,18,.9));
  border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:14px;margin:8px 0;position:relative;overflow:hidden;backdrop-filter:blur(8px)}
.shop-item::before{content:'';position:absolute;inset:0;background:radial-gradient(400px 100px at 100% 0%,rgba(255,255,255,.06),transparent 60%);pointer-events:none}
.shop-item .head{display:flex;align-items:center;gap:12px}
.shop-item .icn{font-size:28px;filter:drop-shadow(0 0 8px rgba(255,255,255,.4));flex-shrink:0}
.shop-item .meta{flex:1;min-width:0}
.shop-item .nm{font-weight:700;font-size:15px;color:#fff}
.shop-item .dc{font-size:11.5px;color:#a0a0b0;margin-top:3px;line-height:1.5}
.shop-item .price{color:#fff;font-weight:800;font-size:15px;flex-shrink:0;font-variant-numeric:tabular-nums}
.shop-item.owned{border-color:rgba(120,255,180,.4);background:linear-gradient(180deg,rgba(10,30,20,.9),rgba(5,15,10,.9))}
.shop-item.owned .price{color:#88ffb0}
.shop-item button{margin:0;padding:10px;font-size:14px;width:100%}
#shopWins{text-align:center;font-size:15px;margin:8px 0 12px;padding:12px;border-radius:12px;
  background:linear-gradient(180deg,rgba(30,25,15,.9),rgba(15,12,8,.9));border:1px solid rgba(255,255,255,.2);color:#fff;
  font-variant-numeric:tabular-nums;letter-spacing:.03em;backdrop-filter:blur(6px)}
#luckyBox{display:none;position:fixed;right:12px;bottom:12px;z-index:15;text-align:center}
#luckyBtn{padding:14px 18px;font-size:16px;font-weight:800;
  background:linear-gradient(180deg,#fff,#c0c0d0);border:2px solid #fff;color:#0a0a0f;
  border-radius:16px;box-shadow:0 0 24px rgba(255,255,255,.5);letter-spacing:.05em;
  animation:luckyPulse 1s ease-in-out infinite alternate}
#luckyBtn:disabled{opacity:.45}
@keyframes luckyPulse{from{box-shadow:0 0 18px rgba(255,255,255,.5)}to{box-shadow:0 0 36px rgba(255,255,255,.85)}}
#luckyRoll{background:rgba(10,8,26,.96);border:2px solid #fff;border-radius:16px;padding:14px;
  box-shadow:0 0 30px rgba(255,255,255,.4);backdrop-filter:blur(8px);min-width:200px;margin-bottom:8px;display:none}
#luckyResult{font-size:20px;font-weight:800;margin:8px 0;text-shadow:0 0 14px currentColor;
  animation:luckyIn .4s ease-out;min-height:28px}
@keyframes luckyIn{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}
#luckyConfirm{padding:10px 20px;font-size:15px;font-weight:800;
  background:linear-gradient(180deg,#48c68a,#1e7a4c);border-color:#88ffb0;color:#fff;
  box-shadow:0 0 18px rgba(72,198,138,.5)}
/* Settings forms */
.form-group{margin:12px 0;padding:14px;background:rgba(12,12,18,.7);border:1px solid rgba(255,255,255,.14);border-radius:12px}
.form-group label{display:block;font-size:11px;color:#b8b8c8;margin-bottom:8px;letter-spacing:.08em;text-transform:uppercase;font-weight:700}
.form-group .hint-line{font-size:11px;color:#8888a0;margin-top:8px;line-height:1.5}
.keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0}
.keypad button{padding:16px;font-size:20px;font-weight:700;min-height:52px;
  background:rgba(20,20,28,.9);border-color:rgba(255,255,255,.2)}
.keypad button:hover{background:rgba(40,40,50,.95)}
.keypad button.special{font-size:14px;background:rgba(60,20,30,.9)}
.passkey-display{display:flex;gap:8px;justify-content:center;margin:14px 0}
.passkey-dot{width:42px;height:54px;border-radius:10px;background:rgba(10,10,15,.9);
  border:2px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;
  font-size:22px;font-weight:700;color:#fff;transition:all .2s}
.passkey-dot.filled{border-color:rgba(255,255,255,.7);box-shadow:0 0 14px rgba(255,255,255,.25)}
.profile-badge{display:flex;align-items:center;gap:12px;padding:14px;background:rgba(12,12,18,.85);
  border:1px solid rgba(255,255,255,.2);border-radius:14px;margin:10px 0;backdrop-filter:blur(8px)}
.profile-badge .avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#fff,#888);
  display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#0a0a0f;flex-shrink:0}
.profile-badge .pinfo{flex:1;min-width:0}
.profile-badge .pname{font-size:16px;font-weight:700;color:#fff}
.profile-badge .pwins{font-size:12px;color:#b8b8c8;margin-top:3px}
/* Lobby */
.room-item{display:flex;align-items:center;gap:12px;padding:14px;background:rgba(12,12,18,.85);
  border:1px solid rgba(255,255,255,.14);border-radius:14px;margin:8px 0;backdrop-filter:blur(8px);
  transition:border-color .2s,box-shadow .2s}
.room-item:hover{border-color:rgba(255,255,255,.4);box-shadow:0 0 20px rgba(255,255,255,.1)}
.room-icon{width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.08);
  display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;border:1px solid rgba(255,255,255,.14)}
.room-info{flex:1;min-width:0}
.room-mode{font-size:14px;font-weight:700;color:#fff}
.room-meta{font-size:11.5px;color:#a0a0b0;margin-top:3px}
.room-host{font-size:11px;color:#c8c8d8;margin-top:2px}
.room-join{padding:10px 18px;font-size:13px;font-weight:700;flex-shrink:0;
  background:linear-gradient(180deg,#fff,#c0c0d0);color:#0a0a0f;border-color:#fff}
.room-empty{text-align:center;padding:40px 20px;color:#8888a0;font-size:13px}
.modal-overlay{position:fixed;inset:0;background:rgba(5,5,10,.94);z-index:30;display:none;padding:16px;overflow-y:auto;backdrop-filter:blur(8px)}
.modal-overlay.on{display:flex;align-items:center;justify-content:center}
.modal-box{background:rgba(15,15,22,.98);border:1px solid rgba(255,255,255,.25);border-radius:16px;padding:20px;
  max-width:440px;width:100%;box-shadow:0 0 40px rgba(255,255,255,.15)}
.modal-box h2{margin:0 0 16px;font-size:18px;text-align:center;letter-spacing:.06em;color:#fff}
.btn-row{display:flex;gap:6px;flex-wrap:wrap}
.btn-row button{flex:1;min-width:100px}
</style></head><body>

<canvas id="bgfx"></canvas>

<div id="menu" class="screen on">
  <h1>วงกลมสู้ศึก</h1>
  <div id="menuProfile"></div>
  <div class="menu-grid">
    <div class="menu-card" data-menu="chars">
      <div class="mc-icon">🎭</div>
      <div class="mc-meta"><div class="mc-title">ตัวละคร</div><div class="mc-sub" id="mcCharsSub">ยังไม่มีตัวละคร</div></div>
      <div class="mc-arrow">›</div>
    </div>
    <div class="menu-card" data-menu="play">
      <div class="mc-icon">⚔</div>
      <div class="mc-meta"><div class="mc-title">เริ่มเล่น</div><div class="mc-sub">บอท • บอส • ไม่สิ้นสุด • ออนไลน์</div></div>
      <div class="mc-arrow">›</div>
    </div>
    <div class="menu-card" data-menu="lobby">
      <div class="mc-icon">🏠</div>
      <div class="mc-meta"><div class="mc-title">ห้องออนไลน์</div><div class="mc-sub" id="mcLobbySub">ดูกห้องที่คนอื่นสร้าง</div></div>
      <div class="mc-arrow">›</div>
    </div>
    <div class="menu-card" data-menu="shop">
      <div class="mc-icon">🛒</div>
      <div class="mc-meta"><div class="mc-title">ร้านค้า</div><div class="mc-sub">ซื้ออาวุธและอัปเกรด</div></div>
      <div class="mc-arrow">›</div>
    </div>
    <div class="menu-card" data-menu="rank">
      <div class="mc-icon">★</div>
      <div class="mc-meta"><div class="mc-title">อันดับชัยชนะ</div><div class="mc-sub">จัดอันดับผู้เล่นทั่วโลก</div></div>
      <div class="mc-arrow">›</div>
    </div>
    <div class="menu-card" data-menu="settings">
      <div class="mc-icon">⚙</div>
      <div class="mc-meta"><div class="mc-title">ตั้งค่า</div><div class="mc-sub">โปรไฟล์ • บัญชี • กู้คืน</div></div>
      <div class="mc-arrow">›</div>
    </div>
  </div>
  <div id="cnt"></div>
</div>

<div id="chars" class="screen">
  <h1>ตัวละคร</h1>
  <div id="slots"></div>
  <button class="big gray" data-back="menu">← กลับ</button>
</div>

<div id="play" class="screen">
  <h1>เริ่มเล่น</h1>
  <button class="big" id="btnBot">▣ สู้กับบอท <span style="font-size:11px;opacity:.7">+1</span></button>
  <button class="big red" id="btnBoss">☠ สู้บอส</button>
  <div id="bossTypeOpt" class="online-opt" style="display:none">
    <div class="hint">เลือกธาตุบอส:</div>
    <div class="row2" id="bossTypeList"></div>
    <button class="big gray" id="btnBossTypeCancel">← ยกเลิก</button>
  </div>
  <div id="bossOpt" class="online-opt" style="display:none">
    <div class="hint" id="bossOptName">จำนวนผู้เล่น:</div>
    <div class="row2">
      <button class="num" data-boss="1">1</button>
      <button class="num" data-boss="2">2</button>
      <button class="num" data-boss="3">3</button>
      <button class="num" data-boss="4">4</button>
      <button class="num" data-boss="5">5</button>
    </div>
    <div class="hint" id="bossHint">1 = สู้คนเดียว • 2-5 = สร้างห้องรอเพื่อน</div>
    <button class="big gray" id="btnBossCancel">← ยกเลิก</button>
  </div>
  <button class="big purple" id="btnEndless">∞ โหมดไม่สิ้นสุด</button>
  <div id="endlessOpt" class="online-opt" style="display:none">
    <div class="hint">เลือกจำนวนผู้เล่น:</div>
    <div class="row2">
      <button class="num" data-endless="1">1</button>
      <button class="num" data-endless="2">2</button>
      <button class="num" data-endless="3">3</button>
      <button class="num" data-endless="4">4</button>
      <button class="num" data-endless="5">5</button>
    </div>
    <button class="big gray" id="btnEndlessCancel">← ยกเลิก</button>
  </div>
  <button class="big cyan" id="btnCreateRoom">🏠 สร้างห้องออนไลน์</button>
  <button class="big gray" data-back="menu">← กลับ</button>
</div>

<div id="lobby" class="screen">
  <h1>ห้องออนไลน์</h1>
  <div id="lobbyList"></div>
  <button class="big gray" id="lobbyRefresh">↻ รีเฟรช</button>
  <button class="big gray" data-back="menu">← กลับ</button>
</div>

<div id="shop" class="screen">
  <h1>ร้านค้า</h1>
  <div id="shopWins"></div>
  <div id="shopList"></div>
  <button class="big gray" data-back="menu">← กลับ</button>
</div>

<div id="rank" class="screen">
  <h1>อันดับชัยชนะ</h1>
  <div id="rankList"></div>
  <button class="big" id="rankRefresh">↻ รีเฟรช</button>
  <button class="big gray" data-back="menu">← กลับ</button>
</div>

<div id="settings" class="screen">
  <h1>ตั้งค่า</h1>
  <div id="settingsBody"></div>
  <button class="big gray" data-back="menu">← กลับ</button>
</div>

<div id="editor" class="screen">
  <h1>แก้ไขตัวละคร</h1>
  <input type="text" id="cname" placeholder="ชื่อตัวละคร" maxlength="16">
  <div class="cwrap"><canvas id="dc" width="96" height="96"></canvas></div>
  <div class="bar2" id="tools">
    <button data-t="brush" class="on">✎ แปรง</button>
    <button data-t="bucket">▨ ถังสี</button>
    <button data-t="eraser">⌫ ยางลบ</button>
    <input type="color" id="col" value="#ffffff" style="width:38px;height:34px;border:0;border-radius:8px;background:transparent">
    <input type="range" id="bsz" min="1" max="14" value="4" style="width:90px;accent-color:#fff">
  </div>
  <div class="bar2">
    <button id="btnUp">▣ ใส่รูป</button>
    <button id="btnClr">✕ ล้างเฟรม</button>
    <input type="file" id="upl" accept="image/*" style="display:none">
  </div>
  <div class="bar2"><div id="fbar"></div>
    <button id="btnAdd">✚ เฟรม</button><button id="btnDel">✖ เฟรม</button>
    <canvas id="pv" width="96" height="96" style="width:56px;height:56px;border-radius:50%;background:#0a0a0f;border:2px solid rgba(255,255,255,.3)"></canvas>
  </div>
  <h3>สกิล (สูงสุด <span id="skMax">2</span>)</h3>
  <div class="bar2" id="skpick"></div>
  <h3>ปรับแต่งสกิล</h3>
  <div id="skset"></div>
  <h3>อาวุธ</h3>
  <div class="bar2" id="weaponPick"></div>
  <div id="weaponInfo" class="bal-info"></div>
  <button class="big" id="btnMinionEdit">🐾 แก้ไขลูกน้อง</button>
  <div id="minionHint">🐾 กำลังแก้ไขลูกน้อง</div>
  <button class="big" id="btnSave">✓ บันทึก</button>
  <button class="big gray" id="btnBack">← กลับ</button>
</div>

<div id="skeffect" class="screen">
  <h1 style="font-size:18px" id="skef-title">แก้ไขเอฟเฟค</h1>
  <div class="skef-info" id="skef-sub"></div>
  <div class="skef-wrap">
    <canvas id="sfg" width="64" height="64" class="skef-layer skef-ghost"></canvas>
    <canvas id="sfc" width="64" height="64" class="skef-layer"></canvas>
  </div>
  <div class="bar2" id="eftools">
    <button data-et="brush" class="on">✎</button>
    <button data-et="eraser">⌫</button>
    <input type="color" id="efcol" value="#ffffff" style="width:38px;height:34px;border:0;border-radius:8px;background:transparent">
    <input type="range" id="efbsz" min="1" max="12" value="3" style="width:80px;accent-color:#fff">
  </div>
  <div class="bar2">
    <button id="efUndo" class="warn">↶ ย้อน</button>
    <button id="efClr">✕ ล้าง</button>
    <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#b8b8c8">
      <input type="checkbox" id="efOnion" checked style="accent-color:#fff"> เงา
    </label>
  </div>
  <div class="layer-bar">
    <span class="lbl">เลเยอร์:</span>
    <div id="eflayerbtn" style="display:flex;gap:3px;flex-wrap:wrap"></div>
    <button id="efLayerAdd">+</button>
    <button id="efLayerDel" class="red">−</button>
  </div>
  <div class="bar2"><div id="efbar"></div>
    <button id="efAdd">✚ เฟรม</button><button id="efDel">✖ เฟรม</button>
    <canvas id="efpv" width="64" height="64" style="width:56px;height:56px;border-radius:10px;background:#0a0a0f;border:2px solid rgba(255,255,255,.3)"></canvas>
  </div>
  <button class="big" id="efSave">✓ บันทึก</button>
  <button class="big gray" id="efBack">← กลับ</button>
</div>

<div id="battle" class="screen">
  <div class="hud" id="hud"></div>
  <div id="endlessHUD">
    <div class="wv" id="endlessWave">คลื่นที่ 1</div>
    <div class="info">
      <span>ศัตรู: <b id="endlessEnemies">0</b></span>
      <span>คะแนน: <b id="endlessPts">0</b></span>
    </div>
  </div>
  <canvas id="bc" width="360" height="520"></canvas>
  <div id="suckBox">
    <h4>⚡ บอสกำลังดูด! กดปุ่มให้ครบ!</h4>
    <button id="suckBtn">กด!</button>
    <div id="suckInfo">
      <div style="color:#fff" id="suckProgress">0 / 20</div>
      <div style="color:#b8b8c8" id="suckTime">25.0 วิ</div>
    </div>
  </div>
  <div id="luckyBox">
    <div id="luckyRoll">
      <div id="luckyResult">?</div>
      <button id="luckyConfirm">✓ ยืนยัน</button>
    </div>
    <button id="luckyBtn">🎴 สุ่มการ์ด</button>
  </div>
</div>

<div id="waveBanner"></div>

<div id="res"><div id="rtxt"></div><br>
  <button id="btnAgain">↻ เล่นอีกครั้ง</button><button id="btnHome">⌂ เมนู</button></div>

<div id="wait"><div>◌ กำลังรอผู้เล่น...</div><div id="waitSub" style="font-size:14px;opacity:.7;margin-top:8px"></div><br><button id="btnCancelWait">✕ ยกเลิก</button></div>

<div id="modal" class="modal-overlay"><div class="modal-box" id="modalBox"></div></div>

<div id="toast"></div>

<script>
(function(){
'use strict';
var $=function(i){return document.getElementById(i)};
var S=96,W=360,H=520,R=26,BASE=170,MAXF=80000;
var W_BOSS=720,H_BOSS=720,W_ENDLESS=900,H_ENDLESS=900,SKEFF_SIZE=64;
var BURN_DUR=3,FLOAT_DUR=2,PULL_DUR=2,FIST_BOUNCE_N=5,FIST_BOUNCE_DMG=3;
var STUN_DUR=5,BEAM_DUR=3,STUN_DMG=0.5,STUN_TICK=0.5;
var BLOOD_REGEN_DUR=5,BLOOD_REGEN_PER_SEC=1.5,POISON_TICK=0.5;
var LIGHT_DOT=0.4,LIGHT_TICK=0.5;
var WIN_BOT=1,WIN_ONLINE=10,WIN_BOSS=50,WIN_BOSS_MIXED=100;
var BOSS_SUCK_INTERVAL=20,BOSS_SUCK_DUR=25,BOSS_SUCK_PRESSES=20,BOSS_BITE_DMG=15,BOSS_SUCK_PULL=280;
var BOSS_DASH_INTERVAL=15,BOSS_DASH_DMG=10,BOSS_RAGE_THRESHOLD=0.2,BOSS_RAGE_CAST_INTERVAL=0.5;
var BOSS_KATANA_CD=4,BOSS_KATANA_DMG=3;
var BOSS_MINION_HP=50,BOSS_MINION_BOLT_DMG=0.25,BOSS_MINION_BOLT_RANGE=380,BOSS_MINION_BEAM_DUR=10,BOSS_MINION_BEAM_CD=5,BOSS_MINION_BOLT_TICK=0.5;
var MINION_COUNT=5,MINION_HP=3,MINION_DMG=1,MINION_ATK_CD=1.2,MINION_DASH_SPD=520;
var HOLY_LIGHT_STUN=3,GOD_PUNCH_DMG=20,GOD_LIFE=1.8,GOD_PUNCH_T=0.6,GOD_PUNCH_RADIUS=110;
var PET_STONE_MINION_HP=5,PET_STONE_MINION_COUNT=1;
var LIGHTNING_STONE_STUN=2.2,LIGHTNING_FIELD_DUR=5,LIGHTNING_FIELD_TICK=0.5,LIGHTNING_FIELD_TICK_DMG=0.25,LIGHTNING_FIELD_RADIUS=200,LIGHTNING_STONE_CD=20,LIGHTNING_STONE_DROPS=5;
var DARK_HOLE_DUR=3,DARK_HOLE_TICK=1.0,DARK_HOLE_DMG=5,DARK_HOLE_RADIUS=120,DARK_HOLE_PULL=500,DARK_HOLE_EXPLODE_DMG=10;
var WATER_DMG=5,WATER_PUSH=700;
var TIME_STOP_DUR=5,TIME_STOP_CD=25;
var DARK_UNLOCK=2000;
var SHOP_SLOT3_COST=200,SHOP_KATANA_COST=500,SHOP_LUCKY_COST=1500;
var KATANA_DMG=0.4,KATANA_CD=0.2,KATANA_RANGE=R*5;
var LUCKY_CARD_CD=2.5,LUCKY_CARD_DMG=3;
var ENDLESS_MAX_BOTS=28,ENDLESS_INTRO_TIME=2.2,ENDLESS_CLEAR_TIME=2.8;
var guestSuckPress=0,MINION_ID=0;
var PROFILE=null; // { name, passkey, wins, serverId }

var BOSS_TYPES = {
 fire:{n:'เพลิง',icon:'🔥',color:'#ff6a00',hp:250,r:52,skills:['fire','fist']},
 lightning:{n:'สายฟ้า',icon:'⚡',color:'#c8a2ff',hp:250,r:52,skills:['lightning','wind']},
 stone:{n:'หิน',icon:'🪨',color:'#a89070',hp:250,r:52,skills:['stone','fist']},
 summon:{n:'ลูกน้อง',icon:'👥',color:'#ff2244',hp:250,r:52,skills:['bossSummon','lightning']},
 ice:{n:'น้ำแข็ง',icon:'❄',color:'#7fdcff',hp:250,r:52,skills:['ice','wind']},
 wind:{n:'วายุ',icon:'🌪',color:'#9ff2c0',hp:250,r:52,skills:['wind','ice']},
 fist:{n:'หมัด',icon:'✊',color:'#ffd166',hp:250,r:52,skills:['fist','fire']},
 light:{n:'แสง',icon:'☀',color:'#fff5c0',hp:250,r:52,skills:['light','stone']},
 blood:{n:'เลือด',icon:'🩸',color:'#c81e3c',hp:250,r:52,skills:['blood','stone']},
 dark:{n:'มืด',icon:'🌑',color:'#8a4aff',hp:250,r:52,skills:['dark','stone']},
 water:{n:'น้ำ',icon:'💧',color:'#4fc3f7',hp:250,r:52,skills:['water','ice']},
 mixed:{n:'รวมธาตุ',icon:'☠',color:'#ff2244',hp:500,r:58,skills:null}
};
var ELEMENT_BOSS_KEYS=['fire','lightning','stone','summon','ice','wind','fist','light','blood','dark','water'];

var WEAPONS={
 none:{n:'ไม่มี',unlock:0,icon:'⊘',color:'#666'},
 sword:{n:'ดาบ',unlock:0,icon:'†',color:'#e0e0e0',dmg:2,cd:0.9,range:R*3.6},
 gun:{n:'ปืน',unlock:100,icon:'▬',color:'#c0c0c0',dmg:0.7,cd:0.5,speed:620},
 poisonGun:{n:'ปืนพิษ',unlock:150,icon:'☠',color:'#88ff44',dmg:1,cd:0.8,speed:520,poisonDur:5,poisonDmg:0.2},
 katana:{n:'คาตานะ',unlock:SHOP_KATANA_COST,icon:'⚔',color:'#ff2244',dmg:KATANA_DMG,cd:KATANA_CD,range:KATANA_RANGE,shop:true},
 lucky:{n:'การ์ดโชค',unlock:SHOP_LUCKY_COST,icon:'🎴',color:'#ffd166',shop:true,lucky:true}
};

var ELEM_SVG={
 fire:'<path d="M12 2 Q8 6 7 10 Q6 15 9 18.5 Q10.5 20 12 20 Q13.5 20 15 18.5 Q18 15 17 10 Q16 6 12 2 Z" fill="COLOR"/>',
 ice:'<g stroke="COLOR" stroke-width="2.2" stroke-linecap="round" fill="none"><line x1="12" y1="3" x2="12" y2="21"/><line x1="4.2" y1="7.5" x2="19.8" y2="16.5"/><line x1="4.2" y1="16.5" x2="19.8" y2="7.5"/></g>',
 wind:'<path d="M3 8 Q10 4 17 7 Q21 9 19 12 Q17 15 13.5 13.5" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round"/>',
 fist:'<path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z" fill="COLOR"/>',
 lightning:'<polygon points="13,2 5,13 11,13 9,22 19,11 13,11 15,2" fill="COLOR"/>',
 blood:'<path d="M12 3 Q8 8 7 13 Q6 17 9 19.5 Q10.5 20.5 12 20.5 Q13.5 20.5 15 19.5 Q18 17 17 13 Q16 8 12 3 Z" fill="COLOR"/>',
 poison:'<path d="M12 3 Q9 7 8 11 Q7 15 9.5 18 Q11 19.5 12 19.5 Q13 19.5 14.5 18 Q17 15 16 11 Q15 7 12 3 Z" fill="COLOR"/>',
 stone:'<path d="M12 3 L19 7 L20 15 L14 21 L6 19 L4 11 L7 5 Z" fill="COLOR"/>',
 light:'<circle cx="12" cy="12" r="4.5" fill="COLOR"/><circle cx="12" cy="12" r="2.2" fill="#fff" opacity=".8"/>',
 pet:'<ellipse cx="12" cy="15" rx="5" ry="4" fill="COLOR"/><circle cx="12" cy="8.5" r="3.4" fill="COLOR"/>',
 bossSummon:'<circle cx="12" cy="12" r="10" fill="none" stroke="COLOR" stroke-width="2"/><polygon points="12,5 8,13 11,13 10,19 16,11 13,11 14,5" fill="COLOR"/>',
 dark:'<circle cx="12" cy="12" r="9.5" fill="COLOR" opacity=".2"/><circle cx="12" cy="12" r="7" fill="COLOR" opacity=".4"/><circle cx="12" cy="12" r="5" fill="COLOR" opacity=".7"/><circle cx="12" cy="12" r="3.2" fill="#0a0014"/><circle cx="12" cy="12" r="1.4" fill="#000"/>',
 water:'<path d="M12 2.5 Q7 9 7 14 Q7 18 9.5 20 Q11 21 12 21 Q13 21 14.5 20 Q17 18 17 14 Q17 9 12 2.5 Z" fill="COLOR"/>',
 timeStop:'<circle cx="12" cy="12" r="9" fill="none" stroke="COLOR" stroke-width="2.4"/><path d="M12 6 L12 12 L16 14" stroke="COLOR" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
};
function elemSvg(id,size,color){
 size=size||18;color=color||(SK[id]&&SK[id].color)||'#fff';
 var body=(ELEM_SVG[id]||'').split('COLOR').join(color);
 return '<svg viewBox="0 0 24 24" width="'+size+'" height="'+size+'" style="vertical-align:middle;filter:drop-shadow(0 0 4px '+color+'88);flex-shrink:0">'+body+'</svg>';
}

var SK={
 fire:{n:'เพลิง',dmg:2,cd:6,power:0.5,color:'#ff6a00',status:'burn',slots:{cast:'เปลวไฟ',status:'ติดไฟ'}},
 ice:{n:'น้ำแข็ง',dmg:2,cd:6.5,power:0.5,color:'#7fdcff',status:'float',slots:{cast:'ผลึกน้ำแข็ง',status:'ชะลอ'}},
 wind:{n:'วายุ',dmg:1.5,cd:5.5,power:0.5,color:'#9ff2c0',status:'pull',slots:{cast:'กระแสลม',status:'ดึง'}},
 fist:{n:'หมัด',dmg:4,cd:7,power:0.5,color:'#ffd166',status:'dash',slots:{cast:'พุ่ง',status:'ชนขอบ'}},
 lightning:{n:'สายฟ้า',dmg:3,cd:8,power:0.5,color:'#c8a2ff',status:'stun',slots:{cast:'พุ่ง',status:'ช็อต'}},
 blood:{n:'เลือด',dmg:2,cd:6,power:0.5,color:'#c81e3c',status:'bite',slots:{cast:'กัด',status:'เลือดไหล'}},
 stone:{n:'หิน',dmg:5.5,cd:9,power:0.5,color:'#a89070',status:'rock',slots:{cast:'หินร่วง',status:'ทับ'}},
 light:{n:'แสง',dmg:2,cd:9,power:0.5,color:'#fff5c0',status:'dazzle',slots:{cast:'สตัน',status:'พิษแสง'}},
 dark:{n:'มืด',dmg:DARK_HOLE_DMG,cd:9,power:0.5,color:'#8a4aff',status:'blackhole',slots:{cast:'หลุมดำ',status:'ถูกดูด'}},
 water:{n:'น้ำ',dmg:WATER_DMG,cd:7,power:0.5,color:'#4fc3f7',status:'push',slots:{cast:'คลื่นน้ำ',status:'ผลัก'}},
 pet:{n:'สัตว์เลี้ยง',dmg:1,cd:10,power:0.5,color:'#ff88cc',status:'summon',slots:{cast:'เรียก 5 ตัว',status:'ลูกน้อง'}},
 bossSummon:{n:'สมุนบอส',dmg:1,cd:10,power:0.5,color:'#ff2244',status:'summon',slots:{cast:'เรียกสมุน',status:'สมุนบอส'}}
};
var LIM={dmg:{min:1,max:6,step:0.5},cd:{min:5,max:10,step:0.5},power:{min:0.1,max:1,step:0.1}};

function getCombo(skills){
 if(!skills||skills.length<2)return null;
 for(var i=0;i<skills.length;i++)for(var j=i+1;j<skills.length;j++){
  var a=skills[i].id,b=skills[j].id;
  var s1=a<b?a:b,s2=a<b?b:a;
  if(s1==='fire'&&s2==='stone')return 'meteor';
  if(s1==='fire'&&s2==='fist')return 'explosiveDash';
  if(s1==='pet'&&s2==='stone')return 'petStone';
  if(s1==='light'&&s2==='stone')return 'lightStone';
  if(s1==='lightning'&&s2==='stone')return 'lightningStone';
  if(s1==='dark'&&s2==='ice')return 'timeStop';
 }
 return null;
}
var COMBO_INFO={
 meteor:{n:'☄ เพลิง+หิน = อุกกาบาต',d:'เรียกอุกกาบาต 3 ลูก + ไฟลุก 5 วิ'},
 explosiveDash:{n:'🔥 เพลิง+หมัด = ระเบิด',d:'พุ่งชน + ระเบิด 5×2 ดาเมจ'},
 petStone:{n:'🪨🐾 สัตว์เลี้ยง+หิน = หินเรียกสมุน',d:'หิน 1 ก้อน กลายเป็นสมุน 1 ตัว'},
 lightStone:{n:'✦🪨 แสง+หิน = ลำแสงเทพ',d:'สตัน '+HOLY_LIGHT_STUN+' วิ + เทพต่อย '+GOD_PUNCH_DMG},
 lightningStone:{n:'⚡🪨 สายฟ้า+หิน = หินสายฟ้า',d:'ตก '+LIGHTNING_STONE_DROPS+' จุด + คลื่นไฟ CD '+LIGHTNING_STONE_CD},
 timeStop:{n:'🌑❄ มืด+น้ำแข็ง = หยุดเวลา',d:'หยุด '+TIME_STOP_DUR+' วิ • กระสุนค้าง • CD '+TIME_STOP_CD}
};

function applyBalance(s,changed){
 if(changed==='dmg'){if(s.dmg>1.5&&s.cd<6)s.cd=6;}
 else if(changed==='cd'){if(s.cd<6&&s.dmg>1.5)s.dmg=1.5;}
 else{if(s.dmg>1.5&&s.cd<6)s.cd=6;}
 return s;
}
function roundHalf(v){return Math.round(v*2)/2;}
function roundTenth(v){return Math.round(v*10)/10;}
function toast(t){var e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(function(){e.style.display='none'},2400);}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]});}
function clamp(v,a,b){v=Number(v);if(!isFinite(v))v=a;return Math.max(a,Math.min(b,v));}
function newCanvas(n){n=n||S;var c=document.createElement('canvas');c.width=c.height=n;return c;}
function blankFrame(){return newCanvas().toDataURL('image/png');}
function defSkill(id){var d=SK[id];return {id:id,dmg:d.dmg,cd:d.cd,power:d.power,color:d.color,slots:{cast:[],status:[]}};}
function show(id){['menu','chars','play','lobby','shop','rank','settings','editor','skeffect','battle'].forEach(function(s){
  var el=$(s); if(el) el.classList.toggle('on',s===id);
});}
function openModal(html){$('modalBox').innerHTML=html;$('modal').classList.add('on');}
function closeModal(){$('modal').classList.remove('on');}

/* ========= Background particle effect ========= */
(function(){
 var c=$('bgfx'),x=c.getContext('2d');
 var parts=[];
 function resize(){c.width=window.innerWidth;c.height=window.innerHeight;}
 resize();window.addEventListener('resize',resize);
 function spawn(){
  parts.push({
   x:Math.random()*c.width,
   y:c.height+10,
   vx:(Math.random()-.5)*0.25,
   vy:-0.2-Math.random()*0.5,
   r:0.6+Math.random()*2.2,
   alpha:0.15+Math.random()*0.55,
   life:1,
   pulse:Math.random()*6.28
  });
 }
 for(var i=0;i<60;i++){
  parts.push({x:Math.random()*c.width,y:Math.random()*c.height,
   vx:(Math.random()-.5)*0.2,vy:-0.15-Math.random()*0.4,
   r:0.5+Math.random()*1.8,alpha:0.1+Math.random()*0.5,life:1,pulse:Math.random()*6.28});
 }
 function tick(){
  x.clearRect(0,0,c.width,c.height);
  var t=performance.now()/1000;
  for(var i=parts.length-1;i>=0;i--){
   var p=parts[i];
   p.x+=p.vx;p.y+=p.vy;p.pulse+=0.03;
   var a=p.alpha*(0.7+Math.sin(p.pulse)*0.3);
   if(p.y<-10){parts.splice(i,1);continue;}
   x.beginPath();
   var gr=x.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*4);
   gr.addColorStop(0,'rgba(255,255,255,'+a+')');
   gr.addColorStop(1,'rgba(255,255,255,0)');
   x.fillStyle=gr;
   x.arc(p.x,p.y,p.r*4,0,7);
   x.fill();
   x.beginPath();
   x.fillStyle='rgba(255,255,255,'+(a*1.3)+')';
   x.arc(p.x,p.y,p.r,0,7);
   x.fill();
  }
  if(Math.random()<0.4 && parts.length<120)spawn();
  requestAnimationFrame(tick);
 }
 tick();
})();

/* ========= PROFILE & ACCOUNTS ========= */
function loadProfile(){
 try{
  var p=JSON.parse(localStorage.getItem('circ_profile')||'null');
  if(p&&p.name&&p.passkey)PROFILE=p;
 }catch(e){}
}
function saveProfile(){try{localStorage.setItem('circ_profile',JSON.stringify(PROFILE));}catch(e){}}
function clearProfile(){PROFILE=null;try{localStorage.removeItem('circ_profile');}catch(e){}}

/* ========= CHARACTERS (local per-profile, but wins are global) ========= */
function getChars(){
 try{
  var r=JSON.parse(localStorage.getItem('circ_chars')||'[]');
  var a=[null,null];
  for(var i=0;i<2;i++)a[i]=sanitize(r[i]);
  return a;
 }catch(e){return [null,null];}
}
function setStore(a){try{localStorage.setItem('circ_chars',JSON.stringify(a));}catch(e){toast('⚠ เก็บไม่ได้');}}

function getShop(){
 try{var s=JSON.parse(localStorage.getItem('circ_shop')||'{}');if(!s||typeof s!=='object'||Array.isArray(s))s={};return s;}catch(e){return {};}
}
function saveShop(s){try{localStorage.setItem('circ_shop',JSON.stringify(s));}catch(e){}}
function hasKatana(){return !!getShop().katana;}
function hasSlot3(){return !!getShop().slot3;}
function hasLucky(){return !!getShop().lucky;}

function sanitize(c){
 if(!c||typeof c!=='object')return null;
 var o={name:String(c.name||'ไร้ชื่อ').slice(0,16),frames:[],skills:[],weapon:(c.weapon&&WEAPONS[c.weapon])?c.weapon:'none'};
 if(c._isBoss){o._isBoss=true;o._hp=Math.max(100,Math.min(10000,Math.floor(Number(c._hp)||500)));o._r=Math.max(20,Math.min(120,Math.floor(Number(c._r)||55)));o._bossType=(c._bossType&&BOSS_TYPES[c._bossType])?c._bossType:'mixed';}
 if(c._isEndlessBot){o._isEndlessBot=true;o._botVariant=Math.max(0,Math.min(9,Math.floor(Number(c._botVariant)||0)));}
 if(c.minion&&typeof c.minion==='object'){
  o.minion={frames:[]};
  (Array.isArray(c.minion.frames)?c.minion.frames:[]).slice(0,8).forEach(function(f){
   if(typeof f==='string'&&f.indexOf('data:image/png;base64,')===0&&f.length<MAXF)o.minion.frames.push(f);
  });
  if(!o.minion.frames.length)o.minion.frames.push(blankFrame());
 }
 (Array.isArray(c.frames)?c.frames:[]).slice(0,8).forEach(function(f){
  if(typeof f==='string'&&f.indexOf('data:image/png;base64,')===0&&f.length<MAXF)o.frames.push(f);});
 if(!o.frames.length)o.frames.push(blankFrame());
 var maxSk=c._isBoss?4:(hasSlot3()?3:2);
 var wins=PROFILE?PROFILE.wins:0;
 var seen={};
 (Array.isArray(c.skills)?c.skills:[]).forEach(function(s){
  if(!s||!SK[s.id]||seen[s.id]||o.skills.length>=maxSk)return;
  if(s.id==='dark'&&!c._isBoss&&wins<DARK_UNLOCK)return;
  seen[s.id]=1;
  var slots={cast:[],status:[]};
  ['cast','status'].forEach(function(slot){
   var src=(s.slots&&s.slots[slot])||[];
   (Array.isArray(src)?src:[]).slice(0,8).forEach(function(f){
    if(typeof f==='string'&&f.indexOf('data:image/png;base64,')===0&&f.length<40000)slots[slot].push(f);});
  });
  var dmg=roundHalf(clamp(s.dmg,LIM.dmg.min,LIM.dmg.max));
  var cd=roundHalf(clamp(s.cd,LIM.cd.min,LIM.cd.max));
  var pw=roundTenth(clamp(s.power,LIM.power.min,LIM.power.max));
  var tmp={dmg:dmg,cd:cd};applyBalance(tmp,'init');
  o.skills.push({id:s.id,dmg:tmp.dmg,cd:tmp.cd,power:pw,color:/^#[0-9a-f]{6}$/i.test(s.color)?s.color:SK[s.id].color,slots:slots});
 });
 if(!o.skills.length)o.skills.push(defSkill('fire'));
 if(o.weapon==='katana'&&!hasKatana())o.weapon='none';
 if(o.weapon==='lucky'&&!hasLucky())o.weapon='none';
 return o;
}
function strip(c){
 var o={name:c.name,frames:c.frames,skills:c.skills,weapon:c.weapon};
 if(c._isBoss){o._isBoss=true;o._hp=c._hp;o._r=c._r;o._bossType=c._bossType;}
 if(c._isEndlessBot){o._isEndlessBot=true;o._botVariant=c._botVariant;}
 if(c.minion)o.minion=c.minion;
 return o;
}
function loadImg(src){return new Promise(function(r){
 if(!src){r(null);return;}
 var im=new Image();im.onload=function(){r(im);};im.onerror=function(){r(null);};im.src=src;});}
function prepChar(c){
 return Promise.all(c.frames.map(loadImg)).then(function(imgs){
  c.imgs=imgs;
  return Promise.all(c.skills.map(function(s){
   var pCast=Promise.resolve([]),pStat=Promise.resolve([]);
   if(s.slots&&s.slots.cast&&s.slots.cast.length)pCast=Promise.all(s.slots.cast.map(loadImg));
   if(s.slots&&s.slots.status&&s.slots.status.length)pStat=Promise.all(s.slots.status.map(loadImg));
   return Promise.all([pCast,pStat]).then(function(a){return {cast:a[0]||[],status:a[1]||[]};});
  }));
 }).then(function(arrs){
  c.skillSlotImgs=arrs;
  if(c.minion&&c.minion.frames&&c.minion.frames.length){
   return Promise.all(c.minion.frames.map(loadImg)).then(function(imgs){c.minion.imgs=imgs;return c;});
  }
  return c;
 });
}

var CH=[null,null],ACT=parseInt(localStorage.getItem('circ_act')||'0')||0;
function loadChars(){
 var a=getChars();
 return Promise.all(a.map(function(c){return c?prepChar(c):null;})).then(function(r){
  CH=r;if(!CH[ACT])ACT=CH[0]?0:(CH[1]?1:0);
  renderMenu();renderCharsScreen();drawStaticPreviews();
 });
}

/* ========= SERVER SYNC ========= */
function serverRegister(name,passkey){
 return fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,passkey:passkey})})
  .then(function(r){return r.json();});
}
function serverLogin(name,passkey){
 return fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,passkey:passkey})})
  .then(function(r){return r.json();});
}
function serverSyncWins(wins){
 if(!PROFILE)return Promise.resolve();
 return fetch('/api/sync-wins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:PROFILE.name,passkey:PROFILE.passkey,wins:wins})})
  .then(function(r){return r.json();}).catch(function(){return {};});
}
function addWins(amount){
 if(!PROFILE)return;
 PROFILE.wins=Math.max(0,(PROFILE.wins||0)+amount);
 saveProfile();
 serverSyncWins(PROFILE.wins);
 updateMenuProfile();
}

/* ========= MENU PROFILE ========= */
function updateMenuProfile(){
 var m=$('menuProfile');
 if(PROFILE){
  var initial=PROFILE.name.charAt(0).toUpperCase();
  m.innerHTML='<div class="profile-badge"><div class="avatar">'+esc(initial)+'</div>'+
   '<div class="pinfo"><div class="pname">'+esc(PROFILE.name)+'</div>'+
   '<div class="pwins">★ '+PROFILE.wins+' ชัยชนะ • บัญชีผูกกับระบบ</div></div></div>';
 } else {
  m.innerHTML='<div class="profile-badge" style="border-color:rgba(255,255,255,.35)"><div class="avatar" style="background:rgba(255,255,255,.1);color:#fff">?</div>'+
   '<div class="pinfo"><div class="pname">ยังไม่ได้ตั้งค่าโปรไฟล์</div>'+
   '<div class="pwins">ไปที่ "ตั้งค่า" เพื่อสร้างบัญชี</div></div></div>';
 }
 // chars sub
 var c=CH[ACT];
 var sub=$('mcCharsSub');
 if(sub){
  if(c)sub.textContent='ปัจจุบัน: '+c.name;
  else if(CH[0]||CH[1])sub.textContent='มีตัวละครแล้ว';
  else sub.textContent='ยังไม่มีตัวละคร';
 }
}

/* ========= NAV ========= */
document.addEventListener('click',function(e){
 var back=e.target.closest('button[data-back]');
 if(back){show(back.dataset.back);return;}
 var mc=e.target.closest('.menu-card[data-menu]');
 if(mc){
  var m=mc.dataset.menu;
  if(m==='chars'){renderCharsScreen();show('chars');}
  else if(m==='play'){show('play');}
  else if(m==='lobby'){show('lobby');refreshLobby();}
  else if(m==='shop'){renderShop();show('shop');}
  else if(m==='rank'){renderRank();show('rank');}
  else if(m==='settings'){renderSettings();show('settings');}
  return;
 }
});

/* ========= MENU RENDER ========= */
function renderMenu(){updateMenuProfile();}

/* ========= CHARACTERS SCREEN ========= */
function renderCharsScreen(){
 var h='';
 for(var i=0;i<2;i++){
  var c=CH[i];
  h+='<div class="card'+(ACT===i&&c?' act':'')+'" data-i="'+i+'">';
  if(c){
   var wp=c.weapon&&c.weapon!=='none'?'<span class="tag">⚔ '+WEAPONS[c.weapon].n+'</span>':'';
   var comboTag='';
   var cb=getCombo(c.skills);
   if(cb){var ccls=cb==='timeStop'?'ts':'';comboTag='<br><span class="combo-tag '+ccls+'">'+COMBO_INFO[cb].n+'</span>';}
   h+='<canvas width="96" height="96" class="pvc" data-i="'+i+'"></canvas>'+
      '<div class="info"><b style="color:#fff">'+esc(c.name)+'</b><br>'+
      c.skills.map(function(s){return elemSvg(s.id,14,s.color)+' '+SK[s.id].n}).join(' ')+
      ' '+wp+comboTag+'</div>'+
      '<div class="actions">'+
       '<button data-e="'+i+'">✎</button>'+
       '<button data-sel="'+i+'" '+(ACT===i?'disabled':'')+'>เลือก</button>'+
       '<button data-d="'+i+'" class="red">✕</button>'+
      '</div>';
  } else {
   h+='<div class="empty">'+
      '<div style="opacity:.65;margin-bottom:10px;font-size:13px">ช่อง '+(i+1)+' ว่าง</div>'+
      '<button class="big green" data-e="'+i+'" style="margin:0">✚ สร้างตัวละคร</button>'+
      '</div>';
  }
  h+='</div>';
 }
 $('slots').innerHTML=h;
 setTimeout(drawStaticPreviews,50);
}
$('slots').addEventListener('click',function(e){
 var ed=e.target.closest('button[data-e]');
 if(ed){openEditor(+ed.dataset.e);return;}
 var sel=e.target.closest('button[data-sel]');
 if(sel){ACT=+sel.dataset.sel;localStorage.setItem('circ_act',ACT);renderCharsScreen();updateMenuProfile();return;}
 var dl=e.target.closest('button[data-d]');
 if(dl){if(confirm('ลบตัวละครนี้?')){var a=getChars();a[+dl.dataset.d]=null;setStore(a);loadChars();}return;}
});
function drawStaticPreviews(){
 var list=document.querySelectorAll('.pvc');
 for(var k=0;k<list.length;k++){
  var cv=list[k],c=CH[+cv.dataset.i];if(!c||!c.imgs||!c.imgs[0])continue;
  var x=cv.getContext('2d');x.clearRect(0,0,S,S);
  var im=c.imgs[0];if(im&&im.width)x.drawImage(im,0,0,S,S);
 }
}

/* ========= SETTINGS SCREEN ========= */
function renderSettings(){
 var h='';
 if(PROFILE){
  var initial=PROFILE.name.charAt(0).toUpperCase();
  h+='<div class="profile-badge"><div class="avatar">'+esc(initial)+'</div>'+
     '<div class="pinfo"><div class="pname">'+esc(PROFILE.name)+'</div>'+
     '<div class="pwins">★ '+PROFILE.wins+' ชัยชนะ</div></div></div>';
  h+='<div class="form-group"><label>เปลี่ยนชื่อ</label>'+
     '<input type="text" id="setName" value="'+esc(PROFILE.name)+'" maxlength="16" readonly style="opacity:.7">'+
     '<div class="hint-line">⚠ ชื่อไม่สามารถเปลี่ยนได้ (เพื่อความยุติธรรมในอันดับ)</div></div>';
  h+='<div class="form-group"><label>รหัส Passkey</label>'+
     '<div style="text-align:center;font-size:20px;letter-spacing:.4em;font-weight:700;color:#fff;padding:10px 0">●●●●●●</div>'+
     '<div class="hint-line">หากจำรหัสไม่ได้ ให้ logout และกู้คืนด้วยชื่อ + รหัส</div></div>';
  h+='<button class="big cyan" id="setLogout">🚪 ออกจากบัญชี</button>';
  h+='<button class="big warn" id="setRecovery">🔄 กู้คืนบัญชีอื่น</button>';
 } else {
  h+='<div class="form-group"><label>สร้างบัญชีใหม่</label>'+
     '<input type="text" id="setName" placeholder="ชื่อผู้ใช้ (สูงสุด 16 ตัว)" maxlength="16" autocomplete="off">'+
     '<div class="hint-line">ตัวอักษร ตัวเลข _ - เท่านั้น • ห้ามซ้ำกับคนอื่น</div></div>';
  h+='<div class="form-group"><label>ตั้งรหัส Passkey 6 ตัว</label>'+
     '<div class="passkey-display" id="passkeyDots"></div>'+
     '<div class="keypad" id="keypad"></div>'+
     '<div class="hint-line">⚠ จำรหัสให้ดี! ถ้าลืมจะกู้คืนไม่ได้</div></div>';
  h+='<button class="big green" id="setRegister" disabled>✓ สร้างบัญชี</button>';
  h+='<button class="big cyan" id="setRecovery">🔄 กู้คืนบัญชีที่มีอยู่</button>';
 }
 $('settingsBody').innerHTML=h;
 if(!PROFILE){
  // init passkey entry
  window._pkInput='';
  var dots=$('passkeyDots'),kp=$('keypad');
  dots.innerHTML='';
  for(var i=0;i<6;i++)dots.innerHTML+='<div class="passkey-dot" data-i="'+i+'"></div>';
  var keyHtml='';
  for(var n=1;n<=9;n++)keyHtml+='<button data-k="'+n+'">'+n+'</button>';
  keyHtml+='<button data-k="clr" class="special">✕</button>';
  keyHtml+='<button data-k="0">0</button>';
  keyHtml+='<button data-k="back" class="special">⌫</button>';
  kp.innerHTML=keyHtml;
  function updDots(){
   var ds=dots.querySelectorAll('.passkey-dot');
   for(var j=0;j<6;j++){
    if(j<window._pkInput.length){ds[j].classList.add('filled');ds[j].textContent='●';}
    else{ds[j].classList.remove('filled');ds[j].textContent='';}
   }
   $('setRegister').disabled=!(window._pkInput.length===6 && $('setName').value.trim().length>=2);
  }
  kp.addEventListener('click',function(ev){
   var b=ev.target.closest('button[data-k]');if(!b)return;
   var k=b.dataset.k;
   if(k==='clr')window._pkInput='';
   else if(k==='back')window._pkInput=window._pkInput.slice(0,-1);
   else if(window._pkInput.length<6)window._pkInput+=k;
   updDots();
  });
  $('setName').addEventListener('input',updDots);
  updDots();
  $('setRegister').onclick=function(){
   var name=$('setName').value.trim();
   if(name.length<2){toast('ชื่อสั้นเกินไป');return;}
   if(!/^[a-zA-Z0-9ก-๙_-]+$/.test(name)){toast('ชื่อมีอักขระต้องห้าม');return;}
   if(window._pkInput.length!==6){toast('รหัสต้อง 6 ตัว');return;}
   var pk=window._pkInput;
   $('setRegister').disabled=true;
   $('setRegister').textContent='⏳ กำลังสร้าง...';
   serverRegister(name,pk).then(function(res){
    if(res.ok){
     PROFILE={name:res.name,passkey:pk,wins:res.wins||0};
     saveProfile();
     toast('✓ สร้างบัญชีสำเร็จ!');
     renderSettings();
     updateMenuProfile();
    } else {
     toast('✕ '+(res.error||'สร้างไม่สำเร็จ'));
     $('setRegister').disabled=false;
     $('setRegister').textContent='✓ สร้างบัญชี';
    }
   }).catch(function(){
    toast('✕ เชื่อมต่อไม่ได้');
    $('setRegister').disabled=false;
    $('setRegister').textContent='✓ สร้างบัญชี';
   });
  };
  $('setRecovery').onclick=showRecoveryModal;
 } else {
  $('setLogout').onclick=function(){
   if(confirm('ออกจากบัญชี? ข้อมูลตัวละครในเครื่องจะยังอยู่')){clearProfile();renderSettings();updateMenuProfile();}
  };
  $('setRecovery').onclick=showRecoveryModal;
 }
}
function showRecoveryModal(){
 openModal(
  '<h2>🔄 กู้คืนบัญชี</h2>'+
  '<div class="form-group"><label>ชื่อผู้ใช้</label>'+
  '<input type="text" id="recName" placeholder="ชื่อที่ตั้งไว้" maxlength="16" autocomplete="off"></div>'+
  '<div class="form-group"><label>รหัส Passkey 6 ตัว</label>'+
  '<div class="passkey-display" id="recDots"></div>'+
  '<div class="keypad" id="recKeypad"></div></div>'+
  '<div class="btn-row"><button class="big gray" id="recCancel">← ยกเลิก</button>'+
  '<button class="big green" id="recGo" disabled>✓ กู้คืน</button></div>'
 );
 window._recPk='';
 var dots=$('recDots'),kp=$('recKeypad');
 for(var i=0;i<6;i++)dots.innerHTML+='<div class="passkey-dot" data-i="'+i+'"></div>';
 var kh='';
 for(var n=1;n<=9;n++)kh+='<button data-k="'+n+'">'+n+'</button>';
 kh+='<button data-k="clr" class="special">✕</button>';
 kh+='<button data-k="0">0</button>';
 kh+='<button data-k="back" class="special">⌫</button>';
 kp.innerHTML=kh;
 function upd(){
  var ds=dots.querySelectorAll('.passkey-dot');
  for(var j=0;j<6;j++){
   if(j<window._recPk.length){ds[j].classList.add('filled');ds[j].textContent='●';}
   else{ds[j].classList.remove('filled');ds[j].textContent='';}
  }
  $('recGo').disabled=!(window._recPk.length===6 && $('recName').value.trim().length>=2);
 }
 kp.addEventListener('click',function(ev){
  var b=ev.target.closest('button[data-k]');if(!b)return;
  var k=b.dataset.k;
  if(k==='clr')window._recPk='';
  else if(k==='back')window._recPk=window._recPk.slice(0,-1);
  else if(window._recPk.length<6)window._recPk+=k;
  upd();
 });
 $('recName').addEventListener('input',upd);
 upd();
 $('recCancel').onclick=closeModal;
 $('recGo').onclick=function(){
  var name=$('recName').value.trim();
  if(!name||window._recPk.length!==6)return;
  $('recGo').disabled=true;$('recGo').textContent='⏳...';
  serverLogin(name,window._recPk).then(function(res){
   if(res.ok){
    PROFILE={name:res.name,passkey:window._recPk,wins:res.wins||0};
    saveProfile();
    // also load chars from server if any
    if(res.chars){
     try{localStorage.setItem('circ_chars',JSON.stringify(res.chars));}catch(e){}
    }
    if(res.shop){
     try{localStorage.setItem('circ_shop',JSON.stringify(res.shop));}catch(e){}
    }
    closeModal();
    toast('✓ กู้คืนสำเร็จ!');
    renderSettings();
    loadChars();
   } else {
    toast('✕ '+(res.error||'ชื่อหรือรหัสไม่ถูกต้อง'));
    $('recGo').disabled=false;$('recGo').textContent='✓ กู้คืน';
   }
  }).catch(function(){
   toast('✕ เชื่อมต่อไม่ได้');
   $('recGo').disabled=false;$('recGo').textContent='✓ กู้คืน';
  });
 };
}

/* ========= RANK ========= */
function renderRank(){
 var box=$('rankList');
 box.innerHTML='<div class="lb-empty">◌ กำลังโหลด...</div>';
 fetch('/api/leaderboard').then(function(r){return r.json();}).then(function(list){
  if(!list||!list.length){box.innerHTML='<div class="lb-empty">◌ ยังไม่มีใครชนะเลย</div>';return;}
  var myName=PROFILE?PROFILE.name:'';
  var h='';
  list.forEach(function(e,i){
   var rk=i+1;
   var cls='lb-rank'+(rk<=3?' r'+rk:'');
   var you=(e.name===myName)?' lb-you':'';
   h+='<div class="lb-row'+you+'"><div class="'+cls+'">'+rk+'</div>'+
      '<div class="lb-name">'+esc(e.name)+(e.name===myName?' <span class="tag">คุณ</span>':'')+'</div>'+
      '<div class="lb-wins">★ '+e.wins+'</div></div>';
  });
  box.innerHTML=h;
 }).catch(function(){box.innerHTML='<div class="lb-empty">◌ โหลดอันดับไม่ได้</div>';});
}
$('rankRefresh').onclick=renderRank;

/* ========= SHOP ========= */
var SHOP_ITEMS=[
 {id:'slot3',n:'เพิ่มช่องสกิล',icon:'✦',cost:SHOP_SLOT3_COST,color:'#8a4aff',desc:'ใส่สกิลได้สูงสุด 3 อัน (จากเดิม 2)'},
 {id:'katana',n:'ดาบคาตานะ',icon:'⚔',cost:SHOP_KATANA_COST,color:'#ff2244',desc:'ฟันรัวทุก 0.2 วิ • ดาเมจ '+KATANA_DMG+' ต่อครั้ง'},
 {id:'lucky',n:'การ์ดโชค',icon:'🎴',cost:SHOP_LUCKY_COST,color:'#ffd166',desc:'สุ่มการ์ดในต่อสู้ • ได้สกิลทุกธาตุ หรือ HP+50%'}
];
function renderShop(){
 var box=$('shopList');
 var shop=getShop();
 var wins=PROFILE?PROFILE.wins:0;
 $('shopWins').innerHTML='★ ชัยชนะของ '+(PROFILE?('<b>'+esc(PROFILE.name)+'</b>'):'—')+' : <b>'+wins+'</b>'+(PROFILE?'':' <br><span style="font-size:11px;color:#ffa0a0">ต้องสร้างบัญชีก่อน</span>');
 var h='';
 SHOP_ITEMS.forEach(function(item){
  var owned=!!shop[item.id];
  var can=PROFILE && wins>=item.cost;
  var cls='shop-item'+(owned?' owned':'');
  h+='<div class="'+cls+'"><div class="head"><div class="icn" style="color:'+item.color+'">'+item.icon+'</div>'+
     '<div class="meta"><div class="nm">'+esc(item.n)+'</div><div class="dc">'+esc(item.desc)+'</div></div>'+
     '<div class="price">'+(owned?'✓':'★ '+item.cost)+'</div></div>'+
     '<button class="big '+(owned?'gray':(can?'green':'gray'))+'" data-buy="'+item.id+'" '+(owned||!can?'disabled':'')+'>'+
     (owned?'ซื้อแล้ว':(!PROFILE?'ต้องสร้างบัญชี':(can?'ซื้อ':'ชัยชนะไม่พอ')))
     +'</button></div>';
 });
 box.innerHTML=h;
}
$('shopList').addEventListener('click',function(e){
 var b=e.target.closest('button[data-buy]');if(!b||b.disabled)return;
 var id=b.dataset.buy;
 var item=SHOP_ITEMS.find(function(x){return x.id===id;});
 if(!item||!PROFILE)return;
 if(PROFILE.wins<item.cost){toast('ชัยชนะไม่พอ');return;}
 var shop=getShop();
 shop[id]=true;
 saveShop(shop);
 toast('✓ ซื้อ '+item.n+' แล้ว!');
 renderShop();
 // sync shop to server
 serverSyncWins(PROFILE.wins);
});

/* ========= PLAY / BOSS / ENDLESS ========= */
function startBot(){
 var me=CH[ACT];if(!me){toast('สร้างตัวละครก่อน');return;}
 prepChar(makeBot()).then(function(bot){startBattle('bot',[me,bot],0,'host');});
}
function startBossSolo(bossType){
 var me=CH[ACT];if(!me){toast('สร้างตัวละครก่อน');return;}
 prepChar(makeBoss(bossType||'mixed')).then(function(boss){startBattle('boss',[me,boss],0,'host');});
}
$('btnBot').onclick=startBot;
$('btnAgain').onclick=function(){
 if(mode==='bot')startBot();
 else if(mode==='boss'&&!wasOnlineGame)startBossSolo();
 else if(mode==='endless'&&!wasOnlineGame)startEndlessSolo();
};

var selectedBossType='mixed';
function renderBossTypes(){
 var h='';
 Object.keys(BOSS_TYPES).forEach(function(t){
  var b=BOSS_TYPES[t];
  h+='<button class="boss-btn" data-bt="'+t+'" style="border-color:'+b.color+'44;color:'+b.color+'">'+
     '<span>'+b.icon+'</span><span class="bname">'+b.n+'</span><span class="bhp">HP '+b.hp+'</span></button>';
 });
 $('bossTypeList').innerHTML=h;
}
$('btnBoss').onclick=function(){
 if(!CH[ACT]){toast('สร้างตัวละครก่อน');return;}
 renderBossTypes();
 var box=$('bossTypeOpt');
 box.style.display=box.style.display==='block'?'none':'block';
 $('bossOpt').style.display='none';$('endlessOpt').style.display='none';
};
$('btnBossTypeCancel').onclick=function(){$('bossTypeOpt').style.display='none';};
$('bossTypeList').addEventListener('click',function(e){
 var b=e.target.closest('button[data-bt]');if(!b)return;
 selectedBossType=b.dataset.bt;
 $('bossTypeOpt').style.display='none';
 var cfg=BOSS_TYPES[selectedBossType];
 $('bossOptName').textContent='จำนวนผู้เล่น (บอส'+cfg.n+' HP '+cfg.hp+'):';
 $('bossOpt').style.display='block';
});
$('btnBossCancel').onclick=function(){$('bossOpt').style.display='none';};
document.querySelectorAll('button[data-boss]').forEach(function(btn){
 btn.onclick=function(){
  var n=parseInt(btn.dataset.boss)||1;
  $('bossOpt').style.display='none';
  if(n===1)startBossSolo(selectedBossType);
  else createRoomAndWait('boss',n,selectedBossType);
 };
});
$('btnEndless').onclick=function(){
 if(!CH[ACT]){toast('สร้างตัวละครก่อน');return;}
 var box=$('endlessOpt');
 box.style.display=box.style.display==='block'?'none':'block';
 $('bossOpt').style.display='none';$('bossTypeOpt').style.display='none';
};
$('btnEndlessCancel').onclick=function(){$('endlessOpt').style.display='none';};
document.querySelectorAll('button[data-endless]').forEach(function(btn){
 btn.onclick=function(){
  var n=parseInt(btn.dataset.endless)||1;
  $('endlessOpt').style.display='none';
  if(n===1)startEndlessSolo();
  else createRoomAndWait('endless',n);
 };
});
$('btnCreateRoom').onclick=function(){
 if(!CH[ACT]){toast('สร้างตัวละครก่อน');return;}
 openCreateRoomModal();
};

function openCreateRoomModal(){
 openModal(
  '<h2>🏠 สร้างห้องออนไลน์</h2>'+
  '<div class="form-group"><label>โหมด</label>'+
  '<div class="row2" style="display:flex;gap:6px;flex-wrap:wrap">'+
  '<button class="big gray" data-rmode="boss" style="flex:1">☠ บอส</button>'+
  '<button class="big gray" data-rmode="endless" style="flex:1">∞ ไม่สิ้นสุด</button>'+
  '</div></div>'+
  '<div class="form-group"><label>จำนวนผู้เล่น</label>'+
  '<div class="row2" style="display:flex;gap:6px;justify-content:center">'+
  '<button class="num" data-rsize="2">2</button>'+
  '<button class="num" data-rsize="3">3</button>'+
  '<button class="num" data-rsize="4">4</button>'+
  '<button class="num" data-rsize="5">5</button>'+
  '</div></div>'+
  '<div id="rmodeExtra"></div>'+
  '<div class="btn-row"><button class="big gray" id="rcCancel">← ยกเลิก</button>'+
  '<button class="big green" id="rcGo" disabled>สร้างห้อง</button></div>'
 );
 var cur={mode:'boss',size:2,boss:'mixed'};
 function upd(){
  $('rcGo').disabled=!(cur.mode&&cur.size);
  document.querySelectorAll('[data-rmode]').forEach(function(b){b.classList.toggle('on',b.dataset.rmode===cur.mode);});
  document.querySelectorAll('[data-rsize]').forEach(function(b){b.classList.toggle('on',+b.dataset.rsize===cur.size);});
  if(cur.mode==='boss'){
   var h='<div class="form-group"><label>ธาตุบอส</label><div style="display:flex;flex-wrap:wrap;gap:4px">';
   Object.keys(BOSS_TYPES).forEach(function(k){
    var b=BOSS_TYPES[k];
    h+='<button data-bossel="'+k+'" style="border-color:'+b.color+'44;'+(k===cur.boss?'background:'+b.color+'33;':'')+'">'+b.icon+' '+b.n+'</button>';
   });
   h+='</div></div>';
   $('rmodeExtra').innerHTML=h;
  } else $('rmodeExtra').innerHTML='';
 }
 document.querySelectorAll('[data-rmode]').forEach(function(b){
  b.onclick=function(){cur.mode=b.dataset.rmode;upd();};
 });
 document.querySelectorAll('[data-rsize]').forEach(function(b){
  b.onclick=function(){cur.size=+b.dataset.rsize;upd();};
 });
 $('rmodeExtra').addEventListener('click',function(e){
  var b=e.target.closest('button[data-bossel]');
  if(!b)return;cur.boss=b.dataset.bossel;upd();
 });
 upd();
 $('rcCancel').onclick=closeModal;
 $('rcGo').onclick=function(){
  closeModal();
  createRoomAndWait(cur.mode,cur.size,cur.mode==='boss'?cur.boss:null);
 };
}

/* ========= ROOM / LOBBY SYSTEM (WS) ========= */
var ws=null,olState=0,pingT=null;
function wsSend(o){if(ws&&ws.readyState===1){try{ws.send(JSON.stringify(o));}catch(e){}}}
function ensureWS(){
 if(ws&&ws.readyState<=1)return;
 try{ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');}catch(e){toast('เชื่อมต่อไม่ได้');return;}
 var mine=ws;
 mine.onopen=function(){
  olState=2;
  wsSend({a:'hello',name:PROFILE?PROFILE.name:'Guest'});
  pingT=setInterval(function(){wsSend({a:'ping'});},20000);
 };
 mine.onmessage=function(e){
  var m;try{m=JSON.parse(e.data);}catch(x){return;}
  handleServerMsg(m);
 };
 mine.onclose=function(){
  if(ws!==mine)return;
  ws=null;olState=0;
  if(pingT){clearInterval(pingT);pingT=null;}
 };
}
function handleServerMsg(m){
 if(m.type==='rooms'){renderLobby(m.rooms);}
 else if(m.type==='room_created'){
  showWait('รอผู้เล่น '+m.size+' คน...','0/'+m.size);
  myRoomId=m.roomId;
 }
 else if(m.type==='room_update'){
  $('waitSub').textContent=m.count+'/'+m.size+' • '+(m.hostName?'👑 '+m.hostName:'');
 }
 else if(m.type==='match'){
  hideWait();
  var chars=(m.players||[]).map(sanitize);
  var bossRaw=(m.mode==='boss'&&m.boss)?sanitize(m.boss):null;
  if(chars.some(function(c){return !c;})||(m.mode==='boss'&&!bossRaw)){
   toast('ข้อมูลผิดปกติ');closeWS();return;
  }
  var allChars=chars.slice();
  if(bossRaw)allChars.push(bossRaw);
  if(m.mode==='endless'){
   for(var i=0;i<ENDLESS_MAX_BOTS;i++)allChars.push(makeEndlessBot(1,i,false,false));
  }
  Promise.all(allChars.map(prepChar)).then(function(prepped){
   var myIdx=+m.myIndex||0;
   var r=(myIdx===0)?'host':'guest';
   var bm=m.mode==='boss'?'boss':(m.mode==='endless'?'endless':'online');
   startBattle(bm,prepped,myIdx,r);
   if(m.mode==='endless'){
    B.endless={wave:0,state:'idle',timer:0,pointsEarned:0,isMiniBoss:false,isBossWave:false,nextVariantSeed:0};
    var realCount=chars.length;
    for(var j=realCount;j<B.players.length;j++){B.players[j].isEndlessBot=true;B.players[j].reserved=true;B.players[j].alive=false;}
    if(r==='host')startNextWave();
   }
  });
 }
 else if(m.type==='state')applyState(m.s);
 else if(m.type==='suckDone'){
  if(role==='host'&&B&&mode==='boss'){
   var boss=findBoss();
   if(boss&&boss.suckActive&&typeof m.from==='number'){
    var p=B.players[m.from];
    if(p&&!p.c._isBoss&&p.alive&&(!boss.suckDone||boss.suckDone[p.index]!=='escaped')){
     if(!boss.suckPulls)boss.suckPulls={};
     if(!boss.suckDone)boss.suckDone={};
     boss.suckPulls[p.index]=BOSS_SUCK_PRESSES;
     boss.suckDone[p.index]='escaped';
     var dx=p.x-boss.x,dy=p.y-boss.y;var d=Math.hypot(dx,dy)||1;
     p.vx=(dx/d)*950;p.vy=(dy/d)*950;
    }
   }
  }
 }
 else if(m.type==='left'){
  if(B&&!B.over&&!B.done&&olState>=2){
   B.over=true;B.done=true;cancelAnimationFrame(raf);closeWS();
   showRes('← มีผู้เล่นออกจากเกม');
  }
 }
}
var myRoomId=null;
function createRoomAndWait(mode,size,bossType){
 if(!PROFILE){toast('ต้องสร้างบัญชีก่อน');return;}
 if(!CH[ACT]){toast('สร้างตัวละครก่อน');return;}
 ensureWS();
 var trySend=function(){
  if(ws&&ws.readyState===1){
   wsSend({a:'create_room',mode:mode,size:size,bossType:bossType,char:strip(CH[ACT]),name:PROFILE.name,wins:PROFILE.wins});
   showWait('กำลังสร้างห้อง...','');
  } else {
   setTimeout(trySend,200);
  }
 };
 trySend();
}
function closeWS(){
 olState=0;
 if(pingT){clearInterval(pingT);pingT=null;}
 if(ws){try{wsSend({a:'leave_room'});ws.close();}catch(e){}ws=null;}
 myRoomId=null;
}
function showWait(main,sub){
 $('wait').style.display='block';
 $('wait').querySelector('div').textContent=main;
 $('waitSub').textContent=sub||'';
}
function hideWait(){$('wait').style.display='none';}
$('btnCancelWait').onclick=function(){closeWS();hideWait();};

/* ========= LOBBY ========= */
function refreshLobby(){
 ensureWS();
 var trySend=function(){
  if(ws&&ws.readyState===1)wsSend({a:'list_rooms'});
  else setTimeout(trySend,200);
 };
 trySend();
 setTimeout(function(){if(ws&&ws.readyState===1)wsSend({a:'list_rooms'});},400);
}
$('lobbyRefresh').onclick=refreshLobby;
function renderLobby(rooms){
 var box=$('lobbyList');
 if(!rooms||!rooms.length){
  box.innerHTML='<div class="room-empty">◌ ยังไม่มีห้องในขณะนี้<br><span style="font-size:11px">สร้างห้องใหม่ได้จาก "เริ่มเล่น"</span></div>';
  return;
 }
 var h='';
 rooms.forEach(function(r){
  var icon=r.mode==='boss'?'☠':(r.mode==='endless'?'∞':'⚔');
  var modeName=r.mode==='boss'?('บอส '+(BOSS_TYPES[r.bossType]?BOSS_TYPES[r.bossType].n:'')):(r.mode==='endless'?'ไม่สิ้นสุด':'ออนไลน์');
  h+='<div class="room-item"><div class="room-icon">'+icon+'</div>'+
     '<div class="room-info"><div class="room-mode">'+esc(modeName)+'</div>'+
     '<div class="room-meta">👥 '+r.count+'/'+r.size+' คน • '+r.age+'s ที่แล้ว</div>'+
     '<div class="room-host">👑 '+esc(r.hostName||'?')+' • ★ '+r.hostWins+'</div></div>'+
     '<button class="room-join" data-room="'+r.id+'">เข้าร่วม</button></div>';
 });
 box.innerHTML=h;
}
$('lobbyList').addEventListener('click',function(e){
 var b=e.target.closest('button[data-room]');if(!b)return;
 if(!PROFILE){toast('ต้องสร้างบัญชีก่อน');return;}
 if(!CH[ACT]){toast('สร้างตัวละครก่อน');return;}
 ensureWS();
 var rid=b.dataset.room;
 var tryJoin=function(){
  if(ws&&ws.readyState===1){
   wsSend({a:'join_room',roomId:rid,char:strip(CH[ACT]),name:PROFILE.name,wins:PROFILE.wins});
   showWait('กำลังเข้าร่วมห้อง...','');
  } else setTimeout(tryJoin,200);
 };
 tryJoin();
});

/* ========= CHARACTER EDITOR ========= */
var dc=$('dc'),dx=dc.getContext('2d'),ED=null,tool='brush',playT=null;
function activeFrames(){return ED.editingMinion?ED.minionFrames:ED.frames;}
function activeCur(){return ED.editingMinion?ED.minionCur:ED.cur;}
function setActiveCur(v){if(ED.editingMinion)ED.minionCur=v;else ED.cur=v;}
function commit(){var arr=activeFrames(),i=activeCur();var x=arr[i].getContext('2d');x.clearRect(0,0,S,S);x.drawImage(dc,0,0);}
function loadFrame(i){setActiveCur(i);var arr=activeFrames();dx.clearRect(0,0,S,S);dx.drawImage(arr[activeCur()],0,0);renderFbar();}
function renderFbar(){var arr=activeFrames(),idx=activeCur();var h='';
 for(var i=0;i<arr.length;i++)h+='<button data-f="'+i+'" class="'+(i===idx?'on':'')+'">'+(i+1)+'</button>';
 $('fbar').innerHTML=h;}
$('fbar').addEventListener('click',function(e){if(e.target.dataset.f===undefined)return;commit();loadFrame(+e.target.dataset.f);});
$('btnAdd').onclick=function(){commit();var arr=activeFrames();
 if(arr.length>=8){toast('สูงสุด 8');return;}
 var n=newCanvas();n.getContext('2d').drawImage(arr[activeCur()],0,0);
 arr.splice(activeCur()+1,0,n);loadFrame(activeCur()+1);};
$('btnDel').onclick=function(){var arr=activeFrames();
 if(arr.length<=1){toast('ต้องมีอย่างน้อย 1');return;}
 arr.splice(activeCur(),1);loadFrame(Math.min(activeCur(),arr.length-1));};
$('btnClr').onclick=function(){dx.clearRect(0,0,S,S);commit();};
$('tools').addEventListener('click',function(e){
 var t=e.target.dataset.t;if(!t)return;tool=t;
 var bs=$('tools').querySelectorAll('button');
 for(var i=0;i<bs.length;i++)bs[i].classList.toggle('on',bs[i].dataset.t===t);
});
$('btnUp').onclick=function(){$('upl').click();};
$('upl').onchange=function(){
 var f=this.files[0];this.value='';if(!f)return;
 var fr=new FileReader();
 fr.onload=function(){var im=new Image();
  im.onload=function(){dx.clearRect(0,0,S,S);
   var sc=Math.max(S/im.width,S/im.height),w=im.width*sc,h=im.height*sc;
   dx.drawImage(im,(S-w)/2,(S-h)/2,w,h);commit();};
  im.src=fr.result;};
 fr.readAsDataURL(f);};
var down=false,lx=0,ly=0;
function pos(e){var r=dc.getBoundingClientRect();return [(e.clientX-r.left)/r.width*S,(e.clientY-r.top)/r.height*S];}
function stroke(a,b,c,d){
 dx.save();dx.lineCap='round';dx.lineJoin='round';dx.lineWidth=+$('bsz').value;
 if(tool==='eraser')dx.globalCompositeOperation='destination-out';else dx.strokeStyle=$('col').value;
 dx.beginPath();dx.moveTo(a,b);dx.lineTo(c,d);dx.stroke();dx.restore();}
function hex2rgb(h){return [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)];}
function fill(x,y,col){
 var img=dx.getImageData(0,0,S,S),d=img.data,i0=(y*S+x)*4;
 var t=[d[i0],d[i0+1],d[i0+2],d[i0+3]],f=hex2rgb(col);
 if(t[3]===255&&t[0]===f[0]&&t[1]===f[1]&&t[2]===f[2])return;
 function m(i){return Math.abs(d[i]-t[0])+Math.abs(d[i+1]-t[1])+Math.abs(d[i+2]-t[2])+Math.abs(d[i+3]-t[3])<=40;}
 var st=[x,y],vis=new Uint8Array(S*S);
 while(st.length){
  var yy=st.pop(),xx=st.pop();
  if(xx<0||yy<0||xx>=S||yy>=S)continue;
  var p=yy*S+xx;if(vis[p])continue;vis[p]=1;
  var i=p*4;if(!m(i))continue;
  d[i]=f[0];d[i+1]=f[1];d[i+2]=f[2];d[i+3]=255;
  st.push(xx+1,yy,xx-1,yy,xx,yy+1,xx,yy-1);
 }
 dx.putImageData(img,0,0);}
dc.addEventListener('pointerdown',function(e){
 e.preventDefault();var p=pos(e);
 if(tool==='bucket'){fill(Math.min(S-1,Math.max(0,Math.floor(p[0]))),Math.min(S-1,Math.max(0,Math.floor(p[1]))),$('col').value);commit();return;}
 down=true;lx=p[0];ly=p[1];stroke(lx,ly,lx,ly);
 try{dc.setPointerCapture(e.pointerId);}catch(x){}});
dc.addEventListener('pointermove',function(e){
 if(!down)return;var p=pos(e);stroke(lx,ly,p[0],p[1]);lx=p[0];ly=p[1];});
['pointerup','pointercancel'].forEach(function(ev){
 dc.addEventListener(ev,function(){if(down){down=false;commit();}});});

function renderSkPick(){
 var h='';
 var wins=PROFILE?PROFILE.wins:0;
 Object.keys(SK).forEach(function(id){
  if(id==='bossSummon')return;
  var on=ED.skills.some(function(s){return s.id===id});
  var locked=(id==='dark'&&wins<DARK_UNLOCK);
  h+='<button data-s="'+id+'" class="'+(on?'on':'')+'" style="border-color:'+(on?SK[id].color:'rgba(255,255,255,.2)')+';'+(locked?'opacity:.4':'')+'">'+
     elemSvg(id,16,SK[id].color)+' '+SK[id].n+(locked?' 🔒'+DARK_UNLOCK:'')+'</button>';
 });
 $('skpick').innerHTML=h;
 $('skMax').textContent=hasSlot3()?3:2;
 var g='';
 ED.skills.forEach(function(s,i){
  var cN=(s.slots&&s.slots.cast)?s.slots.cast.length:0;
  g+='<div class="sk" style="border-color:'+s.color+'44">'+
   '<b style="color:'+s.color+';display:inline-flex;align-items:center;gap:6px">'+elemSvg(s.id,16,s.color)+SK[s.id].n+'</b> <span class="tag">'+SK[s.id].status+'</span>'+
   row('✹ ดาเมจ',i,'dmg',LIM.dmg.min,LIM.dmg.max,LIM.dmg.step,s.dmg)+
   row('◷ คูลดาวน์',i,'cd',LIM.cd.min,LIM.cd.max,LIM.cd.step,s.cd)+
   row('✦ ขนาด',i,'power',LIM.power.min,LIM.power.max,LIM.power.step,s.power)+
   '<div class="row"><span>▨ สี</span><input type="color" data-i="'+i+'" data-f="color" value="'+s.color+'" style="width:52px;height:30px;border:0;border-radius:6px;background:transparent"></div>'+
   '<button class="eff-btn" data-skef="'+i+'" data-slot="cast">'+elemSvg(s.id,16,s.color)+' '+SK[s.id].slots.cast+' <span class="tag">'+(cN?cN+' เฟรม':'ว่าง')+'</span></button>'+
   '</div>';
 });
 var combo=getCombo(ED.skills);
 if(combo){
  var cc=combo==='timeStop'?'#7fdcff':'#fff';
  g+='<div class="bal-info" style="color:'+cc+';border-color:'+cc+'aa">✦ <b>คอมโบ!</b> '+COMBO_INFO[combo].n+'<br>'+COMBO_INFO[combo].d+'</div>';
 }
 $('skset').innerHTML=g;
 updateMinionBtn();
}
function row(l,i,f,mn,mx,st,v){
 return '<div class="row"><span>'+l+'</span><input type="range" data-i="'+i+'" data-f="'+f+'" min="'+mn+'" max="'+mx+'" step="'+st+'" value="'+v+'"><b>'+v+'</b></div>';
}
$('skpick').addEventListener('click',function(e){
 var t=e.target.closest('button[data-s]');if(!t)return;
 var id=t.dataset.s;
 var wins=PROFILE?PROFILE.wins:0;
 if(id==='dark'&&wins<DARK_UNLOCK){toast('🔒 ธาตุมืดต้องมี '+DARK_UNLOCK+' ชัยชนะ');return;}
 var k=-1;ED.skills.forEach(function(s,i){if(s.id===id)k=i;});
 if(k>=0)ED.skills.splice(k,1);
 else{var maxSk=hasSlot3()?3:2;if(ED.skills.length>=maxSk){toast('สูงสุด '+maxSk);return;}ED.skills.push(defSkill(id));}
 renderSkPick();
});
$('skset').addEventListener('input',function(e){
 var t=e.target,i=t.dataset.i,f=t.dataset.f;if(i===undefined)return;
 var s=ED.skills[+i];if(!s)return;
 if(f==='color'){s.color=t.value;return;}
 var lim=LIM[f];if(!lim)return;
 var v=clamp(t.value,lim.min,lim.max);
 if(f==='power')v=roundTenth(v);else v=roundHalf(v);
 s[f]=v;
 var bCd=s.cd,bDmg=s.dmg;applyBalance(s,f);
 if(t.nextElementSibling)t.nextElementSibling.textContent=v;
});
$('skset').addEventListener('click',function(e){
 var btn=e.target.closest('button[data-skef]');if(!btn)return;
 openSkEffect(+btn.dataset.skef,btn.dataset.slot);
});
function updateMinionBtn(){
 var hasPet=ED&&ED.skills&&ED.skills.some(function(s){return s.id==='pet';});
 var b=$('btnMinionEdit');
 if(hasPet){b.style.display='flex';b.textContent=ED.editingMinion?'🐾 กลับ':'🐾 แก้ไขลูกน้อง';
  $('minionHint').style.display=ED.editingMinion?'block':'none';}
 else{b.style.display='none';$('minionHint').style.display='none';if(ED.editingMinion){ED.editingMinion=false;loadFrame(0);}}
}
function openEditor(slot){
 var c=CH[slot];
 ED={slot:slot,frames:[],cur:0,skills:[],weapon:'none',minionFrames:[],minionCur:0,editingMinion:false};
 if(c){
  $('cname').value=c.name;
  c.imgs.forEach(function(im){var cv=newCanvas();cv.getContext('2d').drawImage(im,0,0,S,S);ED.frames.push(cv);});
  ED.skills=JSON.parse(JSON.stringify(c.skills));
  ED.weapon=c.weapon||'none';
  if(c.minion&&c.minion.imgs)c.minion.imgs.forEach(function(im){var cv=newCanvas();cv.getContext('2d').drawImage(im,0,0,S,S);ED.minionFrames.push(cv);});
 } else {$('cname').value='';ED.frames=[newCanvas()];}
 if(!ED.minionFrames.length)ED.minionFrames=[newCanvas()];
 ED.editingMinion=false;
 $('minionHint').style.display='none';
 updateMinionBtn();
 loadFrame(0);renderSkPick();renderWeaponPick();show('editor');
}
$('btnMinionEdit').onclick=function(){
 commit();if(!ED)return;
 if(!ED.skills.some(function(s){return s.id==='pet';})){toast('เลือกสัตว์เลี้ยงก่อน');return;}
 ED.editingMinion=!ED.editingMinion;updateMinionBtn();loadFrame(0);
};
$('btnSave').onclick=function(){
 commit();
 if(!ED.skills.length){toast('เลือกสกิลอย่างน้อย 1');return;}
 var urls=ED.frames.map(function(c){return c.toDataURL('image/png');});
 var name=$('cname').value.trim()||'ตัวละคร';
 var obj=sanitize({name:name,frames:urls,skills:ED.skills,weapon:ED.weapon});
 if(ED.skills.some(function(s){return s.id==='pet';}))obj.minion={frames:ED.minionFrames.map(function(c){return c.toDataURL('image/png');})};
 var a=getChars();a[ED.slot]=obj;setStore(a);
 ACT=ED.slot;localStorage.setItem('circ_act',ACT);
 loadChars().then(function(){show('chars');toast('✓ บันทึกแล้ว');});
};
$('btnBack').onclick=function(){show('chars');drawStaticPreviews();};
function renderWeaponPick(){
 var katanaOwned=hasKatana(),luckyOwned=hasLucky();
 var h='';
 Object.keys(WEAPONS).forEach(function(wid){
  var w=WEAPONS[wid];
  if(w.shop&&wid==='katana'&&!katanaOwned)return;
  if(w.shop&&wid==='lucky'&&!luckyOwned)return;
  var locked=false;
  if(wid==='katana')locked=!katanaOwned;
  else if(wid==='lucky')locked=!luckyOwned;
  else locked=((PROFILE?PROFILE.wins:0)<w.unlock);
  var on=ED.weapon===wid;
  var extra=wid==='katana'?'kn ':(wid==='lucky'?'lk ':'');
  var cls=(locked?'locked ':'')+(on?'on ':'')+extra;
  h+='<button class="wpn-btn '+cls+'" data-w="'+wid+'" '+(locked?'disabled':'')+'>'+w.icon+' '+w.n+'</button>';
 });
 $('weaponPick').innerHTML=h;
}
$('weaponPick').addEventListener('click',function(e){
 var b=e.target.closest('button[data-w]');if(!b||b.disabled)return;
 ED.weapon=b.dataset.w;renderWeaponPick();
});

/* ========= SKILL EFFECT EDITOR ========= */
var EF=null,efTool='brush',efDown=false,efLx=0,efLy=0;
function openSkEffect(skIdx,slot){
 var s=ED.skills[skIdx];if(!s)return;
 slot=slot||'cast';
 var srcs=(s.slots&&s.slots[slot]&&s.slots[slot].length)?s.slots[slot]:[null];
 Promise.all(srcs.map(loadImg)).then(function(imgs){
  EF={idx:skIdx,slot:slot,cur:0,size:SKEFF_SIZE,frames:[],history:[]};
  imgs.forEach(function(im){
   var l0=newCanvas(SKEFF_SIZE);
   if(im&&im.width)l0.getContext('2d').drawImage(im,0,0,SKEFF_SIZE,SKEFF_SIZE);
   EF.frames.push({layers:[l0],activeLayer:0});
  });
  EF.ecanvas=$('sfc');EF.ectx=EF.ecanvas.getContext('2d');
  EF.gcanvas=$('sfg');EF.gctx=EF.gcanvas.getContext('2d');
  $('skef-title').textContent='แก้ไขเอฟเฟค: '+SK[s.id].n;
  loadEfFrame(0);show('skeffect');
 });
}
function efFrameComposite(f){
 var cv=newCanvas(EF.size),cx=cv.getContext('2d');
 f.layers.forEach(function(l){cx.drawImage(l,0,0);});return cv;}
function efRedraw(){var f=EF.frames[EF.cur];EF.ectx.clearRect(0,0,EF.size,EF.size);EF.ectx.drawImage(efFrameComposite(f),0,0);}
function loadEfFrame(i){
 EF.cur=i;var f=EF.frames[i];if(f.activeLayer>=f.layers.length)f.activeLayer=0;
 var gx=EF.gctx;gx.clearRect(0,0,EF.size,EF.size);
 if($('efOnion').checked&&i>0)gx.drawImage(efFrameComposite(EF.frames[i-1]),0,0);
 efRedraw();renderEfBar();renderLayerBar();
}
function renderEfBar(){var h='';for(var i=0;i<EF.frames.length;i++)h+='<button data-ef="'+i+'" class="'+(i===EF.cur?'on':'')+'">'+(i+1)+'</button>';$('efbar').innerHTML=h;}
function renderLayerBar(){var f=EF.frames[EF.cur];var h='';for(var i=0;i<f.layers.length;i++)h+='<button data-lyr="'+i+'" class="'+(i===f.activeLayer?'on':'')+'">'+(i+1)+'</button>';$('eflayerbtn').innerHTML=h;}
function efPushHistory(){
 if(!EF)return;
 var snap={cur:EF.cur,frames:EF.frames.map(function(f){
  var layers=f.layers.map(function(l){var n=newCanvas(EF.size);n.getContext('2d').drawImage(l,0,0);return n;});
  return {layers:layers,activeLayer:f.activeLayer};})};
 EF.history.push(snap);if(EF.history.length>20)EF.history.shift();
}
$('efUndo').onclick=function(){
 if(!EF||!EF.history.length){toast('ไม่มีอะไรย้อน');return;}
 var snap=EF.history.pop();EF.cur=snap.cur;
 EF.frames=snap.frames.map(function(f){
  var layers=f.layers.map(function(l){var n=newCanvas(EF.size);n.getContext('2d').drawImage(l,0,0);return n;});
  return {layers:layers,activeLayer:f.activeLayer};});
 loadEfFrame(EF.cur);
};
$('efbar').addEventListener('click',function(e){var t=e.target.closest('button[data-ef]');if(!t)return;loadEfFrame(+t.dataset.ef);});
$('eflayerbtn').addEventListener('click',function(e){var t=e.target.closest('button[data-lyr]');if(!t)return;EF.frames[EF.cur].activeLayer=+t.dataset.lyr;renderLayerBar();});
$('efLayerAdd').onclick=function(){if(!EF)return;efPushHistory();var f=EF.frames[EF.cur];if(f.layers.length>=6){EF.history.pop();toast('สูงสุด 6');return;}f.layers.push(newCanvas(EF.size));f.activeLayer=f.layers.length-1;loadEfFrame(EF.cur);};
$('efLayerDel').onclick=function(){if(!EF)return;var f=EF.frames[EF.cur];if(f.layers.length<=1){toast('ต้องมี 1');return;}efPushHistory();f.layers.splice(f.activeLayer,1);if(f.activeLayer>=f.layers.length)f.activeLayer=f.layers.length-1;loadEfFrame(EF.cur);};
$('efOnion').onchange=function(){if(EF)loadEfFrame(EF.cur);};
$('efAdd').onclick=function(){if(!EF)return;efPushHistory();if(EF.frames.length>=8){EF.history.pop();toast('สูงสุด 8');return;}EF.frames.splice(EF.cur+1,0,{layers:[newCanvas(EF.size)],activeLayer:0});loadEfFrame(EF.cur+1);};
$('efDel').onclick=function(){if(!EF)return;if(EF.frames.length<=1){toast('ต้องมี 1');return;}efPushHistory();EF.frames.splice(EF.cur,1);loadEfFrame(Math.min(EF.cur,EF.frames.length-1));};
$('efClr').onclick=function(){if(!EF)return;efPushHistory();EF.frames[EF.cur].layers[EF.frames[EF.cur].activeLayer].getContext('2d').clearRect(0,0,EF.size,EF.size);efRedraw();};
$('eftools').addEventListener('click',function(e){var t=e.target.dataset.et;if(!t)return;efTool=t;var bs=$('eftools').querySelectorAll('button');for(var i=0;i<bs.length;i++)bs[i].classList.toggle('on',bs[i].dataset.et===t);});
function efPos(e){var r=EF.ecanvas.getBoundingClientRect();return [(e.clientX-r.left)/r.width*EF.size,(e.clientY-r.top)/r.height*EF.size];}
function efStroke(a,b,c,d){
 var f=EF.frames[EF.cur],lx=f.layers[f.activeLayer].getContext('2d');
 lx.save();lx.lineCap='round';lx.lineJoin='round';lx.lineWidth=+$('efbsz').value;
 if(efTool==='eraser')lx.globalCompositeOperation='destination-out';else lx.strokeStyle=$('efcol').value;
 lx.beginPath();lx.moveTo(a,b);lx.lineTo(c,d);lx.stroke();lx.restore();efRedraw();
}
$('sfc').addEventListener('pointerdown',function(e){if(!EF)return;e.preventDefault();efPushHistory();var p=efPos(e);efDown=true;efLx=p[0];efLy=p[1];efStroke(efLx,efLy,efLx,efLy);try{EF.ecanvas.setPointerCapture(e.pointerId);}catch(x){}});
$('sfc').addEventListener('pointermove',function(e){if(!EF||!efDown)return;var p=efPos(e);efStroke(efLx,efLy,p[0],p[1]);efLx=p[0];efLy=p[1];});
['pointerup','pointercancel'].forEach(function(ev){$('sfc').addEventListener(ev,function(){if(EF&&efDown)efDown=false;});});
$('efSave').onclick=function(){
 if(!EF)return;
 var s=ED.skills[EF.idx];
 var urls=EF.frames.map(function(f){
  var cv=newCanvas(EF.size),cx=cv.getContext('2d');
  f.layers.forEach(function(l){cx.drawImage(l,0,0);});
  return cv.toDataURL('image/png');}).slice(0,8);
 if(!s.slots)s.slots={cast:[],status:[]};
 s.slots[EF.slot]=urls;renderSkPick();show('editor');
};
$('efBack').onclick=function(){show('editor');};

/* ========= BATTLE ========= */
var bc=$('bc'),ctx=bc.getContext('2d');
var B=null,mode='bot',role='host',raf=0,lastT=0,sendT=0;
var wasOnlineGame=false;
var luckyRollReward=null;

function spawnPositions(n){
 var cx=W/2,cy=H/2,radius=Math.min(W,H)*0.35,out=[];
 for(var i=0;i<n;i++){var a=Math.PI+(i/n)*Math.PI*2;
  out.push({x:cx+Math.cos(a)*radius,y:cy+Math.sin(a)*radius,vx:-Math.cos(a)*120,vy:-Math.sin(a)*120});}
 return out;
}
function mk(c,pos,index){
 var baseHp=c._hp||100;
 var p={c:c,index:index,alive:true,x:pos.x,y:pos.y,vx:pos.vx,vy:pos.vy,hp:baseHp,maxHp:baseHp,r:c._r||R,
  cd:c.skills.map(function(s){return s.cd*0.6;}),
  burnLeft:0,burnTick:0,burnDmg:0,burnSrc:null,freezeSrc:null,pullSrc:null,stunSrc:null,
  freezeLeft:0,pullLeft:0,stunLeft:0,stunTick:0,pullTarget:null,
  regenLeft:0,regenSrc:null,bleedLeft:0,bleedSrc:null,
  poisonLeft:0,poisonTick:0,poisonDmg:0,poisonSrc:null,
  lightLeft:0,lightTick:0,lightDmg:0,lightSrc:null,lightStunLeft:0,
  bouncing:false,bounce:null,
  dash:0,dashHit:false,dashK:0,dashChance:true,dashAng:0,dashCombo:null,
  flash:0,say:0,sayT:0,weaponCd:0,swingT:0,swingAng:0,luckyCd:0,
  reserved:false,tx:undefined,ty:undefined};
 if(c._isBoss){
  p.suckCd=BOSS_SUCK_INTERVAL;p.suckActive=false;p.suckTimer=0;p.suckPulls={};p.suckDone={};
  p.rageActive=false;p.rageCastTimer=BOSS_RAGE_CAST_INTERVAL;p.rageSkillIdx=0;p.ragePulse=0;
  p.bossDashCd=BOSS_DASH_INTERVAL;p.bossDashActive=false;p.bossDashWarnT=0;p.bossDashWarnTarget=-1;
 }
 return p;
}
function renderHUD(){
 var h='';
 if(mode==='endless'){
  for(var i=0;i<B.players.length;i++){
   var p=B.players[i];if(p.isEndlessBot)continue;
   var pct=Math.max(0,Math.min(100,p.hp/p.maxHp*100));
   h+='<div class="hb'+(i===B.myIndex?' me':'')+'" data-hb="'+i+'"><b>'+esc(p.c.name)+'</b>'+
      '<div class="bar"><i style="width:'+pct+'%"></i></div><small>HP '+Math.round(p.hp*10)/10+'/'+p.maxHp+'</small></div>';
  }
  $('hud').innerHTML=h;$('endlessHUD').style.display='block';return;
 }
 $('endlessHUD').style.display='none';
 for(var i=0;i<B.players.length;i++){
  var p=B.players[i];if(p.reserved)continue;
  var pct=Math.max(0,Math.min(100,p.hp/p.maxHp*100));
  var cls='hb'+(i===B.myIndex?' me':'')+(p.c._isBoss?' boss':'');
  if(p.c._isBoss&&p.rageActive)cls+=' rage';
  h+='<div class="'+cls+'" data-hb="'+i+'"><b>'+esc(p.c.name)+(i===B.myIndex?' ●':'')+'</b>'+
     '<div class="bar"><i style="width:'+pct+'%"></i></div><small>HP '+Math.round(p.hp*10)/10+'/'+p.maxHp+'</small></div>';
 }
 $('hud').innerHTML=h;
}
function updateHUD(){
 for(var i=0;i<B.players.length;i++){
  var p=B.players[i];if(p.reserved)continue;
  if(mode==='endless'&&p.isEndlessBot)continue;
  var el=$('hud').querySelector('[data-hb="'+i+'"]');if(!el)continue;
  var pct=Math.max(0,Math.min(100,p.hp/p.maxHp*100));
  el.querySelector('.bar i').style.width=pct+'%';
  el.querySelector('small').textContent=p.alive?('HP '+Math.round(p.hp*10)/10+'/'+p.maxHp):'ตาย';
  el.style.opacity=p.alive?'1':'0.4';
  if(p.c._isBoss){if(p.rageActive)el.classList.add('rage');else el.classList.remove('rage');}
 }
 if(mode==='endless'&&B.endless){
  $('endlessWave').textContent='คลื่นที่ '+B.endless.wave+(B.endless.isBossWave?' 👑':'')+(B.endless.isMiniBoss?' ⭐':'');
  var aliveBots=0;
  for(var j=0;j<B.players.length;j++)if(B.players[j].isEndlessBot&&B.players[j].alive)aliveBots++;
  $('endlessEnemies').textContent=aliveBots;
  $('endlessPts').textContent=B.endless.pointsEarned;
 }
}
function startBattle(m,chars,myIndex,r){
 mode=m;role=r||'host';
 wasOnlineGame=(m==='online')||(m==='boss'&&olState>=2)||(m==='endless'&&olState>=2);
 if(m==='boss'){W=W_BOSS;H=H_BOSS;}
 else if(m==='endless'){W=W_ENDLESS;H=H_ENDLESS;}
 else{W=360;H=520;}
 bc.width=W;bc.height=H;
 bc.style.maxWidth=Math.min(W,900)+'px';
 $('battle').style.maxWidth=(Math.min(W,900)+40)+'px';
 B={players:[],proj:[],zones:[],parts:[],hitFx:[],beams:[],rocks:[],dashExplosions:[],minions:[],gods:[],
   myIndex:myIndex||0,phase:'intro',introT:3.2,over:false,winner:-1,endT:0,done:false,time:0,
   bossDashWarn:null,timeStop:null};
 var positions=spawnPositions(chars.length);
 chars.forEach(function(c,i){B.players.push(mk(c,positions[i],i));});
 $('res').style.display='none';$('suckBox').style.display='none';$('waveBanner').style.display='none';
 guestSuckPress=0;luckyRollReward=null;$('luckyRoll').style.display='none';
 updateLuckyBtnVisibility();renderHUD();show('battle');
 lastT=performance.now();sendT=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
}
function updateLuckyBtnVisibility(){
 var me=B&&B.players[B.myIndex];
 var showLucky=me&&me.c.weapon==='lucky'&&me.alive&&!B.over&&!B.done;
 $('luckyBox').style.display=showLucky?'block':'none';
 if(!showLucky)$('luckyRoll').style.display='none';
}
function burst(x,y,color,n,spd){
 spd=spd||1;
 for(var i=0;i<n;i++){var a=Math.random()*6.283,s=(40+Math.random()*120)*spd;
  B.parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5+Math.random()*.4,color:color,size:2+Math.random()*3});}
}
function hurt(f,n){
 if(B.over||!f.alive||n<=0)return;
 f.hp=Math.max(0,f.hp-n);f.flash=.15;burst(f.x,f.y,'#ffffff',6,1);
 if(f.hp<=0){f.alive=false;burst(f.x,f.y,'#ffffff',40,1.6);
  if(mode==='endless'&&f.isEndlessBot)return;checkWin();}
}
function heal(f,n){if(!f.alive||n<=0)return;f.hp=Math.min(f.maxHp,f.hp+n);}
function findBoss(){for(var i=0;i<B.players.length;i++)if(B.players[i].c._isBoss&&!B.players[i].reserved)return B.players[i];return null;}
function isMinionObj(t){return !!(t&&!t.c);}
function hurtMinion(m,n,color){
 if(!m||!m.alive||n<=0)return;
 m.hp=Math.max(0,m.hp-n);m.flash=.2;burst(m.x,m.y,color||'#fff',6,1.2);
 if(m.hp<=0){m.alive=false;burst(m.x,m.y,m.color||'#ff88cc',16,1.6);}
}
function checkWin(){
 if(B.over)return;
 if(mode==='endless')return;
 if(mode==='boss'){
  var bossP=findBoss();
  var alivePlayers=B.players.filter(function(p){return !p.c._isBoss&&!p.reserved&&p.alive;});
  if(!bossP||!bossP.alive){B.over=true;B.winner=-2;return;}
  if(alivePlayers.length===0){B.over=true;B.winner=bossP.index;return;}
 } else {
  var alive=B.players.filter(function(p){return p.alive&&!p.reserved;});
  if(alive.length<=1){B.over=true;B.winner=alive.length===1?alive[0].index:-1;}
 }
}
function nearestEnemy(f){
 var best=null,bestD=Infinity;
 var myIsBoss=!!(f.c&&f.c._isBoss);
 var fIsBot=!!f.isEndlessBot;
 for(var i=0;i<B.players.length;i++){
  var o=B.players[i];if(o===f||!o.alive||o.reserved)continue;
  if(mode==='endless'){if(!!o.isEndlessBot===fIsBot)continue;}
  else if(mode==='boss'){if((!!o.c._isBoss)===myIsBoss)continue;}
  var d=Math.hypot(o.x-f.x,o.y-f.y);
  if(d<bestD){bestD=d;best=o;}
 }
 if(B.minions){
  for(var mi=0;mi<B.minions.length;mi++){
   var m=B.minions[mi];if(!m.alive||m.owner===f.index)continue;
   var oP=B.players[m.owner];if(!oP||!oP.alive)continue;
   if(mode==='endless'&&(!!oP.isEndlessBot)===fIsBot)continue;
   if(mode==='boss'&&(!!oP.c._isBoss)===myIsBoss)continue;
   var dm=Math.hypot(m.x-f.x,m.y-f.y);
   if(dm<bestD){bestD=dm;best=m;}
  }
 }
 return best;
}
function getSlotImgs(f,k,slot){
 if(!f.c.skillSlotImgs||!f.c.skillSlotImgs[k])return null;
 var s=f.c.skillSlotImgs[k];return slot==='cast'?s.cast:s.status;
}
function castMeteor(f,k,target,ic,is){
 for(var i=0;i<3;i++){
  var offX=(i-1)*70;
  var rx=Math.max(60,Math.min(W-60,target.x+offX+(Math.random()-0.5)*30));
  var ry=Math.max(60,Math.min(H-60,target.y+(Math.random()-0.5)*50));
  var fT=0.9+i*0.18;
  B.rocks.push({k:'meteor',owner:f.index,x:rx,y:ry,r:42,fallT:fT,maxFallT:fT,life:fT+0.4,maxLife:fT+0.4,
   dmg:3,color:'#ff6a00',castImgs:ic,statusImgs:is,statusSrc:{owner:f.index,skill:k},
   hitSet:{},hitDone:false,fireDuration:5,fireRadius:95,fireDmg:0.5});
 }
}
function castExplosiveDash(f,k,target){
 var a=Math.atan2(target.y-f.y,target.x-f.x);
 f.dash=0.6;f.dashHit=false;f.dashK=k;f.dashAng=a;f.dashChance=true;f.dashCombo='explosive';
 f.vx=Math.cos(a)*650;f.vy=Math.sin(a)*650;
}
function castPetStone(f,k,target,ic,is){
 var rx=Math.max(60,Math.min(W-60,target.x+(Math.random()-0.5)*30));
 var ry=Math.max(60,Math.min(H-60,target.y+(Math.random()-0.5)*30));
 var fT=0.8;
 B.rocks.push({k:'petStone',owner:f.index,x:rx,y:ry,r:44,fallT:fT,maxFallT:fT,life:fT+0.4,maxLife:fT+0.4,
  dmg:2,color:'#ff88cc',castImgs:ic,statusImgs:is,statusSrc:{owner:f.index,skill:k},hitSet:{},hitDone:false,
  spawnMinionCount:PET_STONE_MINION_COUNT,spawnMinionHp:PET_STONE_MINION_HP});
}
function castLightStone(f,k,target,ic,is){
 var rx=Math.max(70,Math.min(W-70,target.x+(Math.random()-0.5)*60));
 var ry=Math.max(70,Math.min(H-70,target.y+(Math.random()-0.5)*60));
 var fT=0.75;
 B.rocks.push({k:'holyLight',owner:f.index,x:rx,y:ry,r:56,fallT:fT,maxFallT:fT,life:fT+0.3,maxLife:fT+0.3,
  dmg:3,color:'#fff5c0',castImgs:ic,statusImgs:is,statusSrc:{owner:f.index,skill:k},hitSet:{},hitDone:false,holyStun:HOLY_LIGHT_STUN});
}
function castLightningStone(f,k,target,ic,is){
 var cx=target.x,cy=target.y;
 for(var i=0;i<LIGHTNING_STONE_DROPS;i++){
  var rx,ry;
  if(i===0){rx=cx;ry=cy;}
  else{var da=Math.random()*Math.PI*2,dd=40+Math.random()*200;rx=cx+Math.cos(da)*dd;ry=cy+Math.sin(da)*dd;}
  rx=Math.max(70,Math.min(W-70,rx));ry=Math.max(70,Math.min(H-70,ry));
  var fT=0.85+i*0.08;
  B.rocks.push({k:'lightningStone',owner:f.index,x:rx,y:ry,r:46,fallT:fT,maxFallT:fT,life:fT+0.3,maxLife:fT+0.3,
   dmg:3,color:'#c8a2ff',castImgs:ic,statusImgs:is,statusSrc:{owner:f.index,skill:k},hitSet:{},hitDone:false,
   lightningStun:LIGHTNING_STONE_STUN,fieldDur:(i===0)?LIGHTNING_FIELD_DUR:0});
 }
}
function castDarkHole(f,k,target,ic,is){
 var rx=Math.max(70,Math.min(W-70,target.x));
 var ry=Math.max(70,Math.min(H-70,target.y));
 B.zones.push({k:'dark',owner:f.index,x:rx,y:ry,ang:0,range:DARK_HOLE_RADIUS,arc:Math.PI*2,
  life:DARK_HOLE_DUR,maxLife:DARK_HOLE_DUR,dmg:DARK_HOLE_DMG,color:'#8a4aff',
  castImgs:ic,statusImgs:is,statusSrc:{owner:f.index,skill:k},hitSet:{},
  tickInterval:DARK_HOLE_TICK,tickTimer:DARK_HOLE_TICK,pullForce:DARK_HOLE_PULL,
  exploded:false,explosionDmg:DARK_HOLE_EXPLODE_DMG});
}
function castWaterWave(f,k,target,ic,is){
 var a=Math.atan2(target.y-f.y,target.x-f.x);
 var range=180+(f.c.skills[k].power||0.5)*80;
 B.zones.push({k:'water',owner:f.index,x:f.x,y:f.y,ang:a,range:range,arc:1.0,
  life:0.5,maxLife:0.5,dmg:WATER_DMG,color:'#4fc3f7',
  castImgs:ic,statusImgs:is,statusSrc:{owner:f.index,skill:k},hitSet:{},pushForce:WATER_PUSH});
}
function castTimeStop(f){
 if(!B.timeStop)B.timeStop={active:false,left:0,owner:-1};
 B.timeStop.active=true;B.timeStop.left=TIME_STOP_DUR;B.timeStop.owner=f.index;
 B.proj.forEach(function(p){if(!p.frozen){p.frozen=true;p.frozenVx=p.vx;p.frozenVy=p.vy;p.vx=0;p.vy=0;}});
 burst(f.x,f.y,'#8a4aff',60,2.6);burst(f.x,f.y,'#7fdcff',50,2.4);
}
function spawnMinions(f,k){
 if(!B.minions)B.minions=[];
 B.minions=B.minions.filter(function(m){return m.owner!==f.index;});
 var sk=f.c.skills[k];
 for(var i=0;i<MINION_COUNT;i++){
  var ang=(i/MINION_COUNT)*Math.PI*2,dist=f.r+32;
  var imgs=(f.c.minion&&f.c.minion.imgs)?f.c.minion.imgs:null;
  B.minions.push({id:++MINION_ID,owner:f.index,x:f.x+Math.cos(ang)*dist,y:f.y+Math.sin(ang)*dist,
   vx:Math.cos(ang)*120,vy:Math.sin(ang)*120,r:Math.max(10,f.r*0.55),
   hp:MINION_HP,maxHp:MINION_HP,alive:true,attackCd:0.4+Math.random()*0.6,
   dash:0,dashAng:0,dashHit:false,flash:0,imgs:imgs,color:sk.color||'#ff88cc'});
 }
 burst(f.x,f.y,sk.color,40,1.7);
}
function spawnBossMinion(f,k){
 if(!B.minions)B.minions=[];
 B.minions=B.minions.filter(function(m){return m.owner!==f.index;});
 var ang=Math.random()*Math.PI*2,dist=f.r+56;
 B.minions.push({id:++MINION_ID,owner:f.index,x:f.x+Math.cos(ang)*dist,y:f.y+Math.sin(ang)*dist,
  vx:Math.cos(ang)*180,vy:Math.sin(ang)*180,r:Math.max(16,f.r*0.5),
  hp:BOSS_MINION_HP,maxHp:BOSS_MINION_HP,alive:true,attackCd:1.0,skillCd:1.5,
  dash:0,dashAng:0,dashHit:false,flash:0,imgs:null,color:'#ff2244',
  isBossMinion:true,skillActive:false,skillActiveTimer:0,skillTarget:-1,boltTick:0});
}
function spawnMinionsFromRock(rk){
 if(!B.minions)B.minions=[];
 var ownerP=B.players[rk.owner];
 var count=rk.spawnMinionCount||1,hpVal=rk.spawnMinionHp||PET_STONE_MINION_HP;
 var imgs=(ownerP&&ownerP.c.minion&&ownerP.c.minion.imgs)?ownerP.c.minion.imgs:null;
 for(var i=0;i<count;i++){
  var mAng=(i/Math.max(1,count))*Math.PI*2+Math.random()*0.5;
  var mDist=rk.r+34+Math.random()*18;
  B.minions.push({id:++MINION_ID,owner:rk.owner,x:rk.x+Math.cos(mAng)*mDist,y:rk.y+Math.sin(mAng)*mDist,
   vx:Math.cos(mAng)*100,vy:Math.sin(mAng)*100,r:Math.max(14,rk.r*0.5),
   hp:hpVal,maxHp:hpVal,alive:true,attackCd:0.5+Math.random()*0.6,
   dash:0,dashAng:0,dashHit:false,flash:0,imgs:imgs,color:'#ff88cc',fromRock:true});
 }
}
function updMinions(dt){
 if(!B.minions||!B.minions.length)return;
 B.minions=B.minions.filter(function(m){
  var owner=B.players[m.owner];if(!owner||!owner.alive||!m.alive)return false;
  if(B.timeStop&&B.timeStop.active&&m.owner!==B.timeStop.owner){m.flash=Math.max(0,m.flash-dt*4);return true;}
  var target=null,bestD=Infinity;
  var oBot=!!owner.isEndlessBot,oBoss=!!(owner.c&&owner.c._isBoss);
  for(var i=0;i<B.players.length;i++){
   var p=B.players[i];if(!p.alive||p.reserved)continue;if(p.index===m.owner)continue;
   if(mode==='endless'&&(!!p.isEndlessBot)===oBot)continue;
   if(mode==='boss'&&(!!p.c._isBoss)===oBoss)continue;
   var d=Math.hypot(p.x-m.x,p.y-m.y);if(d<bestD){bestD=d;target=p;}
  }
  if(!target){m.vx*=0.9;m.vy*=0.9;m.x+=m.vx*dt;m.y+=m.vy*dt;return true;}
  m.flash=Math.max(0,m.flash-dt*4);
  var a=Math.atan2(target.y-m.y,target.x-m.x);
  var d2=Math.hypot(target.x-m.x,target.y-m.y);
  if(m.isBossMinion){
   if(d2>m.r+target.r+80){m.vx+=Math.cos(a)*160*dt;m.vy+=Math.sin(a)*160*dt;}
   else if(d2<130){m.vx-=Math.cos(a)*140*dt;m.vy-=Math.sin(a)*140*dt;}
   var sp=Math.hypot(m.vx,m.vy)||1;if(sp>90){m.vx*=90/sp;m.vy*=90/sp;}
   m.vx*=0.95;m.vy*=0.95;
  } else {
   if(m.dash>0){m.dash-=dt;}
   else{
    if(d2>m.r+target.r+30){m.vx+=Math.cos(a)*480*dt;m.vy+=Math.sin(a)*480*dt;}
    var sp2=Math.hypot(m.vx,m.vy)||1;if(sp2>200){m.vx*=200/sp2;m.vy*=200/sp2;}
    m.vx*=0.93;m.vy*=0.93;
    m.attackCd-=dt;
    if(m.attackCd<=0&&d2<220){m.attackCd=MINION_ATK_CD+Math.random()*0.4;
     m.dash=0.3;m.dashAng=a;m.dashHit=false;
     m.vx=Math.cos(a)*MINION_DASH_SPD;m.vy=Math.sin(a)*MINION_DASH_SPD;}
   }
  }
  m.x+=m.vx*dt;m.y+=m.vy*dt;
  if(m.x<m.r){m.x=m.r;m.vx=Math.abs(m.vx);}
  if(m.x>W-m.r){m.x=W-m.r;m.vx=-Math.abs(m.vx);}
  if(m.y<m.r){m.y=m.r;m.vy=Math.abs(m.vy);}
  if(m.y>H-m.r){m.y=H-m.r;m.vy=-Math.abs(m.vy);}
  for(var j=0;j<B.players.length;j++){
   var p=B.players[j];if(!p.alive||p.reserved||p.index===m.owner)continue;
   if(mode==='endless'&&(!!p.isEndlessBot)===oBot)continue;
   if(mode==='boss'&&(!!p.c._isBoss)===oBoss)continue;
   if(Math.hypot(p.x-m.x,p.y-m.y)<p.r+m.r){
    if(m.dash>0&&!m.dashHit){m.dashHit=true;hurt(p,MINION_DMG);burst(p.x,p.y,m.color,18,1.5);
     m.hp-=1;if(m.hp<=0){m.alive=false;return false;}m.dash=0;}
   }
  }
  return true;
 });
}
function cast(f,k){
 var s=f.c.skills[k];f.say=s.id;f.sayT=.7;
 var target=nearestEnemy(f);
 var combo=getCombo(f.c.skills);

 if(combo==='timeStop'&&(s.id==='dark'||s.id==='ice')){
  f.say='timeStop';f.sayT=1.4;castTimeStop(f);
  for(var ci=0;ci<f.c.skills.length;ci++)f.cd[ci]=TIME_STOP_CD;
  return TIME_STOP_CD;
 }
 if(combo==='lightningStone'&&(s.id==='lightning'||s.id==='stone')){
  if(!target)return;f.say='lightningStone';f.sayT=1;
  castLightningStone(f,k,target,getSlotImgs(f,k,'cast'),getSlotImgs(f,k,'status'));
  for(var ci=0;ci<f.c.skills.length;ci++)f.cd[ci]=LIGHTNING_STONE_CD;
  return LIGHTNING_STONE_CD;
 }
 if(combo==='lightStone'&&(s.id==='light'||s.id==='stone')){
  if(!target)return;castLightStone(f,k,target,getSlotImgs(f,k,'cast'),getSlotImgs(f,k,'status'));return;
 }
 if(combo==='petStone'&&(s.id==='pet'||s.id==='stone')){
  if(!target)return;castPetStone(f,k,target,getSlotImgs(f,k,'cast'),getSlotImgs(f,k,'status'));return;
 }
 if(combo==='meteor'&&(s.id==='fire'||s.id==='stone')){
  if(!target)return;castMeteor(f,k,target,getSlotImgs(f,k,'cast'),getSlotImgs(f,k,'status'));return;
 }
 if(combo==='explosiveDash'&&(s.id==='fire'||s.id==='fist')){
  if(!target)return;castExplosiveDash(f,k,target);return;
 }

 if(s.id==='bossSummon'){spawnBossMinion(f,k);return;}
 if(s.id==='pet'){spawnMinions(f,k);return;}
 if(!target)return;
 var a=Math.atan2(target.y-f.y,target.x-f.x);
 var ic=getSlotImgs(f,k,'cast'),is=getSlotImgs(f,k,'status');
 var tIsMinion=isMinionObj(target);

 if(s.id==='dark'){castDarkHole(f,k,target,ic,is);return;}
 if(s.id==='water'){castWaterWave(f,k,target,ic,is);return;}
 if(s.id==='fist'){
  f.dash=.55;f.dashHit=false;f.dashK=k;f.dashAng=a;f.dashChance=Math.random()<0.65;f.dashCombo=null;
  var sp0=560+s.power*400;f.vx=Math.cos(a)*sp0;f.vy=Math.sin(a)*sp0;return;
 }
 if(s.id==='fire'){
  B.zones.push({k:'fire',owner:f.index,x:f.x,y:f.y,ang:a,range:80+s.power*70,arc:1.4,
   life:0.5,maxLife:0.5,dmg:s.dmg,color:s.color,castImgs:ic,statusImgs:is,
   statusSrc:{owner:f.index,skill:k},hitSet:{}});return;
 }
 if(s.id==='blood'){
  B.zones.push({k:'blood',owner:f.index,x:f.x,y:f.y,ang:a,range:60+s.power*45,arc:0.95,
   life:0.42,maxLife:0.42,dmg:s.dmg,color:s.color,castImgs:ic,statusImgs:is,
   statusSrc:{owner:f.index,skill:k},hitSet:{}});return;
 }
 if(s.id==='stone'){
  var nRocks=5,placed=[];
  for(var ri=0;ri<nRocks;ri++){
   var rx,ry;
   if(ri===0){rx=target.x;ry=target.y;}
   else if(ri<3){var da=Math.random()*Math.PI*2,dd=40+Math.random()*Math.min(W,H)*0.25;rx=target.x+Math.cos(da)*dd;ry=target.y+Math.sin(da)*dd;}
   else{rx=60+Math.random()*(W-120);ry=60+Math.random()*(H-120);}
   rx=Math.max(50,Math.min(W-50,rx));ry=Math.max(50,Math.min(H-50,ry));
   placed.push({x:rx,y:ry});
   var fT=0.55+Math.random()*0.55;
   B.rocks.push({owner:f.index,x:rx,y:ry,r:34+s.power*22,fallT:fT,maxFallT:fT,life:1.5,maxLife:1.5,
    dmg:5.5,color:s.color,castImgs:ic,statusImgs:is,statusSrc:{owner:f.index,skill:k},hitSet:{},hitDone:false});
  }
  return;
 }
 if(s.id==='light'){
  B.players.forEach(function(o){
   if(o===f||!o.alive||o.reserved)return;
   if(mode==='endless'&&(!!o.isEndlessBot)===(!!f.isEndlessBot))return;
   if(mode==='boss'&&(!!o.c._isBoss)===(!!f.c._isBoss))return;
   o.lightDmg=Math.max(o.lightDmg||0,LIGHT_DOT);o.lightLeft=600;o.lightTick=0;
   o.lightSrc={owner:f.index,skill:k};burst(o.x,o.y,s.color,26,1.5);
  });
  return;
 }
 if(s.id==='lightning'){
  hurt(target,s.dmg);
  if(!tIsMinion){
   target.stunLeft=STUN_DUR;target.stunTick=STUN_TICK;target.stunSrc={owner:f.index,skill:k};
   B.beams=B.beams.filter(function(bb){return !(bb.owner===f.index&&bb.target===target.index);});
   B.beams.push({k:'lightning',owner:f.index,target:target.index,life:BEAM_DUR,maxLife:BEAM_DUR,
    color:s.color||'#c8a2ff',statusSrc:{owner:f.index,skill:k},castImgs:ic,statusImgs:is});
  }
  spawnHitFx(target.x,target.y,ic,s.color,target.r*3.2);return;
 }
 var sp,r;
 if(s.id==='ice'){sp=290+s.power*120;r=6+s.power*14;}
 else{sp=240+s.power*120;r=12+s.power*16;}
 B.proj.push({k:s.id,owner:f.index,x:f.x+Math.cos(a)*f.r,y:f.y+Math.sin(a)*f.r,
  vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:r,dmg:s.dmg,power:s.power,color:s.color,ang:a,life:4,
  castImgs:ic,statusImgs:is,statusSrc:{owner:f.index,skill:k},trail:[]});
}
function spawnHitFx(x,y,imgs,color,size){
 if(!imgs||!imgs.length)return;
 var v=imgs.filter(function(im){return im&&im.width;});if(!v.length)return;
 B.hitFx.push({x:x,y:y,imgs:v,start:performance.now(),dur:450,size:size||R*3,color:color||'#fff'});
}
function applyPoison(f,dur,dmg){
 if(!f.alive)return;
 if(f.poisonLeft<=0)f.poisonTick=0;
 f.poisonLeft=Math.max(f.poisonLeft,dur);
 f.poisonDmg=Math.max(f.poisonDmg||0,dmg);
}
function hitBy(p,t){
 if(p.k==='card'){
  var sid=p.cardSkill,srcP=B.players[p.owner];
  if(sid==='fire'){hurt(t,p.dmg);t.burnLeft=BURN_DUR;t.burnDmg=Math.max(0.5,roundHalf(p.dmg*0.5));}
  else if(sid==='ice'){hurt(t,p.dmg);t.freezeLeft=FLOAT_DUR;}
  else if(sid==='lightning'){hurt(t,p.dmg);t.stunLeft=STUN_DUR;t.stunTick=STUN_TICK;}
  else if(sid==='stone'){hurt(t,p.dmg+2.5);}
  else if(sid==='water'){hurt(t,p.dmg);
   var src=srcP||t,wx=t.x-src.x,wy=t.y-src.y,wd=Math.hypot(wx,wy)||1;
   t.vx+=(wx/wd)*WATER_PUSH*0.6;t.vy+=(wy/wd)*WATER_PUSH*0.6;}
  else{hurt(t,p.dmg);}
  burst(t.x,t.y,p.color,20,1.6);return;
 }
 if(p.k==='bullet'){hurt(t,p.dmg||0.7);return;}
 if(p.k==='poison'){hurt(t,p.dmg||1);applyPoison(t,p.poisonDur||5,p.poisonDmg||0.2);return;}
 if(p.k==='fire'){hurt(t,p.dmg);t.burnLeft=BURN_DUR;t.burnDmg=Math.max(0.5,roundHalf(p.dmg*0.5));}
 else if(p.k==='ice'){hurt(t,p.dmg);t.freezeLeft=FLOAT_DUR;t.vx*=0.2;t.vy*=0.2;}
 else if(p.k==='wind'){hurt(t,p.dmg);t.pullLeft=PULL_DUR;t.pullTarget=B.players[p.owner]||null;}
 else hurt(t,p.dmg);
 spawnHitFx(t.x,t.y,p.castImgs,p.color,t.r*2.6);
}
function updParts(dt){B.parts=B.parts.filter(function(p){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.94;p.vy*=0.94;p.life-=dt;return p.life>0;});}
function bounceWallHit(f){
 if(!f.bouncing||!f.bounce)return;
 f.bounce.remaining--;hurt(f,FIST_BOUNCE_DMG);
 if(f.bounce.remaining<=0){f.bouncing=false;f.bounce=null;f.vx*=0.2;f.vy*=0.2;}
}
function useWeapon(f,dt){
 if(f.c.weapon==='none'||!f.c.weapon)return;
 if(f.c.weapon==='lucky')return;
 f.weaponCd-=dt;if(f.weaponCd>0)return;
 if(f.bouncing||f.stunLeft>0||f.lightStunLeft>0)return;
 var target=nearestEnemy(f);if(!target)return;
 var w=WEAPONS[f.c.weapon];if(!w)return;
 var scaleR=f.r/R;
 var targetIsMinion=isMinionObj(target);

 if(f.c.weapon==='katana'){
  var kr=w.range*scaleR;
  if(Math.hypot(target.x-f.x,target.y-f.y)>kr)return;
  var aK=Math.atan2(target.y-f.y,target.x-f.x);
  f.weaponCd=w.cd;f.swingT=0.2;f.swingAng=aK+(Math.random()-0.5)*0.4;
  hurt(target,w.dmg);
  burst(target.x,target.y,'#ff2244',14,2.2);
  burst(target.x,target.y,'#fff',8,2.5);
  if(!targetIsMinion)B.beams.push({k:'katana',owner:f.index,target:target.index,life:0.25,maxLife:0.25,color:'#ff2244'});
  return;
 }
 if(f.c.weapon==='sword'){
  var sr=w.range*scaleR;
  if(Math.hypot(target.x-f.x,target.y-f.y)>sr)return;
  var a=Math.atan2(target.y-f.y,target.x-f.x);
  f.weaponCd=w.cd;f.swingT=0.3;f.swingAng=a;
  hurt(target,w.dmg);
  burst(target.x,target.y,'#fff',14,1.4);
  if(!targetIsMinion)B.beams.push({k:'sword',owner:f.index,target:target.index,life:0.28,maxLife:0.28,color:'#fff'});
 } else if(f.c.weapon==='gun'){
  var a2=Math.atan2(target.y-f.y,target.x-f.x);
  f.weaponCd=w.cd;
  B.proj.push({k:'bullet',owner:f.index,x:f.x+Math.cos(a2)*f.r,y:f.y+Math.sin(a2)*f.r,
   vx:Math.cos(a2)*w.speed,vy:Math.sin(a2)*w.speed,r:3,dmg:w.dmg,power:0.3,color:'#ffdd66',ang:a2,life:2,
   castImgs:null,statusImgs:null,statusSrc:null,trail:[],weapon:true});
 } else if(f.c.weapon==='poisonGun'){
  var a3=Math.atan2(target.y-f.y,target.x-f.x);
  f.weaponCd=w.cd;
  B.proj.push({k:'poison',owner:f.index,x:f.x+Math.cos(a3)*f.r,y:f.y+Math.sin(a3)*f.r,
   vx:Math.cos(a3)*w.speed,vy:Math.sin(a3)*w.speed,r:5,dmg:w.dmg,power:0.3,color:w.color,ang:a3,life:2.4,
   poisonDur:w.poisonDur,poisonDmg:w.poisonDmg,castImgs:null,statusImgs:null,statusSrc:null,trail:[],weapon:true});
 }
}
/* ★ Endless bot AI: บอสจะกระเด็นไปมา ไม่พุ่งตาม */
function endlessBotAI(f,dt){
 if(f.dash>0||f.bouncing||f.stunLeft>0||f.lightStunLeft>0)return;
 if(f.c._isBoss){
  /* บอส endless: เด้งไปมาแบบบิลเลียด ไม่ไล่ */
  var sp=Math.hypot(f.vx,f.vy)||1;
  var targetSp=180;
  var k=Math.min(1,dt*1.5);
  f.vx+=(f.vx/sp*targetSp-f.vx)*k;
  f.vy+=(f.vy/sp*targetSp-f.vy)*k;
  if(Math.random()<0.008){
   var ang=Math.random()*Math.PI*2;
   f.vx=Math.cos(ang)*targetSp;f.vy=Math.sin(ang)*targetSp;
  }
  return;
 }
 var tgt=nearestEnemy(f);
 var dvx=0,dvy=0;
 if(tgt){
  var d=Math.hypot(tgt.x-f.x,tgt.y-f.y);
  var a=Math.atan2(tgt.y-f.y,tgt.x-f.x);
  var pref=f.r+tgt.r+70;
  if(d>pref+30){dvx=Math.cos(a)*190;dvy=Math.sin(a)*190;}
  else if(d<pref-30){dvx=-Math.cos(a)*120;dvy=-Math.sin(a)*120;}
  else{dvx=-Math.sin(a)*150;dvy=Math.cos(a)*150;}
 }
 dvx+=Math.sin(B.time*3+f.index*1.7)*40;
 dvy+=Math.cos(B.time*2.4+f.index*2.3)*40;
 var k2=Math.min(1,dt*5);
 f.vx+=(dvx-f.vx)*k2;f.vy+=(dvy-f.vy)*k2;
}
function updOnePlayer(f,dt){
 if(!f.alive||f.reserved)return;
 if(B.timeStop&&B.timeStop.active&&f.index!==B.timeStop.owner){
  f.flash=Math.max(0,f.flash-dt);if(f.sayT>0)f.sayT=Math.max(0,f.sayT-dt);return;
 }
 if(f.dash<=0&&f.dashCombo&&f.dashCombo!=='bossDash')f.dashCombo=null;
 if(f.bossDashActive&&f.dash<=0)f.bossDashActive=false;

 if(f.c._isBoss&&mode==='boss'&&!f.rageActive&&f.hp<=f.maxHp*BOSS_RAGE_THRESHOLD){
  f.rageActive=true;f.rageCastTimer=0.2;f.suckActive=false;
  f.cd=f.cd.map(function(){return 0.1;});
  burst(f.x,f.y,'#ff2244',90,2.6);
 }
 if(f.c._isBoss&&mode==='boss'&&!f.rageActive&&!f.suckActive){
  f.suckCd-=dt;
  if(f.suckCd<=0){f.suckCd=BOSS_SUCK_INTERVAL;f.suckActive=true;f.suckTimer=BOSS_SUCK_DUR;
   f.suckPulls={};f.suckDone={};f.cd=f.cd.map(function(){return 1.2;});}
 } else if(f.c._isBoss&&mode==='boss'&&f.suckActive){
  f.suckTimer-=dt;
  if(f.suckTimer<=0){f.suckActive=false;}
 }
 if(B.bossDashWarn){B.bossDashWarn.t-=dt;if(B.bossDashWarn.t<=0)B.bossDashWarn=null;}
 if(f.dash>0)f.dash-=dt;
 if(f.swingT>0)f.swingT-=dt;
 f.flash=Math.max(0,f.flash-dt);f.sayT=Math.max(0,f.sayT-dt);
 if(f.luckyCd>0)f.luckyCd-=dt;
 if(f.stunLeft>0){f.stunLeft-=dt;f.stunTick-=dt;
  if(f.stunTick<=0){f.stunTick=STUN_TICK;hurt(f,STUN_DMG);}}
 if(f.lightStunLeft>0){f.lightStunLeft-=dt;f.vx=0;f.vy=0;}
 if(f.lightLeft>0&&f.lightDmg>0){f.lightLeft-=dt;f.lightTick+=dt;
  if(f.lightTick>=LIGHT_TICK){f.lightTick-=LIGHT_TICK;hurt(f,f.lightDmg);}}
 if(f.regenLeft>0){f.regenLeft-=dt;heal(f,BLOOD_REGEN_PER_SEC*dt);}
 if(f.bleedLeft>0)f.bleedLeft-=dt;
 if(f.poisonLeft>0){f.poisonLeft-=dt;f.poisonTick+=dt;
  if(f.poisonTick>=POISON_TICK){f.poisonTick-=POISON_TICK;hurt(f,f.poisonDmg);}}

 var fr_=f.r;
 if(f.bouncing&&f.bounce){
  f.x+=f.vx*dt;f.y+=f.vy*dt;
  if(f.x<fr_){f.x=fr_;f.vx=Math.abs(f.vx);bounceWallHit(f);}
  else if(f.x>W-fr_){f.x=W-fr_;f.vx=-Math.abs(f.vx);bounceWallHit(f);}
  if(f.y<fr_){f.y=fr_;f.vy=Math.abs(f.vy);bounceWallHit(f);}
  else if(f.y>H-fr_){f.y=H-fr_;f.vy=-Math.abs(f.vy);bounceWallHit(f);}
 } else {
  if(f.burnLeft>0){f.burnLeft-=dt;f.burnTick+=dt;
   if(f.burnTick>=0.5){f.burnTick-=0.5;hurt(f,f.burnDmg);}}
  if(f.freezeLeft>0){f.freezeLeft-=dt;f.vx*=0.8;f.vy*=0.8;}
  if(f.pullLeft>0){f.pullLeft-=dt;
   if(f.pullTarget&&f.pullTarget.alive){
    var dxp=f.pullTarget.x-f.x,dyp=f.pullTarget.y-f.y,dp=Math.hypot(dxp,dyp)||1;
    f.vx+=dxp/dp*280*dt;f.vy+=dyp/dp*280*dt;}}
  if(f.lightStunLeft>0){f.vx=0;f.vy=0;}
  else if(f.isEndlessBot){endlessBotAI(f,dt);}
  else{var sp=Math.hypot(f.vx,f.vy)||1,tg=BASE;
   if(f.dash<=0){var ns=sp+(tg-sp)*Math.min(1,dt*2.2);f.vx*=ns/sp;f.vy*=ns/sp;}}
  f.x+=f.vx*dt;f.y+=f.vy*dt;
  if(f.x<fr_){f.x=fr_;f.vx=Math.abs(f.vx);}
  if(f.x>W-fr_){f.x=W-fr_;f.vx=-Math.abs(f.vx);}
  if(f.y<fr_){f.y=fr_;f.vy=Math.abs(f.vy);}
  if(f.y>H-fr_){f.y=H-fr_;f.vy=-Math.abs(f.vy);}
 }
 if(f.lightStunLeft<=0){
  useWeapon(f,dt);
  for(var k=0;k<f.c.skills.length;k++){
   f.cd[k]-=dt;
   if(f.cd[k]<=0&&!f.bouncing){
    var cdOverride=cast(f,k);
    f.cd[k]=(typeof cdOverride==='number')?cdOverride:f.c.skills[k].cd;
   }
  }
 } else {
  for(var k2=0;k2<f.c.skills.length;k2++)f.cd[k2]-=dt;
 }
}
function checkPair(a,b){
 if(!a.alive||!b.alive||a.reserved||b.reserved||a.bouncing||b.bouncing)return;
 if(B.timeStop&&B.timeStop.active&&a.index!==B.timeStop.owner&&b.index!==B.timeStop.owner)return;
 var dx2=b.x-a.x,dy2=b.y-a.y,d=Math.hypot(dx2,dy2)||1;
 var minD=a.r+b.r;if(d>=minD)return;
 var nx=dx2/d,ny=dy2/d,ov=minD-d;
 a.x-=nx*ov/2;a.y-=ny*ov/2;b.x+=nx*ov/2;b.y+=ny*ov/2;
 var va=a.vx*nx+a.vy*ny,vb=b.vx*nx+b.vy*ny;
 if(va-vb>0){
  a.vx+=(vb-va)*nx;a.vy+=(vb-va)*ny;b.vx+=(va-vb)*nx;b.vy+=(va-vb)*ny;
 }
 [[a,b],[b,a]].forEach(function(pr){
  var f=pr[0],o=pr[1];
  if(f.dash>0&&!f.dashHit){
   f.dashHit=true;
   if(f.dashChance){
    var s=f.c.skills[f.dashK];
    if(f.dashCombo==='explosive'){
     hurt(o,2);
     if(!B.dashExplosions)B.dashExplosions=[];
     B.dashExplosions.push({x:o.x,y:o.y,target:o.index,owner:f.index,remaining:4,timer:0.15,interval:0.15,dmg:2,color:'#ff6a00'});
     o.bouncing=true;o.bounce={remaining:FIST_BOUNCE_N,fxImgs:[],color:'#ff6a00'};
     o.vx=Math.cos(f.dashAng)*520;o.vy=Math.sin(f.dashAng)*520;
    } else {
     hurt(o,s.dmg);
     var hi=getSlotImgs(f,f.dashK,'status')||[];
     o.bouncing=true;o.bounce={remaining:FIST_BOUNCE_N,fxImgs:hi,color:s.color};
     o.vx=Math.cos(f.dashAng)*420;o.vy=Math.sin(f.dashAng)*420;
    }
    f.dash=0;f.vx*=0.2;f.vy*=0.2;
   } else f.dash=0;
  }
 });
}
function spawnGod(rk){B.gods.push({x:rk.x,y:rk.y,owner:rk.owner,life:GOD_LIFE,maxLife:GOD_LIFE,
 punchT:GOD_PUNCH_T,punchDone:false,punchRadius:GOD_PUNCH_RADIUS,punchDmg:GOD_PUNCH_DMG,punchDirX:0,punchDirY:1,hitSet:{}});}
function spawnLightningField(rk){
 B.zones.push({k:'lightningField',isLightningField:true,owner:rk.owner,x:rk.x,y:rk.y,ang:0,
  range:LIGHTNING_FIELD_RADIUS,arc:Math.PI,life:rk.fieldDur||LIGHTNING_FIELD_DUR,maxLife:rk.fieldDur||LIGHTNING_FIELD_DUR,
  dmg:LIGHTNING_FIELD_TICK_DMG,color:'#c8a2ff',castImgs:null,statusImgs:null,statusSrc:rk.statusSrc,hitSet:{},
  tickInterval:LIGHTNING_FIELD_TICK,tickTimer:LIGHTNING_FIELD_TICK});
}
var BOT_VARIANT_COLORS=[
 {body:'#4a7cc7',accent:'#8ec0ff'},{body:'#c74a7c',accent:'#ff8ec0'},
 {body:'#4ac77c',accent:'#8effc0'},{body:'#c7a04a',accent:'#ffd68e'},
 {body:'#8a4ac7',accent:'#c08eff'},{body:'#c74a4a',accent:'#ff8e8e'},
 {body:'#4ac7c7',accent:'#8effff'},{body:'#7a7a7a',accent:'#c0c0c0'},
 {body:'#c77a4a',accent:'#ffb88e'},{body:'#4a4a7a',accent:'#8e8ec0'}
];
function endlessBotFrame(variant,k){
 var c=newCanvas(),x=c.getContext('2d');
 var cfg=BOT_VARIANT_COLORS[variant%BOT_VARIANT_COLORS.length];
 var g=x.createRadialGradient(S/2,S/2,6,S/2,S/2,S*0.65);
 g.addColorStop(0,cfg.body);g.addColorStop(1,'#0a0a18');
 x.fillStyle=g;x.fillRect(0,0,S,S);
 x.shadowColor=cfg.accent;x.shadowBlur=8;x.fillStyle=cfg.accent;
 for(var i=0;i<6;i++){
  var ang=i/6*6.283+variant*0.3;
  var px=S/2+Math.cos(ang)*S*0.42,py=S/2+Math.sin(ang)*S*0.42;
  x.beginPath();x.moveTo(px,py-7);x.lineTo(px+6,py);x.lineTo(px,py+7);x.lineTo(px-6,py);x.closePath();x.fill();
 }
 x.shadowBlur=0;
 if(k===0){
  x.fillStyle='#fff';x.beginPath();x.arc(34,44,7,0,7);x.fill();x.beginPath();x.arc(62,44,7,0,7);x.fill();
  x.fillStyle='#000';x.beginPath();x.arc(34,44,3,0,7);x.fill();x.beginPath();x.arc(62,44,3,0,7);x.fill();
 }
 return c.toDataURL('image/png');
}
function makeEndlessBot(waveNum,variantIdx,isMiniBoss,isBoss){
 if(isBoss){
  var bossKey=ELEMENT_BOSS_KEYS[Math.floor(Math.random()*ELEMENT_BOSS_KEYS.length)];
  var bc=makeBoss(bossKey);
  bc._hp=Math.floor(bc._hp*(1+Math.floor(waveNum/50)*0.35));
  bc.name='👑 '+bc.name+' W'+waveNum;
  bc._isEndlessBot=true;
  return bc;
 }
 if(isMiniBoss){
  var v=variantIdx%BOT_VARIANT_COLORS.length;
  var pool=Object.keys(SK).filter(function(id){return id!=='pet'&&id!=='bossSummon';});
  var s1=pool[Math.floor(Math.random()*pool.length)];
  var s2=pool[Math.floor(Math.random()*pool.length)];
  if(s1===s2)s2=pool[(pool.indexOf(s1)+1)%pool.length];
  return {
   name:'⭐ มินิบอส W'+waveNum,frames:[endlessBotFrame(v,0),endlessBotFrame(v,1)],
   weapon:'sword',_isEndlessBot:true,_botVariant:v,_hp:100+waveNum*12,_r:38,
   skills:[s1,s2].map(function(id){var d=defSkill(id);d.dmg=roundHalf(Math.min(5.5,d.dmg*(1+waveNum*0.04)));d.power=roundTenth(0.6+Math.random()*0.4);return d;})
  };
 }
 var v2=variantIdx%BOT_VARIANT_COLORS.length;
 var hp=30+(waveNum-1)*6;
 var pool2=Object.keys(SK).filter(function(id){return id!=='pet'&&id!=='bossSummon';});
 var sk1=pool2[Math.floor(Math.random()*pool2.length)];
 var sk2=pool2[Math.floor(Math.random()*pool2.length)];
 if(sk1===sk2)sk2=pool2[(pool2.indexOf(sk1)+1)%pool2.length];
 return {name:'บอท',frames:[endlessBotFrame(v2,0),endlessBotFrame(v2,1)],
  weapon:Math.random()<0.4?'sword':'none',_isEndlessBot:true,_botVariant:v2,_hp:hp,_r:24,
  skills:[sk1,sk2].map(function(id){var d=defSkill(id);d.dmg=roundHalf(Math.min(4.5,d.dmg*(1+waveNum*0.025)));d.power=roundTenth(0.4+Math.random()*0.5);return d;})};
}
function endlessWaveCount(w){
 if(w===1)return 1;if(w===2)return 2;if(w===3)return 4;if(w===4)return 8;
 return Math.min(16,8+Math.floor((w-4)*1.5));
}
function startEndlessSolo(){
 var me=CH[ACT];if(!me){toast('สร้างตัวละครก่อน');return;}
 var ph=[];
 for(var i=0;i<ENDLESS_MAX_BOTS;i++)ph.push(makeEndlessBot(1,i,false,false));
 Promise.all([me].concat(ph).map(prepChar)).then(function(prepped){
  startBattle('endless',prepped,0,'host');
  B.endless={wave:0,state:'idle',timer:0,pointsEarned:0,isMiniBoss:false,isBossWave:false,nextVariantSeed:0};
  for(var i=1;i<B.players.length;i++){B.players[i].isEndlessBot=true;B.players[i].reserved=true;B.players[i].alive=false;}
  startNextWave();
 });
}
function startNextWave(){
 if(!B||!B.endless)return;
 var st=B.endless;st.wave++;
 st.isMiniBoss=(st.wave%10===0)&&(st.wave%50!==0);
 st.isBossWave=(st.wave%50===0);
 st.state='intro';st.timer=ENDLESS_INTRO_TIME;

 var botCount=endlessWaveCount(st.wave);
 var bonus=st.isMiniBoss?3:0,bossB=st.isBossWave?4:0;
 var total=Math.min(botCount+bonus+bossB,ENDLESS_MAX_BOTS);
 var realPlayers=[];
 for(var i=0;i<B.players.length;i++)if(!B.players[i].isEndlessBot)realPlayers.push(B.players[i]);
 var rpc=realPlayers.length;
 function edgeSpawn(idx,tot){
  var m=90,side=idx%4,t=((idx/Math.max(1,tot))+0.13)%1;
  if(side===0)return{x:m+t*(W-2*m),y:m};
  if(side===1)return{x:W-m,y:m+t*(H-2*m)};
  if(side===2)return{x:W-m-t*(W-2*m),y:H-m};
  return{x:m,y:H-m-t*(H-2*m)};
 }
 var list=[];
 if(st.isBossWave){for(var b=0;b<bossB;b++)list.push({isBoss:false,isMiniBoss:false,variant:st.nextVariantSeed++});list.push({isBoss:true,variant:0});}
 else if(st.isMiniBoss){for(var m=0;m<bonus;m++)list.push({variant:st.nextVariantSeed++});list.push({isMiniBoss:true,variant:st.nextVariantSeed++});}
 else{for(var k=0;k<botCount;k++)list.push({variant:st.nextVariantSeed++});}
 list=list.slice(0,ENDLESS_MAX_BOTS);
 Promise.all(list.map(function(cfg){
  var nb=makeEndlessBot(st.wave,cfg.variant,cfg.isMiniBoss,cfg.isBoss);
  return prepChar(nb).then(function(){return nb;});
 })).then(function(newBots){
  var tot=Math.min(newBots.length,ENDLESS_MAX_BOTS);
  for(var i=0;i<tot;i++){
   var p=B.players[rpc+i];if(!p)break;
   var bC=newBots[i],pos=edgeSpawn(i,tot);
   p.c=bC;p.isEndlessBot=true;p.reserved=false;p.alive=true;
   p.hp=bC._hp;p.maxHp=bC._hp;p.r=bC._r||24;
   p.x=pos.x;p.y=pos.y;
   /* ★ บอส endless เริ่มต้นด้วยการกระเด็นไปมาแบบสุ่มทิศ */
   if(bC._isBoss){
    var ra=Math.random()*Math.PI*2;
    p.vx=Math.cos(ra)*180;p.vy=Math.sin(ra)*180;
   } else {
    var toC=Math.atan2(H/2-pos.y,W/2-pos.x);
    p.vx=Math.cos(toC)*120;p.vy=Math.sin(toC)*120;
   }
   p.cd=bC.skills.map(function(s){return s.cd*0.5;});
   p.burnLeft=0;p.freezeLeft=0;p.pullLeft=0;p.stunLeft=0;
   p.poisonLeft=0;p.lightLeft=0;p.lightStunLeft=0;
   p.bouncing=false;p.bounce=null;p.dash=0;p.dashCombo=null;
   p.flash=0;p.sayT=0;p.weaponCd=0;
  }
  for(var j=rpc+tot;j<B.players.length;j++){B.players[j].reserved=true;B.players[j].alive=false;}
  st.state='fight';
  showWaveBanner('คลื่นที่ '+st.wave,st.isBossWave?'👑 บอสใหญ่!':(st.isMiniBoss?'⭐ มินิบอส!':'ศัตรู: '+tot+' ตัว'));
 });
}
function showWaveBanner(text,sub){
 var el=$('waveBanner');
 el.innerHTML=esc(text)+(sub?'<small>'+esc(sub)+'</small>':'');
 el.style.display='block';
 clearTimeout(showWaveBanner.t);
 showWaveBanner.t=setTimeout(function(){el.style.display='none';},1800);
}
function step(dt){
 B.time+=dt;
 if(B.timeStop&&B.timeStop.active){
  B.timeStop.left-=dt;
  if(B.timeStop.left<=0){
   B.timeStop.active=false;
   B.proj.forEach(function(p){
    if(p.frozen){
     p.frozen=false;
     var src=B.players[p.owner];
     if(src){
      var ne=null,nd=Infinity;
      B.players.forEach(function(o){
       if(o.index===src.index||!o.alive||o.reserved)return;
       if(mode==='endless'&&(!!o.isEndlessBot)===(!!src.isEndlessBot))return;
       if(mode==='boss'&&(!!o.c._isBoss)===(!!src.c._isBoss))return;
       var d=Math.hypot(o.x-p.x,o.y-p.y);if(d<nd){nd=d;ne=o;}
      });
      if(ne){
       var a=Math.atan2(ne.y-p.y,ne.x-p.x);
       var sp=Math.hypot(p.frozenVx,p.frozenVy)||380;
       p.vx=Math.cos(a)*sp;p.vy=Math.sin(a)*sp;p.ang=a;
      } else {p.vx=p.frozenVx;p.vy=p.frozenVy;}
     } else {p.vx=p.frozenVx;p.vy=p.frozenVy;}
     burst(p.x,p.y,'#c8a2ff',8,1.8);
    }
   });
  }
 }
 if(mode==='endless'&&B.endless&&!B.over){
  var st=B.endless;
  if(st.state==='intro'){st.timer-=dt;if(st.timer<=0)st.state='fight';}
  else if(st.state==='fight'){
   var aliveB=0,aliveP=0;
   for(var i=0;i<B.players.length;i++){
    var p=B.players[i];if(!p.alive)continue;
    if(p.isEndlessBot)aliveB++;else aliveP++;
   }
   if(aliveB===0){
    st.state='clear';st.timer=ENDLESS_CLEAR_TIME;
    var pts=Math.min(Math.pow(2,st.wave),100000);st.pointsEarned+=pts;
    for(var i2=0;i2<B.players.length;i2++){
     var p2=B.players[i2];if(p2.isEndlessBot)continue;
     if(p2.alive){p2.hp=Math.min(p2.maxHp,p2.hp+p2.maxHp*0.5);}
     else{p2.alive=true;p2.hp=p2.maxHp*0.5;
      p2.x=W/2+(Math.random()-0.5)*140;p2.y=H/2+(Math.random()-0.5)*140;
      p2.vx=0;p2.vy=0;p2.burnLeft=0;p2.freezeLeft=0;p2.pullLeft=0;p2.stunLeft=0;
      p2.poisonLeft=0;p2.lightLeft=0;p2.lightStunLeft=0;
      p2.bouncing=false;p2.bounce=null;p2.dash=0;p2.dashCombo=null;
      p2.cd=p2.c.skills.map(function(s){return s.cd*0.5;});}
    }
    showWaveBanner('ผ่านคลื่น '+st.wave+'!','+'+pts+' คะแนน • ฟื้น HP 50%');
    if(PROFILE){addWins(pts);}
   }
   if(aliveP===0){B.over=true;B.winner=-1;B.endlessFinalPoints=st.pointsEarned;B.endlessFinalWave=st.wave;}
  } else if(st.state==='clear'){st.timer-=dt;if(st.timer<=0)startNextWave();}
 }
 if(B.phase==='intro'){B.introT-=dt;if(B.introT<=0)B.phase='fight';updParts(dt);return;}
 if(!B.over){
  for(var i=0;i<B.players.length;i++){if(!B.players[i].reserved)updOnePlayer(B.players[i],dt);}
  for(var i2=0;i2<B.players.length;i2++){
   if(B.players[i2].reserved)continue;
   for(var j=i2+1;j<B.players.length;j++){
    if(B.players[j].reserved)continue;
    checkPair(B.players[i2],B.players[j]);
   }
  }
  updMinions(dt);
 }
 /* Rocks */
 B.rocks=B.rocks.filter(function(rk){
  rk.fallT-=dt;rk.life-=dt;
  if(rk.fallT<=0&&!rk.hitDone){
   rk.hitDone=true;
   if(rk.k==='holyLight'){spawnGod(rk);}
   else if(rk.k==='lightningStone'){if(rk.fieldDur>0)spawnLightningField(rk);}
   else if(rk.k==='meteor'){
    B.zones.push({k:'fire',owner:rk.owner,x:rk.x,y:rk.y,ang:0,range:rk.fireRadius,arc:Math.PI,
     life:rk.fireDuration,maxLife:rk.fireDuration,dmg:rk.fireDmg,color:'#ff6a00',
     castImgs:null,statusImgs:null,statusSrc:rk.statusSrc,hitSet:{},tickInterval:0.5,tickTimer:0.5});
   }
   else if(rk.k==='petStone'){spawnMinionsFromRock(rk);}
  }
  return rk.life>0;
 });
 /* Zones */
 B.zones=B.zones.filter(function(z){
  z.life-=dt;
  if(z.tickInterval){z.tickTimer-=dt;if(z.tickTimer<=0){z.tickTimer=z.tickInterval;z.hitSet={};}}
  if(z.life<=0){return false;}
  B.players.forEach(function(tg){
   if(!tg.alive||tg.reserved||tg.index===z.owner)return;
   if(z.hitSet[tg.index])return;
   var d=Math.hypot(tg.x-z.x,tg.y-z.y);
   if(d<z.range+tg.r){
    z.hitSet[tg.index]=true;
    if(z.k==='water'){
     hurt(tg,z.dmg);
     var wx=tg.x-z.x,wy=tg.y-z.y,wd=Math.hypot(wx,wy)||1;
     tg.vx+=(wx/wd)*z.pushForce;tg.vy+=(wy/wd)*z.pushForce;
    } else hurt(tg,z.dmg);
   }
  });
  return true;
 });
 /* Beams */
 B.beams=B.beams.filter(function(b){b.life-=dt;return b.life>0;});
 /* Projectiles */
 B.proj=B.proj.filter(function(p){
  if(p.frozen){p.life-=dt;return p.life>0;}
  if(B.timeStop&&B.timeStop.active){p.frozen=true;p.frozenVx=p.vx;p.frozenVy=p.vy;p.vx=0;p.vy=0;return true;}
  p.trail.unshift({x:p.x,y:p.y});if(p.trail.length>12)p.trail.pop();
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
  if(!B.over){
   var srcP=B.players[p.owner];
   for(var i=0;i<B.players.length;i++){
    var tg=B.players[i];if(!tg.alive||tg.reserved||tg.index===p.owner||tg.bouncing)continue;
    if(mode==='endless'&&srcP&&(!!tg.isEndlessBot)===(!!srcP.isEndlessBot))continue;
    if(mode==='boss'&&srcP&&(!!tg.c._isBoss)===(!!srcP.c._isBoss))continue;
    if(Math.hypot(tg.x-p.x,tg.y-p.y)<tg.r+p.r){hitBy(p,tg);return false;}
   }
  }
  return p.life>0&&p.x>-40&&p.x<W+40&&p.y>-40&&p.y<H+40;
 });
 updParts(dt);
}
function ser(){
 function pS(p){
  return [Math.round(p.x),Math.round(p.y),Math.round(p.hp*10)/10,p.alive?1:0,
   p.freezeLeft>0?Math.round(p.freezeLeft*10)/10:0,
   p.burnLeft>0?Math.round(p.burnLeft*10)/10:0,
   p.pullLeft>0?Math.round(p.pullLeft*10)/10:0,
   p.bouncing?1:0,p.flash>0?1:0,p.dash>0?1:0,p.sayT>0?p.say:0,
   '','','',
   p.stunLeft>0?Math.round(p.stunLeft*10)/10:0,
   '',p.swingT>0?Math.round(p.swingT*100)/100:0,
   Math.round(p.swingAng*100)/100,
   p.regenLeft>0?Math.round(p.regenLeft*10)/10:0,'',
   p.bleedLeft>0?Math.round(p.bleedLeft*10)/10:0,'',
   p.poisonLeft>0?Math.round(p.poisonLeft*10)/10:0,p.poisonDmg||0,
   p.lightLeft>0?1:0,p.lightStunLeft>0?Math.round(p.lightStunLeft*10)/10:0,
   '',p.rageActive?1:0,p.bossDashActive?1:0,p.dashCombo||'',0,p.reserved?1:0];
 }
 return {
  players:B.players.map(pS),
  proj:B.proj.map(function(p){return [p.k,p.owner,Math.round(p.x),Math.round(p.y),p.r,p.color,p.ang,
   '','',p.poisonDur||0,p.poisonDmg||0,p.frozen?1:0,p.cardSkill||''];})
 };
}
function applyState(s){
 if(!B||role!=='guest'||B.done||!s||!s.players)return;
 if(!B.players||s.players.length!==B.players.length)return;
 s.players.forEach(function(v,i){
  var f=B.players[i];if(!f)return;
  if(v[2]<f.hp)burst(f.x,f.y,'#ffffff',6);
  f.tx=v[0];f.ty=v[1];f.hp=clamp(v[2],0,f.maxHp);f.alive=!!v[3];
  f.freezeLeft=+v[4]||0;f.burnLeft=+v[5]||0;f.pullLeft=+v[6]||0;
  f.bouncing=!!v[7];f.flash=v[8]?.15:0;f.dash=v[9]?1:0;
  f.say=v[10];f.sayT=f.say?1:0;
  f.stunLeft=+v[14]||0;
  f.swingT=+v[16]||0;f.swingAng=+v[17]||0;
  f.regenLeft=+v[18]||0;
  f.bleedLeft=+v[20]||0;
  f.poisonLeft=+v[22]||0;f.poisonDmg=+v[23]||0;
  f.lightLeft=+v[24]?600:0;f.lightStunLeft=+v[25]||0;
  if(f.c._isBoss){f.rageActive=!!v[27];f.bossDashActive=!!v[28];}
  if(typeof v[29]==='string'&&v[29])f.dashCombo=v[29];else f.dashCombo=null;
  if(v[31]!==undefined)f.reserved=!!v[31];
 });
 B.proj=s.proj.map(function(q){
  var kRaw=q[0],k=(kRaw==='bullet'||kRaw==='poison'||kRaw==='card')?kRaw:(SK[kRaw]?kRaw:'fire');
  return {k:k,owner:+q[1]||0,x:+q[2]||0,y:+q[3]||0,r:clamp(q[4],2,60),
   color:q[5]||'#fff',ang:+q[6]||0,
   castImgs:null,statusImgs:null,statusSrc:null,trail:[],
   poisonDur:+q[9]||5,poisonDmg:+q[10]||0.2,frozen:!!q[11],frozenVx:0,frozenVy:0,
   cardSkill:typeof q[12]==='string'?q[12]:null};
 });
 if(s.o&&!B.over){B.over=true;B.winner=(typeof s.w==='number')?s.w:-1;setTimeout(finish,1200);}
}
/* ========= DRAW ========= */
function drawDarkHole(z){
 var now=performance.now();
 var prog=1-Math.max(0,z.life)/z.maxLife;
 var fade=Math.min(1,z.life/0.6);
 var baseR=z.range*(1+prog*0.35);
 ctx.save();
 ctx.globalAlpha=fade*0.4;
 var g=ctx.createRadialGradient(z.x,z.y,4,z.x,z.y,baseR*1.5);
 g.addColorStop(0,'rgba(0,0,0,0.9)');
 g.addColorStop(0.5,'rgba(138,74,255,0.4)');
 g.addColorStop(1,'rgba(138,74,255,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(z.x,z.y,baseR*1.5,0,7);ctx.fill();
 ctx.restore();
 ctx.save();
 var coreR=baseR*0.55;
 var cg=ctx.createRadialGradient(z.x,z.y,2,z.x,z.y,coreR);
 cg.addColorStop(0,'#000');cg.addColorStop(0.7,'#05000c');cg.addColorStop(1,'rgba(138,74,255,0)');
 ctx.fillStyle=cg;ctx.beginPath();ctx.arc(z.x,z.y,coreR,0,7);ctx.fill();
 ctx.restore();
 ctx.save();
 ctx.globalCompositeOperation='lighter';
 for(var i=0;i<16;i++){
  var ang=now/280+i*0.4;
  var t=((now/900)+i*0.15)%1;
  var r=baseR*(0.3+t*1.1);
  var px=z.x+Math.cos(ang)*r,py=z.y+Math.sin(ang)*r;
  ctx.globalAlpha=(1-t)*0.8*fade;
  ctx.fillStyle=i%2===0?'#fff':'#8a4aff';
  ctx.beginPath();ctx.arc(px,py,2+(1-t)*3,0,7);ctx.fill();
 }
 ctx.restore();
}
function drawWaterWave(z){
 var prog=1-z.life/z.maxLife,alpha=Math.max(0,1-prog);
 var w=z.range*(0.25+prog*0.75);
 ctx.save();
 ctx.translate(z.x,z.y);ctx.rotate(z.ang);
 ctx.globalAlpha=alpha;
 ctx.strokeStyle='#4fc3f7';ctx.lineWidth=5;ctx.lineCap='round';
 ctx.shadowColor='#4fc3f7';ctx.shadowBlur=22;
 ctx.beginPath();ctx.arc(0,0,w,-z.arc,z.arc);ctx.stroke();
 ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.shadowBlur=12;
 ctx.beginPath();ctx.arc(0,0,w,-z.arc,z.arc);ctx.stroke();
 ctx.restore();
}
function drawFireField(z){
 var prog=1-z.life/z.maxLife;
 var alpha=Math.min(1,z.life/1.5)*(1-prog*0.25);
 var r=Math.min(z.range,400),now=performance.now();
 ctx.save();ctx.globalAlpha=alpha;
 var g=ctx.createRadialGradient(z.x,z.y,2,z.x,z.y,r);
 g.addColorStop(0,'rgba(255,255,220,0.85)');
 g.addColorStop(0.5,'#ff6a00');g.addColorStop(1,'rgba(255,80,0,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(z.x,z.y,r,0,7);ctx.fill();
 ctx.restore();
}
function drawZone(z){
 if(z.k==='dark'){drawDarkHole(z);return;}
 if(z.k==='water'){drawWaterWave(z);return;}
 if(z.tickInterval){drawFireField(z);return;}
 var alpha=1-(1-z.life/z.maxLife)*0.7;
 for(var i=0;i<3;i++){
  var frac=(i+0.6)/3;
  var dist=z.range*frac;
  var px=z.x+Math.cos(z.ang)*dist,py=z.y+Math.sin(z.ang)*dist;
  var size=(28+z.range*0.5)*frac+16;
  var g=ctx.createRadialGradient(px,py,1,px,py,size*0.7);
  g.addColorStop(0,'#fff');g.addColorStop(0.4,z.color);g.addColorStop(1,'rgba(255,80,0,0)');
  ctx.fillStyle=g;ctx.globalAlpha=alpha;
  ctx.beginPath();ctx.arc(px,py,size*0.7,0,7);ctx.fill();
 }
 ctx.globalAlpha=1;
}
function drawRockBody(rk){
 var prog=1-Math.max(0,rk.fallT)/rk.maxFallT;
 if(prog<0)prog=0;if(prog>1)prog=1;
 var dropH=(1-prog)*400;
 var alpha=1;
 if(rk.hitDone){var fp=1-rk.life/rk.maxLife;alpha=Math.max(0,1-fp);dropH=0;}
 ctx.save();ctx.globalAlpha=alpha;
 ctx.translate(rk.x,rk.y-dropH);
 ctx.shadowColor=rk.color;ctx.shadowBlur=24;
 ctx.fillStyle=rk.color;
 ctx.beginPath();
 var sides=7;
 for(var k=0;k<sides;k++){
  var aa=k/sides*6.283-Math.PI/2;
  var rr=rk.r*(0.85+(k%2)*0.15);
  if(k===0)ctx.moveTo(Math.cos(aa)*rr,Math.sin(aa)*rr);
  else ctx.lineTo(Math.cos(aa)*rr,Math.sin(aa)*rr);
 }
 ctx.closePath();ctx.fill();
 ctx.restore();
}
function drawProj(p){
 if(p.k==='card'){
  var sid=p.cardSkill||'fire';
  var col=(SK[sid]&&SK[sid].color)||'#ffd166';
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(performance.now()/120);
  ctx.shadowColor=col;ctx.shadowBlur=22;
  ctx.fillStyle='#1a0e2a';ctx.fillRect(-8,-12,16,24);
  ctx.strokeStyle=col;ctx.lineWidth=2;ctx.strokeRect(-8,-12,16,24);
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(0,0,4,0,7);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,2,0,7);ctx.fill();
  ctx.restore();
  if(p.frozen){
   ctx.save();ctx.globalAlpha=0.6;ctx.strokeStyle='#7fdcff';ctx.lineWidth=2;
   ctx.shadowColor='#7fdcff';ctx.shadowBlur=12;
   for(var k=0;k<6;k++){var a2=performance.now()/500+k*Math.PI/3;
    ctx.beginPath();ctx.moveTo(p.x+Math.cos(a2)*(p.r+2),p.y+Math.sin(a2)*(p.r+2));
    ctx.lineTo(p.x+Math.cos(a2)*(p.r+7),p.y+Math.sin(a2)*(p.r+7));ctx.stroke();}
   ctx.restore();
  }
  return;
 }
 if(p.trail){
  for(var i=0;i<p.trail.length;i++){
   var t=p.trail[i],a=1-i/p.trail.length;
   ctx.globalAlpha=a*0.4;ctx.fillStyle=p.color;
   ctx.beginPath();ctx.arc(t.x,t.y,p.r*(1-i*0.06),0,7);ctx.fill();
  }
  ctx.globalAlpha=1;
 }
 ctx.save();ctx.translate(p.x,p.y);
 ctx.shadowColor=p.color;ctx.shadowBlur=14;ctx.fillStyle=p.color;
 ctx.beginPath();ctx.arc(0,0,p.r,0,7);ctx.fill();
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,p.r*0.5,0,7);ctx.fill();
 ctx.restore();
 if(p.frozen){
  ctx.save();ctx.globalAlpha=0.5;ctx.strokeStyle='#7fdcff';ctx.lineWidth=2;
  ctx.shadowColor='#7fdcff';ctx.shadowBlur=12;
  for(var kk=0;kk<6;kk++){var aa2=performance.now()/500+kk*Math.PI/3;
   ctx.beginPath();ctx.moveTo(p.x+Math.cos(aa2)*(p.r+3),p.y+Math.sin(aa2)*(p.r+3));
   ctx.lineTo(p.x+Math.cos(aa2)*(p.r+8),p.y+Math.sin(aa2)*(p.r+8));ctx.stroke();}
  ctx.restore();
 }
}
function drawMinion(m){
 if(!m.alive)return;
 var rr=m.r,im=m.imgs&&m.imgs[0];
 ctx.save();ctx.beginPath();ctx.arc(m.x,m.y,rr,0,7);ctx.clip();
 ctx.fillStyle='#0a0a10';ctx.fillRect(m.x-rr,m.y-rr,2*rr,2*rr);
 if(im&&im.width)ctx.drawImage(im,m.x-rr,m.y-rr,2*rr,2*rr);
 ctx.restore();
 ctx.lineWidth=2;ctx.strokeStyle=m.color||'#fff';
 ctx.shadowColor=m.color||'#fff';ctx.shadowBlur=8;
 ctx.beginPath();ctx.arc(m.x,m.y,rr,0,7);ctx.stroke();
 ctx.shadowBlur=0;
}
function drawGod(g){
 var t=1-g.life/g.maxLife;
 var alpha=t<0.15?t/0.15:(t>0.7?Math.max(0,1-(t-0.7)/0.3):1);
 ctx.save();ctx.globalAlpha=alpha;
 ctx.translate(g.x,g.y-30+t*14);
 ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.shadowColor='#fff';ctx.shadowBlur=22;
 ctx.beginPath();ctx.ellipse(0,-40,30,8,0,0,7);ctx.stroke();
 ctx.fillStyle='#fff';ctx.beginPath();
 ctx.moveTo(-25,-8);ctx.lineTo(25,-8);ctx.lineTo(32,50);ctx.lineTo(-32,50);ctx.closePath();ctx.fill();
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,-24,16,0,7);ctx.fill();
 ctx.restore();
}
function drawBeam(b){
 var src=B.players[b.owner],tgt=B.players[b.target];
 if(!tgt||!src)return;
 if(b.owner===b.target)return;
 var x1=src.x,y1=src.y,x2=tgt.x,y2=tgt.y;
 var lr=b.life/b.maxLife;
 var alpha=lr>0.3?1:lr/0.3;
 var ang=Math.atan2(y2-y1,x2-x1);
 var prog=1-lr;
 ctx.save();
 ctx.globalAlpha=alpha;
 ctx.strokeStyle=b.color||'#fff';
 ctx.lineWidth=4;ctx.lineCap='round';
 ctx.shadowColor=b.color||'#fff';ctx.shadowBlur=18;
 var arcR=(src.r||26)*2.2;
 var angA=ang-0.7+prog*1.4;
 ctx.beginPath();ctx.arc(x1,y1,arcR,angA-0.3,angA+0.3);ctx.stroke();
 ctx.restore();
}
function drawStatusFx(f){
 var rr=f.r,now=performance.now();
 if(B.timeStop&&B.timeStop.active&&f.index!==B.timeStop.owner){
  ctx.save();
  ctx.globalAlpha=0.5+Math.sin(now/200)*0.15;
  ctx.strokeStyle='#7fdcff';ctx.lineWidth=2;
  ctx.shadowColor='#7fdcff';ctx.shadowBlur=14;
  ctx.beginPath();ctx.arc(f.x,f.y,rr+5,0,7);ctx.stroke();
  ctx.restore();
 }
}
function drawF(f){
 if(f.reserved)return;
 var rr=f.r;
 if(!f.alive){if(mode==='endless')return;
  ctx.globalAlpha=0.15;var imd=f.c.imgs[0];
  ctx.save();ctx.beginPath();ctx.arc(f.x,f.y,rr,0,7);ctx.clip();
  if(imd&&imd.width)ctx.drawImage(imd,f.x-rr,f.y-rr,2*rr,2*rr);
  ctx.restore();ctx.globalAlpha=1;return;
 }
 var im=f.c.imgs[0];
 ctx.save();ctx.beginPath();ctx.arc(f.x,f.y,rr,0,7);ctx.clip();
 ctx.fillStyle='#0a0a10';ctx.fillRect(f.x-rr,f.y-rr,2*rr,2*rr);
 if(im&&im.width)ctx.drawImage(im,f.x-rr,f.y-rr,2*rr,2*rr);
 ctx.restore();
 var stroke='#fff';
 if(f.stunLeft>0)stroke='#c8a2ff';
 else if(f.freezeLeft>0)stroke='#7fdcff';
 else if(f.burnLeft>0)stroke='#ff6a00';
 if(f.index===B.myIndex){
  ctx.lineWidth=4;ctx.strokeStyle='#fff';
  ctx.shadowColor='#fff';ctx.shadowBlur=20;
  ctx.beginPath();ctx.arc(f.x,f.y,rr+3,0,7);ctx.stroke();
  ctx.shadowBlur=0;
 }
 ctx.lineWidth=3;ctx.strokeStyle=stroke;
 ctx.beginPath();ctx.arc(f.x,f.y,rr,0,7);ctx.stroke();
 if(f.flash>0){ctx.fillStyle='rgba(255,255,255,.6)';ctx.beginPath();ctx.arc(f.x,f.y,rr,0,7);ctx.fill();}
 if(f.c.weapon==='katana'){
  var angK=f.swingAng||0;
  ctx.save();ctx.translate(f.x,f.y);ctx.rotate(angK);
  ctx.strokeStyle='#ff2244';ctx.lineWidth=4;ctx.lineCap='round';
  ctx.shadowColor='#ff2244';ctx.shadowBlur=16;
  ctx.beginPath();ctx.moveTo(rr*0.6,0);ctx.quadraticCurveTo(rr*1.6,-7,rr*2.6,-3);ctx.stroke();
  ctx.restore();
 }
 ctx.textAlign='center';ctx.font='11px sans-serif';ctx.fillStyle='#e8e8ee';
 if(f.c._isBoss||!f.isEndlessBot)ctx.fillText(f.c.name,f.x,f.y+rr+14);
 if(f.hp<f.maxHp){
  var hpW=rr*2.2;
  var hpPct=Math.max(0,Math.min(1,f.hp/f.maxHp));
  var hy=f.y-rr-10;
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(f.x-hpW/2-1,hy-1,hpW+2,5);
  ctx.fillStyle='#fff';ctx.fillRect(f.x-hpW/2,hy,hpW*hpPct,3);
 }
}
function drawTimeStopOverlay(){
 if(!B.timeStop||!B.timeStop.active)return;
 var now=performance.now();
 var fade=Math.min(1,B.timeStop.left/0.4);
 ctx.save();ctx.globalAlpha=fade;
 ctx.fillStyle='rgba(138,74,255,0.12)';
 ctx.fillRect(0,0,W,H);
 for(var i=0;i<3;i++){
  var rr=W*0.3+i*40+Math.sin(now/200+i)*8;
  ctx.globalAlpha=fade*(0.35-i*0.08);
  ctx.strokeStyle=i===0?'#fff':(i===1?'#7fdcff':'#8a4aff');
  ctx.lineWidth=3-i*0.6;ctx.setLineDash([12,14]);
  ctx.lineDashOffset=-now/30-i*20;
  ctx.beginPath();ctx.arc(W/2,H/2,rr,0,7);ctx.stroke();
  ctx.setLineDash([]);
 }
 ctx.globalAlpha=fade;
 ctx.fillStyle='#fff';ctx.font='bold 24px system-ui';ctx.textAlign='center';
 ctx.shadowColor='#7fdcff';ctx.shadowBlur=18;
 ctx.fillText('⏱ TIME STOP',W/2,48);
 ctx.font='bold 18px system-ui';
 ctx.fillText(B.timeStop.left.toFixed(1)+' วิ',W/2,H-30);
 ctx.restore();
}
function draw(){
 ctx.clearRect(0,0,W,H);
 var bg=ctx.createRadialGradient(W/2,H/2,20,W/2,H/2,W*0.7);
 bg.addColorStop(0,'#141420');bg.addColorStop(1,'#05050a');
 ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=2;
 var maxR=Math.min(W,H)/2;
 for(var r=60;r<maxR;r+=60){ctx.beginPath();ctx.arc(W/2,H/2,r,0,7);ctx.stroke();}
 ctx.restore();
 ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=3;ctx.strokeRect(1.5,1.5,W-3,H-3);
 B.zones.forEach(drawZone);
 B.proj.forEach(drawProj);
 if(B.minions)B.minions.forEach(drawMinion);
 B.players.forEach(drawStatusFx);
 B.players.forEach(drawF);
 if(B.gods)B.gods.forEach(drawGod);
 B.rocks.forEach(drawRockBody);
 B.beams.forEach(drawBeam);
 B.parts.forEach(function(p){
  ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;
  ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);
 });
 ctx.globalAlpha=1;
 drawTimeStopOverlay();
 if(B.phase==='intro'){
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 68px system-ui';
  ctx.shadowColor='#fff';ctx.shadowBlur=24;
  ctx.fillText(B.introT>0.4?String(Math.ceil(B.introT)):'สู้!',W/2,H/2+22);
  ctx.shadowBlur=0;
 }
 updateHUD();
}
function loop(now){
 var dt=Math.min(.05,(now-lastT)/1000);lastT=now;
 if(role!=='guest'){
  step(dt);
  if(mode==='online'||mode==='boss'||mode==='endless'){sendT+=dt;if(sendT>=.033){sendT=0;if(role==='host')wsSend({a:'relay',s:ser()});}}
  if(B.over){B.endT+=dt;if(B.endT>1.2){draw();finish();return;}}
 } else {
  B.players.forEach(function(f){
   if(f.reserved)return;
   if(f.tx!==undefined&&f.alive){f.x+=(f.tx-f.x)*.5;f.y+=(f.ty-f.y)*.5;}
   if(f.freezeLeft>0)f.freezeLeft=Math.max(0,f.freezeLeft-dt);
   if(f.stunLeft>0)f.stunLeft=Math.max(0,f.stunLeft-dt);
   if(f.swingT>0)f.swingT=Math.max(0,f.swingT-dt);
   if(f.regenLeft>0)f.regenLeft=Math.max(0,f.regenLeft-dt);
   if(f.poisonLeft>0)f.poisonLeft=Math.max(0,f.poisonLeft-dt);
   if(f.lightLeft>0)f.lightLeft=Math.max(0,f.lightLeft-dt);
   if(f.lightStunLeft>0)f.lightStunLeft=Math.max(0,f.lightStunLeft-dt);
   if(f.burnLeft>0)f.burnLeft-=dt;
  });
  updParts(dt);
 }
 draw();updateSuckUI();updateLuckyBtnVisibility();
 if(!B.done)raf=requestAnimationFrame(loop);
}
function showRes(t){
 $('suckBox').style.display='none';$('luckyBox').style.display='none';
 $('rtxt').textContent=t;
 $('btnAgain').style.display=((mode==='bot')||(mode==='boss'&&!wasOnlineGame)||(mode==='endless'&&!wasOnlineGame))?'inline-block':'none';
 $('res').style.display='block';
}
function finish(){
 if(!B||B.done)return;
 B.done=true;cancelAnimationFrame(raf);draw();
 var won,t;
 if(mode==='endless'){
  won=false;
  t='☠ แพ้ที่คลื่น '+(B.endless?B.endless.wave:0)+'\nคะแนนรวม: '+(B.endless?B.endless.pointsEarned:0);
 } else if(mode==='boss'){
  var bp=findBoss();
  var bossDead=bp&&!bp.alive;
  var meAlive=B.players[B.myIndex]&&B.players[B.myIndex].alive;
  won=bossDead&&meAlive;
 } else won=B.winner===B.myIndex;
 if(mode!=='endless'&&won){
  var bossType=B.players.find(function(p){return p.c._isBoss;});
  var addWin=mode==='online'?WIN_ONLINE:(mode==='boss'?(bossType&&bossType.c._bossType==='mixed'?WIN_BOSS_MIXED:WIN_BOSS):WIN_BOT);
  t='★ ชนะ! (+'+addWin+')';
  if(PROFILE)addWins(addWin);
 } else if(mode!=='endless'){
  var wn='?';
  if(mode==='boss')wn='บอส';
  else if(B.winner>=0&&B.players[B.winner])wn=B.players[B.winner].c.name;
  t='✕ แพ้... ผู้ชนะ: '+wn;
 }
 if(mode==='online'||mode==='boss'||mode==='endless')closeWS();
 showRes(t);renderMenu();
}
function botFrame(k){
 var c=newCanvas(),x=c.getContext('2d');
 x.fillStyle='#909098';x.fillRect(0,0,S,S);x.fillStyle='#fff';
 if(k===0){x.fillRect(24,32,16,16);x.fillRect(56,32,16,16);}
 x.fillStyle='#000';x.fillRect(30,38,5,5);x.fillRect(62,38,5,5);
 return c.toDataURL('image/png');
}
function bossFrameByType(type,k){
 var c=newCanvas(),x=c.getContext('2d');
 var cfg=BOSS_TYPES[type]||BOSS_TYPES.mixed;
 var g=x.createRadialGradient(S/2,S/2,8,S/2,S/2,S*0.7);
 g.addColorStop(0,cfg.color);g.addColorStop(1,'#05050a');
 x.fillStyle=g;x.fillRect(0,0,S,S);
 x.strokeStyle=cfg.color;x.lineWidth=3;
 x.shadowColor=cfg.color;x.shadowBlur=14;
 for(var i=0;i<6;i++){
  var ang=i/6*6.283;
  x.beginPath();
  x.moveTo(S/2+Math.cos(ang)*S*0.42,S/2+Math.sin(ang)*S*0.42);
  x.lineTo(S/2+Math.cos(ang+0.3)*S*0.5,S/2+Math.sin(ang+0.3)*S*0.5);
  x.stroke();
 }
 x.shadowBlur=0;
 x.fillStyle='#fff';
 x.beginPath();x.arc(34,44,7,0,7);x.fill();
 x.beginPath();x.arc(62,44,7,0,7);x.fill();
 x.fillStyle='#000';
 x.beginPath();x.arc(34,44,3,0,7);x.fill();
 x.beginPath();x.arc(62,44,3,0,7);x.fill();
 return c.toDataURL('image/png');
}
function makeBot(){
 var ids=Object.keys(SK).filter(function(id){return id!=='pet'&&id!=='bossSummon';}).sort(function(){return Math.random()-.5;}).slice(0,2);
 return {name:'บอท',frames:[botFrame(0)],weapon:'none',
  skills:ids.map(function(id){var d=defSkill(id);d.dmg=roundHalf(1+Math.random()*4);d.cd=roundHalf(5+Math.random()*5);applyBalance(d,'init');return d;})};
}
function makeBoss(type){
 type=type||'mixed';
 var cfg=BOSS_TYPES[type]||BOSS_TYPES.mixed;
 var ids;
 if(cfg.skills&&cfg.skills.length)ids=cfg.skills.slice();
 else{
  var b=Object.keys(SK).filter(function(id){return id!=='pet'&&id!=='bossSummon';}).sort(function(){return Math.random()-.5;}).slice(0,2);
  ids=b.concat(['bossSummon']);
 }
 return {name:'บอส'+cfg.n,frames:[bossFrameByType(type,0)],
  weapon:'sword',_isBoss:true,_bossType:type,_hp:cfg.hp||250,_r:cfg.r||52,
  skills:ids.map(function(id){var d=defSkill(id);if(id==='stone')d.dmg=5.5;return d;})};
}

/* ========= SUCK UI ========= */
$('suckBtn').addEventListener('pointerdown',function(e){
 e.preventDefault();
 if(!B||mode!=='boss'||B.over||B.done)return;
 var boss=findBoss(),me=B.players[B.myIndex];
 if(!boss||!me||!me.alive||me.c._isBoss)return;
 if(!boss.suckActive)return;
 if(boss.suckDone&&boss.suckDone[B.myIndex]==='escaped')return;
 if(role==='guest'){
  guestSuckPress++;
  if(guestSuckPress>=BOSS_SUCK_PRESSES){wsSend({a:'suckDone'});$('suckBox').style.display='none';}
 } else {
  if(!boss.suckPulls)boss.suckPulls={};
  if(!boss.suckDone)boss.suckDone={};
  boss.suckPulls[B.myIndex]=(boss.suckPulls[B.myIndex]||0)+1;
  if(boss.suckPulls[B.myIndex]>=BOSS_SUCK_PRESSES){
   boss.suckDone[B.myIndex]='escaped';
   var dx=me.x-boss.x,dy=me.y-boss.y,d=Math.hypot(dx,dy)||1;
   me.vx=(dx/d)*950;me.vy=(dy/d)*950;
   $('suckBox').style.display='none';
  }
 }
});
function updateSuckUI(){
 var box=$('suckBox');
 if(!B||mode!=='boss'||B.over||B.done){box.style.display='none';return;}
 var boss=findBoss(),me=B.players[B.myIndex];
 if(!boss||!me||!me.alive||me.c._isBoss||!boss.suckActive){box.style.display='none';return;}
 if(boss.suckDone&&boss.suckDone[B.myIndex]==='escaped'){box.style.display='none';return;}
 box.style.display='block';
 if(role==='guest')$('suckProgress').textContent=Math.min(guestSuckPress,BOSS_SUCK_PRESSES)+' / '+BOSS_SUCK_PRESSES;
 else $('suckProgress').textContent=Math.min((boss.suckPulls&&boss.suckPulls[B.myIndex])||0,BOSS_SUCK_PRESSES)+' / '+BOSS_SUCK_PRESSES;
 $('suckTime').textContent=Math.max(0,boss.suckTimer||0).toFixed(1)+' วิ';
}

/* ========= LUCKY CARD ========= */
var LUCKY_POOL=null;
function getLuckyPool(){
 if(LUCKY_POOL)return LUCKY_POOL;
 var ids=Object.keys(SK).filter(function(id){return id!=='pet'&&id!=='bossSummon';});
 LUCKY_POOL=ids.concat(['hp']);return LUCKY_POOL;
}
function luckyRoll(){
 if(!B||B.over||B.done)return;
 var me=B.players[B.myIndex];
 if(!me||!me.alive||me.c.weapon!=='lucky')return;
 if(me.luckyCd>0){toast('รอ '+me.luckyCd.toFixed(1)+' วิ');return;}
 var pool=getLuckyPool();
 var pick=pool[Math.floor(Math.random()*pool.length)];
 luckyRollReward=pick;
 var resEl=$('luckyResult');
 if(pick==='hp')resEl.innerHTML='<span style="color:#88ff44">💚 HP +50%</span>';
 else resEl.innerHTML='<span style="color:'+SK[pick].color+'">'+elemSvg(pick,26,SK[pick].color)+' '+SK[pick].n+'</span>';
 resEl.style.animation='none';void resEl.offsetWidth;resEl.style.animation='luckyIn .4s ease-out';
 $('luckyRoll').style.display='block';$('luckyBtn').disabled=true;
}
function luckyConfirm(){
 if(!B||B.over||B.done)return;
 var me=B.players[B.myIndex];
 if(!me||!me.alive||!luckyRollReward)return;
 var reward=luckyRollReward;luckyRollReward=null;
 $('luckyRoll').style.display='none';$('luckyBtn').disabled=false;
 me.luckyCd=LUCKY_CARD_CD;
 if(reward==='hp'){me.hp=Math.min(me.maxHp,me.hp+me.maxHp*0.5);burst(me.x,me.y,'#88ff44',50,2.2);toast('💚 ฟื้น HP');return;}
 var target=nearestEnemy(me);
 if(!target){toast('ไม่มีเป้า');return;}
 var a=Math.atan2(target.y-me.y,target.x-me.x);
 var col=SK[reward]?SK[reward].color:'#ffd166';
 B.proj.push({k:'card',owner:me.index,x:me.x+Math.cos(a)*me.r,y:me.y+Math.sin(a)*me.r,
  vx:Math.cos(a)*520,vy:Math.sin(a)*520,r:14,dmg:LUCKY_CARD_DMG,power:0.5,
  color:col,ang:a,life:3,castImgs:null,statusImgs:null,statusSrc:null,trail:[],weapon:true,cardSkill:reward});
 toast('🎴 ขว้าง '+SK[reward].n);
}
$('luckyBtn').onclick=function(e){e.preventDefault();luckyRoll();};
$('luckyConfirm').onclick=function(e){e.preventDefault();luckyConfirm();};

/* ========= INIT ========= */
loadProfile();
loadChars().then(function(){updateMenuProfile();});
$('btnHome').onclick=function(){
 $('res').style.display='none';cancelAnimationFrame(raf);
 $('suckBox').style.display='none';$('luckyBox').style.display='none';
 $('waveBanner').style.display='none';$('endlessHUD').style.display='none';
 closeWS();show('menu');
 bc.width=360;bc.height=520;bc.style.maxWidth='360px';
 $('battle').style.maxWidth='900px';
 updateMenuProfile();
};
})();
</script></body></html>`;

// ================= SERVER ENDPOINTS =================
function frame(op, data) {
  const p = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const n = p.length;
  let h;
  if (n < 126) h = Buffer.from([0x80 | op, n]);
  else if (n < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(n, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); }
  return Buffer.concat([h, p]);
}
function send(c, obj, droppable) {
  if (!c || c.sock.destroyed || !c.sock.writable) return;
  if (droppable && c.sock.writableLength > 200000) return;
  try { c.sock.write(frame(1, JSON.stringify(obj))); } catch(e) {}
}
function broadcastRooms() {
  const list = [];
  const now = Date.now();
  rooms.forEach(r => {
    list.push({
      id: r.id, mode: r.mode, size: r.size, bossType: r.bossType,
      hostName: r.hostName, hostWins: r.hostWins,
      count: r.peers.length, age: Math.floor((now - r.createdAt) / 1000)
    });
  });
  clients.forEach(c => send(c, { type: 'rooms', rooms: list }));
}
function startRoomMatch(room) {
  const players = room.peers.map(p => p.char);
  const boss = room.mode === 'boss' ? room.boss : null;
  room.peers.forEach((p, i) => {
    p.peerGroup = room.peers.filter(x => x !== p);
    p.myIndex = i;
    p.roomId = room.id;
    const msg = { type: 'match', players, myIndex: i, size: room.size };
    if (room.mode === 'boss') { msg.mode = 'boss'; msg.boss = boss; }
    if (room.mode === 'endless') { msg.mode = 'endless'; }
    send(p, msg);
  });
  rooms.delete(room.id);
  setTimeout(broadcastRooms, 500);
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const hdr = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (req.method === 'GET' && u.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(HTML);
  }
  if (req.method === 'GET' && u.pathname === '/api/leaderboard') {
    res.writeHead(200, hdr); return res.end(JSON.stringify(leaderboard.slice(0, 50)));
  }
  if (req.method === 'POST' && u.pathname === '/api/register') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 4000) req.destroy(); });
    req.on('end', () => {
      try {
        const j = JSON.parse(body);
        const name = String(j.name || '').trim().slice(0, 16);
        const pk = String(j.passkey || '').trim();
        if (name.length < 2 || !/^[a-zA-Z0-9ก-๙_-]+$/.test(name) || !/^\d{6}$/.test(pk)) {
          res.writeHead(200, hdr); return res.end(JSON.stringify({ ok: false, error: 'ข้อมูลไม่ถูกต้อง' }));
        }
        const key = name.toLowerCase();
        if (users[key]) {
          res.writeHead(200, hdr); return res.end(JSON.stringify({ ok: false, error: 'ชื่อนี้ถูกใช้แล้ว' }));
        }
        users[key] = { name, hash: hashKey(name, pk), wins: 0, createdAt: Date.now() };
        saveUsers();
        updateLB(name, 0);
        res.writeHead(200, hdr); return res.end(JSON.stringify({ ok: true, name, wins: 0 }));
      } catch(e) {
        res.writeHead(200, hdr); return res.end(JSON.stringify({ ok: false, error: 'parse error' }));
      }
    });
    return;
  }
  if (req.method === 'POST' && u.pathname === '/api/login') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 4000) req.destroy(); });
    req.on('end', () => {
      try {
        const j = JSON.parse(body);
        const name = String(j.name || '').trim().slice(0, 16);
        const pk = String(j.passkey || '').trim();
        const key = name.toLowerCase();
        const u = users[key];
        if (!u || u.hash !== hashKey(u.name, pk)) {
          res.writeHead(200, hdr); return res.end(JSON.stringify({ ok: false, error: 'ชื่อหรือรหัสไม่ถูกต้อง' }));
        }
        res.writeHead(200, hdr); return res.end(JSON.stringify({ ok: true, name: u.name, wins: u.wins }));
      } catch(e) {
        res.writeHead(200, hdr); return res.end(JSON.stringify({ ok: false, error: 'parse error' }));
      }
    });
    return;
  }
  if (req.method === 'POST' && u.pathname === '/api/sync-wins') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 4000) req.destroy(); });
    req.on('end', () => {
      try {
        const j = JSON.parse(body);
        const name = String(j.name || '').trim().slice(0, 16);
        const pk = String(j.passkey || '').trim();
        const wins = Math.max(0, Math.floor(Number(j.wins) || 0));
        const key = name.toLowerCase();
        const u = users[key];
        if (u && u.hash === hashKey(u.name, pk)) {
          u.wins = Math.max(u.wins, wins);
          saveUsers();
          updateLB(u.name, u.wins);
        }
      } catch(e) {}
      res.writeHead(200, hdr); return res.end(JSON.stringify({ ok: true }));
    });
    return;
  }
  res.writeHead(404); res.end();
});

// ============ WebSocket (Rooms) ============
const clients = new Set();

function onMsg(c, txt) {
  c.n++;
  if (c.n > 200) return;
  let d;
  try { d = JSON.parse(txt); } catch(e) { return; }
  if (!d || typeof d !== 'object') return;

  if (d.a === 'hello') {
    c.name = String(d.name || 'Guest').slice(0, 16);
  } else if (d.a === 'list_rooms') {
    broadcastRooms();
  } else if (d.a === 'create_room') {
    if (c.roomId) return;
    if (!d.char || typeof d.char !== 'object') return;
    const size = Math.max(2, Math.min(5, parseInt(d.size) || 2));
    const m = d.mode === 'boss' ? 'boss' : 'endless';
    const bossType = m === 'boss' && BOSS_TYPES_KEYS.includes(d.bossType) ? d.bossType : 'mixed';
    const roomId = 'r' + (++roomSeq);
    const room = {
      id: roomId, mode: m, size, bossType,
      hostName: String(d.name || c.name || '?').slice(0, 16),
      hostWins: Math.max(0, Math.floor(Number(d.wins) || 0)),
      peers: [c], boss: null, createdAt: Date.now()
    };
    if (m === 'boss') room.boss = d.bossChar || null;
    rooms.set(roomId, room);
    c.roomId = roomId;
    c.char = d.char;
    send(c, { type: 'room_created', roomId, size });
    broadcastRooms();
  } else if (d.a === 'join_room') {
    if (c.roomId) return;
    if (!d.char || typeof d.char !== 'object') return;
    const r = rooms.get(d.roomId);
    if (!r) { send(c, { type: 'room_gone' }); return; }
    if (r.peers.length >= r.size) { send(c, { type: 'room_full' }); return; }
    c.char = d.char;
    c.roomId = r.id;
    r.peers.push(c);
    r.peers.forEach(p => send(p, { type: 'room_update', count: r.peers.length, size: r.size, hostName: r.hostName }));
    broadcastRooms();
    if (r.peers.length >= r.size) startRoomMatch(r);
  } else if (d.a === 'leave_room') {
    const r = rooms.get(c.roomId);
    if (r) {
      r.peers = r.peers.filter(p => p !== c);
      if (r.peers.length === 0) rooms.delete(r.id);
      else r.peers.forEach(p => send(p, { type: 'room_update', count: r.peers.length, size: r.size, hostName: r.hostName }));
    }
    c.roomId = null;
    broadcastRooms();
  } else if (d.a === 'relay') {
    if (c.peerGroup) c.peerGroup.forEach(p => { if (p !== c && !p.sock.destroyed) send(p, { type: 'state', s: d.s }, true); });
  } else if (d.a === 'suckDone') {
    if (c.peerGroup) c.peerGroup.forEach(p => { if (p !== c && !p.sock.destroyed) send(p, { type: 'suckDone', from: c.myIndex }); });
  } else if (d.a === 'ping') {
    send(c, { type: 'pong' });
  }
}

const BOSS_TYPES_KEYS = ['fire','lightning','stone','summon','ice','wind','fist','light','blood','dark','water','mixed'];

server.on('upgrade', (req, socket) => {
  const u = new URL(req.url, 'http://x');
  const key = req.headers['sec-websocket-key'];
  if (u.pathname !== '/ws' || !key) { socket.destroy(); return; }
  if (clients.size >= MAXCONN) { socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n'); socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  const c = { sock: socket, peerGroup: null, char: null, name: 'Guest', roomId: null, n: 0, myIndex: 0 };
  clients.add(c);
  const rt = setInterval(() => { c.n = 0; }, 1000);
  const pt = setInterval(() => { if (!socket.destroyed) { try { socket.write(frame(9, '')); } catch(e) {} } }, 25000);
  let dead = false;
  const cleanup = () => {
    if (dead) return; dead = true;
    clearInterval(rt); clearInterval(pt);
    clients.delete(c);
    const r = rooms.get(c.roomId);
    if (r) {
      r.peers = r.peers.filter(p => p !== c);
      if (r.peers.length === 0) rooms.delete(r.id);
      else r.peers.forEach(p => send(p, { type: 'room_update', count: r.peers.length, size: r.size, hostName: r.hostName }));
    }
    if (c.peerGroup) c.peerGroup.forEach(p => { if (!p.sock.destroyed) send(p, { type: 'left' }); });
    broadcastRooms();
  };
  socket.on('close', cleanup);
  socket.on('error', () => { socket.destroy(); });
  let buf = Buffer.alloc(0), frags = [], fragLen = 0;
  socket.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    if (buf.length > MAXMSG + 20) { socket.destroy(); return; }
    while (buf.length >= 2) {
      const b0 = buf[0], b1 = buf[1];
      const op = b0 & 15, fin = b0 & 128, masked = b1 & 128;
      let len = b1 & 127, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      if (len > MAXMSG) { socket.destroy(); return; }
      const need = off + (masked ? 4 : 0) + len;
      if (buf.length < need) return;
      let payload = buf.slice(off + (masked ? 4 : 0), need);
      if (masked) {
        const m = buf.slice(off, off + 4);
        payload = Buffer.from(payload);
        for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3];
      }
      buf = buf.slice(need);
      if (op === 8) { try { socket.end(frame(8, '')); } catch(e) {} return; }
      if (op === 9) { try { socket.write(frame(10, payload)); } catch(e) {} continue; }
      if (op === 1 || op === 0) {
        fragLen += payload.length;
        if (fragLen > MAXMSG) { socket.destroy(); return; }
        frags.push(payload);
        if (fin) {
          const txt = Buffer.concat(frags).toString('utf8');
          frags = []; fragLen = 0;
          onMsg(c, txt);
        }
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('🎮 เกมพร้อมแล้ว!  พอร์ต ' + PORT);
  console.log('   เครื่องนี้ : http://localhost:' + PORT);
  const n = os.networkInterfaces();
  Object.keys(n).forEach(k => n[k].forEach(i => {
    if (i.family === 'IPv4' && !i.internal) console.log('   วงเดียวกัน : http://' + i.address + ':' + PORT);
  }));
});

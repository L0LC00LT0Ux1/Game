// ================= game.js : วงกลมสู้ศึก (boss multiplayer) =================
const http = require('http');
const os = require('os');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const MAXMSG = 800000;
const MAXCONN = 300;

const HTML = String.raw`<!DOCTYPE html>
<html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>◉ วงกลมสู้ศึก</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%}
body{margin:0;background:#050505;color:#e8e8e8;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;overflow-x:hidden}
#bgfx{position:fixed;inset:0;z-index:0;pointer-events:none}
.screen{display:none;padding:14px;max-width:520px;margin:auto;position:relative;z-index:1}
.screen.on{display:block;animation:fadeIn .25s ease-out}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
#battle{padding:6px;z-index:1}
h1{text-align:center;margin:12px 0 16px;letter-spacing:.14em;font-weight:300;
  color:#f5f5f5;font-size:22px;text-shadow:0 0 20px rgba(255,255,255,.25)}
h1::before{content:'◉  ';opacity:.7}
h3{margin:18px 0 10px;font-size:13px;letter-spacing:.14em;color:#aaa;font-weight:600;
  text-transform:uppercase;text-align:center}
button{background:#141414;color:#e8e8e8;border:1px solid #2a2a2a;border-radius:10px;
  padding:10px 14px;font-size:14px;margin:3px;font-family:inherit;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  transition:transform .08s,background .15s,border-color .15s,box-shadow .15s}
button:hover{background:#1e1e1e;border-color:#555}
button:active{transform:scale(.96)}
button.on{background:#fff;color:#000;border-color:#fff;box-shadow:0 0 16px rgba(255,255,255,.4)}
button:disabled{opacity:.35;cursor:not-allowed}
button:disabled:hover{background:#141414;border-color:#2a2a2a}
button.big{display:flex;width:100%;padding:14px;font-size:15px;margin:8px 0;
  background:#141414;border:1px solid #2a2a2a;letter-spacing:.05em;border-radius:12px}
button.big:hover{background:#1e1e1e;border-color:#fff}
button.big.primary{background:#fff;color:#000;border-color:#fff;font-weight:600}
button.big.primary:hover{background:#e8e8e8;box-shadow:0 0 20px rgba(255,255,255,.35)}
button.big.gray{background:#0f0f0f;border-color:#222;color:#888}
button.big.danger{background:#1a0808;border-color:#3a1010;color:#e88}
button.big.danger:hover{background:#2a0e0e;border-color:#c44}
button.green{background:#0f1a12;border-color:#2a4a34;color:#a8e8b8}
button.red{background:#1a0808;border-color:#4a2020;color:#e88}
button.warn{background:#1a1408;border-color:#4a4020;color:#e8c880}
button.num{padding:14px 18px;font-size:20px;font-weight:600;min-width:56px;
  background:#141414;border-color:#2a2a2a}
button.num:hover{background:#1e1e1e;border-color:#fff}
input[type=text],input[type=password],input[type=number]{width:100%;padding:12px 14px;
  border-radius:10px;border:1px solid #2a2a2a;background:#0f0f0f;color:#fff;font-size:15px;
  font-family:inherit;transition:border-color .15s,box-shadow .15s;letter-spacing:.05em}
input[type=text]:focus,input[type=password]:focus,input[type=number]:focus{
  outline:0;border-color:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.1)}
input[type=text]::placeholder,input[type=password]::placeholder{color:#555;letter-spacing:0}

.profile-card{display:flex;align-items:center;gap:14px;padding:14px;
  background:linear-gradient(135deg,#0f0f0f 0%,#050505 100%);
  border:1px solid #2a2a2a;border-radius:16px;margin:12px 0 18px;cursor:pointer;
  transition:border-color .15s,transform .1s}
.profile-card:hover{border-color:#555}
.profile-card:active{transform:scale(.99)}
.profile-card .avatar{width:58px;height:58px;border-radius:50%;background:#1a1a1a;
  border:2px solid #444;display:flex;align-items:center;justify-content:center;
  font-size:22px;overflow:hidden;flex-shrink:0;color:#888}
.profile-card .avatar img{width:100%;height:100%;object-fit:cover;display:block}
.profile-card .pinfo{flex:1;min-width:0}
.profile-card .pname{font-size:16px;font-weight:600;color:#fff;letter-spacing:.03em;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.profile-card .pwins{font-size:12px;color:#888;margin-top:3px;letter-spacing:.05em}
.profile-card .pwin-badge{color:#fff;font-weight:700}
.profile-card .arrow{color:#555;font-size:18px;flex-shrink:0}

.menu-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0}
.menu-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:10px;padding:26px 12px;background:#0f0f0f;border:1px solid #2a2a2a;border-radius:16px;
  font-size:32px;cursor:pointer;transition:all .18s ease;color:#e8e8e8;
  position:relative;overflow:hidden;margin:0}
.menu-tile::before{content:'';position:absolute;inset:0;
  background:radial-gradient(circle at 50% 0%,rgba(255,255,255,.06),transparent 70%);
  opacity:0;transition:opacity .18s}
.menu-tile:hover{background:#151515;border-color:#fff;transform:translateY(-2px);
  box-shadow:0 6px 22px rgba(0,0,0,.5),0 0 24px rgba(255,255,255,.08)}
.menu-tile:hover::before{opacity:1}
.menu-tile:active{transform:translateY(0) scale(.98)}
.menu-tile span{font-size:12px;font-weight:600;letter-spacing:.18em;color:#ccc;
  text-transform:uppercase}
.menu-tile.wide{grid-column:span 2}
.menu-tile.admin{border-color:#ffd166;color:#ffd166}
.menu-tile.admin:hover{border-color:#ffd166;box-shadow:0 0 24px rgba(255,209,102,.3)}
.menu-tile.admin span{color:#ffd166}

.card{display:flex;align-items:center;gap:12px;background:#0f0f0f;border:1px solid #222;
  border-radius:14px;padding:12px;margin:10px 0;min-height:100px;
  transition:border-color .15s,box-shadow .15s;position:relative}
.card.act{border-color:#fff;box-shadow:0 0 22px rgba(255,255,255,.15)}
.card canvas{width:64px;height:64px;border-radius:50%;background:#050505;
  border:2px solid #333;flex-shrink:0}
.card .info{flex:1;font-size:13px;line-height:1.6;min-width:0;word-break:break-word;color:#ccc}
.card .info b{color:#fff;font-size:15px;letter-spacing:.03em}
.card .actions{display:flex;flex-direction:column;gap:4px;flex-shrink:0}
.card .actions button{padding:7px 10px;font-size:12px;margin:0;min-width:64px}
.card .empty{flex:1;text-align:center;padding:8px 0}
.card .empty button{margin-top:8px}

.cwrap{position:relative;width:288px;height:288px;margin:14px auto;border-radius:50%;
  overflow:hidden;border:2px dashed #444;
  background:repeating-conic-gradient(#1a1a1a 0 25%,#0f0f0f 0 50%) 0 0/24px 24px;
  box-shadow:0 0 30px rgba(0,0,0,.8) inset,0 0 30px rgba(255,255,255,.05)}
#dc{width:288px;height:288px;touch-action:none;image-rendering:pixelated;display:block}
.bar2{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px;margin:6px 0}
#fbar,#efbar{display:flex;flex-wrap:wrap;justify-content:center;gap:4px}
#fbar button,#efbar button{min-width:34px;padding:8px;font-size:12px}
.sk{background:#0f0f0f;border:1px solid #222;border-radius:12px;padding:12px;margin:8px 0}
.row{display:flex;align-items:center;gap:10px;font-size:12px;margin:6px 0;color:#aaa}
.row span{width:150px;color:#999}
.row input[type=range]{flex:1;accent-color:#fff}
.row b{width:44px;text-align:right;color:#fff;font-variant-numeric:tabular-nums;font-weight:600}
.hud{display:flex;gap:4px;margin-bottom:6px;flex-wrap:nowrap;position:relative}
.hb{flex:1;min-width:0;font-size:10px;line-height:1.3}
.hb>b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  color:#cfcfcf;font-size:11px}
.hb .bar{height:10px;border-radius:5px;background:#0f0f0f;border:1px solid #333;overflow:hidden}
.hb .bar i{display:block;height:100%;background:linear-gradient(90deg,#e0e0e0,#fff);
  transition:width .15s linear}
.hb.me .bar{box-shadow:0 0 10px rgba(255,255,255,.6);border-color:#fff}
.hb.me>b{color:#fff}
.hb.boss .bar i{background:linear-gradient(90deg,#7a0000,#e02020)}
.hb.boss>b{color:#e05050}
.hb.boss.rage .bar i{background:linear-gradient(90deg,#f00,#fff,#f00);background-size:200% 100%;
  animation:rageBar 0.6s linear infinite}
.hb.boss.rage>b{color:#ff4444;text-shadow:0 0 8px #ff4444}
@keyframes rageBar{from{background-position:0% 0}to{background-position:200% 0}}
.hb small{font-size:10px;opacity:.7;color:#bbb}
#bc{width:100%;max-width:360px;display:block;margin:auto;border-radius:14px;
  box-shadow:0 0 40px rgba(255,255,255,.08);background:#050505}
#res,#wait{display:none;position:fixed;inset:0;background:rgba(0,0,0,.94);z-index:9;
  text-align:center;padding-top:28vh;font-size:24px;backdrop-filter:blur(8px);color:#fff;
  letter-spacing:.05em}
#toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);
  background:rgba(15,15,15,.96);padding:10px 20px;border-radius:22px;
  border:1px solid #333;display:none;z-index:99;font-size:13px;backdrop-filter:blur(8px);
  color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.6)}
#cnt{text-align:center;font-size:12px;opacity:.75;margin:12px 0;color:#888;letter-spacing:.08em}
.tag{display:inline-block;padding:1px 8px;border-radius:8px;font-size:10px;
  background:#1a1a1a;border:1px solid #333;margin-left:4px;vertical-align:middle;color:#aaa;
  letter-spacing:.05em}
.tag.admin{background:#2a1a00;border-color:#ffd166;color:#ffd166}
.skef-wrap{position:relative;width:256px;height:256px;margin:14px auto;
  background:#0a0a0a;border:1px solid #333;border-radius:12px;overflow:hidden;
  background-image:linear-gradient(#ffffff08 1px,transparent 1px),
    linear-gradient(90deg,#ffffff08 1px,transparent 1px);
  background-size:32px 32px;box-shadow:0 0 24px rgba(255,255,255,.06)}
.skef-layer{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;
  touch-action:none}
.skef-ghost{opacity:.3;pointer-events:none}
.skef-info{text-align:center;font-size:12px;color:#888;margin:6px 0}
.eff-btn{width:100%;margin-top:6px;background:#0f0f0f;border-color:#222;font-size:12px;padding:8px}
.eff-btn:hover{background:#1a1a1a;border-color:#555}
.eff-btn.hit{background:#0f0f0f;border-color:#333}
.bal-info{font-size:11px;color:#888;text-align:center;margin-top:10px;padding:10px;
  background:#0a0a0a;border-radius:10px;border:1px dashed #2a2a2a;line-height:1.7}
.hint{text-align:center;font-size:12px;opacity:.6;margin:8px 0;color:#999;line-height:1.6}
.layer-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px;
  padding:8px;background:#0a0a0a;border-radius:10px;border:1px solid #222;margin:8px 0}
.layer-bar .lbl{font-size:12px;color:#888;margin-right:4px}
.layer-bar button{padding:6px 10px;font-size:12px;margin:0}
.lb-row{display:flex;align-items:center;gap:12px;padding:12px;background:#0f0f0f;
  border:1px solid #222;border-radius:12px;margin:6px 0;transition:border-color .15s}
.lb-rank{width:38px;height:38px;border-radius:50%;background:#1a1a1a;display:flex;
  align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0;
  border:2px solid #333;color:#aaa}
.lb-rank.r1{background:linear-gradient(180deg,#fff,#bbb);color:#000;border-color:#fff;
  box-shadow:0 0 14px rgba(255,255,255,.6)}
.lb-rank.r2{background:linear-gradient(180deg,#d0d0d0,#888);color:#000;border-color:#e0e0e0}
.lb-rank.r3{background:linear-gradient(180deg,#a0a0a0,#666);color:#fff;border-color:#bbb}
.lb-avatar{width:36px;height:36px;border-radius:50%;background:#1a1a1a;border:1px solid #333;
  flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;
  font-size:14px;color:#666}
.lb-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.lb-name{flex:1;font-size:14px;font-weight:600;color:#eee;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.lb-wins{font-size:15px;color:#fff;font-weight:700;font-variant-numeric:tabular-nums}
.lb-empty{text-align:center;padding:32px;opacity:.5;font-size:13px;color:#888}
.lb-you{background:#141414;border-color:#666}
.online-opt{background:#0a0a0a;border:1px solid #222;border-radius:12px;padding:12px;
  margin:8px 0;animation:fadeIn .2s}
.online-opt .row2{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
.wpn-btn{padding:12px 16px;font-size:13px;min-width:88px;background:#141414;border-color:#2a2a2a}
.wpn-btn.on{background:#fff;color:#000;border-color:#fff;font-weight:600}
.wpn-btn.locked{opacity:.35}
.wpn-btn.kn{background:#1a0808;border-color:#5a1010;color:#e88}
.wpn-btn.kn.on{background:#c81020;color:#fff;border-color:#fff}
.wpn-btn.lk{background:#1a1408;border-color:#5a4a10;color:#e8c060}
.wpn-btn.lk.on{background:#c8a030;color:#1a0e05;border-color:#fff}
#suckBox{display:none;position:fixed;left:0;right:0;bottom:0;padding:14px 14px 18px;
  z-index:20;text-align:center;
  background:linear-gradient(0deg,rgba(20,0,5,.97),rgba(20,0,5,.55));
  border-top:2px solid #c81020;box-shadow:0 -8px 30px rgba(200,16,32,.35);
  backdrop-filter:blur(6px)}
#suckBox h4{margin:0 0 6px;font-size:13px;color:#ff7788;font-weight:700;
  letter-spacing:.14em;text-shadow:0 0 12px #ff3355;text-transform:uppercase}
#suckBtn{width:132px;height:132px;border-radius:50%;font-size:22px;font-weight:700;
  margin:8px auto 6px;display:block;
  background:radial-gradient(circle at 30% 30%,#c84a68,#5a1828);
  border:4px solid #ff5566;color:#fff;
  box-shadow:0 0 28px rgba(255,85,102,.5),inset 0 0 18px rgba(0,0,0,.5);
  cursor:pointer;touch-action:manipulation;user-select:none;-webkit-user-select:none;
  -webkit-tap-highlight-color:transparent;font-family:inherit;
  animation:suckPulse .6s ease-in-out infinite alternate;letter-spacing:.05em}
#suckBtn:active{transform:scale(.92);
  background:radial-gradient(circle at 30% 30%,#ff6a8a,#8a2038)}
@keyframes suckPulse{from{box-shadow:0 0 20px rgba(255,85,102,.5),inset 0 0 18px rgba(0,0,0,.5)}
  to{box-shadow:0 0 42px rgba(255,85,102,.8),inset 0 0 18px rgba(0,0,0,.5)}}
#suckInfo{display:flex;justify-content:center;gap:22px;font-size:15px;font-weight:600;
  font-variant-numeric:tabular-nums}
.combo-tag{display:inline-block;padding:4px 10px;border-radius:8px;font-size:11px;
  font-weight:700;background:linear-gradient(90deg,#666,#ddd);color:#000;
  box-shadow:0 0 12px rgba(255,255,255,.25);margin:4px 0;letter-spacing:.05em}
.combo-tag.ts{background:linear-gradient(90deg,#8a4aff,#7fdcff);color:#fff;
  box-shadow:0 0 14px rgba(138,74,255,.5)}
.combo-tag.lp{background:linear-gradient(90deg,#fff5c0,#ff88cc);color:#1a0e05;
  box-shadow:0 0 14px rgba(255,200,140,.5)}
#btnMinionEdit{display:none;background:#141414;border-color:#555}
#minionHint{display:none;text-align:center;font-size:12px;color:#ccc;margin:6px 0}
.boss-btn{padding:10px 12px;font-size:13px;min-width:88px;flex-direction:column;gap:2px;
  background:#141414;color:#ddd}
.boss-btn .bname{font-weight:700;font-size:13px}
.boss-btn .bhp{font-size:10px;opacity:.7}
#endlessHUD{display:none;text-align:center;padding:8px;margin-bottom:6px;border-radius:10px;
  background:linear-gradient(180deg,rgba(80,80,80,.5),rgba(20,20,20,.5));
  border:1px solid #666;box-shadow:0 0 20px rgba(255,255,255,.1)}
#endlessHUD .wv{font-size:20px;font-weight:700;color:#eee;letter-spacing:.08em;
  text-shadow:0 0 12px rgba(255,255,255,.4)}
#endlessHUD .info{display:flex;justify-content:space-around;font-size:12px;margin-top:4px;
  font-variant-numeric:tabular-nums;color:#aaa}
#endlessHUD .info b{color:#fff}
#endlessHUD .info .enemies{color:#e88}
#endlessHUD .info .pts{color:#8e8}
#waveBanner{display:none;position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);
  z-index:8;text-align:center;pointer-events:none;
  font-size:38px;font-weight:800;color:#fff;letter-spacing:.08em;
  text-shadow:0 0 24px rgba(255,255,255,.6),0 0 48px rgba(255,255,255,.3);
  animation:waveIn 0.5s ease-out}
@keyframes waveIn{from{transform:translate(-50%,-50%) scale(0.3);opacity:0}
  to{transform:translate(-50%,-50%) scale(1);opacity:1}}
#waveBanner small{display:block;font-size:16px;color:#aaa;margin-top:8px;font-weight:600}

.shop-item{display:flex;flex-direction:column;gap:8px;
  background:linear-gradient(180deg,#0f0f0f,#080808);
  border:1px solid #222;border-radius:14px;padding:14px;margin:10px 0;
  position:relative;overflow:hidden}
.shop-item::before{content:'';position:absolute;inset:0;
  background:radial-gradient(400px 100px at 100% 0%,rgba(255,255,255,.05),transparent 60%);
  pointer-events:none}
.shop-item .head{display:flex;align-items:center;gap:12px}
.shop-item .icn{font-size:28px;filter:drop-shadow(0 0 8px currentColor);flex-shrink:0}
.shop-item .meta{flex:1;min-width:0}
.shop-item .nm{font-weight:700;font-size:15px;color:#fff;letter-spacing:.03em}
.shop-item .dc{font-size:11.5px;color:#888;margin-top:4px;line-height:1.6}
.shop-item .price{color:#fff;font-weight:800;font-size:15px;flex-shrink:0;
  font-variant-numeric:tabular-nums}
.shop-item.owned{border-color:#3a3a3a;background:linear-gradient(180deg,#0f0f0f,#050505)}
.shop-item.owned .price{color:#8e8}
.shop-item.admin-item{border-color:#ffd166}
.shop-item.admin-item .nm{color:#ffd166}
.shop-item.admin-item .price{color:#ffd166}
.shop-item button{margin:0;padding:10px;font-size:14px;width:100%}
#shopWins{text-align:center;font-size:14px;margin:8px 0 14px;padding:12px;
  border-radius:10px;background:#0f0f0f;border:1px solid #2a2a2a;color:#fff;
  font-variant-numeric:tabular-nums;letter-spacing:.05em}
#shopWins b{color:#fff}

#luckyBox{display:none;position:fixed;right:12px;bottom:12px;z-index:15;text-align:center}
#luckyBtn{padding:14px 18px;font-size:14px;font-weight:800;
  background:linear-gradient(180deg,#fff,#bbb);
  border:2px solid #fff;color:#000;border-radius:16px;
  box-shadow:0 0 24px rgba(255,255,255,.4);letter-spacing:.08em;
  animation:luckyPulse 1s ease-in-out infinite alternate}
#luckyBtn:disabled{opacity:.4}
@keyframes luckyPulse{from{box-shadow:0 0 18px rgba(255,255,255,.4)}
  to{box-shadow:0 0 36px rgba(255,255,255,.7)}}
#luckyRoll{background:rgba(10,10,10,.97);border:2px solid #fff;border-radius:16px;
  padding:14px;box-shadow:0 0 30px rgba(255,255,255,.3);backdrop-filter:blur(8px);
  min-width:210px;margin-bottom:8px;display:none}
#luckyResult{font-size:20px;font-weight:800;margin:8px 0;
  text-shadow:0 0 14px currentColor;animation:luckyIn .4s ease-out;min-height:28px;
  color:#fff}
@keyframes luckyIn{from{transform:scale(0.4);opacity:0}to{transform:scale(1);opacity:1}}
#luckyConfirm{padding:10px 20px;font-size:14px;font-weight:800;
  background:#fff;border-color:#fff;color:#000;
  box-shadow:0 0 18px rgba(255,255,255,.4);letter-spacing:.05em}
#luckyConfirm:hover{background:#e8e8e8}

.settings-card{background:#0f0f0f;border:1px solid #222;border-radius:14px;padding:16px;
  margin:12px 0}
.settings-card h3{margin-top:0}
.settings-card input{margin:6px 0}
.settings-card.admin{border-color:#ffd166;background:linear-gradient(180deg,#1a1408,#0a0805)}
.settings-card.admin h3{color:#ffd166}
.avatar-row{display:flex;align-items:center;gap:14px;margin-bottom:12px}
.avatar-big{width:80px;height:80px;border-radius:50%;background:#1a1a1a;
  border:2px solid #444;display:flex;align-items:center;justify-content:center;
  font-size:32px;color:#666;overflow:hidden;flex-shrink:0}
.avatar-big img{width:100%;height:100%;object-fit:cover;display:block}
.avatar-big.admin{border-color:#ffd166;box-shadow:0 0 20px rgba(255,209,102,.4)}

.room-card{display:flex;align-items:center;gap:12px;padding:12px;
  background:#0f0f0f;border:1px solid #222;border-radius:12px;margin:8px 0;
  transition:border-color .15s}
.room-card:hover{border-color:#555}
.room-avatar{width:44px;height:44px;border-radius:50%;background:#1a1a1a;
  border:2px solid #333;flex-shrink:0;overflow:hidden;display:flex;align-items:center;
  justify-content:center;font-size:18px;color:#666}
.room-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.room-info{flex:1;min-width:0}
.room-info .rname{font-size:14px;font-weight:600;color:#fff;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.room-info .rmeta{font-size:11px;color:#888;margin-top:3px;letter-spacing:.04em}
.room-info .rmeta b{color:#ccc}
.room-join{padding:10px 14px;font-size:13px;font-weight:600;background:#fff;color:#000;
  border:1px solid #fff;border-radius:10px;margin:0;flex-shrink:0}
.room-join:hover{background:#e0e0e0}
.room-empty{text-align:center;padding:32px 12px;color:#666;font-size:13px;
  border:1px dashed #2a2a2a;border-radius:12px}
.tabs{display:flex;gap:4px;margin:8px 0;background:#0a0a0a;padding:4px;
  border-radius:12px;border:1px solid #222}
.tabs button{flex:1;background:transparent;border:none;padding:9px;font-size:13px;
  color:#888;border-radius:8px;margin:0;letter-spacing:.05em}
.tabs button.on{background:#fff;color:#000;font-weight:600}
.tabs button:hover:not(.on){background:#1a1a1a;color:#fff}
</style></head><body>

<canvas id="bgfx"></canvas>

<div id="menu" class="screen on">
  <h1>วงกลมสู้ศึก</h1>
  <div class="profile-card" id="profileCard">
    <div class="avatar" id="profileAvatar">?</div>
    <div class="pinfo">
      <div class="pname" id="profileName">ยังไม่ได้ตั้งโปรไฟล์</div>
      <div class="pwins"><span class="pwin-badge" id="profileWins">★ 0</span> ชัยชนะ</div>
    </div>
    <div class="arrow">›</div>
  </div>

  <div class="menu-grid">
    <button class="menu-tile" id="tileChars">✎<span>ตัวละคร</span></button>
    <button class="menu-tile" id="tilePlay">▶<span>เริ่มเล่น</span></button>
    <button class="menu-tile" id="tileShop">🛒<span>ร้านค้า</span></button>
    <button class="menu-tile" id="tileRank">★<span>อันดับ</span></button>
    <button class="menu-tile wide" id="tileSettings">⚙<span>ตั้งค่า</span></button>
    <button class="menu-tile wide admin" id="tileAdmin" style="display:none">👑<span>เครื่องแอดมิน</span></button>
  </div>

  <div id="cnt"></div>
</div>

<div id="chars" class="screen">
  <h1>ตัวละคร</h1>
  <div id="slots"></div>
  <button class="big gray" id="charsBack">← กลับ</button>
</div>

<div id="play" class="screen">
  <h1>เริ่มเล่น</h1>
  <h3>โหมดเดี่ยว</h3>
  <button class="big" id="btnBot">⚔  สู้กับบอท <span style="font-size:12px;opacity:.7;margin-left:auto">+1</span></button>
  <button class="big" id="btnBoss">☠  สู้บอส</button>
  <div id="bossTypeOpt" class="online-opt" style="display:none">
    <div class="hint">เลือกธาตุบอส:</div>
    <div class="row2" id="bossTypeList"></div>
    <button class="big gray" id="btnBossTypeCancel" style="margin-top:8px">← ยกเลิก</button>
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
    <button class="big gray" id="btnBossCancel" style="margin-top:8px">← ยกเลิก</button>
  </div>
  <button class="big" id="btnEndless">∞  โหมดไม่สิ้นสุด</button>
  <div id="endlessOpt" class="online-opt" style="display:none">
    <div class="hint">เลือกจำนวนผู้เล่น:</div>
    <div class="row2">
      <button class="num" data-endless="1">1</button>
      <button class="num" data-endless="2">2</button>
      <button class="num" data-endless="3">3</button>
      <button class="num" data-endless="4">4</button>
      <button class="num" data-endless="5">5</button>
    </div>
    <div class="hint">∞ คลื่นไม่มีที่สิ้นสุด • ทุก 10 = มินิบอส • ทุก 50 = บอสใหญ่ • ฟื้น HP 50% ทุกคลื่น</div>
    <button class="big gray" id="btnEndlessCancel" style="margin-top:8px">← ยกเลิก</button>
  </div>
  <h3>ห้องออนไลน์</h3>
  <div class="tabs">
    <button id="tabRooms" class="on">ห้องที่มีอยู่</button>
    <button id="tabCreate">สร้างห้องใหม่</button>
  </div>
  <div id="roomsView">
    <button class="big" id="btnRefreshRooms">↻ รีเฟรชห้อง</button>
    <div id="roomsList"></div>
  </div>
  <div id="createView" style="display:none">
    <div class="hint">เลือกโหมดและจำนวนผู้เล่น</div>
    <div class="bar2">
      <button class="num" data-cm="normal">⚔</button>
      <button class="num" data-cm="boss">☠</button>
      <button class="num" data-cm="endless">∞</button>
    </div>
    <div class="hint" id="createModeLabel">โหมด: ปกติ (ดวลกันเอง)</div>
    <div class="hint" id="createBossPick" style="display:none">ธาตุบอส:</div>
    <div class="row2" id="createBossList" style="display:none"></div>
    <div class="bar2">
      <button class="num" data-cs="2">2</button>
      <button class="num" data-cs="3">3</button>
      <button class="num" data-cs="4">4</button>
      <button class="num" data-cs="5">5</button>
    </div>
    <div class="hint" id="createSizeLabel">จำนวนผู้เล่น: 2</div>
    <button class="big primary" id="btnCreateRoom">🏠 สร้างห้อง</button>
  </div>
  <button class="big gray" id="playBack" style="margin-top:16px">← กลับ</button>
</div>

<div id="rank" class="screen">
  <h1>อันดับผู้เล่น</h1>
  <div id="rankList"></div>
  <button class="big" id="rankRefresh">↻ รีเฟรช</button>
  <button class="big gray" id="rankBack">← กลับ</button>
</div>

<div id="shop" class="screen">
  <h1>ร้านค้า</h1>
  <div id="shopWins"></div>
  <div id="shopList"></div>
  <button class="big gray" id="shopBack">← กลับ</button>
</div>

<div id="admin" class="screen">
  <h1>👑 เครื่องแอดมิน</h1>
  <div class="hint">TOUx1 — โหมดแก้ไขไม่จำกัด</div>

  <div class="settings-card admin">
    <h3>★ ชัยชนะ</h3>
    <input type="number" id="admWinsInput" placeholder="จำนวน" value="1000" min="0" max="9999999">
    <div style="display:flex;gap:6px;margin-top:8px">
      <button class="big green" id="admAddWins" style="flex:1;margin:0">+ เสกชัยชนะ</button>
      <button class="big danger" id="admSubWins" style="flex:1;margin:0">− ลบชัยชนะ</button>
    </div>
    <div class="hint" id="admWinsStatus"></div>
  </div>

  <div class="settings-card admin">
    <h3>❤ HP ตัวละครตัวเอง</h3>
    <div class="hint" style="text-align:left;margin:0 0 8px">ค่าที่ใช้กับตัวละครที่เลือกอยู่ตอนนี้</div>
    <input type="number" id="admHpInput" placeholder="HP" value="500" min="1" max="99999">
    <button class="big primary" id="admSetHp">💾 ตั้ง HP</button>
  </div>

  <div class="settings-card admin">
    <h3>⚡ ความเร็วการปล่อยสกิล</h3>
    <div class="hint" style="text-align:left;margin:0 0 8px">
      ตัวคูณคูลดาวน์ • 0.01 = เร็ว 100 เท่า • 10 = ช้า 10 เท่า
    </div>
    <input type="range" id="admCdMult" min="0.01" max="10" step="0.01" value="1" style="width:100%;accent-color:#ffd166">
    <div id="admCdVal" style="text-align:center;color:#ffd166;font-weight:700;margin:6px 0">CD × 1.00</div>
    <button class="big primary" id="admSetCd">💾 ตั้งค่า CD</button>
  </div>

  <div class="settings-card admin">
    <h3>✦ สกิลไม่จำกัด</h3>
    <div class="hint" style="text-align:left;margin:0 0 8px">
      ปลดล็อกให้ตัวละครปัจจุบันใส่สกิลได้ทุกธาตุ ไม่จำกัดช่อง
    </div>
    <button class="big primary" id="admAllSkills">✦ ใส่ทุกสกิลให้ตัวละครนี้</button>
    <button class="big gray" id="admClearSkills">✕ เคลียร์สกิลทั้งหมด</button>
  </div>

  <button class="big gray" id="admReset">↻ รีเซ็ตค่าแอดมินทั้งหมด</button>
  <button class="big gray" id="adminBack">← กลับ</button>
</div>

<div id="settings" class="screen">
  <h1>ตั้งค่า</h1>
  <div class="settings-card">
    <h3>👤 โปรไฟล์</h3>
    <div class="avatar-row">
      <div class="avatar-big" id="setAvatar">?</div>
      <button class="big primary" id="btnUpAvatar" style="margin:0;flex:1">📷 เลือกรูปโปรไฟล์</button>
      <input type="file" id="avatarFile" accept="image/*" style="display:none">
    </div>
    <input type="text" id="setName" placeholder="ชื่อผู้ใช้ (ไม่ซ้ำกับคนอื่น)" maxlength="12">
    <input type="password" id="setKey" placeholder="รหัสคีย์พาส 6 ตัว" maxlength="6">
    <button class="big primary" id="btnSaveAccount">💾 บันทึกเข้าระบบ</button>
    <div class="hint" id="accountStatus"></div>
  </div>
  <div class="settings-card">
    <h3>🔑 กู้คืนรหัส</h3>
    <div class="hint" style="text-align:left;margin:0 0 8px">ใส่ชื่อผู้ใช้ + รหัสคีย์พาสที่ตั้งไว้ เพื่อเข้าสู่ระบบ</div>
    <input type="text" id="recName" placeholder="ชื่อผู้ใช้" maxlength="12">
    <input type="password" id="recKey" placeholder="รหัสคีย์พาส 6 ตัว" maxlength="6">
    <button class="big" id="btnRecover">↻ กู้คืนและเข้าสู่ระบบ</button>
  </div>
  <button class="big gray" id="settingsBack">← กลับ</button>
</div>

<div id="editor" class="screen">
  <input type="text" id="cname" placeholder="ชื่อตัวละคร" maxlength="12">
  <div class="cwrap"><canvas id="dc" width="96" height="96"></canvas></div>
  <div class="bar2" id="tools">
    <button data-t="brush" class="on">✎ แปรง</button>
    <button data-t="bucket">▨ ถังสี</button>
    <button data-t="eraser">⌫ ยางลบ</button>
    <input type="color" id="col" value="#ff4d6d" style="width:38px;height:34px;border:0;border-radius:8px;background:transparent">
    <input type="range" id="bsz" min="1" max="14" value="4" style="width:90px;accent-color:#fff">
  </div>
  <div class="bar2">
    <button id="btnUp">▣ ใส่รูป</button>
    <button id="btnClr">✕ ล้างเฟรม</button>
    <input type="file" id="upl" accept="image/*" style="display:none">
  </div>
  <div class="bar2"><div id="fbar"></div>
    <button id="btnAdd">✚ เฟรม</button><button id="btnDel">✖ เฟรม</button><button id="btnPlay">▶ เล่น</button>
    <canvas id="pv" width="96" height="96" style="width:64px;height:64px;border-radius:50%;background:#050505;border:2px solid #333"></canvas>
  </div>
  <div class="hint">ตัวละครในเกมใช้นิ่ง (เฟรมแรก)</div>

  <div id="adminEditorFields" class="settings-card admin" style="display:none">
    <h3>👑 ตั้งค่าแอดมิน (ตัวละครนี้)</h3>
    <div class="row"><span>❤ HP ตัวละคร</span><input type="number" id="admCharHp" min="1" max="99999" value="100" style="flex:1;padding:8px;font-size:13px;margin:0"></div>
    <div class="row"><span>⚡ CD × (ยิ่งน้อย=ยิ่งเร็ว)</span><input type="number" id="admCharCd" min="0.01" max="10" step="0.01" value="1" style="flex:1;padding:8px;font-size:13px;margin:0"></div>
  </div>

  <h3>เลือกสกิล (สูงสุด <span id="skMax">2</span>)</h3>
  <div class="bar2" id="skpick"></div>
  <button class="big" id="btnAllSkillsEdit" style="display:none;background:#2a1a00;border-color:#ffd166;color:#ffd166">✦ ใส่ทุกสกิล (แอดมิน)</button>
  <h3>ปรับแต่งเอฟเฟคสกิล</h3>
  <div id="skset"></div>
  <h3>อาวุธ</h3>
  <div class="bar2" id="weaponPick"></div>
  <div id="weaponInfo" class="bal-info"></div>
  <button class="big" id="btnMinionEdit">🐾 แก้ไขตัวละครลูกน้อง</button>
  <div id="minionHint">🐾 กำลังแก้ไขลูกน้อง — กดปุ่มอีกครั้งเพื่อกลับ</div>
  <button class="big primary" id="btnSave">✓ บันทึกตัวละคร</button>
  <button class="big gray" id="btnBack">← กลับ</button>
</div>

<div id="skeffect" class="screen">
  <h1 id="skef-title" style="font-size:17px">แก้ไขเอฟเฟคสกิล</h1>
  <div class="skef-info" id="skef-sub"></div>
  <div class="skef-wrap">
    <canvas id="sfg" width="64" height="64" class="skef-layer skef-ghost"></canvas>
    <canvas id="sfc" width="64" height="64" class="skef-layer"></canvas>
  </div>
  <div class="bar2" id="eftools">
    <button data-et="brush" class="on">✎ แปรง</button>
    <button data-et="eraser">⌫ ยางลบ</button>
    <input type="color" id="efcol" value="#ff6a00" style="width:38px;height:34px;border:0;border-radius:8px;background:transparent">
    <input type="range" id="efbsz" min="1" max="12" value="3" style="width:80px;accent-color:#fff">
  </div>
  <div class="bar2">
    <button id="efUndo" class="warn">↶ ย้อนกลับ</button>
    <button id="efClr">✕ ล้างเฟรม</button>
    <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#aaa;margin-left:6px">
      <input type="checkbox" id="efOnion" checked style="accent-color:#fff"> เงาเฟรมก่อนหน้า
    </label>
  </div>
  <div class="layer-bar">
    <span class="lbl">เลเยอร์:</span>
    <div id="eflayerbtn" style="display:flex;gap:3px;flex-wrap:wrap"></div>
    <button id="efLayerAdd">+ เพิ่ม</button>
    <button id="efLayerDel" class="red">− ลบ</button>
  </div>
  <div class="bar2"><div id="efbar"></div>
    <button id="efAdd">✚ เฟรม</button><button id="efDel">✖ เฟรม</button>
    <canvas id="efpv" width="64" height="64" style="width:64px;height:64px;border-radius:10px;background:#050505;border:2px solid #333"></canvas>
  </div>
  <div class="hint">แต่ละเฟรมมีหลายเลเยอร์ • เฟรมก่อนหน้าโชว์จางๆ • กด ↶ ย้อนกลับได้</div>
  <button class="big primary" id="efSave">✓ บันทึกเอฟเฟค</button>
  <button class="big gray" id="efBack">← กลับ</button>
</div>

<div id="battle" class="screen">
  <div class="hud" id="hud"></div>
  <div id="endlessHUD">
    <div class="wv" id="endlessWave">คลื่นที่ 1</div>
    <div class="info">
      <span class="enemies">ศัตรู: <b id="endlessEnemies">0</b></span>
      <span class="pts">คะแนน: <b id="endlessPts">0</b></span>
    </div>
  </div>
  <canvas id="bc" width="360" height="520"></canvas>
  <div id="suckBox">
    <h4>⚡ บอสกำลังดูด! กดปุ่มให้ครบ!</h4>
    <button id="suckBtn">กด!</button>
    <div id="suckInfo">
      <div style="color:#fff" id="suckProgress">0 / 20</div>
      <div style="color:#888" id="suckTime">25.0 วิ</div>
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
<div id="wait"><div>◌ กำลังรอผู้เล่น...</div><div id="waitSub" style="font-size:14px;opacity:.7;margin-top:8px"></div><br><button id="btnCancel">✕ ยกเลิก</button></div>
<div id="toast"></div>

<script>
(function(){
var $=function(i){return document.getElementById(i)};
var S=96,W=360,H=520,R=26,BASE=170,MAXF=80000;
var W_BOSS=720, H_BOSS=720;
var W_ENDLESS=900, H_ENDLESS=900;
var SKEFF_SIZE=64;
var BURN_DUR=3, FLOAT_DUR=2, PULL_DUR=2, FIST_BOUNCE_N=5, FIST_BOUNCE_DMG=3;
var STUN_DUR=5, BEAM_DUR=3;
var STUN_DMG=0.5, STUN_TICK=0.5;
var BLOOD_REGEN_DUR=5, BLOOD_REGEN_PER_SEC=1.5;
var POISON_TICK=0.5;
var LIGHT_STUN=0, LIGHT_DOT=0.4, LIGHT_TICK=0.5;
var WIN_BOT=1, WIN_ONLINE=10, WIN_BOSS=50, WIN_BOSS_MIXED=100;
var BOSS_SUCK_INTERVAL = 20;
var BOSS_SUCK_DUR = 25;
var BOSS_SUCK_PRESSES = 20;
var BOSS_BITE_DMG = 15;
var BOSS_SUCK_PULL = 280;
var BOSS_DASH_INTERVAL = 15;
var BOSS_DASH_DMG = 10;
var BOSS_RAGE_THRESHOLD = 0.2;
var BOSS_RAGE_CAST_INTERVAL = 0.5;
var BOSS_KATANA_CD = 4;
var BOSS_KATANA_DMG = 3;
var BOSS_MINION_HP = 50;
var BOSS_MINION_BOLT_DMG = 0.25;
var BOSS_MINION_BOLT_RANGE = 380;
var BOSS_MINION_BEAM_DUR = 10;
var BOSS_MINION_BEAM_CD = 5;
var BOSS_MINION_BOLT_TICK = 0.5;
var MINION_COUNT = 5;
var MINION_HP = 3;
var MINION_DMG = 1;
var MINION_ATK_CD = 1.2;
var MINION_DASH_SPD = 520;
var HOLY_LIGHT_STUN = 3;
var GOD_PUNCH_DMG = 20;
var GOD_LIFE = 1.8;
var GOD_PUNCH_T = 0.6;
var GOD_PUNCH_RADIUS = 110;
var PET_STONE_MINION_HP = 5;
var PET_STONE_MINION_COUNT = 1;
var LIGHTNING_STONE_STUN = 2.2;
var LIGHTNING_FIELD_DUR = 5;
var LIGHTNING_FIELD_TICK = 0.5;
var LIGHTNING_FIELD_TICK_DMG = 0.25;
var LIGHTNING_FIELD_RADIUS = 200;
var LIGHTNING_STONE_CD = 20;
var LIGHTNING_STONE_DROPS = 5;
var DARK_HOLE_DUR = 3;
var DARK_HOLE_TICK = 1.0;
var DARK_HOLE_DMG = 5;
var DARK_HOLE_RADIUS = 120;
var DARK_HOLE_PULL = 500;
var DARK_HOLE_EXPLODE_DMG = 10;
var WATER_DMG = 5;
var WATER_PUSH = 700;
var TIME_STOP_DUR = 5;
var TIME_STOP_CD = 25;
var DARK_UNLOCK = 2000;
var SHOP_SLOT3_COST = 200;
var SHOP_KATANA_COST = 500;
var SHOP_LUCKY_COST = 1500;
var SHOP_TOU_COST = 0;
var KATANA_DMG = 0.4;
var KATANA_CD = 0.2;
var KATANA_RANGE = R*5;
var LUCKY_CARD_CD = 2.5;
var LUCKY_CARD_DMG = 3;
var ENDLESS_MAX_BOTS = 28;
var ENDLESS_INTRO_TIME = 2.2;
var ENDLESS_CLEAR_TIME = 2.8;
var GOD_MINION_HP = 15;
var GOD_MINION_DMG = 5;
var GOD_MINION_CD = 5;
var guestSuckPress = 0;
var MINION_ID = 0;

(function bgFx(){
  var cv=$('bgfx'),cx=cv.getContext('2d'),P=[];
  function rs(){cv.width=innerWidth;cv.height=innerHeight}
  addEventListener('resize',rs);rs();
  for(var i=0;i<70;i++)P.push({
    x:Math.random()*cv.width,y:Math.random()*cv.height,
    r:Math.random()*1.8+0.4,
    vx:(Math.random()-0.5)*0.25,vy:(Math.random()-0.5)*0.25,
    a:Math.random()*0.45+0.15,
    ph:Math.random()*6.28
  });
  function loop(){
    cx.clearRect(0,0,cv.width,cv.height);
    for(var i=0;i<P.length;i++){
      var p=P[i];
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=cv.width;if(p.x>cv.width)p.x=0;
      if(p.y<0)p.y=cv.height;if(p.y>cv.height)p.y=0;
      var tw=p.a*(0.6+0.4*Math.sin(performance.now()/900+p.ph));
      cx.beginPath();cx.arc(p.x,p.y,p.r,0,7);
      cx.fillStyle='rgba(255,255,255,'+tw+')';
      cx.shadowColor='#fff';cx.shadowBlur=6;
      cx.fill();cx.shadowBlur=0;
    }
    requestAnimationFrame(loop);
  }
  loop();
})();

var BOSS_TYPES = {
 fire:      {n:'เพลิง',    icon:'🔥', color:'#ff6a00', hp:250, r:52, skills:['fire','fist']},
 lightning: {n:'สายฟ้า',   icon:'⚡', color:'#c8a2ff', hp:250, r:52, skills:['lightning','wind']},
 stone:     {n:'หิน',      icon:'🪨', color:'#a89070', hp:250, r:52, skills:['stone','fist']},
 summon:    {n:'ลูกน้อง',  icon:'👥', color:'#ff2244', hp:250, r:52, skills:['bossSummon','lightning']},
 ice:       {n:'น้ำแข็ง',  icon:'❄',  color:'#7fdcff', hp:250, r:52, skills:['ice','wind']},
 wind:      {n:'วายุ',     icon:'🌪', color:'#9ff2c0', hp:250, r:52, skills:['wind','ice']},
 fist:      {n:'หมัด',     icon:'✊', color:'#ffd166', hp:250, r:52, skills:['fist','fire']},
 light:     {n:'แสง',      icon:'☀',  color:'#fff5c0', hp:250, r:52, skills:['light','stone']},
 blood:     {n:'เลือด',    icon:'🩸', color:'#c81e3c', hp:250, r:52, skills:['blood','stone']},
 dark:      {n:'มืด',      icon:'🌑', color:'#8a4aff', hp:250, r:52, skills:['dark','stone']},
 water:     {n:'น้ำ',      icon:'💧', color:'#4fc3f7', hp:250, r:52, skills:['water','ice']},
 mixed:     {n:'รวมธาตุ',  icon:'☠',  color:'#ff2244', hp:500, r:58, skills:null}
};
var ELEMENT_BOSS_KEYS = ['fire','lightning','stone','summon','ice','wind','fist','light','blood','dark','water'];

var WEAPONS={
  none:{n:'ไม่มี', unlock:0, icon:'⊘', color:'#666'},
  sword:{n:'ดาบ', unlock:0, icon:'†', color:'#e0e0e0', dmg:2, cd:0.9, range:R*3.6},
  gun:{n:'ปืน', unlock:100, icon:'▬', color:'#c0c0c0', dmg:0.7, cd:0.5, speed:620},
  poisonGun:{n:'ปืนพิษ', unlock:150, icon:'☠', color:'#88ff44',
             dmg:1, cd:0.8, speed:520, poisonDur:5, poisonDmg:0.2},
  katana:{n:'คาตานะ', unlock:SHOP_KATANA_COST, icon:'⚔', color:'#ff2244',
          dmg:KATANA_DMG, cd:KATANA_CD, range:KATANA_RANGE, shop:true},
  lucky:{n:'การ์ดโชค', unlock:SHOP_LUCKY_COST, icon:'🎴', color:'#ffd166', shop:true, lucky:true}
};

var ELEM_SVG={
 fire:'<path d="M12 2 Q8 6 7 10 Q6 15 9 18.5 Q10.5 20 12 20 Q13.5 20 15 18.5 Q18 15 17 10 Q16 6 12 2 Z" fill="COLOR"/><path d="M12 9 Q10.5 12 10.5 15 Q10.5 18 12 18 Q13.5 18 13.5 15 Q13.5 12 12 9 Z" fill="#fff" opacity=".55"/>',
 ice:'<g stroke="COLOR" stroke-width="2.2" stroke-linecap="round" fill="none"><line x1="12" y1="3" x2="12" y2="21"/><line x1="4.2" y1="7.5" x2="19.8" y2="16.5"/><line x1="4.2" y1="16.5" x2="19.8" y2="7.5"/><path d="M12 7 L9.5 5 M12 7 L14.5 5"/><path d="M12 17 L9.5 19 M12 17 L14.5 19"/><path d="M7.2 9.5 L5 10 M7.2 9.5 L6.5 7"/><path d="M16.8 14.5 L19 14 M16.8 14.5 L17.5 17"/><path d="M7.2 14.5 L5 14 M7.2 14.5 L6.5 17"/><path d="M16.8 9.5 L19 10 M16.8 9.5 L17.5 7"/></g>',
 wind:'<path d="M3 8 Q10 4 17 7 Q21 9 19 12 Q17 15 13.5 13.5 Q11.5 12 13 10.5" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round"/><path d="M4 15 Q10 13 15 14.5" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round"/><path d="M4 19 Q9 18 13 18.5" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round"/>',
 fist:'<path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z" fill="COLOR"/>',
 lightning:'<polygon points="13,2 5,13 11,13 9,22 19,11 13,11 15,2" fill="COLOR"/>',
 blood:'<path d="M12 3 Q8 8 7 13 Q6 17 9 19.5 Q10.5 20.5 12 20.5 Q13.5 20.5 15 19.5 Q18 17 17 13 Q16 8 12 3 Z" fill="COLOR"/><ellipse cx="10.5" cy="14" rx="1.8" ry="2.4" fill="#fff" opacity=".4"/>',
 poison:'<path d="M12 3 Q9 7 8 11 Q7 15 9.5 18 Q11 19.5 12 19.5 Q13 19.5 14.5 18 Q17 15 16 11 Q15 7 12 3 Z" fill="COLOR"/><circle cx="10" cy="12" r="1.1" fill="#fff" opacity=".55"/><circle cx="13.5" cy="14" r="1.1" fill="#fff" opacity=".55"/><circle cx="10.5" cy="16" r="1.1" fill="#fff" opacity=".55"/>',
 stone:'<path d="M12 3 L19 7 L20 15 L14 21 L6 19 L4 11 L7 5 Z" fill="COLOR"/><path d="M7 5 L12 12 L20 15" stroke="#000" stroke-width="1" opacity=".28" fill="none"/><path d="M12 12 L14 21" stroke="#000" stroke-width="1" opacity=".28"/><path d="M12 3 L12 12 L6 19" stroke="#fff" stroke-width="1" opacity=".18" fill="none"/>',
 light:'<circle cx="12" cy="12" r="4.5" fill="COLOR"/><circle cx="12" cy="12" r="2.2" fill="#fff" opacity=".8"/><g stroke="COLOR" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1.5" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22.5"/><line x1="1.5" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22.5" y2="12"/><line x1="4.8" y1="4.8" x2="6.9" y2="6.9"/><line x1="17.1" y1="17.1" x2="19.2" y2="19.2"/><line x1="4.8" y1="19.2" x2="6.9" y2="17.1"/><line x1="17.1" y1="6.9" x2="19.2" y2="4.8"/></g>',
 pet:'<ellipse cx="12" cy="15" rx="5" ry="4" fill="COLOR"/><circle cx="12" cy="8.5" r="3.4" fill="COLOR"/><circle cx="7.5" cy="5.5" r="1.7" fill="COLOR"/><circle cx="16.5" cy="5.5" r="1.7" fill="COLOR"/><circle cx="10.7" cy="8.2" r=".9" fill="#fff"/><circle cx="13.3" cy="8.2" r=".9" fill="#fff"/><circle cx="12" cy="10" r=".7" fill="#000"/><ellipse cx="12" cy="17.5" rx="2.5" ry="1.2" fill="#fff" opacity=".4"/>',
 bossSummon:'<circle cx="12" cy="12" r="10" fill="none" stroke="COLOR" stroke-width="2"/><polygon points="12,5 8,13 11,13 10,19 16,11 13,11 14,5" fill="COLOR"/>',
 dark:'<circle cx="12" cy="12" r="9.5" fill="COLOR" opacity=".18"/><circle cx="12" cy="12" r="7" fill="COLOR" opacity=".35"/><circle cx="12" cy="12" r="5" fill="COLOR" opacity=".65"/><circle cx="12" cy="12" r="3.2" fill="#0a0014"/><circle cx="12" cy="12" r="1.4" fill="#000"/><g stroke="COLOR" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".85"><path d="M12 1.5 Q15.5 5 12 8"/><path d="M12 16 Q15.5 19 12 22.5"/><path d="M1.5 12 Q5 8.5 8 12"/><path d="M16 12 Q19 15.5 22.5 12"/></g>',
 water:'<path d="M12 2.5 Q7 9 7 14 Q7 18 9.5 20 Q11 21 12 21 Q13 21 14.5 20 Q17 18 17 14 Q17 9 12 2.5 Z" fill="COLOR"/><path d="M9.5 13.5 Q9.5 16 10.8 17.2" stroke="#fff" stroke-width="1.4" fill="none" opacity=".7" stroke-linecap="round"/><path d="M2 18 Q4.5 16.5 7 18 T12 18 T17 18 T22 18" stroke="COLOR" stroke-width="1.6" fill="none" opacity=".55" stroke-linecap="round"/>',
 timeStop:'<circle cx="12" cy="12" r="9" fill="none" stroke="COLOR" stroke-width="2.4"/><path d="M12 6 L12 12 L16 14" stroke="COLOR" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="12" cy="12" r="2" fill="COLOR"/>',
 god:'<circle cx="12" cy="12" r="3" fill="COLOR"/><circle cx="12" cy="12" r="1.5" fill="#fff"/><g stroke="COLOR" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/><line x1="4" y1="4" x2="6.2" y2="6.2"/><line x1="17.8" y1="17.8" x2="20" y2="20"/><line x1="4" y1="20" x2="6.2" y2="17.8"/><line x1="17.8" y1="6.2" x2="20" y2="4"/></g>'
};
function elemSvg(id,size,color){
 size=size||18;color=color||(SK[id]&&SK[id].color)||'#fff';
 var body=(ELEM_SVG[id]||'').split('COLOR').join(color);
 return '<svg viewBox="0 0 24 24" width="'+size+'" height="'+size+'" style="vertical-align:middle;filter:drop-shadow(0 0 4px '+color+'88);flex-shrink:0">'+body+'</svg>';
}

var SK={
 fire:{n:'เพลิง',   dmg:2, cd:6,  power:0.5, color:'#ff6a00', status:'burn',
       slots:{cast:'เปลวไฟ (สั้น-กว้าง)', status:'ติดไฟ 3 วิ'}},
 ice: {n:'น้ำแข็ง', dmg:2, cd:6.5,power:0.5, color:'#7fdcff', status:'float',
       slots:{cast:'ผลึกน้ำแข็ง', status:'ลอยน้ำแข็ง (ช้า 2 วิ)'}},
 wind:{n:'วายุ',    dmg:1.5,cd:5.5,power:0.5,color:'#9ff2c0', status:'pull',
       slots:{cast:'กระแสลม', status:'ตอนโดนดึง 2 วิ'}},
 fist:{n:'หมัด',   dmg:4, cd:7,  power:0.5, color:'#ffd166', status:'dash',
       slots:{cast:'ตอนพุ่ง', status:'ชนขอบ 5 ครั้ง'}},
 lightning:{n:'สายฟ้า', dmg:3, cd:8, power:0.5, color:'#c8a2ff', status:'stun',
       slots:{cast:'ตอนพุ่ง', status:'ช็อต + tick 0.5'}},
 blood:{n:'เลือด',  dmg:2, cd:6,  power:0.5, color:'#c81e3c', status:'bite',
       slots:{cast:'ตอนกัด', status:'เลือดไหล'}},
 stone:{n:'หิน',    dmg:5.5, cd:9, power:0.5, color:'#a89070', status:'rock',
       slots:{cast:'ตอนหินร่วง', status:'โดนทับ'}},
 light:{n:'แสง',    dmg:2, cd:9, power:0.5, color:'#fff5c0', status:'dazzle',
       slots:{cast:'ตอนสตัน', status:'พิษแสง'}},
 dark:{n:'มืด',    dmg:DARK_HOLE_DMG, cd:9, power:0.5, color:'#8a4aff', status:'blackhole',
       slots:{cast:'หลุมดำ', status:'ถูกดูด'}},
 water:{n:'น้ำ',   dmg:WATER_DMG, cd:7, power:0.5, color:'#4fc3f7', status:'push',
       slots:{cast:'คลื่นน้ำ', status:'ถูกผลัก'}},
 pet:{n:'สัตว์เลี้ยง', dmg:1, cd:10, power:0.5, color:'#ff88cc', status:'summon',
      slots:{cast:'ตอนเรียก (5 ตัว)', status:'ลูกน้อง (3 HP, ต่อย)'}},
 god:{n:'เทพ',     dmg:GOD_MINION_DMG, cd:GOD_MINION_CD, power:0.5, color:'#ffeaa7', status:'godPet',
      slots:{cast:'ตอนเรียกเทพ', status:'เทพต่อย 5 ดาเมจ'}},
 bossSummon:{n:'สมุนบอส', dmg:1, cd:10, power:0.5, color:'#ff2244', status:'summon',
      slots:{cast:'ตอนเรียกสมุน', status:'สมุนบอส 50 HP, สายฟ้า'}}
};
var LIM={dmg:{min:1,max:6,step:0.5},cd:{min:5,max:10,step:0.5},power:{min:0.1,max:1,step:0.1}};

function getCombo(skills){
 if(!skills || skills.length < 2) return null;
 for(var i=0;i<skills.length;i++){
  for(var j=i+1;j<skills.length;j++){
   var a=skills[i].id, b=skills[j].id;
   var s1=a<b?a:b, s2=a<b?b:a;
   if(s1==='fire' && s2==='stone') return 'meteor';
   if(s1==='fire' && s2==='fist')  return 'explosiveDash';
   if(s1==='pet'  && s2==='stone') return 'petStone';
   if(s1==='light'&& s2==='stone') return 'lightStone';
   if(s1==='lightning' && s2==='stone') return 'lightningStone';
   if(s1==='dark' && s2==='ice') return 'timeStop';
   if(s1==='light' && s2==='pet') return 'lightPet';
  }
 }
 return null;
}
var COMBO_INFO = {
 meteor:        {n:'☄ เพลิง+หิน = อุกกาบาต',   d:'เรียกอุกกาบาต 3 ลูกลงเป้าหมาย เมื่อตกถึงพื้นจะเกิดไฟลุก 5 วินาที'},
 explosiveDash: {n:'🔥 เพลิง+หมัด = ระเบิด',    d:'พุ่งชนเป้าหมาย ระเบิด 5 ครั้ง ครั้งละ 2 ดาเมจ'},
 petStone:      {n:'🪨🐾 สัตว์เลี้ยง+หิน = หินเรียกสมุน', d:'หินร่วง 1 ก้อน โดน 2 ดาเมจ • ตกถึงพื้นกลายเป็นลูกน้อง 1 ตัว (HP '+PET_STONE_MINION_HP+')'},
 lightStone:    {n:'✦🪨 แสง+หิน = ลำแสงเทพ',   d:'แสงสว่างจากฟ้าตกลงมา สตันศัตรู '+HOLY_LIGHT_STUN+' วิ • เทพลงมาต่อย '+GOD_PUNCH_DMG+' ดาเมจ'},
 lightningStone:{n:'⚡🪨 สายฟ้า+หิน = หินสายฟ้า', d:'หินสายฟ้าตก '+LIGHTNING_STONE_DROPS+' จุดแบบสุ่ม • สตัน '+LIGHTNING_STONE_STUN+' วิ • คลื่นไฟฟ้าจุดแรกรอบจุดตก '+LIGHTNING_FIELD_DUR+' วิ • คูลดาวน์ '+LIGHTNING_STONE_CD+' วิ'},
 timeStop:      {n:'🌑❄ มืด+น้ำแข็ง = หยุดเวลา', d:'หยุดเวลาศัตรู '+TIME_STOP_DUR+' วิ • กระสุนที่ยิงจะค้างกลางอากาศ • เวลาหมดกระสุนพุ่งเข้าหาศัตรูพร้อมกัน • คูลดาวน์ '+TIME_STOP_CD+' วิ'},
 lightPet:      {n:'✦🐾 แสง+สัตว์เลี้ยง = เทพ', d:'เรียกเทพ 1 ตัว • HP '+GOD_MINION_HP+' • ต่อย '+GOD_MINION_DMG+' ดาเมจ • เมื่อเทพตายรอ '+GOD_MINION_CD+' วิ'}
};

function applyBalance(s,changed){
 if(changed==='dmg'){if(s.dmg>1.5&&s.cd<6)s.cd=6;}
 else if(changed==='cd'){if(s.cd<6&&s.dmg>1.5)s.dmg=1.5;}
 else{if(s.dmg>1.5&&s.cd<6)s.cd=6;}
 return s;
}
function roundHalf(v){return Math.round(v*2)/2;}
function roundTenth(v){return Math.round(v*10)/10;}
function toast(t){var e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(function(){e.style.display='none'},2200);}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]});}
function clamp(v,a,b){v=Number(v);if(!isFinite(v))v=a;return Math.max(a,Math.min(b,v));}
function newCanvas(n){n=n||S;var c=document.createElement('canvas');c.width=c.height=n;return c;}
function blankFrame(){return newCanvas().toDataURL('image/png');}
function defSkill(id){var d=SK[id];return {id:id,dmg:d.dmg,cd:d.cd,power:d.power,color:d.color,slots:{cast:[],status:[]}};}
function show(id){['menu','rank','editor','skeffect','battle','shop','settings','play','chars','admin'].forEach(function(s){$(s).classList.toggle('on',s===id);});}
function loadImg(src){return new Promise(function(r){
 if(!src){r(null);return;}
 var im=new Image();im.onload=function(){r(im);};im.onerror=function(){r(null);};im.src=src;});}

/* ===== Account / Profile ===== */
var ACC = loadAccount();
function loadAccount(){
 try{var a=JSON.parse(localStorage.getItem('circ_account')||'null');
   return (a && typeof a==='object' && a.name)?a:null;}catch(e){return null;}
}
function saveAccountLocal(a){
 try{if(a)localStorage.setItem('circ_account',JSON.stringify(a));
     else localStorage.removeItem('circ_account');}catch(e){}
}
function renderProfileCard(){
 var el=$('profileAvatar'),nm=$('profileName'),wn=$('profileWins');
 if(ACC && ACC.avatar){
  el.innerHTML='<img src="'+ACC.avatar+'" alt="">';
 } else {
  el.textContent = ACC && ACC.name ? ACC.name.charAt(0).toUpperCase() : '?';
 }
 nm.textContent = ACC && ACC.name ? ACC.name : 'ยังไม่ได้ตั้งโปรไฟล์';
 var c=CH[ACT];
 var wins = ACC && typeof ACC.wins==='number' ? ACC.wins : (c?c.wins:0);
 wn.textContent = '★ ' + wins;
}
function submitAccount(name, keypass, avatar){
 return fetch('/account',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({name:name,keypass:keypass,avatar:avatar||''})})
  .then(function(r){return r.json();});
}

function loadWinsMap(){
 try{var m=JSON.parse(localStorage.getItem('circ_wins_map')||'{}');
  if(!m||typeof m!=='object'||Array.isArray(m))return {};
  return m;
 }catch(e){return {};}
}
function saveWinsMap(m){try{localStorage.setItem('circ_wins_map',JSON.stringify(m));}catch(e){}}
function addWinsForName(name,amount){
 name=String(name||'').trim().slice(0,12);
 if(!name)return;
 amount=Math.max(0,Math.floor(Number(amount)||0));
 if(!amount)return;
 var m=loadWinsMap();
 m[name]=(Math.max(0,Math.floor(Number(m[name])||0)))+amount;
 saveWinsMap(m);
}
function setWinsForName(name,total){
 name=String(name||'').trim().slice(0,12);
 if(!name)return;
 total=Math.max(0,Math.floor(Number(total)||0));
 var m=loadWinsMap();
 m[name]=total;
 saveWinsMap(m);
}
function getWinsForName(name){
 name=String(name||'').trim().slice(0,12);
 if(!name)return 0;
 var m=loadWinsMap();
 return Math.max(0,Math.floor(Number(m[name])||0));
}
function submitWin(name, total){
 try{fetch('/win',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({name:name, total:total})}).catch(function(){});}catch(e){}
}
function syncWinsToServer(){
 if(ACC && ACC.name){
  var total = getWinsForName(ACC.name);
  if(total>0) submitWin(ACC.name, total);
 }
 var a=getChars();
 a.forEach(function(c){ if(c && c.wins>0) submitWin(c.name, c.wins); });
}

/* ===== ร้านค้า ===== */
function getShop(){
 try{
  var s=JSON.parse(localStorage.getItem('circ_shop')||'{}');
  if(!s||typeof s!=='object'||Array.isArray(s))s={};
  return s;
 }catch(e){return {};}
}
function saveShop(s){try{localStorage.setItem('circ_shop',JSON.stringify(s));}catch(e){}}
function hasKatana(){return !!getShop().katana;}
function hasSlot3(){return !!getShop().slot3;}
function hasLucky(){return !!getShop().lucky;}
function isAdmin(){return !!getShop().tou;}

function getAdminCfg(){
 try{
  var c=JSON.parse(localStorage.getItem('circ_admin')||'{}');
  if(!c || typeof c!=='object') c={};
  if(typeof c.cdMult!=='number') c.cdMult=1;
  return c;
 }catch(e){return {cdMult:1};}
}
function saveAdminCfg(c){try{localStorage.setItem('circ_admin',JSON.stringify(c));}catch(e){}}

var SHOP_ITEMS = [
 {id:'tou', n:'TOUx1 (สิทธิ์แอดมิน)', icon:'👑', cost:SHOP_TOU_COST, color:'#ffd166',
  desc:'ปลดล็อก "เครื่องแอดมิน" • เสก/ลบชัยชนะไม่จำกัด • ปรับ HP ตัวเอง • ปรับความเร็วปล่อยสกิล • ใส่ทุกสกิลได้ไม่จำกัด'},
 {id:'slot3', n:'เพิ่มช่องสกิล', icon:'✦', cost:SHOP_SLOT3_COST, color:'#fff',
  desc:'ใส่สกิลได้สูงสุด 3 อัน (จากเดิม 2 อัน) — ใช้ได้ทุกตัวละคร'},
 {id:'katana', n:'ดาบคาตานะ', icon:'⚔', cost:SHOP_KATANA_COST, color:'#ff2244',
  desc:'ฟันรัว 0.2 วินาที/ครั้ง • ดาเมจ '+KATANA_DMG+' ต่อครั้ง • ระยะใกล้ • เพิ่มในตัวเลือกอาวุธ'},
 {id:'lucky', n:'การ์ดโชค', icon:'🎴', cost:SHOP_LUCKY_COST, color:'#ffd166',
  desc:'อาวุธพิเศษ • ในการต่อสู้จะมีปุ่มสุ่มการ์ด • สุ่มได้สกิลทุกธาตุ หรือ HP+50% • ยืนยันแล้วขว้างการ์ดใส่ศัตรู'}
];

function renderShop(){
 var box=$('shopList');
 var shop=getShop();
 var me=CH[ACT];
 var wins = ACC && typeof ACC.wins==='number' ? ACC.wins : (me?me.wins:0);
 var displayName = ACC && ACC.name ? ACC.name : (me?me.name:'—');
 $('shopWins').innerHTML='★ ชัยชนะของ <b>'+esc(displayName)+'</b> : <b>'+wins+'</b>';
 var h='';
 SHOP_ITEMS.forEach(function(item){
  var owned=!!shop[item.id];
  var can=wins>=item.cost;
  var cls='shop-item'+(owned?' owned':'')+(item.id==='tou'?' admin-item':'');
  h+='<div class="'+cls+'">'+
     '<div class="head">'+
      '<div class="icn" style="color:'+item.color+'">'+item.icon+'</div>'+
      '<div class="meta">'+
       '<div class="nm">'+esc(item.n)+'</div>'+
       '<div class="dc">'+esc(item.desc)+'</div>'+
      '</div>'+
      '<div class="price">'+(owned?'✓ ครอบครอง':'★ '+item.cost)+'</div>'+
     '</div>'+
     '<button class="big '+(owned?'gray':(can?'primary':'gray'))+'" data-buy="'+item.id+'" '+(owned||!can?'disabled':'')+'>'+
      (owned?'ซื้อแล้ว':(can?'ซื้อ':'ชัยชนะไม่พอ ('+wins+'/'+item.cost+')'))+
     '</button>'+
     '</div>';
 });
 box.innerHTML=h;
}
$('shopList').addEventListener('click',function(e){
 var b=e.target.closest('button[data-buy]');
 if(!b||b.disabled)return;
 var id=b.dataset.buy;
 var item=SHOP_ITEMS.find(function(x){return x.id===id;});
 if(!item)return;
 var shop=getShop();
 if(shop[id]){toast('ซื้อแล้ว');return;}
 var a=getChars();
 var me=a[ACT];
 if(!me){toast('สร้างตัวละครก่อน');return;}
 var wins = ACC && typeof ACC.wins==='number' ? ACC.wins : me.wins;
 if(wins<item.cost){toast('ชัยชนะไม่พอ ('+wins+'/'+item.cost+')');return;}
 shop[id]=true;
 saveShop(shop);
 toast('✓ ซื้อ '+item.n+' สำเร็จ!');
 if(id==='tou'){ toast('👑 ปลดล็อกเครื่องแอดมินแล้ว!'); refreshAdminTile(); }
 renderShop();
 renderMenu();
 drawStaticPreviews();
});
$('tileShop').onclick=function(){
 if(!CH[ACT]){toast('สร้างตัวละครก่อนนะ ✎');return;}
 show('shop');
 renderShop();
};
$('shopBack').onclick=function(){show('menu');};

function sanitize(c){
 if(!c||typeof c!=='object')return null;
 var rawWins=Number(c.wins);
 if(!isFinite(rawWins)||rawWins<0)rawWins=0;
 var o={name:String(c.name||'ไร้ชื่อ').slice(0,12),frames:[],skills:[],wins:Math.floor(rawWins),
        weapon:(c.weapon&&WEAPONS[c.weapon])?c.weapon:'none'};
 if(c._isBoss){
  o._isBoss=true;
  o._hp=Math.max(100,Math.min(10000, Math.floor(Number(c._hp)||500)));
  o._r=Math.max(20,Math.min(120, Math.floor(Number(c._r)||55)));
  o._bossLevel=Math.max(1,Math.min(5, Math.floor(Number(c._bossLevel)||1)));
  o._bossType = (c._bossType && BOSS_TYPES[c._bossType]) ? c._bossType : 'mixed';
 }
 if(c._isEndlessBot){
  o._isEndlessBot = true;
  o._botVariant = Math.max(0, Math.min(9, Math.floor(Number(c._botVariant)||0)));
 }
 if(c._adminHp) o._adminHp = Math.max(1, Math.min(99999, Math.floor(Number(c._adminHp))));
 if(c._adminCdMult) o._adminCdMult = Math.max(0.01, Math.min(10, Number(c._adminCdMult)));
 if(c._adminAllSkills) o._adminAllSkills = true;
 if(c.minion && typeof c.minion==='object'){
  o.minion = {frames:[]};
  (Array.isArray(c.minion.frames)?c.minion.frames:[]).slice(0,8).forEach(function(f){
   if(typeof f==='string' && f.indexOf('data:image/png;base64,')===0 && f.length<MAXF)
    o.minion.frames.push(f);
  });
  if(!o.minion.frames.length) o.minion.frames.push(blankFrame());
 }
 (Array.isArray(c.frames)?c.frames:[]).slice(0,8).forEach(function(f){
  if(typeof f==='string'&&f.indexOf('data:image/png;base64,')===0&&f.length<MAXF)o.frames.push(f);});
 if(!o.frames.length)o.frames.push(blankFrame());
 var adminUnlock = !!c._adminAllSkills;
 var maxSk = c._isBoss ? 4 : (adminUnlock ? 999 : (hasSlot3() ? 3 : 2));
 var seen={};
 (Array.isArray(c.skills)?c.skills:[]).forEach(function(s){
  if(!s||!SK[s.id]||seen[s.id]||o.skills.length>=maxSk)return;
  if(s.id==='dark' && !c._isBoss && !adminUnlock && o.wins < DARK_UNLOCK) return;
  if(s.id==='god') return;
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
  o.skills.push({id:s.id,dmg:tmp.dmg,cd:tmp.cd,power:pw,
   color:/^#[0-9a-f]{6}$/i.test(s.color)?s.color:SK[s.id].color,slots:slots});
 });
 if(!o.skills.length)o.skills.push(defSkill('fire'));
 if(o.weapon==='katana' && !hasKatana()) o.weapon='none';
 if(o.weapon==='lucky' && !hasLucky()) o.weapon='none';
 return o;
}
function strip(c){
 var o={name:c.name,frames:c.frames,skills:c.skills,wins:c.wins,weapon:c.weapon};
 if(c._isBoss){o._isBoss=true;o._hp=c._hp;o._r=c._r;o._bossLevel=c._bossLevel;o._bossType=c._bossType;}
 if(c._isEndlessBot){o._isEndlessBot=true;o._botVariant=c._botVariant;}
 if(c.minion) o.minion = c.minion;
 if(c._adminHp) o._adminHp = c._adminHp;
 if(c._adminCdMult) o._adminCdMult = c._adminCdMult;
 if(c._adminAllSkills) o._adminAllSkills = true;
 return o;
}
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
  if(c.minion && c.minion.frames && c.minion.frames.length){
   return Promise.all(c.minion.frames.map(loadImg)).then(function(imgs){
    c.minion.imgs = imgs;
    return c;
   });
  }
  return c;
 });
}

function getChars(){
 var a=[null,null];
 try{
  var r=JSON.parse(localStorage.getItem('circ_chars')||'[]');
  var wmap=loadWinsMap();
  var changed=false;
  for(var i=0;i<2;i++){
   a[i]=sanitize(r[i]);
   if(a[i]){
    var stored=wmap[a[i].name];
    if(stored!==undefined){a[i].wins=Math.max(0,Math.floor(Number(stored)||0));}
    else if(a[i].wins>0){wmap[a[i].name]=a[i].wins;changed=true;}
    else {wmap[a[i].name]=0;changed=true;}
   }
  }
  if(changed)saveWinsMap(wmap);
 }catch(e){}
 return a;
}
function setStore(a){try{localStorage.setItem('circ_chars',JSON.stringify(a));}catch(e){toast('⚠ เก็บไม่ได้');}}
var CH=[null,null],ACT=parseInt(localStorage.getItem('circ_act')||'0')||0;
function loadChars(){
 var a=getChars();
 return Promise.all(a.map(function(c){return c?prepChar(c):null;})).then(function(r){
  CH=r;if(!CH[ACT]){ACT=CH[0]?0:(CH[1]?1:0);}renderMenu();drawStaticPreviews();
  renderProfileCard();refreshAdminTile();});
}

function refreshAdminTile(){
 var t=$('tileAdmin');
 if(t) t.style.display = isAdmin() ? 'flex' : 'none';
}

function renderMenu(){
 var h='';
 for(var i=0;i<2;i++){
  var c=CH[i];
  h+='<div class="card'+(ACT===i&&c?' act':'')+'" data-i="'+i+'">';
  if(c){
   var wp = c.weapon && c.weapon!=='none' ? '<span class="tag">⚔ '+WEAPONS[c.weapon].n+'</span>' : '';
   var adminTag = c._adminAllSkills ? '<span class="tag admin">👑 แอดมิน</span>' : '';
   var comboTag = '';
   var cb = getCombo(c.skills);
   if(cb){
    var ccls = cb==='timeStop'?'ts':(cb==='lightPet'?'lp':'');
    comboTag = '<br><span class="combo-tag '+ccls+'">'+COMBO_INFO[cb].n+'</span>';
   }
   h+='<canvas width="96" height="96" class="pvc" data-i="'+i+'"></canvas>'+
      '<div class="info"><b>'+esc(c.name)+'</b>'+adminTag+'<br>'+
      c.skills.map(function(s){return elemSvg(s.id,14,s.color)+' '+SK[s.id].n}).join(' &nbsp; ')+
      ' '+wp+ comboTag +
      '<br><span class="tag">★ ชนะ '+c.wins+'</span></div>'+
      '<div class="actions">'+
       '<button data-e="'+i+'">✎ แก้ไข</button>'+
       '<button data-d="'+i+'" class="red">✕ ลบ</button>'+
      '</div>';
  } else {
   h+='<div class="empty">'+
      '<div style="opacity:.65;margin-bottom:10px;font-size:13px">ช่อง '+(i+1)+' ว่าง</div>'+
      '<button class="big green" data-e="'+i+'" style="margin:0;font-size:15px;padding:12px">✚ สร้างตัวละครใหม่</button>'+
      '</div>';
  }
  h+='</div>';
 }
 $('slots').innerHTML=h;
}
$('slots').addEventListener('click',function(e){
 var ed=e.target.closest('button[data-e]');
 if(ed){openEditor(+ed.dataset.e);return;}
 var dl=e.target.closest('button[data-d]');
 if(dl){
  if(confirm('ลบตัวละครนี้?')){var a=getChars();a[+dl.dataset.d]=null;setStore(a);loadChars();}
  return;
 }
 var cd=e.target.closest('.card');
 if(cd&&CH[+cd.dataset.i]){ACT=+cd.dataset.i;localStorage.setItem('circ_act',ACT);renderMenu();drawStaticPreviews();renderProfileCard();}
});
function drawStaticPreviews(){
 var list=document.querySelectorAll('.pvc');
 for(var k=0;k<list.length;k++){
  var cv=list[k],c=CH[+cv.dataset.i];if(!c||!c.imgs||!c.imgs[0])continue;
  var x=cv.getContext('2d');x.clearRect(0,0,S,S);
  var im=c.imgs[0];if(im&&im.width)x.drawImage(im,0,0,S,S);
 }
}
function updCnt(){
 fetch('/count').then(function(r){return r.json();}).then(function(j){
  $('cnt').innerHTML='● ออนไลน์ '+j.online+' คน'+(j.rooms?' • <span style="color:#fff">'+j.rooms+' ห้อง</span>':'');
 }).catch(function(){});
}
updCnt();setInterval(updCnt,10000);

function loadRank(){
 var box=$('rankList');
 box.innerHTML='<div class="lb-empty">◌ กำลังโหลด...</div>';
 fetch('/leaderboard').then(function(r){return r.json();}).then(function(list){
  if(!list||!list.length){
   box.innerHTML='<div class="lb-empty">◌ ยังไม่มีใครชนะเลย</div>';
   return;
  }
  var myName = ACC && ACC.name ? ACC.name : (CH[ACT]?CH[ACT].name:'');
  var h='';
  list.forEach(function(e,i){
   var rk=i+1;
   var cls='lb-rank'+(rk<=3?' r'+rk:'');
   var you=(e.name===myName)?' lb-you':'';
   var av = e.avatar ? '<img src="'+e.avatar+'" alt="">' : esc((e.name||'?').charAt(0).toUpperCase());
   h+='<div class="lb-row'+you+'">'+
      '<div class="'+cls+'">'+rk+'</div>'+
      '<div class="lb-avatar">'+av+'</div>'+
      '<div class="lb-name">'+esc(e.name)+(e.name===myName?' <span class="tag">คุณ</span>':'')+'</div>'+
      '<div class="lb-wins">★ '+e.wins+'</div>'+
      '</div>';
  });
  box.innerHTML=h;
 }).catch(function(){box.innerHTML='<div class="lb-empty">◌ โหลดอันดับไม่ได้</div>';});
}
$('tileRank').onclick=function(){show('rank');loadRank();};
$('rankRefresh').onclick=loadRank;
$('rankBack').onclick=function(){show('menu');};

/* ===== Admin screen ===== */
$('tileAdmin').onclick=function(){
 if(!isAdmin()){toast('ต้องซื้อ TOUx1 ก่อน');return;}
 openAdmin();
};
$('adminBack').onclick=function(){show('menu');renderProfileCard();};

function openAdmin(){
 var c = CH[ACT];
 $('admHpInput').value = (c && c._adminHp) ? c._adminHp : (c ? 100 : 500);
 $('admWinsInput').value = 1000;
 var cfg = getAdminCfg();
 var mult = cfg.cdMult || 1;
 $('admCdMult').value = mult;
 $('admCdVal').textContent = 'CD × ' + Number(mult).toFixed(2);
 var wins = ACC && typeof ACC.wins==='number' ? ACC.wins : (c?c.wins:0);
 $('admWinsStatus').textContent = 'ชัยชนะปัจจุบัน: ★ ' + wins;
 show('admin');
}
$('admCdMult').addEventListener('input', function(){
 $('admCdVal').textContent = 'CD × ' + Number(this.value).toFixed(2);
});
$('admSetCd').onclick=function(){
 var cfg = getAdminCfg();
 cfg.cdMult = clamp($('admCdMult').value, 0.01, 10);
 saveAdminCfg(cfg);
 if(CH[ACT]){
  var a=getChars();
  a[ACT]._adminCdMult = cfg.cdMult;
  setStore(a);
  loadChars().then(function(){toast('✓ ตั้ง CD × '+cfg.cdMult.toFixed(2));});
 } else {
  toast('✓ บันทึกแล้ว (จะใช้กับตัวละครใหม่)');
 }
};
$('admAddWins').onclick=function(){
 var n = Math.max(0, Math.floor(Number($('admWinsInput').value)||0));
 if(!n){toast('ใส่จำนวน');return;}
 var name = ACC && ACC.name ? ACC.name : (CH[ACT]?CH[ACT].name:'');
 if(!name){toast('ต้องมีชื่อ');return;}
 var cur = getWinsForName(name);
 var newTot = cur + n;
 setWinsForName(name, newTot);
 if(ACC && ACC.name){
  ACC.wins = newTot;
  saveAccountLocal(ACC);
 }
 var a = getChars();
 if(a[ACT]){ a[ACT].wins = newTot; setStore(a); }
 submitWin(name, newTot);
 toast('★ +'+n+' ชัยชนะ (รวม '+newTot+')');
 $('admWinsStatus').textContent = 'ชัยชนะปัจจุบัน: ★ ' + newTot;
 loadChars().then(renderProfileCard);
};
$('admSubWins').onclick=function(){
 var n = Math.max(0, Math.floor(Number($('admWinsInput').value)||0));
 if(!n){toast('ใส่จำนวน');return;}
 var name = ACC && ACC.name ? ACC.name : (CH[ACT]?CH[ACT].name:'');
 if(!name){toast('ต้องมีชื่อ');return;}
 var cur = getWinsForName(name);
 var newTot = Math.max(0, cur - n);
 setWinsForName(name, newTot);
 if(ACC && ACC.name){
  ACC.wins = newTot;
  saveAccountLocal(ACC);
 }
 var a = getChars();
 if(a[ACT]){ a[ACT].wins = newTot; setStore(a); }
 submitWin(name, newTot);
 toast('★ −'+n+' ชัยชนะ (เหลือ '+newTot+')');
 $('admWinsStatus').textContent = 'ชัยชนะปัจจุบัน: ★ ' + newTot;
 loadChars().then(renderProfileCard);
};
$('admSetHp').onclick=function(){
 var hp = Math.max(1, Math.min(99999, Math.floor(Number($('admHpInput').value)||100)));
 if(!CH[ACT]){toast('สร้างตัวละครก่อน');return;}
 var a = getChars();
 a[ACT]._adminHp = hp;
 setStore(a);
 loadChars().then(function(){toast('✓ ตั้ง HP = '+hp);});
};
$('admAllSkills').onclick=function(){
 if(!CH[ACT]){toast('สร้างตัวละครก่อน');return;}
 var allIds = Object.keys(SK).filter(function(id){return id!=='god' && id!=='bossSummon';});
 var skills = allIds.map(function(id){ return defSkill(id); });
 var a = getChars();
 a[ACT].skills = skills;
 a[ACT]._adminAllSkills = true;
 setStore(a);
 loadChars().then(function(){toast('✦ ใส่ทุกสกิล ('+skills.length+') เรียบร้อย');});
};
$('admClearSkills').onclick=function(){
 if(!CH[ACT]){toast('สร้างตัวละครก่อน');return;}
 var a = getChars();
 a[ACT].skills = [defSkill('fire')];
 setStore(a);
 loadChars().then(function(){toast('✕ เคลียร์สกิล');});
};
$('admReset').onclick=function(){
 if(!confirm('ล้างค่าแอดมินทั้งหมดของตัวละครนี้?'))return;
 if(!CH[ACT]){return;}
 var a = getChars();
 delete a[ACT]._adminHp;
 delete a[ACT]._adminCdMult;
 delete a[ACT]._adminAllSkills;
 setStore(a);
 saveAdminCfg({cdMult:1});
 loadChars().then(function(){toast('↻ รีเซ็ตแล้ว');openAdmin();});
};

/* ===== ปุ่มเมนู ===== */
$('tileChars').onclick=function(){ show('chars'); };
$('charsBack').onclick=function(){show('menu');drawStaticPreviews();};
$('tilePlay').onclick=function(){ show('play'); renderRooms(); };
$('playBack').onclick=function(){
 $('roomsView').style.display='block';
 $('createView').style.display='none';
 $('tabRooms').classList.add('on');
 $('tabCreate').classList.remove('on');
 show('menu');
};
$('profileCard').onclick=function(){ openSettings(); };
$('tileSettings').onclick=function(){ openSettings(); };
$('settingsBack').onclick=function(){ show('menu'); renderProfileCard(); };

/* ===== ตัวแก้ไขตัวละคร ===== */
var dc=$('dc'),dx=dc.getContext('2d'),ED=null,tool='brush',playT=null;
function activeFrames(){return ED.editingMinion?ED.minionFrames:ED.frames;}
function activeCur(){return ED.editingMinion?ED.minionCur:ED.cur;}
function setActiveCur(v){if(ED.editingMinion)ED.minionCur=v;else ED.cur=v;}
function commit(){var arr=activeFrames(),i=activeCur();var x=arr[i].getContext('2d');x.clearRect(0,0,S,S);x.drawImage(dc,0,0);}
function loadFrame(i){setActiveCur(i);var arr=activeFrames();dx.clearRect(0,0,S,S);dx.drawImage(arr[activeCur()],0,0);renderFbar();}
function renderFbar(){
 var arr=activeFrames(),idx=activeCur();
 var h='';
 for(var i=0;i<arr.length;i++)h+='<button data-f="'+i+'" class="'+(i===idx?'on':'')+'">'+(i+1)+'</button>';
 $('fbar').innerHTML=h;
}
$('fbar').addEventListener('click',function(e){
 if(e.target.dataset.f===undefined)return;commit();loadFrame(+e.target.dataset.f);});
$('btnAdd').onclick=function(){
 commit();var arr=activeFrames();
 if(arr.length>=8){toast('เฟรมสูงสุด 8');return;}
 var n=newCanvas();n.getContext('2d').drawImage(arr[activeCur()],0,0);
 arr.splice(activeCur()+1,0,n);loadFrame(activeCur()+1);
};
$('btnDel').onclick=function(){
 var arr=activeFrames();
 if(arr.length<=1){toast('ต้องมีอย่างน้อย 1 เฟรม');return;}
 arr.splice(activeCur(),1);loadFrame(Math.min(activeCur(),arr.length-1));
};
$('btnClr').onclick=function(){dx.clearRect(0,0,S,S);commit();};
$('btnPlay').onclick=function(){
 if(playT){stopPlay();return;}
 commit();var i=0,px=$('pv').getContext('2d'),arr=activeFrames();
 $('btnPlay').textContent='■ หยุด';
 playT=setInterval(function(){
  px.clearRect(0,0,S,S);px.drawImage(arr[i%arr.length],0,0);i++;},160);
};
function stopPlay(){if(playT){clearInterval(playT);playT=null;}$('btnPlay').textContent='▶ เล่น';}
$('tools').addEventListener('click',function(e){
 var t=e.target.dataset.t;if(!t)return;tool=t;
 var bs=$('tools').querySelectorAll('button');
 for(var i=0;i<bs.length;i++)bs[i].classList.toggle('on',bs[i].dataset.t===t);
});
$('btnUp').onclick=function(){$('upl').click();};
$('upl').onchange=function(){
 var f=this.files[0];this.value='';if(!f)return;
 var fr=new FileReader();
 fr.onload=function(){
  var im=new Image();
  im.onload=function(){
   dx.clearRect(0,0,S,S);
   var sc=Math.max(S/im.width,S/im.height),w=im.width*sc,h=im.height*sc;
   dx.drawImage(im,(S-w)/2,(S-h)/2,w,h);commit();
  };
  im.src=fr.result;
 };
 fr.readAsDataURL(f);
};
var down=false,lx=0,ly=0;
function pos(e){var r=dc.getBoundingClientRect();return [(e.clientX-r.left)/r.width*S,(e.clientY-r.top)/r.height*S];}
function stroke(a,b,c,d){
 dx.save();dx.lineCap='round';dx.lineJoin='round';dx.lineWidth=+$('bsz').value;
 if(tool==='eraser')dx.globalCompositeOperation='destination-out';else dx.strokeStyle=$('col').value;
 dx.beginPath();dx.moveTo(a,b);dx.lineTo(c,d);dx.stroke();dx.restore();
}
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
 dx.putImageData(img,0,0);
}
dc.addEventListener('pointerdown',function(e){
 e.preventDefault();var p=pos(e);
 if(tool==='bucket'){fill(Math.min(S-1,Math.max(0,Math.floor(p[0]))),Math.min(S-1,Math.max(0,Math.floor(p[1]))),$('col').value);commit();return;}
 down=true;lx=p[0];ly=p[1];stroke(lx,ly,lx,ly);
 try{dc.setPointerCapture(e.pointerId);}catch(x){}
});
dc.addEventListener('pointermove',function(e){
 if(!down)return;var p=pos(e);stroke(lx,ly,p[0],p[1]);lx=p[0];ly=p[1];});
['pointerup','pointercancel'].forEach(function(ev){
 dc.addEventListener(ev,function(){if(down){down=false;commit();}});});

function updateMinionBtn(){
 var hasPet = ED && ED.skills && ED.skills.some(function(s){return s.id==='pet';});
 var b=$('btnMinionEdit');
 if(!b) return;
 if(hasPet){
  b.style.display='flex';
  b.textContent = ED.editingMinion ? '🐾 กลับไปแก้ตัวละครหลัก' : '🐾 แก้ไขตัวละครลูกน้อง';
  $('minionHint').style.display = ED.editingMinion ? 'block' : 'none';
 } else {
  b.style.display='none';
  $('minionHint').style.display='none';
  if(ED.editingMinion){ ED.editingMinion=false; loadFrame(0); }
 }
}

function renderSkPick(){
 var h='';
 var wins = (ACC && typeof ACC.wins==='number') ? ACC.wins : (ED.wins||0);
 var adminUser = isAdmin();
 Object.keys(SK).forEach(function(id){
  if(id==='bossSummon') return;
  if(id==='god') return;
  var on=ED.skills.some(function(s){return s.id===id});
  var isBossEdit = !!(CH[ED.slot] && CH[ED.slot]._isBoss);
  var locked = (id==='dark') && !isBossEdit && !adminUser && wins < DARK_UNLOCK;
  var style = 'border-color:'+(on?SK[id].color:'#2a2a2a')+';'+(locked?'opacity:.4':'');
  h+='<button data-s="'+id+'" class="'+(on?'on':'')+'" style="'+style+'">'+
     elemSvg(id,16,SK[id].color)+' '+SK[id].n+(locked?' 🔒'+DARK_UNLOCK:'')+
     '</button>';
 });
 $('skpick').innerHTML=h;
 var maxSk = adminUser ? 999 : (hasSlot3() ? 3 : 2);
 $('skMax').textContent = adminUser ? '∞ (แอดมิน)' : maxSk;
 var allBtn = $('btnAllSkillsEdit');
 if(allBtn) allBtn.style.display = adminUser ? 'flex' : 'none';
 var g='';
 ED.skills.forEach(function(s,i){
  var cN=(s.slots&&s.slots.cast)?s.slots.cast.length:0;
  var hN=(s.slots&&s.slots.status)?s.slots.status.length:0;
  g+='<div class="sk" style="border-color:'+s.color+'44">'+
   '<b style="color:'+s.color+';display:inline-flex;align-items:center;gap:6px">'+elemSvg(s.id,16,s.color)+SK[s.id].n+'</b> <span class="tag">'+SK[s.id].status+'</span>'+
   row('✹ ดาเมจ (สูงสุด 6)',i,'dmg',LIM.dmg.min,LIM.dmg.max,LIM.dmg.step,s.dmg)+
   row('◷ คูลดาวน์ (5-10 วิ)',i,'cd',LIM.cd.min,LIM.cd.max,LIM.cd.step,s.cd)+
   row('✦ ขนาดเอฟเฟค (สูงสุด 1)',i,'power',LIM.power.min,LIM.power.max,LIM.power.step,s.power)+
   '<div class="row"><span>▨ สีเอฟเฟค</span><input type="color" data-i="'+i+'" data-f="color" value="'+s.color+'" style="width:52px;height:30px;border:0;border-radius:6px;background:transparent"></div>'+
   '<button class="eff-btn" data-skef="'+i+'" data-slot="cast">'+elemSvg(s.id,16,s.color)+' แก้ไข: '+SK[s.id].slots.cast+' <span class="tag">'+(cN?cN+' เฟรม':'ว่าง')+'</span></button>'+
   '<button class="eff-btn hit" data-skef="'+i+'" data-slot="status">'+elemSvg(s.id,16,'#c07aff')+' แก้ไข: '+SK[s.id].slots.status+' <span class="tag">'+(hN?hN+' เฟรม':'ว่าง')+'</span></button>'+
   '</div>';
 });
 var combo = getCombo(ED.skills);
 if(combo){
  var cbColor = combo==='timeStop'?'#7fdcff':(combo==='lightPet'?'#ffd166':'#ffd166');
  g += '<div class="bal-info" style="color:'+cbColor+';border-color:'+cbColor+'aa">'+
       '✦ <b>คอมโบ!</b> '+COMBO_INFO[combo].n+'<br>'+COMBO_INFO[combo].d+
       '</div>';
 }
 if(ED.skills.some(function(s){return s.id==='pet';})){
  g += '<div class="bal-info" style="color:#ff88cc;border-color:#ff88cc88">'+
       '🐾 <b>สัตว์เลี้ยง</b> — เรียก 5 ตัว รอบตัว • ตัวละ '+MINION_HP+' HP • ต่อยอัตโนมัติ (1 ดาเมจ)'+
       '</div>';
 }
 if(ED.skills.some(function(s){return s.id==='dark';})){
  g += '<div class="bal-info" style="color:#c08aff;border-color:#8a4aff88">'+
       '🌑 <b>หลุมดำ</b> — ดูดศัตรูเข้าหาศูนย์กลาง • ดาเมจ '+DARK_HOLE_DMG+'/วิ ('+DARK_HOLE_DUR+' วิ) • ระเบิด '+DARK_HOLE_EXPLODE_DMG+' ดาเมจ'+
       '</div>';
 }
 if(ED.skills.some(function(s){return s.id==='water';})){
  g += '<div class="bal-info" style="color:#4fc3f7;border-color:#4fc3f788">'+
       '💧 <b>คลื่นน้ำ</b> — ผลักศัตรู + ดาเมจ '+WATER_DMG+' • ทิศทางตามตอนปล่อย'+
       '</div>';
 }
 g+='<div class="bal-info">⚖ ดาเมจ>1.5 → CD≥6 • CD<6 → ดาเมจ≤1.5 • หิน 5.5/ก้อน<br>⚡ สายฟ้า: ช็อต(ไม่หยุด) + tick 0.5<br>🩸 เลือด: ระยะไกล • ฟื้น HP 1.5/วิ 5 วิ<br>☠ พิษ: 0.2/0.5 วิ 5 วิ<br>🪨 หิน: 5 ก้อนร่วง ดาเมจ 5.5/ก้อน<br>✦ แสง: พิษแสง 0.4 ทุก 0.5 วิ<br>🌑 มืด: หลุมดำ '+DARK_HOLE_DUR+' วิ + ระเบิด '+DARK_HOLE_EXPLODE_DMG+' <span style="color:#ff8888">(ต้องมี '+DARK_UNLOCK+' ชัยชนะ)</span><br>💧 น้ำ: คลื่นผลัก + ดาเมจ '+WATER_DMG+'<br>☄ คอมโบ เพลิง+หิน: อุกกาบาต 3 ลูก + ไฟลุก 5 วิ<br>🔥 คอมโบ เพลิง+หมัด: พุ่งชน ระเบิด 5×2 ดาเมจ<br>🪨🐾 คอมโบ สัตว์เลี้ยง+หิน: หิน 1 ก้อน กลายเป็นสมุน 1 ตัว<br>✦🪨 คอมโบ แสง+หิน: สตัน '+HOLY_LIGHT_STUN+' วิ + เทพต่อย '+GOD_PUNCH_DMG+'<br>⚡🪨 คอมโบ สายฟ้า+หิน: หินสายฟ้าตก '+LIGHTNING_STONE_DROPS+' จุด + คลื่นไฟฟ้า '+LIGHTNING_FIELD_DUR+' วิ • CD '+LIGHTNING_STONE_CD+' วิ<br>🌑❄ คอมโบ มืด+น้ำแข็ง: หยุดเวลา '+TIME_STOP_DUR+' วิ • กระสุนค้างกลางอากาศ • CD '+TIME_STOP_CD+' วิ<br>✦🐾 <b style="color:#ffd166">คอมโบ แสง+สัตว์เลี้ยง = เทพ</b> — เรียกเทพ HP '+GOD_MINION_HP+' ต่อย '+GOD_MINION_DMG+' ดาเมจ • ตายแล้วรอ '+GOD_MINION_CD+' วิ</div>';
 $('skset').innerHTML=g;
 updateMinionBtn();
}
function row(l,i,f,mn,mx,st,v){
 return '<div class="row"><span>'+l+'</span><input type="range" data-i="'+i+'" data-f="'+f+'" min="'+mn+'" max="'+mx+'" step="'+st+'" value="'+v+'"><b>'+v+'</b></div>';
}
function syncSkset(i,f,v){
 var el=$('skset').querySelector('input[data-i="'+i+'"][data-f="'+f+'"]');
 if(el){el.value=v;if(el.nextElementSibling)el.nextElementSibling.textContent=v;}
}
$('skpick').addEventListener('click',function(e){
 var t=e.target.closest('button[data-s]');if(!t)return;
 var id=t.dataset.s;
 var isBossEdit = !!(CH[ED.slot] && CH[ED.slot]._isBoss);
 var adminUser = isAdmin();
 var wins = (ACC && typeof ACC.wins==='number') ? ACC.wins : (ED.wins||0);
 if(id==='dark' && !isBossEdit && !adminUser && wins < DARK_UNLOCK){
  toast('🔒 ธาตุมืดต้องมีชัยชนะ '+DARK_UNLOCK+' ก่อน (มี '+wins+')');
  return;
 }
 var k=-1;ED.skills.forEach(function(s,i){if(s.id===id)k=i;});
 if(k>=0)ED.skills.splice(k,1);
 else{
  var maxSk = adminUser ? 999 : (hasSlot3() ? 3 : 2);
  if(ED.skills.length>=maxSk){toast('เลือกได้สูงสุด '+maxSk+' สกิล');return;}
  ED.skills.push(defSkill(id));
 }
 renderSkPick();
});
$('btnAllSkillsEdit').onclick=function(){
 if(!isAdmin()){toast('เฉพาะแอดมิน');return;}
 var allIds = Object.keys(SK).filter(function(id){return id!=='god' && id!=='bossSummon';});
 ED.skills = allIds.map(function(id){ return defSkill(id); });
 renderSkPick();
 toast('✦ ใส่ทุกสกิล ('+ED.skills.length+')');
};
$('skset').addEventListener('input',function(e){
 var t=e.target,i=t.dataset.i,f=t.dataset.f;if(i===undefined)return;
 var s=ED.skills[+i];if(!s)return;
 if(f==='color'){s.color=t.value;return;}
 var lim=LIM[f];if(!lim)return;
 var v=clamp(t.value,lim.min,lim.max);
 if(f==='power')v=roundTenth(v);else v=roundHalf(v);
 s[f]=v;
 var bCd=s.cd,bDmg=s.dmg;
 applyBalance(s,f);
 if(s.cd!==bCd)syncSkset(i,'cd',s.cd);
 if(s.dmg!==bDmg)syncSkset(i,'dmg',s.dmg);
 if(t.nextElementSibling)t.nextElementSibling.textContent=v;
});
$('skset').addEventListener('click',function(e){
 var btn=e.target.closest('button[data-skef]');
 if(!btn)return;
 openSkEffect(+btn.dataset.skef,btn.dataset.slot);
});

function renderWeaponPick(){
 var wins=(ED.wins||0);
 var katanaOwned=hasKatana();
 var luckyOwned=hasLucky();
 var h='';
 Object.keys(WEAPONS).forEach(function(wid){
  var w=WEAPONS[wid];
  if(w.shop && wid==='katana' && !katanaOwned) return;
  if(w.shop && wid==='lucky' && !luckyOwned) return;
  var locked=false;
  if(wid==='katana') locked = !katanaOwned;
  else if(wid==='lucky') locked = !luckyOwned;
  else locked = (wins<w.unlock);
  var on=ED.weapon===wid;
  var extraCls = wid==='katana'?'kn ':(wid==='lucky'?'lk ':'');
  var cls=(locked?'locked ':'')+(on?'on ':'')+extraCls;
  h+='<button class="wpn-btn '+cls+'" data-w="'+wid+'" '+(locked?'disabled':'')+'>'+
     w.icon+' '+w.n+(locked?' (★'+w.unlock+')':'')+
     '</button>';
 });
 $('weaponPick').innerHTML=h;
 var info='';
 if(ED.weapon==='sword')info='⚔ ดาบ: ฟันเมื่อศัตรูเข้าใกล้ • ดาเมจ '+WEAPONS.sword.dmg+' • คูลดาวน์ '+WEAPONS.sword.cd+' วิ';
 else if(ED.weapon==='gun')info='▬ ปืน: ยิงทุก '+WEAPONS.gun.cd+' วิ • ดาเมจ '+WEAPONS.gun.dmg+' • ต้องการ ★'+WEAPONS.gun.unlock;
 else if(ED.weapon==='poisonGun')info='☠ ปืนพิษ: ยิงทุก '+WEAPONS.poisonGun.cd+' วิ • ดาเมจ '+WEAPONS.poisonGun.dmg+' • พิษ '+WEAPONS.poisonGun.poisonDur+' วิ • ต้องการ ★'+WEAPONS.poisonGun.unlock;
 else if(ED.weapon==='katana')info='⚔ คาตานะ: ฟันรัวทุก '+WEAPONS.katana.cd+' วิ • ดาเมจ '+WEAPONS.katana.dmg+'/ครั้ง • ระยะ '+Math.round(WEAPONS.katana.range)+' • ซื้อจากร้านแล้ว ✓';
 else if(ED.weapon==='lucky')info='🎴 การ์ดโชค: ในต่อสู้มีปุ่ม "สุ่มการ์ด" • กดสุ่มได้สกิลทุกธาตุ หรือ HP+50% • ยืนยันแล้วขว้างการ์ดใส่ศัตรู • ซื้อจากร้านแล้ว ✓';
 else info='⊘ ไม่มีอาวุธ';
 $('weaponInfo').textContent=info;
}
$('weaponPick').addEventListener('click',function(e){
 var b=e.target.closest('button[data-w]');if(!b||b.disabled)return;
 ED.weapon=b.dataset.w;
 renderWeaponPick();
});

function openEditor(slot){
 stopPlay();
 var c=CH[slot];
 ED={slot:slot,frames:[],cur:0,skills:[],weapon:'none',wins:(c?c.wins:0),
     minionFrames:[],minionCur:0,editingMinion:false};
 if(c){
  $('cname').value=c.name;
  c.imgs.forEach(function(im){var cv=newCanvas();cv.getContext('2d').drawImage(im,0,0,S,S);ED.frames.push(cv);});
  ED.skills=JSON.parse(JSON.stringify(c.skills));
  ED.weapon=c.weapon||'none';
  if(c.minion && c.minion.imgs){
   c.minion.imgs.forEach(function(im){var cv=newCanvas();cv.getContext('2d').drawImage(im,0,0,S,S);ED.minionFrames.push(cv);});
  }
 } else {$('cname').value='';ED.frames=[newCanvas()];}
 if(!ED.minionFrames.length) ED.minionFrames=[newCanvas()];
 ED.editingMinion=false;
 $('minionHint').style.display='none';
 if(isAdmin()){
  $('adminEditorFields').style.display='block';
  $('admCharHp').value = (c && c._adminHp) ? c._adminHp : 100;
  var cfg = getAdminCfg();
  $('admCharCd').value = (c && c._adminCdMult) ? c._adminCdMult : (cfg.cdMult||1);
 } else {
  $('adminEditorFields').style.display='none';
 }
 updateMinionBtn();
 loadFrame(0);renderSkPick();renderWeaponPick();show('editor');
}
$('btnMinionEdit').onclick=function(){
 commit();
 if(!ED)return;
 var hasPet = ED.skills.some(function(s){return s.id==='pet';});
 if(!hasPet){ toast('เลือกสกิล 🐾 สัตว์เลี้ยง ก่อน'); return; }
 ED.editingMinion = !ED.editingMinion;
 updateMinionBtn();
 loadFrame(0);
};
$('btnSave').onclick=function(){
 commit();
 if(!ED.skills.length){toast('เลือกสกิลอย่างน้อย 1 อัน');return;}
 var freshChars=getChars();
 var freshOld=freshChars[ED.slot];
 var currentWins=freshOld?freshOld.wins:(ED.wins||0);
 var hasDark = ED.skills.some(function(s){return s.id==='dark';});
 var accWins = (ACC && typeof ACC.wins==='number') ? ACC.wins : currentWins;
 var adminUser = isAdmin();
 if(hasDark && !(freshOld && freshOld._isBoss) && !adminUser && accWins < DARK_UNLOCK){
  toast('🔒 ธาตุมืดต้องมีชัยชนะ '+DARK_UNLOCK+' ก่อน');
  return;
 }
 var urls=ED.frames.map(function(c){return c.toDataURL('image/png');});
 var name=$('cname').value.trim()||'ตัวละคร';
 var obj=sanitize({name:name,frames:urls,skills:ED.skills,wins:currentWins,weapon:ED.weapon});
 if(ED.skills.some(function(s){return s.id==='pet';})){
  obj.minion = {frames: ED.minionFrames.map(function(c){return c.toDataURL('image/png');})};
 }
 if(adminUser){
  var hp = Math.max(1, Math.min(99999, Math.floor(Number($('admCharHp').value)||100)));
  var cd = clamp(Number($('admCharCd').value)||1, 0.01, 10);
  obj._adminHp = hp;
  obj._adminCdMult = cd;
  if(ED.skills.length > 2) obj._adminAllSkills = true;
 } else {
  if(freshOld && freshOld._adminHp) obj._adminHp = freshOld._adminHp;
  if(freshOld && freshOld._adminCdMult) obj._adminCdMult = freshOld._adminCdMult;
  if(freshOld && freshOld._adminAllSkills) obj._adminAllSkills = true;
 }
 var a=getChars();a[ED.slot]=obj;setStore(a);
 var wmap=loadWinsMap();
 if(wmap[name]===undefined)wmap[name]=currentWins;
 saveWinsMap(wmap);
 ACT=ED.slot;localStorage.setItem('circ_act',ACT);
 stopPlay();loadChars().then(function(){show('chars');toast('✓ บันทึกแล้ว');});
};
$('btnBack').onclick=function(){stopPlay();show('chars');drawStaticPreviews();};

/* ===== Skill Effect Editor ===== */
var EF=null,efTool='brush',efDown=false,efLx=0,efLy=0;
function openSkEffect(skIdx,slot){
 var s=ED.skills[skIdx];
 if(!s){toast('ไม่พบสกิล');return;}
 slot=slot||'cast';
 var srcs=(s.slots&&s.slots[slot]&&s.slots[slot].length)?s.slots[slot]:[null];
 Promise.all(srcs.map(loadImg)).then(function(imgs){
  EF={idx:skIdx,slot:slot,cur:0,size:SKEFF_SIZE,frames:[],history:[]};
  imgs.forEach(function(im){
   var layer0=newCanvas(SKEFF_SIZE);
   if(im&&im.width)layer0.getContext('2d').drawImage(im,0,0,SKEFF_SIZE,SKEFF_SIZE);
   EF.frames.push({layers:[layer0],activeLayer:0});
  });
  EF.ecanvas=$('sfc');EF.ectx=EF.ecanvas.getContext('2d');
  EF.gcanvas=$('sfg');EF.gctx=EF.gcanvas.getContext('2d');
  var label = (slot==='status') ? SK[s.id].slots.status : SK[s.id].slots.cast;
  var iconColor = (slot==='status') ? '#c07aff' : s.color;
  $('skef-title').innerHTML=elemSvg(s.id,22,iconColor)+' '+label+' — '+SK[s.id].n;
  $('skef-sub').textContent='วาด '+SKEFF_SIZE+'×'+SKEFF_SIZE+' • ใช้หลายเลเยอร์ได้';
  $('efcol').value=(slot==='status')?'#c07aff':s.color;
  loadEfFrame(0);
  show('skeffect');
 });
}
function efFrameComposite(f){
 var cv=newCanvas(EF.size),cx=cv.getContext('2d');
 f.layers.forEach(function(l){cx.drawImage(l,0,0);});
 return cv;
}
function efRedraw(){
 var f=EF.frames[EF.cur];
 EF.ectx.clearRect(0,0,EF.size,EF.size);
 EF.ectx.drawImage(efFrameComposite(f),0,0);
}
function loadEfFrame(i){
 EF.cur=i;
 var f=EF.frames[i];
 if(f.activeLayer>=f.layers.length)f.activeLayer=0;
 var gx=EF.gctx;
 gx.clearRect(0,0,EF.size,EF.size);
 if($('efOnion').checked && i>0) gx.drawImage(efFrameComposite(EF.frames[i-1]),0,0);
 efRedraw();
 renderEfBar();renderLayerBar();
}
function renderEfBar(){
 var h='';
 for(var i=0;i<EF.frames.length;i++)h+='<button data-ef="'+i+'" class="'+(i===EF.cur?'on':'')+'">'+(i+1)+'</button>';
 $('efbar').innerHTML=h;
}
function renderLayerBar(){
 var f=EF.frames[EF.cur];
 var h='';
 for(var i=0;i<f.layers.length;i++)h+='<button data-lyr="'+i+'" class="'+(i===f.activeLayer?'on':'')+'">'+(i+1)+'</button>';
 $('eflayerbtn').innerHTML=h;
}
function efPushHistory(){
 if(!EF)return;
 var snap={cur:EF.cur,frames:EF.frames.map(function(f){
  var layers=f.layers.map(function(l){var n=newCanvas(EF.size);n.getContext('2d').drawImage(l,0,0);return n;});
  return {layers:layers,activeLayer:f.activeLayer};
 })};
 EF.history.push(snap);
 if(EF.history.length>20)EF.history.shift();
}
function efUndo(){
 if(!EF||!EF.history.length){toast('ไม่มีอะไรให้ย้อน');return;}
 var snap=EF.history.pop();
 EF.cur=snap.cur;
 EF.frames=snap.frames.map(function(f){
  var layers=f.layers.map(function(l){var n=newCanvas(EF.size);n.getContext('2d').drawImage(l,0,0);return n;});
  return {layers:layers,activeLayer:f.activeLayer};
 });
 loadEfFrame(EF.cur);
 toast('↶ ย้อนกลับแล้ว');
}
$('efUndo').onclick=efUndo;
$('efbar').addEventListener('click',function(e){
 var t=e.target.closest('button[data-ef]');if(!t)return;
 loadEfFrame(+t.dataset.ef);
});
$('eflayerbtn').addEventListener('click',function(e){
 var t=e.target.closest('button[data-lyr]');if(!t)return;
 var f=EF.frames[EF.cur];f.activeLayer=+t.dataset.lyr;
 renderLayerBar();
});
$('efLayerAdd').onclick=function(){
 if(!EF)return;
 efPushHistory();
 var f=EF.frames[EF.cur];
 if(f.layers.length>=6){toast('เลเยอร์สูงสุด 6');EF.history.pop();return;}
 f.layers.push(newCanvas(EF.size));
 f.activeLayer=f.layers.length-1;
 loadEfFrame(EF.cur);
 toast('+ เพิ่มเลเยอร์');
};
$('efLayerDel').onclick=function(){
 if(!EF)return;
 var f=EF.frames[EF.cur];
 if(f.layers.length<=1){toast('ต้องมีอย่างน้อย 1 เลเยอร์');return;}
 efPushHistory();
 f.layers.splice(f.activeLayer,1);
 if(f.activeLayer>=f.layers.length)f.activeLayer=f.layers.length-1;
 loadEfFrame(EF.cur);
 toast('− ลบเลเยอร์');
};
$('efOnion').onchange=function(){if(EF)loadEfFrame(EF.cur);};
$('efAdd').onclick=function(){
 if(!EF)return;
 efPushHistory();
 if(EF.frames.length>=8){toast('เฟรมสูงสุด 8');EF.history.pop();return;}
 EF.frames.splice(EF.cur+1,0,{layers:[newCanvas(EF.size)],activeLayer:0});
 loadEfFrame(EF.cur+1);
};
$('efDel').onclick=function(){
 if(!EF)return;
 if(EF.frames.length<=1){toast('ต้องมีอย่างน้อย 1 เฟรม');return;}
 efPushHistory();
 EF.frames.splice(EF.cur,1);
 loadEfFrame(Math.min(EF.cur,EF.frames.length-1));
};
$('efClr').onclick=function(){
 if(!EF)return;
 efPushHistory();
 var f=EF.frames[EF.cur];
 f.layers[f.activeLayer].getContext('2d').clearRect(0,0,EF.size,EF.size);
 efRedraw();
};
$('eftools').addEventListener('click',function(e){
 var t=e.target.dataset.et;if(!t)return;efTool=t;
 var bs=$('eftools').querySelectorAll('button');
 for(var i=0;i<bs.length;i++)bs[i].classList.toggle('on',bs[i].dataset.et===t);
});
function efPos(e){var r=EF.ecanvas.getBoundingClientRect();return [(e.clientX-r.left)/r.width*EF.size,(e.clientY-r.top)/r.height*EF.size];}
function efStroke(a,b,c,d){
 var f=EF.frames[EF.cur];
 var lx=f.layers[f.activeLayer].getContext('2d');
 lx.save();lx.lineCap='round';lx.lineJoin='round';lx.lineWidth=+$('efbsz').value;
 if(efTool==='eraser')lx.globalCompositeOperation='destination-out';else lx.strokeStyle=$('efcol').value;
 lx.beginPath();lx.moveTo(a,b);lx.lineTo(c,d);lx.stroke();lx.restore();
 efRedraw();
}
$('sfc').addEventListener('pointerdown',function(e){
 if(!EF)return;
 e.preventDefault();
 efPushHistory();
 var p=efPos(e);efDown=true;efLx=p[0];efLy=p[1];
 efStroke(efLx,efLy,efLx,efLy);
 try{EF.ecanvas.setPointerCapture(e.pointerId);}catch(x){}
});
$('sfc').addEventListener('pointermove',function(e){
 if(!EF||!efDown)return;
 var p=efPos(e);efStroke(efLx,efLy,p[0],p[1]);efLx=p[0];efLy=p[1];
});
['pointerup','pointercancel'].forEach(function(ev){
 $('sfc').addEventListener(ev,function(){if(EF&&efDown){efDown=false;}});
});
setInterval(function(){
 if(!EF||!$('skeffect').classList.contains('on'))return;
 var px=$('efpv').getContext('2d');
 px.clearRect(0,0,EF.size,EF.size);
 var idx=Math.floor(performance.now()/120)%EF.frames.length;
 px.drawImage(efFrameComposite(EF.frames[idx]),0,0);
},100);

$('efSave').onclick=function(){
 if(!EF){return;}
 var s=ED.skills[EF.idx];
 var urls=EF.frames.map(function(f){
  var cv=newCanvas(EF.size),cx=cv.getContext('2d');
  f.layers.forEach(function(l){cx.drawImage(l,0,0);});
  return cv.toDataURL('image/png');
 }).slice(0,8);
 if(!s.slots)s.slots={cast:[],status:[]};
 s.slots[EF.slot]=urls;
 renderSkPick();
 show('editor');
 toast('✓ บันทึก '+SK[s.id].slots[EF.slot]+' แล้ว ('+urls.length+' เฟรม)');
};
$('efBack').onclick=function(){show('editor');renderSkPick();};

/* ===== การต่อสู้ ===== */
var bc=$('bc'),ctx=bc.getContext('2d');
var B=null,mode='bot',role='host',raf=0,lastT=0,sendT=0,ws=null,olState=0,pingT=null;
var myName='';
var wasOnlineGame=false;
var selectedBossType = 'mixed';
var luckyRollReward = null;

var currentRoomId = null;
var selectedRoomMode = 'normal';
var selectedRoomSize = 2;
var selectedRoomBossType = 'mixed';

function wsSend(o){if(ws&&ws.readyState===1){try{ws.send(JSON.stringify(o));}catch(e){}}}
function ensureWs(){
 if(ws && ws.readyState===1) return Promise.resolve();
 if(ws && ws.readyState===0) return new Promise(function(res){ws.addEventListener('open',res);});
 return new Promise(function(res,rej){
  try{
   ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');
  }catch(e){rej(e);return;}
  var mine=ws;
  mine.onopen=function(){
   olState=2;
   pingT=setInterval(function(){wsSend({a:'ping'});},20000);
   res();
  };
  mine.onmessage=function(ev){ onWsMessage(ev,mine); };
  mine.onclose=function(){
   if(ws!==mine)return;
   var wasInRoom = currentRoomId;
   ws=null;olState=0;currentRoomId=null;
   if(pingT){clearInterval(pingT);pingT=null;}
   if(wasInRoom){ $('wait').style.display='none'; toast('◌ หลุดจากเซิร์ฟเวอร์'); }
   if(B && !B.over && !B.done && olState===3){
    B.over=true;B.done=true;cancelAnimationFrame(raf);
    showRes('◌ การเชื่อมต่อหลุด');
   }
  };
 });
}

function onWsMessage(ev,mine){
 var m;try{m=JSON.parse(ev.data);}catch(x){return;}
 if(m.type==='roomCreated'){
  currentRoomId=m.id;
  $('wait').style.display='block';
  $('waitSub').textContent='รอผู้เล่น... (1/'+m.size+') — '+modeLabel(m.mode);
 } else if(m.type==='roomJoined'){
  $('wait').style.display='block';
  $('waitSub').textContent='รอผู้เล่น... ('+m.count+'/'+m.size+')';
 } else if(m.type==='rooms'){
  renderRoomsList(m.rooms||[]);
 } else if(m.type==='error'){
  toast('⚠ '+m.msg);
  $('wait').style.display='none';
  currentRoomId=null;
 } else if(m.type==='match'){
  olState=3;
  currentRoomId=null;
  var chars=(m.players||[]).map(sanitize);
  var bossRaw=(m.mode==='boss'&&m.boss)?sanitize(m.boss):null;
  if(chars.some(function(c){return !c;}) || (m.mode==='boss'&&!bossRaw)){
   toast('ข้อมูลผิดปกติ');return;
  }
  var allChars=chars.slice();
  if(bossRaw) allChars.push(bossRaw);
  if(m.mode==='endless'){
   for(var i=0;i<ENDLESS_MAX_BOTS;i++){
    var ph = makeEndlessBot(1, i, false, false);
    allChars.push(ph);
   }
  }
  Promise.all(allChars.map(prepChar)).then(function(prepped){
   $('wait').style.display='none';
   var myIdx=+m.myIndex||0;
   var r=(myIdx===0)?'host':'guest';
   var bm = m.mode==='boss' ? 'boss' : (m.mode==='endless' ? 'endless' : 'online');
   startBattle(bm,prepped,myIdx,r);
   if(m.mode==='endless'){
    B.endless = {wave:0,state:'idle',timer:0,pointsEarned:0,isMiniBoss:false,isBossWave:false,nextVariantSeed:0};
    var realCount = chars.length;
    for(var i=realCount;i<B.players.length;i++){
     B.players[i].isEndlessBot = true;
     B.players[i].reserved = true;
     B.players[i].alive = false;
    }
    if(r==='host') startNextWave();
   }
  });
 } else if(m.type==='suckDone'){
  if(role==='host' && B && mode==='boss'){
   var boss = findBoss();
   if(boss && boss.suckActive && typeof m.from === 'number'){
    var p = B.players[m.from];
    if(p && !p.c._isBoss && p.alive && (!boss.suckDone || boss.suckDone[p.index] !== 'escaped')){
     if(!boss.suckPulls) boss.suckPulls = {};
     if(!boss.suckDone) boss.suckDone = {};
     boss.suckPulls[p.index] = BOSS_SUCK_PRESSES;
     boss.suckDone[p.index] = 'escaped';
     var dx = p.x - boss.x, dy = p.y - boss.y;
     var d = Math.hypot(dx, dy) || 1;
     p.vx = (dx/d) * 950; p.vy = (dy/d) * 950;
    }
   }
  }
 } else if(m.type==='state'){
  applyState(m.s);
 } else if(m.type==='left'){
  if(B&&!B.over&&!B.done&&olState===3){
   B.over=true;B.done=true;cancelAnimationFrame(raf);
   showRes('← มีผู้เล่นออกจากเกม');
  }
 }
}

function modeLabel(m){
 if(m==='boss') return 'สู้บอส';
 if(m==='endless') return 'ไม่สิ้นสุด';
 return 'ดวลกันเอง';
}

function renderRooms(){
 ensureWs().then(function(){ wsSend({a:'listRooms'}); }).catch(function(){});
}

function renderRoomsList(rooms){
 var box=$('roomsList');
 if(!rooms.length){
  box.innerHTML='<div class="room-empty">◌ ยังไม่มีห้องเปิดอยู่ในขณะนี้<br><span style="font-size:11px;opacity:.7">ลองสร้างห้องใหม่ได้เลย</span></div>';
  return;
 }
 var h='';
 rooms.forEach(function(r){
  var av = r.host.avatar ? '<img src="'+r.host.avatar+'" alt="">' :
           esc((r.host.name||'?').charAt(0).toUpperCase());
  var modeIcon = r.mode==='boss'?'☠':(r.mode==='endless'?'∞':'⚔');
  h+='<div class="room-card">'+
     '<div class="room-avatar">'+av+'</div>'+
     '<div class="room-info">'+
      '<div class="rname">'+esc(r.host.name||'ผู้เล่น')+'</div>'+
      '<div class="rmeta">'+modeIcon+' '+esc(modeLabel(r.mode))+' • '+
       '<b>'+r.count+'/'+r.size+'</b> คน'+
       (r.host.wins?' • ★'+r.host.wins:'')+
      '</div>'+
     '</div>'+
     '<button class="room-join" data-join="'+r.id+'">เข้าร่วม</button>'+
     '</div>';
 });
 box.innerHTML=h;
}
$('roomsList').addEventListener('click',function(e){
 var b=e.target.closest('button[data-join]');
 if(!b)return;
 var me=CH[ACT];
 if(!me){toast('สร้างตัวละครก่อนนะ ✎');return;}
 var charData = strip(me);
 ensureWs().then(function(){
  wsSend({a:'joinRoom',id:b.dataset.join,char:charData});
 });
});

$('btnRefreshRooms').onclick=function(){renderRooms();};
$('tabRooms').onclick=function(){
 $('tabRooms').classList.add('on');$('tabCreate').classList.remove('on');
 $('roomsView').style.display='block';$('createView').style.display='none';
 renderRooms();
};
$('tabCreate').onclick=function(){
 $('tabCreate').classList.add('on');$('tabRooms').classList.remove('on');
 $('roomsView').style.display='none';$('createView').style.display='block';
 renderCreateBoss();
};

function renderCreateBoss(){
 var h='';
 Object.keys(BOSS_TYPES).forEach(function(t){
  var b=BOSS_TYPES[t];
  h+='<button class="boss-btn" data-cbt="'+t+'" style="border-color:'+b.color+';color:'+b.color+'">'+
     '<span>'+b.icon+'</span><span class="bname">'+b.n+'</span></button>';
 });
 $('createBossList').innerHTML=h;
}
$('createBossList').addEventListener('click',function(e){
 var b=e.target.closest('button[data-cbt]');
 if(!b)return;
 selectedRoomBossType=b.dataset.cbt;
});
document.querySelectorAll('button[data-cm]').forEach(function(btn){
 btn.onclick=function(){
  selectedRoomMode=btn.dataset.cm;
  document.querySelectorAll('button[data-cm]').forEach(function(b2){
   b2.classList.toggle('on',b2===btn);});
  $('createModeLabel').textContent='โหมด: '+modeLabel(selectedRoomMode);
  if(selectedRoomMode==='boss'){
   $('createBossPick').style.display='block';
   $('createBossList').style.display='flex';
  } else {
   $('createBossPick').style.display='none';
   $('createBossList').style.display='none';
  }
 };
});
document.querySelectorAll('button[data-cs]').forEach(function(btn){
 btn.onclick=function(){
  selectedRoomSize=parseInt(btn.dataset.cs)||2;
  document.querySelectorAll('button[data-cs]').forEach(function(b2){
   b2.classList.toggle('on',b2===btn);});
  $('createSizeLabel').textContent='จำนวนผู้เล่น: '+selectedRoomSize;
 };
});
$('btnCreateRoom').onclick=function(){
 var me=CH[ACT];
 if(!me){toast('สร้างตัวละครก่อนนะ ✎');return;}
 var charData = strip(me);
 var msg = {a:'createRoom', mode:selectedRoomMode, size:selectedRoomSize, char:charData};
 if(selectedRoomMode==='boss'){
  msg.boss = strip(makeBoss(selectedRoomBossType));
 }
 ensureWs().then(function(){
  wsSend(msg);
 }).catch(function(){toast('เชื่อมต่อไม่ได้');});
};
$('btnCancel').onclick=function(){
 if(currentRoomId){ wsSend({a:'leaveRoom'}); }
 currentRoomId=null;
 closeWs(false);$('wait').style.display='none';
};

function closeWs(notify){
 olState=0;
 if(pingT){clearInterval(pingT);pingT=null;}
 if(ws){if(notify)wsSend({a:'leave'});try{ws.close();}catch(e){}ws=null;}
 currentRoomId=null;
}

/* ===== Settings ===== */
function openSettings(){
 $('setName').value = ACC && ACC.name || '';
 $('setKey').value = ACC && ACC.keypass || '';
 if(ACC && ACC.avatar){
  $('setAvatar').innerHTML='<img src="'+ACC.avatar+'" alt="">';
 } else {
  $('setAvatar').textContent = ACC && ACC.name ? ACC.name.charAt(0).toUpperCase() : '?';
 }
 $('accountStatus').textContent = ACC && ACC.name ? ('✓ เข้าสู่ระบบเป็น '+ACC.name) : 'ยังไม่ได้เข้าสู่ระบบ';
 show('settings');
}
$('btnUpAvatar').onclick=function(){$('avatarFile').click();};
$('avatarFile').onchange=function(){
 var f=this.files[0];this.value='';if(!f)return;
 var fr=new FileReader();
 fr.onload=function(){
  var im=new Image();
  im.onload=function(){
   var cv=document.createElement('canvas');
   cv.width=cv.height=128;
   var cx=cv.getContext('2d');
   var sc=Math.max(128/im.width,128/im.height);
   var w=im.width*sc,h=im.height*sc;
   cx.drawImage(im,(128-w)/2,(128-h)/2,w,h);
   var url=cv.toDataURL('image/png');
   $('setAvatar').innerHTML='<img src="'+url+'" alt="">';
   $('setAvatar').dataset.url=url;
  };
  im.src=fr.result;
 };
 fr.readAsDataURL(f);
};
$('btnSaveAccount').onclick=function(){
 var name=$('setName').value.trim();
 var key=$('setKey').value.trim();
 if(!name || name.length<1){toast('ใส่ชื่อผู้ใช้');return;}
 if(!key || key.length!==6){toast('รหัสต้อง 6 ตัว');return;}
 var av=$('setAvatar').dataset.url || (ACC && ACC.avatar) || '';
 $('btnSaveAccount').disabled=true;
 $('accountStatus').textContent='⏳ กำลังบันทึก...';
 submitAccount(name,key,av).then(function(res){
  $('btnSaveAccount').disabled=false;
  if(res && res.ok){
   ACC={name:name, keypass:key, avatar:av||res.avatar||'', wins:res.wins||0};
   saveAccountLocal(ACC);
   $('accountStatus').textContent='✓ บันทึกสำเร็จ';
   toast('✓ เข้าสู่ระบบแล้ว');
   renderProfileCard();
   if(res.wins) submitWin(name, res.wins);
  } else {
   $('accountStatus').textContent='⚠ '+(res&&res.msg||'เกิดข้อผิดพลาด');
   toast('⚠ '+(res&&res.msg||'เกิดข้อผิดพลาด'));
  }
 }).catch(function(){
  $('btnSaveAccount').disabled=false;
  $('accountStatus').textContent='⚠ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้';
  toast('⚠ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
 });
};
$('btnRecover').onclick=function(){
 var name=$('recName').value.trim();
 var key=$('recKey').value.trim();
 if(!name || !key){toast('ใส่ชื่อและรหัส');return;}
 $('btnRecover').disabled=true;
 fetch('/account/login',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({name:name,keypass:key})})
  .then(function(r){return r.json();})
  .then(function(res){
   $('btnRecover').disabled=false;
   if(res && res.ok){
    ACC={name:res.name, keypass:key, avatar:res.avatar||'', wins:res.wins||0};
    saveAccountLocal(ACC);
    toast('✓ กู้คืนสำเร็จ');
    $('recName').value='';$('recKey').value='';
    openSettings();
    renderProfileCard();
   } else {
    toast('⚠ '+(res&&res.msg||'ไม่พบผู้ใช้หรือรหัสผิด'));
   }
  })
  .catch(function(){
   $('btnRecover').disabled=false;
   toast('⚠ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
  });
};

/* ===== ต่อสู้ ===== */
function spawnPositions(n){
 var cx=W/2,cy=H/2;
 var radius=Math.min(W,H)*0.35;
 var out=[];
 for(var i=0;i<n;i++){
  var a=Math.PI+(i/n)*Math.PI*2;
  out.push({
   x:cx+Math.cos(a)*radius,
   y:cy+Math.sin(a)*radius,
   vx:-Math.cos(a)*120,
   vy:-Math.sin(a)*120
  });
 }
 return out;
}
function mk(c,pos,index){
 var baseHp = c._hp || 100;
 if(!c._isBoss && !c._isEndlessBot && c._adminHp) baseHp = c._adminHp;
 var p = {c:c,index:index,alive:true,
  x:pos.x,y:pos.y,vx:pos.vx,vy:pos.vy,hp:baseHp,maxHp:baseHp,
  r: c._r || R,
  cd:c.skills.map(function(s){return s.cd*0.6;}),
  burnLeft:0,burnTick:0,burnDmg:0,
  burnSrc:null,freezeSrc:null,pullSrc:null,stunSrc:null,
  freezeLeft:0,pullLeft:0,stunLeft:0,stunTick:0,pullTarget:null,
  regenLeft:0,regenSrc:null,
  bleedLeft:0,bleedSrc:null,
  poisonLeft:0,poisonTick:0,poisonDmg:0,poisonSrc:null,
  lightLeft:0,lightTick:0,lightDmg:0,lightSrc:null,lightStunLeft:0,
  bouncing:false,bounce:null,
  dash:0,dashHit:false,dashK:0,dashChance:true,dashAng:0,dashCombo:null,
  flash:0,say:0,sayT:0,
  weaponCd:0,swingT:0,swingAng:0,
  luckyCd:0,
  lightPetCd:0,
  reserved:false,
  tx:undefined,ty:undefined};
 if(c._isBoss){
  p.suckCd = BOSS_SUCK_INTERVAL;
  p.suckActive = false;
  p.suckTimer = 0;
  p.suckPulls = {};
  p.suckDone = {};
  p.rageActive = false;
  p.rageCastTimer = BOSS_RAGE_CAST_INTERVAL;
  p.rageSkillIdx = 0;
  p.ragePulse = 0;
  p.bossDashCd = BOSS_DASH_INTERVAL;
  p.bossDashActive = false;
  p.bossDashWarnT = 0;
  p.bossDashWarnTarget = -1;
 }
 return p;
}
function renderHUD(){
 var h='';
 if(mode==='endless'){
  for(var i=0;i<B.players.length;i++){
   var p=B.players[i];
   if(p.isEndlessBot) continue;
   var pct=Math.max(0,Math.min(100, p.hp/p.maxHp*100));
   var cls='hb'+(i===B.myIndex?' me':'');
   h+='<div class="'+cls+'" data-hb="'+i+'">'+
      '<b>'+esc(p.c.name)+(i===B.myIndex?' ●':'')+'</b>'+
      '<div class="bar"><i style="width:'+pct+'%"></i></div>'+
      '<small>HP '+Math.round(p.hp*10)/10+' / '+p.maxHp+'</small>'+
      '</div>';
  }
  $('hud').innerHTML=h;
  $('endlessHUD').style.display='block';
  return;
 }
 $('endlessHUD').style.display='none';
 for(var i=0;i<B.players.length;i++){
  var p=B.players[i];
  if(p.reserved) continue;
  var pct=Math.max(0,Math.min(100, p.hp/p.maxHp*100));
  var cls='hb'+(i===B.myIndex?' me':'')+(p.c._isBoss?' boss':'');
  if(p.c._isBoss && p.rageActive) cls += ' rage';
  var label = esc(p.c.name)+(i===B.myIndex?' ●':'');
  if(p.c._isBoss && p.rageActive) label = '🔥 '+label;
  h+='<div class="'+cls+'" data-hb="'+i+'">'+
     '<b>'+label+'</b>'+
     '<div class="bar"><i style="width:'+pct+'%"></i></div>'+
     '<small>HP '+Math.round(p.hp*10)/10+' / '+p.maxHp+'</small>'+
     '</div>';
 }
 $('hud').innerHTML=h;
}
function updateHUD(){
 for(var i=0;i<B.players.length;i++){
  var p=B.players[i];
  if(p.reserved) continue;
  if(mode==='endless' && p.isEndlessBot) continue;
  var el=$('hud').querySelector('[data-hb="'+i+'"]');
  if(!el)continue;
  var pct=Math.max(0,Math.min(100, p.hp/p.maxHp*100));
  el.querySelector('.bar i').style.width=pct+'%';
  el.querySelector('small').textContent = p.alive ? ('HP '+Math.round(p.hp*10)/10+' / '+p.maxHp) : 'ตาย';
  el.style.opacity = p.alive ? '1' : '0.4';
  if(p.c._isBoss){
   if(p.rageActive) el.classList.add('rage');
   else el.classList.remove('rage');
  }
 }
 if(mode==='endless' && B.endless){
  $('endlessWave').textContent = 'คลื่นที่ '+B.endless.wave + (B.endless.isBossWave?' 👑':'') + (B.endless.isMiniBoss?' ⭐':'');
  var aliveBots = 0;
  for(var j=0;j<B.players.length;j++) if(B.players[j].isEndlessBot && B.players[j].alive) aliveBots++;
  $('endlessEnemies').textContent = aliveBots;
  $('endlessPts').textContent = B.endless.pointsEarned;
 }
}
function startBattle(m,chars,myIndex,r){
 mode=m;role=r||'host';
 wasOnlineGame = (m==='online') || (m==='boss' && olState>=3) || (m==='endless' && olState>=3);
 if(m==='boss'){ W=W_BOSS; H=H_BOSS; }
 else if(m==='endless'){ W=W_ENDLESS; H=H_ENDLESS; }
 else { W=360; H=520; }
 bc.width=W; bc.height=H;
 bc.style.maxWidth = Math.min(W, 900)+'px';
 $('battle').style.maxWidth = (Math.min(W, 900)+40)+'px';

 B={players:[],proj:[],zones:[],parts:[],hitFx:[],beams:[],rocks:[],dashExplosions:[],minions:[],gods:[],
    myIndex:myIndex||0,
    phase:'intro',introT:3.2,over:false,winner:-1,endT:0,done:false,time:0,
    bossDashWarn:null,
    timeStop:null};
 var positions=spawnPositions(chars.length);
 chars.forEach(function(c,i){ B.players.push(mk(c,positions[i],i)); });
 myName=B.players[B.myIndex].c.name||'';
 $('res').style.display='none';
 $('suckBox').style.display='none';
 $('waveBanner').style.display='none';
 guestSuckPress = 0;
 luckyRollReward = null;
 $('luckyRoll').style.display='none';
 updateLuckyBtnVisibility();
 renderHUD();
 show('battle');
 lastT=performance.now();sendT=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
}
function updateLuckyBtnVisibility(){
 var me = B && B.players[B.myIndex];
 var showLucky = me && me.c.weapon==='lucky' && me.alive && !B.over && !B.done;
 $('luckyBox').style.display = showLucky ? 'block' : 'none';
 if(!showLucky) $('luckyRoll').style.display='none';
}
function burst(x,y,color,n,spd){
 spd=spd||1;
 for(var i=0;i<n;i++){var a=Math.random()*6.283,s=(40+Math.random()*120)*spd;
  B.parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5+Math.random()*.4,color:color,size:2+Math.random()*3});}
}
function hurt(f,n){
 if(B.over||!f.alive||n<=0)return;
 f.hp=Math.max(0,f.hp-n);f.flash=.15;burst(f.x,f.y,'#ffffff',6,1);
 if(f.hp<=0){
  f.alive=false;
  burst(f.x,f.y,'#ff4d6d',40,1.6);
  if(mode==='endless' && f.isEndlessBot) return;
  checkWin();
 }
}
function heal(f,n){
 if(!f.alive||n<=0)return;
 f.hp=Math.min(f.maxHp,f.hp+n);
}
function findBoss(){
 for(var i=0;i<B.players.length;i++) if(B.players[i].c._isBoss && !B.players[i].reserved) return B.players[i];
 return null;
}
function isMinionObj(t){ return !!(t && !t.c); }
function hurtMinion(m, n, color){
 if(!m || !m.alive || n<=0) return;
 m.hp = Math.max(0, m.hp - n);
 m.flash = 0.2;
 burst(m.x, m.y, color||'#ffffff', 6, 1.2);
 if(m.hp <= 0){
  m.alive = false;
  burst(m.x, m.y, m.color||'#ff88cc', 16, 1.6);
  burst(m.x, m.y, '#ffffff', 8, 1.8);
  if(m.isGodMinion){
   var owner = B.players[m.owner];
   if(owner) owner.lightPetCd = GOD_MINION_CD;
  }
 }
}
function checkWin(){
 if(B.over)return;
 if(mode==='endless') return;
 if(mode==='boss'){
  var bossP=findBoss();
  var alivePlayers=B.players.filter(function(p){return !p.c._isBoss && !p.reserved && p.alive;});
  if(!bossP || !bossP.alive){ B.over=true; B.winner=-2; return; }
  if(alivePlayers.length===0){ B.over=true; B.winner=bossP.index; return; }
 } else {
  var alive=B.players.filter(function(p){return p.alive && !p.reserved;});
  if(alive.length<=1){
   B.over=true;
   B.winner=alive.length===1?alive[0].index:-1;
  }
 }
}
function nearestEnemy(f){
 var best=null,bestD=Infinity;
 var myIsBoss = !!(f.c && f.c._isBoss);
 var fIsBot = !!f.isEndlessBot;
 for(var i=0;i<B.players.length;i++){
  var o=B.players[i];
  if(o===f||!o.alive||o.reserved)continue;
  if(mode==='endless'){
   if(!!o.isEndlessBot === fIsBot) continue;
  } else if(mode==='boss'){
   if((!!o.c._isBoss) === myIsBoss) continue;
  }
  var d=Math.hypot(o.x-f.x,o.y-f.y);
  if(d<bestD){bestD=d;best=o;}
 }
 if(B.minions && B.minions.length){
  var myIdx = f.index;
  for(var mi=0;mi<B.minions.length;mi++){
   var m = B.minions[mi];
   if(!m.alive) continue;
   if(m.owner === myIdx) continue;
   var ownerP = B.players[m.owner];
   if(!ownerP || !ownerP.alive) continue;
   if(mode==='endless' && (!!ownerP.isEndlessBot) === fIsBot) continue;
   if(mode==='boss' && (!!ownerP.c._isBoss) === myIsBoss) continue;
   var dm = Math.hypot(m.x-f.x, m.y-f.y);
   if(dm<bestD){bestD=dm;best=m;}
  }
 }
 return best;
}
function getSlotImgs(f,k,slot){
 if(!f.c.skillSlotImgs||!f.c.skillSlotImgs[k])return null;
 var s=f.c.skillSlotImgs[k];
 return slot==='cast'?s.cast:s.status;
}
function castMeteor(f, k, target, imgsCast, imgsStatus){
 var count = 3;
 for(var i=0;i<count;i++){
  var offX = (i - (count-1)/2) * 70;
  var rx = target.x + offX + (Math.random()-0.5)*30;
  var ry = target.y + (Math.random()-0.5)*50;
  rx = Math.max(60, Math.min(W-60, rx));
  ry = Math.max(60, Math.min(H-60, ry));
  var fallT = 0.9 + i*0.18;
  B.rocks.push({
   k:'meteor',
   owner: f.index, x: rx, y: ry,
   r: 42,
   fallT: fallT, maxFallT: fallT,
   life: fallT + 0.4, maxLife: fallT + 0.4,
   dmg: 3, color: '#ff6a00',
   castImgs: imgsCast, statusImgs: imgsStatus,
   statusSrc: {owner:f.index, skill:k},
   hitSet:{}, hitDone:false,
   fireDuration:5, fireRadius:95, fireDmg:0.5
  });
 }
}
function castExplosiveDash(f, k, target){
 var a = Math.atan2(target.y-f.y, target.x-f.x);
 f.dash = 0.6; f.dashHit = false; f.dashK = k; f.dashAng = a;
 f.dashChance = true; f.dashCombo = 'explosive';
 var sp0 = 650;
 f.vx = Math.cos(a)*sp0; f.vy = Math.sin(a)*sp0;
 for(var i=0;i<14;i++){
  var da = a + Math.PI + (Math.random()-0.5)*0.8;
  B.parts.push({
   x:f.x, y:f.y,
   vx:Math.cos(da)*(100+Math.random()*180),
   vy:Math.sin(da)*(100+Math.random()*180),
   life:0.55+Math.random()*0.3, color:'#ff6a00', size:3+Math.random()*3
  });
 }
}
function castPetStone(f, k, target, imgsCast, imgsStatus){
 var rx = target.x + (Math.random()-0.5)*30;
 var ry = target.y + (Math.random()-0.5)*30;
 rx = Math.max(60, Math.min(W-60, rx));
 ry = Math.max(60, Math.min(H-60, ry));
 var fallT = 0.8;
 B.rocks.push({
  k:'petStone',
  owner: f.index, x: rx, y: ry,
  r: 44, fallT: fallT, maxFallT: fallT,
  life: fallT + 0.4, maxLife: fallT + 0.4,
  dmg: 2, color: '#ff88cc',
  castImgs: imgsCast, statusImgs: imgsStatus,
  statusSrc: {owner:f.index, skill:k},
  hitSet:{}, hitDone:false,
  spawnMinionCount: PET_STONE_MINION_COUNT,
  spawnMinionHp: PET_STONE_MINION_HP
 });
}
function castLightStone(f, k, target, imgsCast, imgsStatus){
 var rx = target.x + (Math.random()-0.5)*60;
 var ry = target.y + (Math.random()-0.5)*60;
 rx = Math.max(70, Math.min(W-70, rx));
 ry = Math.max(70, Math.min(H-70, ry));
 var fallT = 0.75;
 B.rocks.push({
  k:'holyLight',
  owner: f.index, x: rx, y: ry,
  r: 56, fallT: fallT, maxFallT: fallT,
  life: fallT + 0.3, maxLife: fallT + 0.3,
  dmg: 3, color: '#fff5c0',
  castImgs: imgsCast, statusImgs: imgsStatus,
  statusSrc: {owner:f.index, skill:k},
  hitSet:{}, hitDone:false,
  holyStun: HOLY_LIGHT_STUN
 });
}
function castLightningStone(f, k, target, imgsCast, imgsStatus){
 var cx = target.x, cy = target.y;
 for(var i=0; i<LIGHTNING_STONE_DROPS; i++){
  var rx, ry;
  if(i===0){
   rx = cx; ry = cy;
  } else {
   var da = Math.random()*Math.PI*2;
   var dd = 40 + Math.random()*200;
   rx = cx + Math.cos(da)*dd;
   ry = cy + Math.sin(da)*dd;
  }
  rx = Math.max(70, Math.min(W-70, rx));
  ry = Math.max(70, Math.min(H-70, ry));
  var fallT = 0.85 + i*0.08;
  B.rocks.push({
   k:'lightningStone',
   owner: f.index, x: rx, y: ry,
   r: 46, fallT: fallT, maxFallT: fallT,
   life: fallT + 0.3, maxLife: fallT + 0.3,
   dmg: 3, color: '#c8a2ff',
   castImgs: imgsCast, statusImgs: imgsStatus,
   statusSrc: {owner:f.index, skill:k},
   hitSet:{}, hitDone:false,
   lightningStun: LIGHTNING_STONE_STUN,
   fieldDur: (i===0) ? LIGHTNING_FIELD_DUR : 0
  });
 }
 burst(cx, cy, '#c8a2ff', 40, 2.0);
}
function castDarkHole(f, k, target, imgsCast, imgsStatus){
 var rx = Math.max(70, Math.min(W-70, target.x));
 var ry = Math.max(70, Math.min(H-70, target.y));
 B.zones.push({
  k:'dark', owner:f.index, x:rx, y:ry, ang:0,
  range: DARK_HOLE_RADIUS, arc: Math.PI*2,
  life: DARK_HOLE_DUR, maxLife: DARK_HOLE_DUR,
  dmg: DARK_HOLE_DMG, color:'#8a4aff',
  castImgs: imgsCast, statusImgs: imgsStatus,
  statusSrc: {owner:f.index, skill:k},
  hitSet:{}, tickInterval: DARK_HOLE_TICK, tickTimer: DARK_HOLE_TICK,
  pullForce: DARK_HOLE_PULL,
  exploded: false,
  explosionDmg: DARK_HOLE_EXPLODE_DMG
 });
 burst(rx, ry, '#8a4aff', 50, 2.2);
 burst(rx, ry, '#c08aff', 25, 2.4);
}
function castWaterWave(f, k, target, imgsCast, imgsStatus){
 var a = Math.atan2(target.y - f.y, target.x - f.x);
 var range = 180 + (f.c.skills[k].power||0.5) * 80;
 B.zones.push({
  k:'water', owner:f.index, x:f.x, y:f.y, ang:a,
  range: range, arc: 1.0,
  life: 0.5, maxLife: 0.5,
  dmg: WATER_DMG, color:'#4fc3f7',
  castImgs: imgsCast, statusImgs: imgsStatus,
  statusSrc: {owner:f.index, skill:k},
  hitSet:{}, pushForce: WATER_PUSH
 });
}
function castLightPet(f, k, target, imgsCast, imgsStatus){
 if(!B.minions) B.minions = [];
 B.minions = B.minions.filter(function(m){ return !(m.owner === f.index && m.isGodMinion); });
 var ang = Math.random()*Math.PI*2;
 var dist = f.r + 50;
 B.minions.push({
  id: ++MINION_ID, owner: f.index,
  x: f.x + Math.cos(ang)*dist, y: f.y + Math.sin(ang)*dist,
  vx: Math.cos(ang)*100, vy: Math.sin(ang)*100,
  r: 22,
  hp: GOD_MINION_HP, maxHp: GOD_MINION_HP, alive: true,
  attackCd: 0.6,
  dash: 0, dashAng: 0, dashHit: false, flash: 0,
  imgs: null, color: '#ffeaa7',
  isGodMinion: true
 });
 burst(f.x, f.y, '#ffeaa7', 60, 2.4);
 burst(f.x, f.y, '#fff5c0', 40, 2.2);
 burst(f.x, f.y, '#ffffff', 20, 2.6);
}
function castTimeStop(f){
 if(!B.timeStop) B.timeStop = {active:false, left:0, owner:-1};
 B.timeStop.active = true;
 B.timeStop.left = TIME_STOP_DUR;
 B.timeStop.owner = f.index;
 B.proj.forEach(function(p){
  if(!p.frozen){
   p.frozen = true;
   p.frozenVx = p.vx;
   p.frozenVy = p.vy;
   p.vx = 0; p.vy = 0;
  }
 });
 burst(f.x, f.y, '#8a4aff', 60, 2.6);
 burst(f.x, f.y, '#7fdcff', 50, 2.4);
 burst(f.x, f.y, '#ffffff', 25, 2.8);
 for(var i=0;i<32;i++){
  var a = i/32*6.283;
  B.parts.push({
   x:f.x + Math.cos(a)*40, y:f.y + Math.sin(a)*40,
   vx:Math.cos(a)*400, vy:Math.sin(a)*400,
   life:1.2, color: i%2===0?'#8a4aff':'#7fdcff', size:4+Math.random()*3
  });
 }
}
function spawnMinions(f, k){
 if(!B.minions) B.minions = [];
 B.minions = B.minions.filter(function(m){ return m.owner !== f.index; });
 var count = MINION_COUNT;
 var srcSkill = f.c.skills[k];
 for(var i=0;i<count;i++){
  var ang = (i/count)*Math.PI*2;
  var dist = f.r + 32;
  var ownerImgs = (f.c.minion && f.c.minion.imgs) ? f.c.minion.imgs : null;
  B.minions.push({
   id: ++MINION_ID, owner: f.index,
   x: f.x + Math.cos(ang)*dist, y: f.y + Math.sin(ang)*dist,
   vx: Math.cos(ang)*120, vy: Math.sin(ang)*120,
   r: Math.max(10, f.r * 0.55),
   hp: MINION_HP, maxHp: MINION_HP, alive: true,
   attackCd: 0.4 + Math.random()*0.6,
   dash: 0, dashAng: 0, dashHit: false, flash: 0,
   imgs: ownerImgs, color: srcSkill.color || '#ff88cc'
  });
 }
 burst(f.x, f.y, srcSkill.color, 40, 1.7);
 burst(f.x, f.y, '#ffffff', 16, 1.9);
}
function spawnBossMinion(f, k){
 if(!B.minions) B.minions = [];
 B.minions = B.minions.filter(function(m){ return m.owner !== f.index; });
 var ang = Math.random()*Math.PI*2;
 var dist = f.r + 56;
 B.minions.push({
  id: ++MINION_ID, owner: f.index,
  x: f.x + Math.cos(ang)*dist, y: f.y + Math.sin(ang)*dist,
  vx: Math.cos(ang)*180, vy: Math.sin(ang)*180,
  r: Math.max(16, f.r * 0.5),
  hp: BOSS_MINION_HP, maxHp: BOSS_MINION_HP, alive: true,
  attackCd: 1.0, skillCd: 1.5,
  dash: 0, dashAng: 0, dashHit: false, flash: 0,
  imgs: null, color: '#ff2244',
  isBossMinion: true, skillActive: false,
  skillActiveTimer: 0, skillTarget: -1, boltTick: 0
 });
 burst(f.x, f.y, '#c81e3c', 50, 2.0);
 burst(f.x, f.y, '#ff2244', 30, 2.2);
}
function spawnMinionsFromRock(rk){
 if(!B.minions) B.minions = [];
 var ownerP = B.players[rk.owner];
 var count = rk.spawnMinionCount || 1;
 var hpVal = rk.spawnMinionHp || PET_STONE_MINION_HP;
 var ownerImgs = (ownerP && ownerP.c.minion && ownerP.c.minion.imgs) ? ownerP.c.minion.imgs : null;
 for(var i=0;i<count;i++){
  var mAng = (i/Math.max(1,count))*Math.PI*2 + Math.random()*0.5;
  var mDist = rk.r + 34 + Math.random()*18;
  B.minions.push({
   id: ++MINION_ID, owner: rk.owner,
   x: rk.x + Math.cos(mAng)*mDist, y: rk.y + Math.sin(mAng)*mDist,
   vx: Math.cos(mAng)*100, vy: Math.sin(mAng)*100,
   r: Math.max(14, rk.r * 0.5),
   hp: hpVal, maxHp: hpVal, alive: true,
   attackCd: 0.5 + Math.random()*0.6,
   dash: 0, dashAng: 0, dashHit: false, flash: 0,
   imgs: ownerImgs, color: '#ff88cc', fromRock: true
  });
 }
 burst(rk.x, rk.y, '#ff88cc', 30, 1.7);
 burst(rk.x, rk.y, '#a89070', 22, 1.6);
}
function updMinions(dt){
 if(!B.minions || !B.minions.length) return;
 B.minions = B.minions.filter(function(m){
  var owner = B.players[m.owner];
  if(!owner || !owner.alive || !m.alive) return false;
  if(B.timeStop && B.timeStop.active && m.owner !== B.timeStop.owner){
   m.flash = Math.max(0, m.flash - dt*4);
   return true;
  }
  var target = null, bestD = Infinity;
  var ownerIsBot = !!owner.isEndlessBot;
  var ownerIsBoss = !!(owner.c && owner.c._isBoss);
  for(var i=0;i<B.players.length;i++){
   var p = B.players[i];
   if(!p.alive || p.reserved) continue;
   if(p.index === m.owner) continue;
   if(mode==='endless' && (!!p.isEndlessBot) === ownerIsBot) continue;
   if(mode==='boss' && (!!p.c._isBoss) === ownerIsBoss) continue;
   var d = Math.hypot(p.x-m.x, p.y-m.y);
   if(d<bestD){bestD=d;target=p;}
  }
  if(!target){ m.vx *= 0.9; m.vy *= 0.9; m.x += m.vx*dt; m.y += m.vy*dt; return true; }
  m.flash = Math.max(0, m.flash - dt*4);

  if(m.isGodMinion){
   var aG = Math.atan2(target.y-m.y, target.x-m.x);
   var dG = Math.hypot(target.x-m.x, target.y-m.y);
   var desiredDist = m.r + target.r + 6;
   if(dG > desiredDist + 20){
    m.vx += Math.cos(aG) * 520 * dt;
    m.vy += Math.sin(aG) * 520 * dt;
   }
   var spG = Math.hypot(m.vx, m.vy) || 1;
   if(spG > 260){ m.vx *= 260/spG; m.vy *= 260/spG; }
   m.vx *= 0.9; m.vy *= 0.9;
   m.x += m.vx*dt; m.y += m.vy*dt;
   if(m.x < m.r){m.x=m.r;m.vx=Math.abs(m.vx);}
   if(m.x > W-m.r){m.x=W-m.r;m.vx=-Math.abs(m.vx);}
   if(m.y < m.r){m.y=m.r;m.vy=Math.abs(m.vy);}
   if(m.y > H-m.r){m.y=H-m.r;m.vy=-Math.abs(m.vy);}
   m.attackCd -= dt;
   if(m.attackCd <= 0 && dG < m.r + target.r + 26){
    m.attackCd = 0.7;
    hurt(target, GOD_MINION_DMG);
    burst(target.x, target.y, '#ffeaa7', 34, 2.2);
    burst(target.x, target.y, '#fff5c0', 20, 2.4);
    burst(target.x, target.y, '#ffffff', 12, 2.6);
   }
   return true;
  }

  if(m.isBossMinion){
   var a = Math.atan2(target.y-m.y, target.x-m.x);
   var d2 = Math.hypot(target.x-m.x, target.y-m.y);
   if(d2 > m.r + target.r + 80){
    m.vx += Math.cos(a) * 160 * dt; m.vy += Math.sin(a) * 160 * dt;
   } else if(d2 < 130){
    m.vx -= Math.cos(a) * 140 * dt; m.vy -= Math.sin(a) * 140 * dt;
   } else {
    m.vx += Math.cos(a+Math.PI/2) * 100 * dt; m.vy += Math.sin(a+Math.PI/2) * 100 * dt;
   }
   var sp = Math.hypot(m.vx, m.vy) || 1;
   if(sp > 90){ m.vx *= 90/sp; m.vy *= 90/sp; }
   m.vx *= 0.95; m.vy *= 0.95;
   m.x += m.vx*dt; m.y += m.vy*dt;
   if(m.x < m.r){m.x=m.r;m.vx=Math.abs(m.vx);}
   if(m.x > W-m.r){m.x=W-m.r;m.vx=-Math.abs(m.vx);}
   if(m.y < m.r){m.y=m.r;m.vy=Math.abs(m.vy);}
   if(m.y > H-m.r){m.y=H-m.r;m.vy=-Math.abs(m.vy);}

   if(m.skillActive){
    m.skillActiveTimer -= dt;
    m.boltTick -= dt;
    var tgtP = B.players[m.skillTarget];
    if(!tgtP || !tgtP.alive || m.skillActiveTimer <= 0){
     m.skillActive = false; m.skillTarget = -1;
     m.skillCd = BOSS_MINION_BEAM_CD;
    } else if(m.boltTick <= 0){
     m.boltTick = BOSS_MINION_BOLT_TICK;
     hurt(tgtP, BOSS_MINION_BOLT_DMG);
     burst(tgtP.x, tgtP.y, '#c8a2ff', 8, 1.3);
    }
   } else {
    m.skillCd -= dt;
    if(m.skillCd <= 0 && d2 < BOSS_MINION_BOLT_RANGE){
     m.skillActive = true;
     m.skillActiveTimer = BOSS_MINION_BEAM_DUR;
     m.boltTick = 0;
     m.skillTarget = target.index;
    }
   }
   return true;
  }

  if(m.dash > 0){
   m.dash -= dt;
   m.x += m.vx*dt; m.y += m.vy*dt;
  } else {
   var a2 = Math.atan2(target.y-m.y, target.x-m.x);
   var d2b = Math.hypot(target.x-m.x, target.y-m.y);
   if(d2b > m.r + target.r + 30){
    m.vx += Math.cos(a2) * 480 * dt; m.vy += Math.sin(a2) * 480 * dt;
   }
   var sp2 = Math.hypot(m.vx, m.vy) || 1;
   if(sp2 > 200){ m.vx *= 200/sp2; m.vy *= 200/sp2; }
   m.vx *= 0.93; m.vy *= 0.93;
   m.x += m.vx*dt; m.y += m.vy*dt;
   m.attackCd -= dt;
   if(m.attackCd <= 0 && d2b < 220){
    m.attackCd = MINION_ATK_CD + Math.random()*0.4;
    m.dash = 0.3; m.dashAng = a2; m.dashHit = false;
    m.vx = Math.cos(a2) * MINION_DASH_SPD;
    m.vy = Math.sin(a2) * MINION_DASH_SPD;
   }
  }
  if(m.x < m.r){m.x=m.r;m.vx=Math.abs(m.vx);}
  if(m.x > W-m.r){m.x=W-m.r;m.vx=-Math.abs(m.vx);}
  if(m.y < m.r){m.y=m.r;m.vy=Math.abs(m.vy);}
  if(m.y > H-m.r){m.y=H-m.r;m.vy=-Math.abs(m.vy);}

  for(var j=0;j<B.players.length;j++){
   var p = B.players[j];
   if(!p.alive || p.reserved) continue;
   if(p.index === m.owner) continue;
   if(mode==='endless' && (!!p.isEndlessBot) === ownerIsBot) continue;
   if(mode==='boss' && (!!p.c._isBoss) === ownerIsBoss) continue;
   if(Math.hypot(p.x-m.x, p.y-m.y) < p.r + m.r){
    if(m.dash > 0 && !m.dashHit){
     m.dashHit = true;
     hurt(p, MINION_DMG);
     burst(p.x, p.y, m.color, 18, 1.5);
     m.hp -= 1; m.flash = 0.2;
     if(m.hp <= 0){ m.alive = false; burst(m.x, m.y, m.color, 14, 1.5); return false; }
     m.dash = 0; m.vx *= -0.5; m.vy *= -0.5;
    }
   }
  }
  return true;
 });
}

function cast(f,k){
 var s=f.c.skills[k];f.say=s.id;f.sayT=.7;
 var target=nearestEnemy(f);
 var combo = getCombo(f.c.skills);

 if(combo === 'timeStop' && (s.id === 'dark' || s.id === 'ice')){
  f.say = 'timeStop'; f.sayT = 1.4;
  castTimeStop(f);
  for(var ci=0; ci<f.c.skills.length; ci++) f.cd[ci] = TIME_STOP_CD;
  return TIME_STOP_CD;
 }
 if(combo === 'lightningStone' && (s.id === 'lightning' || s.id === 'stone')){
  if(!target) return;
  f.say = 'lightningStone'; f.sayT = 1;
  castLightningStone(f, k, target, getSlotImgs(f,k,'cast'), getSlotImgs(f,k,'status'));
  for(var ci=0; ci<f.c.skills.length; ci++) f.cd[ci] = LIGHTNING_STONE_CD;
  return LIGHTNING_STONE_CD;
 }
 if(combo === 'lightStone' && (s.id === 'light' || s.id === 'stone')){
  if(!target) return;
  f.say = 'lightStone'; f.sayT = 1;
  castLightStone(f, k, target, getSlotImgs(f,k,'cast'), getSlotImgs(f,k,'status'));
  return;
 }
 if(combo === 'petStone' && (s.id === 'pet' || s.id === 'stone')){
  if(!target) return;
  f.say = 'petStone'; f.sayT = 1;
  castPetStone(f, k, target, getSlotImgs(f,k,'cast'), getSlotImgs(f,k,'status'));
  return;
 }
 if(combo === 'meteor' && (s.id === 'fire' || s.id === 'stone')){
  if(!target) return;
  f.say = 'meteor'; f.sayT = 1;
  castMeteor(f, k, target, getSlotImgs(f,k,'cast'), getSlotImgs(f,k,'status'));
  return;
 }
 if(combo === 'explosiveDash' && (s.id === 'fire' || s.id === 'fist')){
  if(!target) return;
  f.say = 'explosiveDash'; f.sayT = 1;
  castExplosiveDash(f, k, target);
  return;
 }
 if(combo === 'lightPet' && (s.id === 'light' || s.id === 'pet')){
  if(f.lightPetCd > 0) return 1;
  if(!target) return;
  f.say = 'lightPet'; f.sayT = 1.2;
  castLightPet(f, k, target, getSlotImgs(f,k,'cast'), getSlotImgs(f,k,'status'));
  return;
 }

 if(s.id==='bossSummon'){ f.say='bossSummon'; f.sayT=1.2; spawnBossMinion(f, k); return; }
 if(s.id==='pet'){ f.say='pet'; f.sayT=1; spawnMinions(f, k); return; }
 if(!target)return;
 var a=Math.atan2(target.y-f.y,target.x-f.x);
 var imgsCast=getSlotImgs(f,k,'cast');
 var imgsStatus=getSlotImgs(f,k,'status');
 var skillSlotIdx=k;
 var targetIsMinion = isMinionObj(target);

 if(s.id==='dark'){
  f.say='dark'; f.sayT=1.2;
  castDarkHole(f, k, target, imgsCast, imgsStatus);
  return;
 }
 if(s.id==='water'){
  f.say='water'; f.sayT=0.8;
  castWaterWave(f, k, target, imgsCast, imgsStatus);
  return;
 }
 if(s.id==='fist'){
  f.dash=.55;f.dashHit=false;f.dashK=k;f.dashAng=a;
  f.dashChance=Math.random()<0.65;f.dashCombo=null;
  var sp0=560+s.power*400;
  f.vx=Math.cos(a)*sp0;f.vy=Math.sin(a)*sp0;
  return;
 }
 if(s.id==='fire'){
  B.zones.push({
   k:'fire',owner:f.index,x:f.x,y:f.y,ang:a,
   range:80+s.power*70,arc:1.4,
   life:0.5,maxLife:0.5,dmg:s.dmg,color:s.color,
   castImgs:imgsCast,statusImgs:imgsStatus,
   statusSrc:{owner:f.index,skill:skillSlotIdx},hitSet:{}
  });
  return;
 }
 if(s.id==='blood'){
  B.zones.push({
   k:'blood',owner:f.index,x:f.x,y:f.y,ang:a,
   range:60+s.power*45,arc:0.95,
   life:0.42,maxLife:0.42,dmg:s.dmg,color:s.color,
   castImgs:imgsCast,statusImgs:imgsStatus,
   statusSrc:{owner:f.index,skill:skillSlotIdx},hitSet:{}
  });
  return;
 }
 if(s.id==='stone'){
  var nRocks = 5;
  var placed = [];
  for(var ri=0;ri<nRocks;ri++){
   var rx,ry;
   if(ri===0){ rx=target.x; ry=target.y; }
   else if(ri<3){
    var da=Math.random()*Math.PI*2;
    var dd=40+Math.random()*Math.min(W,H)*0.25;
    rx=target.x+Math.cos(da)*dd; ry=target.y+Math.sin(da)*dd;
   } else {
    var tries=0;
    do{
     rx=60+Math.random()*(W-120); ry=60+Math.random()*(H-120); tries++;
    } while(tries<10 && placed.some(function(p){return Math.hypot(p.x-rx,p.y-ry)<70;}));
   }
   rx=Math.max(50,Math.min(W-50,rx)); ry=Math.max(50,Math.min(H-50,ry));
   placed.push({x:rx,y:ry});
   var fallT=0.55+Math.random()*0.55;
   B.rocks.push({
    owner:f.index, x:rx, y:ry, r:34+s.power*22,
    fallT:fallT, maxFallT:fallT, life:1.5, maxLife:1.5,
    dmg:5.5, color:s.color,
    castImgs:imgsCast, statusImgs:imgsStatus,
    statusSrc:{owner:f.index, skill:skillSlotIdx},
    hitSet:{}, hitDone:false
   });
  }
  return;
 }
 if(s.id==='light'){
  B.players.forEach(function(o){
   if(o===f||!o.alive||o.reserved)return;
   if(mode==='endless' && (!!o.isEndlessBot) === (!!f.isEndlessBot)) return;
   if(mode==='boss' && (!!o.c._isBoss) === (!!f.c._isBoss)) return;
   o.lightDmg=Math.max(o.lightDmg||0, LIGHT_DOT);
   o.lightLeft=600; o.lightTick=0;
   o.lightSrc={owner:f.index, skill:skillSlotIdx};
   o.flash=0.3;
   burst(o.x, o.y, s.color, 26, 1.5);
  });
  if(B.minions){
   B.minions.forEach(function(m){
    if(!m.alive || m.owner === f.index) return;
    var ownerP = B.players[m.owner];
    if(!ownerP) return;
    if(mode==='endless' && (!!ownerP.isEndlessBot) === (!!f.isEndlessBot)) return;
    if(mode==='boss' && (!!ownerP.c._isBoss) === (!!f.c._isBoss)) return;
    hurtMinion(m, s.dmg, s.color);
   });
  }
  for(var si=0;si<36;si++){
   var sa=si/36*6.283;
   B.parts.push({x:f.x, y:f.y, vx:Math.cos(sa)*300, vy:Math.sin(sa)*300, life:0.75, color:s.color, size:3});
  }
  return;
 }
 if(s.id==='lightning'){
  hurt(target, s.dmg);
  if(!targetIsMinion){
   target.stunLeft = STUN_DUR;
   target.stunTick = STUN_TICK;
   target.stunSrc = {owner:f.index, skill:skillSlotIdx};
   B.beams = B.beams.filter(function(bb){ return !(bb.owner===f.index && bb.target===target.index); });
   B.beams.push({
    k:'lightning', owner:f.index, target:target.index,
    life:BEAM_DUR, maxLife:BEAM_DUR,
    color:s.color||'#c8a2ff',
    statusSrc:{owner:f.index, skill:skillSlotIdx},
    castImgs: imgsCast, statusImgs: imgsStatus,
    born: performance.now()
   });
  }
  burst(target.x, target.y, '#c8a2ff', 30, 1.7);
  spawnHitFx(target.x, target.y, imgsCast, s.color, target.r*3.2);
  return;
 }
 var sp,r;
 if(s.id==='ice'){sp=290+s.power*120;r=6+s.power*14;}
 else{sp=240+s.power*120;r=12+s.power*16;}
 B.proj.push({k:s.id,owner:f.index,
  x:f.x+Math.cos(a)*f.r,y:f.y+Math.sin(a)*f.r,
  vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
  r:r,dmg:s.dmg,power:s.power,color:s.color,ang:a,life:4,
  castImgs:imgsCast,statusImgs:imgsStatus,
  statusSrc:{owner:f.index,skill:skillSlotIdx},trail:[]});
}
function spawnHitFx(x,y,imgs,color,size){
 if(!imgs||!imgs.length)return;
 var valid=imgs.filter(function(im){return im&&im.width;});
 if(!valid.length)return;
 B.hitFx.push({x:x,y:y,imgs:valid,start:performance.now(),dur:450,size:size||R*3,color:color||'#fff'});
}
function applyPoison(f, dur, dmg){
 if(!f.alive)return;
 if(f.poisonLeft<=0) f.poisonTick=0;
 f.poisonLeft = Math.max(f.poisonLeft, dur);
 f.poisonDmg  = Math.max(f.poisonDmg||0, dmg);
}
function hitBy(p,t){
 if(p.k==='card'){
  var sid = p.cardSkill;
  var srcP = B.players[p.owner];
  if(sid==='fire'){
   hurt(t,p.dmg);t.burnLeft=BURN_DUR;t.burnTick=0;
   t.burnDmg=Math.max(0.5,roundHalf(p.dmg*0.5));
   t.burnSrc={owner:p.owner,skill:0};
   burst(t.x,t.y,'#ff8a00',20,1.4);
  } else if(sid==='ice'){
   hurt(t,p.dmg);t.freezeLeft=FLOAT_DUR;
   t.vx*=0.2;t.vy*=0.2;
   burst(t.x,t.y,'#7fdcff',22,1.5);
  } else if(sid==='wind'){
   hurt(t,p.dmg);t.pullLeft=PULL_DUR;
   t.pullTarget=srcP||null;
   burst(t.x,t.y,'#9ff2c0',20,1.5);
  } else if(sid==='lightning'){
   hurt(t,p.dmg);t.stunLeft=STUN_DUR;t.stunTick=STUN_TICK;
   burst(t.x,t.y,'#c8a2ff',30,1.8);
  } else if(sid==='stone'){
   hurt(t,p.dmg+2.5);
   burst(t.x,t.y,'#a89070',22,1.7);
  } else if(sid==='light'){
   hurt(t,p.dmg);t.lightDmg=LIGHT_DOT;t.lightLeft=600;t.lightTick=0;
   burst(t.x,t.y,'#fff5c0',22,1.6);
  } else if(sid==='blood'){
   hurt(t,p.dmg);t.bleedLeft=1.6;
   if(srcP && srcP.alive){ srcP.regenLeft=BLOOD_REGEN_DUR; }
   burst(t.x,t.y,'#c81e3c',22,1.5);
  } else if(sid==='dark'){
   hurt(t,p.dmg);
   burst(t.x,t.y,'#8a4aff',24,1.7);
  } else if(sid==='water'){
   hurt(t,p.dmg);
   var src = srcP||t;
   var wx = t.x - src.x, wy = t.y - src.y;
   var wd = Math.hypot(wx, wy) || 1;
   t.vx += (wx/wd) * WATER_PUSH;
   t.vy += (wy/wd) * WATER_PUSH;
   burst(t.x,t.y,'#4fc3f7',22,1.8);
  } else if(sid==='fist'){
   hurt(t,p.dmg+1);
   burst(t.x,t.y,'#ffd166',22,1.7);
  } else {
   hurt(t,p.dmg);
  }
  return;
 }
 if(p.k==='fire'){
  hurt(t,p.dmg);t.burnLeft=BURN_DUR;t.burnTick=0;
  t.burnDmg=Math.max(0.5,roundHalf(p.dmg*0.5));
  t.burnSrc=p.statusSrc;
  burst(t.x,t.y,'#ff8a00',18,1.3);
 } else if(p.k==='ice'){
  hurt(t,p.dmg);t.freezeLeft=FLOAT_DUR;
  t.freezeSrc=p.statusSrc;
  t.vx*=0.2;t.vy*=0.2;
  burst(t.x,t.y,'#7fdcff',20,1.4);
 } else if(p.k==='wind'){
  hurt(t,p.dmg);t.pullLeft=PULL_DUR;
  t.pullTarget=B.players[p.owner]||null;
  t.pullSrc=p.statusSrc;
  burst(t.x,t.y,'#9ff2c0',18,1.4);
 } else if(p.k==='bullet'){
  hurt(t,p.dmg||0.7);
  burst(t.x,t.y,'#ffdd66',6,1.2);
  return;
 } else if(p.k==='poison'){
  hurt(t, p.dmg||1);
  applyPoison(t, p.poisonDur||5, p.poisonDmg||0.2);
  burst(t.x,t.y,'#88ff44',10,1.3);
  return;
 } else hurt(t,p.dmg);
 spawnHitFx(t.x,t.y,p.castImgs,p.color,t.r*2.6);
}
function updParts(dt){
 B.parts=B.parts.filter(function(p){
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.94;p.vy*=0.94;p.life-=dt;return p.life>0;});
}
function bounceWallHit(f){
 if(!f.bouncing||!f.bounce)return;
 f.bounce.remaining--;
 hurt(f,FIST_BOUNCE_DMG);
 burst(f.x,f.y,'#ffd166',14,1.4);
 if(f.bounce.fxImgs&&f.bounce.fxImgs.length){
  spawnHitFx(f.x,f.y,f.bounce.fxImgs,f.bounce.color,f.r*3);
 }
 if(f.bounce.remaining<=0){f.bouncing=false;f.bounce=null;f.vx*=0.2;f.vy*=0.2;}
}
function useWeapon(f,dt){
 if(f.c.weapon==='none'||!f.c.weapon)return;
 if(f.c.weapon==='lucky') return;
 f.weaponCd-=dt;
 if(f.weaponCd>0)return;
 if(f.bouncing||f.stunLeft>0||f.lightStunLeft>0)return;
 var target=nearestEnemy(f);
 if(!target)return;
 var w=WEAPONS[f.c.weapon];
 if(!w)return;
 var scaleR = f.r / R;
 var isBossSword = !!f.c._isBoss && f.c.weapon==='sword';
 var targetIsMinion = isMinionObj(target);

 if(f.c.weapon==='katana'){
  var katRange = w.range * scaleR;
  var dK = Math.hypot(target.x-f.x, target.y-f.y);
  if(dK > katRange) return;
  var aK = Math.atan2(target.y-f.y, target.x-f.x);
  f.weaponCd = w.cd;
  f.swingT = 0.2;
  f.swingAng = aK + (Math.random()-0.5)*0.4;
  f.say = 'katana'; f.sayT = 0.2;
  hurt(target, w.dmg);
  burst(target.x, target.y, '#ff2244', 14, 2.2);
  burst(target.x, target.y, '#ffffff', 8, 2.5);
  burst(target.x, target.y, '#ffd166', 6, 2.8);
  if(!targetIsMinion){
   B.beams.push({
    k:'katana', owner:f.index, target:target.index,
    life:0.25, maxLife:0.25, color:'#ff2244'
   });
  }
  return;
 }
 if(f.c.weapon==='sword'){
  var swordRange = w.range * scaleR * (isBossSword ? 1.15 : 1);
  var d=Math.hypot(target.x-f.x,target.y-f.y);
  if(d>swordRange)return;
  var a=Math.atan2(target.y-f.y,target.x-f.x);
  f.weaponCd = isBossSword ? BOSS_KATANA_CD : w.cd;
  f.swingT = isBossSword ? 0.45 : 0.3;
  f.swingAng = a;
  f.say='sword';f.sayT= isBossSword ? 0.5 : 0.35;
  var dmg = isBossSword ? BOSS_KATANA_DMG : w.dmg;
  hurt(target, dmg);
  if(isBossSword){
   burst(target.x,target.y,'#ff2244',34,2.2);
   burst(target.x,target.y,'#ffd166',18,2.4);
   var kb=520;
   if(!targetIsMinion){ target.vx+=Math.cos(a)*kb*0.6; target.vy+=Math.sin(a)*kb*0.6; }
  } else {
   burst(target.x,target.y,'#ffffff',14,1.4);
   var kb2=140;
   if(!targetIsMinion){ target.vx+=Math.cos(a)*kb2*0.4; target.vy+=Math.sin(a)*kb2*0.4; }
  }
  if(!targetIsMinion){
   B.beams.push({
    k:'sword', owner:f.index, target:target.index,
    life: isBossSword ? 0.5 : 0.28,
    maxLife: isBossSword ? 0.5 : 0.28,
    color: isBossSword ? '#ff2244' : '#ffffff',
    boss: isBossSword
   });
  }
 } else if(f.c.weapon==='gun'){
  var a2=Math.atan2(target.y-f.y,target.x-f.x);
  f.weaponCd=w.cd; f.say='gun';f.sayT=0.25;
  B.proj.push({
   k:'bullet', owner:f.index,
   x:f.x+Math.cos(a2)*f.r,y:f.y+Math.sin(a2)*f.r,
   vx:Math.cos(a2)*w.speed,vy:Math.sin(a2)*w.speed,
   r:3, dmg:w.dmg, power:0.3, color:'#ffdd66', ang:a2, life:2,
   castImgs:null,statusImgs:null,statusSrc:null,trail:[],weapon:true
  });
 } else if(f.c.weapon==='poisonGun'){
  var a3=Math.atan2(target.y-f.y,target.x-f.x);
  f.weaponCd=w.cd; f.say='poisonGun';f.sayT=0.3;
  B.proj.push({
   k:'poison', owner:f.index,
   x:f.x+Math.cos(a3)*f.r, y:f.y+Math.sin(a3)*f.r,
   vx:Math.cos(a3)*w.speed, vy:Math.sin(a3)*w.speed,
   r:5, dmg:w.dmg, power:0.3, color:w.color, ang:a3, life:2.4,
   poisonDur:w.poisonDur, poisonDmg:w.poisonDmg,
   castImgs:null,statusImgs:null,statusSrc:null,trail:[],weapon:true
  });
 }
}
function endlessBotAI(f, dt){
 if(f.dash>0 || f.bouncing || f.stunLeft>0 || f.lightStunLeft>0) return;
 if(f.c && f.c._isBoss){
  var sp = Math.hypot(f.vx, f.vy) || 1;
  var targetSpd = 340;
  var ns = sp + (targetSpd - sp) * Math.min(1, dt * 1.5);
  f.vx *= ns / sp;
  f.vy *= ns / sp;
  return;
 }
 var tgt = nearestEnemy(f);
 var desiredVx = 0, desiredVy = 0;
 if(tgt){
  var d = Math.hypot(tgt.x-f.x, tgt.y-f.y);
  var a = Math.atan2(tgt.y-f.y, tgt.x-f.x);
  var pref = f.r + tgt.r + 70;
  if(d > pref + 30){
   var spd = 190;
   desiredVx = Math.cos(a) * spd;
   desiredVy = Math.sin(a) * spd;
  } else if(d < pref - 30){
   var spd2 = 120;
   desiredVx = -Math.cos(a) * spd2;
   desiredVy = -Math.sin(a) * spd2;
  } else {
   var strafe = 150;
   desiredVx = -Math.sin(a) * strafe;
   desiredVy = Math.cos(a) * strafe;
  }
 }
 var jitter = 40;
 desiredVx += (Math.sin(B.time*3 + f.index*1.7)) * jitter;
 desiredVy += (Math.cos(B.time*2.4 + f.index*2.3)) * jitter;

 var k = Math.min(1, dt * 5);
 f.vx += (desiredVx - f.vx) * k;
 f.vy += (desiredVy - f.vy) * k;
}
function updOnePlayer(f,dt){
 if(!f.alive)return;
 if(f.reserved) return;
 if(B.timeStop && B.timeStop.active && f.index !== B.timeStop.owner){
  f.flash = Math.max(0, f.flash - dt);
  if(f.sayT > 0) f.sayT = Math.max(0, f.sayT - dt);
  return;
 }
 if(f.dash<=0 && f.dashCombo && f.dashCombo !== 'bossDash') f.dashCombo = null;
 if(f.bossDashActive && f.dash <= 0) f.bossDashActive = false;
 if(f.lightPetCd > 0) f.lightPetCd = Math.max(0, f.lightPetCd - dt);

 if(f.c._isBoss && mode==='boss' && !f.rageActive && f.hp <= f.maxHp*BOSS_RAGE_THRESHOLD){
  f.rageActive = true;
  f.rageCastTimer = 0.2;
  f.suckActive = false;
  f.cd = f.cd.map(function(){return 0.1;});
  burst(f.x, f.y, '#ff2244', 90, 2.6);
  burst(f.x, f.y, '#ffd166', 50, 2.2);
 }

 if(f.c._isBoss && mode==='boss' && !f.rageActive){
  if(!f.suckActive){
   f.suckCd -= dt;
   if(f.suckCd <= 0){
    f.suckCd = BOSS_SUCK_INTERVAL;
    f.suckActive = true;
    f.suckTimer = BOSS_SUCK_DUR;
    f.suckPulls = {}; f.suckDone = {};
    f.cd = f.cd.map(function(){return 1.2;});
    burst(f.x, f.y, '#ff3355', 40, 1.8);
   }
  } else {
   f.suckTimer -= dt;
   var prog = 1 - Math.max(0, f.suckTimer)/BOSS_SUCK_DUR;
   B.players.forEach(function(p){
    if(p.c._isBoss || !p.alive || p.reserved) return;
    if(f.suckDone[p.index] === 'escaped') return;
    var dx = f.x - p.x, dy = f.y - p.y;
    var d = Math.hypot(dx, dy) || 1;
    if(d > p.r + f.r + 2){
     var force = BOSS_SUCK_PULL * (1 + prog*0.8);
     p.vx += (dx/d) * force * dt;
     p.vy += (dy/d) * force * dt;
     p.vx *= 0.97; p.vy *= 0.97;
    }
   });
   if(f.suckTimer <= 0){
    B.players.forEach(function(p){
     if(p.c._isBoss || !p.alive || p.reserved) return;
     if(f.suckDone[p.index] === 'escaped') return;
     hurt(p, BOSS_BITE_DMG);
     burst(p.x, p.y, '#c81e3c', 30, 1.7);
     f.suckDone[p.index] = 'bitten';
     p.flash = 0.5;
    });
    f.suckActive = false;
   }
  }
 }

 if(f.c._isBoss && mode==='boss' && !f.bossDashActive && f.dash <= 0){
  if(f.bossDashWarnT > 0){
   f.bossDashWarnT -= dt;
   if(f.bossDashWarnT <= 0){
    var target = B.players[f.bossDashWarnTarget];
    if(target && target.alive && !target.c._isBoss){
     var la = Math.atan2(target.y-f.y, target.x-f.x);
     f.dash = 0.7; f.dashHit = false; f.dashK = 0; f.dashAng = la;
     f.dashChance = true; f.dashCombo = 'bossDash'; f.bossDashActive = true;
     var sp0 = 850;
     f.vx = Math.cos(la)*sp0; f.vy = Math.sin(la)*sp0;
     f.say = 'bossDash'; f.sayT = 0.8;
     burst(f.x, f.y, '#ff2244', 40, 2.2);
    }
    f.bossDashWarnT = 0;
    f.bossDashWarnTarget = -1;
   }
  } else {
   f.bossDashCd -= dt;
   if(f.bossDashCd <= 0){
    f.bossDashCd = BOSS_DASH_INTERVAL;
    var players = B.players.filter(function(p){ return !p.c._isBoss && p.alive && !p.reserved; });
    if(players.length){
     var tgt = players[Math.floor(Math.random()*players.length)];
     f.bossDashWarnT = 0.7;
     f.bossDashWarnTarget = tgt.index;
     B.bossDashWarn = { from: f.index, to: tgt.index, t: 0.7, maxT: 0.7 };
    }
   }
  }
 }
 if(B.bossDashWarn){
  B.bossDashWarn.t -= dt;
  if(B.bossDashWarn.t <= 0) B.bossDashWarn = null;
 }

 if(f.dash>0)f.dash-=dt;
 if(f.swingT>0)f.swingT-=dt;
 f.flash=Math.max(0,f.flash-dt);f.sayT=Math.max(0,f.sayT-dt);
 if(f.luckyCd>0) f.luckyCd -= dt;

 if(f.c._isBoss && f.rageActive){
  f.ragePulse = (f.ragePulse||0) + dt;
  if(Math.random()<0.9){
   var ra=Math.random()*6.283, rd=f.r*1.1+Math.random()*12;
   B.parts.push({
    x:f.x+Math.cos(ra)*rd, y:f.y+Math.sin(ra)*rd,
    vx:(Math.random()-0.5)*60, vy:-40-Math.random()*80,
    life:0.6+Math.random()*0.3,
    color: Math.random()<0.5?'#ff2244':'#ffd166', size:3+Math.random()*3
   });
  }
 }

 if(f.stunLeft>0){
  f.stunLeft-=dt;
  f.stunTick-=dt;
  if(f.stunTick<=0){
   f.stunTick=STUN_TICK; hurt(f,STUN_DMG);
   burst(f.x, f.y, '#c8a2ff', 4, 1.4);
  }
 }

 if(f.lightStunLeft>0){
  f.lightStunLeft-=dt;
  f.vx=0; f.vy=0;
 }

 if(f.lightLeft>0 && f.lightDmg>0){
  f.lightLeft-=dt;
  f.lightTick+=dt;
  if(f.lightTick>=LIGHT_TICK){
   f.lightTick-=LIGHT_TICK;
   hurt(f, f.lightDmg);
  }
 }

 if(f.regenLeft>0){
  f.regenLeft-=dt;
  heal(f, BLOOD_REGEN_PER_SEC*dt);
 }
 if(f.bleedLeft>0) f.bleedLeft-=dt;
 if(f.poisonLeft>0){
  f.poisonLeft-=dt;
  f.poisonTick+=dt;
  if(f.poisonTick>=POISON_TICK){
   f.poisonTick-=POISON_TICK;
   hurt(f, f.poisonDmg);
  }
 }

 var fr_=f.r;
 if(f.bouncing&&f.bounce){
  f.x+=f.vx*dt;f.y+=f.vy*dt;
  if(f.x<fr_){f.x=fr_;f.vx=Math.abs(f.vx);bounceWallHit(f);}
  else if(f.x>W-fr_){f.x=W-fr_;f.vx=-Math.abs(f.vx);bounceWallHit(f);}
  if(f.y<fr_){f.y=fr_;f.vy=Math.abs(f.vy);bounceWallHit(f);}
  else if(f.y>H-fr_){f.y=H-fr_;f.vy=-Math.abs(f.vy);bounceWallHit(f);}
 } else {
  if(f.burnLeft>0){
   f.burnLeft-=dt;f.burnTick+=dt;
   if(f.burnTick>=0.5){ f.burnTick-=0.5;hurt(f,f.burnDmg); }
  }
  if(f.freezeLeft>0){
   f.freezeLeft-=dt;
   f.vx*=0.8;f.vy*=0.8;
  }
  if(f.pullLeft>0){
   f.pullLeft-=dt;
   if(f.pullTarget&&f.pullTarget.alive){
    var dxp=f.pullTarget.x-f.x,dyp=f.pullTarget.y-f.y;
    var dp=Math.hypot(dxp,dyp)||1;
    f.vx+=dxp/dp*280*dt; f.vy+=dyp/dp*280*dt;
   }
  }
  if(f.lightStunLeft > 0){
   f.vx = 0; f.vy = 0;
  } else if(f.isEndlessBot){
   endlessBotAI(f, dt);
  } else {
   var sp=Math.hypot(f.vx,f.vy)||1,tg=BASE;
   if(f.dash<=0){var ns=sp+(tg-sp)*Math.min(1,dt*2.2);f.vx*=ns/sp;f.vy*=ns/sp;}
  }
  f.x+=f.vx*dt;f.y+=f.vy*dt;
  if(f.x<fr_){f.x=fr_;f.vx=Math.abs(f.vx);}
  if(f.x>W-fr_){f.x=W-fr_;f.vx=-Math.abs(f.vx);}
  if(f.y<fr_){f.y=fr_;f.vy=Math.abs(f.vy);}
  if(f.y>H-fr_){f.y=H-fr_;f.vy=-Math.abs(f.vy);}
 }

 if(f.lightStunLeft <= 0){
  useWeapon(f,dt);
  var adminCdMult = f.c._adminCdMult || 1;
  if(f.c._isBoss && f.rageActive){
   f.rageCastTimer -= dt;
   if(f.rageCastTimer <= 0){
    f.rageCastTimer = BOSS_RAGE_CAST_INTERVAL;
    if(!f.bouncing && f.c.skills.length){
     cast(f, f.rageSkillIdx % f.c.skills.length);
     f.rageSkillIdx = (f.rageSkillIdx + 1) % f.c.skills.length;
    }
   }
   for(var kr=0;kr<f.c.skills.length;kr++) f.cd[kr] = 0.5;
  } else {
   for(var k=0;k<f.c.skills.length;k++){
    f.cd[k]-=dt;
    if(f.cd[k]<=0&&!f.bouncing){
     if(f.c._isBoss && f.suckActive){ f.cd[k]=0.4; }
     else {
      var cdOverride = cast(f,k);
      var finalCd = (typeof cdOverride === 'number') ? cdOverride : f.c.skills[k].cd;
      if(!f.c._isBoss && !f.c._isEndlessBot && adminCdMult !== 1){
       finalCd *= adminCdMult;
      }
      f.cd[k] = finalCd;
     }
    }
   }
  }
 } else {
  for(var k2=0;k2<f.c.skills.length;k2++) f.cd[k2]-=dt;
 }
}
function checkPair(a,b){
 if(!a.alive||!b.alive)return;
 if(a.reserved||b.reserved)return;
 if(a.bouncing||b.bouncing)return;
 if(B.timeStop && B.timeStop.active){
  if(a.index!==B.timeStop.owner && b.index!==B.timeStop.owner) return;
 }
 var dx2=b.x-a.x,dy2=b.y-a.y,d=Math.hypot(dx2,dy2)||1;
 var minD = a.r + b.r;
 if(d>=minD)return;
 var nx=dx2/d,ny=dy2/d,ov=minD-d;
 a.x-=nx*ov/2;a.y-=ny*ov/2;b.x+=nx*ov/2;b.y+=ny*ov/2;
 var va=a.vx*nx+a.vy*ny,vb=b.vx*nx+b.vy*ny;
 if(va-vb>0){
  var relSpd=Math.abs(va-vb);
  a.vx+=(vb-va)*nx;a.vy+=(vb-va)*ny;
  b.vx+=(va-vb)*nx;b.vy+=(va-vb)*ny;
  if(relSpd>180){
   var cxm=(a.x+b.x)/2,cym=(a.y+b.y)/2;
   burst(cxm,cym,'#ffffff',5,1);
   burst(cxm,cym,'#8ea0ff',3,1.3);
  }
 }
 [[a,b],[b,a]].forEach(function(pr){
  var f=pr[0],o=pr[1];
  if(f.dash>0&&!f.dashHit){
   f.dashHit=true;
   if(f.dashChance){
    var s=f.c.skills[f.dashK];
    if(f.dashCombo === 'bossDash'){
     hurt(o, BOSS_DASH_DMG);
     burst(o.x,o.y,'#ff2244',44,2.2);
     var kb=680;
     o.vx=Math.cos(f.dashAng)*kb; o.vy=Math.sin(f.dashAng)*kb;
     f.dash=0;f.vx*=0.2;f.vy*=0.2;
     f.bossDashActive=false;
     if(B.bossDashWarn){ B.bossDashWarn = null; }
    } else if(f.dashCombo === 'explosive'){
     hurt(o, 2);
     burst(o.x,o.y,'#ff6a00',30,1.7);
     if(!B.dashExplosions) B.dashExplosions = [];
     B.dashExplosions.push({
      x:o.x, y:o.y, target:o.index, owner:f.index,
      remaining:4, timer:0.15, interval:0.15, dmg:2, color:'#ff6a00'
     });
     o.bouncing=true;
     o.bounce={remaining:FIST_BOUNCE_N,fxImgs:[],color:'#ff6a00'};
     var kb2=520;
     o.vx=Math.cos(f.dashAng)*kb2; o.vy=Math.sin(f.dashAng)*kb2;
     f.dash=0;f.vx*=0.2;f.vy*=0.2;
    } else {
     hurt(o,s.dmg);
     var hi=getSlotImgs(f,f.dashK,'status')||[];
     o.bouncing=true;
     o.bounce={remaining:FIST_BOUNCE_N,fxImgs:hi,color:s.color};
     var kb3=420+s.power*300;
     o.vx=Math.cos(f.dashAng)*kb3; o.vy=Math.sin(f.dashAng)*kb3;
     f.dash=0;f.vx*=0.2;f.vy*=0.2;
    }
   } else { f.dash=0; }
  }
 });
 if(mode!=='boss'){
  if(a.poisonLeft>0 && b.poisonLeft<=0){ applyPoison(b, 5, a.poisonDmg||0.2); }
  if(b.poisonLeft>0 && a.poisonLeft<=0){ applyPoison(a, 5, b.poisonDmg||0.2); }
 }
}
function checkPlayerMinionHits(){
 if(!B.minions || !B.minions.length) return;
 for(var pi=0; pi<B.players.length; pi++){
  var f = B.players[pi];
  if(!f.alive || f.reserved) continue;
  if(f.dash <= 0 || f.dashHit) continue;
  for(var mi=0; mi<B.minions.length; mi++){
   var m = B.minions[mi];
   if(!m.alive || m.owner === f.index) continue;
   var ownerP = B.players[m.owner];
   if(!ownerP || !ownerP.alive) continue;
   if(mode==='endless' && (!!ownerP.isEndlessBot) === (!!f.isEndlessBot)) continue;
   if(mode==='boss' && (!!ownerP.c._isBoss) === (!!f.c._isBoss)) continue;
   if(Math.hypot(f.x-m.x, f.y-m.y) < f.r + m.r){
    f.dashHit = true;
    var s = f.c.skills[f.dashK];
    if(f.dashCombo === 'bossDash'){
     hurtMinion(m, BOSS_DASH_DMG, '#ff2244');
    } else if(f.dashCombo === 'explosive'){
     hurtMinion(m, 2, '#ff6a00');
    } else {
     hurtMinion(m, s ? s.dmg : FIST_BOUNCE_DMG, s ? s.color : '#ffd166');
    }
    f.dash = 0; f.vx *= 0.2; f.vy *= 0.2;
    if(f.dashCombo === 'bossDash'){ f.bossDashActive = false; if(B.bossDashWarn) B.bossDashWarn = null; }
    break;
   }
  }
 }
}
function spawnGod(rk){
 if(!B.gods) B.gods = [];
 var aimT = null, aimD = Infinity;
 B.players.forEach(function(tg){
  if(!tg.alive || tg.index === rk.owner || tg.reserved) return;
  var srcR = B.players[rk.owner];
  if(!srcR) return;
  if(mode==='endless' && (!!tg.isEndlessBot) === (!!srcR.isEndlessBot)) return;
  if(mode==='boss' && (!!tg.c._isBoss) === (!!srcR.c._isBoss)) return;
  var dd = Math.hypot(tg.x-rk.x, tg.y-rk.y);
  if(dd < aimD){ aimD = dd; aimT = tg; }
 });
 var dirX = 0, dirY = 1;
 if(aimT){
  var adx = aimT.x - rk.x, ady = aimT.y - rk.y;
  var ad = Math.hypot(adx, ady) || 1;
  dirX = adx/ad; dirY = ady/ad;
 }
 B.gods.push({
  x: rk.x, y: rk.y, owner: rk.owner,
  life: GOD_LIFE, maxLife: GOD_LIFE,
  punchT: GOD_PUNCH_T, punchDone: false,
  punchRadius: GOD_PUNCH_RADIUS, punchDmg: GOD_PUNCH_DMG,
  punchDirX: dirX, punchDirY: dirY, hitSet: {}
 });
}
function spawnLightningField(rk){
 if(!B.zones) B.zones = [];
 B.zones.push({
  k:'lightningField',
  isLightningField: true,
  owner: rk.owner, x: rk.x, y: rk.y,
  ang: 0, range: LIGHTNING_FIELD_RADIUS, arc: Math.PI,
  life: rk.fieldDur || LIGHTNING_FIELD_DUR,
  maxLife: rk.fieldDur || LIGHTNING_FIELD_DUR,
  dmg: LIGHTNING_FIELD_TICK_DMG,
  color: '#c8a2ff',
  castImgs: null, statusImgs: null,
  statusSrc: rk.statusSrc,
  hitSet: {},
  tickInterval: LIGHTNING_FIELD_TICK,
  tickTimer: LIGHTNING_FIELD_TICK
 });
 burst(rk.x, rk.y, '#c8a2ff', 60, 2.4);
 burst(rk.x, rk.y, '#ffffff', 30, 2.6);
}
var BOT_VARIANT_COLORS = [
 {body:'#4a7cc7', accent:'#8ec0ff', eye:'#ffffff'},
 {body:'#c74a7c', accent:'#ff8ec0', eye:'#ffffff'},
 {body:'#4ac77c', accent:'#8effc0', eye:'#ffffff'},
 {body:'#c7a04a', accent:'#ffd68e', eye:'#ffffff'},
 {body:'#8a4ac7', accent:'#c08eff', eye:'#ffffff'},
 {body:'#c74a4a', accent:'#ff8e8e', eye:'#ffffff'},
 {body:'#4ac7c7', accent:'#8effff', eye:'#ffffff'},
 {body:'#7a7a7a', accent:'#c0c0c0', eye:'#ffffff'},
 {body:'#c77a4a', accent:'#ffb88e', eye:'#ffffff'},
 {body:'#4a4a7a', accent:'#8e8ec0', eye:'#ffffff'}
];
function endlessBotFrame(variant, k){
 var c=newCanvas(),x=c.getContext('2d');
 var cfg = BOT_VARIANT_COLORS[variant % BOT_VARIANT_COLORS.length];
 var g=x.createRadialGradient(S/2,S/2,6,S/2,S/2,S*0.65);
 g.addColorStop(0, cfg.body);
 g.addColorStop(1, '#0a0a18');
 x.fillStyle=g; x.fillRect(0,0,S,S);
 x.shadowColor = cfg.accent; x.shadowBlur = 8;
 x.fillStyle = cfg.accent;
 for(var i=0;i<6;i++){
  var ang = i/6*6.283 + variant*0.3;
  var px = S/2 + Math.cos(ang)*S*0.42;
  var py = S/2 + Math.sin(ang)*S*0.42;
  x.beginPath();
  x.moveTo(px, py-7); x.lineTo(px+6, py); x.lineTo(px, py+7); x.lineTo(px-6, py);
  x.closePath(); x.fill();
 }
 x.shadowBlur = 0;
 if(k===0){
  x.fillStyle = cfg.eye;
  x.beginPath();x.arc(34,44,7,0,7);x.fill();
  x.beginPath();x.arc(62,44,7,0,7);x.fill();
  x.fillStyle='#000';
  x.beginPath();x.arc(34,44,3,0,7);x.fill();
  x.beginPath();x.arc(62,44,3,0,7);x.fill();
 } else {
  x.strokeStyle = cfg.eye; x.lineWidth=3;
  x.beginPath();x.moveTo(28,44);x.lineTo(40,44);x.stroke();
  x.beginPath();x.moveTo(56,44);x.lineTo(68,44);x.stroke();
 }
 x.fillStyle='#000';
 x.beginPath();
 if(variant%3===0){ x.arc(S/2, 70, 10, 0, Math.PI); }
 else if(variant%3===1){ x.rect(36,68,24,6); }
 else { x.moveTo(34,68); x.lineTo(62,68); x.lineTo(58,76); x.lineTo(38,76); }
 x.closePath(); x.fill();
 return c.toDataURL('image/png');
}
function makeEndlessBot(waveNum, variantIdx, isMiniBoss, isBoss){
 if(isBoss){
  var bossKey = ELEMENT_BOSS_KEYS[Math.floor(Math.random()*ELEMENT_BOSS_KEYS.length)];
  var bc = makeBoss(bossKey);
  bc._hp = Math.floor(bc._hp * (1 + Math.floor(waveNum/50)*0.35));
  bc.name = '👑 '+bc.name+' W'+waveNum;
  bc._isEndlessBot = true;
  return bc;
 }
 if(isMiniBoss){
  var v = variantIdx % BOT_VARIANT_COLORS.length;
  var skillPool = Object.keys(SK).filter(function(id){ return id!=='pet' && id!=='bossSummon' && id!=='god'; });
  var s1 = skillPool[Math.floor(Math.random()*skillPool.length)];
  var s2 = skillPool[Math.floor(Math.random()*skillPool.length)];
  if(s1===s2) s2 = skillPool[(skillPool.indexOf(s1)+1)%skillPool.length];
  var miniHp = 50 + waveNum * 12;
  return {
   name: '⭐ มินิบอส W'+waveNum,
   frames: [endlessBotFrame(v, 0), endlessBotFrame(v, 1)],
   wins: 0, weapon: 'sword',
   _isEndlessBot: true, _botVariant: v,
   _hp: miniHp, _r: 38,
   skills: [s1,s2].map(function(id){
    var d=defSkill(id);
    d.dmg = roundHalf(Math.min(5.5, d.dmg * (1 + waveNum*0.04)));
    d.power = roundTenth(0.6 + Math.random()*0.4);
    return d;
   })
  };
 }
 var v2 = variantIdx % BOT_VARIANT_COLORS.length;
 var hp = 30 + (waveNum-1) * 6;
 var pool = Object.keys(SK).filter(function(id){ return id!=='pet' && id!=='bossSummon' && id!=='god'; });
 var sk1 = pool[Math.floor(Math.random()*pool.length)];
 var sk2 = pool[Math.floor(Math.random()*pool.length)];
 if(sk1===sk2) sk2 = pool[(pool.indexOf(sk1)+1)%pool.length];
 return {
  name: 'บอท',
  frames: [endlessBotFrame(v2, 0), endlessBotFrame(v2, 1)],
  wins: 0,
  weapon: Math.random()<0.4 ? 'sword' : 'none',
  _isEndlessBot: true, _botVariant: v2,
  _hp: hp, _r: 24,
  skills: [sk1,sk2].map(function(id){
   var d=defSkill(id);
   d.dmg = roundHalf(Math.min(4.5, d.dmg * (1 + waveNum*0.025)));
   d.power = roundTenth(0.4 + Math.random()*0.5);
   return d;
  })
 };
}
function endlessWaveCount(waveNum){
 if(waveNum === 1) return 1;
 if(waveNum === 2) return 2;
 if(waveNum === 3) return 4;
 if(waveNum === 4) return 8;
 var c = 8 + Math.floor((waveNum-4) * 1.5);
 return Math.min(16, c);
}
function startEndlessSolo(){
 var me=CH[ACT]; if(!me){ toast('สร้างตัวละครก่อนนะ ✎'); return; }
 var placeholders = [];
 for(var i=0;i<ENDLESS_MAX_BOTS;i++){
  var bot = makeEndlessBot(1, i, false, false);
  placeholders.push(bot);
 }
 Promise.all([me].concat(placeholders).map(prepChar)).then(function(prepped){
  startBattle('endless', prepped, 0, 'host');
  B.endless = {
   wave: 0, state: 'idle', timer: 0, pointsEarned: 0,
   isMiniBoss: false, isBossWave: false, nextVariantSeed: 0
  };
  for(var i=1;i<B.players.length;i++){
   B.players[i].isEndlessBot = true;
   B.players[i].reserved = true;
   B.players[i].alive = false;
  }
  startNextWave();
 });
}
function startNextWave(){
 if(!B || !B.endless) return;
 var st = B.endless;
 st.wave++;
 st.isMiniBoss = (st.wave % 10 === 0) && (st.wave % 50 !== 0);
 st.isBossWave = (st.wave % 50 === 0);
 st.state = 'intro';
 st.timer = ENDLESS_INTRO_TIME;

 var botCount = endlessWaveCount(st.wave);
 var bonusBots = st.isMiniBoss ? 3 : 0;
 var bossBots = st.isBossWave ? 4 : 0;
 var totalSlots = botCount + bonusBots + bossBots;
 totalSlots = Math.min(totalSlots, ENDLESS_MAX_BOTS);

 var realPlayers = [];
 for(var i=0;i<B.players.length;i++){
  if(!B.players[i].isEndlessBot) realPlayers.push(B.players[i]);
 }
 var realPlayerCount = realPlayers.length;

 function edgeSpawn(idx, total){
  var margin = 90;
  var side = idx % 4;
  var t = ((idx / Math.max(1, total)) + 0.13) % 1;
  if(side === 0) return {x: margin + t*(W-2*margin), y: margin};
  if(side === 1) return {x: W - margin, y: margin + t*(H-2*margin)};
  if(side === 2) return {x: W - margin - t*(W-2*margin), y: H - margin};
  return {x: margin, y: H - margin - t*(H-2*margin)};
 }

 var spawnList = [];
 if(st.isBossWave){
  for(var b=0;b<bossBots;b++) spawnList.push({isBoss:false, isMiniBoss:false, variant:st.nextVariantSeed++});
  spawnList.push({isBoss:true, isMiniBoss:false, variant:0});
 } else if(st.isMiniBoss){
  for(var m=0;m<bonusBots;m++) spawnList.push({isMiniBoss:false, variant:st.nextVariantSeed++});
  spawnList.push({isMiniBoss:true, variant:st.nextVariantSeed++});
 } else {
  for(var k=0;k<botCount;k++) spawnList.push({isMiniBoss:false, variant:st.nextVariantSeed++});
 }

 var currentSpawnList = spawnList.slice(0, ENDLESS_MAX_BOTS);
 Promise.all(currentSpawnList.map(function(cfg){
  var newBot = makeEndlessBot(st.wave, cfg.variant, cfg.isMiniBoss, cfg.isBoss);
  return prepChar(newBot).then(function(){ return newBot; });
 })).then(function(newBots){
  var total = Math.min(newBots.length, ENDLESS_MAX_BOTS);
  for(var i=0;i<total;i++){
   var p = B.players[realPlayerCount + i];
   if(!p) break;
   var botChar = newBots[i];
   var pos = edgeSpawn(i, total);
   p.c = botChar;
   p.isEndlessBot = true;
   p.reserved = false;
   p.alive = true;
   p.hp = botChar._hp;
   p.maxHp = botChar._hp;
   p.r = botChar._r || 24;
   p.x = pos.x; p.y = pos.y;
   if(botChar._isBoss){
    var ballAng = Math.random()*Math.PI*2;
    p.vx = Math.cos(ballAng) * 340;
    p.vy = Math.sin(ballAng) * 340;
   } else {
    var toCenterAng = Math.atan2(H/2 - pos.y, W/2 - pos.x);
    var initSp = 90 + Math.random()*60;
    p.vx = Math.cos(toCenterAng) * initSp;
    p.vy = Math.sin(toCenterAng) * initSp;
   }
   p.cd = botChar.skills.map(function(s){ return s.cd * 0.5; });
   p.burnLeft = 0; p.freezeLeft = 0; p.pullLeft = 0; p.stunLeft = 0;
   p.poisonLeft = 0; p.lightLeft = 0; p.lightStunLeft = 0;
   p.bouncing = false; p.bounce = null; p.dash = 0; p.dashCombo = null;
   p.flash = 0; p.sayT = 0;
   p.weaponCd = 0;
  }
  for(var j=realPlayerCount + total; j<B.players.length; j++){
   B.players[j].reserved = true;
   B.players[j].alive = false;
  }
  st.state = 'fight';
  showWaveBanner('คลื่นที่ ' + st.wave,
   st.isBossWave ? '👑 บอสใหญ่!' : (st.isMiniBoss ? '⭐ มินิบอส!' : 'ศัตรู: ' + total + ' ตัว'));
 });
}
function showWaveBanner(text, sub){
 var el = $('waveBanner');
 el.innerHTML = esc(text) + (sub ? '<small>' + esc(sub) + '</small>' : '');
 el.style.display = 'block';
 clearTimeout(showWaveBanner.t);
 showWaveBanner.t = setTimeout(function(){ el.style.display = 'none'; }, 1800);
}
function step(dt){
 B.time+=dt;

 if(B.timeStop && B.timeStop.active){
  B.timeStop.left -= dt;
  if(B.timeStop.left <= 0){
   B.timeStop.active = false;
   B.proj.forEach(function(p){
    if(p.frozen){
     p.frozen = false;
     var src = B.players[p.owner];
     if(src){
      var nearest = null, nearestD = Infinity;
      B.players.forEach(function(o){
       if(o.index === src.index || !o.alive || o.reserved) return;
       if(mode==='endless' && (!!o.isEndlessBot) === (!!src.isEndlessBot)) return;
       if(mode==='boss' && (!!o.c._isBoss) === (!!src.c._isBoss)) return;
       var d = Math.hypot(o.x-p.x, o.y-p.y);
       if(d < nearestD){ nearestD = d; nearest = o; }
      });
      if(nearest){
       var a = Math.atan2(nearest.y-p.y, nearest.x-p.x);
       var sp = Math.hypot(p.frozenVx, p.frozenVy) || 380;
       p.vx = Math.cos(a)*sp;
       p.vy = Math.sin(a)*sp;
       p.ang = a;
      } else {
       p.vx = p.frozenVx;
       p.vy = p.frozenVy;
      }
     } else {
      p.vx = p.frozenVx;
      p.vy = p.frozenVy;
     }
     burst(p.x, p.y, '#c8a2ff', 8, 1.8);
     burst(p.x, p.y, '#ffffff', 4, 2.0);
    }
   });
   burst(W/2, H/2, '#7fdcff', 60, 2.6);
   burst(W/2, H/2, '#ffffff', 30, 2.8);
  }
 }

 if(mode==='endless' && B.endless && !B.over){
  var st = B.endless;
  if(st.state === 'intro'){
   st.timer -= dt;
   if(st.timer <= 0) st.state = 'fight';
  } else if(st.state === 'fight'){
   var aliveBots = 0;
   var alivePlayers = 0;
   for(var i=0;i<B.players.length;i++){
    var p = B.players[i];
    if(!p.alive) continue;
    if(p.isEndlessBot) aliveBots++;
    else alivePlayers++;
   }
   if(aliveBots === 0){
    st.state = 'clear';
    st.timer = ENDLESS_CLEAR_TIME;
    var pts = Math.min(Math.pow(2, st.wave), 100000);
    st.pointsEarned += pts;
    for(var i2=0;i2<B.players.length;i2++){
     var p2 = B.players[i2];
     if(p2.isEndlessBot) continue;
     if(p2.alive){
      var healAmt = p2.maxHp * 0.5;
      p2.hp = Math.min(p2.maxHp, p2.hp + healAmt);
      burst(p2.x, p2.y, '#88ff44', 30, 1.8);
     } else {
      p2.alive = true;
      p2.hp = p2.maxHp * 0.5;
      p2.x = W/2 + (Math.random()-0.5)*140;
      p2.y = H/2 + (Math.random()-0.5)*140;
      p2.vx = 0; p2.vy = 0;
      p2.burnLeft = 0; p2.freezeLeft = 0; p2.pullLeft = 0; p2.stunLeft = 0;
      p2.poisonLeft = 0; p2.lightLeft = 0; p2.lightStunLeft = 0;
      p2.bouncing = false; p2.bounce = null; p2.dash = 0; p2.dashCombo = null;
      p2.flash = 0; p2.sayT = 0; p2.weaponCd = 0;
      p2.cd = p2.c.skills.map(function(s){ return s.cd * 0.5; });
      burst(p2.x, p2.y, '#88ff44', 50, 2.2);
      burst(p2.x, p2.y, '#ffffff', 25, 2.4);
     }
    }
    showWaveBanner('ผ่านคลื่น ' + st.wave + '!', '+' + pts + ' คะแนน • ฟื้น HP 50%');
    if(ACC && ACC.name){
     addWinsForName(ACC.name, pts);
     if(!ACC.wins) ACC.wins = 0;
     ACC.wins += pts;
     saveAccountLocal(ACC);
     renderProfileCard();
    } else {
     var myCh = CH[ACT];
     if(myCh){ addWinsForName(myCh.name, pts); }
    }
   }
   if(alivePlayers === 0){
    B.over = true;
    B.winner = -1;
    B.endlessFinalPoints = st.pointsEarned;
    B.endlessFinalWave = st.wave;
   }
  } else if(st.state === 'clear'){
   st.timer -= dt;
   if(st.timer <= 0){ startNextWave(); }
  }
 }
 if(B.phase==='intro'){B.introT-=dt;if(B.introT<=0)B.phase='fight';updParts(dt);return;}
 if(!B.over){
  for(var i=0;i<B.players.length;i++){
   var p = B.players[i];
   if(p.reserved) continue;
   updOnePlayer(p, dt);
  }
  for(var i2=0;i2<B.players.length;i2++){
   if(B.players[i2].reserved) continue;
   for(var j=i2+1;j<B.players.length;j++){
    if(B.players[j].reserved) continue;
    checkPair(B.players[i2],B.players[j]);
   }
  }
  checkPlayerMinionHits();
  updMinions(dt);
  if(B.gods){
   B.gods = B.gods.filter(function(g){
    g.life -= dt;
    if(g.life <= 0) return false;
    var elapsed = g.maxLife - g.life;
    if(!g.punchDone && elapsed >= g.punchT){
     g.punchDone = true;
     B.players.forEach(function(tg){
      if(!tg.alive || tg.reserved) return;
      if(tg.index === g.owner) return;
      if(g.hitSet[tg.index]) return;
      var srcG = B.players[g.owner];
      if(!srcG) return;
      if(mode==='endless' && (!!tg.isEndlessBot) === (!!srcG.isEndlessBot)) return;
      if(mode==='boss' && (!!tg.c._isBoss) === (!!srcG.c._isBoss)) return;
      if(Math.hypot(tg.x-g.x, tg.y-g.y) < g.punchRadius + tg.r){
       g.hitSet[tg.index] = true;
       hurt(tg, g.punchDmg);
       burst(tg.x, tg.y, '#fff5c0', 40, 2.2);
      }
     });
     if(B.minions){
      B.minions.forEach(function(m){
       if(!m.alive || m.owner === g.owner) return;
       var oP = B.players[m.owner];
       if(!oP || !oP.alive) return;
       var srcG2 = B.players[g.owner];
       if(!srcG2) return;
       if(mode==='endless' && (!!oP.isEndlessBot) === (!!srcG2.isEndlessBot)) return;
       if(mode==='boss' && (!!oP.c._isBoss) === (!!srcG2.c._isBoss)) return;
       if(Math.hypot(m.x-g.x, m.y-g.y) < g.punchRadius + m.r){
        var mk = 'm'+m.id;
        if(g.hitSet[mk]) return;
        g.hitSet[mk] = true;
        hurtMinion(m, g.punchDmg, '#fff5c0');
       }
      });
     }
    }
    return true;
   });
  }
 }
 B.rocks = B.rocks.filter(function(rk){
  rk.fallT -= dt;
  rk.life -= dt;
  if(rk.fallT <= 0 && !rk.hitDone){
   rk.hitDone = true;
   if(rk.k === 'holyLight'){
    B.players.forEach(function(tg){
     if(!tg.alive || tg.reserved) return;
     if(tg.index === rk.owner) return;
     var srcR = B.players[rk.owner];
     if(!srcR) return;
     if(mode==='endless' && (!!tg.isEndlessBot) === (!!srcR.isEndlessBot)) return;
     if(mode==='boss' && (!!tg.c._isBoss) === (!!srcR.c._isBoss)) return;
     if(Math.hypot(tg.x-rk.x, tg.y-rk.y) < rk.r + tg.r + 20){
      tg.stunLeft = Math.max(tg.stunLeft||0, rk.holyStun || HOLY_LIGHT_STUN);
      tg.stunTick = STUN_TICK;
      tg.stunSrc = rk.statusSrc;
      burst(tg.x, tg.y, '#fff5c0', 34, 1.8);
     }
    });
    spawnGod(rk);
   } else if(rk.k === 'lightningStone'){
    B.players.forEach(function(tg){
     if(!tg.alive || tg.reserved) return;
     if(tg.index === rk.owner) return;
     var srcR = B.players[rk.owner];
     if(!srcR) return;
     if(mode==='endless' && (!!tg.isEndlessBot) === (!!srcR.isEndlessBot)) return;
     if(mode==='boss' && (!!tg.c._isBoss) === (!!srcR.c._isBoss)) return;
     if(Math.hypot(tg.x-rk.x, tg.y-rk.y) < rk.r + tg.r + 30){
      tg.stunLeft = Math.max(tg.stunLeft||0, rk.lightningStun || LIGHTNING_STONE_STUN);
      tg.stunTick = STUN_TICK;
      tg.stunSrc = rk.statusSrc;
      burst(tg.x, tg.y, '#c8a2ff', 30, 1.9);
     }
    });
    if(rk.fieldDur > 0) spawnLightningField(rk);
   } else {
    B.players.forEach(function(tg){
     if(!tg.alive || tg.reserved) return;
     if(tg.index === rk.owner) return;
     if(rk.hitSet[tg.index]) return;
     var srcR = B.players[rk.owner];
     if(!srcR) return;
     if(mode==='endless' && (!!tg.isEndlessBot) === (!!srcR.isEndlessBot)) return;
     if(mode==='boss' && (!!tg.c._isBoss) === (!!srcR.c._isBoss)) return;
     if(Math.hypot(tg.x-rk.x, tg.y-rk.y) < rk.r + tg.r){
      rk.hitSet[tg.index] = true;
      hurt(tg, rk.dmg);
      burst(tg.x, tg.y, rk.color, 26, 1.5);
      if(rk.castImgs) spawnHitFx(tg.x, tg.y, rk.castImgs, rk.color, tg.r*3.2);
     }
    });
    if(B.minions){
     B.minions.forEach(function(m){
      if(!m.alive || m.owner === rk.owner) return;
      var key = 'm'+m.id;
      if(rk.hitSet[key]) return;
      var ownerP = B.players[m.owner];
      if(!ownerP || !ownerP.alive) return;
      var srcR2 = B.players[rk.owner];
      if(!srcR2) return;
      if(mode==='endless' && (!!ownerP.isEndlessBot) === (!!srcR2.isEndlessBot)) return;
      if(mode==='boss' && (!!ownerP.c._isBoss) === (!!srcR2.c._isBoss)) return;
      if(Math.hypot(m.x-rk.x, m.y-rk.y) < rk.r + m.r){
       rk.hitSet[key] = true;
       hurtMinion(m, rk.dmg, rk.color);
      }
     });
    }
    var bi;
    for(bi=0;bi<14;bi++){
     var ba=Math.random()*6.283;
     B.parts.push({x:rk.x, y:rk.y, vx:Math.cos(ba)*160, vy:Math.sin(ba)*160,
      life:0.5, color:rk.color, size:3+Math.random()*3});
    }
    if(rk.k === 'meteor'){
     B.zones.push({
      k:'fire', owner:rk.owner, x:rk.x, y:rk.y, ang:0,
      range: rk.fireRadius || 90, arc: Math.PI,
      life: rk.fireDuration || 5, maxLife: rk.fireDuration || 5,
      dmg: rk.fireDmg || 0.5, color:'#ff6a00',
      castImgs: null, statusImgs: null,
      statusSrc: rk.statusSrc,
      hitSet:{}, tickInterval:0.5, tickTimer:0.5
     });
    }
    if(rk.k === 'petStone'){ spawnMinionsFromRock(rk); }
   }
  }
  return rk.life > 0;
 });
 B.zones=B.zones.filter(function(z){
  z.life-=dt;

  if(z.k==='dark'){
   var srcD = B.players[z.owner];
   if(srcD){
    B.players.forEach(function(tg){
     if(!tg.alive || tg.reserved) return;
     if(tg.index === z.owner) return;
     if(tg.bouncing) return;
     if(mode==='endless' && (!!tg.isEndlessBot) === (!!srcD.isEndlessBot)) return;
     if(mode==='boss' && (!!tg.c._isBoss) === (!!srcD.c._isBoss)) return;
     var dxD = z.x - tg.x, dyD = z.y - tg.y;
     var dD = Math.hypot(dxD, dyD) || 1;
     if(dD > tg.r + 5 && dD < z.range * 3){
      var forceD = (z.pullForce||0) * (1 - Math.min(1, dD/(z.range*3)));
      tg.vx += (dxD/dD) * forceD * dt;
      tg.vy += (dyD/dD) * forceD * dt;
     }
    });
    if(B.minions){
     B.minions.forEach(function(m){
      if(!m.alive || m.owner === z.owner) return;
      var ownerM = B.players[m.owner];
      if(!ownerM || !ownerM.alive) return;
      if(mode==='endless' && (!!ownerM.isEndlessBot) === (!!srcD.isEndlessBot)) return;
      if(mode==='boss' && (!!ownerM.c._isBoss) === (!!srcD.c._isBoss)) return;
      var dxDm = z.x - m.x, dyDm = z.y - m.y;
      var dDm = Math.hypot(dxDm, dyDm) || 1;
      if(dDm > m.r + 5 && dDm < z.range * 3){
       var forceDm = (z.pullForce||0) * 0.6 * (1 - Math.min(1, dDm/(z.range*3)));
       m.vx += (dxDm/dDm) * forceDm * dt;
       m.vy += (dyDm/dDm) * forceDm * dt;
      }
     });
    }
   }
  }

  if(z.tickInterval){
   z.tickTimer -= dt;
   if(z.tickTimer <= 0){
    z.tickTimer = z.tickInterval;
    z.hitSet = {};
   }
  }

  if(z.life<=0){
   if(z.k==='dark' && !z.exploded){
    z.exploded = true;
    var srcE = B.players[z.owner];
    if(srcE){
     B.players.forEach(function(tg){
      if(!tg.alive || tg.reserved) return;
      if(tg.index === z.owner) return;
      if(mode==='endless' && (!!tg.isEndlessBot) === (!!srcE.isEndlessBot)) return;
      if(mode==='boss' && (!!tg.c._isBoss) === (!!srcE.c._isBoss)) return;
      if(Math.hypot(tg.x - z.x, tg.y - z.y) < z.range + tg.r){
       hurt(tg, z.explosionDmg || DARK_HOLE_EXPLODE_DMG);
       burst(tg.x, tg.y, '#8a4aff', 45, 2.6);
       burst(tg.x, tg.y, '#c08aff', 25, 2.8);
      }
     });
     if(B.minions){
      B.minions.forEach(function(m){
       if(!m.alive || m.owner === z.owner) return;
       var ownerM = B.players[m.owner];
       if(!ownerM || !ownerM.alive) return;
       if(mode==='endless' && (!!ownerM.isEndlessBot) === (!!srcE.isEndlessBot)) return;
       if(mode==='boss' && (!!ownerM.c._isBoss) === (!!srcE.c._isBoss)) return;
       if(Math.hypot(m.x - z.x, m.y - z.y) < z.range + m.r){
        hurtMinion(m, z.explosionDmg || DARK_HOLE_EXPLODE_DMG, '#8a4aff');
       }
      });
     }
    }
    burst(z.x, z.y, '#8a4aff', 70, 2.8);
    burst(z.x, z.y, '#c08aff', 40, 3.0);
    burst(z.x, z.y, '#ffffff', 20, 3.2);
   }
   return false;
  }

  if(z.isLightningField){
   var srcL = B.players[z.owner];
   if(!srcL) return false;
   B.players.forEach(function(tg){
    if(!tg.alive || tg.reserved) return;
    if(tg.index === z.owner) return;
    if(mode==='endless' && (!!tg.isEndlessBot) === (!!srcL.isEndlessBot)) return;
    if(mode==='boss' && (!!tg.c._isBoss) === (!!srcL.c._isBoss)) return;
    var dxLF = tg.x - z.x, dyLF = tg.y - z.y;
    if(Math.hypot(dxLF, dyLF) > z.range + tg.r) return;
    if(!z.hitSet[tg.index]){
     z.hitSet[tg.index] = true;
     hurt(tg, z.dmg);
     burst(tg.x, tg.y - 8, '#c8a2ff', 4, 1.4);
    }
    if(Math.random()<0.15){
     var la2 = Math.random()*6.283;
     B.parts.push({
      x: tg.x + Math.cos(la2)*tg.r*1.1,
      y: tg.y + Math.sin(la2)*tg.r*1.1,
      vx: (Math.random()-0.5)*40,
      vy: -60 - Math.random()*80,
      life: 0.5, color: Math.random()<0.5?'#c8a2ff':'#ffffff',
      size: 2 + Math.random()*2
     });
    }
   });
   if(B.minions){
    B.minions.forEach(function(m){
     if(!m.alive || m.owner === z.owner) return;
     var oP = B.players[m.owner];
     if(!oP || !oP.alive) return;
     if(mode==='endless' && (!!oP.isEndlessBot) === (!!srcL.isEndlessBot)) return;
     if(mode==='boss' && (!!oP.c._isBoss) === (!!srcL.c._isBoss)) return;
     var dxLFm = m.x - z.x, dyLFm = m.y - z.y;
     if(Math.hypot(dxLFm, dyLFm) > z.range + m.r) return;
     var mkey = 'm'+m.id;
     if(z.hitSet[mkey]) return;
     z.hitSet[mkey] = true;
     hurtMinion(m, z.dmg, '#c8a2ff');
    });
   }
   return true;
  }

  B.players.forEach(function(tg){
   if(!tg.alive || tg.reserved)return;
   if(tg.index===z.owner)return;
   if(z.hitSet[tg.index])return;
   var srcZ = B.players[z.owner];
   if(!srcZ) return;
   if(mode==='endless' && (!!tg.isEndlessBot) === (!!srcZ.isEndlessBot)) return;
   if(mode==='boss' && (!!tg.c._isBoss) === (!!srcZ.c._isBoss)) return;
   var dxz=tg.x-z.x,dyz=tg.y-z.y,dz=Math.hypot(dxz,dyz);
   if(dz<z.range+tg.r){
    var ang=Math.atan2(dyz,dxz);
    var diff=Math.abs(((ang-z.ang+Math.PI*3)%(Math.PI*2))-Math.PI);
    if(diff<z.arc){
     z.hitSet[tg.index]=true;
     if(z.k==='fire'){
      hurt(tg,z.dmg);
      tg.burnLeft=BURN_DUR;tg.burnTick=0;
      tg.burnDmg=Math.max(0.5,roundHalf(z.dmg*0.5));
      tg.burnSrc=z.statusSrc;
     } else if(z.k==='blood'){
      hurt(tg,z.dmg);
      var srcP=B.players[z.owner];
      if(srcP&&srcP.alive){
       srcP.regenLeft=BLOOD_REGEN_DUR;
       srcP.regenSrc=z.statusSrc;
      }
      tg.bleedLeft=1.6;
      tg.bleedSrc=z.statusSrc;
     } else if(z.k==='water'){
      hurt(tg,z.dmg);
      var wx = tg.x - z.x, wy = tg.y - z.y;
      var wd = Math.hypot(wx, wy) || 1;
      tg.vx += (wx/wd) * (z.pushForce||WATER_PUSH);
      tg.vy += (wy/wd) * (z.pushForce||WATER_PUSH);
      burst(tg.x, tg.y, '#4fc3f7', 22, 2.0);
     } else {
      hurt(tg, z.dmg);
     }
     spawnHitFx(tg.x,tg.y,z.castImgs,z.color,tg.r*2.6);
    }
   }
  });
  if(B.minions){
   B.minions.forEach(function(m){
    if(!m.alive || m.owner === z.owner) return;
    var mkey = 'm'+m.id;
    if(z.hitSet[mkey]) return;
    var ownerP = B.players[m.owner];
    if(!ownerP || !ownerP.alive) return;
    var srcZ2 = B.players[z.owner];
    if(!srcZ2) return;
    if(mode==='endless' && (!!ownerP.isEndlessBot) === (!!srcZ2.isEndlessBot)) return;
    if(mode==='boss' && (!!ownerP.c._isBoss) === (!!srcZ2.c._isBoss)) return;
    var dxm=m.x-z.x, dym=m.y-z.y, dm=Math.hypot(dxm,dym);
    if(dm<z.range+m.r){
     var angM=Math.atan2(dym,dxm);
     var diffM=Math.abs(((angM-z.ang+Math.PI*3)%(Math.PI*2))-Math.PI);
     if(diffM<z.arc){
      z.hitSet[mkey]=true;
      if(z.k==='water'){
       hurtMinion(m, z.dmg, z.color);
       var wxm = m.x - z.x, wym = m.y - z.y;
       var wdm = Math.hypot(wxm, wym) || 1;
       m.vx += (wxm/wdm) * (z.pushForce||WATER_PUSH) * 0.7;
       m.vy += (wym/wdm) * (z.pushForce||WATER_PUSH) * 0.7;
      } else {
       hurtMinion(m, z.dmg, z.color);
      }
     }
    }
   });
  }
  return true;
 });
 B.beams=B.beams.filter(function(b){
  b.life-=dt;
  if(b.life<=0)return false;
  if(b.isMinionBolt) return true;
  var src=B.players[b.owner];
  if(!src||!src.alive)return false;
  return true;
 });
 if(B.dashExplosions){
  B.dashExplosions = B.dashExplosions.filter(function(ex){
   ex.timer -= dt;
   if(ex.timer <= 0){
    ex.timer = ex.interval;
    var tg = B.players[ex.target];
    if(tg && tg.alive){
     hurt(tg, ex.dmg);
     burst(tg.x, tg.y, ex.color, 20, 1.6);
    } else {
     burst(ex.x, ex.y, ex.color, 16, 1.4);
    }
    ex.remaining--;
   }
   return ex.remaining > 0;
  });
 }
 B.proj=B.proj.filter(function(p){
  if(p.frozen){
   p.life -= dt;
   return p.life > 0;
  }
  if(B.timeStop && B.timeStop.active){
   p.frozen = true;
   p.frozenVx = p.vx;
   p.frozenVy = p.vy;
   p.vx = 0; p.vy = 0;
   return p.life > 0;
  }
  p.trail.unshift({x:p.x,y:p.y});if(p.trail.length>12)p.trail.pop();
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
  if(Math.random()<0.7 && p.k!=='bullet' && p.k!=='poison' && p.k!=='card'){
   B.parts.push({x:p.x,y:p.y,vx:(Math.random()-.5)*30,vy:(Math.random()-.5)*30,
    life:.35,color:p.color,size:2+Math.random()*2});
  }
  if(!B.over){
   var srcP = B.players[p.owner];
   for(var i=0;i<B.players.length;i++){
    var tg=B.players[i];
    if(!tg.alive||tg.reserved)continue;
    if(tg.index===p.owner)continue;
    if(tg.bouncing)continue;
    if(mode==='endless' && srcP && (!!tg.isEndlessBot) === (!!srcP.isEndlessBot)) continue;
    if(mode==='boss' && srcP && (!!tg.c._isBoss) === (!!srcP.c._isBoss)) continue;
    if(Math.hypot(tg.x-p.x,tg.y-p.y)<tg.r+p.r){hitBy(p,tg);return false;}
   }
   if(B.minions){
    for(var mi=0;mi<B.minions.length;mi++){
     var mn = B.minions[mi];
     if(!mn.alive || mn.owner === p.owner) continue;
     var ownerM = B.players[mn.owner];
     if(!srcP || !ownerM) continue;
     if(mode==='endless' && (!!srcP.isEndlessBot) === (!!ownerM.isEndlessBot)) continue;
     if(mode==='boss' && (!!srcP.c._isBoss) === (!!ownerM.c._isBoss)) continue;
     if(Math.hypot(mn.x-p.x, mn.y-p.y) < mn.r + p.r){
      mn.hp -= 1; mn.flash = 0.2;
      burst(mn.x, mn.y, '#ffffff', 6, 1.3);
      if(mn.hp <= 0){
       mn.alive = false;
       burst(mn.x, mn.y, mn.color, 14, 1.5);
       if(mn.isGodMinion && ownerM){ ownerM.lightPetCd = GOD_MINION_CD; }
      }
      return false;
     }
    }
   }
  }
  return p.life>0&&p.x>-40&&p.x<W+40&&p.y>-40&&p.y<H+40;
 });
 updParts(dt);
}

function ser(){
 function pSer(p){
  return [Math.round(p.x),Math.round(p.y),Math.round(p.hp*10)/10,
   p.alive?1:0,
   p.freezeLeft>0?Math.round(p.freezeLeft*10)/10:0,
   p.burnLeft>0?Math.round(p.burnLeft*10)/10:0,
   p.pullLeft>0?Math.round(p.pullLeft*10)/10:0,
   p.bouncing?1:0,
   p.flash>0?1:0,p.dash>0?1:0,p.sayT>0?p.say:0,
   p.freezeSrc?p.freezeSrc.owner+':'+p.freezeSrc.skill:'',
   p.burnSrc?p.burnSrc.owner+':'+p.burnSrc.skill:'',
   p.pullSrc?p.pullSrc.owner+':'+p.pullSrc.skill:'',
   p.stunLeft>0?Math.round(p.stunLeft*10)/10:0,
   p.stunSrc?p.stunSrc.owner+':'+p.stunSrc.skill:'',
   p.swingT>0?Math.round(p.swingT*100)/100:0,
   Math.round(p.swingAng*100)/100,
   p.regenLeft>0?Math.round(p.regenLeft*10)/10:0,
   p.regenSrc?p.regenSrc.owner+':'+p.regenSrc.skill:'',
   p.bleedLeft>0?Math.round(p.bleedLeft*10)/10:0,
   p.bleedSrc?p.bleedSrc.owner+':'+p.bleedSrc.skill:'',
   p.poisonLeft>0?Math.round(p.poisonLeft*10)/10:0,
   p.poisonDmg||0,
   p.lightLeft>0?1:0,
   p.lightStunLeft>0?Math.round(p.lightStunLeft*10)/10:0,
   p.lightSrc?p.lightSrc.owner+':'+p.lightSrc.skill:'',
   p.rageActive?1:0,
   p.bossDashActive?1:0,
   p.dashCombo||'',
   0,
   p.reserved?1:0];
 }
 return {
  players:B.players.map(pSer),
  proj:B.proj.map(function(p){
   return [p.k,p.owner,Math.round(p.x),Math.round(p.y),p.r,p.color,p.ang,
    p.statusSrc?p.statusSrc.owner+':'+p.statusSrc.skill:'',
    p.weapon?1:0,
    p.poisonDur||0, p.poisonDmg||0,
    p.frozen?1:0,
    p.cardSkill||''];
  }),
  zones:B.zones.map(function(z){
   return [z.k,z.owner,Math.round(z.x),Math.round(z.y),z.ang,
    Math.round(z.range),z.arc,Math.round(z.life*100)/100,z.maxLife,z.color,
    z.statusSrc?z.statusSrc.owner+':'+z.statusSrc.skill:'',
    z.tickInterval||0,
    z.isLightningField?1:0,
    Math.round((z.pullForce||0)),
    z.exploded?1:0,
    Math.round(z.explosionDmg||0)];
  }),
  rocks:B.rocks.map(function(rk){
   return [rk.owner,Math.round(rk.x),Math.round(rk.y),rk.r,
    Math.round(rk.fallT*100)/100, Math.round(rk.maxFallT*100)/100,
    Math.round(rk.life*100)/100, Math.round(rk.maxLife*100)/100,
    rk.dmg, rk.color, rk.hitDone?1:0,
    rk.statusSrc?rk.statusSrc.owner+':'+rk.statusSrc.skill:'',
    rk.k||'rock', rk.fireDuration||0, rk.fireRadius||0, rk.fireDmg||0,
    rk.spawnMinionCount||0, rk.spawnMinionHp||0,
    rk.holyStun||0, rk.lightningStun||0, rk.fieldDur||0];
  }),
  beams:B.beams.map(function(b){
   return [b.k,b.owner,b.target,Math.round(b.life*100)/100,b.maxLife,b.color,
    b.statusSrc?b.statusSrc.owner+':'+b.statusSrc.skill:'',
    (typeof b.fromX === 'number') ? Math.round(b.fromX) : null,
    (typeof b.fromY === 'number') ? Math.round(b.fromY) : null,
    b.boss?1:0];
  }),
  dashExpl:(B.dashExplosions||[]).map(function(ex){
   return [Math.round(ex.x),Math.round(ex.y),ex.remaining];
  }),
  minions:(B.minions||[]).map(function(m){
   return [m.owner, Math.round(m.x), Math.round(m.y), Math.round(m.r),
           m.hp, m.maxHp||MINION_HP, m.dash>0?1:0, Math.round((m.dashAng||0)*100)/100,
           m.fromRock?1:0,
           m.isBossMinion?1:0,
           m.skillCd?Math.round(m.skillCd*10)/10:0,
           m.skillActive?1:0,
           (typeof m.skillTarget==='number')?m.skillTarget:-1,
           m.skillActiveTimer?Math.round(m.skillActiveTimer*10)/10:0,
           m.isGodMinion?1:0];
  }),
  gods:(B.gods||[]).map(function(g){
   return [Math.round(g.x), Math.round(g.y), g.owner,
           Math.round(g.life*100)/100, Math.round(g.maxLife*100)/100,
           g.punchDone?1:0, Math.round(g.punchDirX*100)/100, Math.round(g.punchDirY*100)/100];
  }),
  ph:B.phase,it:B.introT,o:B.over,w:B.winner,
  bs:(function(){
   var bp=null;
   for(var bi=0;bi<B.players.length;bi++) if(B.players[bi].c._isBoss && !B.players[bi].reserved){bp=B.players[bi];break;}
   if(!bp) return null;
   return [bp.suckActive?1:0, Math.round((bp.suckTimer||0)*10)/10,
           Math.round((bp.suckCd||0)*10)/10,
           bp.rageActive?1:0,
           bp.bossDashActive?1:0,
           Math.round((bp.bossDashCd||0)*10)/10];
  })(),
  ts: B.timeStop ? [B.timeStop.active?1:0, Math.round(B.timeStop.left*100)/100, B.timeStop.owner] : null,
  endless: B.endless ? [B.endless.wave, B.endless.state, Math.round(B.endless.timer*10)/10,
                        B.endless.pointsEarned, B.endless.isMiniBoss?1:0, B.endless.isBossWave?1:0] : null
 };
}
function parseSrc(str){
 if(!str)return null;
 var parts=String(str).split(':');
 if(parts.length!==2)return null;
 var owner=parseInt(parts[0]),skill=parseInt(parts[1]);
 if(!isFinite(owner)||!isFinite(skill))return null;
 return {owner:owner,skill:skill};
}
function imgsFromSrc(src,slot){
 if(!src)return null;
 var o=B.players[src.owner];
 if(!o||!o.c.skillSlotImgs||!o.c.skillSlotImgs[src.skill])return null;
 return slot==='cast'?o.c.skillSlotImgs[src.skill].cast:o.c.skillSlotImgs[src.skill].status;
}
function applyState(s){
 if(!B||role!=='guest'||B.done||!s||!Array.isArray(s.players))return;
 if(!B.players||s.players.length!==B.players.length)return;
 s.players.forEach(function(v,i){
  var f=B.players[i];if(!f)return;
  if(v[2]<f.hp)burst(f.x,f.y,'#ffffff',6);
  f.tx=v[0];f.ty=v[1];f.hp=clamp(v[2],0,f.maxHp);
  f.alive=!!v[3];
  f.freezeLeft=+v[4]||0;f.burnLeft=+v[5]||0;f.pullLeft=+v[6]||0;
  f.bouncing=!!v[7];
  f.flash=v[8]?.15:0;f.dash=v[9]?1:0;
  f.say=(typeof v[10]==='string'&&SK[v[10]])?v[10]:(typeof v[10]==='string'?v[10]:0);
  f.sayT=f.say?1:0;
  var fs=parseSrc(v[11]),bs=parseSrc(v[12]),ps=parseSrc(v[13]);
  f.freezeSrc=fs;f.burnSrc=bs;f.pullSrc=ps;
  var prevStun=f.stunLeft;
  f.stunLeft=+v[14]||0;
  if(f.stunLeft>0 && prevStun<=0) f.stunTick=STUN_TICK;
  f.stunSrc=parseSrc(v[15]);
  f.swingT=+v[16]||0;
  f.swingAng=+v[17]||0;
  f.regenLeft=+v[18]||0;
  f.regenSrc=parseSrc(v[19]);
  f.bleedLeft=+v[20]||0;
  f.bleedSrc=parseSrc(v[21]);
  var prevPoison=f.poisonLeft;
  f.poisonLeft=+v[22]||0;
  f.poisonDmg=+v[23]||0;
  if(f.poisonLeft>0 && prevPoison<=0) f.poisonTick=0;
  f.lightLeft = +v[24] ? 600 : 0;
  f.lightStunLeft = +v[25]||0;
  f.lightSrc = parseSrc(v[26]);
  if(f.c._isBoss){
   f.rageActive = !!v[27];
   f.bossDashActive = !!v[28];
  }
  if(typeof v[29]==='string' && v[29]) f.dashCombo = v[29];
  else if(!f.bossDashActive) f.dashCombo = null;
  if(v[31]!==undefined) f.reserved = !!v[31];
  if(ps) f.pullTarget=B.players[ps.owner]||null;
  if(!f.bouncing) f.bounce=null;
 });
 B.proj=s.proj.slice(0,200).map(function(q){
  var kRaw=q[0];
  var k=(kRaw==='bullet'||kRaw==='poison'||kRaw==='card')?kRaw:(SK[kRaw]?kRaw:'fire');
  var owner=+q[1]||0;
  var src=parseSrc(q[7]);
  var isWeapon=!!q[8];
  return {k:k,owner:owner,x:+q[2]||0,y:+q[3]||0,r:clamp(q[4],2,60),
   color:/^#[0-9a-f]{6}$/i.test(q[5])?q[5]:'#ffffff',ang:+q[6]||0,
   castImgs:src?imgsFromSrc(src,'cast'):null,
   statusImgs:src?imgsFromSrc(src,'status'):null,
   statusSrc:src,trail:[],weapon:isWeapon,
   poisonDur:+q[9]||5, poisonDmg:+q[10]||0.2,
   frozen:!!q[11],
   frozenVx:0, frozenVy:0,
   cardSkill:typeof q[12]==='string'?q[12]:null};
 });
 B.zones=(s.zones||[]).map(function(q){
  var kRaw = q[0];
  var isLF = !!q[12];
  var k = isLF ? 'lightningField' : (SK[kRaw]?kRaw:'fire');
  var owner=+q[1]||0;
  var src=parseSrc(q[10]);
  return {k:k,owner:owner,x:+q[2]||0,y:+q[3]||0,ang:+q[4]||0,
   range:clamp(q[5],10,99999),arc:clamp(q[6],0.1,3.2),
   life:+q[7]||0,maxLife:+q[8]||0.5,
   color:/^#[0-9a-f]{6}$/i.test(q[9])?q[9]:'#ff6a00',
   castImgs:src?imgsFromSrc(src,'cast'):null,
   statusImgs:src?imgsFromSrc(src,'status'):null,
   statusSrc:src,hitSet:{},
   tickInterval:+q[11]||0, tickTimer:0.5,
   isLightningField: isLF,
   pullForce: +q[13]||0,
   exploded: !!q[14],
   explosionDmg: +q[15]||DARK_HOLE_EXPLODE_DMG};
 });
 B.rocks=(s.rocks||[]).map(function(q){
  var src=parseSrc(q[11]);
  return {
   owner:+q[0]||0, x:+q[1]||0, y:+q[2]||0, r:clamp(q[3],10,120),
   fallT:+q[4]||0, maxFallT:+q[5]||0.6,
   life:+q[6]||0, maxLife:+q[7]||1.5,
   dmg:+q[8]||5.5,
   color:/^#[0-9a-f]{6}$/i.test(q[9])?q[9]:'#a89070',
   hitDone:!!q[10], hitSet:{},
   castImgs:src?imgsFromSrc(src,'cast'):null,
   statusImgs:src?imgsFromSrc(src,'status'):null,
   statusSrc:src,
   k:q[12]||'rock',
   fireDuration:+q[13]||0,
   fireRadius:+q[14]||0,
   fireDmg:+q[15]||0,
   spawnMinionCount:+q[16]||0,
   spawnMinionHp:+q[17]||0,
   holyStun:+q[18]||0,
   lightningStun:+q[19]||0,
   fieldDur:+q[20]||0
  };
 });
 B.beams=(s.beams||[]).map(function(q){
  var src=parseSrc(q[6]);
  var bkind=q[0];
  return {
   k:(bkind==='sword')?'sword':(bkind==='katana')?'katana':(bkind==='bossBolt'?'bossBolt':'lightning'),
   owner:+q[1]||0, target:+q[2]||0, life:+q[3]||0, maxLife:+q[4]||0.3,
   color:/^#[0-9a-f]{6}$/i.test(q[5])?q[5]:(bkind==='sword'?'#ffffff':'#c8a2ff'),
   castImgs:src?imgsFromSrc(src,'cast'):null,
   statusImgs:src?imgsFromSrc(src,'status'):null,
   statusSrc:src,
   fromX: (q[7] !== null && q[7] !== undefined) ? q[7] : undefined,
   fromY: (q[8] !== null && q[8] !== undefined) ? q[8] : undefined,
   isMinionBolt: bkind==='bossBolt',
   boss: !!q[9]
  };
 });
 if(s.dashExpl){
  if(!B._explPrev) B._explPrev = [];
  s.dashExpl.forEach(function(ex, i){
   var p = B._explPrev[i];
   if(!p || p[2] > ex[2]){
    burst(ex[0], ex[1], '#ff6a00', 20, 1.6);
   }
  });
  B._explPrev = s.dashExpl;
 } else {
  B._explPrev = [];
 }
 B.minions = (s.minions||[]).map(function(q){
  var owner = +q[0]||0;
  var ownerP = B.players[owner];
  return {
   id: ++MINION_ID, owner: owner,
   x: +q[1]||0, y: +q[2]||0, r: clamp(q[3], 8, 60),
   hp: +q[4]||0, maxHp: +q[5]||MINION_HP,
   alive: (+q[4]||0) > 0,
   dash: +q[6]?0.3:0, dashAng: +q[7]||0, dashHit: false,
   vx: 0, vy: 0, attackCd: 0.5, flash: 0,
   fromRock: !!q[8], isBossMinion: !!q[9],
   skillCd: +q[10]||1.5, skillActive: !!q[11],
   skillTarget: (typeof q[12]==='number')?q[12]:-1,
   skillActiveTimer: +q[13]||0, boltTick: 0,
   isGodMinion: !!q[14],
   color: (!!q[14]) ? '#ffeaa7' : '#ff88cc',
   imgs: (ownerP && ownerP.c.minion && ownerP.c.minion.imgs) ? ownerP.c.minion.imgs : null
  };
 });
 B.gods = (s.gods||[]).map(function(q){
  return {
   x: +q[0]||0, y: +q[1]||0, owner: +q[2]||0,
   life: +q[3]||GOD_LIFE, maxLife: +q[4]||GOD_LIFE,
   punchT: GOD_PUNCH_T, punchDone: !!q[5],
   punchRadius: GOD_PUNCH_RADIUS, punchDmg: GOD_PUNCH_DMG,
   punchDirX: +q[6]||0, punchDirY: +q[7]||1, hitSet: {}
  };
 });
 B.phase=s.ph==='fight'?'fight':'intro';B.introT=+s.it||0;
 if(s.ts){
  if(!B.timeStop) B.timeStop = {active:false, left:0, owner:-1};
  var wasTS = B.timeStop.active;
  B.timeStop.active = !!s.ts[0];
  B.timeStop.left = +s.ts[1]||0;
  B.timeStop.owner = +s.ts[2]||-1;
  if(B.timeStop.active && !wasTS){
   B.proj.forEach(function(p){
    if(!p.frozen){ p.frozen=true; p.frozenVx=p.vx; p.frozenVy=p.vy; p.vx=0; p.vy=0; }
   });
  }
 }
 if(mode==='endless' && s.endless){
  if(!B.endless) B.endless = {wave:0,state:'idle',timer:0,pointsEarned:0,isMiniBoss:false,isBossWave:false,nextVariantSeed:0};
  B.endless.wave = +s.endless[0]||0;
  B.endless.state = s.endless[1]||'idle';
  B.endless.timer = +s.endless[2]||0;
  B.endless.pointsEarned = +s.endless[3]||0;
  B.endless.isMiniBoss = !!s.endless[4];
  B.endless.isBossWave = !!s.endless[5];
 }
 if(mode==='boss' && s.bs){
  var bossP2 = findBoss();
  if(bossP2){
   var wasActive = bossP2.suckActive;
   bossP2.suckActive = !!s.bs[0];
   bossP2.suckTimer = +s.bs[1]||0;
   bossP2.suckCd = +s.bs[2]||0;
   bossP2.rageActive = !!s.bs[3];
   bossP2.bossDashActive = !!s.bs[4];
   bossP2.bossDashCd = +s.bs[5]||0;
   if(bossP2.suckActive && !wasActive) guestSuckPress = 0;
   if(bossP2.suckActive && !bossP2.suckPulls) bossP2.suckPulls = {};
   if(bossP2.suckActive && !bossP2.suckDone) bossP2.suckDone = {};
  }
 }
 if(s.o&&!B.over){
  B.over=true;B.winner=(typeof s.w==='number')?s.w:-1;
  setTimeout(finish,1200);
 }
}

/* ===== Drawing ===== */
function drawBiteZone(z, prog){
 var snap = Math.sin(prog*Math.PI);
 var openAng = 0.65*(1-snap)+0.05;
 var jawR = z.range*0.75;
 ctx.save();
 ctx.translate(z.x, z.y); ctx.rotate(z.ang);
 ctx.globalAlpha = 1 - prog*0.55;
 ctx.shadowColor='#ff2244'; ctx.shadowBlur=24;
 ctx.strokeStyle='#c81e3c'; ctx.lineWidth=10; ctx.lineCap='round';
 ctx.beginPath(); ctx.arc(0,0,jawR,-openAng-0.5,-openAng+1.35); ctx.stroke();
 ctx.beginPath(); ctx.arc(0,0,jawR,Math.PI+openAng-1.35,Math.PI+openAng+0.5); ctx.stroke();
 ctx.restore();
 ctx.globalAlpha=1;
}
function drawFireField(z){
 var progress=1-z.life/z.maxLife;
 var alpha = Math.min(1, z.life/1.5) * (1 - progress*0.25);
 var radius = Math.min(z.range, 400);
 var now = performance.now();
 ctx.save();
 ctx.globalAlpha = alpha;
 var g = ctx.createRadialGradient(z.x, z.y, 2, z.x, z.y, radius);
 g.addColorStop(0, 'rgba(255,255,220,0.85)');
 g.addColorStop(0.35, '#ffd166');
 g.addColorStop(0.7, '#ff6a00');
 g.addColorStop(1, 'rgba(255,80,0,0)');
 ctx.fillStyle = g;
 ctx.beginPath();ctx.arc(z.x,z.y,radius,0,7);ctx.fill();
 for(var i=0;i<12;i++){
  var a = (now/280 + i*0.628) % 6.283;
  var r = radius*(0.35+Math.random()*0.65);
  var fx = z.x + Math.cos(a)*r;
  var fy = z.y + Math.sin(a)*r;
  var sz = 4 + Math.random()*5;
  ctx.fillStyle = Math.random()<0.5 ? '#ffd166' : '#ff6a00';
  ctx.globalAlpha = alpha*(0.5+Math.random()*0.5);
  ctx.beginPath();
  ctx.arc(fx, fy, sz, 0, 7);
  ctx.fill();
 }
 ctx.restore();
}
function drawDarkHole(z){
 var now = performance.now();
 var prog = 1 - Math.max(0, z.life)/z.maxLife;
 var fade = Math.min(1, z.life/0.6);
 var scale = 1 + prog*0.35;
 var baseR = z.range * scale;
 ctx.save();
 ctx.globalAlpha = fade * 0.35;
 var g = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, baseR*1.5);
 g.addColorStop(0, 'rgba(0,0,0,0.9)');
 g.addColorStop(0.35, 'rgba(60,10,120,0.75)');
 g.addColorStop(0.7, 'rgba(138,74,255,0.35)');
 g.addColorStop(1, 'rgba(138,74,255,0)');
 ctx.fillStyle = g;
 ctx.beginPath(); ctx.arc(z.x, z.y, baseR*1.5, 0, 7); ctx.fill();
 ctx.restore();
 ctx.save();
 var coreR = baseR * 0.55;
 var cg = ctx.createRadialGradient(z.x, z.y, 2, z.x, z.y, coreR);
 cg.addColorStop(0, '#000000');
 cg.addColorStop(0.55, '#05000c');
 cg.addColorStop(0.9, 'rgba(40,0,80,0.9)');
 cg.addColorStop(1, 'rgba(138,74,255,0)');
 ctx.fillStyle = cg;
 ctx.beginPath(); ctx.arc(z.x, z.y, coreR, 0, 7); ctx.fill();
 ctx.restore();
 ctx.save();
 ctx.globalCompositeOperation='lighter';
 for(var i=0;i<20;i++){
  var ang = now/280 + i*0.314;
  var t = ((now/900) + i*0.13) % 1;
  var r = baseR * (0.3 + t*1.1);
  var px = z.x + Math.cos(ang + t*2.4) * r;
  var py = z.y + Math.sin(ang + t*2.4) * r;
  var alpha2 = (1 - t) * 0.85 * fade;
  ctx.globalAlpha = alpha2;
  ctx.fillStyle = i%3===0 ? '#c08aff' : (i%3===1 ? '#8a4aff' : '#ffffff');
  ctx.beginPath();
  ctx.arc(px, py, 2 + (1-t)*3, 0, 7);
  ctx.fill();
 }
 ctx.restore();
 ctx.save();
 ctx.globalAlpha = fade;
 var pulse = 1 + Math.sin(now/150)*0.08;
 ctx.strokeStyle = '#8a4aff';
 ctx.lineWidth = 3;
 ctx.shadowColor = '#8a4aff'; ctx.shadowBlur = 22;
 ctx.beginPath();
 ctx.arc(z.x, z.y, baseR*pulse, 0, 7);
 ctx.stroke();
 ctx.strokeStyle = '#c08aff';
 ctx.lineWidth = 1.5;
 ctx.shadowBlur = 12;
 ctx.beginPath();
 ctx.arc(z.x, z.y, baseR*pulse*1.15, 0, 7);
 ctx.stroke();
 ctx.restore();
}
function drawWaterWave(z){
 var prog = 1 - z.life/z.maxLife;
 var alpha = Math.max(0, 1 - prog);
 var w = z.range * (0.25 + prog*0.75);
 ctx.save();
 ctx.translate(z.x, z.y); ctx.rotate(z.ang);
 ctx.globalAlpha = alpha * 0.75;
 var g = ctx.createRadialGradient(0, 0, w*0.25, 0, 0, w);
 g.addColorStop(0, 'rgba(79,195,247,0)');
 g.addColorStop(0.5, 'rgba(79,195,247,0.35)');
 g.addColorStop(0.8, 'rgba(140,220,255,0.65)');
 g.addColorStop(1, 'rgba(79,195,247,0)');
 ctx.fillStyle = g;
 ctx.beginPath();
 ctx.arc(0, 0, w, -z.arc, z.arc);
 ctx.lineTo(0, 0);
 ctx.fill();
 ctx.globalAlpha = alpha;
 ctx.strokeStyle = '#4fc3f7';
 ctx.lineWidth = 5;
 ctx.lineCap = 'round';
 ctx.shadowColor = '#4fc3f7'; ctx.shadowBlur = 22;
 ctx.beginPath();
 ctx.arc(0, 0, w, -z.arc, z.arc);
 ctx.stroke();
 ctx.strokeStyle = '#ffffff';
 ctx.lineWidth = 2;
 ctx.shadowBlur = 12;
 ctx.beginPath();
 ctx.arc(0, 0, w, -z.arc, z.arc);
 ctx.stroke();
 ctx.strokeStyle = 'rgba(79,195,247,0.6)';
 ctx.lineWidth = 2.5;
 ctx.shadowBlur = 10;
 ctx.beginPath();
 ctx.arc(0, 0, w*0.6, -z.arc*0.9, z.arc*0.9);
 ctx.stroke();
 ctx.shadowBlur = 0;
 for(var i=0;i<8;i++){
  var a = -z.arc + (i/7)*z.arc*2;
  var rr = w * (0.5 + Math.random()*0.4);
  ctx.fillStyle = Math.random()<0.5 ? '#ffffff' : '#4fc3f7';
  ctx.beginPath();
  ctx.arc(Math.cos(a)*rr, Math.sin(a)*rr, 2 + Math.random()*3, 0, 7);
  ctx.fill();
 }
 ctx.restore();
}
function drawLightningField(z){
 var now = performance.now();
 var fade = Math.min(1, z.life/2);
 var drawR = Math.min(z.range, 500);
 ctx.save();
 ctx.globalAlpha = fade * 0.3;
 var g = ctx.createRadialGradient(z.x, z.y, 10, z.x, z.y, drawR);
 g.addColorStop(0, 'rgba(200,162,255,0.55)');
 g.addColorStop(0.5, 'rgba(150,100,255,0.22)');
 g.addColorStop(1, 'rgba(120,80,255,0)');
 ctx.fillStyle = g;
 ctx.beginPath();ctx.arc(z.x, z.y, drawR, 0, 7);ctx.fill();
 ctx.restore();
 ctx.save();
 ctx.globalAlpha = fade * 0.9;
 ctx.lineCap = 'round';
 var bolts = 7;
 for(var b=0;b<bolts;b++){
  var seed = (b + Math.floor(now/250)) % bolts;
  var sx = z.x + Math.cos(seed*2.71 + now/700)*drawR*0.5;
  var sy = z.y + Math.sin(seed*1.63 + now/900)*drawR*0.5;
  var tx = z.x + (Math.random()-0.5)*drawR*0.8;
  var ty = z.y + (Math.random()-0.5)*drawR*0.8;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  var steps = 6;
  for(var s=1;s<steps;s++){
   var t = s/steps;
   var mx = sx + (tx-sx)*t + (Math.random()-0.5)*30;
   var my = sy + (ty-sy)*t + (Math.random()-0.5)*30;
   ctx.lineTo(mx, my);
  }
  ctx.lineTo(tx, ty);
  ctx.strokeStyle = Math.random()<0.5?'#c8a2ff':'#ffffff';
  ctx.lineWidth = 1 + Math.random()*1.5;
  ctx.shadowColor = '#c8a2ff';
  ctx.shadowBlur = 12;
  ctx.stroke();
 }
 ctx.restore();
 ctx.save();
 ctx.globalAlpha = fade * 0.6;
 var pulse = 1 + Math.sin(now/180)*0.05;
 ctx.strokeStyle = '#c8a2ff';
 ctx.lineWidth = 3;
 ctx.setLineDash([14, 10]);
 ctx.lineDashOffset = -now/40;
 ctx.shadowColor = '#c8a2ff';
 ctx.shadowBlur = 20;
 ctx.beginPath();
 ctx.arc(z.x, z.y, drawR*pulse, 0, 7);
 ctx.stroke();
 ctx.setLineDash([]);
 ctx.restore();
}
function drawZone(z){
 if(z.isLightningField){ drawLightningField(z); return; }
 if(z.k==='dark'){ drawDarkHole(z); return; }
 if(z.k==='water'){ drawWaterWave(z); return; }
 if(z.tickInterval){ drawFireField(z); return; }
 var validCast=z.castImgs?z.castImgs.filter(function(x){return x&&x.width;}):[];
 var progress=1-z.life/z.maxLife;
 if(z.k==='blood' && !validCast.length){ drawBiteZone(z, progress); return; }
 var alpha=1-progress*0.7;
 for(var i=0;i<3;i++){
  var frac=(i+0.6)/3;
  var dist=z.range*frac;
  var px=z.x+Math.cos(z.ang)*dist;
  var py=z.y+Math.sin(z.ang)*dist;
  var size=(28+z.range*0.5)*frac+16;
  if(validCast.length){
   var idx=Math.floor(performance.now()/80+i*2)%validCast.length;
   var im=validCast[idx];
   if(im&&im.width){
    ctx.save();ctx.globalAlpha=alpha;
    ctx.translate(px,py);ctx.rotate(z.ang);
    ctx.shadowColor=z.color;ctx.shadowBlur=20;
    ctx.drawImage(im,-size/2,-size/2,size,size);
    ctx.restore();
   }
  } else {
   var g=ctx.createRadialGradient(px,py,1,px,py,size*0.7);
   if(z.k==='blood'){
    g.addColorStop(0,'#ff5577');g.addColorStop(.4,z.color);g.addColorStop(1,'rgba(200,30,60,0)');
   } else {
    g.addColorStop(0,'#fff9d0');g.addColorStop(.4,z.color);g.addColorStop(1,'rgba(255,80,0,0)');
   }
   ctx.fillStyle=g;
   ctx.beginPath();ctx.arc(px,py,size*0.7,0,7);ctx.fill();
  }
 }
 ctx.globalAlpha=1;
}
function drawRockShadow(rk){
 var prog = 1 - Math.max(0, rk.fallT)/rk.maxFallT;
 if(prog<0)prog=0; if(prog>1)prog=1;
 var alpha = 0.35 + prog*0.35;
 if(rk.hitDone){
  var fadeP = 1 - rk.life/rk.maxLife;
  alpha = Math.max(0, 0.6 - fadeP*0.6);
 }
 ctx.save();
 ctx.globalAlpha = alpha;
 var shadowCol = '#000';
 if(rk.k==='meteor') shadowCol = '#5a1a00';
 else if(rk.k==='petStone') shadowCol = '#3a1a30';
 else if(rk.k==='holyLight') shadowCol = '#3a3010';
 else if(rk.k==='lightningStone') shadowCol = '#1a0a40';
 ctx.fillStyle = shadowCol;
 ctx.beginPath();
 ctx.ellipse(rk.x, rk.y + rk.r*0.35, rk.r*(0.5+prog*0.6), rk.r*(0.18+prog*0.22), 0, 0, 7);
 ctx.fill();
 ctx.restore();
 if(rk.fallT > 0){
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = rk.color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6,4]);
  ctx.beginPath(); ctx.arc(rk.x, rk.y, rk.r, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
 }
}
function drawRockBody(rk){
 var isMeteor = rk.k === 'meteor';
 var isPetStone = rk.k === 'petStone';
 var isHoly = rk.k === 'holyLight';
 var isLStone = rk.k === 'lightningStone';
 var prog = 1 - Math.max(0, rk.fallT)/rk.maxFallT;
 if(prog<0)prog=0; if(prog>1)prog=1;
 var dropH = (1-prog) * (isHoly ? 800 : (isMeteor ? 620 : (isLStone ? 700 : 340)));
 var alpha = 1;
 if(rk.hitDone){
  var fadeP = 1 - rk.life/rk.maxLife;
  alpha = Math.max(0, 1 - fadeP);
  dropH = 0;
 }
 var valid = rk.castImgs ? rk.castImgs.filter(function(x){return x&&x.width;}) : [];
 var sz = rk.r * 2.2;

 if(isHoly && rk.fallT > 0){
  var curYh = rk.y - dropH;
  ctx.save();
  ctx.globalAlpha = 0.85;
  var hg = ctx.createLinearGradient(rk.x, curYh - 300, rk.x, curYh + 40);
  hg.addColorStop(0, 'rgba(255,245,192,0)');
  hg.addColorStop(0.4, 'rgba(255,245,192,0.55)');
  hg.addColorStop(1, '#ffffff');
  ctx.fillStyle = hg;
  ctx.fillRect(rk.x - rk.r*0.6, curYh - 300, rk.r*1.2, 340);
  ctx.restore();
 }
 if(isLStone && rk.fallT > 0){
  var curYl = rk.y - dropH;
  ctx.save();
  ctx.globalAlpha = 0.85;
  var lg = ctx.createLinearGradient(rk.x, curYl - 320, rk.x, curYl + 40);
  lg.addColorStop(0, 'rgba(200,162,255,0)');
  lg.addColorStop(0.4, 'rgba(200,162,255,0.6)');
  lg.addColorStop(1, '#ffffff');
  ctx.fillStyle = lg;
  ctx.fillRect(rk.x - rk.r*0.55, curYl - 320, rk.r*1.1, 360);
  ctx.restore();
 }
 if(isMeteor && rk.fallT > 0){
  var curY = rk.y - dropH;
  ctx.save();
  ctx.globalAlpha = 0.45;
  var sg = ctx.createLinearGradient(rk.x, curY - 240, rk.x, curY);
  sg.addColorStop(0, 'rgba(255,80,0,0)');
  sg.addColorStop(0.6, 'rgba(255,140,0,0.5)');
  sg.addColorStop(1, '#ffd166');
  ctx.fillStyle = sg;
  ctx.fillRect(rk.x - rk.r*0.22, curY - 240, rk.r*0.44, 240);
  ctx.restore();
 }

 ctx.save();
 ctx.globalAlpha = alpha;
 ctx.translate(rk.x, rk.y - dropH);
 if(valid.length){
  var idx = Math.floor(performance.now()/90)%valid.length;
  ctx.shadowColor = rk.color; ctx.shadowBlur = 30;
  ctx.drawImage(valid[idx], -sz/2, -sz/2, sz, sz);
 } else if(isLStone){
  var lsg = ctx.createRadialGradient(0,0,2,0,0,rk.r*1.2);
  lsg.addColorStop(0,'#ffffff');
  lsg.addColorStop(0.3,'#c8a2ff');
  lsg.addColorStop(0.7,'#7a5aff');
  lsg.addColorStop(1,'rgba(80,40,180,0)');
  ctx.fillStyle = lsg;
  ctx.shadowColor = '#c8a2ff'; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.arc(0,0,rk.r*1.1,0,7); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for(var sk=0; sk<5; sk++){
   var sa = sk/5*6.283 + performance.now()/200;
   ctx.beginPath();
   ctx.moveTo(Math.cos(sa)*rk.r*0.4, Math.sin(sa)*rk.r*0.4);
   ctx.lineTo(Math.cos(sa+0.3)*rk.r*0.9, Math.sin(sa+0.3)*rk.r*0.9);
   ctx.lineTo(Math.cos(sa)*rk.r*1.3, Math.sin(sa)*rk.r*1.3);
   ctx.stroke();
  }
 } else if(isHoly){
  var hg2 = ctx.createRadialGradient(0,0,2,0,0,rk.r*1.4);
  hg2.addColorStop(0,'#ffffff');
  hg2.addColorStop(0.4,'#fff5c0');
  hg2.addColorStop(0.8,'#ffd166');
  hg2.addColorStop(1,'rgba(255,200,50,0)');
  ctx.fillStyle = hg2;
  ctx.shadowColor = '#fff5c0'; ctx.shadowBlur = 44;
  ctx.beginPath(); ctx.arc(0,0,rk.r*1.3,0,7); ctx.fill();
  ctx.shadowBlur = 0;
  for(var hj=0; hj<14; hj++){
   var hA = hj/14*6.283 + performance.now()/400;
   var hD = rk.r * (1.0 + Math.sin(performance.now()/150 + hj)*0.15);
   ctx.globalAlpha = alpha * 0.85;
   ctx.fillStyle = hj%2===0 ? '#ffffff' : '#ffd166';
   ctx.beginPath();
   ctx.arc(Math.cos(hA)*hD, Math.sin(hA)*hD, 3+Math.random()*3, 0, 7);
   ctx.fill();
  }
  ctx.globalAlpha = alpha;
 } else if(isMeteor){
  var mg = ctx.createRadialGradient(0,0,2,0,0,rk.r);
  mg.addColorStop(0,'#ffffff'); mg.addColorStop(0.25,'#fff5c0');
  mg.addColorStop(0.55,'#ffd166'); mg.addColorStop(0.85,'#ff6a00');
  mg.addColorStop(1,'rgba(255,80,0,0)');
  ctx.fillStyle = mg;
  ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.arc(0,0,rk.r,0,7); ctx.fill();
 } else if(isPetStone){
  var pg = ctx.createRadialGradient(0,-rk.r*0.3,rk.r*0.15,0,0,rk.r);
  pg.addColorStop(0,'#ffb8d8'); pg.addColorStop(0.5,'#d888a8');
  pg.addColorStop(0.85,'#a89070'); pg.addColorStop(1,'#7a5a3a');
  ctx.fillStyle = pg;
  ctx.shadowColor = '#ff88cc'; ctx.shadowBlur = 26;
  ctx.beginPath();
  var psides = 7;
  for(var pk=0;pk<psides;pk++){
   var paa = pk/psides*6.283 - Math.PI/2;
   var prr = rk.r*(0.88 + (pk%2)*0.12);
   if(pk===0) ctx.moveTo(Math.cos(paa)*prr, Math.sin(paa)*prr);
   else ctx.lineTo(Math.cos(paa)*prr, Math.sin(paa)*prr);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#6a3a5a'; ctx.lineWidth = 2; ctx.stroke();
 } else {
  ctx.shadowColor = rk.color; ctx.shadowBlur = 16;
  ctx.fillStyle = rk.color;
  ctx.beginPath();
  var sides = 7;
  for(var k=0;k<sides;k++){
   var aa = k/sides*6.283 - Math.PI/2;
   var rr = rk.r*(0.85 + (k%2)*0.15);
   if(k===0) ctx.moveTo(Math.cos(aa)*rr, Math.sin(aa)*rr);
   else ctx.lineTo(Math.cos(aa)*rr, Math.sin(aa)*rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 2; ctx.stroke();
 }
 ctx.restore();
}
function drawMinion(m){
 if(!m.alive) return;
 var rr = m.r;
 var im = m.imgs && m.imgs[0];
 if(m.isGodMinion){
  var tnow = performance.now();
  ctx.save();
  var aPulse = 1 + Math.sin(tnow/120)*0.15;
  var aura = ctx.createRadialGradient(m.x, m.y, 2, m.x, m.y, rr*2*aPulse);
  aura.addColorStop(0, 'rgba(255,245,192,0.75)');
  aura.addColorStop(0.5, 'rgba(255,220,100,0.35)');
  aura.addColorStop(1, 'rgba(255,200,50,0)');
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(m.x, m.y, rr*2*aPulse, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff5c0';
  ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(m.x, m.y, rr, 0, 7); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#3a2a00';
  ctx.beginPath(); ctx.arc(m.x - rr*0.28, m.y - rr*0.15, rr*0.11, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(m.x + rr*0.28, m.y - rr*0.15, rr*0.11, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5;
  ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.ellipse(m.x, m.y - rr*1.15, rr*0.55, rr*0.16, 0, 0, 7);
  ctx.stroke();
  ctx.shadowBlur = 0;
  var hpPct = Math.max(0, Math.min(1, m.hp/m.maxHp));
  var barW = rr*2.4;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(m.x-barW/2-1, m.y-rr-10, barW+2, 5);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(m.x-barW/2, m.y-rr-9, barW*hpPct, 3);
  if(m.flash > 0){
   ctx.fillStyle = 'rgba(255,255,255,'+(Math.min(1,m.flash*4))+')';
   ctx.beginPath();ctx.arc(m.x,m.y,rr,0,7);ctx.fill();
  }
  ctx.restore();
  return;
 }
 if(m.isBossMinion){
  var auraPulse = 1 + Math.sin(performance.now()/150)*0.15;
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.shadowColor='#ff2244'; ctx.shadowBlur=26;
  ctx.strokeStyle='#ff2244'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.arc(m.x, m.y, rr*1.5*auraPulse, 0, 7); ctx.stroke();
  ctx.restore();
 }
 ctx.save();
 ctx.beginPath();ctx.arc(m.x,m.y,rr,0,7);ctx.clip();
 if(m.isBossMinion){
  var bg = ctx.createRadialGradient(m.x, m.y-rr*0.3, 2, m.x, m.y, rr);
  bg.addColorStop(0,'#3a0a12'); bg.addColorStop(0.5,'#8a1828'); bg.addColorStop(1,'#1a0812');
  ctx.fillStyle = bg; ctx.fillRect(m.x-rr, m.y-rr, 2*rr, 2*rr);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();ctx.arc(m.x-rr*0.3, m.y-rr*0.15, rr*0.13, 0, 7);ctx.fill();
  ctx.beginPath();ctx.arc(m.x+rr*0.3, m.y-rr*0.15, rr*0.13, 0, 7);ctx.fill();
 } else {
  ctx.fillStyle='#1a0f18';ctx.fillRect(m.x-rr,m.y-rr,2*rr,2*rr);
  if(im && im.width) ctx.drawImage(im, m.x-rr, m.y-rr, 2*rr, 2*rr);
 }
 ctx.restore();
 var stroke = m.color || '#ff88cc';
 if(m.isBossMinion) stroke = '#ff2244';
 if(m.fromRock) stroke = '#ffb8d8';
 if(m.dash > 0) stroke = '#ffffff';
 if(m.isBossMinion && m.skillActive) stroke = '#c8a2ff';
 ctx.lineWidth = m.isBossMinion ? 3 : (m.fromRock ? 2.5 : 2);
 ctx.strokeStyle = stroke;
 ctx.shadowColor = stroke;
 ctx.shadowBlur = (m.isBossMinion && m.skillActive) ? 30 : (m.isBossMinion ? 22 : (m.dash>0 ? 14 : (m.fromRock ? 12 : 8)));
 ctx.beginPath();ctx.arc(m.x,m.y,rr,0,7);ctx.stroke();
 ctx.shadowBlur = 0;
 if(m.maxHp > 1){
  var hpPct2 = Math.max(0, Math.min(1, m.hp/m.maxHp));
  var barW2 = rr*2.2;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(m.x-barW2/2-1, m.y-rr-9, barW2+2, 5);
  ctx.fillStyle = m.isBossMinion ? '#ff2244' : '#ff5577';
  ctx.fillRect(m.x-barW2/2, m.y-rr-8, barW2*hpPct2, 3);
 }
 if(m.flash > 0){
  ctx.fillStyle = 'rgba(255,255,255,'+(Math.min(1,m.flash*4))+')';
  ctx.beginPath();ctx.arc(m.x,m.y,rr,0,7);ctx.fill();
 }
}
function drawMinionBeam(m, tgt){
 var x1 = m.x, y1 = m.y;
 var x2 = tgt.x, y2 = tgt.y;
 var flick = 0.85 + Math.random()*0.15;
 ctx.save();
 ctx.globalAlpha = flick;
 ctx.lineCap = 'round';
 for(var layer=0; layer<3; layer++){
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  var steps = 8;
  var dx = (x2-x1)/steps, dy = (y2-y1)/steps;
  var px = -dy, py = dx;
  var plen = Math.hypot(px, py) || 1;
  px /= plen; py /= plen;
  for(var s=1; s<steps; s++){
   var mag = layer===0 ? 18 : (layer===1 ? 10 : 5);
   var off = (Math.random()-0.5)*mag*2;
   ctx.lineTo(x1+dx*s+px*off, y1+dy*s+py*off);
  }
  ctx.lineTo(x2, y2);
  if(layer===0){ctx.strokeStyle='#c8a2ff'; ctx.lineWidth=3.5; ctx.shadowColor='#c8a2ff'; ctx.shadowBlur=22;}
  else if(layer===1){ctx.strokeStyle='#ffffff'; ctx.lineWidth=1.8; ctx.shadowColor='#ffffff'; ctx.shadowBlur=12;}
  else {ctx.strokeStyle='#c8a2ff'; ctx.lineWidth=1.2; ctx.shadowColor='#c8a2ff'; ctx.shadowBlur=6;}
  ctx.stroke();
 }
 ctx.restore();
}
function drawGod(g){
 var t = 1 - g.life/g.maxLife;
 var alpha = 1;
 if(t < 0.15) alpha = t / 0.15;
 else if(t > 0.7) alpha = Math.max(0, 1 - (t-0.7)/0.3);
 var scale = 0.75 + Math.min(1, t/0.18) * 0.4;
 var sz = 90 * scale;
 ctx.save();
 ctx.globalAlpha = alpha;
 ctx.translate(g.x, g.y - 30 + t*14);
 var auraR = sz * (0.75 + Math.sin(performance.now()/100)*0.08);
 var auraG = ctx.createRadialGradient(0,0,4,0,0,auraR);
 auraG.addColorStop(0, 'rgba(255,245,192,0.75)');
 auraG.addColorStop(0.5, 'rgba(255,220,100,0.28)');
 auraG.addColorStop(1, 'rgba(255,200,50,0)');
 ctx.fillStyle = auraG;
 ctx.beginPath();ctx.arc(0,0,auraR,0,7);ctx.fill();
 ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3;
 ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 22;
 ctx.beginPath();
 ctx.ellipse(0, -sz*0.42, sz*0.34, sz*0.10, 0, 0, 7);
 ctx.stroke();
 ctx.fillStyle = '#fff5c0';
 ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 16;
 ctx.beginPath();
 ctx.moveTo(-sz*0.28, -sz*0.1);
 ctx.lineTo(sz*0.28, -sz*0.1);
 ctx.lineTo(sz*0.36, sz*0.55);
 ctx.lineTo(-sz*0.36, sz*0.55);
 ctx.closePath(); ctx.fill();
 ctx.fillStyle = '#ffeaa7';
 ctx.beginPath(); ctx.arc(0, -sz*0.28, sz*0.18, 0, 7); ctx.fill();
 ctx.shadowBlur = 0;
 ctx.fillStyle = '#3a2a00';
 ctx.beginPath();ctx.arc(-sz*0.06, -sz*0.30, sz*0.025, 0, 7);ctx.fill();
 ctx.beginPath();ctx.arc(sz*0.06, -sz*0.30, sz*0.025, 0, 7);ctx.fill();
 if(g.punchDone && t > 0.2 && t < 0.75){
  var pt = (t - 0.2) / 0.55;
  var fistExt = Math.sin(pt * Math.PI) * sz * 0.75;
  var tx = (g.punchDirX||0) * fistExt;
  var ty = (g.punchDirY||1) * fistExt;
  ctx.strokeStyle = '#fff5c0'; ctx.lineWidth = sz*0.11;
  ctx.lineCap = 'round';
  ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.fillStyle = '#ffeaa7';
  ctx.beginPath(); ctx.arc(tx, ty, sz*0.15, 0, 7); ctx.fill();
 } else if(!g.punchDone){
  ctx.fillStyle = '#ffeaa7';
  ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(sz*0.12, -sz*0.05, sz*0.13, 0, 7); ctx.fill();
 }
 ctx.restore();
}
function drawCardProj(p){
 var sid = p.cardSkill || 'fire';
 var col = (SK[sid] && SK[sid].color) || '#ffd166';
 var now = performance.now();
 if(p.trail){
  for(var i=0;i<p.trail.length;i++){
   var t=p.trail[i],a=1-i/p.trail.length;
   ctx.globalAlpha=a*0.5;ctx.fillStyle=col;
   ctx.beginPath();ctx.arc(t.x,t.y,p.r*(1-i*0.08),0,7);ctx.fill();
  }
  ctx.globalAlpha=1;
 }
 ctx.save();
 ctx.translate(p.x, p.y);
 var spin = now/120;
 ctx.rotate(spin);
 ctx.shadowColor = col; ctx.shadowBlur = 22;
 ctx.fillStyle = '#1a0e2a';
 ctx.fillRect(-8, -12, 16, 24);
 ctx.strokeStyle = col; ctx.lineWidth = 2;
 ctx.strokeRect(-8, -12, 16, 24);
 ctx.fillStyle = col;
 ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
 ctx.fillStyle = '#ffffff';
 ctx.beginPath(); ctx.arc(0, 0, 2, 0, 7); ctx.fill();
 ctx.fillStyle = '#ffd166';
 for(var s=0;s<4;s++){
  var aa = s*1.57 + now/300;
  var sx = Math.cos(aa)*6, sy = Math.sin(aa)*9;
  ctx.beginPath(); ctx.arc(sx, sy, 1.2, 0, 7); ctx.fill();
 }
 ctx.restore();
 if(p.frozen){
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = '#7fdcff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#7fdcff'; ctx.shadowBlur = 12;
  for(var k=0;k<6;k++){
   var a2 = now/500 + k*Math.PI/3;
   ctx.beginPath();
   ctx.moveTo(p.x + Math.cos(a2)*(p.r+2), p.y + Math.sin(a2)*(p.r+2));
   ctx.lineTo(p.x + Math.cos(a2)*(p.r+7), p.y + Math.sin(a2)*(p.r+7));
   ctx.stroke();
  }
  ctx.restore();
 }
}
function drawProj(p){
 if(p.k==='card'){ drawCardProj(p); return; }
 if(p.trail){
  for(var i=0;i<p.trail.length;i++){
   var t=p.trail[i],a=1-i/p.trail.length;
   ctx.globalAlpha=a*0.4;ctx.fillStyle=p.color;
   ctx.beginPath();ctx.arc(t.x,t.y,p.r*(1-i*0.06),0,7);ctx.fill();
  }
  ctx.globalAlpha=1;
 }
 if(p.k==='bullet'){
  ctx.save();
  ctx.shadowColor=p.color;ctx.shadowBlur=12;
  ctx.fillStyle=p.color;
  ctx.beginPath();ctx.arc(p.x,p.y,4,0,7);ctx.fill();
  ctx.fillStyle='#ffffff';
  ctx.beginPath();ctx.arc(p.x,p.y,2,0,7);ctx.fill();
  ctx.restore();
  return;
 }
 if(p.k==='poison'){
  ctx.save();
  ctx.translate(p.x,p.y);ctx.rotate(p.ang||0);
  ctx.shadowColor=p.color; ctx.shadowBlur=16;
  ctx.fillStyle=p.color;
  ctx.beginPath(); ctx.arc(0,0,p.r,0,7); ctx.fill();
  ctx.restore();
  return;
 }
 var valid=p.castImgs?p.castImgs.filter(function(x){return x&&x.width;}):[];
 if(valid.length){
  var idx=Math.floor(performance.now()/90)%valid.length;
  var im=valid[idx];
  var sz=p.r*3.6;
  ctx.save();
  ctx.shadowColor=p.color;ctx.shadowBlur=16;
  ctx.translate(p.x,p.y);ctx.rotate(p.ang||0);
  ctx.drawImage(im,-sz/2,-sz/2,sz,sz);
  ctx.restore();
  return;
 }
 ctx.save();ctx.translate(p.x,p.y);
 if(p.k==='fire'){
  var fl=1+Math.sin(B.time*30)*0.15;ctx.rotate(p.ang||0);
  var g=ctx.createRadialGradient(0,0,1,0,0,p.r*2*fl);
  g.addColorStop(0,'#fff9d0');g.addColorStop(.3,'#ffd166');
  g.addColorStop(.6,p.color);g.addColorStop(1,'rgba(255,80,0,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,p.r*2*fl,0,7);ctx.fill();
 } else if(p.k==='ice'){
  ctx.rotate((p.ang||0)+B.time*4);
  ctx.fillStyle=p.color;ctx.strokeStyle='#fff';ctx.lineWidth=2;
  ctx.shadowColor=p.color;ctx.shadowBlur=16;
  for(var k=0;k<6;k++){
   ctx.save();ctx.rotate(k*Math.PI/3);
   ctx.beginPath();
   ctx.moveTo(p.r*1.8,0);ctx.lineTo(0,-p.r*0.55);ctx.lineTo(-p.r*0.6,0);ctx.lineTo(0,p.r*0.55);
   ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }
 } else {
  ctx.rotate((p.ang||0)+B.time*12);
  ctx.strokeStyle=p.color;ctx.lineWidth=3;
  for(var i2=0;i2<3;i2++){
   ctx.globalAlpha=1-i2*.28;
   ctx.beginPath();ctx.arc(0,0,p.r*(1+i2*0.35),-1.1,1.1);ctx.stroke();
   ctx.beginPath();ctx.arc(0,0,p.r*(1+i2*0.35),Math.PI-1.1,Math.PI+1.1);ctx.stroke();
  }
  ctx.globalAlpha=1;
 }
 ctx.restore();
 if(p.frozen){
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#7fdcff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#7fdcff'; ctx.shadowBlur = 14;
  var now2 = performance.now();
  for(var kk=0;kk<6;kk++){
   var aa2 = now2/500 + kk*Math.PI/3;
   ctx.beginPath();
   ctx.moveTo(p.x + Math.cos(aa2)*(p.r+3), p.y + Math.sin(aa2)*(p.r+3));
   ctx.lineTo(p.x + Math.cos(aa2)*(p.r+8), p.y + Math.sin(aa2)*(p.r+8));
   ctx.stroke();
  }
  ctx.restore();
 }
}
function drawHitFx(){
 var now=performance.now();
 B.hitFx=B.hitFx.filter(function(h){
  var el=now-h.start;
  if(el>h.dur)return false;
  var idx=Math.min(h.imgs.length-1,Math.floor(el/(h.dur/h.imgs.length)));
  var im=h.imgs[idx];
  if(im&&im.width){
   ctx.save();
   ctx.globalAlpha=1-el/h.dur;
   ctx.shadowColor=h.color;ctx.shadowBlur=18;
   var s=h.size*(1+el/h.dur*0.4);
   ctx.drawImage(im,h.x-s/2,h.y-s/2,s,s);
   ctx.restore();
  }
  return true;
 });
}
function drawBeam(b){
 var src=B.players[b.owner];
 var tgt=B.players[b.target];
 if(!tgt)return;
 var x1, y1;
 if(typeof b.fromX === 'number' && typeof b.fromY === 'number'){
  x1 = b.fromX; y1 = b.fromY;
 } else {
  if(!src)return;
  if(b.owner===b.target)return;
  x1 = src.x; y1 = src.y;
 }
 var x2=tgt.x,y2=tgt.y;
 var lifeRatio=b.life/b.maxLife;
 var alpha=lifeRatio>0.3?1:(lifeRatio/0.3);
 var flick=0.85+Math.random()*0.15;
 alpha*=flick;
 if(b.k==='sword'){
  var ang=Math.atan2(y2-y1,x2-x1);
  var prog=1-lifeRatio;
  var angA=ang-0.7+prog*1.4;
  var isBossSwing = !!b.boss;
  ctx.save();
  ctx.globalAlpha=alpha*0.95;
  ctx.strokeStyle=isBossSwing?'#ff2244':'#ffffff';
  ctx.lineWidth=isBossSwing?8:4;
  ctx.lineCap='round';
  ctx.shadowColor=isBossSwing?'#ff2244':'#ffffff';
  ctx.shadowBlur=isBossSwing?28:16;
  var arcR=(src?src.r:26)*(isBossSwing?2.4:1.9);
  var arcSpan=isBossSwing?0.45:0.25;
  ctx.beginPath();
  ctx.arc(x1,y1,arcR,angA-arcSpan,angA+arcSpan);
  ctx.stroke();
  ctx.restore();
  return;
 }
 if(b.k==='katana'){
  var angK=Math.atan2(y2-y1,x2-x1);
  var progK=1-lifeRatio;
  var arcRK=(src?src.r:26)*2.6;
  var spread=0.55;
  ctx.save();
  for(var layer=0; layer<3; layer++){
   var offset = (layer-1)*0.28;
   var wob = (Math.random()-0.5)*0.15;
   var a0 = angK - spread + offset + progK*0.5 + wob;
   var a1 = angK + spread + offset + progK*0.5 + wob;
   ctx.globalAlpha = alpha * (layer===0 ? 0.85 : (layer===1 ? 0.7 : 0.45));
   ctx.strokeStyle = layer===1 ? '#ffffff' : '#ff2244';
   ctx.lineWidth = layer===1 ? 2.2 : (layer===0 ? 5 : 3);
   ctx.lineCap = 'round';
   ctx.shadowColor = layer===1 ? '#ffffff' : '#ff2244';
   ctx.shadowBlur = layer===1 ? 14 : 26;
   ctx.beginPath();
   ctx.arc(x1,y1,arcRK - layer*4, a0, a1);
   ctx.stroke();
  }
  if(Math.random()<0.7){
   var sparkA = angK + (Math.random()-0.5)*0.9;
   var sr = arcRK * (0.9 + Math.random()*0.2);
   var sx = x1 + Math.cos(sparkA)*sr;
   var sy = y1 + Math.sin(sparkA)*sr;
   ctx.globalAlpha = alpha;
   ctx.fillStyle = '#ffe0e8';
   ctx.shadowColor = '#ff2244'; ctx.shadowBlur = 20;
   ctx.beginPath();
   ctx.arc(sx, sy, 2 + Math.random()*3, 0, 7);
   ctx.fill();
  }
  ctx.restore();
  return;
 }
 ctx.save();
 ctx.globalAlpha=alpha;
 ctx.lineCap='round';
 for(var layer2=0;layer2<3;layer2++){
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  var steps=10;
  var dx=(x2-x1)/steps,dy=(y2-y1)/steps;
  var px=-dy,py=dx;
  var plen=Math.hypot(px,py)||1;
  px/=plen;py/=plen;
  for(var s=1;s<steps;s++){
   var mag=layer2===0?20:(layer2===1?11:5);
   var off=(Math.random()-0.5)*mag*2;
   ctx.lineTo(x1+dx*s+px*off,y1+dy*s+py*off);
  }
  ctx.lineTo(x2,y2);
  if(layer2===0){ctx.strokeStyle=b.color;ctx.lineWidth=4;ctx.shadowColor=b.color;ctx.shadowBlur=22;}
  else if(layer2===1){ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.shadowColor='#ffffff';ctx.shadowBlur=10;}
  else {ctx.strokeStyle=b.color;ctx.lineWidth=1.5;ctx.shadowColor=b.color;ctx.shadowBlur=6;}
  ctx.stroke();
 }
 ctx.restore();
}
function drawStatusFx(f){
 var rr = f.r;
 if(f.burnLeft>0){
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#ff8a00';
  for(var i=0;i<4;i++){
   var ang = (performance.now()/200 + i*1.57);
   var px = f.x + Math.cos(ang)*rr*1.1;
   var py = f.y + Math.sin(ang)*rr*1.1 - 3;
   ctx.beginPath(); ctx.arc(px, py, 3+Math.random()*2, 0, 7); ctx.fill();
  }
  ctx.restore();
 }
 if(f.freezeLeft>0){
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = '#7fdcff'; ctx.lineWidth = 2;
  ctx.shadowColor = '#7fdcff'; ctx.shadowBlur = 12;
  for(var k=0;k<6;k++){
   var a2 = B.time*1.8 + k*Math.PI/3;
   ctx.beginPath();
   ctx.moveTo(f.x + Math.cos(a2)*(rr+3), f.y + Math.sin(a2)*(rr+3));
   ctx.lineTo(f.x + Math.cos(a2)*(rr+9), f.y + Math.sin(a2)*(rr+9));
   ctx.stroke();
  }
  ctx.restore();
 }
 if(f.stunLeft>0){
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#c8a2ff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#c8a2ff'; ctx.shadowBlur = 16;
  ctx.fillText('⚡', f.x, f.y - rr - 6);
  ctx.restore();
 }
 if(f.lightStunLeft>0){
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#fff5c0';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#fff5c0'; ctx.shadowBlur = 16;
  ctx.fillText('✦', f.x, f.y - rr - 6);
  ctx.restore();
 }
 if(B.timeStop && B.timeStop.active && f.index !== B.timeStop.owner){
  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin(performance.now()/200)*0.15;
  var tsa = ctx.createRadialGradient(f.x, f.y, rr*0.5, f.x, f.y, rr*1.6);
  tsa.addColorStop(0, 'rgba(127,220,255,0)');
  tsa.addColorStop(0.6, 'rgba(138,74,255,0.35)');
  tsa.addColorStop(1, 'rgba(127,220,255,0)');
  ctx.fillStyle = tsa;
  ctx.beginPath(); ctx.arc(f.x, f.y, rr*1.6, 0, 7); ctx.fill();
  ctx.strokeStyle = '#7fdcff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#7fdcff'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(f.x, f.y, rr + 4, 0, 7); ctx.stroke();
  ctx.restore();
 }
}
function drawBossDashWarn(){
 if(!B.bossDashWarn) return;
 var w = B.bossDashWarn;
 var src = B.players[w.from];
 var tgt = B.players[w.to];
 if(!src || !tgt || !src.alive || !tgt.alive) return;
 var prog = 1 - w.t / w.maxT;
 var alpha = 0.5 + Math.sin(performance.now()/60)*0.3;
 ctx.save();
 ctx.globalAlpha = alpha;
 ctx.strokeStyle = '#ff2244';
 ctx.lineWidth = 5 + prog*4;
 ctx.setLineDash([14,8]);
 ctx.lineDashOffset = -performance.now()/40;
 ctx.shadowColor = '#ff2244'; ctx.shadowBlur = 24;
 ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.lineTo(tgt.x, tgt.y); ctx.stroke();
 ctx.setLineDash([]);
 ctx.beginPath(); ctx.arc(tgt.x, tgt.y, tgt.r + 8 + prog*6, 0, 7); ctx.stroke();
 ctx.restore();
}
function drawTimeStopOverlay(){
 if(!B.timeStop || !B.timeStop.active) return;
 var now = performance.now();
 var fade = Math.min(1, B.timeStop.left/0.4);
 ctx.save();
 ctx.globalAlpha = fade;
 var g = ctx.createRadialGradient(W/2, H/2, W*0.15, W/2, H/2, W*0.85);
 g.addColorStop(0, 'rgba(138,74,255,0.08)');
 g.addColorStop(0.6, 'rgba(80,40,180,0.14)');
 g.addColorStop(1, 'rgba(127,220,255,0.22)');
 ctx.fillStyle = g;
 ctx.fillRect(0, 0, W, H);
 for(var i=0;i<3;i++){
  var rr = W*0.28 + i*40 + Math.sin(now/200 + i)*8;
  ctx.globalAlpha = fade * (0.35 - i*0.08);
  ctx.strokeStyle = i===0 ? '#ffffff' : (i===1 ? '#7fdcff' : '#8a4aff');
  ctx.lineWidth = 3 - i*0.6;
  ctx.setLineDash([12, 14]);
  ctx.lineDashOffset = -now/30 - i*20;
  ctx.beginPath(); ctx.arc(W/2, H/2, rr, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
 }
 ctx.globalAlpha = fade;
 ctx.strokeStyle = '#7fdcff';
 ctx.lineWidth = 5;
 ctx.shadowColor = '#7fdcff';
 ctx.shadowBlur = 22;
 ctx.beginPath(); ctx.arc(W/2, 90, 30, 0, 7); ctx.stroke();
 ctx.beginPath();
 ctx.moveTo(W/2, 90);
 ctx.lineTo(W/2, 74);
 ctx.moveTo(W/2, 90);
 ctx.lineTo(W/2 + 12, 90);
 ctx.stroke();
 ctx.shadowBlur = 0;
 ctx.globalAlpha = fade * 0.9;
 ctx.fillStyle = '#7fdcff';
 ctx.font = 'bold 26px system-ui,sans-serif';
 ctx.textAlign = 'center';
 ctx.shadowColor = '#7fdcff';
 ctx.shadowBlur = 18;
 ctx.fillText('⏱ TIME STOP', W/2, 48);
 ctx.shadowBlur = 0;
 ctx.fillStyle = '#ffffff';
 ctx.font = 'bold 20px system-ui,sans-serif';
 ctx.shadowColor = '#8a4aff';
 ctx.shadowBlur = 14;
 ctx.fillText(B.timeStop.left.toFixed(1) + ' วิ', W/2, H - 30);
 ctx.shadowBlur = 0;
 ctx.globalAlpha = fade * 0.06;
 ctx.fillStyle = '#ffffff';
 for(var s=0; s<H; s+=6){
  var lineA = 0.5 + Math.sin((s + now/4) / 12) * 0.5;
  ctx.globalAlpha = fade * 0.06 * lineA;
  ctx.fillRect(0, s, W, 1);
 }
 ctx.restore();
}
function drawF(f){
 if(f.reserved) return;
 var rr = f.r;
 if(!f.alive){
  if(mode==='endless') return;
  ctx.globalAlpha=0.18;
  var imd=f.c.imgs[0];
  ctx.save();ctx.beginPath();ctx.arc(f.x,f.y,rr,0,7);ctx.clip();
  if(imd&&imd.width)ctx.drawImage(imd,f.x-rr,f.y-rr,2*rr,2*rr);
  ctx.restore();
  ctx.globalAlpha=1;
  return;
 }

 if(f.c._isBoss && f.rageActive){
  ctx.save();
  var ragePulse = 1 + Math.sin(performance.now()/100)*0.15;
  var rAG = ctx.createRadialGradient(f.x, f.y, rr*0.7, f.x, f.y, rr*2.6*ragePulse);
  rAG.addColorStop(0, 'rgba(255,30,60,0.55)');
  rAG.addColorStop(0.5, 'rgba(255,100,20,0.35)');
  rAG.addColorStop(1, 'rgba(255,30,60,0)');
  ctx.fillStyle = rAG;
  ctx.beginPath(); ctx.arc(f.x, f.y, rr*2.6*ragePulse, 0, 7); ctx.fill();
  ctx.restore();
 }

 if(f.c._adminHp || f.c._adminAllSkills){
  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin(performance.now()/180)*0.15;
  var aAG = ctx.createRadialGradient(f.x, f.y, rr*0.8, f.x, f.y, rr*2);
  aAG.addColorStop(0, 'rgba(255,209,102,0)');
  aAG.addColorStop(0.6, 'rgba(255,209,102,0.35)');
  aAG.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = aAG;
  ctx.beginPath(); ctx.arc(f.x, f.y, rr*2, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.setLineDash([6,4]);
  ctx.lineDashOffset = -performance.now()/80;
  ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(f.x, f.y, rr + 7, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
 }

 var im=f.c.imgs[0];
 ctx.save();ctx.beginPath();ctx.arc(f.x,f.y,rr,0,7);ctx.clip();
 ctx.fillStyle='#1a1a1a';ctx.fillRect(f.x-rr,f.y-rr,2*rr,2*rr);
 if(im&&im.width)ctx.drawImage(im,f.x-rr,f.y-rr,2*rr,2*rr);
 ctx.restore();

 if(f.c._isBoss){
  ctx.save();
  ctx.globalAlpha = f.rageActive ? 0.9 : 0.6;
  ctx.strokeStyle= f.rageActive ? '#ff2244' : '#c81e3c';
  ctx.lineWidth= f.rageActive ? 8 : 6;
  ctx.shadowColor= f.rageActive ? '#ff2244' : '#ff4d6d';
  ctx.shadowBlur= f.rageActive ? 40 : 24;
  ctx.beginPath(); ctx.arc(f.x,f.y,rr+6,0,7); ctx.stroke();
  ctx.restore();
 }

 if(f.isEndlessBot && f.c._botVariant!==undefined){
  var vc = BOT_VARIANT_COLORS[f.c._botVariant % BOT_VARIANT_COLORS.length];
  ctx.save();
  ctx.globalAlpha = 0.55 + Math.sin(performance.now()/200 + f.index)*0.15;
  ctx.strokeStyle = vc.accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = vc.accent;
  ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(f.x, f.y, rr+2, 0, 7); ctx.stroke();
  ctx.restore();
 }

 var stroke='#ffffff';
 if(f.lightStunLeft>0)stroke='#fff5c0';
 else if(f.stunLeft>0)stroke='#c8a2ff';
 else if(f.freezeLeft>0)stroke='#7fdcff';
 else if(f.pullLeft>0)stroke='#9ff2c0';
 else if(f.burnLeft>0)stroke='#ff8a00';
 else if(f.bleedLeft>0)stroke='#c81e3c';
 else if(f.poisonLeft>0)stroke='#88ff44';
 else if(f.lightLeft>0)stroke='#fff5c0';
 if(f.dashCombo==='explosive') stroke='#ff6a00';
 if(f.dashCombo==='bossDash') stroke='#ff2244';
 if(f.c._isBoss && f.rageActive) stroke='#ff2244';
 if(f.index===B.myIndex){
  ctx.lineWidth=4;ctx.strokeStyle='#ffd166';
  ctx.shadowColor='#ffd166';ctx.shadowBlur=16;
  ctx.beginPath();ctx.arc(f.x,f.y,rr+3,0,7);ctx.stroke();
  ctx.shadowBlur=0;
 }
 ctx.lineWidth=3;ctx.strokeStyle=stroke;
 ctx.shadowBlur=0;
 ctx.beginPath();ctx.arc(f.x,f.y,rr,0,7);ctx.stroke();

 if(f.flash>0){ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.arc(f.x,f.y,rr,0,7);ctx.fill();}

 if(f.c.weapon==='katana'){
  var angK = f.swingAng||0;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(angK);
  ctx.strokeStyle='#1a0812'; ctx.lineWidth=6; ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(-rr*0.55, 0); ctx.lineTo(rr*0.5, 0);
  ctx.stroke();
  ctx.strokeStyle='#3a0a18'; ctx.lineWidth=2;
  for(var wk=0; wk<4; wk++){
   var wx = -rr*0.5 + wk*(rr*0.9/4);
   ctx.beginPath();
   ctx.moveTo(wx, -3); ctx.lineTo(wx+2, 3);
   ctx.stroke();
  }
  ctx.fillStyle='#ffd166';
  ctx.shadowColor='#ffd166'; ctx.shadowBlur=10;
  ctx.beginPath(); ctx.ellipse(rr*0.55, 0, 4, 11, 0, 0, 7); ctx.fill();
  ctx.shadowBlur=0;
  ctx.shadowColor='#ff2244'; ctx.shadowBlur=20;
  ctx.strokeStyle='#ff2244'; ctx.lineWidth=4.5;
  ctx.beginPath();
  ctx.moveTo(rr*0.62, 0);
  ctx.quadraticCurveTo(rr*1.6, -7, rr*2.7, -3);
  ctx.stroke();
  ctx.strokeStyle='#ffffff'; ctx.lineWidth=1.8;
  ctx.shadowBlur=8;
  ctx.beginPath();
  ctx.moveTo(rr*0.62, 0);
  ctx.quadraticCurveTo(rr*1.6, -7, rr*2.7, -3);
  ctx.stroke();
  ctx.shadowBlur=0;
  ctx.fillStyle='#ffd166';
  ctx.beginPath(); ctx.arc(rr*2.7, -3, 2.5, 0, 7); ctx.fill();
  ctx.restore();
  if(f.swingT > 0){
   ctx.save();
   ctx.translate(f.x, f.y);
   var afterAlpha = f.swingT/0.2;
   for(var af=1; af<=3; af++){
    ctx.save();
    ctx.rotate(angK + (Math.random()-0.5)*0.6);
    ctx.globalAlpha = afterAlpha * (0.4 - af*0.1);
    ctx.strokeStyle = '#ff2244';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff2244'; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, rr*(2 + af*0.2), -0.7, 0.7);
    ctx.stroke();
    ctx.restore();
   }
   ctx.restore();
  }
 } else if(f.c.weapon==='sword'){
  var ang0=f.swingAng||0;
  var isBossKatana = !!f.c._isBoss;
  ctx.save();
  ctx.translate(f.x,f.y);
  ctx.rotate(ang0);
  if(isBossKatana){
   ctx.strokeStyle='#1a0812'; ctx.lineWidth=7; ctx.lineCap='round';
   ctx.beginPath();
   ctx.moveTo(-rr*0.5, 0); ctx.lineTo(rr*0.55, 0);
   ctx.stroke();
   ctx.fillStyle='#ffd166';
   ctx.shadowColor='#ffd166'; ctx.shadowBlur=10;
   ctx.beginPath(); ctx.ellipse(rr*0.62, 0, 5, 12, 0, 0, 7); ctx.fill();
   ctx.shadowBlur=0; ctx.shadowColor='#ff2244'; ctx.shadowBlur=18;
   ctx.strokeStyle='#ff2244'; ctx.lineWidth=5;
   ctx.beginPath();
   ctx.moveTo(rr*0.7, 0);
   ctx.quadraticCurveTo(rr*1.8, -9, rr*2.85, -3);
   ctx.stroke();
   ctx.shadowBlur=0;
  } else {
   ctx.strokeStyle='#e0e0e0'; ctx.lineWidth=2;
   ctx.globalAlpha=0.55;
   ctx.beginPath();
   ctx.moveTo(rr*0.7,0); ctx.lineTo(rr*1.55,0);
   ctx.stroke();
  }
  ctx.restore();
 } else if(f.c.weapon==='lucky'){
  ctx.save();
  ctx.translate(f.x + rr*0.6, f.y - rr*0.6);
  ctx.rotate(Math.sin(performance.now()/500)*0.3);
  ctx.fillStyle = '#1a0e2a';
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 12;
  ctx.fillRect(-6, -9, 12, 18);
  ctx.strokeRect(-6, -9, 12, 18);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 7); ctx.fill();
  ctx.restore();
 }

 ctx.textAlign='center';
 ctx.font='11px sans-serif';ctx.fillStyle='#cdd';
 if(f.c._isBoss || !f.isEndlessBot) ctx.fillText(f.c.name,f.x,f.y+rr+14);

 if(f.hp < f.maxHp){
  var hpW = rr*2.2;
  var hpPct = Math.max(0, Math.min(1, f.hp/f.maxHp));
  var hy = f.y - rr - 10;
  ctx.fillStyle='rgba(0,0,0,0.55)';
  ctx.fillRect(f.x-hpW/2-1, hy-1, hpW+2, 5);
  ctx.fillStyle = f.isEndlessBot ? '#ff5577' : '#88ff88';
  ctx.fillRect(f.x-hpW/2, hy, hpW*hpPct, 3);
 }
}
function draw(){
 ctx.clearRect(0,0,W,H);
 var bg=ctx.createRadialGradient(W/2,H/2,20,W/2,H/2,W*0.7);
 bg.addColorStop(0,'#141414');bg.addColorStop(1,'#050505');
 ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=2;
 var maxR=Math.min(W,H)/2;
 for(var r=60;r<maxR;r+=60){ctx.beginPath();ctx.arc(W/2,H/2,r,0,7);ctx.stroke();}
 ctx.restore();

 var bossRef = findBoss();
 if(bossRef && bossRef.alive && bossRef.rageActive){
  var rageAlpha = 0.15 + Math.sin(performance.now()/120)*0.08;
  ctx.save();
  var rgOverlay = ctx.createRadialGradient(W/2,H/2,W*0.2,W/2,H/2,W*0.75);
  rgOverlay.addColorStop(0,'rgba(255,30,60,0)');
  rgOverlay.addColorStop(1,'rgba(255,30,60,'+rageAlpha+')');
  ctx.fillStyle = rgOverlay;
  ctx.fillRect(0,0,W,H);
  ctx.restore();
 }

 ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=3;ctx.strokeRect(1.5,1.5,W-3,H-3);
 if(B.phase==='intro'){
  B.players.forEach(function(f){if(f.reserved)return;var s=f.r*2+26;ctx.strokeStyle='#ffd166';ctx.lineWidth=3;ctx.strokeRect(f.x-s/2,f.y-s/2,s,s);});
 }
 B.zones.forEach(drawZone);
 B.rocks.forEach(drawRockShadow);
 B.proj.forEach(drawProj);
 if(B.minions) B.minions.forEach(drawMinion);
 if(B.minions){
  B.minions.forEach(function(m){
   if(!m.alive || !m.isBossMinion || !m.skillActive) return;
   var tgt = B.players[m.skillTarget];
   if(!tgt || !tgt.alive) return;
   drawMinionBeam(m, tgt);
  });
 }
 drawBossDashWarn();
 B.players.forEach(drawStatusFx);
 B.players.forEach(drawF);
 if(B.gods) B.gods.forEach(drawGod);
 B.rocks.forEach(drawRockBody);
 B.beams.forEach(drawBeam);
 B.parts.forEach(function(p){
  ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;
  ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);
 });
 ctx.globalAlpha=1;
 drawHitFx();
 drawTimeStopOverlay();
 if(B.phase==='intro'){
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 68px system-ui,sans-serif';
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
   if(f.reserved) return;
   if(f.tx!==undefined&&f.alive){f.x+=(f.tx-f.x)*.5;f.y+=(f.ty-f.y)*.5;}
   if(f.freezeLeft>0)f.freezeLeft=Math.max(0,f.freezeLeft-dt);
   if(f.pullLeft>0)f.pullLeft=Math.max(0,f.pullLeft-dt);
   if(f.stunLeft>0)f.stunLeft=Math.max(0,f.stunLeft-dt);
   if(f.swingT>0)f.swingT=Math.max(0,f.swingT-dt);
   if(f.regenLeft>0)f.regenLeft=Math.max(0,f.regenLeft-dt);
   if(f.bleedLeft>0)f.bleedLeft=Math.max(0,f.bleedLeft-dt);
   if(f.poisonLeft>0)f.poisonLeft=Math.max(0,f.poisonLeft-dt);
   if(f.lightLeft>0)f.lightLeft=Math.max(0,f.lightLeft-dt);
   if(f.lightStunLeft>0)f.lightStunLeft=Math.max(0,f.lightStunLeft-dt);
   if(f.burnLeft>0){f.burnLeft-=dt;}
   if(f.lightPetCd>0) f.lightPetCd = Math.max(0, f.lightPetCd - dt);
  });
  if(B.minions){
   B.minions.forEach(function(m){
    if(m.isBossMinion && m.skillActive && m.skillActiveTimer>0){
     m.skillActiveTimer = Math.max(0, m.skillActiveTimer - dt);
    }
   });
  }
  if(B.gods){
   B.gods = B.gods.filter(function(g){ g.life -= dt; return g.life > 0; });
  }
  updParts(dt);
 }
 draw();
 updateSuckUI();
 updateLuckyBtnVisibility();
 if(!B.done)raf=requestAnimationFrame(loop);
}
function showRes(t){
 $('suckBox').style.display='none';
 $('luckyBox').style.display='none';
 $('rtxt').textContent=t;
 $('btnAgain').style.display=((mode==='bot')||(mode==='boss' && !wasOnlineGame)||(mode==='endless' && !wasOnlineGame))?'inline-block':'none';
 $('res').style.display='block';
}
function finish(){
 if(!B||B.done)return;
 B.done=true;cancelAnimationFrame(raf);draw();
 var won, t;
 if(mode==='endless'){
  won = false;
  var totalPts = B.endless ? B.endless.pointsEarned : 0;
  var waveReached = B.endless ? B.endless.wave : 0;
  t = '☠ แพ้ที่คลื่น ' + waveReached + '\nคะแนนรวม: ' + totalPts;
 } else if(mode==='boss'){
  var bossP=findBoss();
  var bossDead = bossP && !bossP.alive;
  var meAlive = B.players[B.myIndex] && B.players[B.myIndex].alive;
  won = bossDead && meAlive;
 } else {
  won = B.winner === B.myIndex;
 }
 if(mode!=='endless'){
  if(won){
   var addWin;
   if(mode==='online') addWin = WIN_ONLINE;
   else if(mode==='boss'){
    var bossP2 = findBoss();
    var isMixed = bossP2 && bossP2.c._bossType === 'mixed';
    addWin = isMixed ? WIN_BOSS_MIXED : WIN_BOSS;
   } else addWin = WIN_BOT;
   t='★ ชนะ! (+'+addWin+')';
   var pName = (ACC && ACC.name) ? ACC.name : (CH[ACT]?CH[ACT].name:'');
   if(pName){
    addWinsForName(pName, addWin);
    if(ACC && ACC.name){
     ACC.wins = (ACC.wins||0) + addWin;
     saveAccountLocal(ACC);
    }
    submitWin(pName, getWinsForName(pName));
   }
   var a2=getChars();
   if(a2[ACT] && (!ACC || !ACC.name)){
    a2[ACT].wins = getWinsForName(a2[ACT].name);
    setStore(a2);
    CH[ACT].wins = a2[ACT].wins;
   }
  } else {
   var wn='?';
   if(mode==='boss') wn='บอส';
   else if(B.winner>=0&&B.players[B.winner]) wn=B.players[B.winner].c.name;
   t='✕ แพ้... ผู้ชนะ: '+wn;
  }
 }
 if(mode==='online'||mode==='boss'||mode==='endless')closeWs(true);
 showRes(t);renderMenu();drawStaticPreviews();renderProfileCard();
}
function botFrame(k){
 var c=newCanvas(),x=c.getContext('2d');
 x.fillStyle='#78909c';x.fillRect(0,0,S,S);x.fillStyle='#fff';
 if(k===0){x.fillRect(24,32,16,16);x.fillRect(56,32,16,16);}else{x.fillRect(24,42,16,5);x.fillRect(56,42,16,5);}
 x.fillStyle='#000';x.fillRect(30,38,5,5);x.fillRect(62,38,5,5);
 x.fillStyle='#ff4d6d';x.fillRect(30,68,36,8);
 return c.toDataURL('image/png');
}
function bossFrameByType(type, k){
 var c=newCanvas(),x=c.getContext('2d');
 var cfg = BOSS_TYPES[type] || BOSS_TYPES.mixed;
 var baseCol = cfg.color;
 var g=x.createRadialGradient(S/2,S/2,8,S/2,S/2,S*0.7);
 g.addColorStop(0, baseCol); g.addColorStop(1, '#0a0a18');
 x.fillStyle=g;x.fillRect(0,0,S,S);
 switch(type){
  case 'fire':
   x.shadowColor='#ff6a00'; x.shadowBlur=10;
   for(var i=0;i<10;i++){
    var ang = i/10*6.283;
    var fx = S/2 + Math.cos(ang)*S*0.44;
    var fy = S/2 + Math.sin(ang)*S*0.44;
    x.fillStyle = i%2 ? '#ffd166' : '#ff6a00';
    x.beginPath();
    x.moveTo(fx, fy-12); x.lineTo(fx+7, fy+2); x.lineTo(fx, fy+8); x.lineTo(fx-7, fy+2);
    x.closePath();x.fill();
   }
   x.shadowBlur=0;
   break;
  case 'lightning':
   x.strokeStyle='#c8a2ff'; x.lineWidth=3;
   x.shadowColor='#c8a2ff'; x.shadowBlur=10;
   for(var i=0;i<5;i++){
    var ang = i/5*6.283;
    var bx = S/2 + Math.cos(ang)*S*0.42;
    var by = S/2 + Math.sin(ang)*S*0.42;
    x.beginPath();
    x.moveTo(bx-8, by-8); x.lineTo(bx+2, by-2); x.lineTo(bx-4, by+2); x.lineTo(bx+8, by+8);
    x.stroke();
   }
   x.shadowBlur=0;
   break;
  case 'stone':
   x.fillStyle='#5a4a3a';
   x.shadowColor='#a89070'; x.shadowBlur=8;
   for(var i=0;i<7;i++){
    var ang = i/7*6.283;
    var px = S/2 + Math.cos(ang)*S*0.42;
    var py = S/2 + Math.sin(ang)*S*0.42;
    x.beginPath(); x.arc(px, py, 11, 0, 7); x.fill();
   }
   x.shadowBlur=0;
   break;
  case 'summon':
   for(var i=0;i<5;i++){
    var ang = i/5*6.283;
    var sx = S/2 + Math.cos(ang)*S*0.36;
    var sy = S/2 + Math.sin(ang)*S*0.36;
    x.fillStyle = '#ff2244';
    x.shadowColor = '#ff2244'; x.shadowBlur = 12;
    x.beginPath(); x.arc(sx, sy, 8, 0, 7); x.fill();
   }
   x.shadowBlur=0;
   break;
  case 'ice':
   x.strokeStyle='#7fdcff'; x.lineWidth=2;
   x.shadowColor='#7fdcff'; x.shadowBlur=10;
   for(var i=0;i<8;i++){
    var ang = i/8*6.283;
    x.save(); x.translate(S/2, S/2); x.rotate(ang);
    x.beginPath();
    x.moveTo(S*0.44, 0); x.lineTo(S*0.32, -6);
    x.moveTo(S*0.44, 0); x.lineTo(S*0.32, 6);
    x.stroke();
    x.restore();
   }
   x.shadowBlur=0;
   break;
  case 'wind':
   x.strokeStyle='#9ff2c0'; x.lineWidth=2;
   x.shadowColor='#9ff2c0'; x.shadowBlur=10;
   for(var i=0;i<3;i++){
    x.beginPath(); x.arc(S/2, S/2, 14 + i*11, 0.3, 3.5); x.stroke();
   }
   x.shadowBlur=0;
   break;
  case 'fist':
   x.fillStyle='#ffd166';
   x.shadowColor='#ffd166'; x.shadowBlur=12;
   for(var i=0;i<4;i++){
    var ang = i/4*6.283;
    var fx = S/2 + Math.cos(ang)*S*0.4;
    var fy = S/2 + Math.sin(ang)*S*0.4;
    x.fillRect(fx-7, fy-7, 14, 14);
   }
   x.shadowBlur=0;
   break;
  case 'light':
   x.strokeStyle='#fff5c0'; x.lineWidth=3;
   x.shadowColor='#fff5c0'; x.shadowBlur=14;
   for(var i=0;i<16;i++){
    var ang = i/16*6.283;
    x.beginPath();
    x.moveTo(S/2 + Math.cos(ang)*S*0.34, S/2 + Math.sin(ang)*S*0.34);
    x.lineTo(S/2 + Math.cos(ang)*S*0.47, S/2 + Math.sin(ang)*S*0.47);
    x.stroke();
   }
   x.shadowBlur=0;
   break;
  case 'blood':
   x.fillStyle='#c81e3c';
   x.shadowColor='#c81e3c'; x.shadowBlur=12;
   for(var i=0;i<7;i++){
    var ang = i/7*6.283;
    var dx2 = S/2 + Math.cos(ang)*S*0.4;
    var dy2 = S/2 + Math.sin(ang)*S*0.4;
    x.beginPath();
    x.moveTo(dx2, dy2-9);
    x.quadraticCurveTo(dx2+7, dy2+2, dx2, dy2+8);
    x.quadraticCurveTo(dx2-7, dy2+2, dx2, dy2-9);
    x.fill();
   }
   x.shadowBlur=0;
   break;
  case 'dark':
   x.fillStyle='#8a4aff';
   x.shadowColor='#c08aff'; x.shadowBlur=14;
   for(var i=0;i<10;i++){
    var ang = i/10*6.283 + performance.now()/2000;
    var dx3 = S/2 + Math.cos(ang)*S*0.42;
    var dy3 = S/2 + Math.sin(ang)*S*0.42;
    var s = 5 + (i%3)*3;
    x.beginPath(); x.arc(dx3, dy3, s, 0, 7); x.fill();
   }
   x.fillStyle='#05000c';
   x.shadowBlur=0;
   x.beginPath(); x.arc(S/2, S/2, S*0.22, 0, 7); x.fill();
   x.fillStyle='#c08aff';
   x.shadowColor='#c08aff'; x.shadowBlur=18;
   x.beginPath(); x.arc(S/2, S/2, S*0.1, 0, 7); x.fill();
   break;
  case 'water':
   x.strokeStyle='#4fc3f7'; x.lineWidth=3;
   x.shadowColor='#4fc3f7'; x.shadowBlur=12;
   for(var i=0;i<3;i++){
    x.beginPath();
    x.arc(S/2, S/2 + i*6, 14 + i*10, 0.5, Math.PI-0.5);
    x.stroke();
   }
   x.shadowBlur=0;
   break;
  case 'mixed':
  default:
   x.fillStyle='#3a0a12';
   x.beginPath();x.moveTo(20,20);x.lineTo(30,4);x.lineTo(38,26);x.closePath();x.fill();
   x.beginPath();x.moveTo(76,20);x.lineTo(66,4);x.lineTo(58,26);x.closePath();x.fill();
   break;
 }
 if(k===0){
  x.fillStyle='#ffe066';
  x.beginPath();x.arc(34,44,7,0,7);x.fill();
  x.beginPath();x.arc(62,44,7,0,7);x.fill();
  x.fillStyle='#000';
  x.beginPath();x.arc(34,44,3,0,7);x.fill();
  x.beginPath();x.arc(62,44,3,0,7);x.fill();
 } else {
  x.strokeStyle='#ffe066';x.lineWidth=3;
  x.beginPath();x.moveTo(28,44);x.lineTo(40,44);x.stroke();
  x.beginPath();x.moveTo(56,44);x.lineTo(68,44);x.stroke();
 }
 x.fillStyle='#000';
 x.beginPath();x.moveTo(30,68);x.lineTo(66,68);x.lineTo(60,80);x.lineTo(36,80);x.closePath();x.fill();
 x.fillStyle='#fff';
 for(var i=0;i<4;i++){x.beginPath();x.moveTo(32+i*9,68);x.lineTo(35+i*9,74);x.lineTo(38+i*9,68);x.fill();}
 return c.toDataURL('image/png');
}
function makeBot(){
 var ids=Object.keys(SK).filter(function(id){return id!=='pet' && id!=='bossSummon' && id!=='god';}).sort(function(){return Math.random()-.5;}).slice(0,2);
 return {name:'บอท',frames:[botFrame(0),botFrame(1)],wins:0,weapon:'none',
  skills:ids.map(function(id){
   var d=defSkill(id);
   d.dmg=roundHalf(1+Math.random()*4);
   d.cd=roundHalf(5+Math.random()*5);
   applyBalance(d,'init');
   d.power=roundTenth(0.3+Math.random()*0.7);
   return d;
  })};
}
function makeBoss(type){
 type = type || 'mixed';
 var cfg = BOSS_TYPES[type] || BOSS_TYPES.mixed;
 var ids;
 if(cfg.skills && cfg.skills.length){
  ids = cfg.skills.slice();
 } else {
  var baseIds = Object.keys(SK).filter(function(id){ return id!=='pet' && id!=='bossSummon' && id!=='god'; })
    .sort(function(){return Math.random()-.5;}).slice(0,2);
  ids = baseIds.concat(['bossSummon']);
 }
 return {
  name: 'บอส'+cfg.n,
  frames: [bossFrameByType(type, 0), bossFrameByType(type, 1)],
  wins: 0, weapon: 'sword',
  _isBoss: true, _bossType: type, _bossLevel: 1,
  _hp: cfg.hp || 250, _r: cfg.r || 52,
  skills: ids.map(function(id){
   var d = defSkill(id);
   if(id === 'stone'){ d.dmg = 5.5; }
   else if(id === 'bossSummon'){ d.cd = 10; }
   d.power = roundTenth(0.55 + Math.random()*0.45);
   return d;
  })
 };
}
function startBot(){
 var me=CH[ACT];if(!me){toast('สร้างตัวละครก่อนนะ ✎');return;}
 prepChar(makeBot()).then(function(bot){ startBattle('bot',[me,bot],0,'host'); });
}
function startBossSolo(bossType){
 var me=CH[ACT];if(!me){toast('สร้างตัวละครก่อนนะ ✎');return;}
 prepChar(makeBoss(bossType||selectedBossType)).then(function(boss){
  startBattle('boss',[me,boss],0,'host');
 });
}
$('btnBot').onclick=startBot;
$('btnAgain').onclick=function(){
 if(mode==='bot')startBot();
 else if(mode==='boss' && !wasOnlineGame)startBossSolo();
 else if(mode==='endless' && !wasOnlineGame)startEndlessSolo();
};

function renderBossTypes(){
 var h='';
 Object.keys(BOSS_TYPES).forEach(function(t){
  var b = BOSS_TYPES[t];
  h += '<button class="boss-btn" data-bt="'+t+'" style="border-color:'+b.color+';color:'+b.color+'">'+
       '<span>'+b.icon+'</span><span class="bname">'+b.n+'</span><span class="bhp">HP '+b.hp+'</span></button>';
 });
 $('bossTypeList').innerHTML = h;
}
$('btnBoss').onclick=function(){
 var me=CH[ACT];if(!me){toast('สร้างตัวละครก่อนนะ ✎');return;}
 renderBossTypes();
 var box=$('bossTypeOpt');
 box.style.display=(box.style.display==='none'||!box.style.display)?'block':'none';
 $('bossOpt').style.display='none';
 $('endlessOpt').style.display='none';
};
$('btnBossTypeCancel').onclick=function(){$('bossTypeOpt').style.display='none';};
$('bossTypeList').addEventListener('click', function(e){
 var b = e.target.closest('button[data-bt]');
 if(!b) return;
 selectedBossType = b.dataset.bt;
 $('bossTypeOpt').style.display='none';
 var cfg = BOSS_TYPES[selectedBossType];
 $('bossOptName').textContent = 'จำนวนผู้เล่น (บอส'+cfg.n+' HP '+cfg.hp+'):';
 $('bossOpt').style.display='block';
});
$('btnBossCancel').onclick=function(){$('bossOpt').style.display='none';};
document.querySelectorAll('button[data-boss]').forEach(function(btn){
 btn.onclick=function(){
  var n=parseInt(btn.dataset.boss)||1;
  $('bossOpt').style.display='none';
  if(n===1){ startBossSolo(selectedBossType); }
  else { createOnlineRoom('boss', n, selectedBossType); }
 };
});

$('btnEndless').onclick=function(){
 var me=CH[ACT];if(!me){toast('สร้างตัวละครก่อนนะ ✎');return;}
 var box=$('endlessOpt');
 box.style.display=(box.style.display==='none'||!box.style.display)?'block':'none';
 $('bossOpt').style.display='none';
 $('bossTypeOpt').style.display='none';
};
$('btnEndlessCancel').onclick=function(){$('endlessOpt').style.display='none';};
document.querySelectorAll('button[data-endless]').forEach(function(btn){
 btn.onclick=function(){
  var n=parseInt(btn.dataset.endless)||1;
  $('endlessOpt').style.display='none';
  if(n===1){ startEndlessSolo(); }
  else { createOnlineRoom('endless', n); }
 };
});

function createOnlineRoom(mode, size, bossType){
 var me=CH[ACT];
 if(!me){ toast('สร้างตัวละครก่อนนะ ✎'); return; }
 var msg = {a:'createRoom', mode:mode, size:size, char:strip(me)};
 if(mode==='boss'){
  msg.boss = strip(makeBoss(bossType||'mixed'));
 }
 ensureWs().then(function(){ wsSend(msg); }).catch(function(){ toast('เชื่อมต่อไม่ได้'); });
}

$('suckBtn').addEventListener('pointerdown', function(e){
 e.preventDefault();
 if(!B || mode!=='boss' || B.over || B.done) return;
 var boss = findBoss();
 var me = B.players[B.myIndex];
 if(!boss || !me || !me.alive || me.c._isBoss) return;
 if(!boss.suckActive) return;
 if(boss.suckDone && boss.suckDone[B.myIndex] === 'escaped') return;
 if(role === 'guest'){
  guestSuckPress++;
  $('suckProgress').textContent = Math.min(guestSuckPress, BOSS_SUCK_PRESSES) + ' / ' + BOSS_SUCK_PRESSES;
  if(guestSuckPress >= BOSS_SUCK_PRESSES){
   wsSend({a:'suckDone'});
   $('suckBox').style.display = 'none';
  }
 } else {
  if(!boss.suckPulls) boss.suckPulls = {};
  if(!boss.suckDone) boss.suckDone = {};
  boss.suckPulls[B.myIndex] = (boss.suckPulls[B.myIndex]||0) + 1;
  $('suckProgress').textContent = Math.min(boss.suckPulls[B.myIndex], BOSS_SUCK_PRESSES) + ' / ' + BOSS_SUCK_PRESSES;
  if(boss.suckPulls[B.myIndex] >= BOSS_SUCK_PRESSES && boss.suckDone[B.myIndex] !== 'escaped'){
   boss.suckDone[B.myIndex] = 'escaped';
   var dx = me.x - boss.x, dy = me.y - boss.y;
   var d = Math.hypot(dx, dy) || 1;
   me.vx = (dx/d) * 950; me.vy = (dy/d) * 950;
   $('suckBox').style.display = 'none';
  }
 }
});

function updateSuckUI(){
 var box = $('suckBox');
 if(!B || mode!=='boss' || B.over || B.done){ box.style.display='none'; return; }
 var boss = findBoss();
 var me = B.players[B.myIndex];
 if(!boss || !me || !me.alive || me.c._isBoss){ box.style.display='none'; return; }
 if(!boss.suckActive){ box.style.display='none'; return; }
 if(boss.suckDone && boss.suckDone[B.myIndex] === 'escaped'){ box.style.display='none'; return; }
 box.style.display='block';
 if(role === 'guest'){
  $('suckProgress').textContent = Math.min(guestSuckPress, BOSS_SUCK_PRESSES) + ' / ' + BOSS_SUCK_PRESSES;
 } else {
  $('suckProgress').textContent = Math.min((boss.suckPulls && boss.suckPulls[B.myIndex])||0, BOSS_SUCK_PRESSES) + ' / ' + BOSS_SUCK_PRESSES;
 }
 $('suckTime').textContent = Math.max(0, boss.suckTimer||0).toFixed(1) + ' วิ';
}

var LUCKY_POOL = null;
function getLuckyPool(){
 if(LUCKY_POOL) return LUCKY_POOL;
 var ids = Object.keys(SK).filter(function(id){ return id!=='pet' && id!=='bossSummon' && id!=='god'; });
 LUCKY_POOL = ids.concat(['hp']);
 return LUCKY_POOL;
}
function luckyRoll(){
 if(!B || B.over || B.done) return;
 var me = B.players[B.myIndex];
 if(!me || !me.alive) return;
 if(me.c.weapon!=='lucky') return;
 if(me.luckyCd > 0){ toast('รอคูลดาวน์ '+me.luckyCd.toFixed(1)+' วิ'); return; }
 var pool = getLuckyPool();
 var pick = pool[Math.floor(Math.random()*pool.length)];
 luckyRollReward = pick;
 var resEl = $('luckyResult');
 if(pick==='hp'){
  resEl.innerHTML = '<span style="color:#88ff44">💚 HP +50%</span>';
 } else {
  var sk = SK[pick];
  resEl.innerHTML = '<span style="color:'+sk.color+'">'+elemSvg(pick,26,sk.color)+' '+sk.n+'</span>';
 }
 resEl.style.animation='none';
 void resEl.offsetWidth;
 resEl.style.animation='luckyIn .4s ease-out';
 $('luckyRoll').style.display='block';
 $('luckyBtn').disabled = true;
}
function luckyConfirm(){
 if(!B || B.over || B.done) return;
 var me = B.players[B.myIndex];
 if(!me || !me.alive) return;
 if(!luckyRollReward){ return; }
 var reward = luckyRollReward;
 luckyRollReward = null;
 $('luckyRoll').style.display='none';
 $('luckyBtn').disabled = false;
 me.luckyCd = LUCKY_CARD_CD;

 if(reward==='hp'){
  var healAmt = me.maxHp * 0.5;
  me.hp = Math.min(me.maxHp, me.hp + healAmt);
  burst(me.x, me.y, '#88ff44', 60, 2.2);
  burst(me.x, me.y, '#ffffff', 30, 2.4);
  me.say = 'heal'; me.sayT = 0.8;
  toast('💚 ฟื้น HP +'+Math.round(healAmt));
  return;
 }
 var target = nearestEnemy(me);
 if(!target){ toast('ไม่มีเป้าให้ขว้าง'); return; }
 var a = Math.atan2(target.y-me.y, target.x-me.x);
 var color = SK[reward] ? SK[reward].color : '#ffd166';
 B.proj.push({
  k:'card', owner:me.index,
  x: me.x + Math.cos(a)*me.r,
  y: me.y + Math.sin(a)*me.r,
  vx: Math.cos(a)*520, vy: Math.sin(a)*520,
  r: 14, dmg: LUCKY_CARD_DMG, power:0.5,
  color: color, ang:a, life:3,
  castImgs:null, statusImgs:null, statusSrc:null,
  trail:[], weapon:true,
  cardSkill: reward
 });
 burst(me.x, me.y, color, 30, 1.8);
 burst(me.x, me.y, '#ffd166', 15, 2.0);
 toast('🎴 ขว้างการ์ด '+ (SK[reward]?SK[reward].n:'') +'!');
}
$('luckyBtn').onclick = function(e){ e.preventDefault(); luckyRoll(); };
$('luckyConfirm').onclick = function(e){ e.preventDefault(); luckyConfirm(); };

$('btnHome').onclick=function(){
 $('res').style.display='none';cancelAnimationFrame(raf);
 $('suckBox').style.display='none';
 $('luckyBox').style.display='none';
 $('waveBanner').style.display='none';
 $('endlessHUD').style.display='none';
 closeWs(true);show('menu');updCnt();drawStaticPreviews();renderProfileCard();
 $('onlineOpt').style.display='none';
 $('bossOpt').style.display='none';
 $('bossTypeOpt').style.display='none';
 $('endlessOpt').style.display='none';
 bc.width=360; bc.height=520; bc.style.maxWidth='360px';
 $('battle').style.maxWidth='520px';
};

loadChars().then(function(){ syncWinsToServer(); });
})();
</script></body></html>`;

// ================= SERVER =================
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ACC_FILE = process.env.DATA_FILE || path.join(DATA_DIR, 'accounts.json');
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 โฟลเดอร์ข้อมูล: ' + DATA_DIR);
  console.log('📄 ไฟล์บัญชี:     ' + ACC_FILE);
} catch (e) {
  console.error('❌ สร้างโฟลเดอร์ข้อมูลไม่สำเร็จ:', e.message);
  console.error('   → ลองตั้ง env DATA_DIR ไปที่โฟลเดอร์ที่เขียนได้');
}

const clients = new Set();
const accounts = new Map();

function loadAcc() {
  try {
    if (!fs.existsSync(ACC_FILE)) {
      console.log('ℹ  ยังไม่มีไฟล์บัญชี — เริ่มต้นใหม่');
      return;
    }
    const raw = fs.readFileSync(ACC_FILE, 'utf8');
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      arr.forEach(a => {
        if (a && typeof a.name === 'string' && a.name.length <= 12) {
          accounts.set(a.name, {
            name: a.name,
            keypass: typeof a.keypass === 'string' ? a.keypass : '',
            avatar: typeof a.avatar === 'string' ? a.avatar : '',
            wins: Math.max(0, Math.floor(Number(a.wins) || 0))
          });
        }
      });
    }
    console.log('✓ โหลดบัญชี ' + accounts.size + ' รายการ');
  } catch (e) {
    console.error('❌ โหลดบัญชีไม่สำเร็จ:', e.message);
    try {
      const bak = ACC_FILE + '.bak';
      if (fs.existsSync(bak)) {
        const arr = JSON.parse(fs.readFileSync(bak, 'utf8'));
        if (Array.isArray(arr)) {
          arr.forEach(a => {
            if (a && typeof a.name === 'string') {
              accounts.set(a.name, {
                name: a.name,
                keypass: typeof a.keypass === 'string' ? a.keypass : '',
                avatar: typeof a.avatar === 'string' ? a.avatar : '',
                wins: Math.max(0, Math.floor(Number(a.wins) || 0))
              });
            }
          });
          console.log('✓ กู้คืนจาก backup ' + accounts.size + ' รายการ');
        }
      }
    } catch (e2) { console.error('   กู้ backup ไม่ได้:', e2.message); }
  }
}

let saveTimer = null;
function writeAccSync() {
  const arr = [...accounts.values()].map(a => ({
    name: a.name, keypass: a.keypass, avatar: a.avatar, wins: a.wins
  }));
  const tmp = ACC_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(arr, null, 2));
  try {
    if (fs.existsSync(ACC_FILE)) fs.copyFileSync(ACC_FILE, ACC_FILE + '.bak');
  } catch (e) {}
  fs.renameSync(tmp, ACC_FILE);
}
function saveAcc() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { writeAccSync(); }
    catch (e) { console.error('❌ บันทึกบัญชีไม่สำเร็จ:', e.message); }
  }, 400);
}
loadAcc();

const rooms = new Map();
let roomIdCounter = 0;
function makeRoomId() { return 'r' + (++roomIdCounter) + '_' + Date.now().toString(36); }
function roomSummary(r) {
  const host = r.chars[0] || { name: '?' };
  const avatar = (host.frames && host.frames[0]) ? host.frames[0] : '';
  return {
    id: r.id, mode: r.mode, size: r.size, count: r.clients.length,
    host: {
      name: String(host.name || '?').slice(0, 12),
      avatar: avatar,
      wins: Math.max(0, Math.floor(Number(host.wins) || 0))
    }
  };
}
function broadcastRooms() {
  const list = [...rooms.values()].map(roomSummary);
  clients.forEach(c => send(c, { type: 'rooms', rooms: list }, true));
}
function removeFromRoom(c) {
  if (!c.roomId) return;
  const r = rooms.get(c.roomId);
  c.roomId = null;
  if (!r) return;
  const idx = r.clients.indexOf(c);
  if (idx >= 0) { r.clients.splice(idx, 1); r.chars.splice(idx, 1); }
  if (r.clients.length === 0) rooms.delete(r.id);
  broadcastRooms();
}
function leaderboardList() {
  return [...accounts.values()]
    .filter(a => a.wins > 0)
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 20)
    .map(a => ({ name: a.name, wins: a.wins, avatar: a.avatar || '' }));
}
function addWin(name, amount) {
  name = String(name || '').slice(0, 12).trim();
  if (!name) return;
  amount = Math.max(1, Math.floor(Number(amount) || 1));
  let acc = accounts.get(name);
  if (!acc) { acc = { name, keypass: '', avatar: '', wins: 0 }; accounts.set(name, acc); }
  acc.wins = (acc.wins || 0) + amount;
  saveAcc();
}
function setWinTotal(name, total) {
  name = String(name || '').slice(0, 12).trim();
  total = Math.max(0, Math.floor(Number(total) || 0));
  if (!name || total <= 0) return;
  let acc = accounts.get(name);
  if (!acc) { acc = { name, keypass: '', avatar: '', wins: 0 }; accounts.set(name, acc); }
  if (total > (acc.wins || 0)) { acc.wins = total; saveAcc(); }
}
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
  try { c.sock.write(frame(1, JSON.stringify(obj))); } catch (e) {}
}
function drop(c) {
  removeFromRoom(c);
  if (c.peerGroup) {
    c.peerGroup.forEach(p => {
      if (p !== c && !p.sock.destroyed) send(p, { type: 'left' });
    });
    c.peerGroup = null;
  }
}
function onMsg(c, txt) {
  c.n++;
  if (c.n > 200) return;
  let d;
  try { d = JSON.parse(txt); } catch (e) { return; }
  if (!d || typeof d !== 'object') return;

  if (d.a === 'createRoom') {
    if (!d.char || typeof d.char !== 'object') return;
    const mode = d.mode === 'boss' ? 'boss' : (d.mode === 'endless' ? 'endless' : 'normal');
    const size = Math.max(2, Math.min(5, parseInt(d.size) || 2));
    removeFromRoom(c);
    const id = makeRoomId();
    const r = { id, mode, size, clients: [c], chars: [d.char],
      boss: mode === 'boss' ? d.boss : null, createdAt: Date.now() };
    rooms.set(id, r);
    c.roomId = id;
    send(c, { type: 'roomCreated', id, size, mode });
    broadcastRooms();
  } else if (d.a === 'listRooms') {
    send(c, { type: 'rooms', rooms: [...rooms.values()].map(roomSummary) });
  } else if (d.a === 'joinRoom') {
    const r = rooms.get(String(d.id || ''));
    if (!r) { send(c, { type: 'error', msg: 'ห้องปิดแล้ว' }); return; }
    if (r.clients.length >= r.size) { send(c, { type: 'error', msg: 'ห้องเต็ม' }); return; }
    if (!d.char || typeof d.char !== 'object') return;
    removeFromRoom(c);
    r.clients.push(c);
    r.chars.push(d.char);
    c.roomId = r.id;
    if (r.clients.length >= r.size) {
      const group = r.clients.slice();
      group.forEach((cl, i) => {
        cl.peerGroup = group.filter(x => x !== cl);
        cl.myIndex = i;
        cl.roomId = null;
        const msg = { type: 'match', players: r.chars, myIndex: i, size: r.size };
        if (r.mode === 'boss') { msg.mode = 'boss'; msg.boss = r.boss; }
        if (r.mode === 'endless') { msg.mode = 'endless'; }
        send(cl, msg);
      });
      rooms.delete(r.id);
      broadcastRooms();
    } else {
      send(c, { type: 'roomJoined', id: r.id, count: r.clients.length, size: r.size });
      broadcastRooms();
    }
  } else if (d.a === 'leaveRoom') {
    removeFromRoom(c);
  } else if (d.a === 'relay') {
    if (c.peerGroup) {
      c.peerGroup.forEach(p => {
        if (p !== c && !p.sock.destroyed) send(p, { type: 'state', s: d.s }, true);
      });
    }
  } else if (d.a === 'suckDone') {
    if (c.peerGroup) {
      c.peerGroup.forEach(p => {
        if (p !== c && !p.sock.destroyed) send(p, { type: 'suckDone', from: c.myIndex });
      });
    }
  } else if (d.a === 'win') {
    if (typeof d.name === 'string') addWin(d.name, 10);
  } else if (d.a === 'leave') {
    drop(c);
  }
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'GET' && u.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(HTML);
  }
  if (req.method === 'GET' && u.pathname === '/count') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ online: clients.size, rooms: rooms.size }));
  }
  if (req.method === 'GET' && u.pathname === '/leaderboard') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(leaderboardList()));
  }
  if (req.method === 'GET' && u.pathname === '/rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify([...rooms.values()].map(roomSummary)));
  }
  if (req.method === 'GET' && u.pathname === '/debug/accounts') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({
      count: accounts.size,
      dataDir: DATA_DIR,
      accFile: ACC_FILE,
      exists: fs.existsSync(ACC_FILE)
    }));
  }
  if (req.method === 'POST' && u.pathname === '/account') {
    let body = '';
    let tooBig = false;
    req.on('data', d => {
      body += d;
      if (body.length > 200000) { tooBig = true; req.destroy(); }
    });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      if (tooBig) { res.end(JSON.stringify({ ok: false, msg: 'ข้อมูลใหญ่เกินไป' })); return; }
      try {
        const j = JSON.parse(body);
        const name = String(j.name || '').trim().slice(0, 12);
        const keypass = String(j.keypass || '').trim().slice(0, 6);
        const avatar = typeof j.avatar === 'string' ? j.avatar : '';
        if (!name) { res.end(JSON.stringify({ ok: false, msg: 'ต้องมีชื่อ' })); return; }
        if (keypass.length !== 6) { res.end(JSON.stringify({ ok: false, msg: 'รหัสต้อง 6 ตัว' })); return; }
        let acc = accounts.get(name);
        if (acc) {
          if (acc.keypass && acc.keypass !== keypass) {
            res.end(JSON.stringify({ ok: false, msg: 'ชื่อนี้ถูกใช้แล้วหรือรหัสไม่ถูก' }));
            return;
          }
          acc.keypass = keypass;
          if (avatar) acc.avatar = avatar;
          saveAcc();
          res.end(JSON.stringify({ ok: true, name: acc.name, wins: acc.wins || 0, avatar: acc.avatar || '' }));
        } else {
          acc = { name, keypass, avatar, wins: 0 };
          accounts.set(name, acc);
          saveAcc();
          res.end(JSON.stringify({ ok: true, name: acc.name, wins: 0, avatar: acc.avatar || '' }));
        }
      } catch (e) {
        res.end(JSON.stringify({ ok: false, msg: 'ข้อมูลไม่ถูกต้อง' }));
      }
    });
    return;
  }
  if (req.method === 'POST' && u.pathname === '/account/login') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 4000) req.destroy(); });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      try {
        const j = JSON.parse(body);
        const name = String(j.name || '').trim().slice(0, 12);
        const keypass = String(j.keypass || '').trim().slice(0, 6);
        const acc = accounts.get(name);
        if (!acc || acc.keypass !== keypass) {
          res.end(JSON.stringify({ ok: false, msg: 'ชื่อหรือรหัสไม่ถูกต้อง' }));
          return;
        }
        res.end(JSON.stringify({ ok: true, name: acc.name, wins: acc.wins || 0, avatar: acc.avatar || '' }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, msg: 'ข้อมูลไม่ถูกต้อง' }));
      }
    });
    return;
  }
  if (req.method === 'POST' && u.pathname === '/win') {
    let body = '';
    let tooBig = false;
    req.on('data', d => {
      body += d;
      if (body.length > 4000) { tooBig = true; req.destroy(); }
    });
    req.on('end', () => {
      if (tooBig) return;
      try {
        const j = JSON.parse(body);
        const name = String(j.name || '').trim().slice(0, 12);
        const total = Math.max(0, Math.floor(Number(j.total) || 0));
        if (name && total > 0) setWinTotal(name, total);
      } catch (e) {}
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
      res.end('ok');
    });
    return;
  }
  res.writeHead(404); res.end();
});

server.on('upgrade', (req, socket) => {
  const u = new URL(req.url, 'http://x');
  const key = req.headers['sec-websocket-key'];
  if (u.pathname !== '/ws' || !key) { socket.destroy(); return; }
  if (clients.size >= MAXCONN) { socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n'); socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);

  const c = { sock: socket, peerGroup: null, char: null, roomId: null, n: 0, myIndex: 0 };
  clients.add(c);
  const rt = setInterval(() => { c.n = 0; }, 1000);
  const pt = setInterval(() => { if (!socket.destroyed) { try { socket.write(frame(9, '')); } catch (e) {} } }, 25000);
  let dead = false;
  const cleanup = () => {
    if (dead) return; dead = true;
    clearInterval(rt); clearInterval(pt);
    clients.delete(c);
    drop(c);
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
      if (op === 8) { try { socket.end(frame(8, '')); } catch (e) {} return; }
      if (op === 9) { try { socket.write(frame(10, payload)); } catch (e) {} continue; }
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

function gracefulExit(sig) {
  console.log('\n⏹  ได้รับ ' + sig + ' — กำลังบันทึกข้อมูล...');
  try { writeAccSync(); console.log('✓ บันทึก ' + accounts.size + ' บัญชีเรียบร้อย'); }
  catch (e) { console.error('❌ บันทึกไม่สำเร็จ:', e.message); }
  process.exit(0);
}
process.on('SIGINT', () => gracefulExit('SIGINT'));
process.on('SIGTERM', () => gracefulExit('SIGTERM'));

server.listen(PORT, '0.0.0.0', () => {
  console.log('🎮 เกมพร้อมแล้ว!  พอร์ต ' + PORT);
  console.log('   เครื่องนี้ : http://localhost:' + PORT);
  const n = os.networkInterfaces();
  Object.keys(n).forEach(k => n[k].forEach(i => {
    if (i.family === 'IPv4' && !i.internal) console.log('   วงเดียวกัน : http://' + i.address + ':' + PORT);
  }));
  console.log('   👉 จะให้คนทั่วโลกเล่น: cloudflared tunnel --url http://localhost:' + PORT);
  console.log('');
  console.log('📌 ข้อมูลบัญชีเก็บที่: ' + ACC_FILE);
  console.log('📌 อย่าลบโฟลเดอร์ data/ ตอนอัปเดต!');
  console.log('📌 ตรวจสอบ: http://localhost:' + PORT + '/debug/accounts');
});

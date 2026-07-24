/* ============================================================
   বাংলাদেশ মনোপলি — Authoritative game server
   Node + Express (static) + ws (real-time). All game rules run
   here so clients can only send intents, never mutate state.
   ============================================================ */
const path = require("path");
const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

/* ------------------------------------------------------------
   BOARD  (All-Bangladesh theme, full Bangla names)
   type: go | prop | rr | util | tax | chance | chest | jail | gotojail | free
   group colors scale cheap -> premium.
   ------------------------------------------------------------ */
const C = {
  brown:"#8d5a2b", lblue:"#a9def9", pink:"#e56399", orange:"#ee964b",
  red:"#d62828", yellow:"#f6bd60", green:"#2a9d3f", blue:"#1d4e89"
};

const BOARD = [
  { n:"শুরু",                 type:"go" },
  { n:"সাতক্ষীরা",            type:"prop", group:"brown",  price:60,  rent:[2,10,30,90,160,250],       house:50 },
  { n:"গণ তহবিল",            type:"chest" },
  { n:"কুড়িগ্রাম",            type:"prop", group:"brown",  price:60,  rent:[4,20,60,180,320,450],       house:50 },
  { n:"আয়কর",               type:"tax",  amount:200 },
  { n:"কমলাপুর রেল স্টেশন",  type:"rr",   price:200 },
  { n:"ভোলা",                type:"prop", group:"lblue",  price:100, rent:[6,30,90,270,400,550],       house:50 },
  { n:"ভাগ্য",               type:"chance" },
  { n:"বরিশাল",              type:"prop", group:"lblue",  price:100, rent:[6,30,90,270,400,550],       house:50 },
  { n:"পটুয়াখালী",           type:"prop", group:"lblue",  price:120, rent:[8,40,100,300,450,600],      house:50 },
  { n:"কারাগার",             type:"jail" },
  { n:"রংপুর",               type:"prop", group:"pink",   price:140, rent:[10,50,150,450,625,750],     house:100 },
  { n:"বিদ্যুৎ কোম্পানি",     type:"util", price:150 },
  { n:"দিনাজপুর",            type:"prop", group:"pink",   price:140, rent:[10,50,150,450,625,750],     house:100 },
  { n:"বগুড়া",               type:"prop", group:"pink",   price:160, rent:[12,60,180,500,700,900],     house:100 },
  { n:"শাহজালাল বিমানবন্দর", type:"rr",   price:200 },
  { n:"ময়মনসিংহ",           type:"prop", group:"orange", price:180, rent:[14,70,200,550,750,950],     house:100 },
  { n:"গণ তহবিল",            type:"chest" },
  { n:"কুমিল্লা",             type:"prop", group:"orange", price:180, rent:[14,70,200,550,750,950],     house:100 },
  { n:"টাঙ্গাইল",            type:"prop", group:"orange", price:200, rent:[16,80,220,600,800,1000],    house:100 },
  { n:"ফ্রি পার্কিং",         type:"free" },
  { n:"যশোর",                type:"prop", group:"red",    price:220, rent:[18,90,250,700,875,1050],    house:150 },
  { n:"ভাগ্য",               type:"chance" },
  { n:"খুলনা",               type:"prop", group:"red",    price:220, rent:[18,90,250,700,875,1050],    house:150 },
  { n:"নারায়ণগঞ্জ",          type:"prop", group:"red",    price:240, rent:[20,100,300,750,925,1100],   house:150 },
  { n:"সদরঘাট লঞ্চ টার্মিনাল",type:"rr",   price:200 },
  { n:"কক্সবাজার",           type:"prop", group:"yellow", price:260, rent:[22,110,330,800,975,1150],   house:150 },
  { n:"সেন্ট মার্টিন",        type:"prop", group:"yellow", price:260, rent:[22,110,330,800,975,1150],   house:150 },
  { n:"তিতাস গ্যাস",         type:"util", price:150 },
  { n:"সুন্দরবন",            type:"prop", group:"yellow", price:280, rent:[24,120,360,850,1025,1200],  house:150 },
  { n:"জেলে যাও",            type:"gotojail" },
  { n:"সিলেট",               type:"prop", group:"green",  price:300, rent:[26,130,390,900,1100,1275],  house:200 },
  { n:"রাজশাহী",             type:"prop", group:"green",  price:300, rent:[26,130,390,900,1100,1275],  house:200 },
  { n:"গণ তহবিল",            type:"chest" },
  { n:"চট্টগ্রাম",            type:"prop", group:"green",  price:320, rent:[28,150,450,1000,1200,1400], house:200 },
  { n:"গাবতলী বাস টার্মিনাল", type:"rr",   price:200 },
  { n:"ভাগ্য",               type:"chance" },
  { n:"গুলশান",              type:"prop", group:"blue",   price:350, rent:[35,175,500,1100,1300,1500], house:200 },
  { n:"সম্পূরক কর",          type:"tax",  amount:100 },
  { n:"ঢাকা",                type:"prop", group:"blue",   price:400, rent:[50,200,600,1400,1700,2000], house:200 },
];
// expose colors for client
const GROUP_COLORS = C;

/* ---- Card decks. Each card: {t: bangla text, fx: function(room, player)} ---- */
const CHANCE = [
  { t:"শুরুতে এগিয়ে যান। ৳২০০ সংগ্রহ করুন।",            fx:(r,p)=>moveTo(r,p,0,true) },
  { t:"ঢাকায় এগিয়ে যান।",                               fx:(r,p)=>moveTo(r,p,39,true) },
  { t:"সিলেটে এগিয়ে যান।",                               fx:(r,p)=>moveTo(r,p,31,true) },
  { t:"ব্যাংক থেকে লভ্যাংশ ৳৫০ পেলেন।",                  fx:(r,p)=>credit(r,p,50) },
  { t:"৩ ঘর পিছিয়ে যান।",                               fx:(r,p)=>moveTo(r,p,(p.pos+37)%40,false) },
  { t:"সরাসরি কারাগারে যান।",                            fx:(r,p)=>goJail(r,p) },
  { t:"গাড়ির গতি জরিমানা ৳১৫ দিন।",                     fx:(r,p)=>debit(r,p,15) },
  { t:"কমলাপুর রেল স্টেশনে এগিয়ে যান।",                 fx:(r,p)=>moveTo(r,p,5,true) },
  { t:"নির্মাণ ঋণ পরিপক্ব হলো। ৳১৫০ পেলেন।",            fx:(r,p)=>credit(r,p,150) },
  { t:"রাস্তা মেরামত: প্রতি বাড়ি ৳২৫, প্রতি হোটেল ৳১০০।", fx:(r,p)=>repairs(r,p,25,100) },
];
const CHEST = [
  { t:"ব্যাংকের ভুলে আপনি ৳২০০ পেলেন।",       fx:(r,p)=>credit(r,p,200) },
  { t:"ডাক্তারের ফি ৳৫০ দিন।",                fx:(r,p)=>debit(r,p,50) },
  { t:"শেয়ার বিক্রি করে ৳৫০ পেলেন।",          fx:(r,p)=>credit(r,p,50) },
  { t:"সরাসরি কারাগারে যান।",                 fx:(r,p)=>goJail(r,p) },
  { t:"ছুটির তহবিল থেকে ৳১০০ পেলেন।",         fx:(r,p)=>credit(r,p,100) },
  { t:"আয়কর ফেরত ৳২০ পেলেন।",               fx:(r,p)=>credit(r,p,20) },
  { t:"আজ আপনার জন্মদিন! প্রত্যেকের থেকে ৳১০ পান।", fx:(r,p)=>birthday(r,p) },
  { t:"জীবন বীমা পরিপক্ব হলো। ৳১০০ পেলেন।",    fx:(r,p)=>credit(r,p,100) },
  { t:"হাসপাতালের খরচ ৳১০০ দিন।",             fx:(r,p)=>debit(r,p,100) },
  { t:"উত্তরাধিকার সূত্রে ৳১০০ পেলেন।",        fx:(r,p)=>credit(r,p,100) },
];

const PCOLORS = ["#e63946","#457b9d","#2a9d8f","#e9c46a","#9d4edd","#f4845f"];
const BOT_NAMES = ["রোবট-১","রোবট-২","রোবট-৩","রোবট-৪","রোবট-৫"];

/* ============================================================
   ROOMS
   ============================================================ */
const rooms = new Map(); // code -> room

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = "";
    for (let i = 0; i < 5; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  } while (rooms.has(code));
  return code;
}

function createRoom() {
  const code = makeCode();
  const room = {
    code,
    players: [],
    ownership: {},   // pos -> playerIndex
    houses: {},      // pos -> 0..5 (5 = hotel)
    turn: 0,
    dice: [1, 1],
    doubles: 0,
    started: false,
    winner: null,
    phase: "lobby",  // lobby | awaitRoll | awaitEnd | over
    canBuy: false,
    lastCard: null,  // {deck, text} shown briefly
    log: [],
    hostClient: null,
    botTimer: null,
  };
  rooms.set(code, room);
  return room;
}

function logMsg(room, text, cls = "") {
  room.log.push({ text, cls });
  if (room.log.length > 60) room.log.shift();
}

/* ============================================================
   PLAYER HELPERS
   ============================================================ */
const idxOf = (room, p) => room.players.indexOf(p);
const cur = (room) => room.players[room.turn];

function ownsGroup(room, p, group) {
  const cells = BOARD.map((s, i) => ({ s, i })).filter((x) => x.s.group === group);
  return cells.every((x) => room.ownership[x.i] === idxOf(room, p));
}
function countType(room, p, type) {
  let c = 0;
  BOARD.forEach((s, i) => { if (s.type === type && room.ownership[i] === idxOf(room, p)) c++; });
  return c;
}

/* ============================================================
   MONEY
   ============================================================ */
function credit(room, p, amt) {
  p.money += amt;
  logMsg(room, `${p.name} ৳${amt} পেলেন।`, "good");
}
function debit(room, p, amt, toPlayer) {
  p.money -= amt;
  if (toPlayer) { toPlayer.money += amt; logMsg(room, `${p.name} → ${toPlayer.name} ভাড়া ৳${amt}।`, "rent"); }
  else logMsg(room, `${p.name} ৳${amt} পরিশোধ করলেন।`, "bad");
  if (p.money < 0) settleDebt(room, p, toPlayer);
}
function birthday(room, p) {
  let got = 0;
  room.players.forEach((o) => { if (o !== p && !o.bankrupt) { o.money -= 10; got += 10; } });
  p.money += got;
  logMsg(room, `${p.name} জন্মদিনে সবার থেকে ৳${got} পেলেন।`, "good");
}
function repairs(room, p, perHouse, perHotel) {
  let cost = 0;
  Object.keys(room.houses).forEach((pos) => {
    if (room.ownership[pos] === idxOf(room, p)) {
      const n = room.houses[pos];
      cost += n === 5 ? perHotel : n * perHouse;
    }
  });
  if (cost > 0) { logMsg(room, `${p.name} মেরামত খরচ ৳${cost}।`, "bad"); debit(room, p, cost); }
}

/* When a player can't pay: auto-sell houses at half; if still short -> bankrupt. */
function settleDebt(room, p, creditor) {
  // sell houses (half price) belonging to p until solvent
  const myProps = Object.keys(room.houses).filter(
    (pos) => room.ownership[pos] === idxOf(room, p) && room.houses[pos] > 0
  );
  for (const pos of myProps) {
    while (room.houses[pos] > 0 && p.money < 0) {
      room.houses[pos]--;
      p.money += Math.floor(BOARD[pos].house / 2);
      logMsg(room, `${p.name} ${BOARD[pos].n}-এ বাড়ি বিক্রি করলেন।`, "info");
    }
  }
  if (p.money < 0) {
    // bankrupt
    p.bankrupt = true;
    logMsg(room, `💀 ${p.name} দেউলিয়া হয়ে গেলেন!`, "bad");
    // transfer all properties
    Object.keys(room.ownership).forEach((pos) => {
      if (room.ownership[pos] === idxOf(room, p)) {
        if (creditor && !creditor.bankrupt) room.ownership[pos] = idxOf(room, creditor);
        else delete room.ownership[pos];
        room.houses[pos] = 0;
      }
    });
    p.money = 0;
    checkWin(room);
  }
}

/* ============================================================
   MOVEMENT + LANDING
   ============================================================ */
function moveTo(room, p, pos, collectGo) {
  if (collectGo && pos < p.pos) { p.money += 200; logMsg(room, `${p.name} শুরু পার হয়ে ৳২০০ পেলেন।`, "good"); }
  p.pos = pos;
  landOn(room, p);
}
function advance(room, p, steps) {
  const np = (p.pos + steps) % 40;
  if (np < p.pos) { p.money += 200; logMsg(room, `${p.name} শুরু পার হয়ে ৳২০০ পেলেন।`, "good"); }
  p.pos = np;
  landOn(room, p);
}
function goJail(room, p) {
  p.pos = 10; p.jail = true; p.jailTurns = 0;
  room.doubles = 0;
  logMsg(room, `🚔 ${p.name} কারাগারে গেলেন।`, "bad");
}

function landOn(room, p) {
  const sq = BOARD[p.pos];
  const owner = room.ownership[p.pos];
  room.canBuy = false;

  switch (sq.type) {
    case "go": logMsg(room, `${p.name} শুরুতে আছেন।`, "info"); break;
    case "free": logMsg(room, `${p.name} ফ্রি পার্কিং-এ বিশ্রাম নিচ্ছেন।`, "info"); break;
    case "jail": logMsg(room, `${p.name} কারাগার পরিদর্শনে।`, "info"); break;
    case "tax": logMsg(room, `${p.name} ${sq.n} ৳${sq.amount} দিলেন।`, "bad"); debit(room, p, sq.amount); break;
    case "gotojail": goJail(room, p); break;
    case "chance": drawCard(room, p, CHANCE, "ভাগ্য"); break;
    case "chest": drawCard(room, p, CHEST, "গণ তহবিল"); break;
    case "prop": case "rr": case "util":
      if (owner === undefined) {
        if (p.money >= sq.price) { room.canBuy = true; logMsg(room, `${p.name} ${sq.n}-এ নামলেন (৳${sq.price})।`, "info"); }
        else logMsg(room, `${p.name} ${sq.n}-এ নামলেন কিন্তু কেনার টাকা নেই।`, "info");
      } else if (owner === idxOf(room, p)) {
        logMsg(room, `${p.name} নিজের সম্পত্তি ${sq.n}-এ আছেন।`, "info");
      } else {
        payRent(room, p, sq, room.players[owner]);
      }
      break;
  }
}

function payRent(room, p, sq, owner) {
  if (owner.jail) { logMsg(room, `${owner.name} কারাগারে — ${sq.n}-এ ভাড়া নেই।`, "info"); return; }
  let rent = 0;
  if (sq.type === "prop") {
    const h = room.houses[p.pos] || 0;
    rent = sq.rent[h];
    if (h === 0 && ownsGroup(room, owner, sq.group)) rent *= 2; // full-set double rent
  } else if (sq.type === "rr") {
    rent = [0, 25, 50, 100, 200][countType(room, owner, "rr")];
  } else if (sq.type === "util") {
    const mult = countType(room, owner, "util") === 2 ? 10 : 4;
    rent = mult * (room.dice[0] + room.dice[1]);
  }
  logMsg(room, `${p.name} ${sq.n}-এ ভাড়া ৳${rent} দিতে হবে।`, "rent");
  debit(room, p, rent, owner);
}

function drawCard(room, p, deck, name) {
  const card = deck[Math.floor(Math.random() * deck.length)];
  room.lastCard = { deck: name, text: card.t };
  logMsg(room, `${name}: ${card.t}`, "info");
  card.fx(room, p);
}

/* ============================================================
   TURN ACTIONS (called by handlers, validated as current player)
   ============================================================ */
function doRoll(room) {
  const p = cur(room);
  if (room.phase !== "awaitRoll" || p.bankrupt) return;

  const a = 1 + Math.floor(Math.random() * 6);
  const b = 1 + Math.floor(Math.random() * 6);
  room.dice = [a, b];
  const sum = a + b, dbl = a === b;
  logMsg(room, `${p.name} ছক্কা ফেলল: ${a} + ${b} = ${sum}${dbl ? " (ডাবল!)" : ""}।`, "info");

  // Jail handling
  if (p.jail) {
    if (dbl) { logMsg(room, `${p.name} ডাবল ফেলে কারাগার থেকে মুক্ত!`, "info"); p.jail = false; }
    else {
      p.jailTurns = (p.jailTurns || 0) + 1;
      if (p.jailTurns >= 3) { logMsg(room, `${p.name} ৩ বার পর ৳৫০ দিয়ে মুক্ত হলেন।`, "info"); p.money -= 50; p.jail = false; }
      else { logMsg(room, `${p.name} কারাগারে রয়ে গেলেন।`, "info"); room.phase = "awaitEnd"; return; }
    }
  }

  room.doubles = dbl ? room.doubles + 1 : 0;
  if (room.doubles === 3) { logMsg(room, `${p.name} পরপর ৩ ডাবল — কারাগারে!`, "bad"); goJail(room, p); room.phase = "awaitEnd"; return; }

  advance(room, p, sum);
  room.phase = "awaitEnd";
}

function doBuy(room) {
  const p = cur(room);
  if (room.phase !== "awaitEnd" || !room.canBuy) return;
  const sq = BOARD[p.pos];
  if (room.ownership[p.pos] !== undefined || p.money < sq.price) return;
  p.money -= sq.price;
  room.ownership[p.pos] = idxOf(room, p);
  room.canBuy = false;
  logMsg(room, `🏠 ${p.name} ${sq.n} কিনলেন (৳${sq.price})।`, "good");
}

function doBuild(room, pos) {
  const p = cur(room);
  if (p.bankrupt) return;
  const sq = BOARD[pos];
  if (!sq || sq.type !== "prop") return;
  if (room.ownership[pos] !== idxOf(room, p)) return;
  if (!ownsGroup(room, p, sq.group)) return;
  if ((room.houses[pos] || 0) >= 5) return;
  if (p.money < sq.house) return;
  p.money -= sq.house;
  room.houses[pos] = (room.houses[pos] || 0) + 1;
  const lvl = room.houses[pos] === 5 ? "হোটেল" : `${room.houses[pos]} বাড়ি`;
  logMsg(room, `${p.name} ${sq.n}-এ নির্মাণ করলেন (${lvl})।`, "good");
}

function doSell(room, pos) {
  const p = cur(room);
  const sq = BOARD[pos];
  if (!sq || sq.type !== "prop") return;
  if (room.ownership[pos] !== idxOf(room, p)) return;
  if ((room.houses[pos] || 0) <= 0) return;
  room.houses[pos]--;
  p.money += Math.floor(sq.house / 2);
  logMsg(room, `${p.name} ${sq.n}-এ বাড়ি বিক্রি করলেন।`, "info");
}

function doBail(room) {
  const p = cur(room);
  if (!p.jail || room.phase !== "awaitRoll" || p.money < 50) return;
  p.money -= 50; p.jail = false; p.jailTurns = 0;
  logMsg(room, `${p.name} ৳৫০ জামিন দিয়ে মুক্ত হলেন।`, "info");
}

function doEnd(room) {
  const p = cur(room);
  if (room.phase !== "awaitEnd") return;
  room.canBuy = false;
  room.lastCard = null;

  const lastDouble = room.dice[0] === room.dice[1];
  const reroll = lastDouble && !p.jail && !p.bankrupt && room.doubles > 0 && room.doubles < 3;
  if (reroll) {
    room.phase = "awaitRoll";
    logMsg(room, `${p.name} ডাবল ফেলায় আবার চাল দেবেন।`, "info");
    return;
  }

  room.doubles = 0;
  let guard = 0;
  do { room.turn = (room.turn + 1) % room.players.length; guard++; }
  while (room.players[room.turn].bankrupt && guard < 20);
  room.phase = "awaitRoll";
  logMsg(room, `▶ ${cur(room).name}-এর পালা।`, "info");
}

function checkWin(room) {
  const alive = room.players.filter((p) => !p.bankrupt);
  if (room.started && alive.length <= 1) {
    room.winner = alive[0] ? alive[0].name : "কেউ না";
    room.phase = "over";
    logMsg(room, `🏆 ${room.winner} জিতেছেন!`, "good");
  }
}

/* ============================================================
   BOTS (server-driven auto play)
   ============================================================ */
function scheduleBot(room, ms = 950) {
  if (room.botTimer) clearTimeout(room.botTimer);
  room.botTimer = setTimeout(() => botStep(room), ms);
}
function botStep(room) {
  room.botTimer = null;
  if (!room.started || room.phase === "over") return;
  const p = cur(room);
  if (!p || !p.isBot || p.bankrupt) return;

  if (room.phase === "awaitRoll") {
    if (p.jail && p.money >= 80 && Math.random() < 0.5) doBail(room);
    doRoll(room);
    broadcast(room);
    maybeBot(room);
  } else if (room.phase === "awaitEnd") {
    if (room.canBuy) {
      const sq = BOARD[p.pos];
      // buy if it keeps a healthy buffer, or completes / extends a set
      if (p.money >= sq.price + 60 && Math.random() < 0.85) doBuy(room);
    }
    botBuild(room, p);
    doEnd(room);
    broadcast(room);
    maybeBot(room);
  }
}
function botBuild(room, p) {
  BOARD.forEach((s, i) => {
    if (s.type === "prop" && room.ownership[i] === idxOf(room, p) &&
        ownsGroup(room, p, s.group) && (room.houses[i] || 0) < 5) {
      if (p.money > s.house + 200 && Math.random() < 0.55) doBuild(room, i);
    }
  });
}
/* If the (new) current player is a bot, schedule its move. */
function maybeBot(room) {
  if (!room.started || room.phase === "over") return;
  const p = cur(room);
  if (p && p.isBot && !p.bankrupt) scheduleBot(room);
}

/* ============================================================
   SERIALIZE STATE FOR CLIENTS
   ============================================================ */
function publicState(room) {
  return {
    type: "state",
    board: BOARD,
    colors: GROUP_COLORS,
    code: room.code,
    started: room.started,
    phase: room.phase,
    turn: room.turn,
    dice: room.dice,
    canBuy: room.canBuy,
    winner: room.winner,
    lastCard: room.lastCard,
    log: room.log.slice(-40),
    players: room.players.map((p) => ({
      name: p.name, color: p.color, money: p.money, pos: p.pos,
      jail: p.jail, bankrupt: p.bankrupt, isBot: p.isBot, connected: p.connected,
    })),
    ownership: room.ownership,
    houses: room.houses,
  };
}

function broadcast(room) {
  const payload = JSON.stringify(publicState(room));
  wss.clients.forEach((ws) => {
    if (ws.roomCode === room.code && ws.readyState === ws.OPEN) {
      // include this socket's own seat index so the client knows which player it controls
      ws.send(JSON.stringify({ ...JSON.parse(payload), you: ws.playerIndex }));
    }
  });
}

/* ============================================================
   WEBSOCKET HANDLERS
   ============================================================ */
function send(ws, obj) { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj)); }
function err(ws, message) { send(ws, { type: "error", message }); }

wss.on("connection", (ws) => {
  ws.roomCode = null;
  ws.playerIndex = -1;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const room = ws.roomCode ? rooms.get(ws.roomCode) : null;

    switch (msg.type) {
      case "create": {
        const r = createRoom();
        r.hostClient = msg.clientId;
        const p = { clientId: msg.clientId, name: (msg.name || "খেলোয়াড়").slice(0, 16),
                    color: PCOLORS[0], money: 1500, pos: 0, jail: false, jailTurns: 0,
                    bankrupt: false, isBot: false, connected: true };
        r.players.push(p);
        ws.roomCode = r.code; ws.playerIndex = 0; ws.clientId = msg.clientId;
        logMsg(r, `${p.name} রুম তৈরি করলেন।`, "info");
        send(ws, { type: "joined", code: r.code, you: 0, isHost: true });
        broadcast(r);
        break;
      }
      case "join": {
        const r = rooms.get((msg.code || "").toUpperCase());
        if (!r) return err(ws, "রুম খুঁজে পাওয়া যায়নি।");
        // reconnect to an existing seat?
        const existing = r.players.findIndex((p) => p.clientId === msg.clientId);
        if (existing >= 0) {
          r.players[existing].connected = true;
          ws.roomCode = r.code; ws.playerIndex = existing; ws.clientId = msg.clientId;
          send(ws, { type: "joined", code: r.code, you: existing, isHost: r.hostClient === msg.clientId });
          broadcast(r);
          maybeBot(r);
          return;
        }
        if (r.started) return err(ws, "খেলা ইতিমধ্যে শুরু হয়েছে।");
        if (r.players.length >= 6) return err(ws, "রুম পূর্ণ (সর্বোচ্চ ৬ জন)।");
        const p = { clientId: msg.clientId, name: (msg.name || "খেলোয়াড়").slice(0, 16),
                    color: PCOLORS[r.players.length], money: 1500, pos: 0, jail: false, jailTurns: 0,
                    bankrupt: false, isBot: false, connected: true };
        r.players.push(p);
        ws.roomCode = r.code; ws.playerIndex = r.players.length - 1; ws.clientId = msg.clientId;
        logMsg(r, `${p.name} রুমে যোগ দিলেন।`, "info");
        send(ws, { type: "joined", code: r.code, you: ws.playerIndex, isHost: false });
        broadcast(r);
        break;
      }
      case "addBot": {
        if (!room || room.started) return;
        if (room.hostClient !== ws.clientId) return err(ws, "শুধু হোস্ট বট যোগ করতে পারে।");
        if (room.players.length >= 6) return err(ws, "রুম পূর্ণ।");
        const bi = room.players.filter((p) => p.isBot).length;
        room.players.push({ clientId: "bot-" + Math.random().toString(36).slice(2),
          name: BOT_NAMES[bi] || ("রোবট-" + (bi + 1)), color: PCOLORS[room.players.length],
          money: 1500, pos: 0, jail: false, jailTurns: 0, bankrupt: false, isBot: true, connected: true });
        logMsg(room, `একটি বট যোগ হলো।`, "info");
        broadcast(room);
        break;
      }
      case "removeBot": {
        if (!room || room.started || room.hostClient !== ws.clientId) return;
        for (let i = room.players.length - 1; i >= 0; i--) {
          if (room.players[i].isBot) { room.players.splice(i, 1); break; }
        }
        room.players.forEach((p, i) => (p.color = PCOLORS[i]));
        broadcast(room);
        break;
      }
      case "start": {
        if (!room || room.started) return;
        if (room.hostClient !== ws.clientId) return err(ws, "শুধু হোস্ট খেলা শুরু করতে পারে।");
        if (room.players.length < 2) return err(ws, "কমপক্ষে ২ জন খেলোয়াড় দরকার (বট যোগ করতে পারেন)।");
        room.started = true; room.phase = "awaitRoll"; room.turn = 0;
        logMsg(room, `🎲 খেলা শুরু! ${cur(room).name}-এর পালা।`, "good");
        broadcast(room);
        maybeBot(room);
        break;
      }
      case "roll":  if (guardTurn(ws, room)) { doRoll(room);  broadcast(room); maybeBot(room); } break;
      case "buy":   if (guardTurn(ws, room)) { doBuy(room);   broadcast(room); } break;
      case "build": if (guardTurn(ws, room)) { doBuild(room, msg.pos); broadcast(room); } break;
      case "sell":  if (guardTurn(ws, room)) { doSell(room, msg.pos);  broadcast(room); } break;
      case "bail":  if (guardTurn(ws, room)) { doBail(room);  broadcast(room); } break;
      case "end":   if (guardTurn(ws, room)) { doEnd(room);   broadcast(room); maybeBot(room); } break;
      case "chat": {
        if (!room) return;
        const name = room.players[ws.playerIndex]?.name || "?";
        logMsg(room, `💬 ${name}: ${String(msg.text || "").slice(0, 120)}`, "chat");
        broadcast(room);
        break;
      }
    }
  });

  ws.on("close", () => {
    const room = ws.roomCode ? rooms.get(ws.roomCode) : null;
    if (!room) return;
    const p = room.players[ws.playerIndex];
    if (p) { p.connected = false; }
    // if game never started and room now empty of humans, clean up
    const humans = room.players.filter((x) => !x.isBot && x.connected);
    if (!room.started && humans.length === 0) {
      if (room.botTimer) clearTimeout(room.botTimer);
      rooms.delete(room.code);
    } else {
      broadcast(room);
    }
  });
});

/* Only the current, connected player may perform turn actions. */
function guardTurn(ws, room) {
  if (!room || !room.started || room.phase === "over") return false;
  return ws.playerIndex === room.turn && !room.players[room.turn].bankrupt;
}

server.listen(PORT, () => {
  console.log(`\n  বাংলাদেশ মনোপলি চলছে →  http://localhost:${PORT}\n`);
  console.log(`  একই নেটওয়ার্কের অন্য ডিভাইস থেকে খেলতে এই কম্পিউটারের LAN IP ব্যবহার করুন।\n`);
});

# বাংলাদেশ মনোপলি 🇧🇩 — Bangla Monopoly (online multiplayer)

Real-time, multiplayer Monopoly with an **all-Bangladesh** board and a **full Bangla** UI.
Players join from any device with a 5-letter room code (like richup.io).

## ▶️ Play now (no install): https://xsajolx.github.io/bangla-monopoly/

There are **two builds** in this repo:

1. **`index.html` (root) — serverless P2P build** *(this is what GitHub Pages serves).*
   The room creator's browser is the authoritative host and runs the full game engine; friends
   connect directly over WebRTC (PeerJS). No server needed — runs straight off GitHub Pages.
   *Note:* the room creator must keep their tab open (they're the host), and matchmaking uses the
   free public PeerJS broker.

2. **`server.js` + `public/` — authoritative Node server build.**
   Same game, but all rules run on a central server (below). Best for reliability / a permanent host.

## Run it

```bash
cd bangla-monopoly
npm install        # first time only
npm start
```

Then open **http://localhost:3000**.

### Play with friends
- **Same computer:** open the URL in multiple tabs.
- **Same Wi-Fi / LAN:** others open `http://<your-computer-IP>:3000` (e.g. `http://192.168.0.5:3000`).
  Find your IP with `ipconfig` (Windows).
- **Over the internet:** deploy to any Node host (Render, Railway, Fly.io, a VPS) or expose your local
  server with a tunnel, e.g. `npx localtunnel --port 3000` or `ngrok http 3000`.

## How to play
1. Enter your name → **নতুন রুম তৈরি করুন** (create) or paste a code → **রুমে যোগ দিন** (join).
2. Host shares the code (or the copied link). Host can add 🤖 **বট** (bots) to fill seats.
3. Host presses **খেলা শুরু করুন** (needs ≥ 2 players; bots count).
4. On your turn: **ছক্কা ফেলুন** (roll) → **কিনুন** (buy) → **নির্মাণ** (build on full color sets) → **পালা শেষ** (end turn).
   Doubles roll again; three doubles → jail; **জামিন ৳৫০** pays bail.

## Features
- Authoritative server: rent, monopoly double-rent, railroads (৳25→৳200), utilities (×4/×10),
  houses & hotels, ভাগ্য / গণ তহবিল cards, income & super tax, jail (roll doubles / 3-turn / bail),
  auto house-sale and bankruptcy, last-player-standing win.
- Server-side **bots** so you can play solo or fill seats.
- **Reconnect:** refresh keeps your seat (persistent client id in `localStorage`).
- Bangla numerals everywhere (৳১৫০০), live game log, and in-game chat.

## Board (all Bangladesh, cheap → premium)
Satkhira/Kurigram (brown) · Barishal region (light blue) · Rangpur/Bogura (pink) ·
Mymensingh/Cumilla/Tangail (orange) · Jashore/Khulna/Narayanganj (red) ·
Cox's Bazar/Saint Martin/Sundarban (yellow) · Sylhet/Rajshahi/Chattogram (green) ·
Gulshan/Dhaka (blue). Stations: Kamalapur Rail, Shahjalal Airport, Sadarghat Launch, Gabtoli Bus.
Utilities: বিদ্যুৎ কোম্পানি, তিতাস গ্যাস.

## Files
- `server.js` — game engine + rooms + WebSocket + bots
- `public/index.html` — Bangla client (lobby, board, panel) — self-contained HTML/CSS/JS
- `package.json` — deps: `express`, `ws`

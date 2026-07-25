/* ============================================================
   ঢাকা মনোপলি — local host
   Serves the P2P build (index.html) over your machine so you can
   play at localhost and let same-Wi-Fi friends join via your LAN IP.
   Run: npm run local   (or: node host.js)
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain",
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/" || p === "") p = "/index.html";
  const fp = path.join(ROOT, path.normalize(p));
  if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(fp)] || "application/octet-stream" });
    res.end(data);
  });
});

function lanIPs() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) out.push(net.address);
    }
  }
  return out;
}

// listen dual-stack (no host arg) so both localhost (IPv4/IPv6) and LAN IPv4 work
server.listen(PORT, () => {
  console.log("\n  🇧🇩  ঢাকা মনোপলি — local host চলছে\n");
  console.log(`  এই কম্পিউটারে খেলুন :  http://localhost:${PORT}`);
  const ips = lanIPs();
  if (ips.length) {
    console.log(`\n  একই Wi-Fi-তে বন্ধুরা যোগ দিতে পারবে এই ঠিকানায়:`);
    ips.forEach((ip) => console.log(`      http://${ip}:${PORT}`));
  }
  console.log(`\n  (থামাতে Ctrl+C চাপুন)\n`);
});

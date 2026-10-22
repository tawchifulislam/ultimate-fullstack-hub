// proxy-ip-demo.js
// Rate limiting by client IP depends on what req.ip is, and what req.ip is depends on Express's
// "trust proxy" setting. Get it wrong in either direction and the limiter breaks:
//
//   trust too little  -> behind a proxy, EVERY user looks like the proxy's address and shares one bucket
//   trust too much    -> a client can write any X-Forwarded-For it likes and get a fresh bucket every time
//
// The "different clients" are real: the harness binds its sockets to 127.0.0.2 (the attacker) and
// 127.0.0.3 (an innocent user), which Linux treats as separate loopback source addresses.
// When there is a proxy it is a tiny reverse proxy in this file that APPENDS the address it saw to
// X-Forwarded-For (as nginx's $proxy_add_x_forwarded_for does). It does not remove what the client sent.
//
//   node proxy-ip-demo.js

const http = require("node:http");
const express = require("express");
const { FixedWindow } = require("./limiters");
const { rateLimit } = require("./rate-limit-middleware");

const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));

function startApp(trustProxy) {
  const app = express();
  if (trustProxy !== undefined) app.set("trust proxy", trustProxy);
  app.get("/ping", rateLimit({ limiter: new FixedWindow({ limit: 3, windowMs: 60_000 }) }), (req, res) => res.json({ ip: req.ip }));
  return listen(http.createServer(app));
}

function startProxy(targetPort) {
  return listen(http.createServer((req, res) => {
    const seen = req.socket.remoteAddress; // the address the proxy itself sees: the real client
    const prior = req.headers["x-forwarded-for"];
    const upstream = http.request(
      { host: "127.0.0.1", port: targetPort, path: req.url, method: req.method, agent: false, headers: { ...req.headers, "x-forwarded-for": prior ? `${prior}, ${seen}` : seen } },
      (up) => { res.writeHead(up.statusCode, up.headers); up.pipe(res); },
    );
    req.pipe(upstream);
  }));
}

function get(port, { from, headers = {} }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path: "/ping", localAddress: from, agent: false, headers }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null }));
    });
    req.on("error", reject);
    req.end();
  });
}

const SETUPS = [
  ["A. direct, trust proxy off (the default)", false, undefined],
  ["B. direct, trust proxy = true            ", false, true],
  ["C. behind a proxy, trust proxy off       ", true, undefined],
  ["D. behind a proxy, trust proxy = 1       ", true, 1],
  ["E. behind a proxy, trust proxy = true    ", true, true],
];

async function main() {
  console.log("limit: 3 requests per minute per req.ip. The attacker (127.0.0.2) sends 8 requests, each with a different made-up X-Forwarded-For.");
  console.log("Then an innocent user (127.0.0.3) sends one request.\n");
  console.log(`   ${"setup".padEnd(42)} attacker allowed   req.ip seen for attacker     innocent user`);
  for (const [name, behindProxy, trustProxy] of SETUPS) {
    const app = await startApp(trustProxy);
    const proxy = behindProxy ? await startProxy(app.address().port) : null;
    const entry = (proxy ?? app).address().port;

    let allowed = 0;
    const seenIps = [];
    for (let i = 1; i <= 8; i++) {
      const r = await get(entry, { from: "127.0.0.2", headers: { "X-Forwarded-For": `10.9.8.${i}` } });
      if (r.status === 200) { allowed++; seenIps.push(r.body.ip); }
    }
    const innocent = await get(entry, { from: "127.0.0.3" });
    const distinct = new Set(seenIps).size;
    const ipText = seenIps.length ? (distinct === 1 ? seenIps[0] : `${distinct} different, e.g. ${seenIps[0]}`) : "-";
    console.log(`   ${name.trim().padEnd(42)} ${String(allowed).padStart(2)} of 8          ${ipText.padEnd(27)} ${innocent.status === 200 ? "200 ok" : `${innocent.status} refused`}`);

    app.close();
    proxy?.close();
  }
}

main().catch((err) => {
  console.error("proxy-ip-demo failed:", err);
  process.exit(1);
});

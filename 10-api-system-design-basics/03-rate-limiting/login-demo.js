// login-demo.js
// Rate limiting a login route, against REAL password hashing (Node's built-in scrypt, Topic 84).
// An attacker has a list of 300 candidate passwords, one of which is right (number 250). Five
// scenarios show what each defense does and what it costs:
//
//   1. no limiter                      the attacker finds the password; the server hashes 250 times
//   2. per-IP limiter                  the attacker is stopped after 5 guesses
//   3. per-IP limiter + trust proxy    a misconfiguration: the attacker rotates a fake X-Forwarded-For and wins anyway
//   4. per-ACCOUNT limiter             an attacker spread over many IPs is stopped too ... and so is the real user
//
// "Different IPs" are real loopback source addresses (127.0.x.y), as in proxy-ip-demo.js.
//
//   node login-demo.js

const crypto = require("node:crypto");
const http = require("node:http");
const { promisify } = require("node:util");
const express = require("express");
const { FixedWindow } = require("./limiters");
const { rateLimit } = require("./rate-limit-middleware");

const scrypt = promisify(crypto.scrypt);
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));

const REAL_PASSWORD = "sunflower42";
const CANDIDATES = Array.from({ length: 300 }, (_, i) => `password${i + 1}`);
CANDIDATES[249] = REAL_PASSWORD; // the right answer is attempt number 250

async function hashPassword(password, salt) {
  return scrypt(password, salt, 64); // scrypt's default cost parameters
}

async function createApp({ trustProxy, ipLimit, accountLimit }) {
  const salt = crypto.randomBytes(16);
  const stored = await hashPassword(REAL_PASSWORD, salt);
  const stats = { hashes: 0 };

  const app = express();
  if (trustProxy) app.set("trust proxy", true);
  if (ipLimit) app.post("/login", rateLimit({ limiter: new FixedWindow({ limit: ipLimit, windowMs: 60_000 }), key: (req) => req.ip }));
  app.use(express.json());
  if (accountLimit) app.post("/login", rateLimit({ limiter: new FixedWindow({ limit: accountLimit, windowMs: 60_000 }), key: (req) => `account:${req.body?.username}` }));

  app.post("/login", async (req, res) => {
    const { username, password } = req.body ?? {};
    stats.hashes++; // every attempt that gets this far costs one scrypt run
    const candidate = await hashPassword(String(password), salt);
    const ok = username === "nadia" && crypto.timingSafeEqual(candidate, stored);
    res.status(ok ? 200 : 401).json({ ok });
  });
  const server = await listen(http.createServer(app));
  return { server, port: server.address().port, stats };
}

function post(port, { from, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      { host: "127.0.0.1", port, path: "/login", method: "POST", localAddress: from, agent: false, headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload), ...headers } },
      (res) => { res.resume(); res.on("end", () => resolve(res.statusCode)); },
    );
    req.on("error", reject);
    req.end(payload);
  });
}

// The attacker tries every candidate in order and stops when one works.
// source(i) says which loopback address attempt i comes from; spoof(i) is an optional fake X-Forwarded-For.
async function attack(port, { source = () => "127.0.0.2", spoof = () => undefined }) {
  const start = process.hrtime.bigint();
  const counts = { 200: 0, 401: 0, 429: 0 };
  let foundAt = null;
  for (let i = 0; i < CANDIDATES.length && foundAt === null; i++) {
    const xff = spoof(i);
    const status = await post(port, { from: source(i), headers: xff ? { "X-Forwarded-For": xff } : {}, body: { username: "nadia", password: CANDIDATES[i] } });
    counts[status]++;
    if (status === 200) foundAt = i + 1;
  }
  return { counts, foundAt, ms: Number(process.hrtime.bigint() - start) / 1e6 };
}

async function scenario(title, options, attackOptions, { afterwards } = {}) {
  const { server, port, stats } = await createApp(options);
  console.log(`== ${title}`);
  const r = await attack(port, attackOptions);
  console.log(`   attacker: ${r.foundAt ? `FOUND the password at attempt ${r.foundAt}` : "did NOT find the password"}   (wrong guesses answered ${r.counts[401]}, refused with 429: ${r.counts[429]})`);
  console.log(`   the server ran scrypt ${stats.hashes} times, ${r.ms.toFixed(0)} ms in total`);
  if (afterwards) console.log(`   ${await afterwards(port)}`);
  console.log();
  server.close();
}

async function main() {
  // How much does one guess cost the server? (This is the cost the limiter is protecting.)
  const salt = crypto.randomBytes(16);
  const samples = [];
  for (let i = 0; i < 10; i++) {
    const start = process.hrtime.bigint();
    await hashPassword("x", salt);
    samples.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
  samples.sort((a, b) => a - b);
  console.log(`one scrypt run (median of 10): ${samples[5].toFixed(1)} ms of work for the server per guess, so 300 guesses are about ${(samples[5] * 300 / 1000).toFixed(1)} s of hashing\n`);

  await scenario("1. no limiter", {}, {});
  await scenario("2. per-IP limiter: 5 attempts per minute", { ipLimit: 5 }, {});
  await scenario(
    "3. the same per-IP limiter, but trust proxy is on and the server is reachable directly",
    { ipLimit: 5, trustProxy: true },
    { spoof: (i) => `10.20.${Math.floor(i / 250)}.${(i % 250) + 1}` },
  );
  await scenario(
    "4. per-ACCOUNT limiter (5 attempts per minute for 'nadia'), attacker spread over 300 different source IPs",
    { accountLimit: 5 },
    { source: (i) => `127.0.${Math.floor(i / 250) + 1}.${(i % 250) + 2}` },
    { afterwards: async (port) => `then the real nadia logs in from her own IP with the RIGHT password: ${await post(port, { from: "127.0.0.3", body: { username: "nadia", password: REAL_PASSWORD } })}` },
  );
}

main().catch((err) => {
  console.error("login-demo failed:", err);
  process.exit(1);
});

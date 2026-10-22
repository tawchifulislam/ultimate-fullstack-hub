// redis-local.js
// Starts a throwaway redis-server for the demos (no persistence, 127.0.0.1, a free port) and
// connects node-redis clients to it. Needs the redis-server program on your PATH (7.0.15 was
// used here). If REDIS_URL is set, that server is used instead and nothing is started.

const net = require("node:net");
const { spawn } = require("node:child_process");
const { createClient } = require("redis");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const freePort = () => new Promise((resolve) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });

async function startLocalRedis() {
  if (process.env.REDIS_URL) return { url: process.env.REDIS_URL, own: false, stop() {} };
  const port = await freePort();
  const child = spawn("redis-server", ["--port", String(port), "--bind", "127.0.0.1", "--save", "", "--appendonly", "no"], { stdio: "ignore" });
  const failed = new Promise((_, reject) => child.on("error", (err) => reject(err.code === "ENOENT" ? new Error("redis-server was not found on your PATH. Install Redis, or set REDIS_URL to a server you can use.") : err)));
  const url = `redis://127.0.0.1:${port}`;
  const ready = (async () => {
    for (let i = 0; i < 50; i++) {
      const probe = createClient({ url, socket: { reconnectStrategy: false } });
      probe.on("error", () => {});
      try { await probe.connect(); await probe.quit(); return; } catch { await sleep(100); }
    }
    throw new Error("the local redis-server did not start");
  })();
  await Promise.race([ready, failed]);
  return { url, own: true, stop: () => child.kill() };
}

async function connect(url) {
  const client = createClient({ url });
  client.on("error", (err) => console.error("redis client error:", err.message));
  await client.connect();
  return client;
}

module.exports = { startLocalRedis, connect, sleep };

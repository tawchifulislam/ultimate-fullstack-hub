// rehash-on-login-demo.js
// Upgrading stored hashes without asking anyone to reset a password.
//   1. a user registers while the app uses the OWASP-minimum settings;
//   2. the app is "redeployed" with stronger settings, sharing the same user store;
//   3. a failed login does NOT upgrade anything; a successful one does.
//
//   node rehash-on-login-demo.js

const argon2 = require("argon2");
const { createApp } = require("./auth-app-hashed");
const { createPasswordService, OWASP_MINIMUM } = require("./password-service");

const STRONGER = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 };
const paramsOf = (hash) => hash.split("$")[3];

async function post(base, path, body) {
  const res = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}

async function boot(passwords, users) {
  const events = [];
  const { app, ready } = createApp({ jwtSecret: "rehash-demo-secret-0123456789", passwords, users, log: (m) => events.push(m) });
  await ready;
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  return { server, base: `http://localhost:${server.address().port}`, events };
}

async function main() {
  const users = new Map(); // survives the "redeploy"

  console.log("== 1. version 1 of the app (OWASP minimum)");
  let v1 = await boot(createPasswordService(OWASP_MINIMUM), users);
  console.log("  register ->", (await post(v1.base, "/register", { username: "nadia", password: "correct horse battery staple" })).status);
  console.log("  stored parameters:", paramsOf(users.get("nadia").passwordHash));
  v1.server.close();

  console.log("\n== 2. version 2 of the app (stronger settings), same user store");
  const v2 = await boot(createPasswordService(STRONGER), users);

  const before = users.get("nadia").passwordHash;
  console.log("  login with the WRONG password ->", (await post(v2.base, "/login", { username: "nadia", password: "wrong password here" })).status);
  console.log("  stored parameters after the failed login:", paramsOf(users.get("nadia").passwordHash), "| hash unchanged:", users.get("nadia").passwordHash === before);

  const ok = await post(v2.base, "/login", { username: "nadia", password: "correct horse battery staple" });
  console.log("  login with the RIGHT password ->", ok.status, "| token issued:", typeof ok.body.token === "string");
  console.log("  stored parameters after the successful login:", paramsOf(users.get("nadia").passwordHash));
  console.log("  app log:", v2.events);

  console.log("\n== 3. the upgraded hash keeps working, and is not rehashed again");
  const again = await post(v2.base, "/login", { username: "nadia", password: "correct horse battery staple" });
  console.log("  login again ->", again.status, "| log entries so far:", v2.events.length);
  v2.server.close();
}

main().catch((err) => { console.error(err); process.exit(1); });

// login-timing-check.js
// Can an attacker learn which usernames exist just by timing the login?
// Two copies of the app run in this process:
//   equalizeTiming: false  "no such user" returns immediately, without hashing
//   equalizeTiming: true   "no such user" still verifies against a dummy hash
// For each, a request for an UNKNOWN user and a request for a KNOWN user with
// a WRONG password are timed (a warm-up first, then 15 requests each).
//
//   node login-timing-check.js

const { createApp } = require("./auth-app-hashed");

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function timeLogin(base, username) {
  const t = process.hrtime.bigint();
  const res = await fetch(base + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: "definitely the wrong password" }),
  });
  const body = await res.text();
  return { ms: Number(process.hrtime.bigint() - t) / 1e6, status: res.status, body };
}

async function trial(label, equalizeTiming) {
  const { app, ready } = createApp({ jwtSecret: "timing-check-secret-0123456789", equalizeTiming });
  await ready;
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://localhost:${server.address().port}`;

  await fetch(base + "/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "nadia", password: "correct horse battery staple" }),
  });

  await timeLogin(base, "nadia"); // warm-up
  const unknown = [], known = [];
  let sample;
  for (let i = 0; i < 15; i++) {
    const a = await timeLogin(base, "ghost");
    const b = await timeLogin(base, "nadia");
    unknown.push(a.ms);
    known.push(b.ms);
    sample = { unknown: `${a.status} ${a.body}`, known: `${b.status} ${b.body}` };
  }
  server.close();

  console.log(`== ${label}`);
  console.log(`  unknown user, any password : median ${median(unknown).toFixed(1).padStart(6)} ms   (range ${Math.min(...unknown).toFixed(1)} to ${Math.max(...unknown).toFixed(1)})`);
  console.log(`  known user, wrong password : median ${median(known).toFixed(1).padStart(6)} ms   (range ${Math.min(...known).toFixed(1)} to ${Math.max(...known).toFixed(1)})`);
  console.log(`  difference of medians      : ${(median(known) - median(unknown)).toFixed(1)} ms`);
  console.log(`  same response either way?    ${sample.unknown === sample.known}   (${sample.known})`);
}

async function main() {
  await trial("equalizeTiming: false (returns early for unknown users)", false);
  console.log();
  await trial("equalizeTiming: true (verifies against a dummy hash)", true);
}

main().catch((err) => { console.error(err); process.exit(1); });

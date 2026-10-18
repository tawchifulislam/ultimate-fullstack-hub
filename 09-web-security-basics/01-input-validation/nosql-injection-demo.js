// nosql-injection-demo.js
// "Operator injection": a client sends an OBJECT where the code expected a
// STRING, and the database treats the object's $-keys as query operators.
//
// IMPORTANT: no MongoDB server is involved. `mingo` is an in-memory library
// that implements MongoDB's query operators ($ne, $regex, $eq ...) and
// stands in for the database, so what this file shows is how those
// operators behave, not a run against a real MongoDB.
//
// DEMO SHORTCUT: passwords are plain text so the file stays about
// injection. Never store passwords like this (Topic 84 covers hashing).
//
//   node nosql-injection-demo.js

const express = require("express");
const { Query } = require("mingo");
const mongoose = require("mongoose"); // only for mongoose.sanitizeFilter, no connection is made
const { z } = require("zod");

const users = [
  { username: "admin", password: "s3cret-admin", role: "admin" },
  { username: "nadia", password: "pw-nadia", role: "user" },
];

// Stands in for  User.findOne(filter)  in Mongoose or the Mongo driver.
const findOne = (filter) => new Query(filter).find(users).all()[0];
const reply = (res, user) =>
  user ? res.json({ loggedInAs: user.username, role: user.role }) : res.status(401).json({ error: "invalid credentials" });

const app = express();
app.use(express.json());

// 1. VULNERABLE: the body goes straight into the query filter.
app.post("/login-vulnerable", (req, res) => {
  const { username, password } = req.body;
  reply(res, findOne({ username, password }));
});

// 2. FIX A: validate the shape first. Both fields must be strings.
const loginBody = z.object({ username: z.string().max(50), password: z.string().max(100) });
app.post("/login-validated", (req, res) => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation_failed" });
  reply(res, findOne(parsed.data));
});

// 3. FIX B (a second layer, not a replacement): Mongoose's sanitizeFilter
//    wraps any $-operator object in $eq so it is compared, not executed.
app.post("/login-sanitized", (req, res) => {
  const { username, password } = req.body;
  reply(res, findOne(mongoose.sanitizeFilter({ username, password })));
});

async function main() {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://localhost:${server.address().port}`;

  const attempts = [
    ["a. correct credentials", { username: "admin", password: "s3cret-admin" }],
    ["b. wrong password", { username: "admin", password: "guess" }],
    ['c. password: {"$ne": null}   (admin, no password known)', { username: "admin", password: { $ne: null } }],
    ['d. both fields {"$ne": null} (no user known at all)', { username: { $ne: null }, password: { $ne: null } }],
    ['e. password: {"$regex": "^s3"} (a yes/no question about the password)', { username: "admin", password: { $regex: "^s3" } }],
    ['f. password: {"$regex": "^zz"} (same question, other answer)', { username: "admin", password: { $regex: "^zz" } }],
  ];

  for (const route of ["/login-vulnerable", "/login-validated", "/login-sanitized"]) {
    console.log(`\n== POST ${route}`);
    for (const [label, body] of attempts) {
      const res = await fetch(base + route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      console.log(`${label.padEnd(68)} -> ${res.status} ${await res.text()}`);
    }
  }

  console.log("\n== what sanitizeFilter does to the filter");
  const before = { username: "admin", password: { $ne: null } };
  console.log("before:", JSON.stringify(before));
  console.log("after: ", JSON.stringify(mongoose.sanitizeFilter(structuredClone(before))));

  server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

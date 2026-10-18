// no-validation-app.js
// An API that trusts whatever the client sends. Every request below this
// file's code is something a real browser form would never send, but curl,
// a script or an attacker will.
//
//   node no-validation-app.js [port]

const express = require("express");

const app = express();
const port = process.argv[2] || 4800;

app.use(express.json());

const users = [];

app.post("/users", (req, res) => {
  // MISTAKE 1: the whole body is spread into the new user, so the client
  // decides every field, including "role" and "id".
  const user = { id: users.length + 1, role: "user", ...req.body };

  // MISTAKE 2: assumes email is a string. Anything else throws a TypeError.
  user.email = user.email.toLowerCase();

  users.push(user);
  res.status(201).json(user);
});

app.get("/users", (req, res) => res.json(users));

// MISTAKE 3: query string values are ALWAYS strings.
app.get("/items", (req, res) => {
  const page = req.query.page;
  const next = page + 1;
  res.json({ page, next, typeOfNext: typeof next });
});

app.listen(port, () => console.log(`no-validation-app listening on ${port}`));

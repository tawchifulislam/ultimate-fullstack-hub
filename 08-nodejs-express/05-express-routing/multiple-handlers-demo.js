const express = require("express");
const app = express();

// A route can take any number of handler functions. Each one gets req, res,
// and next; calling next() hands control to the next handler for THIS
// route. Not calling next() (and instead calling res.json/res.send/etc.)
// stops the chain right there, later handlers never run.

function checkIdIsNumeric(req, res, next) {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: "id must be numeric" }); // chain stops here
  }
  console.log("checkIdIsNumeric: passed, calling next()");
  next();
}

function loadFakeUser(req, res, next) {
  req.user = { id: req.params.id, name: `User ${req.params.id}` }; // attach data for the next handler
  console.log("loadFakeUser: attached req.user, calling next()");
  next();
}

function sendUser(req, res) {
  console.log("sendUser: final handler, sending response");
  res.json({ user: req.user });
}

app.get("/users/:id", checkIdIsNumeric, loadFakeUser, sendUser);

const PORT = process.argv[2] || 4204;
app.listen(PORT, () => console.log(`listening on :${PORT}`));

// built-in-middleware.js
// Express ships a handful of middleware functions itself; you still have
// to opt in with app.use(), nothing runs by default.

const express = require("express");
const path = require("path");
const app = express();
const port = process.argv[2] || 4202;

// express.json() parses a JSON request body and attaches it as req.body.
// Without this line, req.body would be undefined (Topic 74 showed the
// raw stream-based parsing this replaces).
app.use(express.json());

// express.urlencoded() parses an HTML form POST (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// express.static() serves every file in a folder directly, at the given
// mount path, with no route needed per file.
app.use("/static", express.static(path.join(__dirname, "public")));

app.post("/echo-json", (req, res) => {
  console.log("[echo-json] req.body =", req.body);
  res.json({ youSent: req.body });
});

app.post("/echo-form", (req, res) => {
  console.log("[echo-form] req.body =", req.body);
  res.json({ youSent: req.body });
});

app.listen(port, () => console.log(`built-in-middleware listening on ${port}`));

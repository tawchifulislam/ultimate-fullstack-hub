const express = require("express");
const app = express();

// Express 5 uses path-to-regexp v8, whose syntax changed from what a lot
// of still-popular Express 4 tutorials show. The old `:id?` (optional) and
// bare `*` (wildcard) syntax now throw at startup, see path-patterns-test.js.
// This is the current, working syntax instead.

// Optional path segment: matches both "/users" and "/users/42".
app.get("/users{/:id}", (req, res) => {
  res.json({ pattern: "/users{/:id}", params: req.params });
});

// Named wildcard: captures everything after /files/ as req.params.splat.
app.get("/files/*splat", (req, res) => {
  res.json({ pattern: "/files/*splat", params: req.params });
});

const PORT = process.argv[2] || 4206;
app.listen(PORT, () => console.log(`listening on :${PORT}`));

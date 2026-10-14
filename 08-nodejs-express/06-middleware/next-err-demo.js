// next-err-demo.js
// Calling next(err) (passing an argument) skips every remaining normal
// middleware and route handler, and jumps straight to an error-handling
// middleware, a function with FOUR parameters: (err, req, res, next).
// Topic 78 (Error Handling Middleware) covers this in depth; this is
// just a minimal proof that the mechanism itself works.

const express = require("express");
const app = express();
const port = process.argv[2] || 4204;

function checkUserId(req, res, next) {
  const id = req.params.id;
  if (!/^\d+$/.test(id)) {
    // Passing a value to next() is the signal: "skip to error handling."
    const err = new Error(`invalid user id: "${id}"`);
    err.status = 400;
    return next(err);
  }
  console.log("[checkUserId] id looks numeric, continuing normally");
  next();
}

app.get("/users/:id", checkUserId, (req, res) => {
  console.log("[handler] this only runs when checkUserId called next() with no error");
  res.json({ id: req.params.id, name: `User ${req.params.id}` });
});

// A middleware function is recognized as an ERROR handler purely by having
// 4 parameters. Express looks at the function's declared arity, not a name.
app.use((err, req, res, next) => {
  console.log("[error-handler] caught:", err.message);
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(port, () => console.log(`next-err-demo listening on ${port}`));

// sync-vs-async-errors.js
// Two routes that both "throw" an error, one synchronously, one from
// inside an async function (a rejected promise). This file proves
// Express 5 catches BOTH automatically, with no try/catch or wrapper
// needed, something that was NOT true for the async case in Express 4.

const express = require("express");
const app = express();
const port = process.argv[2] || 4401;

// Synchronous throw inside a normal handler. Express has ALWAYS caught
// this automatically, in every major version, because it happens inside
// the same call stack Express itself is running the handler on.
app.get("/sync-error", (req, res) => {
  throw new Error("thrown synchronously, no async involved");
});

// An async handler that throws. Under the hood this is a function that
// returns a Promise, and the thrown error becomes a REJECTED promise.
// In Express 4, Express had no way to know that promise existed, this
// would crash the process or hang silently unless you manually wrote
// `.catch(next)` or used a wrapper library. Express 5 added automatic
// handling: if a route handler returns a promise, Express attaches its
// own .catch(next) for you.
app.get("/async-error", async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 50)); // simulate real async work
  throw new Error("thrown from inside an async function");
});

// For comparison: an async handler that rejects explicitly rather than
// throwing, same automatic handling applies either way.
app.get("/async-rejected-promise", async (req, res) => {
  await Promise.reject(new Error("an explicitly rejected promise"));
});

app.use((err, req, res, next) => {
  console.log(`[error-handler] caught: ${err.message}`);
  res.status(500).json({ error: err.message });
});

app.listen(port, () => console.log(`sync-vs-async-errors listening on ${port}`));

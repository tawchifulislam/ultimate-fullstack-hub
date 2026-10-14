// logging-middleware.js
// A custom middleware function registered with app.use() runs on every
// request, before any route handler, in the order it was registered.

const express = require("express");
const app = express();
const port = process.argv[2] || 4200;

// A middleware function has the signature (req, res, next).
// Calling next() hands control to the next middleware/route in line.
function requestLogger(req, res, next) {
  console.log(`[logger] ${req.method} ${req.originalUrl}`);
  next(); // without this, the request would hang forever (see Topic 75)
}

// A second global middleware, registered after the first.
function addRequestId(req, res, next) {
  req.requestId = Math.random().toString(36).slice(2, 8);
  console.log(`[request-id] assigned ${req.requestId}`);
  next();
}

app.use(requestLogger);
app.use(addRequestId);

app.get("/", (req, res) => {
  console.log(`[handler] running for request ${req.requestId}`);
  res.json({ message: "home", requestId: req.requestId });
});

app.get("/about", (req, res) => {
  console.log(`[handler] running for request ${req.requestId}`);
  res.json({ message: "about", requestId: req.requestId });
});

app.listen(port, () => console.log(`logging-middleware listening on ${port}`));

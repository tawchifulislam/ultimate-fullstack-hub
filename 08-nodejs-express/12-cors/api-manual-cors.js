// api-manual-cors.js
// CORS written by hand, so the mechanism is visible: a few response
// headers, an exact-match origin allowlist, and an answer to the
// preflight OPTIONS request.

const express = require("express");
const { logger, addRoutes } = require("./common");

const app = express();
const port = process.argv[2] || 4700;

// Exact matches only. Scheme, host AND port all count: "localhost:5000" and
// "127.0.0.1:5000" are different origins.
const ALLOWED_ORIGINS = new Set(["http://localhost:5000"]);

function manualCors(req, res, next) {
  const origin = req.header("origin");
  const allowed = origin && ALLOWED_ORIGINS.has(origin);

  // The ACAO value depends on the request's Origin, so a cache must be told
  // that. This is set for EVERY response, not only for allowed origins:
  // otherwise a cache could store the header-less answer given to a stranger
  // and replay it to the allowed origin.
  res.setHeader("Vary", "Origin");

  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin); // echo back the one origin, not "*"
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  // A preflight is an OPTIONS request that asks permission before the real one.
  if (req.method === "OPTIONS" && req.header("access-control-request-method")) {
    if (allowed) {
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Max-Age", "600"); // let the browser cache this answer for 10 minutes
    }
    return res.sendStatus(204); // answered here; it never reaches the routes
  }

  next();
}

app.use(logger);
app.use(manualCors);
addRoutes(app);

app.listen(port, () => console.log(`api-manual-cors listening on ${port}`));

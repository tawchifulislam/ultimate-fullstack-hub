// common.js
// Shared by all three API servers, so the ONLY difference between them is
// how (or whether) they handle CORS.

const express = require("express");

// Logs every request the server receives, including preflight OPTIONS
// requests. Registered BEFORE the CORS middleware so it sees them all.
// This log is the evidence for what actually reached the server, which is
// not the same thing as what the browser let the page read.
function logger(req, res, next) {
  const origin = req.header("origin") || "-";
  const reqMethod = req.header("access-control-request-method");
  const reqHeaders = req.header("access-control-request-headers");
  const preflight = reqMethod ? ` [preflight asking: ${reqMethod}${reqHeaders ? " + " + reqHeaders : ""}]` : "";
  console.log(`[server] ${req.method} ${req.originalUrl}  origin=${origin}${preflight}`);
  next();
}

function addRoutes(app) {
  app.use(express.json());

  app.get("/data", (req, res) => {
    res.json({ message: "hello from the API" });
  });

  app.put("/items/:id", (req, res) => {
    res.json({ updated: req.params.id, body: req.body });
  });

  // A route with a bug in it. Used to show what a server error looks like
  // from the browser's side.
  app.get("/boom", () => {
    throw new Error("a bug inside the route");
  });

  // Needs an Authorization header. (It does not verify a JWT; Topic 81
  // did that. Here the header only matters because of what it does to
  // the browser's CORS behavior.)
  app.get("/private", (req, res) => {
    if (req.header("authorization") !== "Bearer demo-token") {
      return res.status(401).json({ error: "missing or wrong Authorization header" });
    }
    res.json({ secret: "only with the header" });
  });

  // Sets a cookie, then /whoami reports which Cookie header arrived.
  app.post("/login", (req, res) => {
    res.setHeader("Set-Cookie", "session=abc123; HttpOnly; Path=/");
    res.json({ ok: true });
  });

  app.get("/whoami", (req, res) => {
    res.json({ cookieHeader: req.header("cookie") || null });
  });
}

module.exports = { logger, addRoutes };

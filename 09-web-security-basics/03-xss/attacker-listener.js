// attacker-listener.js
// A stand-in for "the attacker's server" in this local lab. It does nothing
// except record the query string of every request it receives, so the demo
// can show exactly what an injected script managed to send out.
// It only ever listens on localhost, and only the lab's own apps talk to it.

const express = require("express");

function createListener() {
  const hits = [];
  const app = express();
  app.get("/steal", (req, res) => {
    hits.push({ ...req.query });
    res.status(204).end();
  });
  return { app, hits };
}

module.exports = { createListener };

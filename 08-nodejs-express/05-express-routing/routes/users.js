const express = require("express");

// A Router is a self-contained mini-app: its own set of routes, defined
// with no knowledge of what prefix it'll eventually be mounted under.
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ route: "GET /users (inside the router)" });
});

router.get("/:id", (req, res) => {
  res.json({ route: "GET /users/:id (inside the router)", params: req.params });
});

router.post("/", (req, res) => {
  res.status(201).json({ route: "POST /users (inside the router)" });
});

module.exports = router;

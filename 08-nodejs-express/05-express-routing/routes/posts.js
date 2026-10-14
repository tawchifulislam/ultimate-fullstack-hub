const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ route: "GET /posts (inside the router)" });
});

router.get("/:id", (req, res) => {
  res.json({ route: "GET /posts/:id (inside the router)", params: req.params });
});

module.exports = router;

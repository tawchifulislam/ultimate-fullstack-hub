// routes/admin.js
// router.use() attaches middleware only to THIS router, scoped to
// wherever the router itself gets mounted.

const express = require("express");
const router = express.Router();

function logAdminAccess(req, res, next) {
  console.log(`[admin-router] ${req.method} ${req.originalUrl}`);
  next();
}

// This only runs for requests handled by this router, not for every
// route in the whole app.
router.use(logAdminAccess);

router.get("/stats", (req, res) => {
  res.json({ visits: 1042, signups: 37 });
});

router.get("/reports", (req, res) => {
  res.json({ reports: ["jan.csv", "feb.csv"] });
});

module.exports = router;

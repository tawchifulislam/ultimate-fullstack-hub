// path-scoped-middleware.js
// app.use(path, middleware) only runs the middleware for requests whose
// path starts with that prefix. Everything outside the prefix never sees it.

const express = require("express");
const app = express();
const port = process.argv[2] || 4201;

function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (key !== "secret123") {
    console.log("[admin-auth] missing/wrong key, blocking");
    return res.status(401).json({ error: "missing or invalid x-api-key" });
  }
  console.log("[admin-auth] key ok, continuing");
  next();
}

// Only requests under /admin go through requireApiKey.
app.use("/admin", requireApiKey);

app.get("/", (req, res) => {
  res.json({ message: "public home page, no key needed" });
});

app.get("/admin/dashboard", (req, res) => {
  res.json({ message: "welcome to the admin dashboard" });
});

app.get("/admin/users", (req, res) => {
  res.json({ message: "admin user list" });
});

app.listen(port, () => console.log(`path-scoped-middleware listening on ${port}`));

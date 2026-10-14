// router-middleware.js
// Mounting a router that has its own router.use() middleware; that
// middleware never runs for routes outside the router.

const express = require("express");
const adminRouter = require("./routes/admin");

const app = express();
const port = process.argv[2] || 4203;

app.get("/", (req, res) => {
  res.json({ message: "public home, no admin-router middleware involved" });
});

app.use("/admin", adminRouter);

app.listen(port, () => console.log(`router-middleware listening on ${port}`));

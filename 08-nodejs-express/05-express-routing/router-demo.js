const express = require("express");
const usersRouter = require("./routes/users");
const postsRouter = require("./routes/posts");

const app = express();

// The router itself never mentions "/api/v1/users" or "/api/v1/posts",
// the prefix is decided entirely here, at mount time. The same router
// could be mounted at a different prefix, or mounted twice, with no
// changes to routes/users.js at all.
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/posts", postsRouter);

const PORT = process.argv[2] || 4203;
app.listen(PORT, () => console.log(`listening on :${PORT}`));

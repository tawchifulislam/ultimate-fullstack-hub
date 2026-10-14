const express = require("express");
const app = express();

// Unlike the raw http module (Topic 4), Express parses the query string
// for you (req.query) and extracts named path segments for you (req.params),
// neither needed a single new URL(...) call.
app.get("/users/:id", (req, res) => {
  res.json({
    route: "/users/:id",
    params: req.params,
    query: req.query,
  });
});

app.post("/users", (req, res) => {
  res.status(201).json({ route: "POST /users", created: true });
});

// Two named params in one path.
app.get("/users/:userId/posts/:postId", (req, res) => {
  res.json({ route: "/users/:userId/posts/:postId", params: req.params });
});

const PORT = process.argv[2] || 4200;
app.listen(PORT, () => console.log(`listening on :${PORT}`));

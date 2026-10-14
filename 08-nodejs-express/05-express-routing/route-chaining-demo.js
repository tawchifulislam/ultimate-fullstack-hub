const express = require("express");
const app = express();
app.use(express.json());

// app.route(path) returns an object you chain .get()/.post()/.put()/
// .delete() off of, instead of repeating app.get("/users/:id", ...),
// app.put("/users/:id", ...), etc. separately. Same routing, just grouped
// by path instead of repeated per method.
app
  .route("/users/:id")
  .get((req, res) => {
    res.json({ method: "GET", id: req.params.id });
  })
  .put((req, res) => {
    res.json({ method: "PUT", id: req.params.id, body: req.body });
  })
  .delete((req, res) => {
    res.status(204).end();
  });

const PORT = process.argv[2] || 4205;
app.listen(PORT, () => console.log(`listening on :${PORT}`));

const express = require("express");
const app = express();

// Express tries routes in the order they were registered and stops at the
// first match. A dynamic segment like :id matches ANY single path segment,
// including the literal word "new", so registering it first shadows a more
// specific route that comes after it.

app.get("/users/:id", (req, res) => {
  res.json({ matchedRoute: "/users/:id", params: req.params });
});

// Too late: /users/new will never reach this handler, :id above already
// claimed it.
app.get("/users/new", (req, res) => {
  res.json({ matchedRoute: "/users/new (the form page)" });
});

const PORT = process.argv[2] || 4201;
app.listen(PORT, () => console.log(`listening on :${PORT}`));

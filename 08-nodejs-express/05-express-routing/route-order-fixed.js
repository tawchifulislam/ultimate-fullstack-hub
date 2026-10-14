const express = require("express");
const app = express();

// Fix: register the more specific, literal route FIRST. Express still
// tries routes in registration order, so /users/new now gets first crack
// at matching before /users/:id ever gets a chance to claim it.
app.get("/users/new", (req, res) => {
  res.json({ matchedRoute: "/users/new (the form page)" });
});

app.get("/users/:id", (req, res) => {
  res.json({ matchedRoute: "/users/:id", params: req.params });
});

const PORT = process.argv[2] || 4202;
app.listen(PORT, () => console.log(`listening on :${PORT}`));

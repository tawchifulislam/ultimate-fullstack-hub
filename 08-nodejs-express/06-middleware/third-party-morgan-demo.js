// third-party-morgan-demo.js
// morgan is a popular third-party HTTP request logger middleware from npm,
// used here to show that middleware doesn't have to be something you write
// yourself, express.json()/express.static() and your own custom functions
// are all the exact same kind of thing as a package like this one.

const express = require("express");
const morgan = require("morgan");
const app = express();
const port = process.argv[2] || 4205;

// "dev" is one of morgan's built-in output formats, colored and compact,
// commonly used in local development.
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("home");
});

app.get("/slow", (req, res) => {
  setTimeout(() => res.send("that took a moment"), 150);
});

app.get("/missing", (req, res) => {
  res.status(404).send("not found on purpose");
});

app.listen(port, () => console.log(`third-party-morgan-demo listening on ${port}`));

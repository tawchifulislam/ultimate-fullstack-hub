// default-error-handler-demo.js
// What happens with NO custom error-handling middleware at all.
// Express always has its own built-in default error handler; this file
// exists only to see what it actually does before writing a better one.

const express = require("express");
const app = express();
const port = process.argv[2] || 4400;

app.get("/boom", (req, res) => {
  throw new Error("something broke, synchronously");
});

// No app.use((err, req, res, next) => ...) anywhere in this file.
app.listen(port, () => console.log(`default-error-handler-demo listening on ${port}`));

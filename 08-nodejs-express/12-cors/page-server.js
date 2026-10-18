// page-server.js
// Serves the demo "frontend" page on port 5000, standing in for a React or
// Next.js app running on its own dev server. Because this is a different
// port from the API, the page and the API are different ORIGINS.
//
//   http://localhost:5000   and   http://127.0.0.1:5000   are two different origins
//   (same machine, but the host differs), which the allowlist test below uses.

const express = require("express");
const path = require("path");

const app = express();
const port = process.argv[2] || 5000;

app.use(express.static(path.join(__dirname, "frontend")));

app.listen(port, () => console.log(`page-server listening on ${port}`));

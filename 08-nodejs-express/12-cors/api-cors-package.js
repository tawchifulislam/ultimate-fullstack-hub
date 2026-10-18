// api-cors-package.js
// The same job done with the `cors` package from npm.
//
//   node api-cors-package.js [port] [mode]
//
//   mode "allowlist" (default): one allowed origin, credentials on
//   mode "no-max-age":          the allowlist, but without Access-Control-Max-Age
//   mode "default":             cors() with no options at all
//   mode "wildcard":            origin "*" combined with credentials: a broken combination

const express = require("express");
const cors = require("cors");
const { logger, addRoutes } = require("./common");

const app = express();
const port = process.argv[2] || 4700;
const mode = process.argv[3] || "allowlist";

const options = {
  allowlist: {
    origin: ["http://localhost:5000"],
    credentials: true,
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  },
  "no-max-age": {
    origin: ["http://localhost:5000"],
    credentials: true,
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  default: undefined,
  wildcard: { origin: "*", credentials: true },
}[mode];

app.use(logger);
app.use(options ? cors(options) : cors()); // cors() also answers preflight OPTIONS requests itself
addRoutes(app);

app.listen(port, () => console.log(`api-cors-package listening on ${port} (mode: ${mode})`));

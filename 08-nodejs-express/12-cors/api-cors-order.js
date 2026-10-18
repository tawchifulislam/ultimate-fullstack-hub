// api-cors-order.js
// The same allowlist CORS setup as api-cors-package.js, but with ONE mistake:
// a route is registered BEFORE the cors() middleware. Middleware runs in the
// order it is registered (Topic 76), so a request that reaches that route
// never passes through cors(), and its response carries no CORS headers.

const express = require("express");
const cors = require("cors");
const { logger, addRoutes } = require("./common");

const app = express();
const port = process.argv[2] || 4700;

app.use(logger);

// MISTAKE: this runs before cors(), so its error response has no CORS headers.
app.get("/boom", () => {
  throw new Error("a bug inside the route");
});

app.use(cors({ origin: ["http://localhost:5000"], credentials: true }));
addRoutes(app);

app.listen(port, () => console.log(`api-cors-order listening on ${port}`));

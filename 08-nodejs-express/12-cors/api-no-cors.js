// api-no-cors.js
// An API with NO CORS handling at all. The server happily answers every
// request. Whether a browser page on another origin may read the answers
// is a separate question, and the answer here is no.

const express = require("express");
const { logger, addRoutes } = require("./common");

const app = express();
const port = process.argv[2] || 4700;

app.use(logger);
addRoutes(app);

app.listen(port, () => console.log(`api-no-cors listening on ${port}`));

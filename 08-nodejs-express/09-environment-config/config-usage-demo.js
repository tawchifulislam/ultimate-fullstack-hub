// config-usage-demo.js
// A tiny Express app that imports the centralized config module instead
// of touching process.env directly anywhere in its own code.

const express = require("express");
const config = require("./config");

const app = express();

app.get("/", (req, res) => {
  res.json({
    app: config.appName,
    debugMode: config.debugMode,
    debugModeType: typeof config.debugMode, // boolean, not the string "true"
    maxRetries: config.maxRetries,
    maxRetriesType: typeof config.maxRetries, // number, not a string
  });
});

app.listen(config.port, () => {
  console.log(`${config.appName} listening on port ${config.port} (a real number: ${typeof config.port})`);
});

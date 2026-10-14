// config.js
// A single, centralized place that reads process.env, validates it, and
// coerces types, instead of every file in the app calling process.env.X
// directly. Anything that imports this module gets numbers where it
// expects numbers, booleans where it expects booleans, and an immediate,
// clear crash at startup if something required is missing, rather than a
// confusing bug three layers deep at request time.

require("dotenv").config();

const REQUIRED_VARS = ["PORT", "APP_NAME", "API_SECRET"];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // Fail fast and loud, at startup, not the first time something tries
  // to use a missing value mid-request.
  throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
}

const config = {
  port: Number(process.env.PORT),
  appName: process.env.APP_NAME,
  apiSecret: process.env.API_SECRET,
  debugMode: process.env.DEBUG_MODE === "true",
  maxRetries: Number(process.env.MAX_RETRIES || 3),
};

module.exports = config;

// multi-env-files-demo.js
// Unlike Next.js (Topic 68), plain Node has no built-in convention for
// loading a different .env file per environment. dotenv's `path` option
// is how that's done by hand: pick the file based on NODE_ENV yourself.

const path = require("path");

const envName = process.env.NODE_ENV || "development";
const envFile = `.env.${envName}`;

require("dotenv").config({ path: path.join(__dirname, envFile) });

console.log(`NODE_ENV=${envName}, loaded ${envFile}`);
console.log("APP_NAME:", process.env.APP_NAME);
console.log("LOG_LEVEL:", process.env.LOG_LEVEL);
console.log("DATABASE_URL:", process.env.DATABASE_URL);

// dotenv-demo.js
// The dotenv package does the same job as --env-file, but in code instead
// of a flag, which is why most existing Node/Express projects still use
// it: `node app.js` works the same everywhere, no flag to remember or
// forget in a deploy script.

require("dotenv").config(); // reads .env in the current directory, fills process.env

console.log("APP_NAME:", process.env.APP_NAME);
console.log("PORT:", process.env.PORT, `(${typeof process.env.PORT})`);
console.log("MAX_RETRIES:", process.env.MAX_RETRIES, `(${typeof process.env.MAX_RETRIES})`);

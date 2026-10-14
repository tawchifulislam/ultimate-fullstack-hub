// raw-process-env-demo.js
// Run with plain `node raw-process-env-demo.js`, no flags, no package.
// This is what process.env looks like with nothing loading the .env
// file at all, and what its values actually are once something does.

console.log("PORT from process.env:", process.env.PORT);
console.log("typeof PORT:", typeof process.env.PORT);
console.log("DEBUG_MODE from process.env:", process.env.DEBUG_MODE);
console.log("typeof DEBUG_MODE:", typeof process.env.DEBUG_MODE);

if (process.env.PORT !== undefined) {
  console.log("PORT + 1 =", process.env.PORT + 1, "(string concatenation, not addition!)");
  console.log("Number(PORT) + 1 =", Number(process.env.PORT) + 1, "(this is what you actually want)");
}

if (process.env.DEBUG_MODE !== undefined) {
  console.log(
    "DEBUG_MODE === true ?",
    process.env.DEBUG_MODE === true,
    "(always false, it's the STRING \"true\", not the boolean true)"
  );
}

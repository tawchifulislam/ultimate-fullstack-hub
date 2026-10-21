// timing.js
// Tiny timing helpers for the demos. Timings are specific to the machine they run on and move
// from run to run: compare numbers inside one run with each other, not with yours.

const now = () => Number(process.hrtime.bigint()) / 1e6; // milliseconds

function time(fn) {
  const start = now();
  const value = fn();
  return { ms: now() - start, value };
}

async function timeAsync(fn) {
  const start = now();
  const value = await fn();
  return { ms: now() - start, value };
}

// A small deterministic random generator, so every run draws the same requests.
function makeRandom(seed = 12345) {
  return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
}

module.exports = { now, time, timeAsync, makeRandom };

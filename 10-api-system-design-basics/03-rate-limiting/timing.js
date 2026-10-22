// timing.js
// A small deterministic random generator, so every run replays the same traffic.

function makeRandom(seed = 12345) {
  return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { makeRandom, sleep };

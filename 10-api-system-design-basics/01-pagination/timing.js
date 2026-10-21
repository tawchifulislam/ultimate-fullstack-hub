// timing.js
// Two tiny helpers for the demos. Timings are specific to the machine they run on and
// move from run to run: compare numbers inside one run with each other, not with yours.

const now = () => Number(process.hrtime.bigint()) / 1e6; // milliseconds

function time(fn) {
  const start = now();
  const value = fn();
  return { ms: now() - start, value };
}

// Median of several runs (after one warm-up run), which is steadier than a single run.
function median(fn, runs = 15) {
  fn();
  const samples = [];
  for (let i = 0; i < runs; i++) samples.push(time(fn).ms);
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

module.exports = { time, median };

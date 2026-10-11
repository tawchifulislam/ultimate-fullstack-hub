let count = 0;

console.log("counter.js module body is running"); // only prints once, see caching-demo.js

module.exports = {
  increment: () => ++count,
  getCount: () => count,
};

console.log("a: starting");
exports.done = false;

const b = require("./circular-b");
console.log("a: got b, b.done =", b.done); // see circular-main.js notes for why this is false

exports.done = true;
console.log("a: finished");

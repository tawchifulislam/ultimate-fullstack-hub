console.log("b: starting");
exports.done = false;

const a = require("./circular-a");
console.log("b: got a, a.done =", a.done); // a is mid-execution; this is the PARTIAL exports object

exports.done = true;
console.log("b: finished");

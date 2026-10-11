console.log("main: requiring a");
const a = require("./circular-a");
console.log("main: a.done =", a.done);

const b = require("./circular-b"); // already cached by now, finished
console.log("main: b.done =", b.done);

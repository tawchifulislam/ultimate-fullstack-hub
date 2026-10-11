const a = require("./counter-user-a"); // requires counter.js, increments it twice
const b = require("./counter-user-b"); // requires counter.js AGAIN, but gets the cached instance, increments once more
const counterAgain = require("./counter"); // requires it a third time, straight from here

console.log("a.getCount()           :", a.getCount()); // 3, shared state
console.log("b.getCount()           :", b.getCount()); // 3, same object as a
console.log("counterAgain.getCount():", counterAgain.getCount()); // 3, still the same object
console.log("a === counterAgain     :", a === counterAgain); // true, require() returned the identical cached object

const resolvedPath = require.resolve("./counter");
console.log("in require.cache?      :", resolvedPath in require.cache); // true

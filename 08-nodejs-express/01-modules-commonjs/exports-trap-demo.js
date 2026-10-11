const broken = require("./lib-broken");
const mutated = require("./lib-mutate");
const correct = require("./lib-correct");

console.log("broken  :", broken); // {} - the reassignment inside lib-broken.js was lost
console.log("mutated :", mutated.greet()); // works - mutation, not reassignment
console.log("correct :", correct.greet()); // works - module.exports assigned directly

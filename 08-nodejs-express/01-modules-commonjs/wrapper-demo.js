// Node never runs a CommonJS file's top-level code directly. It wraps the
// whole file's text in a function first, roughly:
//
//   function (exports, require, module, __filename, __dirname) {
//     /* this file's actual code goes here */
//   }
//
// and then calls that function. Everything below is proof the wrapper is
// real: arguments, this, __filename, and __dirname are only available
// because of it, an ES module's top level has none of them.

console.log("__filename:", __filename);
console.log("__dirname :", __dirname);
console.log("typeof require:", typeof require);
console.log("typeof module :", typeof module);

console.log("arguments.length      :", arguments.length); // 5: exports, require, module, __filename, __dirname
console.log("arguments[0] === exports  :", arguments[0] === exports);
console.log("arguments[2] === module   :", arguments[2] === module);
console.log("arguments[3] === __filename:", arguments[3] === __filename);
console.log("arguments[4] === __dirname :", arguments[4] === __dirname);

console.log("this === module.exports:", this === module.exports);

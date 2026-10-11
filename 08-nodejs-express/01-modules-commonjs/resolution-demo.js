// A bare specifier with no "./" or "../" is looked up by walking UP through
// node_modules directories (./node_modules, ../node_modules, and so on)
// until one containing the name is found.
const pkg = require("my-pkg");
console.log("require('my-pkg')     ->", pkg.source);
console.log("resolved to           ->", require.resolve("my-pkg"));

// Requiring a directory (no file extension, no index given) makes Node look
// for ./some-dir/index.js (or whatever package.json "main" says, if that
// directory had its own package.json).
const dirMod = require("./some-dir");
console.log("require('./some-dir') ->", dirMod.source);
console.log("resolved to           ->", require.resolve("./some-dir"));

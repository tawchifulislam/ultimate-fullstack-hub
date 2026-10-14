const express = require("express");

function tryPattern(label, pattern) {
  try {
    const app = express();
    app.get(pattern, (req, res) => res.json({ params: req.params }));
    console.log(`OK    ${label}: "${pattern}" registered without error`);
  } catch (err) {
    console.log(`FAIL  ${label}: "${pattern}" ->`, err.message.split("\n")[0]);
  }
}

console.log("Express version:", require("express/package.json").version);
console.log();

// Old Express 4 / path-to-regexp v6 syntax
tryPattern("Express 4-style optional param", "/users/:id?");
tryPattern("Express 4-style bare wildcard", "/files/*");

// Express 5 / path-to-regexp v8 syntax
tryPattern("Express 5-style optional param", "/users{/:id}");
tryPattern("Express 5-style named wildcard", "/files/*splat");

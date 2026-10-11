# Modules (CommonJS)

**Topic 71 of 89** (Section: Node.js / Express, 1 of 12)

## Notes

### Project structure

```text
exports-trap-demo.js     -> exports vs module.exports
lib-broken.js, lib-mutate.js, lib-correct.js

caching-demo.js          -> require() caches by resolved file path
counter.js, counter-user-a.js, counter-user-b.js

circular-main.js         -> circular require() behavior
circular-a.js, circular-b.js

wrapper-demo.js          -> proves the (exports, require, module, __filename, __dirname) wrapper is real

resolution-demo.js       -> require() resolution: node_modules + package.json "main", and index.js
node_modules/my-pkg/package.json, node_modules/my-pkg/lib/entry.js
some-dir/index.js
```

This is the Node.js / Express section's first topic, and it's deliberately CommonJS-only: JavaScript Topic 19 already covered ES modules (`import`/`export`) in depth. This topic is about what's different when a file uses `require()`/`module.exports` instead, which is still the default in plain `.js` files in most Node projects and npm packages.

### exports vs module.exports: the reassignment trap

```js
// lib-broken.js
exports = { greet: () => "hello from broken" }; // reassigns a LOCAL variable, nothing else
```

```js
// lib-correct.js
module.exports = { greet: () => "hello from correct" }; // this is what require() actually returns
```

```js
// lib-mutate.js
exports.greet = () => "hello from mutate"; // mutating the object, not reassigning the variable, works fine
```

`require()` always returns a module's `module.exports`. Node starts every module with `exports` pointing at the exact same object as `module.exports`, which is why `exports.foo = ...` normally works, right up until something reassigns the bare `exports` variable itself, which only changes what the local name `exports` points to, leaving the real `module.exports` (and therefore what `require()` returns) untouched. Verified directly:

```text
broken  : {}
mutated : hello from mutate
correct : hello from correct
```

### require() caches by resolved file path

```js
// counter.js
let count = 0;
module.exports = { increment: () => ++count, getCount: () => count };
```

`counter-user-a.js` and `counter-user-b.js` each `require("./counter")` and call `increment()`; `caching-demo.js` requires both of those, then requires `./counter` a third time, directly. Verified directly:

```text
counter.js module body is running      <- printed ONLY ONCE across 3 requires
a.getCount()           : 3
b.getCount()           : 3
counterAgain.getCount(): 3
a === counterAgain     : true
in require.cache?      : true
```

The module body log line proving it ran only once is the real evidence: every `require("./counter")` anywhere in the program, after the first, returns the exact same cached object from `require.cache` rather than re-running the file. This is also why a module can hold shared, mutable singleton state, as `counter.js` does here.

### Circular require(): you get a snapshot, not a live binding

```js
// circular-a.js
console.log("a: starting");
exports.done = false;
const b = require("./circular-b");
console.log("a: got b, b.done =", b.done);
exports.done = true;
console.log("a: finished");
```

```js
// circular-b.js
console.log("b: starting");
exports.done = false;
const a = require("./circular-a");
console.log("b: got a, a.done =", a.done);
exports.done = true;
console.log("b: finished");
```

`circular-main.js` requires `./circular-a` first. Verified directly:

```text
main: requiring a
a: starting
b: starting
b: got a, a.done = false   <- a hadn't finished yet; b got a's PARTIAL exports object
b: finished
a: got b, b.done = true    <- by the time control returns to a, b had fully finished
a: finished
main: a.done = true
main: b.done = true
```

`a` requires `b` partway through its own execution; while loading `b`, `b` in turn requires `a` again, Node sees `a` is already in `require.cache` (registered the moment it started running, before it finished) and hands back whatever `a.exports` looks like *right now*, incomplete. That's why `b` sees `a.done = false`. `b`, on the other hand, runs to completion before control ever returns to `a`, so `a` sees the fully-finished `b.done = true`. This asymmetry, not a live link that updates later, is the real behavior of a CommonJS circular dependency, and it's a common source of "why is this value undefined/stale" bugs in large codebases.

### The module wrapper function is real, not a metaphor

Node never runs a CommonJS file's code directly. It wraps the whole file in a function first:

```js
function (exports, require, module, __filename, __dirname) {
  /* your file's code */
}
```

`wrapper-demo.js` proves it by inspecting `arguments` directly, something only possible because the file's code is genuinely running inside a function:

```text
__filename: /.../wrapper-demo.js
__dirname : /tmp/topic71-build
typeof require: function
typeof module : object
arguments.length      : 5
arguments[0] === exports  : true
arguments[2] === module   : true
arguments[3] === __filename: true
arguments[4] === __dirname : true
this === module.exports: true
```

`this` at a CommonJS module's top level is `module.exports` for the same reason: it's whatever the wrapper function was called with. None of this exists in an ES module, whose top level is not wrapped in a function and has no `require`, `module`, `__filename`, or `__dirname` at all.

### How require() finds a file

```js
require("my-pkg");     // bare specifier: walked up through node_modules/ directories
require("./some-dir");  // relative path to a directory: looks for ./some-dir/index.js
```

Verified directly:

```text
require('my-pkg')     -> my-pkg, resolved via node_modules + package.json's main field
resolved to           -> .../node_modules/my-pkg/lib/entry.js
require('./some-dir') -> some-dir/index.js, resolved because requiring a directory looks for index.js
resolved to           -> .../some-dir/index.js
```

A bare specifier like `"my-pkg"` (no `./`, `../`, or leading `/`) is looked up in `./node_modules`, then `../node_modules`, and so on up the directory tree, the standard Node package install location. Once found, Node reads that package's `package.json` for a `"main"` field to know which file is the actual entry point, `lib/entry.js` here rather than some default. A relative path pointing at a directory with no file extension given falls back to that directory's `index.js` if there's no `package.json` to say otherwise.

### Practical tips

- Always prefer `module.exports = {...}` or `exports.name = ...` (mutation); never reassign the bare `exports` variable, it silently does nothing to what `require()` returns.
- A module-level `let`/`const` is a safe place for genuinely shared, process-wide state (a cache, a single DB connection, a counter), specifically because `require()` caching guarantees every importer gets the same object.
- A circular `require()` isn't automatically a bug, but anything that depends on the *other* module being fully initialized at require time will silently get a partial, possibly-`undefined` value instead, restructure to break the cycle (often by moving the shared piece into a third module both depend on) when that matters.
- `__dirname` is the right way to build a path relative to the current file (`path.join(__dirname, "data.json")`), since the process's current working directory can be anything depending on how the script was launched.

## Resources

- Node.js Docs, Modules: CommonJS modules: <https://nodejs.org/api/modules.html>
- Node.js Docs, the module wrapper: <https://nodejs.org/api/modules.html#the-module-wrapper>
- Node.js Docs, Loading from node_modules folders: <https://nodejs.org/api/modules.html#loading-from-node_modules-folders>
- Node.js Docs, Cycles: <https://nodejs.org/api/modules.html#cycles>

## Practice

1. Change `lib-broken.js` to `module.exports.greet = () => ...` (mutating via `module.exports` instead of the bare `exports` alias) and confirm it now works exactly like `lib-mutate.js`.
2. Add a `reset()` method to `counter.js` and call it from `caching-demo.js` between two of the existing `getCount()` calls, to see the shared state change from a third location too.
3. Break the circular dependency between `circular-a.js` and `circular-b.js` by moving whatever they both need into a new `circular-shared.js` that neither requires the other to get.
4. Delete `node_modules/my-pkg/package.json`'s `"main"` field entirely, rerun `resolution-demo.js`, and see which file Node falls back to (hint: the same convention `./some-dir` used).
5. Add `console.log(module.children.map(m => m.id))` to the end of `circular-main.js` and relate the printed list back to the require order actually observed in the output above.

## Code Example

- [exports-trap-demo.js](./01-modules-commonjs/exports-trap-demo.js) · [lib-broken.js](./01-modules-commonjs/lib-broken.js) · [lib-mutate.js](./01-modules-commonjs/lib-mutate.js) · [lib-correct.js](./01-modules-commonjs/lib-correct.js)
- [caching-demo.js](./01-modules-commonjs/caching-demo.js) · [counter.js](./01-modules-commonjs/counter.js) · [counter-user-a.js](./01-modules-commonjs/counter-user-a.js) · [counter-user-b.js](./01-modules-commonjs/counter-user-b.js)
- [circular-main.js](./01-modules-commonjs/circular-main.js) · [circular-a.js](./01-modules-commonjs/circular-a.js) · [circular-b.js](./01-modules-commonjs/circular-b.js)
- [wrapper-demo.js](./01-modules-commonjs/wrapper-demo.js)
- [resolution-demo.js](./01-modules-commonjs/resolution-demo.js) · [node_modules/my-pkg/package.json](./01-modules-commonjs/node_modules/my-pkg/package.json) · [node_modules/my-pkg/lib/entry.js](./01-modules-commonjs/node_modules/my-pkg/lib/entry.js) · [some-dir/index.js](./01-modules-commonjs/some-dir/index.js)

To run it yourself: with just Node.js installed (no packages needed), run `node exports-trap-demo.js`, `node caching-demo.js`, `node circular-main.js`, `node wrapper-demo.js`, and `node resolution-demo.js` from inside this folder, and compare the output to what's quoted above.

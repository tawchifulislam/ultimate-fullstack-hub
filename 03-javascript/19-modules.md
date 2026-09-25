# Modules (import/export)

**Topic 31 of 89** (Section: JavaScript, 19 of 26)

## Notes

### Why modules?

Before ES modules, JavaScript had no built-in way to split code across files with real scoping, everything either lived in one giant file, shared the same global scope and risked naming collisions, or relied on non-standard patterns (an IIFE-based module pattern, Node's CommonJS, AMD in browsers). ES modules (ESM) standardized this directly in the language itself.

### Named exports and imports

```js
// math.js
export function add(a, b) { return a + b; }
export const PI = 3.14159;

// main.js
import { add, PI } from "./math.js";
import { add as sum } from "./math.js"; // renamed on the way in
```

A file can have as many named exports as it needs.

### Default exports

```js
// math.js
export default function add(a, b) { return a + b; }

// main.js
import add from "./math.js"; // no braces, and the imported name is arbitrary
```

Only one default export is allowed per module, and it can coexist with named exports in the same file. Many style guides now prefer named exports over default exports specifically because a default export's imported name is arbitrary at every call site, which hurts consistent renaming and autocomplete; a common accepted exception is a file whose one clear job is exporting a single React component matching the file's name.

### Namespace imports and re-exporting

```js
import * as MathUtils from "./math.js";
MathUtils.add(1, 2);

// index.js, a "barrel" file re-exporting from several modules
export { add, subtract } from "./math.js";
export { default as Button } from "./Button.js";
```

### Imported bindings are live, not copies

This is a commonly missed detail: an imported name is a live reference to the exporting module's binding, not a one-time snapshot taken at import time. If the exporting module later updates a value it exports, every file that imported it sees the updated value automatically, without re-importing anything.

### Modules are singletons

A module's top-level code runs exactly once, the first time anything imports it. Every other file that imports it afterward receives the exact same, already-evaluated module, they do not each get a fresh copy, and any shared state defined at the module's top level stays shared across every importer.

### Modules are strict mode by default, with their own scope

No `"use strict"` needed, ES modules are strict automatically. Static `import`/`export` statements are also only valid at a module's top level, not inside an `if`, a function, or any other block, this rigidity is exactly what lets tooling statically analyze a module graph and remove unused exports ("tree-shaking").

### Static vs dynamic import

Static `import` is resolved before any code runs and must sit at the top level of a file. Dynamic `import(specifier)` is an ordinary function-like expression that returns a Promise, callable from anywhere, including conditionally or inside a function, and is the standard way to lazy-load code, a rarely used page section, a heavy library, only when it's actually needed.

### Node.js: two module systems in one runtime

Node supports both CommonJS (`require`/`module.exports`, covered later in the Node.js/Express section) and ES modules (`import`/`export`) natively. A file is treated as an ES module if it has the `.mjs` extension, or if the nearest `package.json` sets `"type": "module"`; a `.cjs` extension always forces CommonJS regardless of that setting.

### Practical tips

- Default to named exports for most code; they rename consistently across an entire codebase via tooling and give better autocomplete, since the exported name is fixed rather than chosen freshly at every import site.
- Reach for dynamic `import()` specifically to keep an initial bundle smaller, when a chunk of code genuinely isn't needed right away.
- Remember that mutating an exported `let` binding is visible to every importer immediately; this is powerful but can also produce surprising shared state if it's not intentional.

## Resources

- MDN, import: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import>
- MDN, export: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export>
- Node.js Docs, Modules: ECMAScript modules: <https://nodejs.org/api/esm.html>

## Practice / Exercises

- Split a small file with three related functions into a module with named exports, then import just one of them by name into a separate file.
- Export a mutable `let` counter and an `increment()` function from one module, import both into a second file, call `increment()`, and confirm the imported `counter` value updated on its own.

## Code Example

See [`19-modules.js`](./19-modules.js) and [`19-modules-lib.mjs`](./19-modules-lib.mjs) in this folder. `19-modules.js` uses dynamic `import()` specifically so it stays a plain, directly runnable file; the companion `19-modules-lib.mjs` file is the actual ES module being demonstrated, with real named and default exports.

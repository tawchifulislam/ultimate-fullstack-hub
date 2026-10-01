# 3. JavaScript

This is the third and by far the largest section of the Full Stack Skill Roadmap: 26 topics covering the language itself, from basic variable declarations up through the runtime behavior (the event loop, memory management) that explains why JavaScript code sometimes behaves in ways that surprise people coming from other languages. Everything in the later React, Next.js, and Node.js sections assumes everything here is already solid.

## Topics in this section

| # | Topic | What it covers | Files |
| --- | ------- | ----------------- | ------- |
| 1 | Variables & Scope (var, let, const, hoisting) | `var`/`let`/`const` scoping differences, hoisting, and the temporal dead zone. | [Notes](./01-variables-scope.md) &middot; [Code](./01-variables-scope.js) |
| 2 | Data Types & Type Coercion | The seven primitive types, `typeof`'s quirks, `==` vs `===`, and truthy/falsy values. | [Notes](./02-data-types-type-coercion.md) &middot; [Code](./02-data-types-type-coercion.js) |
| 3 | Functions & Arrow Functions | Function declarations vs expressions, and arrow functions' lack of their own `this`/`arguments`. | [Notes](./03-functions-arrow-functions.md) &middot; [Code](./03-functions-arrow-functions.js) |
| 4 | Objects & Object Methods | Object literals, `Object.keys/values/entries`, spread, and shallow vs deep cloning. | [Notes](./04-objects-object-methods.md) &middot; [Code](./04-objects-object-methods.js) |
| 5 | Arrays & Array Methods | Mutating vs non-mutating methods, `map`/`filter`/`reduce`, and `sort()`'s default-comparison trap. | [Notes](./05-arrays-array-methods.md) &middot; [Code](./05-arrays-array-methods.js) |
| 6 | Destructuring & Spread/Rest | Array and object destructuring, defaults, and spread (expand) vs rest (collect). | [Notes](./06-destructuring-spread-rest.md) &middot; [Code](./06-destructuring-spread-rest.js) |
| 7 | Higher-Order Functions | Functions that take or return functions: factories, `pipe`/`compose`, currying, decorators. | [Notes](./07-higher-order-functions.md) &middot; [Code](./07-higher-order-functions.js) |
| 8 | Basic DSA / Problem Solving | Big O notation, two-pointer and sliding-window patterns, recursion, and memoization. | [Notes](./08-basic-dsa-problem-solving.md) &middot; [Code](./08-basic-dsa-problem-solving.js) |
| 9 | Closures | Functions that retain access to their defining scope; the `var`-in-a-loop bug revisited. | [Notes](./09-closures.md) &middot; [Code](./09-closures.js) |
| 10 | this Keyword | The four binding rules (`new`, explicit, implicit, default) and the "losing this" bug. | [Notes](./10-this-keyword.md) &middot; [Code](./10-this-keyword.js) |
| 11 | Prototypes & Prototypal Inheritance | The prototype chain, `Object.create`, and how `class` relates to it underneath. | [Notes](./11-prototypes-prototypal-inheritance.md) &middot; [Code](./11-prototypes-prototypal-inheritance.js) |
| 12 | Classes & OOP | `class` syntax, `extends`/`super`, getters/setters, static members, and `#private` fields. | [Notes](./12-classes-oop.md) &middot; [Code](./12-classes-oop.js) |
| 13 | Callbacks | Sync vs async callbacks, the error-first convention, and callback hell. | [Notes](./13-callbacks.md) &middot; [Code](./13-callbacks.js) |
| 14 | Promises | The pending/fulfilled/rejected states, chaining, and `Promise.all`/`allSettled`/`race`/`any`. | [Notes](./14-promises.md) &middot; [Code](./14-promises.js) |
| 15 | Async/Await | Syntax over Promises, why `try/catch` works again, and the `.forEach()` async mistake. | [Notes](./15-async-await.md) &middot; [Code](./15-async-await.js) |
| 16 | Event Loop, Call Stack, Microtask/Macrotask Queue | Why the microtask queue always drains before the next macrotask runs. | [Notes](./16-event-loop.md) &middot; [Code](./16-event-loop.js) |
| 17 | Error Handling (try/catch, custom errors) | `try`/`catch`/`finally`, built-in error subtypes, custom error classes, and the `cause` option. | [Notes](./17-error-handling.md) &middot; [Code](./17-error-handling.js) |
| 18 | Debugging (Chrome DevTools) | Console methods, conditional breakpoints, stepping through a bug, and the `debugger` statement. | [Notes](./18-debugging.md) &middot; [Page](./18-debugging.html) &middot; [Code](./18-debugging.js) |
| 19 | Modules (import/export) | Named vs default exports, live bindings, module singletons, and static vs dynamic import. | [Notes](./19-modules.md) &middot; [Code](./19-modules.js) &middot; [Module](./19-modules-lib.mjs) |
| 20 | DOM Manipulation | Selecting, creating, and modifying elements; static vs live collections; `textContent` vs `innerHTML`. | [Notes](./20-dom-manipulation.md) &middot; [Page](./20-dom-manipulation.html) &middot; [Code](./20-dom-manipulation.js) |
| 21 | Event Bubbling, Capturing, Delegation | The three event phases, `stopPropagation`, and delegating a listener to a parent. | [Notes](./21-event-bubbling-capturing-delegation.md) &middot; [Page](./21-event-bubbling-capturing-delegation.html) &middot; [Code](./21-event-bubbling-capturing-delegation.js) |
| 22 | Fetch API | `fetch()`'s Promise-based requests, the `response.ok` gotcha, and `AbortController`. | [Notes](./22-fetch-api.md) &middot; [Page](./22-fetch-api.html) &middot; [Code](./22-fetch-api.js) &middot; [Server](./22-fetch-api-server.js) |
| 23 | JSON | `JSON.stringify`/`parse`, what gets dropped or changed, `replacer`/`reviver`, and `toJSON()`. | [Notes](./23-json.md) &middot; [Code](./23-json.js) |
| 24 | LocalStorage, SessionStorage, Cookies | The three client-storage options, their security implications, and the `storage` event. | [Notes](./24-localstorage-sessionstorage-cookies.md) &middot; [Page](./24-localstorage-sessionstorage-cookies.html) &middot; [Code](./24-localstorage-sessionstorage-cookies.js) |
| 25 | Debounce & Throttle | Waiting for a pause vs capping a rate, and leading vs trailing edges. | [Notes](./25-debounce-throttle.md) &middot; [Code](./25-debounce-throttle.js) |
| 26 | Memory Management & Garbage Collection | Reachability, mark-and-sweep, V8's generational heap, leak patterns, and `WeakMap`. | [Notes](./26-memory-management-garbage-collection.md) &middot; [Code](./26-memory-management-garbage-collection.js) |

## How the section fits together

The first eight topics are the language's building blocks: variables, types, functions, objects, arrays, and the destructuring/spread syntax used to work with them, culminating in a first pass at problem-solving technique. Closures and `this` (Topics 9 to 10) are the two mechanisms that explain a huge share of JavaScript's "surprising" behavior, and prototypes and classes (Topics 11 to 12) build directly on closures to give objects shared, inherited behavior. Callbacks, Promises, and async/await (Topics 13 to 15) are one evolving story about handling asynchronous work, each one built to fix a real problem with the one before it, and the event loop (Topic 16) is the mechanism underneath all three that actually explains their execution order. Error handling (Topic 17) applies to both synchronous and asynchronous code equally. Topics 18 to 24 shift into the browser: debugging tools, the DOM, events, fetching data, JSON as the format that data usually arrives in, and the browser's client-side storage options. Debounce and throttle (Topic 25) are a direct, practical application of closures to that same browser-event world. Memory management (Topic 26) closes the section by explaining what the engine is actually doing with every object created across all 26 topics.

## How each topic is structured

Most topics have two files: an explanation (`.md`) and a matching, runnable code example. Where a topic is genuinely browser-specific (DOM manipulation, events, fetch, storage, debugging), the code example is an `.html` page with its own linked `.js` file instead of a plain Node script, following real-world practice of keeping markup and behavior in separate files. A couple of topics needed a small companion file beyond that: Modules ships a second `.mjs` file to import from, and Fetch API ships a tiny local server, since demonstrating a real network request honestly requires something to fetch from.

## Suggested capstone exercise

Build a small client-side app that touches a large share of the section at once: a to-do list backed by `localStorage` (Topics 4, 20, 23, 24), rendered with event delegation rather than one listener per item (Topic 21), with a debounced search box to filter items as you type (Topic 25), and an `async`/`await` function that fetches an initial set of items from a small local server on first load (Topics 14, 15, 22), wrapped in proper error handling throughout (Topic 17).

## Previous section

[Git & GitHub](../02-git-github/README.md)

## Next section

[TypeScript](../04-typescript/README.md)

[Back to main roadmap](../README.md)

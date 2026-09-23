# Callbacks

**Topic 25 of 89** (Section: JavaScript, 13 of 26)

## Notes

### What is a callback?

A callback is simply a function passed as an argument to another function, so that it can be invoked, "called back", at some later point. Every array method covered earlier (`map`, `filter`, `forEach`), every event handler, and every timer relies on this same mechanism.

### Synchronous vs asynchronous callbacks

A **synchronous** callback runs immediately, during the call to the function it was passed to, before that function returns; `array.map(callback)` is a synchronous callback. An **asynchronous** callback runs later, after some operation completes: a timer, a network request, a file read, a user click. The surrounding code does not wait for it; execution continues immediately, and the callback runs whenever the event loop gets to it.

```js
console.log("1: start");
setTimeout(() => console.log("3: timeout callback"), 0);
console.log("2: end");
// Actual order: 1, 2, 3, even with a 0ms delay
```

Even a `0ms` `setTimeout` callback never runs synchronously. It always goes through the event loop's task queue, after all currently running synchronous code has finished completely, which is exactly why "2: end" logs before "3: timeout callback."

### The error-first callback pattern

This was the dominant convention across Node.js's built-in APIs before Promises became standard:

```js
fs.readFile("file.txt", (err, data) => {
  if (err) {
    // handle the error and stop here
    return;
  }
  // use data
});
```

By convention, the first argument is always reserved for an error (or `null` when there wasn't one), and the actual result comes after it. Silently ignoring the `err` argument is a common and genuinely dangerous bug, failures disappear instead of surfacing.

### try/catch does not work across an asynchronous callback

```js
try {
  setTimeout(() => {
    throw new Error("boom");
  }, 0);
} catch (err) {
  // this catch block never runs
}
```

By the time the timer callback actually executes and throws, the surrounding `try` block has already finished running and returned. This gap is one of the concrete problems Promises were designed to solve, a `.catch()` on a promise chain can catch a failure that happens later, in a way a plain `try/catch` around an async callback cannot.

### Callback hell (the pyramid of doom)

When several asynchronous steps must run in sequence, each depending on the previous result, nesting callback inside callback produces code that drifts further right with every step and gets progressively harder to read and error-check:

```js
getUser(id, (err, user) => {
  if (err) return handleError(err);
  getOrders(user.id, (err, orders) => {
    if (err) return handleError(err);
    getOrderDetails(orders[0].id, (err, details) => {
      if (err) return handleError(err);
      // deeper and deeper with every dependent step
    });
  });
});
```

This exact problem is the primary reason Promises, and later `async`/`await`, were added to the language, both covered in the next two topics.

### Callbacks are still everywhere

Not every callback is about async sequencing that Promises replaced. Plenty of callbacks remain purely synchronous and are completely fine as-is: array methods, comparator functions passed to `sort()`. Some asynchronous callbacks also don't fit a Promise's one-time-resolution model at all, an `addEventListener` callback can legitimately fire hundreds of times, which is a different shape of problem than "run this once when a single async operation finishes."

### Practical tips

- Always check the error argument in an error-first callback; treat an unchecked `err` as a bug waiting to happen.
- More than two or three levels of nested callbacks for sequential async steps is the clear signal to switch to Promises or `async`/`await`.
- Remember that a plain `try/catch` cannot catch an error thrown inside an asynchronous callback; only the mechanisms built for async code (promise rejection handling, `async`/`await`) can.

## Resources

- MDN, Callback function (Glossary): <https://developer.mozilla.org/en-US/docs/Glossary/Callback_function>
- MDN, Using promises (covers the callback pyramid of doom): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises>
- MDN, setTimeout(): <https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout>

## Practice / Exercises

- Reproduce the `try/catch` example above, confirm the `catch` block genuinely never runs, and explain in your own words why.
- Write three small functions that each take a callback and simulate an async delay with `setTimeout`, then nest them to reproduce callback hell on purpose, three or four levels deep.

## Code Example

See [`13-callbacks.js`](./13-callbacks.js) in this folder.

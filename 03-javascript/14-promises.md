# Promises

**Topic 26 of 89** (Section: JavaScript, 14 of 26)

## Notes

### What is a Promise?

A Promise is an object representing the eventual result of an asynchronous operation. It is always in exactly one of three states: **pending** (not yet resolved either way), **fulfilled** (completed successfully, holding a value), or **rejected** (failed, holding a reason). Once a promise settles, fulfilled or rejected, it stays that way permanently; it can never change state again.

### Creating a Promise

```js
const promise = new Promise((resolve, reject) => {
  if (success) resolve(value);
  else reject(error);
});
```

In everyday code, Promises are usually consumed rather than constructed by hand, most Promises come back from something like `fetch()` or a library. Manually building one with `new Promise(...)` is mainly needed when wrapping an older callback-based API.

### Consuming a Promise: then, catch, finally

```js
promise
  .then((value) => { /* fulfilled */ })
  .catch((error) => { /* rejected */ })
  .finally(() => { /* runs either way, no value or error passed in */ });
```

`.catch(fn)` is shorthand for `.then(undefined, fn)`, it exists purely for readability. `.finally()` is useful for cleanup work, like hiding a loading indicator, that must happen regardless of success or failure.

### Chaining fixes the pyramid of doom

Every `.then()` returns a brand-new promise, which is what makes chaining work:

```js
getUser(id)
  .then((user) => getOrders(user.id))
  .then((orders) => getOrderDetails(orders[0].id))
  .then((details) => console.log(details))
  .catch((err) => console.error("something failed:", err));
```

This stays flat instead of nesting deeper with every step, and a single `.catch()` at the end handles a failure from *any* step in the whole chain, a real improvement over checking `err` manually at every level of a nested callback pyramid.

### Returning a value vs. returning a promise inside .then()

If a `.then()` callback returns a plain value, the next `.then()` receives it directly. If it returns another promise instead, the chain automatically waits for that promise before continuing, this is exactly what lets each `.then()` above kick off the next dependent async step.

### Errors propagate automatically

An exception thrown inside a `.then()` callback is automatically converted into a rejection of the promise that `.then()` returned, it does not need to be caught right there; it can flow down to a `.catch()` further along the chain. This is a genuine improvement over the plain-`try/catch`-can't-cross-an-async-boundary problem from the Callbacks topic, a promise rejection does propagate correctly.

### The four combinators

- **`Promise.all([p1, p2, p3])`**: waits for every promise to fulfill, resolving with an array of results in the same order they were passed in, not the order they finished. If any one rejects, `Promise.all` rejects immediately with that single reason; the outcomes of the other promises, even other rejections, are silently dropped.
- **`Promise.allSettled([p1, p2, p3])`**: waits for every promise to settle, one way or the other, and never rejects itself. It resolves with an array of `{ status: "fulfilled", value }` or `{ status: "rejected", reason }` objects, one per input, so nothing is ever silently lost.
- **`Promise.race([p1, p2, p3])`**: settles as soon as the first promise settles, whether that first one fulfilled or rejected. A classic use is racing a real operation against a timeout.
- **`Promise.any([p1, p2, p3])`**: settles as soon as the first promise fulfills; it only rejects if every single one rejects, and in that case rejects with an `AggregateError` whose `.errors` array holds every individual rejection reason.

### Practical tips

- Always end a promise chain with `.catch()`. Since Node.js 15, an unhandled promise rejection crashes the process by default rather than just logging a warning.
- Reach for `Promise.allSettled` instead of `Promise.all` whenever every result matters, even if some fail, sending several independent notifications, for example.
- Understanding `.then()`/`.catch()` chaining thoroughly makes the next topic, `async`/`await`, far easier to reason about, it is genuinely the same mechanism underneath, just different syntax on top.

## Resources

- MDN, Using promises: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises>
- MDN, Promise.allSettled(): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled>
- MDN, Promise.any(): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any>

## Practice / Exercises

- Rewrite the three-level nested callback hell example from the Callbacks topic as a flat `.then()` chain with one `.catch()` at the end.
- Create three promises, one that rejects quickly, and run them through `Promise.all`, `Promise.allSettled`, and `Promise.any`, then compare the three different results side by side.

## Code Example

See [`14-promises.js`](./14-promises.js) in this folder.

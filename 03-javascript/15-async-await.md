# Async/Await

**Topic 27 of 89** (Section: JavaScript, 15 of 26)

## Notes

### What is async/await?

`async`/`await` is syntax built entirely on top of Promises, it doesn't replace them, it lets asynchronous code read almost like ordinary synchronous code while still being fully non-blocking underneath.

### An async function always returns a Promise

```js
async function getValue() {
  return 42;
}
getValue(); // a Promise that resolves to 42, not 42 itself
getValue().then((v) => console.log(v)); // 42
```

If an `async` function returns a plain value, JavaScript automatically wraps it in a resolved Promise. If it throws, the returned Promise is automatically rejected with that error instead.

### await pauses the function, not the whole program

```js
async function getUserData(id) {
  const user = await getUser(id);     // pauses here until this promise settles
  const orders = await getOrders(user.id); // then pauses here
  return orders;
}
```

`await` only works inside an `async` function, or at the very top level of an ES module ("top-level await," supported in modules since Node 14 and most modern browsers, but not in a plain script or a non-async function). It unwraps a promise's fulfilled value directly, or throws the rejection reason as a normal exception if the promise rejects.

### try/catch works again

This is the practical payoff over raw callbacks: because a rejected, awaited promise turns into a thrown exception, an ordinary `try/catch` now correctly catches an asynchronous failure, something a plain callback could never do (see the Callbacks topic).

```js
async function getUserData(id) {
  try {
    const user = await getUser(id);
    const orders = await getOrders(user.id);
    return orders;
  } catch (err) {
    console.error("something failed:", err);
  }
}
```

### The classic mistake: accidental sequential awaits

```js
// slow: each await blocks the next line from even starting
const a = await fetchA(); // 1s
const b = await fetchB(); // another 1s, only starts after a finishes
const c = await fetchC(); // another 1s, only starts after b finishes
// total: ~3s, even though none of these depend on each other

// fast: start all three immediately, then wait for all of them together
const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);
// total: ~1s, since they run concurrently
```

`await` only needs to be sequential when a step genuinely depends on the result of the previous one. Awaiting independent operations one at a time, instead of starting them together with `Promise.all`, is one of the most common real-world async/await performance mistakes.

### async/await inside loops

- `for...of` with `await` inside runs sequentially: one full iteration finishes before the next begins. Sometimes that's exactly what's needed, sometimes it's an accidental version of the mistake above.
- `.forEach()` does **not** wait for an async callback at all. `array.forEach(async (item) => { await doSomething(item); })` fires every iteration immediately, without waiting between them, and any error thrown inside is not caught by a surrounding `try/catch`. The same problem applies to `.map()`, `.filter()`, and `.some()` when an `async` callback is passed to them, none of these methods know anything about the promise their callback returns. Use a plain `for...of` loop for sequential processing, or `Promise.all(array.map(async (item) => ...))` for concurrent processing, instead.

### Practical tips

- Reach for `Promise.all` (or `allSettled`) instead of multiple sequential `await`s whenever the operations don't actually depend on each other.
- Never pass an `async` function to `.forEach()`; it silently does not do what it looks like it does.
- Mixing `async`/`await` and raw `.then()`/`.catch()` chains works, but mixing both styles within a single function usually hurts readability more than it helps, pick one per function.

## Resources

- MDN, async function: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function>
- MDN, await: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await>
- MDN, Using promises (async/await section): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises>

## Practice / Exercises

- Write three functions that each resolve after a different delay, call them with sequential `await`s and time it, then call them with `Promise.all` and time it again, and compare.
- Reproduce the `.forEach()` mistake on purpose: log a "done" message right after a `.forEach(async ...)` loop and confirm it logs before the async work inside the loop has actually finished.

## Code Example

See [`15-async-await.js`](./15-async-await.js) in this folder.

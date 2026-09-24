# Event Loop, Call Stack, Microtask/Macrotask Queue

**Topic 28 of 89** (Section: JavaScript, 16 of 26)

## Notes

### The call stack

JavaScript runs on a single thread: one call stack, one thing executing at a time. Every function call pushes a frame onto the stack; when the function returns, its frame is popped off. A function that never reaches a base case (infinite recursion) eventually overflows the stack with the familiar "Maximum call stack size exceeded" error, already seen in the Basic DSA topic.

### Blocking the single thread

Because there is only one call stack, a long-running synchronous operation blocks everything else, no other code, no rendering, no user interaction, until the stack clears. This is exactly why timers, network requests, and file I/O are handled outside the call stack rather than by simply making JavaScript wait.

### Where async work actually happens

When code calls `setTimeout`, `fetch`, or registers a DOM event listener, the actual waiting happens outside the JavaScript engine entirely, in the browser's Web APIs (or Node's libuv-based APIs). When that work finishes, its callback is not run immediately; it is placed into a queue, waiting for its turn once the call stack is completely empty.

### Two queues, not one

- **Macrotask queue** (often just called the task queue): `setTimeout`, `setInterval` callbacks, I/O completion callbacks, UI event callbacks.
- **Microtask queue**: Promise `.then`/`.catch`/`.finally` callbacks, `queueMicrotask()` callbacks, and what runs after an `await` in an async function, since `await` is just another form of promise handling underneath.

### The actual order of operations

1. Run the current synchronous code until the call stack is completely empty.
2. Drain the **entire** microtask queue: run every microtask, including any new ones that get added while this draining is still happening, before moving on to anything else.
3. Run exactly **one** macrotask from the macrotask queue.
4. Drain the microtask queue again, completely, before the next macrotask.
5. Repeat forever.

The critical detail: the microtask queue is always fully drained between every single macrotask, and even before the browser repaints. This is why a promise callback reliably runs before the next `setTimeout` fires, even a `setTimeout(fn, 0)` that was scheduled earlier in the code.

### The classic ordering example

```js
console.log("1: sync");
setTimeout(() => console.log("4: macrotask"), 0);
Promise.resolve().then(() => console.log("3: microtask"));
console.log("2: sync");
// Actual order: 1, 2, 3, 4
```

Even though the timer was scheduled before the promise's `.then()`, the microtask still runs first, because the whole microtask queue empties before the event loop even looks at the macrotask queue.

### Practical tips

- When code runs in a "surprising" order, check whether it mixes synchronous code, microtasks (Promises/`await`), and macrotasks (`setTimeout`); the priority is always sync, then all microtasks, then one macrotask, and that priority is fixed and predictable.
- `queueMicrotask()` schedules something to run "as soon as possible, but after the current synchronous code," without needing to create and resolve a Promise just to get microtask timing.
- A microtask that keeps scheduling more microtasks can starve the macrotask queue (and rendering) indefinitely, a real, if uncommon, bug: the engine will not move on to the next macrotask, or repaint the screen, until the microtask queue is fully empty.

## Resources

- MDN, Using microtasks: <https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide>
- MDN, In depth: Microtasks and the JavaScript runtime environment: <https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth>
- javascript.info, Event loop: microtasks and macrotasks: <https://javascript.info/event-loop>

## Practice / Exercises

- Predict the output order of the classic example above before running it, then verify.
- Write code with two `setTimeout(fn, 0)` calls and, in between them, a `Promise.resolve().then()` whose callback itself schedules another `.then()`; predict the full order before running it.

## Code Example

See [`16-event-loop.js`](./16-event-loop.js) in this folder.

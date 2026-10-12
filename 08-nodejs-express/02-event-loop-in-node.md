# Event Loop in Node

**Topic 72 of 89** (Section: Node.js / Express, 2 of 12)

## Notes

### Project structure

```text
top-level-order.js        -> setTimeout vs setImmediate, run at the top level
io-order.js                -> the same race, run inside an I/O callback
priority-order.js          -> process.nextTick vs Promise microtasks vs timers
starvation-demo.js          -> recursive process.nextTick starving timers and I/O
no-starvation-demo.js       -> the same recursion with setImmediate instead, no starvation
threadpool-demo.js          -> libuv's thread pool and its default size of 4
```

JavaScript Topic 16 already covered the general call-stack/microtask/macrotask model that also applies in the browser. This topic is specifically about Node's own event loop, which is a real, documented set of phases (via the libuv library Node is built on), plus two Node-only scheduling APIs, `process.nextTick()` and `setImmediate()`, that don't exist in browsers at all.

### The phase model, briefly

Each pass through Node's event loop runs through a fixed set of phases in order: **timers** (`setTimeout`/`setInterval` callbacks whose time has come), **pending callbacks**, **poll** (fetch new I/O events and run most I/O callbacks, like `fs.readFile`'s), **check** (`setImmediate` callbacks), and **close callbacks**. The loop cycles through all of them, over and over, for as long as the process has anything left to do. The two demos below are really about where in this cycle something runs.

### setTimeout(fn, 0) vs setImmediate(): only deterministic inside I/O

At the top level, scheduling both in the same tick is a genuine race, decided by how long process startup took before the loop reached the timers phase. Verified directly, running `top-level-order.js` eight times in a row:

```text
immediate timeout
immediate timeout
immediate timeout
immediate timeout
immediate timeout
timeout immediate    <- flipped
immediate timeout
immediate timeout
```

Inside an I/O callback, there's no race at all. `io-order.js` schedules both from inside `fs.readFile`'s callback, which runs in the poll phase; once poll is empty, the loop always moves straight to check (`setImmediate` lives there) before timers gets another turn. Verified directly, eight runs, zero variation:

```text
immediate timeout
immediate timeout
immediate timeout
immediate timeout
immediate timeout
immediate timeout
immediate timeout
immediate timeout
```

### process.nextTick() outranks Promise microtasks, both outrank the next phase

```js
console.log("start");
setTimeout(() => console.log("timeout"), 0);
setImmediate(() => console.log("immediate"));
process.nextTick(() => console.log("nextTick 1"));
Promise.resolve().then(() => console.log("promise 1"));
process.nextTick(() => console.log("nextTick 2"));
console.log("end");
```

Verified directly, run three times:

```text
start
end
nextTick 1
nextTick 2
promise 1
immediate   <- then these two, in either order (see above)
timeout
```

`start`/`end`/the two `nextTick`s/`promise 1` printed in that exact order every single run. Node fully drains its `process.nextTick` queue, then fully drains the Promise microtask queue, and only then lets the loop continue into its next phase, where `timeout`/`immediate` race exactly as they did in the first demo.

### Recursive process.nextTick() can starve timers and I/O completely

This is the real, practical danger: because the nextTick queue must be fully empty before the loop can move on, a nextTick callback that schedules another nextTick before returning never lets the loop proceed at all.

```js
// starvation-demo.js
setTimeout(() => console.log(`timeout fired after ${Date.now() - scheduledAt}ms`), 0);
fs.readFile(__filename, () => console.log(`fs.readFile fired after ${Date.now() - scheduledAt}ms`));

function starve() {
  if (Date.now() - scheduledAt < 1000) process.nextTick(starve);
  else console.log(`nextTick recursion stopped after ${count} calls`);
}
process.nextTick(starve);
```

Verified directly:

```text
nextTick recursion stopped after 8244598 calls, 1000ms
timeout fired after 1007ms (asked for 0ms)
fs.readFile callback fired after 1008ms
```

A `setTimeout(fn, 0)` took **1007ms** to fire, over a thousand times its requested delay, and the `fs.readFile` callback was just as delayed, both completely blocked behind 8.2 million recursive `process.nextTick` calls.

`no-starvation-demo.js` runs the identical experiment with `setImmediate` instead of `process.nextTick` for the recursive part. `setImmediate` callbacks run in the check phase, which happens once per loop iteration, so a recursive `setImmediate` call defers to the *next* iteration instead of monopolizing the current one. Verified directly:

```text
timeout fired after 1ms (asked for 0ms)
fs.readFile callback fired after 8ms
setImmediate recursion stopped after 803238 calls, 1000ms
```

Same shape of program, same 1 second of recursive work in the background, but the timer and the file read both completed almost immediately this time, because `setImmediate` lets the loop breathe between its own calls instead of starving it.

### The libuv thread pool has a default size of 4

`fs`, `crypto` (`pbkdf2`, `scrypt`, `randomBytes`), `dns.lookup`, and `zlib` hand their actual work off to a small pool of real OS threads (separate from the single JS thread) rather than blocking anything. That pool defaults to only 4 threads. `threadpool-demo.js` fires off 6 `crypto.pbkdf2` calls at once; verified directly:

```text
# default pool size (4)
job 1 finished at 307ms
job 3 finished at 387ms
job 4 finished at 390ms
job 2 finished at 394ms     <- first 4 finish in a cluster
job 5 finished at 527ms
job 6 finished at 559ms     <- remaining 2 queued, finish in a second cluster

# UV_THREADPOOL_SIZE=1
job 1 finished at 181ms
job 2 finished at 380ms
job 3 finished at 553ms
job 4 finished at 726ms
job 5 finished at 944ms
job 6 finished at 1140ms    <- fully serialized, ~190ms apart, every time
```

With the default pool, 4 jobs finish together before the remaining 2; forced down to a single thread, all 6 run strictly one after another. Six CPU-heavy calls never block the JS thread either way, callbacks still fire in order of completion, but only 4 can truly run in parallel by default.

### Practical tips

- Never write an unconditional recursive `process.nextTick()`; if you need to defer repeated work without starving the loop, use `setImmediate()` instead.
- `process.nextTick()` is for finishing something synchronously-adjacent before I/O continues (classic use: emitting an error on the next tick so a listener attached right after a constructor call still catches it); it is not a general-purpose scheduler.
- Code that "obviously" runs after a 0ms timeout can still be starved by nextTick-heavy code elsewhere in the same process; this is a real production outage pattern, not just a trivia question.
- If an app does a lot of CPU-bound work through `crypto` or `fs`, remember only 4 such operations truly run at once by default; `UV_THREADPOOL_SIZE` can raise that ceiling (up to 128), at the cost of more OS threads.

## Resources

- Node.js Docs, The Node.js Event Loop: <https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick>
- Node.js Docs, process.nextTick(): <https://nodejs.org/api/process.html#processnexttickcallback-args>
- Node.js Docs, Thread pool (libuv): <https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop#what-code-runs-on-the-worker-pool>
- libuv Docs, Design overview: <https://docs.libuv.org/en/v1.x/design.html>

## Practice

1. Change `starvation-demo.js`'s `TARGET_MS` to 3000 and predict, before running, roughly how delayed the timeout will be.
2. Add a third `process.nextTick(() => console.log("nextTick 3"))` to `priority-order.js`, placed after the `Promise.resolve().then(...)` line, and confirm it still prints before `promise 1`, not after, proving ordering depends on queue type, not source-code position.
3. Rewrite `starvation-demo.js`'s recursion to yield every 1,000 calls (`if (count % 1000 === 0) setImmediate(starve); else process.nextTick(starve);`) and observe whether the timeout delay improves.
4. Run `threadpool-demo.js` with `UV_THREADPOOL_SIZE=2` and `UV_THREADPOOL_SIZE=8`, and compare the clustering pattern in each case.
5. Replace `crypto.pbkdf2` in `threadpool-demo.js` with `crypto.pbkdf2Sync` called six times in a loop (no callbacks) and compare total wall-clock time to the async version, to see the cost of giving up the thread pool's parallelism entirely.

## Code Example

- [top-level-order.js](./02-event-loop-in-node/top-level-order.js)
- [io-order.js](./02-event-loop-in-node/io-order.js)
- [priority-order.js](./02-event-loop-in-node/priority-order.js)
- [starvation-demo.js](./02-event-loop-in-node/starvation-demo.js)
- [no-starvation-demo.js](./02-event-loop-in-node/no-starvation-demo.js)
- [threadpool-demo.js](./02-event-loop-in-node/threadpool-demo.js)

To run it yourself: with just Node.js installed, run each file directly with `node <file>.js`. For the thread pool demo, also try `UV_THREADPOOL_SIZE=1 node threadpool-demo.js` to see the fully-serialized version compared above.

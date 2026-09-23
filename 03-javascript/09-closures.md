# Closures

**Topic 21 of 89** (Section: JavaScript, 9 of 26)

## Notes

### What is a closure?

A closure is a function bundled together with references to the variables from its surrounding scope at the time it was created. This lets the function keep using those variables even after the outer function that originally held them has already finished running and would normally be long gone. Every function in JavaScript forms a closure the moment it is created, whether or not it ends up actually using anything from the enclosing scope.

```js
function makeCounter() {
  let count = 0; // lives in makeCounter's scope
  return function () {
    count++; // the returned function closes over count
    return count;
  };
}
const counter = makeCounter();
counter(); // 1
counter(); // 2
counter(); // 3, count persists between calls, private to this counter
```

Each call to `makeCounter()` creates a brand new, independent `count` and a brand new closure over it, calling it again produces a completely separate counter.

### Why closures matter in practice

1. **Data privacy**: a variable captured by a closure is only reachable through whatever functions you expose, nothing outside can reach it directly. This is how the module pattern created private state before ES modules existed.
2. **Function factories**: `multiplyBy(factor)` returning a specialized function (covered in the Higher-Order Functions topic) works entirely because the returned function closes over `factor`.
3. **Callbacks that need to remember something**: an event handler or timer callback that needs to know, say, which specific item it belongs to.

### The var-in-a-loop pitfall, revisited

The classic loop pitfall from the Variables & Scope topic is really a closures problem:

```js
function createFunctions() {
  const fns = [];
  for (var i = 0; i < 3; i++) {
    fns.push(function () { return i; });
  }
  return fns;
}
createFunctions().map((fn) => fn()); // [3, 3, 3], not [0, 1, 2]
```

All three functions close over the exact same `i`, because `var` is function-scoped, there is only one `i` for the whole loop. By the time any of the three functions actually run, the loop has already finished and `i` is `3`. Switching to `let` fixes it, because `let` creates a fresh binding of `i` on every iteration, so each closure captures its own separate variable.

### Closures and garbage collection

A variable captured by a closure cannot be garbage collected as long as the closure itself is still reachable, this is exactly what makes the counter example above work. Modern engines are smarter than "keep the entire outer scope alive," though: V8 only keeps alive the specific variables a closure actually references, not every variable that happened to exist in the enclosing function. Still, holding onto a closure that captures something large (a big array, a DOM node) for longer than necessary, most commonly an event listener or timer that's never cleaned up, is a common real source of memory leaks in long-running applications.

### Practical tips

- A callback "remembering" a value from when it was created is the closure doing exactly its job; that's the intended behavior, not a bug, as long as `let`/`const` are used correctly.
- The module pattern (an IIFE returning an object of methods that close over private variables) predates ES modules and still shows up in older codebases.
- Debounce and throttle, covered a few topics ahead, are both built entirely on a closure holding onto a timer ID between calls.

## Resources

- MDN, Closures: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures>
- MDN, Memory management: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management>

## Practice / Exercises

- Rewrite the `createFunctions` example above using `let` instead of `var`, confirm it now logs `[0, 1, 2]`, and explain in your own words why the fix works.
- Build a simple private counter using the module pattern (an IIFE that returns `{ increment, decrement, getValue }`), and confirm the count itself can't be accessed or changed from outside those three functions.

## Code Example

See [`09-closures.js`](./09-closures.js) in this folder.

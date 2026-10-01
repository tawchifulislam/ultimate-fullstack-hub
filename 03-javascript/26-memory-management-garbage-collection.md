# Memory Management & Garbage Collection

**Topic 38 of 89** (Section: JavaScript, 26 of 26)

## Notes

### The memory lifecycle

Every language manages memory through the same basic lifecycle: allocate it when needed, use it, release it once it's no longer needed. Low-level languages like C require manually freeing memory; JavaScript automates that last step entirely through garbage collection.

### Reachability is the actual rule

A JavaScript garbage collector decides what to keep using **reachability**, not scope and not simply "how many variables point to this." Starting from a set of roots, roughly: currently executing functions' local variables, the enclosing scope chain, and global variables, the engine considers anything reachable by following references from those roots to still be in use. Anything that cannot be reached from any root, no matter how it got that way, is garbage.

### Mark-and-sweep, the algorithm every modern engine uses

1. **Mark**: starting from the roots, walk every reference and mark every object reached along the way.
2. **Sweep**: reclaim the memory of anything left unmarked.

This correctly handles circular references, a real advantage over the older reference-counting approach some engines used to use. Two objects that only reference each other, but that nothing else in the program can reach, are both still correctly identified as unreachable and collected, since neither one is reachable from a root, despite each holding a reference to the other.

### V8's generational heap

V8 splits its heap into a "young generation" for new, usually short-lived objects, collected frequently with a fast algorithm, and an "old generation" for objects that survive several young-generation collections, collected less often with a more thorough mark-sweep-compact pass that also defragments memory. This exploits the observation that most objects die young, and dramatically cuts collection overhead compared to scanning the entire heap every time.

### A subtlety worth knowing: "still in scope" isn't the same as "still rooted"

V8 tracks, at a fairly precise level, the last point in a function where a local variable might still be read, not just where its lexical scope ends. Once the engine can prove a variable won't be read again, the objects it refers to can become collectible even before the variable's enclosing block or function actually finishes running. This is exactly the kind of thing that makes memory debugging occasionally counterintuitive: an object can disappear "earlier than expected" simply because nothing in the remaining code path was ever going to read that reference again, which is correct behavior, not a bug.

### Common memory leak patterns

- **Accidental globals**: forgetting `let`/`const`/`var` in non-strict code creates an implicit global variable, which is always reachable from the global object and therefore never collected.
- **Forgotten timers**: a `setInterval` that's never cleared with `clearInterval` keeps its callback, and everything that callback's closure references, alive indefinitely.
- **Detached DOM references**: holding a JS variable pointing to a DOM node after it's removed from the document keeps that node, and everything it references, in memory even though it's no longer visible anywhere.
- **Uncleared event listeners**: a listener attached to a long-lived object like `window` that closes over other data keeps that data alive for as long as the listener stays attached.
- **Unbounded caches**: a plain object or `Map` used as a cache with no eviction policy grows forever, since a `Map`'s keys are held with an ordinary, strong reference.

### WeakMap and WeakSet

```js
const cache = new WeakMap(); // keys must be objects (or symbols), never primitives
cache.set(someObject, computedValue);
```

A `WeakMap`'s keys are held weakly: if nothing else in the program still references a key object, the garbage collector is free to reclaim it, and its entry disappears automatically, with the corresponding value then eligible for collection too. This makes `WeakMap`/`WeakSet` well suited for caching or attaching metadata to objects without that cache being the reason those objects never get freed. Neither is iterable, no `.size`, no `.keys()`, no `for...of`, specifically because entries can vanish at any moment as a side effect of garbage collection, which would make enumerating them meaningless. Under the hood, MDN notes their entries aren't quite ordinary weak references but "ephemerons," a refinement to mark-and-sweep that runs in three phases instead of two to handle this correctly.

### Practical tips

- Always pair a `setInterval`/`addEventListener` with its corresponding `clearInterval`/`removeEventListener` once it's no longer needed, this is exactly why React's `useEffect` accepts a cleanup function.
- Reach for `WeakMap`/`WeakSet` specifically when associating extra data with objects whose lifetime isn't yours to control.
- A JavaScript memory leak is almost always "something is still referencing this longer than intended," not an exotic engine bug; the patterns above cover the large majority of real cases.

## Resources

- MDN, Memory management: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management>
- MDN, WeakMap: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap>
- Node.js Docs, process.memoryUsage(): <https://nodejs.org/api/process.html#processmemoryusage>

## Practice / Exercises

- Create two objects that reference only each other, drop every other reference to both, and reason through why mark-and-sweep still collects them while a naive reference-counting scheme would not.
- Build a small cache once with a plain `Map` and once with a `WeakMap`, drop the only external reference to a cached object in both, and predict which cache still reports that entry afterward.

## Code Example

See [`26-memory-management-garbage-collection.js`](./26-memory-management-garbage-collection.js) in this folder. Run it with `node --expose-gc 26-memory-management-garbage-collection.js`, the extra flag is required to manually trigger garbage collection on demand for the demo; without it, `global.gc` does not exist.

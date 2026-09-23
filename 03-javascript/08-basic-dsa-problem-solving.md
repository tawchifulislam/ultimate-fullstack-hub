# Basic DSA / Problem Solving (arrays, strings, recursion, time complexity)

**Topic 20 of 89** (Section: JavaScript, 8 of 26)

## Notes

### Big O notation

Big O describes how an algorithm's running time (or memory use) grows as the input size, usually called `n`, grows, not the exact time in seconds. From fastest to slowest growth:

- **O(1)** constant: array index access, hash map lookup.
- **O(log n)** logarithmic: binary search on a sorted array.
- **O(n)** linear: a single loop over the input.
- **O(n log n)** linearithmic: efficient comparison-based sorting.
- **O(n²)** quadratic: nested loops over the same input, a naive duplicate check.
- **O(2ⁿ)** exponential: naive recursive Fibonacci with no caching.

Constants and lower-order terms are dropped: `O(2n)` is just `O(n)`, and `O(n² + n)` is just `O(n²)`, because as `n` grows large, only the fastest-growing term actually matters.

### Two common array patterns

- **Two pointers**: two indices that move toward each other or together across an array, common on sorted-array problems like checking for a pair that sums to a target, or reversing an array in place, in O(n) instead of nested loops.
- **Sliding window**: a moving subrange of fixed or variable size, used for problems like "largest sum of any k consecutive elements." It avoids recomputing the whole sum from scratch at every position, turning an O(n·k) approach into O(n).
- **Hash map for O(1) lookups**: trading space for time. The classic example is "Two Sum": a naive nested-loop search is O(n²), but tracking values already seen in a hash map (a plain object or a `Map`) solves it in O(n).

### String problems

Strings in JavaScript are immutable, every "modification" actually produces a new string, but they behave like arrays of characters for most algorithmic purposes. Common patterns: counting character frequency with an object or `Map`, checking a palindrome with two pointers starting from both ends, and checking whether two strings are anagrams by comparing sorted characters or character frequency counts.

### Recursion

A recursive function calls itself to solve a smaller version of the same problem. Every recursive function needs two things: a **base case** that stops the recursion, and a **recursive case** that moves the problem closer to that base case. Each call adds a frame to the call stack; a base case that's missing or never reached causes a stack overflow ("Maximum call stack size exceeded").

### A JavaScript-specific surprise: tail-call optimization doesn't actually exist here

ES6 formally added Proper Tail Calls to the language specification, which would let a specific style of recursive call reuse the current stack frame instead of adding a new one, avoiding stack overflows entirely. In practice, V8 (Chrome and Node.js) and SpiderMonkey (Firefox) never shipped it, and V8 even removed an experimental implementation after running into serious debugging and performance problems. Safari's JavaScriptCore is the only major engine that implements it. This means writing "tail-recursive" JavaScript for Node and expecting it to avoid a stack overflow is a common and reasonable-looking mistake, it simply does not happen.

### Memoization

Caching a function's results by its arguments so a repeated call with the same input returns instantly instead of recomputing. This turns naive recursive Fibonacci from O(2ⁿ) into O(n), at the cost of the memory used to store the cache.

### Practical tips

- Get a correct brute-force solution first, then look for a hash map, two-pointer, or sliding-window improvement, optimizing before something works is usually wasted effort.
- State both the time *and* space complexity of a solution; trading space for time (hash maps, memoization) is one of the most common real optimizations.
- When debugging recursion, log the function's arguments (and depth, if useful) on every call; it makes the otherwise invisible call stack visible.

## Resources

- MDN, Recursion (Glossary): <https://developer.mozilla.org/en-US/docs/Glossary/Recursion>
- MDN, Algorithm (Glossary): <https://developer.mozilla.org/en-US/docs/Glossary/Algorithm>
- Wikipedia, Big O notation: <https://en.wikipedia.org/wiki/Big_O_notation>

## Practice / Exercises

- Solve "Two Sum" (find two numbers in an array that add up to a target) two ways: the naive O(n²) nested-loop version, then the O(n) hash map version, and compare them on a large input.
- Write a recursive Fibonacci function, time it for `n = 35`, then add memoization and time it again.

## Code Example

See [`08-basic-dsa-problem-solving.js`](./08-basic-dsa-problem-solving.js) in this folder.

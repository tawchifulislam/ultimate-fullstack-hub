# Arrays & Array Methods (map, filter, reduce, forEach, etc.)

**Topic 17 of 89** (Section: JavaScript, 5 of 26)

## Notes

### Mutating vs non-mutating methods

This is the single most important distinction to internalize about array methods, since mixing them up causes real bugs.

**Mutating** (change the original array in place): `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, `copyWithin`.

**Non-mutating** (return something new, leave the original untouched): `map`, `filter`, `reduce`, `slice`, `concat`, `flat`, `flatMap`, `find`, `findIndex`, `includes`, `indexOf`, `some`, `every`, `join`.

The trap: `sort()` and `reverse()` both mutate the array in place *and* return that same array, which makes it easy to assume they are non-mutating like `map`. They are not.

```js
const original = [3, 1, 2];
const sorted = original.sort();
console.log(original); // [1, 2, 3], the original was mutated too!
```

Newer methods fix exactly this: `toSorted()`, `toReversed()`, `toSpliced()`, and `with()` (ES2023) behave like `sort`, `reverse`, `splice`, and index assignment, but return a new array instead of mutating.

### The core iteration methods

- **`forEach(callback)`**: runs `callback` once per element, always returns `undefined`. There is no built-in way to break out of it early.
- **`map(callback)`**: returns a **new** array of the same length, with each element transformed by `callback`.
- **`filter(callback)`**: returns a **new** array containing only the elements where `callback` returned a truthy value.
- **`reduce(callback, initialValue)`**: reduces the whole array down to one accumulated value. `callback` receives `(accumulator, currentValue, index, array)`. Forgetting `initialValue` is a common source of bugs, without it, the first element is used as the starting accumulator, and calling `reduce` with no initial value on an empty array throws a `TypeError`.
- **`find(callback)` / `findIndex(callback)`**: return the first matching element, or its index, or `undefined`/`-1` if nothing matches.
- **`some(callback)` / `every(callback)`**: return `true`/`false`, and short-circuit as soon as the answer is known.

### Chaining

Because `map` and `filter` each return a new array, they chain naturally: `arr.filter(x => x.active).map(x => x.name)`. `reduce` is the most general of the three, `map` and `filter` can both be implemented in terms of `reduce`, though reaching for the more specific method usually reads clearer.

### sort()'s default behavior is a classic trap

Without a compare function, `sort()` converts elements to strings and sorts them lexicographically, so `[10, 1, 2].sort()` gives `[1, 10, 2]`, not `[1, 2, 10]`. Sorting numbers correctly requires an explicit compare function: `arr.sort((a, b) => a - b)` for ascending order.

### Practical tips

- Prefer `map`/`filter`/`reduce` over a manual `for` loop with `push`; they are easier to read and compose, and they avoid an entire class of off-by-one bugs.
- Always pass a compare function to `sort()` when sorting numbers.
- Reach for `toSorted()`/`toReversed()`/`with()` instead of their mutating counterparts whenever the original array must not change, this matters a great deal when working with state in frameworks like React.

## Resources

- MDN, Array (Guide, Indexed collections): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections>
- MDN, Array.prototype.reduce(): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce>
- MDN, Array.prototype.sort(): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort>

## Practice / Exercises

- Implement your own version of `map` using only `reduce`, then confirm it produces the same output as the built-in `map` on a few test arrays.
- Take an array of numbers, sort it with plain `sort()` and no compare function, and predict the (wrong) result before running it.

## Code Example

See [`05-arrays-array-methods.js`](./05-arrays-array-methods.js) in this folder.

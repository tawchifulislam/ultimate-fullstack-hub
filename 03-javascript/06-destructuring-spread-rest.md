# Destructuring & Spread/Rest

**Topic 18 of 89** (Section: JavaScript, 6 of 26)

## Notes

### Array destructuring

```js
const [first, second] = [1, 2, 3];      // first = 1, second = 2, the 3 is simply ignored
const [, , third] = [1, 2, 3];          // empty commas skip elements, third = 3
const [a, ...rest] = [1, 2, 3, 4];      // a = 1, rest = [2, 3, 4]
const [x = 10] = [];                    // x = 10, the default fills in for a missing index
```

It also gives a clean way to swap two variables without a temporary one:

```js
let a = 1, b = 2;
[a, b] = [b, a];
```

### Object destructuring

```js
const { name, age } = person;
const { name: fullName } = person;      // rename while destructuring
const { role = "guest" } = person;      // default value
const { address: { city } } = person;   // nested destructuring
```

### Defaults only apply to `undefined`, not `null`

This is a very commonly missed detail: a destructuring default is used only when the property is missing or explicitly `undefined`. If the property exists and is `null`, the default is skipped and the variable becomes `null`.

```js
const { c = 2 } = { c: null };
console.log(c); // null, not 2
```

### Destructuring in function parameters

```js
function greet({ name, age = 18 }) {
  return `${name}, age ${age}`;
}
greet(person);
```

This is extremely common in React, where component props are destructured directly in the function signature: `function Card({ title, children }) { ... }`.

### Spread syntax: expands

Spread "expands" an iterable or object into individual elements or properties.

```js
const combined = [...arr1, ...arr2];        // array concatenation
const copy = [...arr1];                     // shallow copy
const merged = { ...obj1, ...obj2 };        // object merge, later keys win
Math.max(...numbers);                       // spreads array elements as separate arguments
const chars = [...str];                     // spreads a string into an array of characters
```

### Rest syntax: collects

Rest uses the exact same `...` syntax, but does the opposite job: it collects multiple remaining items into a single array or object. Whether `...` means spread or rest depends entirely on where it appears, inside a literal being built (spread) versus inside a destructuring pattern or a parameter list (rest).

```js
function sum(...nums) { /* nums is a real array of every argument passed */ }
const [head, ...tail] = [1, 2, 3, 4];       // tail = [2, 3, 4]
const { id, ...otherFields } = user;        // otherFields = user minus its id property
```

### The rest element must come last

A rest element must be the final item in a destructuring pattern or parameter list, and it cannot have a trailing comma. `const [a, ...rest, b] = arr;` is a `SyntaxError`, not a runtime error.

### Practical tips

- Destructuring with renaming and defaults combined often replaces several lines of manual property access in one line.
- Spread only produces a shallow copy, the same caveat that applies to `Object.assign()` and `{ ...obj }` from the previous topic still applies here.
- Remember the `null` vs `undefined` default rule above; it is a frequent source of confusing bugs when data comes from an API that explicitly sends `null` for missing fields.

## Resources

- MDN, Destructuring assignment: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment>
- MDN, Spread syntax (...): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax>
- MDN, Rest parameters: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters>

## Practice / Exercises

- Write a function that accepts a config object and destructures three fields with defaults directly in its parameter list, then call it with a partial object and with a `null` field to see the default rule in action.
- Merge two objects with overlapping keys using spread, and predict which value wins before running it.

## Code Example

See [`06-destructuring-spread-rest.js`](./06-destructuring-spread-rest.js) in this folder.

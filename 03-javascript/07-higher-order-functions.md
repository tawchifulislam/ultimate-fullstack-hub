# Higher-Order Functions

**Topic 19 of 89** (Section: JavaScript, 7 of 26)

## Notes

### What is a higher-order function?

A higher-order function is a function that does at least one of the following: takes one or more functions as arguments, or returns a function as its result. This is only possible because JavaScript treats functions as first-class values, they can be stored in variables, placed in arrays or objects, passed as arguments, and returned from other functions, exactly like any other value.

### Functions as arguments

This is the version already used constantly: `map`, `filter`, `reduce`, `forEach`, and `sort` are all higher-order functions, since each one takes a callback function as an argument.

```js
function repeat(n, action) {
  for (let i = 0; i < n; i++) action(i);
}
repeat(3, (i) => console.log("iteration", i));
```

### Functions that return functions

A function factory generates and returns a specialized function.

```js
function multiplyBy(factor) {
  return function (x) {
    return x * factor;
  };
}
const double = multiplyBy(2);
double(5); // 10
```

This relies on closures (covered in more depth a couple of topics ahead): the returned function keeps access to `factor` even after `multiplyBy` has already finished running.

### Function composition

Composition combines multiple functions into one, feeding the output of one function into the next.

```js
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);
const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);
```

`pipe` applies functions left to right, `compose` applies them right to left (the traditional mathematical convention, `f(g(x))`). Both are themselves higher-order functions: each takes a list of functions and returns a new function.

### Currying

Currying transforms a function that takes multiple arguments into a sequence of functions that each take exactly one.

```js
const add = (a) => (b) => (c) => a + b + c;
add(1)(2)(3); // 6
```

This makes it easy to create specialized, partially-applied versions of a function by stopping partway through the chain.

### The decorator / wrapping pattern

A higher-order function can wrap an existing function to add behavior, logging, timing, memoization, without modifying the original function's own code.

```js
function withLogging(fn) {
  return function (...args) {
    console.log(`Calling ${fn.name} with`, args);
    const result = fn(...args);
    console.log("Result:", result);
    return result;
  };
}
```

### Practical tips

- The array methods already covered (`map`/`filter`/`reduce`) are, in practice, the higher-order functions used most often day to day; understanding "higher-order function" as a concept mostly means understanding why those methods are built the way they are.
- Function factories combined with closures are the foundation of patterns like React hooks and Redux middleware.
- `compose`/`pipe`/curry are genuinely useful in functional-programming-heavy code, but a plain, explicitly named function is often clearer for a simple one-off case; reach for these patterns when they actually reduce repetition, not by default.

## Resources

- MDN, First-class Function (Glossary): <https://developer.mozilla.org/en-US/docs/Glossary/First-class_Function>
- MDN, Callback function (Glossary): <https://developer.mozilla.org/en-US/docs/Glossary/Callback_function>
- MDN, Functions (Guide): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions>

## Practice / Exercises

- Write `once(fn)`, a higher-order function that returns a wrapped version of `fn` which only ever actually runs the first time it's called, and simply returns the cached result on every call after that.
- Build a small `pipe` utility, then use it to chain three small functions (for example: trim a string, lowercase it, then capitalize the first letter) into one combined function.

## Code Example

See [`07-higher-order-functions.js`](./07-higher-order-functions.js) in this folder.

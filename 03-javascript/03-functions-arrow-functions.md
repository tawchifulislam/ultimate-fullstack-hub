# Functions & Arrow Functions

**Topic 15 of 89** (Section: JavaScript, 3 of 26)

## Notes

### Ways to define a function

- **Function declaration**: `function foo() {}`, fully hoisted, body included, so it can be called earlier in the file than where it's written.
- **Function expression**: `const foo = function () {}`, not hoisted the same way; only the variable binding follows `var`/`let`/`const`'s own hoisting rules, the function itself is not usable before this line runs.
- **Arrow function**: `const foo = () => {}`, a more concise syntax introduced in ES6, with several real behavioral differences from the two forms above, not just shorter syntax.

### The key difference: `this` binding

A regular function gets its own `this`, determined by how it is *called* (its call-site), not where it was defined. An arrow function has no `this` of its own at all; it looks up `this` in its enclosing lexical scope, exactly like any other variable it doesn't declare itself. This is the main reason arrow functions exist: they fix the classic problem of `this` becoming `undefined` or the wrong object inside a plain function callback.

```js
const timer = {
  seconds: 0,
  start() {
    setInterval(function () {
      this.seconds++; // regular function: `this` here is not `timer`
    }, 1000);
  },
};
```

Swapping that callback for an arrow function fixes it, because the arrow function inherits `this` from `start`'s scope, where `this` correctly refers to `timer`.

### Arrow functions also lack several other bindings

- **No own `arguments` object**: an arrow function reading `arguments` gets the enclosing non-arrow function's `arguments`, not its own. Use rest parameters (`...args`) instead.
- **Cannot be used as constructors**: calling an arrow function with `new` throws a `TypeError`; arrow functions have no internal `[[Construct]]` behavior and no `.prototype` property at all.
- **Cannot be generator functions**: there is no arrow equivalent of `function*`.
- **`call()`, `apply()`, and `bind()` don't change their `this`**: since an arrow function never had its own `this` to begin with, trying to rebind it has no effect.

### Implicit return

An arrow function with no braces around its body returns that expression automatically: `(x) => x * 2` returns `x * 2` with no `return` keyword needed. As soon as braces are added, an explicit `return` is required again: `(x) => { return x * 2; }`.

### Parameters

- **Default parameters**: `function greet(name = "friend") {}` supplies a fallback when an argument is omitted or `undefined`.
- **Rest parameters**: `function sum(...numbers) {}` collects any remaining arguments into a real array, unlike the old `arguments` object, which only looks array-like.
- **Destructured parameters**: `function greet({ name, age }) {}` pulls named properties straight out of an object argument.

### Practical tips

- Use arrow functions for callbacks where the surrounding `this` should be preserved: array methods, `setTimeout`/`setInterval`, and callbacks inside class methods.
- Use a regular function (or method shorthand) when the function genuinely needs its own `this`, most commonly an object method that refers to that object, since an arrow function used as a method will not have the object as `this`.
- Don't reach for an arrow function just because it's shorter; its behavioral differences from a regular function matter far more than the syntax.

## Resources

- MDN, Functions (Guide): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions>
- MDN, Arrow function expressions: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions>
- MDN, this: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this>

## Practice / Exercises

- Take the `timer` example above, run it with a regular function callback, observe the bug, then fix it by switching to an arrow function.
- Write an object with a method defined as an arrow function, call it, and explain why `this` does not point to the object.

## Code Example

See [`03-functions-arrow-functions.js`](./03-functions-arrow-functions.js) in this folder.

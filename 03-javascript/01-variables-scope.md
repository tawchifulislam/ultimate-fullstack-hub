# Variables & Scope (var, let, const, hoisting)

**Topic 13 of 89** (Section: JavaScript, 1 of 26)

## Notes

### var, let, and const

- **`var`**: function-scoped (or global if declared outside any function). Can be redeclared in the same scope. Ignores block boundaries entirely, a `var` inside an `if` block is visible outside it.
- **`let`**: block-scoped, to the nearest enclosing `{}`. Can be reassigned, but cannot be redeclared in the same scope.
- **`const`**: block-scoped like `let`, must be initialized at declaration, and cannot be reassigned afterward. Important nuance: `const` only makes the *binding* constant, not the value. `const arr = []; arr.push(1);` is completely valid; only `arr = []` (rebinding the variable itself) would throw.

### Hoisting

JavaScript conceptually moves declarations to the top of their scope before running any code, but what happens next differs by keyword:

- `var` declarations are hoisted and initialized with `undefined`, so reading a `var` before its declaration line gives `undefined` rather than an error.
- `let` and `const` are also hoisted, but not initialized. Referencing them before their declaration line throws a `ReferenceError`, because they sit in the **Temporal Dead Zone (TDZ)**, the span between entering their scope and actually reaching their declaration.
- Function declarations (`function foo() {}`) are hoisted along with their entire body, so they can be called earlier in the code than where they're written. Function expressions (`const foo = function () {}`) are not; only the variable binding is hoisted, following whatever rule `var`/`let`/`const` gives it.

### The classic var-in-a-loop pitfall

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// logs 3, 3, 3, var is function-scoped, so all three callbacks share one i

for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// logs 0, 1, 2, let creates a fresh binding of i for each iteration
```

### Modern guidance

- Default to `const` for everything.
- Reach for `let` only when a variable genuinely needs to be reassigned later.
- Avoid `var` in new code; it exists today mainly to explain and maintain older code.

### Practical tips

- Redeclaring a `let` or `const` in the same scope is a `SyntaxError`, caught before the code even runs, not a runtime bug.
- The TDZ exists specifically so that using `let`/`const` too early fails loudly with an error, instead of silently returning `undefined` the way `var` does.
- `const` on an object or array protects against reassignment, not mutation; if a value truly needs to be unchangeable, that requires something like `Object.freeze()`, not `const` alone.

## Resources

- MDN, let: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let>
- MDN, const: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const>
- MDN, Hoisting (Glossary): <https://developer.mozilla.org/en-US/docs/Glossary/Hoisting>

## Practice / Exercises

- Predict the output of the two `setTimeout` loop examples above before running them, then verify in a browser console or Node.
- Write a short snippet that triggers a `ReferenceError` from the temporal dead zone on purpose, then fix it.

## Code Example

See [`01-variables-scope.js`](./01-variables-scope.js) in this folder.

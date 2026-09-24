# Error Handling (try/catch, custom errors)

**Topic 29 of 89** (Section: JavaScript, 17 of 26)

## Notes

### try/catch/finally basics

```js
try {
  riskyOperation();
} catch (err) {
  console.error("failed:", err);
} finally {
  cleanup(); // always runs, success or failure
}
```

`finally` always runs, whether the `try` block succeeded, threw, or even contains a `return`, the `finally` block still runs before the function actually returns. Since ES2019, the `catch` binding is optional: `catch { ... }` is valid when the error object itself isn't needed.

### The built-in Error subtypes

`Error` is the base type, with `.message`, `.name`, and the non-standard but universally supported `.stack` (a string trace of the call stack at the point the error was created). JavaScript has seven standard built-in subtypes: `TypeError` (wrong type, calling a non-function, reading a property of `null`/`undefined`), `RangeError` (a value outside an allowed range, including the stack overflow from unbounded recursion in the Basic DSA topic), `ReferenceError` (an undeclared variable, or the TDZ cases from the Variables & Scope and Classes topics), `SyntaxError`, `URIError`, `EvalError` (legacy, rarely seen today), and `AggregateError` (from `Promise.any()`, covered in the Promises topic). Check an error's specific type with `err instanceof TypeError` or `err.name === "TypeError"`.

### Throwing your own errors

```js
throw new Error("Something went wrong");
```

JavaScript technically allows throwing any value at all, `throw "a string"` is legal, but it's strongly discouraged: only real `Error` objects reliably carry a `.stack` trace, and most tooling and calling code assumes whatever was caught is an `Error` instance.

### Custom error classes

```js
class ValidationError extends Error {
  constructor(message, field, options) {
    super(message, options); // pass options through, this is what installs `cause`
    this.name = "ValidationError"; // otherwise this would just read "Error"
    this.field = field;
  }
}

throw new ValidationError("Email is required", "email");
```

Extending `Error` lets a custom error type carry extra structured context (`field` above) and lets calling code distinguish error types precisely with `instanceof`. Two easy-to-miss details: setting `this.name` manually is required, extending `Error` does not update `.name` on its own, and it is what appears in the default stack trace header; and the constructor's second `options` parameter must be explicitly forwarded to `super(message, options)`, or a `cause` passed in when throwing will silently be dropped.

### Catching specific error types, and re-throwing the rest

```js
try {
  doSomething();
} catch (err) {
  if (err instanceof ValidationError) {
    // handle this specific, expected case
  } else {
    throw err; // don't silently swallow an error you don't recognize
  }
}
```

Re-throwing anything not specifically handled matters: silently swallowing unexpected errors hides real bugs instead of surfacing them.

### Chaining errors with the cause option (ES2022)

```js
try {
  parseConfig();
} catch (err) {
  throw new Error("Failed to start application", { cause: err });
}
```

This wraps a lower-level error inside a more meaningful, higher-level one without losing the original, `caughtErr.cause` gives access back to the original error that triggered it.

### Error handling in asynchronous code

A plain `try/catch` works around `await` (covered in Async/Await), and `.catch()` serves the same role in a promise chain (covered in Promises). An uncaught synchronous throw crashes a Node process (or logs to the browser console); an uncaught promise rejection crashes modern Node by default too.

### Practical tips

- Only catch an error where something meaningful can actually be done about it; catching everything everywhere and just logging it makes debugging harder, not easier.
- Give a custom error a proper `.name` and attach relevant structured data as extra properties, rather than cramming everything into the message string.
- Use the `{ cause }` option when wrapping an error in a more specific one, instead of losing the original error's context.

## Resources

- MDN, Error: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error>
- MDN, Error: cause: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause>
- MDN, try...catch: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch>

## Practice / Exercises

- Write a `ValidationError` and a `NotFoundError`, both extending `Error`, then write one `catch` block that handles each differently and re-throws anything else.
- Trigger a real `TypeError`, `RangeError`, and `ReferenceError` on purpose (without looking up how), then check each one's `.name` and confirm it matches what you expected.

## Code Example

See [`17-error-handling.js`](./17-error-handling.js) in this folder.

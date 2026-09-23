# Data Types & Type Coercion

**Topic 14 of 89** (Section: JavaScript, 2 of 26)

## Notes

### Primitive types

JavaScript has seven primitive types: `string`, `number`, `boolean`, `undefined`, `null`, `symbol`, and `bigint`. Everything else, objects, arrays, functions, dates, is an object under the hood. Primitives are immutable and compared by value; objects are compared by reference.

### typeof, and its one famous quirk

`typeof` returns a string naming a value's type: `"string"`, `"number"`, `"boolean"`, `"undefined"`, `"symbol"`, `"bigint"`, `"function"`, or `"object"`. The well-known exception is `typeof null`, which returns `"object"`. This is a decades-old bug baked into the language's very first implementation (objects were tagged internally with `0`, and `null` was represented as the null pointer, which also happened to be `0`), and it can never be fixed now without breaking the web. In practice this means `x === null` is the only reliable way to check specifically for `null`; `typeof` cannot do it.

Also worth knowing: `typeof NaN` is `"number"`, since `NaN` ("Not a Number") is itself a number value, and `typeof []` / `typeof {}` are both `"object"`, so `Array.isArray(x)` is needed to actually distinguish an array from a plain object.

### Type coercion

JavaScript often converts values between types implicitly when an operator is used on mismatched types.

```js
"5" + 3     // "53", + with a string operand triggers string concatenation
"5" - 3     // 2, - always forces numeric coercion
"5" * "2"   // 10, * also forces numeric coercion
true + true // 2, booleans coerce to 1 and 0 in numeric context
[] + []     // "", arrays coerce to strings, and an empty array becomes ""
```

### == vs ===

`==` (loose equality) coerces both sides to a common type before comparing; `===` (strict equality) never coerces and requires the same type and value. This is why `0 == "0"`, `0 == ""`, and `0 == []` are all `true` despite looking unrelated, each right-hand side gets coerced down to `0` first. The near-universal recommendation is to use `===`/`!==` by default, reaching for `==` only in the one well-understood case of checking for both `null` and `undefined` at once with `x == null`.

### NaN is never equal to itself

`NaN === NaN` is `false`, and so is `NaN == NaN`. This is standard IEEE 754 floating-point behavior, not a JavaScript-specific bug. It means `x !== x` is actually a (rarely used) valid way to detect `NaN`, but `Number.isNaN(x)` is the clear, intention-revealing way to do it.

### Truthy and falsy values

There are exactly seven falsy values: `false`, `0`, `0n`, `""`, `null`, `undefined`, and `NaN`. Every other value is truthy, including some values that look "empty" but are not: `"0"` (a non-empty string), `[]` (an empty array), and `{}` (an empty object) are all truthy.

### Number.isNaN() vs the global isNaN()

The global `isNaN(x)` coerces its argument to a number first, so `isNaN("hello")` is `true`, since `"hello"` coerces to `NaN`, even though `"hello"` itself was never a number gone wrong. `Number.isNaN(x)` does not coerce, and only returns `true` for the actual value `NaN`, which is almost always what you actually want to check for.

### Practical tips

- Default to `===`/`!==`; only use `==`/`!=` for the specific `x == null` pattern.
- Prefer explicit conversion over relying on implicit coercion: `String(x)`, `Number(x)`, `Boolean(x)`, or the shorthand forms `` `${x}` ``, `+x`, and `!!x`.
- Use `Array.isArray(x)` to check for arrays and `Number.isNaN(x)` to check for `NaN`; both behave more predictably than the older alternatives.

## Resources

- MDN, JavaScript data types and data structures: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures>
- MDN, typeof: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof>
- MDN, Equality (==): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Equality>

## Practice / Exercises

- Predict the result of `[] + []`, `[] + {}`, `{} + []`, and `0 == []` before running them, then check in a console.
- Write a `safeIsNaN` helper using `Number.isNaN` and compare its results against the global `isNaN` on a handful of tricky inputs like `"hello"`, `undefined`, and `"123"`.

## Code Example

See [`02-data-types-type-coercion.js`](./02-data-types-type-coercion.js) in this folder.

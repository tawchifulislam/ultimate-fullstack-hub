# JSON

**Topic 35 of 89** (Section: JavaScript, 23 of 26)

## Notes

### What is JSON?

JSON (JavaScript Object Notation) is a text-based format for representing structured data. Despite the name, it is language-independent and used across virtually every language and platform, not just JavaScript. JSON is always a *string*; a JS object or array is converted **to** JSON text with `JSON.stringify()`, and converted **back from** JSON text with `JSON.parse()`.

### JSON.stringify()

```js
JSON.stringify(value, replacer, space)
```

- `replacer`: optional, either an array of key names to include (a whitelist), or a function called for every key/value pair that can transform or drop values, returning `undefined` from the replacer function removes that key entirely.
- `space`: optional, adds indentation for readable output (a number of spaces, or a string like `"\t"`).

### What gets dropped, changed, or throws

- `undefined`, functions, and `Symbol` values are not valid JSON. As an object property, they are simply omitted; as an array element, they become `null` instead, since array length must be preserved.
- `NaN` and `Infinity` both become `null` too, but unlike the point above, they are never omitted, only converted.
- `BigInt` values throw a `TypeError` if stringified directly, JSON has no BigInt type, and JavaScript refuses to silently guess how to represent one.
- A `Date` is converted to its ISO string form automatically, through its own built-in `toJSON()` method, not to any special JSON date type, because JSON has no date type at all. Parsing that string back with `JSON.parse()` gives a plain string, not a `Date` object.
- If any value has a `.toJSON()` method, `JSON.stringify()` calls it and serializes whatever it returns, instead of the value itself, this is exactly how `Date` gets its automatic string conversion.
- A circular reference (an object that contains a reference back to itself, directly or indirectly) throws a `TypeError`, `"Converting circular structure to JSON"`, since a straightforward stringification would recurse forever.

### JSON.parse()

```js
JSON.parse(text, reviver)
```

- `reviver`: an optional function, called for every key/value pair as the structure is being rebuilt, from the innermost values outward. It can transform values during parsing, for example, turning an ISO date string back into a real `Date` object, since `JSON.parse()` alone never does that automatically.
- Throws a `SyntaxError` on anything that isn't valid JSON: trailing commas, single-quoted strings, unquoted keys, and comments are all invalid JSON, even though several of them are perfectly valid in a plain JS object literal.

### JSON is stricter than a JS object literal

Only six kinds of value exist in JSON: string, number, boolean, `null`, object, and array. Object keys must always be double-quoted strings, trailing commas are never allowed, and comments have no place in JSON at all, this is exactly why a real `package.json` file cannot contain comments, no matter how convenient that would be.

### The old JSON.parse(JSON.stringify(x)) deep-clone trick

Before `structuredClone()` existed (covered in the Objects & Object Methods topic), this was a common way to deep-clone a plain object. Its real limitations follow directly from everything above: it silently drops functions, `undefined`, and Symbols, turns `Date`s into plain strings, throws on circular references, and reduces a `Map` or `Set` down to an empty `{}`. Prefer `structuredClone()` for actual deep cloning today.

### Practical uses

- `localStorage` and `sessionStorage` (a later topic) only store strings, `JSON.stringify`/`JSON.parse` is the standard way to persist objects and arrays in them.
- API request and response bodies (the Fetch API topic): `body: JSON.stringify(data)` to send, `await response.json()` to read.

### Practical tips

- Use the `replacer` array form to whitelist exactly which fields get serialized, a clean way to strip sensitive fields like passwords or internal ids before logging or sending data.
- Use the `space` argument for readable console output while debugging; skip it for anything actually sent over a network, where the extra whitespace is pure overhead.
- Reach for `structuredClone()` instead of the old stringify-then-parse trick whenever a real deep clone is needed.

## Resources

- MDN, JSON.stringify(): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify>
- MDN, JSON.parse(): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse>
- MDN, Working with JSON: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/JSON>

## Practice / Exercises

- Stringify an object containing a function, an `undefined` value, a `NaN`, and a nested `Date`, then predict what the resulting JSON string will look like before checking it.
- Write a `reviver` function for `JSON.parse` that automatically converts any string matching an ISO date format back into a real `Date` object.

## Code Example

See [`23-json.js`](./23-json.js) in this folder.

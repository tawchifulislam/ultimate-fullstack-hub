# Objects & Object Methods

**Topic 16 of 89** (Section: JavaScript, 4 of 26)

## Notes

### Creating objects

The object literal, `const obj = { key: "value" }`, is the idiomatic way to create an object in everyday code. `Object.create(proto)` is used less often, for creating an object with a specific prototype directly.

### Accessing properties

- **Dot notation**, `obj.key`, requires a valid identifier and a key you already know at write time.
- **Bracket notation**, `obj["key"]`, works with any string, including keys with spaces, special characters, or a key computed at runtime, `obj[someVariable]`.

### Property and method shorthand (ES6)

```js
const name = "Ada";
const person = {
  name,              // shorthand for name: name
  greet() {          // shorthand for greet: function () { ... }
    return `Hi, I'm ${this.name}`;
  },
};
```

### Computed property names

```js
const key = "dynamicKey";
const obj = { [key]: "value" }; // { dynamicKey: "value" }
```

### Useful built-in Object methods

- `Object.keys(obj)`: an array of the object's own enumerable property names.
- `Object.values(obj)`: an array of the corresponding values.
- `Object.entries(obj)`: an array of `[key, value]` pairs, convenient with `for...of` or array destructuring.
- `Object.assign(target, ...sources)`: shallow-copies properties from each source into `target`, mutating and returning `target`.
- `Object.freeze(obj)`: prevents adding, removing, or reassigning the object's own properties. This freeze is shallow: nested objects and arrays inside a frozen object remain fully mutable.

### Spread syntax for objects (ES2018)

```js
const copy = { ...original };            // shallow copy
const merged = { ...defaults, ...user }; // later keys overwrite earlier ones on conflict
```

### Optional chaining and nullish coalescing

These aren't object methods, but they are used constantly alongside objects:

- `obj?.nested?.prop`: safely reads a nested path without throwing if an intermediate value is `null` or `undefined`; the whole expression short-circuits to `undefined` instead.
- `obj.prop ?? "default"`: falls back to `"default"` only when `obj.prop` is `null` or `undefined`, unlike `||`, which would also fall back on any falsy value like `0` or `""`.

### Shallow copy vs deep copy

Both `Object.assign` and the spread operator `{ ...obj }` only copy one level deep. A nested object or array inside the source is still shared by reference between the original and the copy, so mutating it through either one affects both. For an actual deep copy:

- `structuredClone(obj)`: the modern, built-in way, available in browsers and in Node. It correctly clones `Date`, `Map`, `Set`, and circular references, but it cannot clone functions, it throws if the value isn't structured-cloneable.
- `JSON.parse(JSON.stringify(obj))`: an older trick with real limitations, it silently drops functions and `undefined` values, converts `Date` objects into plain strings, and throws on circular references.

### Practical tips

- Prefer property and method shorthand; they read cleaner and are the modern default.
- Remember `Object.freeze` is shallow; freezing a nested structure fully requires freezing each nested object yourself.
- Reach for `structuredClone()` over the old JSON trick whenever an actual deep copy is needed.

## Resources

- MDN, Working with objects: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects>
- MDN, Object.entries(): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries>
- MDN, structuredClone(): <https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone>

## Practice / Exercises

- Write a function that merges two objects with `{ ...a, ...b }`, then predict, before running it, which value wins when both objects share a key.
- Create an object with a nested object inside it, shallow-copy it with spread, mutate the nested part through the copy, and confirm the original changed too. Then fix it using `structuredClone`.

## Code Example

See [`04-objects-object-methods.js`](./04-objects-object-methods.js) in this folder.

# this Keyword

**Topic 22 of 89** (Section: JavaScript, 10 of 26)

## Notes

### The core idea

`this` is determined by *how* a function is called, its call-site, not where the function was written. The one exception is arrow functions, covered in the Functions & Arrow Functions topic, which have no `this` of their own at all and simply inherit it from the enclosing scope.

### The four binding rules, from highest to lowest precedence

1. **`new` binding**: calling a function with `new` creates a brand-new object, and `this` inside that function call refers to it.
2. **Explicit binding** (`call`, `apply`, `bind`): directly sets what `this` will be for that call.
   - `fn.call(thisArg, arg1, arg2)`: calls `fn` immediately, arguments passed individually.
   - `fn.apply(thisArg, [arg1, arg2])`: calls `fn` immediately, arguments passed as an array.
   - `fn.bind(thisArg)`: does **not** call `fn`; it returns a brand-new function permanently bound to `thisArg`. Calling `.bind()` again on an already-bound function has no further effect, the first bind wins.
3. **Implicit binding**: calling a function as a method, `obj.method()`, makes `this` refer to whatever object sits immediately to the left of the dot at the call site.
4. **Default binding**: a plain function call with none of the above. `this` is `undefined` in strict mode (which ES modules and class bodies are automatically), or the global object in old-style non-strict code.

A subtle, real edge case: `new` actually outranks even an explicit `bind()`. Calling a bound function with `new` still constructs a fresh object and uses that as `this`, ignoring the object the function was bound to, because `new` always needs to hand the function a newly created object.

### The classic "losing this" bug

```js
const obj = {
  name: "Widget",
  greet() {
    console.log(this.name);
  },
};

const greetFn = obj.greet;
greetFn(); // this is now default binding, not implicit, this.name throws or is undefined
```

Extracting a method into a plain variable, or passing it directly as a callback (`setTimeout(obj.greet, 1000)`, `button.addEventListener("click", obj.greet)`), loses the implicit binding entirely, because at the moment it's actually called, there's no object to the left of a dot anymore.

### Fixing lost `this`

- `.bind(obj)`: `const bound = obj.greet.bind(obj);`
- An arrow function wrapper at the call site: `setTimeout(() => obj.greet(), 1000);`
- A class field defined as an arrow function, which closes over the instance's `this` automatically since class fields are set per instance: `greet = () => { console.log(this.name); };`

### Quick reference by context

| Call form | `this` refers to |
| --- | --- |
| `obj.method()` | `obj` |
| `fn()` (plain call, strict mode) | `undefined` |
| `fn()` (plain call, non-strict) | the global object |
| `new Fn()` | the newly created instance |
| `fn.call(obj)` / `fn.apply(obj)` | `obj` |
| `fn.bind(obj)()` | `obj` |
| arrow function | whatever `this` was in the enclosing scope |
| DOM event handler (regular function) | the element the listener is attached to |

### Practical tips

- When a method might get passed around as a callback, bind it (either with `.bind()` in the constructor, or by defining it as a class field arrow function) rather than hoping it's always called as `obj.method()`.
- `call`/`apply` are mostly used today for "borrowing" a method from one object to use on another; `bind` is far more common in everyday application code.
- If `this` is behaving unexpectedly, the fastest diagnosis is almost always to look at the exact call site, not the function's definition.

## Resources

- MDN, this: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this>
- MDN, Function.prototype.bind(): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind>
- MDN, Function.prototype.call(): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call>

## Practice / Exercises

- Take the `obj.greet` example above, reproduce the "losing this" bug, then fix it three different ways: `.bind()`, an arrow wrapper, and a class field arrow function.
- Write a function that reads `this.name`, then call it four different ways (plain call, as a method, with `.call()`, with `new`) and predict the result of each before running it.

## Code Example

See [`10-this-keyword.js`](./10-this-keyword.js) in this folder.

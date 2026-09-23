# Prototypes & Prototypal Inheritance

**Topic 23 of 89** (Section: JavaScript, 11 of 26)

## Notes

### What is a prototype?

Every JavaScript object has an internal link to another object called its prototype, and that prototype has a prototype of its own, and so on, forming a chain that ends at `null`. When a property is accessed on an object and it isn't found directly on that object, JavaScript automatically walks up this prototype chain, checking each prototype in turn, until it finds the property or reaches `null`.

```js
const a = { x: 1 };                 // a -> Object.prototype -> null
const b = Object.create(a);         // b -> a -> Object.prototype -> null
b.x; // 1, not b's own property, found by walking up to a
```

### Object.create()

`Object.create(proto)` creates a brand-new object with `proto` set directly as its prototype. This is the purest form of prototypal inheritance, no constructor functions or classes involved at all.

```js
const animal = {
  speak() {
    return `${this.name} makes a sound`;
  },
};
const dog = Object.create(animal);
dog.name = "Rex";
dog.speak(); // "Rex makes a sound", speak is found via the prototype chain
```

### Constructor functions and .prototype

Before `class` syntax existed, prototypal inheritance was set up with constructor functions:

```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return `${this.name} makes a sound`;
};

const dog = new Animal("Rex");
dog.speak(); // found on Animal.prototype, not stored on dog itself
```

Every function has a `.prototype` property, an ordinary object used to hold methods that every instance created with `new` will share, rather than each instance getting its own copy of that method.

### How method lookup actually works

Calling `dog.speak()` does the following: JavaScript checks whether `dog` has its own `speak` property (it doesn't), then checks `dog`'s prototype, `Animal.prototype` (found it there), and calls that function with `this` set to `dog`, the object the method was actually called on. This same lookup happens for built-in methods too: `[].push` isn't duplicated onto every single array, it lives once on `Array.prototype`, shared by every array in existence.

### Checking for a property's own vs. inherited status

- `Object.hasOwn(obj, "key")`: the modern, recommended way to check whether `key` exists directly on `obj` itself.
- `obj.hasOwnProperty("key")`: the older equivalent; still common, but it can misbehave if an object happens to have its own unrelated property literally named `hasOwnProperty`, or was created with `Object.create(null)` and has no prototype chain to inherit the method from at all.
- `"key" in obj`: true if `key` exists anywhere in `obj`'s own properties *or* its prototype chain, a much broader check than either of the above.

### A security-relevant habit: prefer Object.keys() over for...in

A `for...in` loop walks the entire prototype chain, including inherited enumerable properties, which is a common, easy-to-miss source of bugs (and, with untrusted input, a real prototype-pollution security concern). `for (const key of Object.keys(obj))` only visits `obj`'s own properties and is almost always what's actually intended.

### Classes are syntactic sugar over prototypes

`class` syntax, covered in depth in the next topic, does not introduce a different inheritance model, it is built entirely on top of this same prototype chain mechanism. A method defined inside a `class` body still ends up on that class's `.prototype`, exactly like the constructor-function version above.

### Practical tips

- Modern code almost always reaches for `class` syntax rather than wiring up `.prototype` by hand, but the underlying prototype chain is what explains why array methods are shared across every array, why `instanceof` works, and why mutating a shared prototype affects every existing instance at once.
- Avoid `Object.setPrototypeOf()` on an object that already exists if performance matters; set the prototype at creation time instead, with `Object.create()` or a constructor/class.
- Prefer `Object.hasOwn()` and `Object.keys()`/`for...of` over `hasOwnProperty()` and `for...in` in new code.

## Resources

- MDN, Inheritance and the prototype chain: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain>
- MDN, Object.create(): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create>
- MDN, Object.hasOwn(): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn>

## Practice / Exercises

- Build a small prototype chain by hand with `Object.create()`, three levels deep, and confirm a property defined only at the top level is still reachable from the bottom object.
- Add a new method to `Array.prototype` (just to see it happen, not something to do in real code) and confirm every existing array in the same session immediately gains access to it.

## Code Example

See [`11-prototypes-prototypal-inheritance.js`](./11-prototypes-prototypal-inheritance.js) in this folder.

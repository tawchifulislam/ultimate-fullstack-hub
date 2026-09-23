# Classes & OOP

**Topic 24 of 89** (Section: JavaScript, 12 of 26)

## Notes

### Class syntax basics

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return `${this.name} makes a sound`;
  }
}
const dog = new Animal("Rex");
```

This is the same prototype mechanism from the previous topic wearing cleaner syntax: `speak` still ends up on `Animal.prototype`, not copied onto every instance. A few behaviors are worth knowing precisely:

- Class declarations are **not hoisted** the way function declarations are; they follow the same temporal dead zone restriction as `let`/`const`, referencing a class before its declaration throws a `ReferenceError`.
- A class body runs in strict mode automatically, even with no `"use strict"` directive anywhere.
- Calling a class without `new` (`Animal()` instead of `new Animal()`) throws a `TypeError`, unlike an ordinary function, which can be called either way.

### Inheritance with extends and super

```js
class Dog extends Animal {
  constructor(name, breed) {
    super(name); // must run before `this` can be used in a derived constructor
    this.breed = breed;
  }
  speak() {
    return `${super.speak()} (specifically, a bark)`;
  }
}
```

`extends` wires up the prototype chain, so `Dog.prototype`'s prototype becomes `Animal.prototype`. Inside a derived class's constructor, `super(...)` must be called before `this` is used at all, or JavaScript throws a `ReferenceError`. `super.method()` inside an overriding method calls the parent's version, useful for extending behavior instead of fully replacing it.

### Getters and setters

```js
class Circle {
  constructor(radius) { this.radius = radius; }
  get area() { return Math.PI * this.radius ** 2; }
  set diameter(d) { this.radius = d / 2; }
}
```

`circle.area` reads like a plain property, no parentheses, while actually running code; `circle.diameter = 10` runs the setter instead of just storing a value.

### Static members

```js
class Counter {
  static count = 0;
  constructor() { Counter.count++; }
  static reset() { Counter.count = 0; }
}
```

`static` members belong to the class itself, not to instances, accessed as `Counter.count`, never `new Counter().count`. Common uses are shared counters, factory methods, and constants related to the class as a whole.

### Private fields and methods (`#`, ES2022)

```js
class BankAccount {
  #balance = 0; // truly private, enforced by the language itself
  constructor(initial) { this.#balance = initial; }
  deposit(amount) { this.#balance += amount; return this.#balance; }
}
```

Unlike the old `_underscore` naming convention, which was purely a social agreement and fully accessible from outside, a `#field` is enforced by the engine. Referencing `#balance` from outside the class is an early `SyntaxError`, caught by static analysis before the code even runs, not something that fails only at runtime.

### Public class fields

```js
class Widget {
  count = 0;                        // set on each instance directly
  onClick = () => { this.count++; }; // arrow field, auto-bound per instance
}
```

A class field defined as an arrow function is a clean, standard fix for the "losing `this`" problem covered in the `this` Keyword topic, since it closes over the instance's `this` automatically, with no `.bind()` needed in the constructor.

### instanceof

`dog instanceof Animal` checks whether `Animal.prototype` appears anywhere in `dog`'s prototype chain, it is really a prototype-chain check wearing a friendlier name.

### Practical tips

- Prefer composition over deep inheritance chains; more than one or two levels of `extends` tends to become hard to reason about, this is a general OOP principle, not something specific to JavaScript.
- Use `#private` fields for real internal state; the old underscore convention offered no actual protection at all.
- A class field defined as an arrow function is usually the cleanest way to hand a method to `addEventListener` or a callback prop without worrying about `this`.

## Resources

- MDN, Classes: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes>
- MDN, Using classes (Guide): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_classes>
- MDN, Private properties: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties>

## Practice / Exercises

- Build a small two-level class hierarchy (`Shape` → `Rectangle`) with a `super.method()` call in the child, and a getter that computes area from the stored dimensions.
- Convert the `BankAccount` module-pattern example from the Closures topic into a class using a `#balance` private field, and confirm accessing `account.#balance` from outside throws.

## Code Example

See [`12-classes-oop.js`](./12-classes-oop.js) in this folder.

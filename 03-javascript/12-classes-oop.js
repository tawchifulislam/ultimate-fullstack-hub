// Demo 1: basic class, and calling without `new` throws
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return `${this.name} makes a sound`;
  }
}
const genericAnimal = new Animal('Generic');
console.log('genericAnimal.speak():', genericAnimal.speak());

try {
  Animal('NoNew');
} catch (err) {
  console.log('calling a class without new threw:', err.constructor.name);
}

// Demo 2: class declarations are not hoisted, TDZ like let/const
function tdzDemo() {
  try {
    new NotYetDeclared();
  } catch (err) {
    console.log(
      '\nusing a class before its declaration threw:',
      err.constructor.name,
    );
  }
  class NotYetDeclared {}
}
tdzDemo();

// Demo 3: extends and super
class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }
  speak() {
    return `${super.speak()} (specifically, a bark)`;
  }
}
const dog = new Dog('Rex', 'Labrador');
console.log('\ndog.speak():', dog.speak());
console.log('dog instanceof Animal:', dog instanceof Animal);
console.log('dog instanceof Dog:', dog instanceof Dog);

// Demo 4: getters and setters
class Circle {
  constructor(radius) {
    this.radius = radius;
  }
  get area() {
    return Math.PI * this.radius ** 2;
  }
  set diameter(d) {
    this.radius = d / 2;
  }
}
const circle = new Circle(5);
console.log('\ncircle.area (getter, no parens):', circle.area.toFixed(2));
circle.diameter = 10;
console.log('after circle.diameter = 10, radius:', circle.radius);

// Demo 5: static members
class Counter {
  static count = 0;
  constructor() {
    Counter.count++;
  }
  static reset() {
    Counter.count = 0;
  }
}
new Counter();
new Counter();
new Counter();
console.log('\nCounter.count after 3 instances:', Counter.count);
Counter.reset();
console.log('Counter.count after reset():', Counter.count);

// Demo 6: private fields, real enforcement, not just convention
class BankAccount {
  #balance = 0;
  constructor(initial) {
    this.#balance = initial;
  }
  deposit(amount) {
    this.#balance += amount;
    return this.#balance;
  }
  get balance() {
    return this.#balance;
  }
}
const account = new BankAccount(100);
console.log('\naccount.deposit(50):', account.deposit(50));
console.log('account.balance (via getter):', account.balance);
console.log('account.#balance directly:', account['#balance']); // undefined, not the real private field

// accessing a private field from outside is an early SyntaxError, not a
// normal runtime error, so it must be demonstrated through eval() to keep
// it from breaking this whole file at parse time.
try {
  eval('account.#balance');
} catch (err) {
  console.log('accessing #balance from outside threw:', err.constructor.name);
}

// Demo 7: class field arrow function, fixes "losing this" automatically
class Widget {
  count = 0;
  onClick = () => {
    this.count++;
  };
}
const widget = new Widget();
const detachedOnClick = widget.onClick; // extracted, just like a lost method
detachedOnClick();
detachedOnClick();
console.log('\nwidget.count after two detached onClick() calls:', widget.count);

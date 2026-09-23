// Demo 1: this binding, regular function vs arrow function
const counterBroken = {
  count: 0,
  incrementLater() {
    setTimeout(function () {
      // regular function: `this` is not `counterBroken` here (undefined in strict mode/modules)
      console.log(
        'regular function this is counterBroken?',
        this === counterBroken,
      );
    }, 0);
  },
};

const counterFixed = {
  count: 0,
  incrementLater() {
    setTimeout(() => {
      // arrow function: inherits `this` from incrementLater's scope, which IS counterFixed
      console.log(
        'arrow function this is counterFixed?',
        this === counterFixed,
      );
    }, 0);
  },
};

counterBroken.incrementLater();
counterFixed.incrementLater();

// Demo 2: arguments object, regular function has it, arrow function does not
function regularArgsDemo() {
  console.log(
    'regular function arguments:',
    arguments.length,
    Array.from(arguments),
  );
}
regularArgsDemo(1, 2, 3);

function outerWithArrow() {
  const inner = () => {
    // no own `arguments`, this refers to outerWithArrow's arguments
    console.log('arrow inherits enclosing arguments:', arguments.length);
  };
  inner();
}
outerWithArrow('a', 'b');

// Demo 3: arrow functions cannot be constructors
const NotAConstructor = () => {};
try {
  new NotAConstructor();
} catch (err) {
  console.log('new on an arrow function threw:', err.constructor.name);
}

// Demo 4: implicit return
const double = x => x * 2;
console.log('implicit return, double(5):', double(5));

const doubleExplicit = x => {
  return x * 2;
};
console.log('explicit return, doubleExplicit(5):', doubleExplicit(5));

// Demo 5: default, rest, and destructured parameters
function greet(name = 'friend') {
  return `Hello, ${name}!`;
}
console.log(greet());
console.log(greet('Ada'));

function sum(...numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}
console.log('sum(1, 2, 3, 4):', sum(1, 2, 3, 4));

function describePerson({ name, age }) {
  return `${name} is ${age} years old`;
}
console.log(describePerson({ name: 'Grace', age: 30 }));

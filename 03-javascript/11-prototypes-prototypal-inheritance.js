// Demo 1: Object.create() and walking the prototype chain
const animal = {
  speak() {
    return `${this.name} makes a sound`;
  },
};
const dog = Object.create(animal);
dog.name = 'Rex';
console.log('dog.speak():', dog.speak());
console.log(
  'Object.getPrototypeOf(dog) === animal:',
  Object.getPrototypeOf(dog) === animal,
);

// Demo 2: constructor function + .prototype, the pre-class pattern
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return `${this.name} makes a sound`;
};
const cat = new Animal('Whiskers');
console.log('\ncat.speak():', cat.speak());
console.log("cat has its own 'speak' property?", Object.hasOwn(cat, 'speak'));
console.log(
  "Animal.prototype has 'speak'?",
  Object.hasOwn(Animal.prototype, 'speak'),
);

// Demo 3: own vs inherited properties
const parent = { inherited: true };
const child = Object.create(parent);
child.own = true;

console.log("\nObject.hasOwn(child, 'own'):", Object.hasOwn(child, 'own'));
console.log(
  "Object.hasOwn(child, 'inherited'):",
  Object.hasOwn(child, 'inherited'),
);
console.log("'inherited' in child:", 'inherited' in child); // true, walks the chain

// Demo 4: for...in walks the chain, Object.keys() does not
console.log('\nfor...in over child (includes inherited):');
for (const key in child) {
  console.log(' ', key);
}
console.log('Object.keys(child) (own properties only):', Object.keys(child));

// Demo 5: a shared prototype method affects every existing instance at once
Animal.prototype.describe = function () {
  return `I am ${this.name}`;
};
console.log('\ncat.describe(), added after cat was created:', cat.describe());

const secondCat = new Animal('Tom');
console.log('secondCat.describe() works too:', secondCat.describe());

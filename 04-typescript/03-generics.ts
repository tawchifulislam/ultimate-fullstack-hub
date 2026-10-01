// Demo 1: a generic preserves the real type, unlike any
function identity<T>(value: T): T {
  return value;
}
console.log('identity<string>:', identity<string>('hello'));
console.log('identity, inferred number:', identity(42));

function identityAny(value: any): any {
  return value;
}
const resultAny = identityAny('hello');
console.log(
  'any lets anything through, even wrong method calls:',
  typeof resultAny.toFixed,
); // undefined, would crash if actually called

const result = identity('hello');
console.log(
  'generic correctly knows result is a string:',
  result.toUpperCase(),
);
// result.toFixed(2); // would NOT compile: Property 'toFixed' does not exist on type 'string'

// Demo 2: generic constraints
function getLength<T extends { length: number }>(item: T): number {
  return item.length;
}
console.log("\ngetLength('hello'):", getLength('hello'));
console.log('getLength([1,2,3]):', getLength([1, 2, 3]));
// getLength(42); // would NOT compile: number has no .length

// Demo 3: multiple type parameters
function makePair<A, B>(first: A, second: B): [A, B] {
  return [first, second];
}
console.log("\nmakePair('Ada', 30):", makePair('Ada', 30));

// Demo 4: generic interface and generic class
interface Box<T> {
  contents: T;
}
const stringBox: Box<string> = { contents: 'hello' };
const numberBox: Box<number> = { contents: 42 };
console.log('\nstringBox, numberBox:', stringBox, numberBox);

class Stack<T> {
  private items: T[] = [];
  push(item: T): void {
    this.items.push(item);
  }
  pop(): T | undefined {
    return this.items.pop();
  }
  get size(): number {
    return this.items.length;
  }
}
const numberStack = new Stack<number>();
numberStack.push(1);
numberStack.push(2);
console.log('numberStack.size:', numberStack.size, 'pop():', numberStack.pop());

// Demo 5: keyof combined with a generic
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const person = { personName: 'Ada', age: 30 };
console.log(
  "\ngetProperty(person, 'personName'):",
  getProperty(person, 'personName'),
);
console.log("getProperty(person, 'age'):", getProperty(person, 'age'));
// getProperty(person, "invalid"); // would NOT compile: "invalid" is not keyof person

// Demo 1: array destructuring, skipping, defaults, and swap
const [first, second] = [1, 2, 3];
console.log('first, second:', first, second);

const [, , third] = [1, 2, 3];
console.log('third (skipped first two):', third);

const [head, ...tail] = [1, 2, 3, 4];
console.log('head:', head, 'tail:', tail);

const [x = 10] = [];
console.log('x with default:', x);

let a = 1,
  b = 2;
[a, b] = [b, a];
console.log('swapped a, b:', a, b);

// Demo 2: object destructuring, renaming, nested
const person = { name: 'Ada', age: 30, address: { city: 'London' } };
const { name, age } = person;
const { name: fullName } = person;
const { role = 'guest' } = person;
const {
  address: { city },
} = person;
console.log('\nname/age:', name, age);
console.log('renamed fullName:', fullName);
console.log('default role:', role);
console.log('nested city:', city);

// Demo 3: default applies to undefined, NOT to null
const { c = 2 } = { c: null };
const { d = 2 } = { d: undefined };
const { e = 2 } = {}; // missing entirely
console.log('\nc (was null, default skipped):', c);
console.log('d (was undefined, default used):', d);
console.log('e (was missing, default used):', e);

// Demo 4: destructured function parameters
function greet({ name, age = 18 }) {
  return `${name}, age ${age}`;
}
console.log('\n' + greet({ name: 'Grace' }));
console.log(greet({ name: 'Sam', age: 25 }));

// Demo 5: spread, expanding
const arr1 = [1, 2];
const arr2 = [3, 4];
console.log('\nspread concat:', [...arr1, ...arr2]);
console.log('Math.max via spread:', Math.max(...[5, 12, 3]));
console.log('string spread into chars:', [...'hi!']);

const obj1 = { theme: 'light', size: 14 };
const obj2 = { size: 18 };
console.log('spread merge, later wins:', { ...obj1, ...obj2 });

// Demo 6: rest, collecting
function sum(...nums) {
  return nums.reduce((total, n) => total + n, 0);
}
console.log('\nsum(...):', sum(1, 2, 3, 4));

const user = { id: 1, name: 'Ada', role: 'admin' };
const { id, ...otherFields } = user;
console.log('id:', id, 'otherFields:', otherFields);

// Demo 7: rest must be last, this throws a SyntaxError if written directly,
// so it's demonstrated here via eval to catch it as a string instead of
// breaking this whole file.
try {
  eval('const [p, ...q, r] = [1, 2, 3];');
} catch (err) {
  console.log('\nrest not last threw:', err.constructor.name);
}

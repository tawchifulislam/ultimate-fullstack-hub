// Demo 1: type aliases can name any kind of type
type Point = { x: number; y: number };
type ID = string | number;
type Pair = [string, number];
type Formatter = (value: number) => string;

const originPoint: Point = { x: 0, y: 0 };
const userId: ID = 42;
const pair: Pair = ['Ada', 30];
const format: Formatter = value => `$${value.toFixed(2)}`;
console.log(
  'originPoint, userId, pair, format(9):',
  originPoint,
  userId,
  pair,
  format(9),
);

// Demo 2: declaration merging, interface-only
interface Config {
  name: string;
}
interface Config {
  version: number; // merges with the declaration above automatically
}
const config: Config = { name: 'demo-app', version: 2 };
console.log('merged Config has both properties:', config);

// Demo 3: extends (interface) vs intersection (type alias), same resulting shape
interface Animal {
  animalName: string;
}
interface Dog extends Animal {
  breed: string;
}
const dog: Dog = { animalName: 'Rex', breed: 'Labrador' };

type Animal2 = { animalName: string };
type Dog2 = Animal2 & { breed: string };
const dog2: Dog2 = { animalName: 'Fido', breed: 'Poodle' };
console.log('extends-based dog, intersection-based dog2:', dog, dog2);

// Demo 4: optional and readonly properties
interface User {
  id: number;
  userName: string;
  email?: string;
  readonly createdAt: Date;
}
const user: User = {
  id: 1,
  userName: 'Ada',
  createdAt: new Date('2026-01-01'),
};
console.log('user without optional email:', user);
// user.createdAt = new Date(); // would NOT compile: readonly property

// Demo 5: index signature
interface StringDictionary {
  [key: string]: string;
}
const colors: StringDictionary = { primary: 'blue', secondary: 'green' };
colors.accent = 'orange'; // any new string key is allowed
console.log('index-signature object:', colors);

// Demo 6: a class implementing an interface
class Circle implements Point {
  x = 0;
  y = 0;
  radius: number;
  constructor(radius: number) {
    this.radius = radius;
  }
}
const circle = new Circle(5);
console.log('class implementing an interface:', circle);

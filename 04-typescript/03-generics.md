# Generics

**Topic 41 of 89** (Section: TypeScript, 3 of 4)

## Notes

### The problem generics solve

Without generics, a function either needs a separate copy written for every type it should support, or it falls back to `any` and loses type checking entirely. A generic lets a function, class, or interface be written once and work with many types, while the actual type used is determined at the call site, not baked into the definition.

```ts
function identity<T>(value: T): T {
  return value;
}
identity<string>("hello"); // T explicitly specified
identity(42);              // T inferred as number, no annotation needed
```

### Why this beats any

```ts
function identityAny(value: any): any {
  return value;
}
const resultAny = identityAny("hello");
resultAny.toFixed(2); // no error at all, any throws away every bit of type information

const result = identity("hello");
result.toFixed(2); // compile error: Property 'toFixed' does not exist on type 'string'
```

`any` and a generic can look similarly flexible at the call site, but a generic preserves the actual type all the way through the function, so a genuine mistake like this is still caught; `any` would let it through and fail at runtime instead.

### Generic constraints

```ts
function getLength<T extends { length: number }>(item: T): number {
  return item.length;
}
getLength("hello");    // fine, strings have .length
getLength([1, 2, 3]);  // fine, arrays have .length
getLength(42);         // compile error: number has no .length
```

`extends` here means "T must have at least this shape," it has nothing to do with class inheritance despite reusing the same keyword.

### Multiple type parameters

```ts
function pair<A, B>(first: A, second: B): [A, B] {
  return [first, second];
}
pair("Ada", 30); // A = string, B = number, both inferred
```

### Generic interfaces and classes

```ts
interface Box<T> {
  contents: T;
}
const stringBox: Box<string> = { contents: "hello" };

class Stack<T> {
  private items: T[] = [];
  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
}
const numberStack = new Stack<number>();
```

### keyof combined with a generic: a genuinely useful pattern

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const person = { personName: "Ada", age: 30 };
getProperty(person, "age");        // inferred as number
getProperty(person, "invalid");    // compile error: "invalid" is not a key of person
```

`K extends keyof T` constrains the second parameter to only the actual property names of `T`, so asking for a key that doesn't exist is caught at compile time, and the return type is automatically inferred to match whichever key was actually passed. This is one of the single most useful generic patterns in everyday TypeScript, it is exactly how safe "get a property by name" utilities and `Pick`/`Omit`-style utility types work underneath.

### Practical tips

- Reach for a generic the moment a function's logic doesn't actually depend on the specific type, only on some shape or behavior it needs (like `.length`); that is the exact signal where `any` would quietly throw away information a generic can preserve instead.
- A generic constraint restricts what callers can pass in; it does not change what the function can do with the value beyond what the constraint guarantees.
- `K extends keyof T` is the standard way to write a type-safe "access a property by name" function; reach for it whenever a function's second argument is meant to be one of an object's own keys.

## Resources

- TypeScript Handbook, Generics: <https://www.typescriptlang.org/docs/handbook/2/generics.html>
- TypeScript Handbook, keyof Type Operator: <https://www.typescriptlang.org/docs/handbook/2/keyof-types.html>
- TypeScript Handbook, Generic Classes: <https://www.typescriptlang.org/docs/handbook/2/classes.html#generic-classes>

## Practice / Exercises

- Write a generic `firstElement<T>(arr: T[]): T | undefined` function, call it with an array of numbers and an array of strings, and confirm the return type matches each call correctly.
- Write a `getProperty<T, K extends keyof T>` function, then try calling it with a key that doesn't exist on the object and read the resulting compiler error.

## Code Example

See [`03-generics.ts`](./03-generics.ts) in this folder.

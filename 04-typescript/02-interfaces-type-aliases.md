# Interfaces & Type Aliases

**Topic 40 of 89** (Section: TypeScript, 2 of 4)

## Notes

### Type aliases: a name for any type

```ts
type Point = { x: number; y: number }; // an object shape
type ID = string | number;             // a union
type Pair = [string, number];          // a tuple
type Formatter = (value: number) => string; // a function type
```

A `type` alias can name any type expression at all, not just an object shape.

### Interfaces: specifically for object and function shapes

```ts
interface Point {
  x: number;
  y: number;
}
```

An interface always introduces a named object type. It cannot alias a union, a tuple, or a primitive directly, only `type` can do that.

### The one feature only interfaces have: declaration merging

```ts
interface Window {
  myCustomProperty: string;
}
interface Window {
  anotherProperty: number;
}
// TypeScript merges these automatically: Window now has both properties
```

Two interfaces with the same name in the same scope merge into one combined interface automatically. Redeclaring a `type` alias with the same name, by contrast, is a compile error. Declaration merging is exactly how the ecosystem extends types it doesn't own, adding custom properties to the global `Window`, or augmenting a library's `Request` type with fields a project's own middleware adds.

### Extending: extends vs intersection

```ts
interface Animal { name: string; }
interface Dog extends Animal { breed: string; } // an interface can extend one or several others

type Animal2 = { name: string };
type Dog2 = Animal2 & { breed: string }; // a type alias composes via intersection instead
```

Both end up describing the same resulting shape; interfaces use `extends`, type aliases use `&`.

### Optional and readonly properties

```ts
interface User {
  id: number;
  name: string;
  email?: string;           // optional: may be undefined
  readonly createdAt: Date; // can be set once, never reassigned afterward
}
```

Both of these work identically whether written with `interface` or as an object-shaped `type`.

### Index signatures

```ts
interface StringDictionary {
  [key: string]: string; // any string key maps to a string value
}
```

### Implementing in a class

```ts
class Circle implements Point {
  x = 0;
  y = 0;
  radius = 5;
}
```

A class can `implements` either an interface or an object-shaped type alias, both work the same way for this purpose; using `interface` for anything meant to be implemented by a class is simply the more common convention.

### Which one to actually use

The current official TypeScript Handbook deliberately avoids giving a firm rule, both are actively maintained and mostly interchangeable for describing plain object shapes. The practical guidance that holds up: reach for `interface` specifically when declaration merging matters (library and global-type augmentation, or object shapes meant to be extended or implemented by classes), and reach for `type` for anything an interface structurally cannot express at all, unions, tuples, primitive aliases, and function types. For everyday internal application code, consistency within a codebase matters more than which one is picked.

## Resources

- TypeScript Handbook, Everyday Types: <https://www.typescriptlang.org/docs/handbook/2/everyday-types.html>
- TypeScript Handbook, Object Types: <https://www.typescriptlang.org/docs/handbook/2/objects.html>
- TypeScript Handbook, Declaration Merging: <https://www.typescriptlang.org/docs/handbook/declaration-merging.html>

## Practice / Exercises

- Declare the same interface name twice in one file with different properties each time, and confirm an object needs properties from both to satisfy it.
- Model the same "success or error result" shape two ways, once as two interfaces joined with a type alias union, and once entirely with type aliases, and compare how each reads.

## Code Example

See [`02-interfaces-type-aliases.ts`](./02-interfaces-type-aliases.ts) in this folder.

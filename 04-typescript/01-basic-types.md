# Basic Types

**Topic 39 of 89** (Section: TypeScript, 1 of 4)

## Notes

### What is TypeScript?

TypeScript is a statically-typed superset of JavaScript: it adds a type system checked while writing and compiling code, then compiles down to plain JavaScript that runs anywhere JavaScript already runs. Types themselves do not exist at runtime, they are checked at compile time and then erased entirely ("type erasure"), so a type error is always something caught before the code runs, never something a running program can inspect or recover from.

### Primitive types

```ts
let age: number = 30;
let name: string = "Ada";
let isActive: boolean = true;
let missing: undefined = undefined;
let empty: null = null;
```

### Type inference

TypeScript infers a variable's type automatically from its initial value, an explicit annotation is often unnecessary:

```ts
let age = 30; // inferred as number, no annotation needed
```

The common rule of thumb: let inference handle simple local variables, and reserve explicit annotations for function parameters, return types, and the genuinely ambiguous cases inference can't resolve on its own (an empty array, for instance).

### Arrays and tuples

```ts
let numbers: number[] = [1, 2, 3];
let names: Array<string> = ["Ada", "Grace"]; // equivalent generic syntax
let pair: [string, number] = ["Ada", 30];     // a tuple: fixed length, fixed type per position
```

### any vs unknown

- **`any`** turns off type checking entirely for that value. Properties and methods can be accessed on it freely, even ones that don't exist, TypeScript will not check their existence or type at all. This defeats much of the point of using TypeScript when overused.
- **`unknown`** is the type-safe counterpart to `any`: it can hold any value, but TypeScript refuses to let anything be done with it (no property access, no method calls) until the code has actually narrowed it to a more specific type first, with a `typeof` check or similar.

```ts
let a: any = "hello";
a.toUpperCase(); // allowed, unchecked, could crash at runtime if a isn't really a string

let u: unknown = "hello";
u.toUpperCase(); // compile error: must narrow u's type first
if (typeof u === "string") {
  u.toUpperCase(); // fine now, TypeScript knows u is a string here
}
```

### void and never

- **`void`** is the inferred return type of a function with no `return` statement (or a bare `return;`). The function still actually returns `undefined` at runtime; `void` just means that return value isn't meant to be used.
- **`never`** represents a function that never returns normally at all, it always throws, or never finishes (an infinite loop). `never` is TypeScript's "bottom type": it is a subtype of every other type, but nothing, not even `any`, can be assigned to a `never`-typed location except `never` itself.

```ts
function logMessage(): void {
  console.log("hi"); // implicitly returns undefined
}

function fail(message: string): never {
  throw new Error(message); // never returns at all
}
```

### Union and literal types

```ts
let id: string | number;              // can hold EITHER type
let status: "pending" | "active" | "done"; // a literal type union: only these exact strings are allowed
```

### Type assertions

```ts
let someValue: unknown = "hello";
let strLength = (someValue as string).length;
```

A type assertion tells the compiler "trust me, treat this as this type," it performs no actual runtime check or conversion. If the asserted type is wrong, this produces a real bug that TypeScript will not catch, the opposite of what type checking is supposed to prevent.

### Practical tips

- Avoid `any` wherever possible; reach for `unknown` plus a proper narrowing check whenever a value's type genuinely isn't known ahead of time (an API response, user input).
- Let inference do the work for ordinary local variables; annotate function signatures explicitly, since inference can't see how a function will be called from outside it.
- Remember type erasure: TypeScript's checks exist only at compile time, so validating data that actually arrives at runtime, an API response, a form submission, still requires real runtime code. Types alone never protect against bad data coming from outside the program.

## Resources

- TypeScript Handbook, Everyday Types: <https://www.typescriptlang.org/docs/handbook/2/everyday-types.html>
- TypeScript Handbook, More on Functions (void, never): <https://www.typescriptlang.org/docs/handbook/2/functions.html>
- TypeScript Handbook, Narrowing: <https://www.typescriptlang.org/docs/handbook/2/narrowing.html>

## Practice / Exercises

- Write a function that accepts an `unknown` parameter and safely returns its length if it's a string or array, and `0` otherwise, using `typeof`/`Array.isArray` narrowing.
- Declare a variable with a literal union type (like an order status), then try assigning it a string outside that union and read the resulting compiler error closely.

## Code Example

See [`01-basic-types.ts`](./01-basic-types.ts) in this folder.

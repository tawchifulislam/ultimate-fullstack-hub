# Utility Types

**Topic 42 of 89** (Section: TypeScript, 4 of 4)

## Notes

### What utility types are

Utility types are built-in generics that transform an existing type into a new one, without manually rewriting its shape by hand. They keep one type as the single source of truth and derive narrower or wider variants from it, which is far more maintainable than hand-writing several separate interfaces that can quietly drift out of sync with each other.

### `Partial<T>` and `Required<T>`

```ts
interface User {
  id: number;
  userName: string;
  email: string;
}

function updateUser(id: number, updates: Partial<User>) { /* ... */ }
updateUser(1, { email: "new@example.com" }); // only the changed fields are needed
```

`Partial<T>` makes every property optional; `Required<T>` does the opposite, stripping away any `?` so every property must be present. A real gotcha with `Partial`: a function typed to take `Partial<Config>` will happily accept `{}`, even if the function's own logic actually needs a couple of those fields to run correctly, nothing catches that mismatch at compile time, it only shows up as a runtime crash. The fix is combining utility types rather than reaching for `Partial` on everything: `Pick<Config, "apiKey"> & Partial<Omit<Config, "apiKey">>` keeps the genuinely required fields required while making the rest optional.

### `Readonly<T>`

```ts
type ImmutableUser = Readonly<User>;
```

Makes every property read-only, the same as writing `readonly` by hand on each one. Like `Object.freeze`, this is shallow: a nested object inside is not automatically made read-only itself.

### `Pick<T, K>` and `Omit<T, K>`

```ts
type UserPreview = Pick<User, "id" | "userName">;   // only these two properties
type UserWithoutEmail = Omit<User, "email">;         // every property except this one
```

`Pick` builds a type from a chosen subset of keys; `Omit` builds one from everything except the chosen keys. A simple rule of thumb: reach for `Pick` when selecting fewer than half of a type's properties, and `Omit` when excluding fewer than half, whichever one requires listing fewer keys tends to read more clearly and stay correct as the base type grows.

### `Record<K, T>`

```ts
type StatusMessages = Record<"success" | "error" | "loading", string>;
const messages: StatusMessages = {
  success: "Done!",
  error: "Something went wrong",
  loading: "Working on it...",
};
```

`Record` builds an object type whose keys are `K` and whose values are all `T`. With a literal union as `K`, as above, every one of those exact keys is required, missing one is a compile error, which makes `Record` a strong fit for lookup tables and fixed sets of messages or configuration keyed by a known set of names.

### `Exclude<T, U>` and `Extract<T, U>`

These two work on union types, not object shapes.

```ts
type Status = "pending" | "active" | "done" | "archived";
type ActiveStatus = Exclude<Status, "archived">;              // "pending" | "active" | "done"
type FinishedStatus = Extract<Status, "done" | "archived">;   // "done" | "archived"
```

`Exclude` removes the listed members from a union; `Extract` keeps only the listed members, the two are opposites, same as `Omit` and `Pick` but for unions instead of object properties.

### `NonNullable<T>`

```ts
type MaybeId = string | number | null | undefined;
type DefiniteId = NonNullable<MaybeId>; // string | number
```

Strips `null` and `undefined` out of a type. It is, in fact, defined in terms of `Exclude` itself: `NonNullable<T>` is just `Exclude<T, null | undefined>`.

### `ReturnType<T>` and `Parameters<T>`

```ts
function createUser() {
  return { id: 1, userName: "Ada" };
}
type CreatedUser = ReturnType<typeof createUser>; // { id: number; userName: string }
type CreateUserArgs = Parameters<typeof createUser>; // []
```

`ReturnType` extracts a function's return type without calling it; `Parameters` extracts its parameter types as a tuple. Both are especially useful for deriving a type from a function whose own return shape already exists in code, rather than hand-writing a second, duplicate interface that can drift out of sync with the function it's supposed to describe.

### Practical tips

- Derive narrower types from one canonical interface with `Pick`/`Omit`/`Partial` rather than writing several separate, overlapping interfaces by hand.
- `ReturnType<typeof someFunction>` is a quick way to reuse an inferred shape elsewhere instead of duplicating it.
- Watch for the `Partial` gotcha above: a function's parameter type being valid doesn't guarantee the function's actual logic has everything it needs, `Partial` only ever describes shape, never which combinations of fields are sensible together.

## Resources

- TypeScript Handbook, Utility Types: <https://www.typescriptlang.org/docs/handbook/utility-types.html>
- TypeScript Handbook, Record: <https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type>
- TypeScript Handbook, ReturnType: <https://www.typescriptlang.org/docs/handbook/utility-types.html#returntypetype>

## Practice / Exercises

- Starting from one `interface Product`, derive a `ProductPreview` with `Pick`, a `ProductUpdate` with `Partial<Omit<...>>`, and a `Record` keyed by product category, all from that single source interface.
- Write a function with an inferred, non-trivial return type, then use `ReturnType<typeof yourFunction>` elsewhere instead of writing a matching interface by hand, and confirm they stay in sync when the function changes.

## Code Example

See [`04-utility-types.ts`](./04-utility-types.ts) in this folder.

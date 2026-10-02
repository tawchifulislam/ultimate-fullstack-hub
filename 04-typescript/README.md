# 4. TypeScript

This is the fourth section of the Full Stack Skill Roadmap: four topics covering TypeScript's type system on top of the JavaScript already covered. TypeScript adds no new runtime behavior of its own, every type is checked at compile time and then erased entirely, so this section is really about catching mistakes before the code ever runs, not about learning a different language.

## Topics in this section

| # | Topic | What it covers | Files |
| --- | ------- | ----------------- | ------- |
| 1 | Basic Types | Primitives, inference, `any` vs `unknown`, `void`/`never`, unions, and type assertions. | [Notes](./01-basic-types.md) &middot; [Code](./01-basic-types.ts) |
| 2 | Interfaces & Type Aliases | Object shapes two ways, declaration merging, `extends` vs intersection, optional/readonly fields. | [Notes](./02-interfaces-type-aliases.md) &middot; [Code](./02-interfaces-type-aliases.ts) |
| 3 | Generics | Writing a function once for many types without losing type information, constraints, and `keyof`. | [Notes](./03-generics.md) &middot; [Code](./03-generics.ts) |
| 4 | Utility Types | `Partial`/`Required`/`Readonly`, `Pick`/`Omit`, `Record`, `Exclude`/`Extract`, `ReturnType`. | [Notes](./04-utility-types.md) &middot; [Code](./04-utility-types.ts) |

## How the section fits together

Basic types (Topic 1) establish the vocabulary everything else is built from: what a type actually is, and the critical distinction between `any` (opts out of checking) and `unknown` (stays safe but demands a check first). Interfaces and type aliases (Topic 2) are the two ways to name a shape built from those basic types, so an API doesn't have to be re-described inline every time it's used. Generics (Topic 3) solve the next problem that creates: writing one function or type that works across many shapes without collapsing back into `any` and losing everything interfaces and type aliases were protecting. Utility types (Topic 4) are the payoff, a set of built-in generics (mostly generic over the interfaces and type aliases from Topic 2) that derive new shapes from one canonical type instead of hand-duplicating it, which is exactly the kind of reuse generics in Topic 3 make possible.

## How each topic is structured

Every topic has two files: an explanation (`.md`) and a matching `.ts` code example. Every code example in this section was compiled with `tsc --strict` and run with Node to confirm its output, and every claim about code that *shouldn't* compile was separately verified by compiling that broken snippet and checking the exact error code TypeScript reports.

## Suggested capstone exercise

Model a small "blog post" domain end to end: one canonical `Post` interface (title, body, authorId, published, createdAt), a generic `ApiResponse<T>` type wrapping any successful payload, a `PostPreview` derived with `Pick`, a `PostUpdate` derived by combining `Pick` (for whichever fields must stay required) and `Partial` (for the rest), and a generic `getField<T, K extends keyof T>` helper to read any field off a `Post` in a fully type-safe way.

## Previous section

[JavaScript](../03-javascript/README.md)

## Next section

[React](../05-react/README.md)

[Back to main roadmap](../README.md)

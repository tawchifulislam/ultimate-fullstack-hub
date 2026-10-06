# Server Components vs Client Components

**Topic 62 of 89** (Section: Next.js, 2 of 10)

## Notes

Topic 61 introduced the basic rule: every component in the App Router is a Server Component by default, and adding `"use client"` to a file turns it (and everything it imports) into a Client Component. This topic goes further, into how the two are meant to be composed together, what can and cannot cross the boundary between them, and how to make a violation of either rule fail loudly at build time instead of quietly at runtime.

### Enforcing the boundary with server-only and client-only

Relying on memory to keep server-only code out of Client Components does not scale. The `server-only` package (and its counterpart, `client-only`) turns that rule into an actual build error. Importing `"server-only"` at the top of a module marks it as never allowed to be pulled into client-side code:

```ts
import "server-only";

const API_SECRET = "sk_live_51AbCdEfGh";

export function getMaskedSecret(): string {
  return API_SECRET.slice(0, 7) + "...";
}
```

A plain Server Component (`app/page.tsx` in this project) can import and call `getMaskedSecret()` normally, and the build succeeds. Importing the same function from a file marked `"use client"` fails immediately:

```text
Error: You're importing a module that depends on "server-only" into a React
Server Component module. This API is only available in Server Components but
one of its parents is marked with "use client", so this module is also a
Client Component.

Error: 'server-only' cannot be imported from a Client Component module
It should only be used from a Server Component.
```

`client-only` enforces the opposite direction. `app/client-lib/browser-fact.tsx` reads `document.title`, something that only exists in a real browser:

```ts
import "client-only";

export function getPageTitleFromDocument(): string {
  return document.title;
}
```

Importing this into a Server Component (no `"use client"` anywhere above it) fails just as clearly:

```text
Error: You're importing a component that imports client-only. It only works
in a Client Component but none of its parents are marked with "use client",
so they're Server Components by default.

Error: 'client-only' cannot be imported from a Server Component module
It should only be used from a Client Component.
```

Without this package, the same mistake would not fail until the code actually ran, `document is not defined` during server rendering, a much more confusing error to track back to its cause.

### Composing them: the children slot pattern

A Client Component is allowed to render a Server Component, but not by importing it directly, once a file is marked `"use client"`, everything it imports becomes part of that same Client Component. The supported pattern is to let a Server Component render the Client Component and pass the Server Component content in as `children`, which Next.js renders on the server first and hands down as already-finished output:

```tsx
// CompositionDemoPage: a Server Component
<Disclosure>
  <ServerFact />
</Disclosure>
```

`Disclosure` (the Client Component) never imports `ServerFact`, it only declares a `children` prop and renders whatever it is given. `ServerFact` keeps using the server-only secret helper, completely unaware that it ends up visually nested inside an interactive, client-rendered wrapper.

This was confirmed against the compiled output, not just asserted. After building this project, searching every client-side JavaScript file under `.next/static/` for `getMaskedSecret` (or the raw secret string) found no match anywhere, that code never left the server, even though `ServerFact`'s rendered text appears directly inside `Disclosure`'s DOM output. Searching the same files for `Disclosure`'s own button text found it immediately, since `Disclosure` really is shipped to the browser to handle its click events.

### What a Client Component can receive as a prop

Serializable values, strings, numbers, booleans, plain objects and arrays, pass from a Server Component to a Client Component as ordinary props without any issue. A function cannot, a Server Component runs only on the server, so there is no live function reference to hand to code that runs in the browser. Passing one directly fails at build time:

```tsx
// A Server Component trying to do this fails:
<ClientButton onClick={() => console.log("clicked")}>Click me</ClientButton>
```

```text
Error: Event handlers cannot be passed to Client Component props.
  {onClick: function onClick, children: ...}
If you need interactivity, consider converting part of this to a Client Component.
```

The fix is not to avoid passing functions altogether, it is to create the function inside a Client Component instead. `Disclosure` does exactly this: its toggle function is defined in `Disclosure` itself (a Client Component) and handed to `ClientButton` (another Client Component), which works without any error, confirmed by this project's actual passing build. The rule is about where a function is allowed to be created, not whether `ClientButton` can accept one at all.

## Resources

- Server and Client Components: <https://nextjs.org/docs/app/building-your-application/rendering/server-components>
- Composition patterns: <https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns>
- The server-only package: <https://www.npmjs.com/package/server-only>
- The client-only package: <https://www.npmjs.com/package/client-only>
- Passing props from Server to Client Components: <https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#passing-props-from-server-to-client-components-serialization>

## Practice

1. Add `import "server-only";` to a new helper file, call it from a Server Component (should work), then from a Client Component (should fail), and read the exact error Next.js gives.
2. Build a `Tabs` Client Component that takes `children` for its panel content, and pass it a Server Component that reads server-only data, the same pattern `Disclosure` and `ServerFact` demonstrate here.
3. Try passing a plain object (not a function) from a Server Component to a Client Component as a prop, and confirm it works without error.
4. Try passing a `Date` object or a class instance as a prop from a Server Component to a Client Component, and see what actually happens, it is a more subtle case than a plain object or a function.
5. Search this project's own `.next/static` output for a string that only appears in `ServerFact`, and confirm for yourself that it is absent, rather than taking the Notes' claim on faith.

## Code Example

Like Topic 61, this topic's example is a small Next.js project, since the subject is about how files and modules are allowed to depend on each other:

- [app/page.tsx](./02-server-components-vs-client-components/app/page.tsx)
- [app/lib/secret-data.tsx](./02-server-components-vs-client-components/app/lib/secret-data.tsx)
- [app/components/ServerFact.tsx](./02-server-components-vs-client-components/app/components/ServerFact.tsx)
- [app/components/Disclosure.tsx](./02-server-components-vs-client-components/app/components/Disclosure.tsx)
- [app/components/ClientButton.tsx](./02-server-components-vs-client-components/app/components/ClientButton.tsx)
- [app/composition-demo/page.tsx](./02-server-components-vs-client-components/app/composition-demo/page.tsx)
- [app/client-lib/browser-fact.tsx](./02-server-components-vs-client-components/app/client-lib/browser-fact.tsx)
- [app/page-title/page.tsx](./02-server-components-vs-client-components/app/page-title/page.tsx)

To run it yourself: install `next`, `react`, `react-dom`, `server-only`, and `client-only` in a project containing this `app/` folder at its root, then run `npx next build` to see it succeed, or `npx next dev` to browse `/` and `/composition-demo` and `/page-title` live.

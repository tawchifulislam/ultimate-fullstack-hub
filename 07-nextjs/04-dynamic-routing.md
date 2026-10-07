# Dynamic Routing

**Topic 64 of 89** (Section: Next.js, 4 of 10)

## Notes

### Project structure

This topic's example is six small files. Before anything else, here is what each one is for, so nothing below is a surprise:

```text
app/
  layout.tsx                  -> root layout (shared wrapper, from earlier topics)
  page.tsx                    -> "/", just a placeholder home page
  products/
    [id]/page.tsx              -> "/products/1", "/products/42", ... (dynamic segment)
    new/page.tsx                -> "/products/new" (an ordinary static route, on purpose)
  docs/
    [...slug]/page.tsx          -> "/docs/a", "/docs/a/b", ... (catch-all, needs >=1 segment)
  shop/
    [[...slug]]/page.tsx        -> "/shop", "/shop/a", "/shop/a/b", ... (optional catch-all)
```

Four routing patterns, four small pages, each one doing only what its name says. The rest of this topic walks through each folder in the order above.

### A single dynamic segment: [id]

A folder named `[id]` makes that part of the URL a variable instead of fixed text. `app/products/[id]/page.tsx` matches `/products/1`, `/products/42`, anything in that position, and the matched text is handed to the page as `params`.

In this version of Next.js, `params` is a `Promise`, not a plain object, and it has to be `await`ed before its fields can be read:

```tsx
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <h1>Product {id}</h1>;
}
```

This was not assumed, it was checked directly: writing the page the older, synchronous way (`params: { id: string }`, reading `params.id` with no `await`) still compiles without any TypeScript error, but at runtime it silently renders an empty value instead of the id, `<h1>Product </h1>` instead of `<h1>Product 1</h1>`. Nothing crashes, nothing warns, the page just quietly shows the wrong thing. Awaiting `params` is what actually fixes it, confirmed by fetching `/products/1` and `/products/42` and seeing the real id appear both times.

### A static segment wins over a dynamic one: products/new

`app/products/new/page.tsx` is a plain static route sitting right next to `app/products/[id]/page.tsx`. Visiting `/products/new` could, in principle, be read two ways: the static `new` page, or the dynamic `[id]` page with `id` set to the text `"new"`. Next.js does not treat this as a conflict (unlike two routers claiming the same path, covered in Topic 61), it resolves it automatically. Fetching `/products/new` returns the static page's own heading, "Create a new product", never "Product new", confirmed directly against the running build. The rule in general: a more specific, static path always wins over a dynamic one that could also match.

### A catch-all segment: [...slug]

`[...slug]`, with three dots, matches one or more path segments after it, bundled into an array. `app/docs/[...slug]/page.tsx` matches `/docs/a` (`slug = ["a"]`), `/docs/a/b/c` (`slug = ["a", "b", "c"]`), and so on. Fetching `/docs/a/b/c` confirms the full array arrives in order: "Segments: a / b / c".

A catch-all requires at least one segment. Fetching `/docs` itself, with nothing after it, returns a real 404, confirmed directly, there is no file that matches zero segments here.

### An optional catch-all segment: [[...slug]]

`[[...slug]]`, with an extra pair of brackets, is a catch-all that also matches zero segments. `app/shop/[[...slug]]/page.tsx` matches `/shop` itself (`slug` is `undefined`), as well as `/shop/a`, `/shop/a/b`, exactly like a regular catch-all for one or more segments. Both cases were checked: `/shop` renders "(none, this is the shop root)", and `/shop/shoes/red` renders "Segments: shoes / red".

The difference from a plain catch-all is exactly that zero-segment case, a catch-all alone would 404 on `/shop` the same way `[...slug]` 404s on `/docs`.

## Resources

- Dynamic Routes: <https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes>
- Route segment config and matching behavior: <https://nextjs.org/docs/app/building-your-application/routing>
- params and searchParams: <https://nextjs.org/docs/app/api-reference/file-conventions/page>

## Practice

1. Add `app/products/[id]/reviews/[reviewId]/page.tsx`, a dynamic segment nested inside another, and confirm `/products/1/reviews/9` resolves both ids correctly.
2. Remove `app/products/new/page.tsx` and confirm `/products/new` now falls through to the dynamic route, rendering "Product new".
3. Change `[...slug]` to `[[...slug]]` in the docs folder, rebuild, and confirm `/docs` now renders instead of 404ing.
4. Add a `generateStaticParams` function to `app/products/[id]/page.tsx` returning a few fixed ids, rebuild, and compare the route table's output for `/products/[id]` before and after.
5. Try awaiting `params` twice in the same component and confirm this works fine, a Promise can be awaited more than once.

## Code Example

- [app/layout.tsx](./04-dynamic-routing/app/layout.tsx)
- [app/page.tsx](./04-dynamic-routing/app/page.tsx)
- [app/products/\[id\]/page.tsx](./04-dynamic-routing/app/products/%5Bid%5D/page.tsx)
- [app/products/new/page.tsx](./04-dynamic-routing/app/products/new/page.tsx)
- [app/docs/\[...slug\]/page.tsx](./04-dynamic-routing/app/docs/%5B...slug%5D/page.tsx)
- [app/shop/\[\[...slug\]\]/page.tsx](./04-dynamic-routing/app/shop/%5B%5B...slug%5D%5D/page.tsx)

To run it yourself: install `next`, `react`, and `react-dom` in a project containing this `app/` folder at its root, then run `npx next dev` and visit `/products/1`, `/products/new`, `/docs/a/b/c`, `/docs`, `/shop`, and `/shop/a/b` to see each case.

# Data Fetching (SSR, SSG, ISR)

**Topic 65 of 89** (Section: Next.js, 5 of 10)

## Notes

### Project structure

```text
app/
  layout.tsx            -> root layout (shared wrapper, from earlier topics)
  page.tsx               -> "/", just a placeholder home page
  static-page/page.tsx    -> "/static-page" (SSG: rendered once, at build time)
  dynamic-page/page.tsx   -> "/dynamic-page" (SSR: rendered fresh on every request)
  isr-page/page.tsx       -> "/isr-page" (ISR: static, but regenerated after 5 seconds)
```

Three pages, three rendering strategies, same idea in each one: render a timestamp and see exactly when Next.js actually ran that code.

### Static rendering (SSG): rendered once, at build time

`app/static-page/page.tsx` uses nothing request-specific, no `headers()`, no `cookies()`, no `searchParams`. With nothing forcing it to wait for a request, Next.js renders it once, during `next build`, and serves that exact same HTML to every visitor afterward. The build's own route table confirms this directly:

```text
Route (app)        Revalidate  Expire
├ ○ /static-page
```

`○` means static, prerendered content. Fetching `/static-page` twice, a second apart, returns the exact same `Rendered at` timestamp both times, confirming the page was never re-rendered between those two requests.

### Dynamic rendering (SSR): rendered fresh on every request

`app/dynamic-page/page.tsx` calls `headers()` from `next/headers`, reading the incoming request's headers. That information cannot exist at build time, there is no request yet, so Next.js has no choice but to render this page on the server at request time, every time. The route table marks it accordingly:

```text
Route (app)        Revalidate  Expire
├ ƒ /dynamic-page
```

`ƒ` means dynamic, server-rendered on demand. Fetching `/dynamic-page` twice, a second apart, returns two different `Rendered at` timestamps, confirming the component genuinely re-ran for each request. `cookies()` and a page's `searchParams` prop have the same effect as `headers()` here, any of them is enough to force dynamic rendering.

### Incremental Static Regeneration (ISR): static, but kept fresh

`app/isr-page/page.tsx` sets `export const revalidate = 5`. The route table shows this page as static, but annotated with how long that cached version is allowed to live:

```text
Route (app)        Revalidate  Expire
├ ○ /isr-page              5s      1y
```

This was tested directly against a running build, with real timestamps logged alongside each request, not assumed from documentation:

| Request | Time since build | Rendered at (relative) | What happened |
| --- | --- | --- | --- |
| 1 | already past 5s (prior testing had used up the window) | stale (build time) | served the cached page, triggered a background regeneration |
| 2 | +2s after request 1 | fresh, close to request 1's time | the background regeneration from request 1 had already finished |
| 3 | +5s after request 2 (past the window again) | still the request-2 value | served the now-stale cached page again, triggered another regeneration |
| 4 | +2s after request 3 | fresh, close to request 3's time | the second regeneration had finished |

The pattern repeats exactly the same way every cycle: once the revalidate window has passed, the request that arrives right after it does not wait for a fresh render, it gets the old page immediately and kicks off regeneration in the background. Only the request after that sees the new version. This is the actual meaning of "stale while revalidate", nobody is ever blocked waiting for a rebuild, but nobody is guaranteed the absolute newest version on the very first request past the deadline either.

## Resources

- Rendering: Server Components: <https://nextjs.org/docs/app/building-your-application/rendering/server-components>
- Incremental Static Regeneration (ISR): <https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration>
- Route segment config (the `revalidate` export and related options): <https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config>

## Practice

1. Change `isr-page`'s `revalidate` to 60 and confirm the route table's "Revalidate" column updates to match.
2. Add `cookies()` from `next/headers` to a new page with no other dynamic API, and confirm it alone is enough to make the route show `ƒ` instead of `○`.
3. Add a `searchParams` prop to a page and read a value from it, then confirm that page is dynamic even without `headers()` or `cookies()`.
4. Remove `revalidate` from `isr-page` entirely and compare the route table, the page should now behave exactly like `static-page`.
5. Time your own requests to `/isr-page` with a shorter `revalidate` value, like 2, and confirm the same stale-then-fresh pattern shows up, just on a faster cycle.

## Code Example

- [app/layout.tsx](./05-data-fetching/app/layout.tsx)
- [app/page.tsx](./05-data-fetching/app/page.tsx)
- [app/static-page/page.tsx](./05-data-fetching/app/static-page/page.tsx)
- [app/dynamic-page/page.tsx](./05-data-fetching/app/dynamic-page/page.tsx)
- [app/isr-page/page.tsx](./05-data-fetching/app/isr-page/page.tsx)

To run it yourself: install `next`, `react`, and `react-dom` in a project containing this `app/` folder at its root, then run `npx next build && npx next start` and fetch each route a few times, a couple of seconds apart, watching the `Rendered at` value change or stay the same.

# App Router vs Pages Router

**Topic 61 of 89** (Section: Next.js, 1 of 10)

## Notes

Next.js has two different systems for turning files into routes: the Pages Router (`pages/`, the original system) and the App Router (`app/`, the newer system built around React Server Components). A single project can use either one, or both at the same time, Next.js resolves routes from both directories and merges them into one route table.

### File-system routing in both routers

In the Pages Router, a file directly becomes a route: `pages/contact.tsx` becomes `/contact`. In the App Router, a route is a folder, not a file, and the folder needs a `page.tsx` file inside it to actually be reachable: `app/about/page.tsx` becomes `/about`, but a plain `app/about.tsx` would not become a route at all. This project has exactly that layout:

```text
app/
  layout.tsx       -> the root layout, wraps every App Router page
  page.tsx         -> "/"      (App Router, Server Component)
  about/
    page.tsx       -> "/about" (App Router, Client Component)
pages/
  contact.tsx      -> "/contact" (Pages Router)
```

Building this project prints the exact route table Next.js resolved from these files, with the two routers listed separately but merged into one app:

```text
Route (app)
┌ ○ /
├ ○ /_not-found
└ ○ /about

Route (pages)
─ ○ /contact
```

### The two routers cannot both claim the same path

Both routers resolving into one route table only works because their paths do not collide. Adding a second file, `pages/about.tsx`, while `app/about/page.tsx` already exists, makes the build fail immediately:

```text
Error: App Router and Pages Router both match path: /about
Next.js does not support having both App Router and Pages Router routes
matching the same path. Please remove one of the conflicting routes.
```

This is worth knowing for a real migration: moving routes from `pages/` to `app/` one at a time (the officially recommended way to adopt the App Router incrementally) works fine as long as a route is only ever defined in one of the two directories at a time.

### Layouts only exist in the App Router

`app/layout.tsx` is required by the App Router (every App Router project needs at least a root layout providing `<html>` and `<body>`), and it automatically wraps every page under it, here both `/` and `/about`. Fetching either page's rendered HTML shows the layout's content present in both:

```text
GET /       -> SHARED-APP-ROUTER-LAYOUT-MARKER ... <h1>Home (App Router)</h1>
GET /about  -> SHARED-APP-ROUTER-LAYOUT-MARKER ... <h1>About (App Router, Client Component)</h1>
```

`/contact`, served entirely by the Pages Router, has no such layout wrapping it, this layout system is specific to the App Router (the Pages Router has its own older, different mechanism for a shared `_app.tsx`, not covered here). Fetching `/contact` confirms the marker is absent:

```text
GET /contact -> <h1>Contact (Pages Router)</h1>   (no layout marker anywhere)
```

### Server Components vs Client Components (App Router only)

This distinction does not exist in the Pages Router at all, every Pages Router component works the same way `ContactPage` does here, with hooks like `useState` available directly, no special directive needed.

In the App Router, every component is a Server Component by default. `app/page.tsx` in this project is a Server Component: it is declared as an `async` function and directly `await`s a function that stands in for a database call, something only a Server Component is allowed to do. Marking a component a Client Component, by adding `"use client"` at the top of the file (as `app/about/page.tsx` does here), is what allows it to use hooks like `useState`.

Without `"use client"`, importing `useState` into a Server Component fails the build with a specific error:

```text
Error: You're importing a module that depends on `useState` into a React
Server Component module. This API is only available in Client Components.
To fix, mark the file (or its parent) with the "use client" directive.
```

The practical reason this distinction matters, beyond which hooks are available, is what code is actually sent to the browser. A Server Component's code runs only on the server and is never included in the JavaScript bundle shipped to the browser, while a Client Component's code is bundled and sent, since the browser has to run it to make the component interactive. This was confirmed directly against the compiled output of this project: searching every client-side JavaScript file for the name of `app/page.tsx`'s server-only helper function found no match anywhere, while searching for a marker string placed inside `app/about/page.tsx`'s Client Component found it inside a client bundle file. The Server Component's code genuinely never leaves the server.

## Resources

- Routing fundamentals: <https://nextjs.org/docs/app/building-your-application/routing>
- Pages Router documentation (for comparison): <https://nextjs.org/docs/pages>
- Server and Client Components: <https://nextjs.org/docs/app/building-your-application/rendering/server-components>
- The "use client" directive: <https://nextjs.org/docs/app/api-reference/directives/use-client>
- Incremental adoption of the App Router: <https://nextjs.org/docs/app/guides/migrating/app-router-migration>

## Practice

1. Add a second App Router page, `app/pricing/page.tsx`, and confirm it appears in the build's route table alongside the existing routes.
2. Temporarily add `pages/pricing.tsx` next to it and confirm the build fails with the same "both match path" error shown above, then remove it again.
3. Add a second layout file at `app/about/layout.tsx` and confirm its content appears only on `/about`, not on `/`, since nested layouts only wrap the routes inside their own folder.
4. Remove the `"use client"` directive from `app/about/page.tsx` and confirm the build fails with the exact `useState` error quoted above, then add it back.
5. Add a second marker string to `app/page.tsx`, rebuild, and confirm it is still absent from every file under `.next/static/`.

## Code Example

This topic's example is a small Next.js project with four files, since the subject itself (routing and layouts) is a file-and-folder structure rather than something a single file can show:

- [app/layout.tsx](./01-app-router-vs-pages-router/app/layout.tsx)
- [app/page.tsx](./01-app-router-vs-pages-router/app/page.tsx)
- [app/about/page.tsx](./01-app-router-vs-pages-router/app/about/page.tsx)
- [pages/contact.tsx](./01-app-router-vs-pages-router/pages/contact.tsx)

To run it yourself: install `next`, `react`, and `react-dom` in a project containing these two folders (`app/` and `pages/`) at its root, then run `npx next build` to see the route table, or `npx next dev` to browse it live.

# Middleware

**Topic 67 of 89** (Section: Next.js, 7 of 10)

## Notes

### Project structure

```text
middleware.ts                  -> runs before every matched request
app/
  layout.tsx                   -> root layout (shared wrapper, from earlier topics)
  page.tsx                      -> "/", public home page
  dashboard/page.tsx            -> "protected" page, needs a session cookie
  login/page.tsx                -> redirect target for unauthenticated visitors
  new-promo/page.tsx            -> rewrite target
  api/whoami/route.ts           -> a Route Handler, deliberately excluded from the matcher
```

Middleware is a single function exported from `middleware.ts`, placed at the project root (next to `app/`, not inside it). It runs on every request that matches its `config.matcher`, before the request reaches a page or a Route Handler, and it runs on the Edge runtime rather than the regular Node.js runtime.

### What middleware can do

Middleware receives the incoming `NextRequest` and must return a `NextResponse` (or nothing, which behaves like `NextResponse.next()`). From inside it you can inspect or rewrite the URL, read and set cookies, read and set headers, and decide whether the request continues, gets redirected, or gets silently rewritten to a different route, all before any page component runs.

### The matcher config

```ts
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

Without a `matcher`, middleware runs on every request, including static assets and API routes, which is usually wasted work. The regex above is the common pattern: it matches everything except paths starting with `api`, Next's own static/image internals, and the favicon.

Verified directly: with this matcher, `/api/whoami` never shows the custom header middleware adds to every other route, confirmed below, while `/`, `/dashboard`, and `/old-promo` all do.

### Redirect: gating a route behind a cookie

```ts
if (pathname.startsWith("/dashboard")) {
  const hasSession = request.cookies.has("session");
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
}
```

Verified directly: `GET /dashboard` with no cookie returns `HTTP/1.1 307 Temporary Redirect` with `location: /login?from=%2Fdashboard`. The same request sent with `--cookie "session=abc123"` returns `HTTP/1.1 200 OK` and the actual dashboard markup instead.

### Rewrite: serving different content at the same URL

```ts
if (pathname === "/old-promo") {
  return NextResponse.rewrite(new URL("/new-promo", request.url));
}
```

A rewrite is not a redirect: the browser's address bar still shows `/old-promo`, but the page actually rendered and returned is `/new-promo`. Verified directly: `GET /old-promo` returns `HTTP/1.1 200 OK` (not a 3xx) with the `<h1>New Promo</h1>` markup in the body, and Next.js itself adds an internal `x-middleware-rewrite: /new-promo` response header confirming which route it rewrote to.

### Reading and setting headers

```ts
const response = NextResponse.next();
response.headers.set("x-demo-header", "middleware-ran");
response.headers.set(
  "x-echo-ua",
  request.headers.get("user-agent") ?? "unknown"
);
return response;
```

Verified directly: `curl -A "TestAgent/1.0" /` returns `x-echo-ua: TestAgent/1.0` in the response, proving middleware read an incoming request header and wrote it back out on the response. Every matched route in this project carries `x-demo-header: middleware-ran`, including the redirect and the rewrite responses above; `/api/whoami`, excluded by the matcher, carries neither header.

### Edge runtime constraints

Middleware runs on the Edge runtime, a much smaller JavaScript environment than full Node.js. There is no `fs`, no raw TCP/database drivers, and only a subset of npm packages work there; anything that needs a real database connection belongs in a Route Handler or Server Component instead, with middleware doing lightweight checks (cookies, headers, redirects, rewrites) and `fetch()` calls only.

### Practical tips

- Keep middleware fast. It runs on every matched request, so expensive work here is a tax on the whole site, not just one page.
- A redirect changes the URL the visitor sees and ends up in browser history; a rewrite does not, it is invisible to the client.
- Always scope `matcher` deliberately. Forgetting to exclude `api` or `_next/static` means middleware runs, and costs time, on every asset request too.

## Resources

- Middleware: <https://nextjs.org/docs/app/building-your-application/routing/middleware>
- NextResponse: <https://nextjs.org/docs/app/api-reference/functions/next-response>
- Matching Paths (matcher config): <https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher>

## Practice

1. Add a second protected path, such as `/settings`, to the same cookie check used for `/dashboard`, without duplicating the whole `if` block.
2. Change the redirect to send the visitor back to `/dashboard` automatically after a fake login, by reading the `from` query param on `/login`.
3. Add a second rewrite (e.g. `/old-docs` -> `/new-promo`) and confirm with curl that both old paths now serve the same new content while keeping their own URLs.
4. Remove `api` from the matcher's negative lookahead, rebuild, and confirm `/api/whoami` now also carries `x-demo-header`.
5. Set a cookie from middleware itself with `response.cookies.set(...)` on first visit, and confirm with `curl -i` that a `Set-Cookie` header appears.

## Code Example

- [middleware.ts](./07-middleware/middleware.ts)
- [app/layout.tsx](./07-middleware/app/layout.tsx)
- [app/page.tsx](./07-middleware/app/page.tsx)
- [app/dashboard/page.tsx](./07-middleware/app/dashboard/page.tsx)
- [app/login/page.tsx](./07-middleware/app/login/page.tsx)
- [app/new-promo/page.tsx](./07-middleware/app/new-promo/page.tsx)
- [app/api/whoami/route.ts](./07-middleware/app/api/whoami/route.ts)

To run it yourself: install `next`, `react`, and `react-dom` in a project containing `middleware.ts` and this `app/` folder at its root, then run `npx next build && npx next start` and use `curl -i` against `/dashboard`, `/old-promo`, and `/api/whoami` to see each behavior.

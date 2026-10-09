# API Routes (Route Handlers)

**Topic 66 of 89** (Section: Next.js, 6 of 10)

## Notes

### Project structure

```text
app/
  layout.tsx                   -> root layout (shared wrapper, from earlier topics)
  page.tsx                      -> "/", just a placeholder home page
  api/hello/route.ts             -> GET /api/hello (reads a ?name= query param)
  api/static-test/route.ts       -> GET /api/static-test (opts into static caching)
  api/echo/route.ts              -> POST /api/echo (reads and validates a JSON body)
  api/products/[id]/route.ts     -> GET /api/products/:id (a dynamic route segment)
```

A Route Handler is a file named exactly `route.ts` inside `app/`. Instead of exporting a React component like a page does, it exports one function per HTTP method it supports: `GET`, `POST`, `PUT`, `DELETE`, and so on. The folder path becomes the URL, the same way it does for pages.

### Reading query parameters

`app/api/hello/route.ts` receives a `NextRequest`, which has a convenience `nextUrl` property with a parsed `searchParams`:

```ts
const name = request.nextUrl.searchParams.get("name") ?? "World";
```

Verified directly: `GET /api/hello` with no query string returns `{"message":"Hello, World!", ...}`, and `GET /api/hello?name=Ada` returns `{"message":"Hello, Ada!", ...}`.

### Reading and validating a JSON body

`app/api/echo/route.ts` exports only `POST`. It reads the request body with `await request.json()`, checks that the field it needs is actually a string, and returns a different status code depending on the outcome:

```ts
if (typeof body.message !== "string") {
  return NextResponse.json({ error: "message field is required" }, { status: 400 });
}
```

Verified directly: a POST with `{"message":"hi there"}` returns HTTP 200 with `{"echoed":"hi there", ...}`. A POST with `{}` (no `message` field) returns HTTP 400 with `{"error":"message field is required"}`.

### Dynamic route segments in a Route Handler

`app/api/products/[id]/route.ts` uses the same `[id]` folder naming as a dynamic page route (Topic 64), and the same rule applies: `params` is a `Promise` and must be awaited.

```ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({ id, price: 19.99 });
}
```

Verified directly: `GET /api/products/42` returns `{"id":"42","price":19.99}`.

### Route Handlers are dynamic by default, unlike pages

Topic 65 showed that a page with no dynamic API is static by default. Route Handlers do not follow that rule. The build's route table shows every handler here as `ƒ Dynamic`, including `/api/hello`, which reads nothing request-specific beyond an optional query string:

```text
Route (app)
├ ƒ /api/echo
├ ƒ /api/hello
├ ƒ /api/products/[id]
└ ƒ /api/static-test
```

This was the state before adding anything special to `static-test/route.ts`. To make a Route Handler static, it needs an explicit opt-in:

```ts
export const dynamic = "force-static";
```

Adding that single line to `app/api/static-test/route.ts` and rebuilding changes its row in the route table to `○ Static`, while every other handler stays `ƒ Dynamic`:

```text
Route (app)
├ ƒ /api/echo
├ ƒ /api/hello
├ ƒ /api/products/[id]
└ ○ /api/static-test
```

Fetching `/api/static-test` twice in a row then returns the exact same `renderedAt` value both times, confirmed directly with curl, the same proof technique used for static pages in Topic 65. `/api/hello`, left without that export, returns a different `renderedAt` on every request.

### Unimplemented methods return 405 automatically

`app/api/echo/route.ts` exports only `POST`. Sending it a `GET` request instead was never written as an error case anywhere in the file, yet Next.js returns HTTP 405 (Method Not Allowed) on its own, confirmed directly with curl. A Route Handler only needs to define the methods it actually supports; everything else is rejected automatically.

## Resources

- Route Handlers: <https://nextjs.org/docs/app/building-your-application/routing/route-handlers>
- Route segment config (the `dynamic` export and related options): <https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config>
- NextRequest: <https://nextjs.org/docs/app/api-reference/functions/next-request>
- NextResponse: <https://nextjs.org/docs/app/api-reference/functions/next-response>

## Practice

1. Add a `DELETE` handler to `app/api/products/[id]/route.ts` that returns `{"deleted": id}`, then confirm `GET` on the same route still works unchanged.
2. Send `GET /api/products/abc` and notice Next.js does not validate that `id` looks like a number, it is just a string. Add your own check that returns 400 if `id` is not numeric.
3. Remove `export const dynamic = "force-static"` from `static-test/route.ts`, rebuild, and confirm the route table shows `ƒ` again and the timestamp starts changing on every request.
4. Add a `PUT` handler to `app/api/echo/route.ts` and confirm `GET` on that route still returns 405 while `PUT` now succeeds.
5. Add a second query parameter to `app/api/hello/route.ts`, such as `greeting`, with its own default value, and use it in the response message.

## Code Example

- [app/layout.tsx](./06-api-routes/app/layout.tsx)
- [app/page.tsx](./06-api-routes/app/page.tsx)
- [app/api/hello/route.ts](./06-api-routes/app/api/hello/route.ts)
- [app/api/static-test/route.ts](./06-api-routes/app/api/static-test/route.ts)
- [app/api/echo/route.ts](./06-api-routes/app/api/echo/route.ts)
- [app/api/products/\[id\]/route.ts](./06-api-routes/app/api/products/%5Bid%5D/route.ts)

To run it yourself: install `next`, `react`, and `react-dom` in a project containing this `app/` folder at its root, then run `npx next build && npx next start` and use `curl` to send GET and POST requests to each route.

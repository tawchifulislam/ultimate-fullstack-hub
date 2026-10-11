# 7. Next.js

This is the seventh section of the Full Stack Skill Roadmap: ten topics covering Next.js's App Router, from how it routes and renders down to the production concerns (environment variables, SEO metadata, image optimization) that separate a demo from a real deployed site. Every topic's code example is a real, buildable Next.js project, not a snippet, verified by actually running `next build` and `next start` and inspecting the real output with `curl`, rather than just describing the expected behavior.

## Topics in this section

| # | Topic | What it covers | Files |
| --- | ------- | ----------------- | ------- |
| 1 | App Router vs Pages Router | File-system routing in both routers, why they can't share a path, layouts as an App-Router-only concept, and Server vs Client Components. | [Notes](./01-app-router-vs-pages-router.md) |
| 2 | Server Components vs Client Components | The server/client boundary, enforcing it with `server-only`/`client-only`, composing the two with the `children` slot pattern, and what props a Client Component can actually receive. | [Notes](./02-server-components-vs-client-components.md) |
| 3 | Layouts | Nested layouts, why a layout does not remount when navigating between its own pages, and how a `template` differs by remounting every time. | [Notes](./03-layouts.md) |
| 4 | Dynamic Routing | A single dynamic segment `[id]`, static segments winning over dynamic ones, and catch-all (`[...slug]`) vs optional catch-all (`[[...slug]]`) segments. | [Notes](./04-dynamic-routing.md) |
| 5 | Data Fetching (SSR, SSG, ISR) | Static rendering at build time, dynamic rendering on every request, and Incremental Static Regeneration as the middle ground. | [Notes](./05-data-fetching.md) |
| 6 | API Routes | `route.ts` Route Handlers exporting one function per HTTP method, reading query params and JSON bodies, dynamic segments in a handler, static-vs-dynamic defaults, and the automatic 405 on an unimplemented method. | [Notes](./06-api-routes.md) · [Code](./06-api-routes/) |
| 7 | Middleware | `middleware.ts` and its `matcher` config, redirects, rewrites, reading and writing headers and cookies, and the Edge runtime's constraints. | [Notes](./07-middleware.md) · [Code](./07-middleware/) |
| 8 | Environment Variables | `.env` vs `.env.local` precedence, `NEXT_PUBLIC_` variables getting frozen into literal constants at build time everywhere (not just the browser), server-only variables staying live runtime reads, and the real leak risk being rendered output, not the prefix. | [Notes](./08-environment-variables.md) · [Code](./08-environment-variables/) |
| 9 | Metadata & SEO | The static `metadata` export and title templates, per-route `generateMetadata`, `metadataBase` resolving relative URLs, and the `sitemap.ts`/`robots.ts` file conventions. | [Notes](./09-metadata-seo.md) · [Code](./09-metadata-seo/) |
| 10 | Image Optimization | `next/image` vs a plain `<img>`, automatic width/height and blur placeholders for local imports, `priority` preloading, the `remotePatterns` allowlist, and real resizing/format conversion through `/_next/image`. | [Notes](./10-image-optimization.md) · [Code](./10-image-optimization/) |

## How the section fits together

App Router vs Pages Router and Server vs Client Components (Topics 1 to 2) are the two foundational ideas everything else assumes: which router this section uses, and which parts of a component tree run where. Layouts and Dynamic Routing (Topics 3 to 4) build directly on the App Router's file-system conventions, shared UI that wraps a whole subtree, and URL segments that stand in for real data. Data Fetching (Topic 5) is where those routes actually get content, and introduces the static/dynamic rendering split that reappears constantly in the rest of the section, including in Topics 6, 8, and 9.

API Routes and Middleware (Topics 6 to 7) move outside of rendering pages entirely: a Route Handler is a page's HTTP-method-aware sibling, and middleware runs in front of every matched request before either a page or a Route Handler ever sees it. Environment Variables and Metadata & SEO (Topics 8 to 9) are both about what a route exposes beyond its own HTML, configuration values on one hand, `<head>` tags and generated files like `sitemap.xml` on the other, and both topics turned up a genuinely easy-to-miss gotcha once actually tested: a `NEXT_PUBLIC_` variable is frozen at build time in Route Handlers too, not just the browser, and a server-only secret can still leak through a Client Component's server-rendered HTML. Image Optimization (Topic 10) closes the section with the same static/dynamic and allowlisting ideas applied to a different kind of asset: a local file Next can inspect at build time behaves differently from a remote URL it has to be explicitly told to trust.

## How each topic is structured

Every topic has a `.md` notes file covering what it teaches, with "Verified directly" callouts anywhere the notes report something actually observed from running the code, not just documented behavior. Topics 1 to 5 keep their original single-file code examples; Topics 6 to 10, where the behavior depends on a real running server (Route Handlers, middleware, environment variables, metadata, and image optimization), ship a full runnable Next.js project folder instead, matching real-world structure: `app/` routes, a `next.config.js` where relevant, and small supporting files like a local mock HTTP server for the image optimization topic's remote-host tests.

## Suggested capstone exercise

Build a tiny blog: a dynamic `app/posts/[slug]/page.tsx` route (Topic 4) that statically generates each post at build time (Topic 5), with a shared `app/layout.tsx` providing navigation (Topic 3) and Server Components doing the data fetching while an interactive "like" button is a Client Component (Topics 1 to 2). Add an `app/api/posts/[slug]/like/route.ts` Route Handler the like button calls (Topic 6), gate a `/drafts` section behind a cookie check in `middleware.ts` (Topic 7), read the site's public name from a `NEXT_PUBLIC_` variable while keeping any admin token server-only (Topic 8), generate per-post metadata and a `sitemap.xml` from the same post data (Topic 9), and render each post's cover image with `next/image`, local for your own posts and remote-with-an-allowlist for anything pulled from an external source (Topic 10).

## Previous section

[React](../05-react/README.md)

## Next section

[Node.js / Express](../08-nodejs-express/README.md)

[Back to main roadmap](../README.md)

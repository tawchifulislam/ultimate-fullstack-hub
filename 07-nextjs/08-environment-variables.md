# Environment Variables

**Topic 68 of 89** (Section: Next.js, 8 of 10)

## Notes

### Project structure

```text
.env                            -> committed defaults (no secrets)
.env.local                      -> local overrides + secrets, normally gitignored
app/
  layout.tsx                    -> root layout (shared wrapper, from earlier topics)
  page.tsx                       -> Server Component reading both kinds of variable
  client-demo/
    ClientEnvDemo.tsx            -> a "use client" component reading the same two variables
    page.tsx
  api/env-check/route.ts         -> dynamic Route Handler, reads process.env fresh per request
```

This project defines the same two variables in both files to show precedence, and uses them everywhere to show exactly where each one is, and isn't, visible:

```env
# .env

NEXT_PUBLIC_SITE_NAME=Default Site Name

# .env.local

NEXT_PUBLIC_SITE_NAME=My Demo Site
API_SECRET_KEY=local-dev-secret-abc123
```

### Precedence: .env.local overrides .env

Next.js loads several possible env files and merges them, with more specific files winning: `.env.$(NODE_ENV).local` > `.env.local` > `.env.$(NODE_ENV)` > `.env` (`.env.local` is skipped only when `NODE_ENV` is `test`). Verified directly: with both files above present, the built site renders `<h1>My Demo Site</h1>`, not `Default Site Name`, confirming `.env.local` wins.

### NEXT_PUBLIC_ variables are frozen at build time, everywhere

A variable prefixed `NEXT_PUBLIC_` gets a special treatment: at build time, Next.js's bundler finds every `process.env.NEXT_PUBLIC_X` reference in the codebase and replaces it with the actual literal string value, directly in the compiled source. This is true in Client Components, Server Components, and even Route Handlers, not just "the browser." Confirmed by reading the compiled output directly:

```js
// .next/static/chunks/app/client-demo/page-*.js (shipped to the browser)
children:["NEXT_PUBLIC_SITE_NAME on client: ", String("My Demo Site")]

// .next/server/app/api/env-check/route.js (runs only on the server)
NextResponse.json({publicName: "My Demo Site", hasSecret: ...})
```

Neither file contains `process.env.NEXT_PUBLIC_SITE_NAME` as code anymore, the compiler replaced it with the string before anything ran. The practical consequence: a `NEXT_PUBLIC_` value is a build-time constant everywhere, including on the server. Changing `.env.local` and restarting the already-built server, without rebuilding, proved this:

| Route | Type | Before rebuild | After changing `.env.local` + restart (no rebuild) | After rebuild |
| ----- | ---- | ------------- | --------------------------------------------------- | ------------ |
| `/` | static page | `My Demo Site` | `My Demo Site` (stale) | `Renamed Site` |
| `/api/env-check` → `publicName` | dynamic route handler | `My Demo Site` | `My Demo Site` (stale) | `Renamed Site` |

Even the dynamic Route Handler, which re-runs on every request, still returned the old, build-time-frozen value for the `NEXT_PUBLIC_` variable until the project was actually rebuilt.

## Server-only variables are real, live reads, not constants

A variable with no `NEXT_PUBLIC_` prefix is left untouched by the compiler, as a genuine `process.env.X` property access. On the server, that resolves against the real environment at the moment the code runs. The same restart-without-rebuild test proves it:

| Route | `secretLength` before rotation | After changing `.env.local` + restart (no rebuild) | After rebuild |
| ----- | ----------------------------- | -------------------------------------------------- | ------------ |
| `/api/env-check` | 23 (`local-dev-secret-abc123`) | 29 (`local-dev-secret-ROTATED-9999`) | 29 |

`secretLength` updated immediately on restart, no rebuild required, because `API_SECRET_KEY` was never inlined; it's read fresh from the process every time the Route Handler runs.

### The real leak risk is rendered output, not the prefix

The common shortcut "no `NEXT_PUBLIC_` prefix means it's safe from the browser" is incomplete, and this project proves why. `ClientEnvDemo.tsx` is a `"use client"` component, but Next.js still server-renders it once, in Node.js, to produce the initial HTML. During that server render, `process.env.API_SECRET_KEY` resolves to the real secret, and because the component prints it into JSX, the raw value ends up in the page's HTML:

```text
client-secret">API_SECRET_KEY on client: <!-- -->local-dev-secret-abc123
```

Separately, grepping the actual JavaScript file shipped to the browser for hydration shows the secret is genuinely absent there:

```text
$ grep -rl "local-dev-secret-abc123" .next/static/
(no matches)
```

So the two findings together give the accurate rule: the compiled client-side *JavaScript bundle* never contains a non-prefixed variable's value, that part of the shortcut is true. But the *rendered HTML* of any component, server or client, is just as public as the JS bundle, since it's sent to every visitor as plain page content. The only real protection is to never print a secret into what a component returns; use it instead inside server-side logic (a `fetch()` call's headers, a signature check, a database query) that produces ordinary, non-secret output.

### Practical tips

- Keep `.env.local` out of version control (`.gitignore` it) even though this project ships one with a fake placeholder for learning purposes; a real project's `.env.local` holds real secrets.
- Treat every `NEXT_PUBLIC_` variable as public and permanent for a given build: assume anyone can read it, and assume it needs a rebuild (not just a restart) to change.
- Never render a server-only variable's raw value in JSX, in a Server Component or a Client Component; derive and render a boolean or a safe summary instead, the way `hasSecret` does here.
- `.env.development` and `.env.production` exist for values that should differ by build mode (a different API base URL, for instance); `.env.local` is for the one machine's personal overrides and secrets.

## Resources

- Environment Variables: <https://nextjs.org/docs/app/building-your-application/configuring/environment-variables>
- Bundling Environment Variables for the Browser (the `NEXT_PUBLIC_` prefix): <https://nextjs.org/docs/app/building-your-application/configuring/environment-variables#bundling-environment-variables-for-the-browser>
- Environment Variable Load Order: <https://nextjs.org/docs/app/building-your-application/configuring/environment-variables#environment-variable-load-order>

## Practice

1. Remove `NEXT_PUBLIC_` from `NEXT_PUBLIC_SITE_NAME` everywhere it's used, rebuild, and confirm the home page now prints nothing (or `undefined`) instead of the site name.
2. Grep `.next/server/app/page.js` (after building) for the literal site-name string to see that even a plain Server Component gets the same build-time replacement as a Route Handler.
3. Fix `ClientEnvDemo.tsx` so it no longer leaks the secret: pass a `hasSecret` boolean down from the server-rendered parent as a prop instead of reading `process.env.API_SECRET_KEY` directly in the client component, then confirm with `curl` that the raw value no longer appears anywhere in `/client-demo`'s HTML.
4. Add a third file, `.env.production`, that overrides `NEXT_PUBLIC_SITE_NAME` again, then compare `npx next build` output to `npx next build && NODE_ENV=production` behavior (Next.js already builds in production mode by default, so look closely at which file actually wins).
5. Add a `.gitignore` entry for `.env*.local` and explain, in a comment, why `.env` itself is safe to commit but `.env.local` is not.

## Code Example

- [.env](./08-environment-variables/.env)
- [.env.local](./08-environment-variables/.env.local)
- [app/layout.tsx](./08-environment-variables/app/layout.tsx)
- [app/page.tsx](./08-environment-variables/app/page.tsx)
- [app/client-demo/ClientEnvDemo.tsx](./08-environment-variables/app/client-demo/ClientEnvDemo.tsx)
- [app/client-demo/page.tsx](./08-environment-variables/app/client-demo/page.tsx)
- [app/api/env-check/route.ts](./08-environment-variables/app/api/env-check/route.ts)

To run it yourself: install `next`, `react`, and `react-dom` in a project containing these files at its root, then run `npx next build && npx next start` and use `curl` against `/`, `/client-demo`, and `/api/env-check`. Try editing `.env.local` and restarting (`npx next start`) without rebuilding to see the stale-vs-fresh split for yourself, then rebuild to see both catch up.

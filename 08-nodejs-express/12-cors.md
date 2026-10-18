# CORS

**Topic 82 of 89** (Section: Node.js / Express, 12 of 12)

## Notes

### Project structure

```text
common.js                -> shared routes and a request logger, so every API server differs ONLY in its CORS handling
api-no-cors.js           -> an API with no CORS handling at all
api-manual-cors.js       -> CORS written by hand: an origin allowlist, the preflight answer, Vary
api-cors-package.js      -> the same job with the cors package, in four modes
api-cors-order.js        -> one mistake on purpose: a route registered BEFORE cors()
page-server.js           -> serves the demo page on port 5000 (a different origin from the API on 4700)
frontend/index.html      -> the demo page
frontend/app.js          -> the eight fetch() scenarios the page runs
verify-in-browser.js     -> drives a real Chromium through the scenarios and prints what happened
preflight-cache-check.js -> measures preflight caching in a real Chromium
package.json
```

This topic closes the Node.js / Express section, and it builds on the earlier ones. CORS is a middleware (Topic 76), so the order it is registered in matters. The `Authorization: Bearer` header from Topic 81 turns out to change how the browser treats a request. A server error (Topic 78) behaves in a surprising way when CORS is wrong. Topics 85 and 86 (XSS and CSRF) pick up where this one leaves off.

Every result below comes from running the files in this folder. The browser results were produced in headless Chromium 141 driven by Playwright (`playwright-core` 1.64.1) against Express 5.3.0 and `cors` 2.8.6. Where a result is a statement about browsers in general rather than something measured here, the notes say so.

### The problem CORS solves

A browser page can only freely read responses from its own **origin**. An origin is the combination of **scheme, host and port**. A frontend dev server on `http://localhost:5000` and an API on `http://localhost:4700` are two different origins even though they are on the same machine, because the port differs. This default rule is called the **same-origin policy**, and **CORS (Cross-Origin Resource Sharing)** is the opt-in mechanism a server uses to say "this other origin may read my responses".

The common situation that triggers all this is the standard modern setup: a React or Next.js frontend served from one origin, calling an Express API on another. In the demo, `page-server.js` plays the frontend on port 5000 and the API servers listen on 4700.

### CORS is enforced by the browser, not the server

This is the single most misunderstood fact about CORS, so it was tested first. With the API server having no CORS handling at all, `curl` gets a normal answer:

```text
GET /data with  Origin: http://localhost:5000   -> HTTP/1.1 200 OK, body {"message":"hello from the API"}
number of Access-Control-* headers in that response: 0
```

The server answered normally and added no CORS headers. A page in a real browser, calling the same server, saw this for **every one** of the eight scenarios the demo runs:

```text
BLOCKED  TypeError: Failed to fetch
```

The page's own code only ever sees that generic `TypeError`, with no status code and no body. The explanation is written to the browser's DevTools console instead, and `verify-in-browser.js` captures it:

```text
Access to fetch at 'http://localhost:4700/data' from origin 'http://localhost:5000' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

The server never refuses anything. The browser receives the response, looks for permission in its headers, finds none, and hides the response from the page. Even the hand-written server that does implement CORS still answered a request from a non-allowed origin (`Origin: http://127.0.0.1:5000`) with `200` and the full body when asked with `curl`. It simply sent no `Access-Control-Allow-Origin` header, so a browser would have refused to expose it.

### What actually reaches the server

The demo page runs eight scenarios, and each API server logs every request it receives (the logger is registered before the CORS middleware, so it also sees preflights). Against the server with no CORS, the log shows which requests the server actually got:

| # | Scenario | Preflight sent first? | What the server's log showed |
| --- | --- | --- | --- |
| 1 | `GET /data` | no | `GET /data` arrived |
| 2 | `PUT /items/1` with a JSON body | yes | only `OPTIONS /items/1` (asking for PUT and content-type). The PUT never arrived |
| 3 | `GET /private` with an `Authorization` header | yes | only `OPTIONS /private` (asking for GET and authorization). That GET never arrived |
| 4 | `POST /login`, `credentials: "include"` | no | `POST /login` arrived |
| 5 | `GET /whoami`, `credentials: "include"` | no | arrived |
| 6 | `GET /whoami`, default credentials | no | arrived |
| 7 | `GET /private` with no `Authorization` header | no | arrived |
| 8 | `GET /boom` (a route that throws) | no | arrived, and the server logged the thrown error |

This is the most useful table in the topic, because it shows there are two kinds of request:

- A **simple request** (here: plain GETs, and a POST with no body and no custom headers) is sent straight to the server. The server handles it. Only afterwards does the browser decide whether the page may read the result. So a CORS error on a simple request does **not** mean the request failed to run. The `POST /login` above reached the server even though the page could not read the answer.
- A **preflighted request** triggers an extra `OPTIONS` request first, asking permission. Scenario 2 (the `PUT` method together with a JSON `Content-Type`) and scenario 3 (an `Authorization` header) each caused one. When the preflight answer was not good enough, the browser never sent the real request at all.

The rule for which requests are "simple" is documented on MDN: only `GET`, `HEAD` and `POST`, only a short list of safe headers, and for `Content-Type` only `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain`. Only the three cases in the table were tested here, not every combination.

The useful consequence for the JWT work in Topic 81: the moment a frontend sends `Authorization: Bearer <token>`, every one of those requests is preflighted, and the API must answer the preflight correctly.

### CORS written by hand

`api-manual-cors.js` is the whole mechanism in one middleware:

```js
const ALLOWED_ORIGINS = new Set(["http://localhost:5000"]);

function manualCors(req, res, next) {
  const origin = req.header("origin");
  const allowed = origin && ALLOWED_ORIGINS.has(origin);

  res.setHeader("Vary", "Origin");
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin); // echo the one origin back, not "*"
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS" && req.header("access-control-request-method")) {
    if (allowed) {
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Max-Age", "600");
    }
    return res.sendStatus(204); // answered here, never reaches the routes
  }
  next();
}
```

From the allowed origin, the page succeeded at all eight scenarios. The server's log shows the preflight pattern from the table above completing:

```text
OPTIONS /items/1  [preflight asking: PUT + content-type]
PUT /items/1
OPTIONS /private  [preflight asking: GET + authorization]
GET /private
```

Raw headers from the hand-written server, captured with `curl` while sending an allowed `Origin`:

```text
simple GET:   Access-Control-Allow-Origin: http://localhost:5000
              Access-Control-Allow-Credentials: true
              Vary: Origin
preflight:    HTTP/1.1 204 No Content
              (the three headers above, plus)
              Access-Control-Allow-Methods: GET, POST, PUT
              Access-Control-Allow-Headers: Content-Type, Authorization
              Access-Control-Max-Age: 600
```

Four details in that code are worth understanding, not just copying:

- **The allowed origin is echoed back, not replaced by `*`.** The server checks the request's `Origin` against an exact-match list and returns that one value.
- **The match is exact.** Running the very same server but opening the page from `http://127.0.0.1:5000` instead of `http://localhost:5000` made **all eight scenarios fail**. Both addresses are the same machine, but the host differs, so the origin differs, and it was not on the list. The server's log confirms the requests still reached it.
- **`Vary: Origin` is set on every response.** An earlier draft of this file set it only for allowed origins. A `curl` check with a disallowed origin showed the header missing there, which is a real flaw: the response depends on the `Origin` request header, so a shared cache needs to be told, or it could store the header-less answer given to a stranger and replay it to the allowed origin. (That caching consequence is standard HTTP reasoning, not something tested here.) The `cors` package sends `Vary: Origin` for a disallowed origin too, and the hand-written version now does as well, verified with `curl` for an allowed origin, a disallowed origin, no `Origin` header, and a preflight.
- **The preflight is answered with `204` and never reaches the routes.** `OPTIONS` does not appear in any route handler, and the handler for `PUT /items/1` only ran after the preflight succeeded.

### The `cors` package

Hand-writing it is for understanding. In real projects the `cors` package does the same job:

```js
const cors = require("cors");

app.use(cors({
  origin: ["http://localhost:5000"],
  credentials: true,
  methods: ["GET", "POST", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
}));
```

It is registered with `app.use()` before the routes, and it answers preflight `OPTIONS` requests itself. With this configuration, all eight scenarios worked, with the same results as the hand-written version.

The raw headers from the package, again captured with `curl`:

```text
allowed origin, simple GET:
  Access-Control-Allow-Origin: http://localhost:5000
  Vary: Origin
  Access-Control-Allow-Credentials: true

allowed origin, preflight (204):
  (the same three, plus)
  Access-Control-Allow-Methods: GET,POST,PUT
  Access-Control-Allow-Headers: Content-Type,Authorization
  Access-Control-Max-Age: 600

disallowed origin (http://127.0.0.1:5000), simple GET:
  HTTP/1.1 200 OK
  Vary: Origin
  Access-Control-Allow-Credentials: true
  (and NO Access-Control-Allow-Origin header; the body is still sent)
```

For a disallowed origin the package does not return an error. It just leaves out `Access-Control-Allow-Origin`, and the browser does the blocking, which matches the point made earlier.

#### What `cors()` with no options does

```text
simple GET:   Access-Control-Allow-Origin: *
preflight:    HTTP/1.1 204 No Content
              Access-Control-Allow-Origin: *
              Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
              Vary: Access-Control-Request-Headers
              Access-Control-Allow-Headers: content-type,authorization   (it echoes back what the browser asked for)
```

`cors()` with no arguments allows **every** origin, every common method, and whatever headers are requested. That is fine for a genuinely public API and unwise for one that serves logged-in users. Browser results with this configuration are in the next section.

### Credentials: cookies need an explicit opt-in on both sides

By default `fetch()` does not send cookies to another origin. Scenarios 4 to 6 test this. Against the correctly configured allowlist server:

```text
4. POST /login with credentials: "include"       -> WORKED (200) {"ok":true}
5. GET  /whoami with credentials: "include"      -> WORKED (200) {"cookieHeader":"session=abc123"}
6. GET  /whoami with default credentials         -> WORKED (200) {"cookieHeader":null}
```

The login response set a cookie; with `credentials: "include"` the browser sent it back (scenario 5), and without it the same server received no `Cookie` header at all (scenario 6, `null`). Two things have to be true for the credentialed request to be readable: the page asks for it (`credentials: "include"`), and the server answers with `Access-Control-Allow-Credentials: true`.

There is a hard rule layered on top of that: when credentials are included, the browser refuses an `Access-Control-Allow-Origin` of `*`. This is the result against both `cors()` with defaults and `cors({ origin: "*", credentials: true })`:

| Scenario | Result with `*` |
| --- | --- |
| 1 to 3 (GET, PUT with JSON, `Authorization` header) | worked |
| 4 and 5 (`credentials: "include"`) | **BLOCKED** |
| 6 (default credentials) | worked, `{"cookieHeader":null}` |
| 7 and 8 (a 401, a 500) | worked, status readable |

and the console explanation, verbatim:

```text
...has been blocked by CORS policy: The value of the 'Access-Control-Allow-Origin' header in the response
must not be the wildcard '*' when the request's credentials mode is 'include'.
```

Note that the wildcard worked fine for the `Authorization` header in scenario 3. That scenario did not use `credentials: "include"`, and that credentials mode is what triggers the wildcard restriction. The Fetch standard uses "credentials" to mean cookies, HTTP authentication and TLS client certificates, so a token you attach yourself in a header is not one. An `Authorization` header combined with `credentials: "include"` and a wildcard was not tested separately here. In practice this means a cookie-based session needs a named origin, while a token-in-header API that uses no cookies does not.

`localhost:5000` and `localhost:4700` are different origins but the same **site**, so cookies flowed freely in this demo. A deployment where the frontend and API sit on two unrelated domains brings the cookie `SameSite` rules into play, and this folder does not test that.

### A route registered before cors() gets no CORS headers

Middleware runs in registration order (Topic 76), so a response produced before `cors()` has run carries no CORS headers. `api-cors-order.js` has exactly one mistake: the `/boom` route is registered ahead of `app.use(cors(...))`. Everything else is the working allowlist configuration. Results:

```text
scenarios 1 to 7:  worked, as before
8. GET /boom       BLOCKED  TypeError: Failed to fetch
console:           ...No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

With `curl`, the cause is visible directly:

```text
GET /boom on api-cors-order.js:  HTTP/1.1 500 Internal Server Error, Access-Control-Allow-Origin headers: 0
GET /data on the same server:    HTTP/1.1 200 OK, Access-Control-Allow-Origin: http://localhost:5000
```

The same `/boom` route on the correctly ordered servers gave the page a readable answer:

```text
8. GET /boom       WORKED (500)
```

This matters in practice. When an API has a bug and CORS is misplaced, the browser shows a **CORS error** and hides the 500, so it looks like a CORS misconfiguration while the real problem is a server error. The server's own log (the thrown error and stack trace were printed there) is where to look. The fix is to register `cors()` first, before any route, so that error responses carry the headers too. On the correctly ordered servers, Express's default error handler sent its 500 with the CORS headers that `cors()` had already set (observed with the default handler only; a custom error handler was not tested here).

A related point from scenario 7: a `401` from `/private` was fully readable on the correctly configured servers (`WORKED (401)`, with the JSON error body). A frontend can only react to a 401 from Topic 81 (for example, by sending the user to a login page) if CORS lets it see the status.

### Preflight caching and `Max-Age`

A preflight is an extra round trip before the real request. `Access-Control-Max-Age` lets the browser reuse the answer. `preflight-cache-check.js` sends the same `PUT` three times (immediately, again right away, and once more after 6.5 seconds) and then the number of `OPTIONS` requests the **server** logged is compared:

| Server setting | Status of the 3 PUTs | OPTIONS requests the server saw |
| --- | --- | --- |
| `maxAge: 600` | 200, 200, 200 | **1** |
| no `maxAge` | 200, 200, 200 | **2** |

With `maxAge: 600`, one preflight covered all three calls, including the one 6.5 seconds later. With no `Max-Age`, the immediate repeat was covered but the call 6.5 seconds later needed a fresh preflight. MDN documents a default of 5 seconds when the header is absent, which fits this observation. This was measured in headless Chromium 141 only. Browsers apply their own upper limits to `Max-Age` (MDN lists them) and Firefox and Safari were not tested.

### What CORS is not

- **CORS is not authentication or authorization.** It decides which **browser pages** may read responses. Anyone can still call the API with `curl`, Postman or a server-side script, and the `curl` tests above did exactly that and got `200`. Protect data with Topic 81's token check, not with CORS.
- **CORS does not stop a request from running.** In the first table, a `POST /login` from a blocked origin still reached the server, and the same thing happened from the page on `127.0.0.1`. Simple requests are sent first and judged afterwards. That is the setup behind CSRF, which Topic 86 covers: an API that changes data cannot rely on CORS to defend itself. This folder shows only that the request arrives, not a full CSRF attack.
- **A CORS error is not fixed from the frontend.** The fix lives in the server's response headers. A development proxy that makes the browser see one origin is another way around the problem. That route is not demonstrated here.

### Common mistakes

| Mistake | What you see | What is true |
| --- | --- | --- |
| Using `cors()` with no options on an API that has logged-in users | It works, because everything is allowed | Every origin is allowed, and `*` plus cookies is refused by browsers |
| `origin: "*"` together with `credentials: true` | `credentials: "include"` requests blocked with the wildcard message above | Credentialed requests need a specific origin |
| Origin list written as `localhost` while the app runs on `127.0.0.1` | Everything blocked | Matching is exact on scheme, host and port |
| `cors()` registered after some routes | Those routes (and their error responses) have no CORS headers | Middleware runs in registration order |
| Reading the error in the page's `catch` block | Only `TypeError: Failed to fetch` | The reason is written to the DevTools console, not to the page's code |

### Practical tips

- Allow specific origins, from an environment variable (Topic 79) so each environment can differ, rather than a hard-coded list in the code.
- Register `cors()` first, before the routes and before the error handler.
- If a frontend sends an `Authorization` header or a JSON body, expect a preflight, and keep `methods` and `allowedHeaders` in line with what the frontend actually sends.
- Set `credentials: true` only if you use cookies, and then never combine it with `*`.
- Add `maxAge` to cut down the number of preflight round trips.
- When debugging, check the server's request log and the browser console together. The log shows whether a request arrived. The console says why the browser hid the answer.
- Remember what CORS cannot do, and keep authentication and CSRF protection in the places the later topics describe.

## Resources

- MDN, Cross-Origin Resource Sharing (CORS): <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS>
- MDN, Same-origin policy: <https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy>
- MDN, Access-Control-Max-Age: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Max-Age>
- The `cors` package on npm: <https://www.npmjs.com/package/cors>

## Practice

1. Run `node verify-in-browser.js http://localhost:4700 http://127.0.0.1:5000` against `api-manual-cors.js`, then add `"http://127.0.0.1:5000"` to `ALLOWED_ORIGINS` and run it again. Write down which scenarios change and why.
2. In `api-cors-package.js`, remove `"Authorization"` from `allowedHeaders`. Predict which scenario breaks and whether the real request reaches the server, then run it and compare with the server log.
3. Change `ALLOWED_ORIGINS` in `api-manual-cors.js` so it reads a comma-separated list from an environment variable, and fail at startup if the variable is missing (the Topic 79 pattern).
4. Move the `/boom` route in `api-cors-order.js` after `cors()` and confirm the page now gets a readable 500. Then add a custom error-handling middleware (Topic 78) that returns JSON, and check whether the CORS headers survive.
5. Add a second route that changes data with a plain form-style `POST`, call it from the demo page against `api-no-cors.js`, and use the server log to show that it ran even though the page was blocked. Explain what that means for Topic 86.

## Code Example

- [common.js](./12-cors/common.js)
- [api-no-cors.js](./12-cors/api-no-cors.js)
- [api-manual-cors.js](./12-cors/api-manual-cors.js)
- [api-cors-package.js](./12-cors/api-cors-package.js)
- [api-cors-order.js](./12-cors/api-cors-order.js)
- [page-server.js](./12-cors/page-server.js)
- [frontend/index.html](./12-cors/frontend/index.html)
- [frontend/app.js](./12-cors/frontend/app.js)
- [verify-in-browser.js](./12-cors/verify-in-browser.js)
- [preflight-cache-check.js](./12-cors/preflight-cache-check.js)

To run it yourself, run `npm install` in the project folder, then open two terminals. In the first, run `node page-server.js` (the page, on port 5000). In the second, start one API variant, for example `node api-cors-package.js 4700 allowlist`. The other variants are `node api-no-cors.js 4700`, `node api-manual-cors.js 4700` and `node api-cors-order.js 4700`, and the package accepts the modes `allowlist`, `no-max-age`, `default` and `wildcard`.

To see it in a real browser, open `http://localhost:5000`, open the DevTools console and Network tab, and click the button. The page prints a generic `TypeError` for a blocked request, and the real reason appears in the console. To get the same results printed to the terminal, run `node verify-in-browser.js http://localhost:4700 http://localhost:5000`. That script needs a Chromium: either run `npx playwright install chromium` once, or point `CHROMIUM_PATH` at a Chrome or Chromium you already have. `node preflight-cache-check.js http://localhost:4700 http://localhost:5000` repeats the caching measurement (watch the server's terminal for `OPTIONS` lines).

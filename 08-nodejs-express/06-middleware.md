# Middleware

**Topic 76 of 89** (Section: Node.js / Express, 6 of 12)

## Notes

### Project structure

```text
logging-middleware.js         -> app.use(), middleware order, next()
path-scoped-middleware.js      -> app.use(path, middleware), gating a prefix
built-in-middleware.js         -> express.json(), express.urlencoded(), express.static()
public/hello.txt               -> the file served by express.static() above
router-middleware.js            -> router.use(), middleware scoped to one router
routes/admin.js                 -> the router with its own router.use()
next-err-demo.js                -> next(err) skipping to error-handling middleware
third-party-morgan-demo.js       -> morgan, a real npm middleware package
```

This project uses Express 5.3.0, the same version from Topic 75 (Express Routing). That topic ended with a short chain of route handlers using `next()`; this topic is about generalizing that exact pattern into reusable, independent functions, middleware, that can run before any route, across many routes, or across a whole app.

### What middleware actually is

A middleware function has the signature `(req, res, next)`. It can read or modify `req`/`res`, end the request itself (`res.json(...)`, `res.send(...)`, etc.), or call `next()` to hand control to whatever is registered after it. `app.use()` registers a middleware function to run on every request (or every request under a given path prefix, see below), regardless of HTTP method.

```js
function requestLogger(req, res, next) {
  console.log(`[logger] ${req.method} ${req.originalUrl}`);
  next();
}
app.use(requestLogger);
```

### Middleware runs in registration order, every time

`logging-middleware.js` registers two global middleware functions, `requestLogger` then `addRequestId`, before any route. Verified directly:

```text
GET /
[logger] GET /
[request-id] assigned j9jjqu
[handler] running for request j9jjqu

GET /about
[logger] GET /about
[request-id] assigned guua3d
[handler] running for request guua3d
```

Every single request runs through the exact same sequence: logger, then request-id, then whichever route handler matches. This is the whole model: a pipeline of functions, each one choosing to continue it (`next()`) or stop it (sending a response).

### app.use(path, middleware): scoping to a path prefix

```js
app.use("/admin", requireApiKey);
```

A path passed as the first argument to `app.use()` means the middleware only runs for requests whose path starts with that prefix. `path-scoped-middleware.js` gates everything under `/admin` behind an `x-api-key` header check, while `/` stays completely public. Verified directly:

```text
GET /                                    -> 200 {"message":"public home page, no key needed"}
GET /admin/dashboard  (no key)            -> 401 {"error":"missing or invalid x-api-key"}
GET /admin/dashboard  (wrong key)         -> 401 {"error":"missing or invalid x-api-key"}
GET /admin/users      (correct key)       -> 200 {"message":"admin user list"}
```

The server's own log confirms `requireApiKey` ran twice, both times for an `/admin/*` request, and never for `GET /`:

```text
[admin-auth] missing/wrong key, blocking
[admin-auth] missing/wrong key, blocking
[admin-auth] key ok, continuing
```

### Built-in middleware: express.json, express.urlencoded, express.static

Express ships several middleware functions itself, but none of them run unless you explicitly `app.use()` them.

```js
app.use(express.json());                         // parses a JSON body into req.body
app.use(express.urlencoded({ extended: true }));   // parses an HTML form POST into req.body
app.use("/static", express.static(path.join(__dirname, "public")));  // serves files directly
```

Verified directly, the same field sent two different ways comes back with two different types:

```text
POST /echo-json  {"name":"Nadia","age":30}        -> req.body = { name: 'Nadia', age: 30 }   (age is a number)
POST /echo-form   name=Nadia&age=30                 -> req.body = { name: 'Nadia', age: '30' }  (age is a string)
```

Form encoding has no concept of a number type, every field arrives as a string; real JSON preserves the original type. `express.static()` was verified serving a real file directly from disk with no route written for it, and correctly falling through to Express's normal 404 handling for a file that doesn't exist:

```text
GET /static/hello.txt              -> 200, "This is a static file served by express.static()."
GET /static/does-not-exist.txt     -> 404, "Cannot GET /static/does-not-exist.txt"
```

### router.use(): middleware scoped to one router

A middleware registered with `router.use()` (not `app.use()`) only ever runs for requests handled by that specific router, wherever it ends up mounted.

```js
// routes/admin.js
router.use(logAdminAccess);
router.get("/stats", ...);
router.get("/reports", ...);

// the main app
app.use("/admin", adminRouter);
```

Verified directly, `GET /` never triggers the router's own logger at all, only requests that actually reached the router do, and they log the full mounted path:

```text
GET /                -> {"message":"public home, no admin-router middleware involved"}
GET /admin/stats      -> {"visits":1042,"signups":37}
GET /admin/reports    -> {"reports":["jan.csv","feb.csv"]}

server log:
[admin-router] GET /admin/stats
[admin-router] GET /admin/reports
```

This is the same composition idea as Topic 75's `express.Router()`, a router's own middleware travels with it to wherever it gets mounted, without needing to know its own prefix in advance.

### next(err): skipping straight to error-handling middleware

Calling `next()` with an argument is a distinct signal from calling it with none. Express treats any value passed to `next()` as an error and skips every remaining normal middleware and route handler, jumping directly to an error-handling middleware instead, a function recognized purely by having **four** parameters: `(err, req, res, next)`.

```js
function checkUserId(req, res, next) {
  if (!/^\d+$/.test(req.params.id)) {
    const err = new Error(`invalid user id: "${req.params.id}"`);
    err.status = 400;
    return next(err);
  }
  next();
}

app.get("/users/:id", checkUserId, (req, res) => { ... });

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});
```

Verified directly:

```text
GET /users/42   (valid)    -> 200 {"id":"42","name":"User 42"}
GET /users/abc  (invalid)  -> 400 {"error":"invalid user id: \"abc\""}

server log for /users/abc:
[error-handler] caught: invalid user id: "abc"
```

The ordinary route handler's own log line never printed for `/users/abc`, proving the error handler was reached directly, not through the normal handler at all. Topic 78 (Error Handling Middleware) covers this mechanism in much more depth; this is only the minimal proof that it works.

### Third-party middleware is the same shape as your own

`morgan`, a widely used npm logging package, is used here to show that a middleware function from npm plugs in exactly the same way as `express.json()` or a hand-written function, there's nothing special about where it came from.

```js
const morgan = require("morgan");
app.use(morgan("dev"));
```

Verified directly, real request logs from morgan itself, including an accurate response time for a deliberately slowed-down route:

```text
GET / 200 1.841 ms - 4
GET /slow 200 151.124 ms - 18     <- route has a 150ms setTimeout, morgan measured ~151ms
GET /missing 404 0.593 ms - 20
```

### Practical tips

- Middleware order is not cosmetic, it's the whole mechanism. An auth check registered after the route it's supposed to protect never runs before that route; it has to come first in the file.
- Prefer `router.use()` scoped to a specific `express.Router()` over a broad `app.use()` with manual path logic inside it, it keeps a middleware's reach obvious from where it's registered.
- A middleware that neither calls `next()` nor sends a response leaves the request hanging forever, exactly like a route handler that forgets `res.end()` (Topic 74), this is one of the most common real bugs in Express apps.
- Reach for `next(err)` instead of handling an error inline in every single route; one error-handling middleware at the bottom of the file can catch problems from anywhere upstream of it.

## Resources

- Express Docs, Using middleware: <https://expressjs.com/en/guide/using-middleware.html>
- Express Docs, Writing middleware: <https://expressjs.com/en/guide/writing-middleware.html>
- Express Docs, express.json(): <https://expressjs.com/en/4x/api.html#express.json>
- Express Docs, express.static(): <https://expressjs.com/en/4x/api.html#express.static>
- morgan on npm: <https://www.npmjs.com/package/morgan>

## Practice

1. Add a third global middleware to `logging-middleware.js` that measures and logs how long the whole request took, by recording a timestamp before `next()` and another after the response finishes (hint: listen for the `res` object's `finish` event).
2. Change `path-scoped-middleware.js` so `/admin` accepts the key from a query string (`?key=secret123`) as a fallback when the header is missing, without removing the header check.
3. Add a second static folder to `built-in-middleware.js`, mounted at `/assets`, and confirm with curl that a file in it is served independently of the existing `/static` mount.
4. Give `routes/admin.js` a second nested router (for example `/admin/billing`) and confirm `logAdminAccess` still fires for requests to it, since router-level middleware applies to everything handled by that router, including its own sub-routes.
5. Change `next-err-demo.js`'s error-handling middleware to return different JSON depending on `err.status` (a generic message for 500, the real message for 400), and confirm both paths with curl.

## Code Example

- [logging-middleware.js](./06-middleware/logging-middleware.js)
- [path-scoped-middleware.js](./06-middleware/path-scoped-middleware.js)
- [built-in-middleware.js](./06-middleware/built-in-middleware.js) · [public/hello.txt](./06-middleware/public/hello.txt)
- [router-middleware.js](./06-middleware/router-middleware.js) · [routes/admin.js](./06-middleware/routes/admin.js)
- [next-err-demo.js](./06-middleware/next-err-demo.js)
- [third-party-morgan-demo.js](./06-middleware/third-party-morgan-demo.js)

To run it yourself: `npm install express morgan` in a folder containing these files, then run any of them with `node <file>.js [port]` and `curl` against it in another terminal, matching the requests shown above.

# Express Routing

**Topic 75 of 89** (Section: Node.js / Express, 5 of 12)

## Notes

### Project structure

```text
basic-routes.js              -> app.get/post, req.params, req.query
route-order-demo.js           -> the /users/new vs /users/:id shadowing bug
route-order-fixed.js           -> the same routes, correctly ordered
routes/users.js, routes/posts.js, router-demo.js  -> express.Router() + app.use(prefix, router)
multiple-handlers-demo.js      -> chaining several handlers on one route
route-chaining-demo.js         -> app.route(path).get().put().delete()
path-patterns-test.js          -> Express 5's current path syntax vs the old Express 4 syntax
path-patterns-demo.js          -> the new optional-segment and wildcard syntax, working
```

This project uses Express 5.3.0, the current major version. A few path patterns changed syntax from Express 4 (path-to-regexp v8 replaced v6 under the hood), and a lot of still-popular tutorials and Stack Overflow answers show the old, now-broken syntax; `path-patterns-test.js` proves exactly what changed.

### req.params and req.query, parsed for you

```js
app.get("/users/:id", (req, res) => {
  res.json({ params: req.params, query: req.query });
});
```

Unlike the raw `http` module (Topic 4), Express extracts named path segments into `req.params` and parses the query string into `req.query` automatically, no manual `new URL(...)` needed. Verified directly:

```text
GET /users/42?sort=desc&limit=5
-> {"params":{"id":"42"},"query":{"sort":"desc","limit":"5"}}

GET /users/7/posts/99   (two named params in one path)
-> {"params":{"userId":"7","postId":"99"}}
```

### Route order matters: first match wins

```js
app.get("/users/:id", ...);   // registered first
app.get("/users/new", ...);   // too late, :id already matches "new"
```

`:id` matches *any* single path segment, including the literal text `new`. Verified directly:

```text
BROKEN order: GET /users/new -> {"matchedRoute":"/users/:id","params":{"id":"new"}}
```

`route-order-fixed.js` simply registers `/users/new` first. Verified directly:

```text
FIXED order: GET /users/new -> {"matchedRoute":"/users/new (the form page)"}
FIXED order: GET /users/42  -> {"matchedRoute":"/users/:id","params":{"id":"42"}}
```

The rule in general: register more specific, literal routes before more general, parameterized ones that could also match them.

### express.Router(): routes that don't know their own prefix

```js
// routes/users.js
const router = express.Router();
router.get("/:id", (req, res) => { ... });
module.exports = router;

// the main app
app.use("/api/v1/users", usersRouter);
```

The router's own file never mentions `/api/v1`, that prefix is decided entirely where it gets mounted. Verified directly:

```text
GET /api/v1/users      -> "GET /users (inside the router)"
GET /api/v1/users/42   -> {"id":"42"}
GET /api/v1/posts/7    -> {"id":"7"}   (a second router, posts.js, mounted at /api/v1/posts)
POST /api/v1/users     -> HTTP 201
```

This is what makes a route file reusable and testable on its own, and what keeps a large app's routes organized by resource (`routes/users.js`, `routes/posts.js`, ...) instead of one enormous file.

### Multiple handlers on one route: next() moves to the next one

```js
app.get("/users/:id", checkIdIsNumeric, loadFakeUser, sendUser);
```

Each handler receives `(req, res, next)`; calling `next()` passes control to the next handler for *this same route*; responding instead (`res.json(...)`) stops the chain right there. Verified directly:

```text
GET /users/42  (valid)
  checkIdIsNumeric: passed, calling next()
  loadFakeUser: attached req.user, calling next()
  sendUser: final handler, sending response
  -> {"user":{"id":"42","name":"User 42"}}

GET /users/abc  (invalid)
  -> HTTP 400 {"error":"id must be numeric"}
  (no further log lines: loadFakeUser and sendUser never ran)
```

`req.user`, attached by the second handler, was readable by the third, handlers in a chain share the same `req`/`res` objects. This exact pattern, a small chain of focused handlers instead of one giant function, is the foundation Topic 76 (Middleware) builds on directly.

### app.route(): grouping by path instead of by method

```js
app
  .route("/users/:id")
  .get((req, res) => { ... })
  .put((req, res) => { ... })
  .delete((req, res) => { ... });
```

Functionally identical to three separate `app.get`/`app.put`/`app.delete` calls repeating the same path string, just grouped so the path is written once. Verified directly:

```text
GET /users/5    -> {"method":"GET","id":"5"}
PUT /users/5    -> {"method":"PUT","id":"5","body":{"name":"Nadia"}}
DELETE /users/5 -> HTTP 204 No Content
```

### Express 5 changed its path pattern syntax

```text
FAIL  "/users/:id?" (old optional-param syntax) -> Unexpected ? at index 10
FAIL  "/files/*"    (old bare wildcard)          -> Missing parameter name at index 8
OK    "/users{/:id}" (new optional-segment syntax)
OK    "/files/*splat" (new named wildcard)
```

The old Express 4 syntax doesn't just behave differently, it throws at startup in Express 5. The new syntax, verified working at request time:

```text
GET /users           -> params: {}               (optional segment omitted)
GET /users/42         -> params: {"id":"42"}        (optional segment present)
GET /files/images/2026/photo.png
  -> params: {"splat":["images","2026","photo.png"]}   <- an ARRAY of segments, not one string
```

A named wildcard's capture comes back as an array of the matched path segments, not a single concatenated string, worth knowing before writing code that assumes `req.params.splat.startsWith(...)`.

### Practical tips

- Order genuinely matters in Express: read a route file top to bottom the way Express itself will try each pattern, in order, stopping at the first match.
- Group related routes into their own `express.Router()` per resource (`routes/users.js`, `routes/orders.js`, ...) from early on; retrofitting this split onto one giant `app.js` later is far more work.
- A handler that doesn't call `next()` and doesn't send a response (no `res.json`/`res.send`/`res.end`) leaves the request hanging forever, the same `res.end()` requirement from Topic 4 applies to every handler in a chain, not just the last one.
- Don't copy path-pattern syntax (`:id?`, bare `*`) from older Express 4 material without checking it against the actual installed version; `path-patterns-test.js` is a quick way to check what a given Express version actually accepts.

## Resources

- Express Docs, Routing: <https://expressjs.com/en/guide/routing.html>
- Express Docs, express.Router: <https://expressjs.com/en/4x/api.html#router>
- path-to-regexp (the library Express's router is built on): <https://github.com/pillarjs/path-to-regexp>
- Express 5 Migration Guide (path syntax changes): <https://expressjs.com/en/guide/migrating-5.html>

## Practice

1. Add a `DELETE /api/v1/users/:id` route to `routes/users.js` and confirm it's reachable at `/api/v1/users/42` without touching `router-demo.js` at all.
2. Reorder `multiple-handlers-demo.js`'s chain so `loadFakeUser` runs before `checkIdIsNumeric`, and explain, from the output, why that's a worse order even though both still eventually run for valid input.
3. Add a fourth handler to the `/users/:id` chain that runs only when `req.user.id === "1"` (an "admin" check), calling `next()` to continue or responding with 403 otherwise.
4. Rewrite `route-chaining-demo.js`'s three separate `app.get`/`app.put`/`app.delete` equivalent using `app.route()` without it, and compare how many times the path string `"/users/:id"` appears in each version.
5. Register `/files/*splat` and a more specific `/files/public/*splat` in the same app, in both orders, and determine experimentally whether Express's "more specific first" rule from the route-order demo still applies to two wildcard routes.

## Code Example

- [basic-routes.js](./05-express-routing/basic-routes.js)
- [route-order-demo.js](./05-express-routing/route-order-demo.js) · [route-order-fixed.js](./05-express-routing/route-order-fixed.js)
- [router-demo.js](./05-express-routing/router-demo.js) · [routes/users.js](./05-express-routing/routes/users.js) · [routes/posts.js](./05-express-routing/routes/posts.js)
- [multiple-handlers-demo.js](./05-express-routing/multiple-handlers-demo.js)
- [route-chaining-demo.js](./05-express-routing/route-chaining-demo.js)
- [path-patterns-test.js](./05-express-routing/path-patterns-test.js) · [path-patterns-demo.js](./05-express-routing/path-patterns-demo.js)

To run it yourself: `npm install express` in a folder containing these files, then run any of them with `node <file>.js [port]` and `curl` against it in another terminal, matching the requests shown above.

# 8. Node.js / Express

This is the eighth section of the Full Stack Skill Roadmap: twelve topics that take you from how Node loads code and runs an event loop, through building an API with Express 5 (routing, middleware, REST conventions, error handling, configuration), to the pieces a real backend needs: a database connection, JWT authentication, and CORS. Every topic ships a code folder, and the notes report what was actually observed from running that code rather than only what the documentation says.

## Topics in this section

| # | Topic | What it covers | Files |
| --- | ------- | ----------------- | ------- |
| 1 | Modules (CommonJS) | `exports` vs `module.exports` and the reassignment trap, `require()` caching by resolved file path, circular requires returning a snapshot, the real module wrapper function, and how `require()` finds a file. | [Notes](./01-modules-commonjs.md) · [Code](./01-modules-commonjs/) |
| 2 | Event Loop in Node | The phase model, `setTimeout(fn, 0)` vs `setImmediate()` (only deterministic inside I/O), `process.nextTick()` outranking promise microtasks, recursive `nextTick` starving timers and I/O, and the libuv thread pool's default size of 4. | [Notes](./02-event-loop-in-node.md) · [Code](./02-event-loop-in-node/) |
| 3 | File System (fs) | Callback, promise and sync API styles, a sync call blocking the whole event loop, loading a whole file vs streaming it, the `"wx"` flag for race-safe file creation, `fs.watch`, and directories and stats. | [Notes](./03-file-system-fs.md) · [Code](./03-file-system-fs/) |
| 4 | Request/Response Cycle | A plain `http.createServer` with no framework: `req` as a readable stream with no `req.body`, why `res.end()` is not optional, headers that can only be sent once, and streaming vs buffering a response. | [Notes](./04-request-response-cycle.md) · [Code](./04-request-response-cycle/) |
| 5 | Express Routing | `req.params` and `req.query`, first-match-wins route order, `express.Router()`, multiple handlers chained with `next()`, `app.route()`, and the path pattern syntax that changed in Express 5. | [Notes](./05-express-routing.md) · [Code](./05-express-routing/) |
| 6 | Middleware | What middleware is, registration order, path-scoped `app.use`, the built-ins (`express.json`, `express.urlencoded`, `express.static`), `router.use`, `next(err)`, and third-party middleware such as `morgan`. | [Notes](./06-middleware.md) · [Code](./06-middleware/) |
| 7 | REST API Design | Noun URLs, HTTP methods mapped to CRUD with the right status codes, PUT vs PATCH, idempotency, modeling an action as a sub-resource, filtering and sorting through query parameters, and versioning in the URL. | [Notes](./07-rest-api-design.md) · [Code](./07-rest-api-design/) |
| 8 | Error Handling Middleware | Express's built-in default error handler, Express 5 catching errors from async handlers, operational errors vs bugs with a custom `Error` class, a centralized handler with a 404 fallback, and chained error handlers. | [Notes](./08-error-handling-middleware.md) · [Code](./08-error-handling-middleware/) |
| 9 | Environment Config | Nothing loads `.env` for you and every value is a string, Node's `--env-file` flag vs `dotenv`, a real environment variable beating the `.env` file, per-environment files, and one validated config module. | [Notes](./09-environment-config.md) · [Code](./09-environment-config/) |
| 10 | Connecting Database (Mongoose/Prisma) | Mongoose schemas and validation, casting (a failed cast does not throw), lazy queries, what connection failure looks like, buffering and its timeout, startup order with Express, and Prisma's schema file and generated client. The Mongoose CRUD file and the Prisma client file were written but not run, and are labelled that way. | [Notes](./10-connecting-database.md) · [Code](./10-connecting-database/) |
| 11 | JWT Authentication | A token's anatomy (signed, not encrypted), `decode()` vs `verify()`, expiry and algorithm pinning, a bearer-token middleware with role checks, 401 vs 403, and revoking tokens with a denylist. | [Notes](./11-jwt-authentication.md) · [Code](./11-jwt-authentication/) |
| 12 | CORS | Origins and the same-origin policy, CORS being enforced by the browser, simple vs preflighted requests, hand-written CORS vs the `cors` package, credentials and the wildcard rule, exact-match origins, `Vary: Origin`, preflight caching, and middleware order. | [Notes](./12-cors.md) · [Code](./12-cors/) |

## How the section fits together

Modules, the Event Loop, File System and the Request/Response Cycle (Topics 1 to 4) are the runtime foundation, and none of them use a framework. They cover how Node loads code, why one thread can serve many requests, why a synchronous call is dangerous inside a server, and what an HTTP request looks like before anything wraps it. Topic 4's plain server is worth keeping in mind for the rest of the section, because it shows what Express quietly does for you: there is no `req.body` there, and a response never finishes until `res.end()` is called.

Express Routing, Middleware and REST API Design (Topics 5 to 7) are the core of the framework. Routing decides which handler runs, middleware is the shared mechanism that runs around handlers, and REST gives you conventions for how the routes should be shaped. Error Handling Middleware (Topic 8) is a direct continuation of Topic 6, since `next(err)` is what carries an error to the handler, and Environment Config (Topic 9) provides the validated settings the later topics read.

Connecting Database, JWT Authentication and CORS (Topics 10 to 12) are the production concerns layered on top of that base. The JWT check is a middleware (Topic 6) that answers with the status codes and error shapes from Topics 7 and 8 and reads its secret from the config module (Topic 9). CORS is a middleware too, so where it is registered matters, and it connects back to Topic 11: the moment a frontend sends an `Authorization` header, the browser sends a preflight request first. Several topics also turned up results that are easy to get wrong without running the code: a failed Mongoose cast does not throw, `jwt.decode()` happily accepts a forged token that `jwt.verify()` rejects, and a CORS-blocked request can still have reached the server.

Topic 12 also points forward. This section deliberately leaves password storage, XSS and CSRF to the next section, Web Security Basics, and the JWT demo's plain-text password comparison is flagged as a shortcut for exactly that reason.

## How each topic is structured

Every topic has a `.md` notes file and a code folder of small, runnable examples. The notes report what was actually observed from running the code, usually under "Verified directly" callouts, and Topic 12 states up front that every result in it was measured in a real browser. Topics 1 to 4 use only Node's built-in modules (plus a tiny local package inside Topic 1's folder), so they need no install. From Topic 5 onward every folder has a `package.json` with Express `^5.3.0`, and `npm install` is all the setup needed.

Two things are labelled as not run. In Topic 10, `mongoose/crud-pattern.js` and `prisma/demo.ts` need a live database or a generated Prisma engine that was not available when the section was built. They are marked as such in their file headers and in the notes, and what could be checked (the schema, the config shape, the typings) was checked and reported separately. Topic 12's `verify-in-browser.js` needs a Chromium, either through `npx playwright install chromium` or a `CHROMIUM_PATH` pointing at a Chrome or Chromium you already have.

## Suggested capstone exercise

Build a small bookshelf API with accounts, and a tiny frontend on a different port. Split the server into CommonJS modules (Topic 1), keep synchronous `fs` calls out of request handlers, and read any seed file once at startup (Topics 2 and 3). Put the routes in `routes/books.js` and `routes/auth.js` routers mounted under `/api/v1` (Topic 5), follow the REST conventions for nouns, status codes, PUT vs PATCH and filtering through query parameters (Topic 7), and add a request-logging middleware (Topic 6). Write a `config.js` that validates `PORT`, `MONGODB_URI`, `JWT_SECRET` and `CORS_ORIGINS` at startup and refuses to run if one is missing (Topic 9). Model `Book` and `User` with Mongoose validation and connect to the database before listening (Topic 10). Add a central error handler with a custom error class and a 404 fallback (Topic 8). Add `POST /auth/login` that returns a short-lived JWT, a `requireAuth` middleware, and a `requireRole("admin")` check on book deletion, returning 401 and 403 correctly (Topic 11, and keep the plain-text password shortcut out of your version). Finally, register `cors()` first with an allowlist read from `CORS_ORIGINS`, serve a small page from another port, and confirm in the browser that a request carrying an `Authorization` header gets through its preflight (Topic 12).

## Previous section

[Next.js](../07-nextjs/README.md)

## Next section

[Web Security Basics](../09-web-security-basics/README.md)

[Back to main roadmap](../README.md)

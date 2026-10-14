# Error Handling Middleware

**Topic 78 of 89** (Section: Node.js / Express, 8 of 12)

## Notes

### Project structure

```text
default-error-handler-demo.js   -> what Express does with NO custom error handler at all
sync-vs-async-errors.js          -> sync throw vs async throw, both auto-caught in Express 5
app-error.js                      -> a custom Error subclass marking "expected" errors
central-error-handler.js           -> one centralized handler, a 404 fallback, operational vs unexpected errors, NODE_ENV
multiple-error-handlers.js          -> chaining more than one error handler with next(err)
```

Topic 76 (Middleware) ended with a short proof that `next(err)` jumps straight to an error-handling middleware, a function recognized by its four parameters: `(err, req, res, next)`. This topic builds that single fact into a complete, realistic error-handling strategy for an Express app: what Express does automatically, what still needs writing by hand, and how to structure it so every error in the app, expected or not, ends up in one place.

### Express has a built-in default error handler, with no code required

`default-error-handler-demo.js` registers no error-handling middleware at all. Verified directly, Express still responds instead of hanging or crashing:

```text
GET /boom  (NODE_ENV unset)
-> 500, an HTML page containing the full error message and stack trace

GET /boom  (NODE_ENV=production)
-> 500, an HTML page containing only "Internal Server Error", no stack trace
```

Express's own default handler already makes the production-vs-development distinction for stack traces, it reads `NODE_ENV` the same way the centralized handler below does by hand. The practical reason to still write a custom error handler is control: a real API wants JSON, not an HTML page, consistent error shapes a frontend can parse, and a single place to log or report errors, none of which the default handler gives you.

### Express 5 catches thrown errors from async route handlers automatically

This is the most important, genuinely version-specific fact in this topic, and a lot of still-circulating Express 4 tutorials get it wrong for Express 5. `sync-vs-async-errors.js` has three routes: one throws synchronously, one throws inside an `async` function after an `await`, and one explicitly rejects a promise. None of them have a `try/catch`. Verified directly, all three reach the exact same centralized error handler:

```text
GET /sync-error              -> 500 {"error":"thrown synchronously, no async involved"}
GET /async-error              -> 500 {"error":"thrown from inside an async function"}
GET /async-rejected-promise    -> 500 {"error":"an explicitly rejected promise"}

server log:
[error-handler] caught: thrown synchronously, no async involved
[error-handler] caught: thrown from inside an async function
[error-handler] caught: an explicitly rejected promise
```

A request made right after `/async-error` still got a normal response from `/sync-error`, confirming the process never crashed, Express genuinely handled each error rather than the server happening to survive an uncaught exception. A synchronous throw inside a plain handler has always been caught automatically, in every Express version, because it happens on the same call stack Express itself called the handler from. An `async` function's thrown error, by contrast, becomes a rejected Promise on a *different*, later turn of the event loop, Express 4 had no way to see that promise and would silently swallow the error (or crash the process, depending on the situation) unless the handler was manually wrapped in a `try/catch` calling `next(err)`, or wrapped with a third-party helper like `express-async-handler`. Express 5 added this automatically: if a route handler returns a Promise, Express attaches its own `.catch(next)` to it internally. Writing an `async` handler in Express 5 with no wrapper, as every handler in this topic does, is now both simpler and correct.

### Operational errors vs unexpected bugs: a custom Error class

```js
// app-error.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

`AppError` exists to mark the difference between two very different kinds of failure: an **operational** error (a client asked for a user that doesn't exist, or sent an invalid body, both expected, both safe to describe to the client) versus an **unexpected bug** (a real programmer mistake, like calling a method on `undefined`, which should never be shown to a client in detail). `central-error-handler.js` checks `err.isOperational` to decide which treatment an error gets.

### A centralized handler, and a 404 fallback for unmatched routes

```js
// registered after every real route, before the error handler
app.use((req, res, next) => {
  next(new AppError(`cannot find ${req.method} ${req.originalUrl} on this server`, 404));
});

// the centralized error handler, always last
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  if (err.isOperational) {
    return res.status(statusCode).json({ error: err.message });
  }
  console.error("[UNEXPECTED ERROR]", err);
  res.status(500).json({
    error: "something went wrong on our end",
    ...(process.env.NODE_ENV !== "production" && { debug: err.message, stack: err.stack }),
  });
});
```

A request that matches no route at all is not automatically an "error" to Express, it just falls through with nothing left to run. The extra `app.use()` right before the error handler turns that silence into a real `AppError` so the exact same centralized logic handles it too, instead of needing special-case 404 logic duplicated elsewhere. Verified directly:

```text
GET /users/1    (exists)              -> 200 {"data":{"id":1,"name":"Nadia"}}
GET /users/999  (operational 404)      -> 404 {"error":"no user with id 999"}
POST /users     (missing name, 400)     -> 400 {"error":"name is required"}
GET /nope       (no matching route at all) -> 404 {"error":"cannot find GET /nope on this server"}

GET /crash  (real bug: undefined.triggerTypeError(), NODE_ENV unset)
-> 500 {"error":"something went wrong on our end","debug":"Cannot read properties of undefined (reading 'triggerTypeError')","stack":"TypeError: ..."}

GET /crash  (NODE_ENV=production)
-> 500 {"error":"something went wrong on our end"}
```

The same bug, the same route, produced debug detail in development and a single safe sentence in production, purely from the `NODE_ENV` check, while every operational error returned its real, intentional message in both modes, since those were always meant to be shown. The server log additionally shows `[UNEXPECTED ERROR]` plus the full stack for `/crash` every time, regardless of `NODE_ENV`, the hiding only applies to what the *client* sees, the real detail is still logged server-side where it's actually needed for debugging.

### More than one error handler: next(err) chains them too

```js
app.use((err, req, res, next) => {
  console.log(`would report to a monitoring service: ${err.message}`);
  next(err); // pass the SAME error to the next error handler
});

app.use((err, req, res, next) => {
  err.trackingId = "trk_" + Math.random().toString(36).slice(2, 8);
  next(err);
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, trackingId: err.trackingId });
});
```

Calling `next(err)` from inside an error handler works exactly like calling `next()` from a normal middleware, it passes control (and the same error object) to the *next* error handler in line, not back to normal middleware. `multiple-error-handlers.js` chains three: one that only logs, one that decorates the error with a tracking id, and one that finally responds. Verified directly:

```text
GET /fail -> 500 {"error":"deliberate failure for this demo","trackingId":"trk_2qqf2h"}

server log, in order:
[error-logger] would report to a monitoring service: deliberate failure for this demo
[error-tracker] assigned trk_2qqf2h
[error-responder] sending response for trk_2qqf2h
```

The `trackingId` assigned by the second handler was still present by the time the third handler read it off `err`, the same error object really does flow through the whole chain, the same way `req`/`res` flow through a chain of normal middleware.

### Practical tips

- Even in Express 5, a synchronous callback passed to something else (a `setTimeout`, an event listener, a raw callback-style API) is NOT automatically caught the way a returned Promise is; only a thrown error on the handler's own call stack, or a Promise the handler itself returns, gets this treatment.
- Keep the error-handling middleware, and the 404 fallback before it, at the very bottom of the file, after every real route and every normal middleware; Express matches error handlers by position just like everything else.
- Reserve the unguarded, full `err.stack` for logs and development responses only; shipping a stack trace to a production client leaks internal file paths and implementation detail for no real benefit to the client.
- A custom `AppError` class (or similar) pays for itself the moment an app has more than a couple of routes, it turns "is this safe to show the client" from a judgment call made differently in every route into one `isOperational` flag checked in exactly one place.

## Resources

- Express Docs, Error Handling: <https://expressjs.com/en/guide/error-handling.html>
- Express 5 Migration Guide (removed need for manual async error wrapping): <https://expressjs.com/en/guide/migrating-5.html>
- Node.js Docs, Error.captureStackTrace: <https://nodejs.org/api/errors.html#errorcapturestacktracetargetobject-constructoropt>

## Practice

1. Add a `ValidationError` subclass of `AppError` that always uses status `422`, and use it in `POST /users` instead of the generic `AppError(..., 400)`.
2. Change `central-error-handler.js`'s 404 fallback so it also lists the routes that do exist, to help a client that mistyped a path.
3. Add a fourth, earlier error handler to `multiple-error-handlers.js` that only handles errors where `err.statusCode === 400` by responding immediately (never calling `next(err)`), and confirm the later handlers are skipped entirely for that case, same as any other middleware chain.
4. Rewrite one route in `sync-vs-async-errors.js` to manually `try/catch` and call `next(err)` itself, the Express 4 style, and confirm the observable behavior is identical to the automatic Express 5 handling.
5. Add a request counter that increments on every call into the centralized error handler, and expose it at `GET /error-count`, a simple building block for real error-rate monitoring.

## Code Example

- [default-error-handler-demo.js](./08-error-handling-middleware/default-error-handler-demo.js)
- [sync-vs-async-errors.js](./08-error-handling-middleware/sync-vs-async-errors.js)
- [app-error.js](./08-error-handling-middleware/app-error.js)
- [central-error-handler.js](./08-error-handling-middleware/central-error-handler.js)
- [multiple-error-handlers.js](./08-error-handling-middleware/multiple-error-handlers.js)

To run it yourself: `npm install express` in a folder containing these files, then run any of them with `node <file>.js [port]` and `curl` against it, matching the requests shown above. Try `NODE_ENV=production node central-error-handler.js` and `NODE_ENV=production node default-error-handler-demo.js` to see the production-mode responses for yourself.

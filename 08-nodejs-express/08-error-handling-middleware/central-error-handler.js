// central-error-handler.js
// One error-handling middleware at the bottom of the file, reached from
// every route above it, that:
//  - returns a clean, safe message for an expected AppError (operational)
//  - hides the real message/stack for an unexpected bug (not operational)
//  - includes the stack trace only outside of production
//  - also catches requests that never matched any route at all (404)

const express = require("express");
const AppError = require("./app-error");

const app = express();
const port = process.argv[2] || 4402;
app.use(express.json());

const users = [{ id: 1, name: "Nadia" }];

// An expected, operational error: client asked for something invalid.
app.get("/users/:id", (req, res, next) => {
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user) {
    return next(new AppError(`no user with id ${req.params.id}`, 404));
  }
  res.json({ data: user });
});

// Another operational error, this time a validation failure.
app.post("/users", (req, res, next) => {
  if (!req.body || !req.body.name) {
    return next(new AppError("name is required", 400));
  }
  res.status(201).json({ data: { id: users.length + 1, name: req.body.name } });
});

// A genuine, unexpected bug: calling a method that doesn't exist.
// This is deliberately NOT wrapped in an AppError, it represents a real
// programming mistake, not something the client did.
app.get("/crash", (req, res) => {
  const thisDoesNotExist = undefined;
  thisDoesNotExist.triggerTypeError(); // throws a real TypeError
});

// Reached only if no route above matched at all, registered AFTER every
// real route but BEFORE the error handler. This is what turns "nothing
// matched" into an actual error object the centralized handler can see.
app.use((req, res, next) => {
  next(new AppError(`cannot find ${req.method} ${req.originalUrl} on this server`, 404));
});

// The centralized error handler. Four parameters, always registered last.
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (err.isOperational) {
    // A known, expected error: safe to show the real message.
    console.log(`[operational error] ${statusCode}: ${err.message}`);
    return res.status(statusCode).json({ error: err.message });
  }

  // An unexpected bug: never leak the real message or stack to the client,
  // but log the full detail server-side so it can actually be debugged.
  console.error("[UNEXPECTED ERROR]", err);
  res.status(500).json({
    error: "something went wrong on our end",
    ...(process.env.NODE_ENV !== "production" && { debug: err.message, stack: err.stack }),
  });
});

app.listen(port, () => console.log(`central-error-handler listening on ${port}`));

// zod-app.js
// Zod schemas as Express middleware. One reusable validate() checks the
// body, the query string and the URL params, collects every problem, and
// hands a ValidationError to the central error handler (Topic 78 pattern).
//
//   node zod-app.js [port]

const express = require("express");
const { z } = require("zod");

const app = express();
const port = process.argv[2] || 4802;

app.use(express.json());

// ---- the reusable piece ----
class ValidationError extends Error {
  constructor(details) {
    super("validation failed");
    this.name = "ValidationError";
    this.status = 400;
    this.details = details;
  }
}

function validate({ body, query, params }) {
  const parts = { body, query, params };
  return (req, res, next) => {
    const details = [];
    const validated = {};

    for (const [where, schema] of Object.entries(parts)) {
      if (!schema) continue;
      const result = schema.safeParse(req[where]);
      if (result.success) {
        validated[where] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ in: where, field: issue.path.join(".") || "(root)", message: issue.message });
        }
      }
    }

    if (details.length > 0) return next(new ValidationError(details));

    // Validated data goes on its own property. Do NOT assign to req.query:
    // in Express 5 it is a read-only getter (see express-input-limits.js).
    req.validated = validated;
    next();
  };
}

// ---- schemas ----
const idParam = z.object({
  id: z.string().regex(/^\d+$/, "must be a whole number").transform(Number),
});

const newUser = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  age: z.number().int().min(0).max(150).optional(),
});

// strictObject: unknown keys are an ERROR here instead of being dropped
const userPatch = z
  .strictObject({
    name: z.string().trim().min(1).max(100).optional(),
    age: z.number().int().min(0).max(150).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "send at least one field to change" });

const listQuery = z.object({
  q: z.string().trim().max(50).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(1000)).default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
  active: z.stringbool().optional(),
});

// ---- routes ----
const users = [];

app.post("/users", validate({ body: newUser }), (req, res) => {
  const user = { id: users.length + 1, role: "user", ...req.validated.body };
  users.push(user);
  res.status(201).json(user);
});

app.get("/users", validate({ query: listQuery }), (req, res) => {
  const { q, page, limit } = req.validated.query;
  const matching = users.filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()));
  res.json({ query: req.validated.query, total: matching.length, users: matching.slice((page - 1) * limit, page * limit) });
});

app.get("/users/:id", validate({ params: idParam }), (req, res) => {
  const user = users.find((u) => u.id === req.validated.params.id);
  if (!user) return res.status(404).json({ error: "not_found" });
  res.json(user);
});

app.patch("/users/:id", validate({ params: idParam, body: userPatch }), (req, res) => {
  const user = users.find((u) => u.id === req.validated.params.id);
  if (!user) return res.status(404).json({ error: "not_found" });
  Object.assign(user, req.validated.body);
  res.json(user);
});

// ---- central error handler ----
app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: "validation_failed", details: err.details });
  }
  // body-parser's own errors (bad JSON, body too large) carry a status
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.type || "bad_request" });
  }
  console.error(err);
  res.status(500).json({ error: "internal_error" }); // no stack trace, no message
});

app.listen(port, () => console.log(`zod-app listening on ${port}`));

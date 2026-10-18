// validation-by-hand.js
// The same POST /users as no-validation-app.js, but the body is checked by
// code written out by hand. No library, so every rule is visible. The
// important ideas are the same ones a library applies for you:
//   1. check the TYPE first, then the content
//   2. build a NEW object from an allowlist of fields (never spread the body)
//   3. collect every problem, then answer once with a 400
//
//   node validation-by-hand.js [port]

const express = require("express");

const app = express();
const port = process.argv[2] || 4801;

app.use(express.json());

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Returns { value } when the input is acceptable, otherwise { errors }.
function validateNewUser(body) {
  const errors = [];

  if (!isPlainObject(body)) {
    return { errors: [{ field: "(body)", message: "must be a JSON object" }] };
  }

  // name: required string, 1 to 100 characters after trimming
  let name = body.name;
  if (typeof name !== "string") {
    errors.push({ field: "name", message: "must be a string" });
  } else {
    name = name.trim();
    if (name.length < 1 || name.length > 100) {
      errors.push({ field: "name", message: "must be 1 to 100 characters" });
    }
  }

  // email: required string, length-capped BEFORE any pattern check
  let email = body.email;
  if (typeof email !== "string") {
    errors.push({ field: "email", message: "must be a string" });
  } else {
    email = email.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: "email", message: "must be a valid email address" });
    }
  }

  // age: optional integer from 0 to 150
  let age = body.age;
  if (age !== undefined && (!Number.isInteger(age) || age < 0 || age > 150)) {
    errors.push({ field: "age", message: "must be a whole number from 0 to 150" });
  }

  if (errors.length > 0) return { errors };

  // A NEW object with only the fields we chose. "role", "id" and anything
  // else the client sent are simply never copied.
  return { value: { name, email, ...(age !== undefined && { age }) } };
}

const users = [];

app.post("/users", (req, res) => {
  const { value, errors } = validateNewUser(req.body);
  if (errors) return res.status(400).json({ errors });

  const user = { id: users.length + 1, role: "user", ...value };
  users.push(user);
  res.status(201).json(user);
});

app.get("/users", (req, res) => res.json(users));

app.listen(port, () => console.log(`validation-by-hand listening on ${port}`));

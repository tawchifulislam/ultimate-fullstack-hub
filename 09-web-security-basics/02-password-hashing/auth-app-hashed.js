// auth-app-hashed.js
// Register and log in with HASHED passwords, replacing the plain-text
// comparison that Topic 81's auth-app.js used as a demo shortcut.
//
//   JWT_SECRET="a-long-random-string" node auth-app-hashed.js [port]
//
// Combines: validation (Topic 83), argon2id hashing (this topic), JWT (Topic 81).

const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { createPasswordService } = require("./password-service");

const registerBody = z.strictObject({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, "3 to 30 characters: a-z, 0-9, underscore"),
  // Length rules only, as a design choice for this demo. The upper limit keeps
  // absurd inputs out (there is no legitimate reason to send megabytes of
  // "password", and bcrypt ignores everything past 72 bytes anyway).
  // NOTE: no .trim(): changing a password silently could make it impossible to enter again.
  password: z.string().min(8).max(128),
});

// At login the password is only checked for being a string of sane size,
// so the response does not reveal the registration rules.
const loginBody = z.strictObject({
  username: z.string().trim().toLowerCase().max(30),
  password: z.string().max(128),
});

function createApp({
  jwtSecret,
  passwords = createPasswordService(),
  users = new Map(), // username -> { id, username, passwordHash, role }
  equalizeTiming = true,
  log = () => {},
} = {}) {
  if (!jwtSecret) throw new Error("jwtSecret is required");

  const app = express();
  app.use(express.json({ limit: "10kb" }));

  // A real hash of a throwaway password. Verifying against it takes as long as
  // verifying a real user, so "no such user" does not answer faster than "wrong password".
  const ready = passwords.hashPassword(crypto.randomBytes(16).toString("hex")).then((h) => (app.locals.dummyHash = h));

  const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "validation_failed", details: result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) });
    }
    req.validated = result.data;
    next();
  };

  const publicUser = (u) => ({ id: u.id, username: u.username, role: u.role }); // never the hash

  app.post("/register", validate(registerBody), async (req, res, next) => {
    try {
      const { username, password } = req.validated;
      if (users.has(username)) return res.status(409).json({ error: "username_taken" });
      const user = { id: users.size + 1, username, passwordHash: await passwords.hashPassword(password), role: "user" };
      users.set(username, user);
      res.status(201).json(publicUser(user));
    } catch (err) {
      next(err);
    }
  });

  app.post("/login", validate(loginBody), async (req, res, next) => {
    try {
      const { username, password } = req.validated;
      const user = users.get(username);

      if (!user && !equalizeTiming) {
        return res.status(401).json({ error: "invalid credentials" }); // fast path: leaks timing
      }

      const ok = await passwords.verifyPassword(user ? user.passwordHash : app.locals.dummyHash, password);
      if (!user || !ok) return res.status(401).json({ error: "invalid credentials" }); // same body for both cases

      // The password is correct, so this is the one moment we hold the plain text:
      // upgrade an out-of-date hash now.
      if (passwords.needsRehash(user.passwordHash)) {
        user.passwordHash = await passwords.hashPassword(password);
        log(`rehashed password for ${user.username}`);
      }

      const token = jwt.sign({ role: user.role }, jwtSecret, {
        algorithm: "HS256",
        subject: String(user.id),
        expiresIn: "15m",
        jwtid: crypto.randomUUID(),
      });
      res.json({ token });
    } catch (err) {
      next(err);
    }
  });

  app.get("/me", (req, res) => {
    const [scheme, token] = (req.header("authorization") || "").split(" ");
    if (scheme !== "Bearer" || !token) return res.status(401).json({ error: "missing bearer token" });
    try {
      const payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
      const user = [...users.values()].find((u) => String(u.id) === payload.sub);
      if (!user) return res.status(401).json({ error: "invalid token" });
      res.json(publicUser(user));
    } catch {
      res.status(401).json({ error: "invalid token" });
    }
  });

  app.use((err, req, res, next) => {
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.type || "bad_request" });
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  });

  return { app, users, ready };
}

module.exports = { createApp };

if (require.main === module) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("Missing required environment variable: JWT_SECRET");
  const port = process.argv[2] || 4900;
  const { app, ready } = createApp({ jwtSecret, log: console.log });
  ready.then(() => app.listen(port, () => console.log(`auth-app-hashed listening on ${port}`)));
}

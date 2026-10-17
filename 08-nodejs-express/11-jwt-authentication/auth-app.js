// auth-app.js
// JWT authentication in Express: login issues a token, a middleware
// verifies it on every protected request, a second middleware checks the
// role, and logout revokes a token through a server-side denylist.
//
//   JWT_SECRET="a-long-random-string" node auth-app.js [port]
//
// DEMO SHORTCUT: passwords are compared as plain text so this file stays
// about JWTs. Never store or compare passwords like this. Topic 84
// (Password Hashing) covers the correct way.

const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  // Fail fast at startup, the same pattern as Topic 79's config.js.
  throw new Error("Missing required environment variable: JWT_SECRET");
}
const TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const port = process.argv[2] || 4600;

const users = [
  { id: 1, username: "nadia", password: "pw-nadia", role: "author" },
  { id: 2, username: "admin", password: "pw-admin", role: "admin" },
];

// Token ids (jti) that have been revoked. In memory only: it empties when
// the process restarts, and it is not shared between server instances.
const revokedTokenIds = new Set();

const app = express();
app.use(express.json());

// ---- POST /login : exchange credentials for a token ----
app.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) {
    // One message for both "no such user" and "wrong password", so the
    // response does not reveal which usernames exist.
    return res.status(401).json({ error: "invalid credentials" });
  }

  const token = jwt.sign({ role: user.role }, SECRET, {
    algorithm: "HS256",
    subject: String(user.id),
    expiresIn: TOKEN_TTL,
    jwtid: crypto.randomUUID(),
  });
  res.json({ token });
});

// ---- Middleware: require a valid bearer token ----
function requireAuth(req, res, next) {
  const header = req.header("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "missing bearer token" });
  }

  let payload;
  try {
    // Pin the algorithm so a token cannot choose a different one.
    payload = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
  } catch (err) {
    const message = err.name === "TokenExpiredError" ? "token expired" : "invalid token";
    return res.status(401).json({ error: message });
  }

  if (revokedTokenIds.has(payload.jti)) {
    return res.status(401).json({ error: "token revoked" });
  }

  req.user = { id: payload.sub, role: payload.role, jti: payload.jti, exp: payload.exp };
  next();
}

// ---- Middleware factory: require one of the given roles ----
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden: requires role " + roles.join(" or ") });
    }
    next();
  };
}

app.get("/public", (req, res) => res.json({ message: "anyone can read this" }));

app.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

app.get("/admin/stats", requireAuth, requireRole("admin"), (req, res) => {
  res.json({ visits: 1042, signups: 37 });
});

// ---- POST /logout : revoke this token until its natural expiry ----
app.post("/logout", requireAuth, (req, res) => {
  revokedTokenIds.add(req.user.jti);
  res.status(204).end();
});

app.listen(port, () => console.log(`auth-app listening on ${port} (token lifetime ${TOKEN_TTL})`));

// vulnerable-app.js
// A tiny guestbook with THREE deliberate XSS holes. Run it only on your own
// machine, as a lab.
//
//   node vulnerable-app.js [port]
//
//   reflected:  GET /search?q=...            echoes q into the HTML unescaped
//   stored:     POST /comments, GET /        saves a comment, prints it unescaped
//   DOM-based:  /welcome-vulnerable.html     client-side innerHTML from the URL
//
// The "login" (GET /login) sets two cookies: an HttpOnly session cookie and an
// ordinary theme cookie. public/home.js puts a JWT in localStorage, like many
// single-page apps do.

const path = require("path");
const express = require("express");

const page = (body) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Guestbook</title></head><body>${body}</body></html>`;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  const comments = [{ author: "admin", text: "Welcome to the guestbook" }];

  app.get("/login", (req, res) => {
    res.setHeader("Set-Cookie", ["session=s3cr3t-session-id; HttpOnly; Path=/", "theme=dark; Path=/"]);
    res.redirect("/");
  });

  // A session-protected API, the thing a logged-in user's browser can call.
  app.get("/api/me", (req, res) => {
    if (!/(^|;\s*)session=s3cr3t-session-id/.test(req.headers.cookie || "")) {
      return res.status(401).json({ error: "not logged in" });
    }
    res.json({ user: "nadia", email: "nadia@example.com" });
  });

  // ---- 1. reflected XSS ----
  app.get("/search", (req, res) => {
    res.send(page(`<h1>Search</h1><p>You searched for: ${req.query.q || ""}</p>`)); // UNESCAPED
  });

  // ---- 2. stored XSS ----
  app.post("/comments", (req, res) => {
    comments.push({ author: String(req.body.author), text: String(req.body.text) });
    res.status(201).json({ count: comments.length });
  });

  app.get("/", (req, res) => {
    const items = comments.map((c) => `<li><b>${c.author}</b>: ${c.text}</li>`).join(""); // UNESCAPED
    res.send(page(`<h1>Guestbook</h1><ul>${items}</ul><script src="/home.js"></script>`));
  });

  return app;
}

module.exports = { createApp };

if (require.main === module) {
  const port = process.argv[2] || 4950;
  createApp().listen(port, () => console.log(`vulnerable-app listening on ${port}`));
}

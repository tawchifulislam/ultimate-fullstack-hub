// safe-app.js
// The same guestbook with the three holes closed:
//   reflected + stored: ejs templates, where <%= %> escapes HTML by default
//   DOM-based:          textContent instead of innerHTML (public/welcome-safe.js)
// The session cookie also gets SameSite=Lax (more on that in Topic 86).
//
//   node safe-app.js [port]

const path = require("path");
const express = require("express");
const ejs = require("ejs");

const layout = (title, body) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head><body>${body}</body></html>`;

function render(template, data) {
  return layout("Guestbook", ejs.render(template, data));
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  const comments = [{ author: "admin", text: "Welcome to the guestbook" }];

  app.get("/login", (req, res) => {
    res.setHeader("Set-Cookie", ["session=s3cr3t-session-id; HttpOnly; SameSite=Lax; Path=/", "theme=dark; Path=/"]);
    res.redirect("/");
  });

  app.get("/api/me", (req, res) => {
    if (!/(^|;\s*)session=s3cr3t-session-id/.test(req.headers.cookie || "")) {
      return res.status(401).json({ error: "not logged in" });
    }
    res.json({ user: "nadia", email: "nadia@example.com" });
  });

  app.get("/search", (req, res) => {
    res.send(render("<h1>Search</h1><p>You searched for: <%= q %></p>", { q: req.query.q || "" }));
  });

  app.post("/comments", (req, res) => {
    comments.push({ author: String(req.body.author), text: String(req.body.text) });
    res.status(201).json({ count: comments.length });
  });

  app.get("/", (req, res) => {
    res.send(
      render(
        '<h1>Guestbook</h1><ul><% comments.forEach(function (c) { %><li><b><%= c.author %></b>: <%= c.text %></li><% }) %></ul><script src="/home.js"></script>',
        { comments }
      )
    );
  });

  return app;
}

module.exports = { createApp };

if (require.main === module) {
  const port = process.argv[2] || 4951;
  createApp().listen(port, () => console.log(`safe-app listening on ${port}`));
}

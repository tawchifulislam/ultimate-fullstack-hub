# 9. Web Security Basics

This is the ninth section of the Full Stack Skill Roadmap: four topics on the security problems every web backend has to deal with, in the order an attacker meets them. The section starts with the data your server receives (input validation), moves to what happens to the passwords you keep (password hashing), and finishes with the two classic attacks that go through the user's browser: cross-site scripting (XSS) and cross-site request forgery (CSRF). Every topic ships a code folder, and the notes report what was actually observed from running that code. The two browser topics were tested in a real Chromium, with an attacker's page and a victim's logged-in session, and the notes show what leaked or what was blocked rather than only describing it.

## Topics in this section

| # | Topic | What it covers | Files |
| --- | ------- | ----------------- | ------- |
| 1 | Input Validation | Why everything from outside is untrusted and why frontend validation is only a convenience. Hand-written checks vs Zod (`safeParse`, dropping unknown keys vs `strictObject` to stop mass assignment), the `z.coerce` traps on query strings, Zod as Express middleware, Express 5's raw input behavior, NoSQL operator injection, SQL injection and the parameterized-query fix, and a validation regex that freezes the server (ReDoS). | [Notes](./01-input-validation.md) · [Code](./01-input-validation/) |
| 2 | Password Hashing | What a leaked database exposes with plain text, unsalted SHA-256 and salted SHA-256, why speed is the problem, and the slow, tunable alternatives: scrypt (built into Node), bcrypt and argon2id. Hash formats, cost settings, constant-time comparison, why hashing must not block the event loop, login timing that reveals which usernames exist, and upgrading stored hashes at login. | [Notes](./02-password-hashing.md) · [Code](./02-password-hashing/) |
| 3 | XSS | Reflected, stored and DOM-based XSS against a deliberately vulnerable app. What injected script can reach (the `localStorage` JWT, and the API through the victim's `HttpOnly` session), which browser APIs are dangerous sinks, escaping by context, why filtering out `<script>` fails, sanitizing with DOMPurify, what React escapes for you, and Content-Security-Policy and helmet as a second line of defense. | [Notes](./03-xss.md) · [Code](./03-xss/) |
| 4 | CSRF | Why a browser attaches your cookies to a forged request, five attacks against four `SameSite` settings, why same-site is not same-origin, the synchronizer token and the signed double-submit cookie, `Origin` and Fetch Metadata checks, a required custom header, the maintained `csrf-csrf` library, and how XSS or a permissive CORS setup defeats each defense. | [Notes](./04-csrf.md) · [Code](./04-csrf/) |

## How the section fits together

Input Validation (Topic 1) sets the principle that the rest of the section leans on: a server cannot assume anything about what it receives, because the request body, query string, URL params, headers and cookies are all written by whoever sent the request. It also draws a line that the XSS topic picks up again, namely that validation, sanitization and escaping are three different jobs, and that escaping depends on where a value ends up, so it cannot be done once on the way in.

Password Hashing (Topic 2) is the "what if it leaks anyway" topic. Topic 1's injection bugs are one way a database leaks, and the question here is how much damage a leaked table does. It builds directly on the earlier sections: the register and login routes validate input first (Topic 1), hashing is slow work that decides whether the rest of the server keeps responding (the event loop from the Node.js section), and it replaces the plain-text password comparison that the JWT demo used as a flagged shortcut. The measured difference is large. On the sandbox used, a plain JavaScript loop made roughly 500,000 to 900,000 SHA-256 guesses per second on one thread, while a single scrypt hash at OWASP's minimum settings took hundreds of milliseconds.

XSS and CSRF (Topics 3 and 4) are a pair, and they are easiest to keep apart by asking where the attacker's code runs. In XSS it runs **inside** your site, with your origin's powers. In CSRF it runs on the attacker's site and makes the victim's browser send requests **to** yours, and your site needs no bug at all for that to work. The two topics also run into each other in ways that only show up when tested. The XSS lab showed that an `HttpOnly` cookie hides the cookie value but does not stop an injected script from calling the API with it, and that `SameSite=Strict` made no difference to that. The CSRF lab then showed the reverse: a correct CSRF token plus a `Strict` cookie still lost to a single XSS hole, and a CORS configuration that reflects any origin with credentials hands the token to the attacker's page. Fixing XSS first is not a stylistic preference, it is the order the defenses depend on each other.

Several results in this section are easy to get wrong without running the code: `z.coerce.boolean()` turns the text `"false"` into `true`, an ordinary length limit does not save a vulnerable regex because the blow-up starts at about 25 characters, a `<script>` inserted through `innerHTML` does not run while an `<img onerror>` in the same sink does, and a cookie with no `SameSite` attribute let a cross-site form POST through in the first moments after it was set.

## How each topic is structured

Every topic has a `.md` notes file and a code folder of small, runnable examples. The notes report what was actually observed under "Verified directly" callouts, and say so when something was not run. Topics 1 and 2 need only `npm install`: the Express servers use Express `^5.3.0`, and Topic 2 uses the `argon2` package, a native module that installed from a prebuilt binary here. Topic 1's SQL demo uses Node's built-in SQLite and was run on Node 22.22.0 with `node --disable-warning=ExperimentalWarning`.

Topics 3 and 4 drive a real browser, so their labs need a Chromium: set `CHROMIUM_PATH` to a Chrome or Chromium you already have (this is how everything was run), or install one with `npx playwright-core install chromium`, which was not run here. Topic 3 also has demos that need no browser, such as the ejs escaping check, and Topic 4's token helpers and library demo need none.

Some things are labelled as not run, and they are listed in each topic's "does not cover" section. Examples are Topic 2's pepper, Topic 3's DOMPurify on a Node server and React client-side rendering, and Topic 4's `csrf-sync`, sibling-subdomain attacks and the unsigned double-submit weakness. Browser results come from Chromium 141 only.

## Suggested capstone exercise

Take the bookshelf API from the Node.js section and harden it. Put a Zod schema on every route (Topic 1): a strict schema for `PATCH`, a default one that drops unknown keys for creation so a client cannot set its own `role`, and a regex-then-convert pattern for query-string numbers instead of `z.coerce`. Run a parameterized query anywhere user input reaches a database, and check any regex you wrote against a long, almost-valid input. Store account passwords with argon2id behind a single `password-service.js`, verify against a dummy hash when the user does not exist so login timing does not reveal accounts, and rehash at login when the settings change (Topic 2).

Then secure the browser side. Add a small server-rendered page that shows book reviews and escape every value with the template engine's default, build one DOM update with `textContent` instead of `innerHTML`, and send `helmet()` headers with a per-request nonce for any inline script (Topic 3). Put the session in a cookie that is `HttpOnly`, `Secure` in production and explicitly `SameSite=Lax`, make every state-changing route a `POST`, `PUT`, `PATCH` or `DELETE` (so no book is deleted by a `GET`), and add a CSRF token or a required custom header on the JSON API (Topic 4). Finally, write an attack script in the style of the section's labs: use Playwright to submit a review whose text is an `<img onerror>` payload and confirm nothing runs, serve a page from `127.0.0.1` that auto-submits a forged delete and confirm the ledger does not change, and record what happens to each check when you deliberately remove one defense. Rate-limiting the login route belongs to a later section (Topic 89).

## Previous section

[Node.js / Express](../08-nodejs-express/README.md)

## Next section

[API / System Design Basics](../10-api-system-design-basics/README.md)

[Back to main roadmap](../README.md)

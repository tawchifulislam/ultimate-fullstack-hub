# Cross-Site Request Forgery (CSRF)

**Topic 86 of 89** (Section: Web Security Basics, 4 of 4)

## Notes

### Project structure

```text
bank-app.js            -> the target: a tiny bank whose cookie setting and CSRF protection are switches you can flip
attacker-site.js       -> the evil site: six pages, each making one kind of cross-site request to the bank
csrf-token.js          -> the building blocks: a random token, a constant-time compare, a signed double-submit token
lab-common.js          -> shared plumbing for the labs: start servers, log a victim in, open an evil page, read the bank's ledger
lab-attacks.js         -> five attacks against four SameSite settings, plus what the bank can see of each request
lab-defenses.js        -> four defenses, two ways they are defeated (XSS, permissive CORS), and login by Authorization header
lax-post-window.js     -> the short exception for a cookie with no SameSite attribute
token-helpers-demo.js  -> the token helpers on their own, no browser
csrf-csrf-demo.js      -> the same idea with the maintained csrf-csrf library
package.json
```

Topic 85 showed that `SameSite` does nothing against XSS, and pointed here for CSRF. This topic is the other half of the pair, and it shows the reverse: CSRF defenses do nothing against XSS. It also builds on Topic 82, because the CORS lesson there (the browser decides who may read a response, and a blocked request can still have reached the server) is exactly why CSRF exists, on Topic 81, because whether a login travels in a cookie or in an `Authorization` header decides whether CSRF applies at all, and on Topic 77, because the rule that `GET` must not change state is a security rule as well as a REST rule.

Every result below was run on Node 22.22.0, with Chromium 141.0.7390.37 driven by playwright-core 1.64.1, Express 5.3.0, csrf-csrf 4.0.3 and cookie-parser 1.4.7. Browser behavior is specific to that Chromium version. Other browsers were not tested.

The labs are local and deliberately vulnerable. The bank runs at `http://localhost:PORT`. The evil site is served from `http://127.0.0.1:PORT`, which the browser treats as a **different site** from `localhost`, or from another port of `localhost`, which is a different **origin** but the **same site**. That difference turns out to matter a great deal.

### What CSRF is

A browser attaches your cookies to every request it sends to your site, **no matter which page caused the request**. CSRF abuses that. The victim is logged in to the bank in one tab and opens a malicious page in another. That page makes the victim's browser send a request to the bank, and the browser helpfully includes the session cookie. The bank sees a valid, logged-in request and cannot tell that the user never meant to send it.

Three things have to be true:

1. The login is carried by something the browser attaches **automatically** (such as a cookie).
2. There is a state-changing request whose parameters the attacker can supply.
3. The browser actually sends the cookie on that cross-site request.

The attacker does **not** need to read the response. Moving money, changing an email address or deleting an account all work blind. That is also why it is a different problem from XSS (Topic 85): in XSS the attacker's code runs **inside** your site, in CSRF the attacker's site makes requests **to** your site, and your site needs no bug at all for it to work.

`attacker-site.js` has six pages. Five of them are the attacks used below:

| Attack | How the evil page does it |
| --- | --- |
| form POST | An HTML form that submits itself (a top-level navigation) |
| image GET | `<img src="https://bank/transfer?to=...">`, which the browser fetches with a GET |
| redirect to a GET URL | `location = "https://bank/transfer?to=..."`, a top-level navigation |
| fetch, text/plain | `fetch(...)` with `credentials: "include"` and a `text/plain` body (a "simple" request: no preflight) |
| fetch, JSON + custom header | `fetch(...)` with `application/json` and an `X-Requested-With` header (not simple: the browser sends a preflight first) |

The sixth page, `token-reader`, tries to read the bank's page to steal a CSRF token. It is used in the section on defeated defenses.

### How the lab is built

`bank-app.js` is one bank with switches: `sameSite` (what the session cookie says), `protection` (`none`, `token`, `double-submit`, `origin` or `custom-header`), and three deliberate mistakes you can turn on (`allowGetTransfer`, `jsonAnyContentType`, `corsReflect`). Nadia is logged in with a balance of 1000, and every attack tries to send 100 to `mallory`. The bank keeps a ledger and a log of every request it received, so a lab does not guess whether an attack worked: it reads the ledger.

### What SameSite does, request by request

`lab-attacks.js` logs the victim in, opens each evil page in the same browser, and checks the ledger. The bank has **no CSRF protection of its own**, so the only thing that changes between the four groups is the cookie's `SameSite` attribute. Verified directly (cross-site column, evil page on `127.0.0.1`):

| Attack (from another site) | No SameSite attribute | `SameSite=None; Secure` | `SameSite=Lax` | `SameSite=Strict` |
| --- | --- | --- | --- | --- |
| form POST | **MONEY MOVED** | **MONEY MOVED** | no cookie sent | no cookie sent |
| image GET | no cookie sent | **MONEY MOVED** | no cookie sent | no cookie sent |
| redirect to a GET URL | **MONEY MOVED** | **MONEY MOVED** | **MONEY MOVED** | no cookie sent |
| fetch, text/plain | no cookie sent | **MONEY MOVED** | no cookie sent | no cookie sent |
| fetch, JSON + custom header | stopped at the preflight | stopped at the preflight | stopped at the preflight | stopped at the preflight |

The raw output for one group looks like this:

```text
session cookie sent as: SameSite=Lax   (Chromium stored it as SameSite=Lax)
attack                         evil on 127.0.0.1 (cross-site)        evil on localhost (same-site, other port)
form POST (auto-submitted)     no cookie sent (401)                  MONEY MOVED
image GET                      no cookie sent (401)                  MONEY MOVED
redirect to a GET URL          MONEY MOVED                           MONEY MOVED
fetch, text/plain body         no cookie sent (401)                  MONEY MOVED
fetch, JSON + custom header    stopped at the preflight              stopped at the preflight
```

What to take from the table:

- **SameSite controls the cookie, not the request.** "No cookie sent (401)" means the request still reached the bank. It just arrived logged out.
- **`SameSite=Lax` still lets a top-level `GET` navigation carry the cookie.** The redirect row moved money under `Lax`. Only `Strict` stopped it. This is the reason a state-changing `GET` is a vulnerability even on a modern browser default. The price of `Strict` follows from the same row: a user who arrives at your site from a link on another site does not carry their cookie on that first request.
- **No attribute at all is not quite `Lax`.** Chromium stored the cookie as `SameSite=Lax`, and yet the cross-site form POST still moved money. See the next section.
- **A custom header makes the browser ask first.** The JSON request with `X-Requested-With` never got past the preflight (the bank sent no CORS headers), in every row. That is Topic 82 at work, and it is the basis of one of the defenses below.

#### The short exception for a cookie with no attribute

A cookie with no `SameSite` attribute is treated as `Lax`, except that for a short time after it is set, a cross-site top-level **POST** still carries it. `lax-post-window.js` sets such a cookie, fires the form attack at once, waits, and fires it again. Verified directly:

```text
first attempt  (1 s after the cookie was set): the cross-site form POST carried the cookie? true
second attempt (126 s after the cookie was set): the cross-site form POST carried the cookie? false
```

I tested two points, not the exact boundary: the cookie was carried at 1 second and was not at 126 seconds. The web.dev article in the resources describes this as a temporary mitigation in Chrome. The lesson is practical: **set `SameSite` explicitly** instead of relying on the default, and never treat "the default is Lax" as the whole answer.

#### Same-site is not same-origin

Look at the right-hand column of the raw output above. When the evil page is served from another **port** of `localhost`, every attack except the preflighted one moved money, under **all four** settings, including `Strict`. The browser sees `localhost:4000` and `localhost:5000` as the same **site**, so `SameSite` has nothing to block. A site is built from the registrable domain (web.dev's definition), and, as observed here, the port is not part of it. The same reasoning applies to a sibling subdomain, which I did not test. If anything else you control, or anything a user can host (an old demo app, a user-content subdomain), shares your site, `SameSite` does not protect you from it.

#### What the bank can see of a cross-site request

The Origin and Fetch Metadata defenses work from request headers. Verified directly (`lab-attacks.js`, section 3):

```text
form POST (auto-submitted)     cross-site   POST Origin=http://127.0.0.1:PORT Sec-Fetch-Site=cross-site
form POST (auto-submitted)     same-site    POST Origin=http://localhost:PORT Sec-Fetch-Site=same-site
image GET                      cross-site   GET Origin=- Sec-Fetch-Site=cross-site
image GET                      same-site    GET Origin=- Sec-Fetch-Site=same-site
redirect to a GET URL          cross-site   GET Origin=- Sec-Fetch-Site=cross-site
fetch, text/plain body         cross-site   POST Origin=http://127.0.0.1:PORT Sec-Fetch-Site=cross-site
fetch, JSON + custom header    cross-site   OPTIONS Origin=http://127.0.0.1:PORT Sec-Fetch-Site=cross-site
```

Chromium sent an `Origin` header on the cross-site `POST` requests and on the preflight, none on the `GET` requests, and `Sec-Fetch-Site` on all of them. Note the same-site row: `Sec-Fetch-Site` says `same-site`, not `same-origin`, for a request from another port. A check that accepts `same-site` accepts that attacker.

#### The JSON-parsing accident

The `text/plain` attack sends a JSON string with a content type that browsers allow without a preflight. Whether it works depends on how the server parses bodies. Verified directly, cookie `SameSite=None; Secure`:

```text
express.json() left at its default        -> blocked (400)
express.json({ type: () => true })         -> MONEY MOVED
```

The default `express.json()` ignores a `text/plain` body, so `req.body` has nothing in it and the transfer is refused with a 400. Configure the parser to accept any content type, which is a common "make it work" change, and the same attack succeeds. In the 400 case the cookie **did** arrive: the attack failed because of a parsing detail, not because anything noticed it was forged. Do not count on that.

### Defense 1: do not change state on GET

Every state-changing route must be `POST`, `PUT`, `PATCH` or `DELETE`. The image and redirect attacks above worked only because the lab bank has a `GET /transfer`, and in `lab-defenses.js` that route stayed reachable through **every** protection (last column, below). The CSRF checks only look at unsafe methods. A token on a form does nothing for an endpoint that changes data when it is merely loaded. The fix is not a token on the `GET`: it is to make the route a `POST`.

### Defense 2: SameSite cookies

Set `SameSite=Lax` (or `Strict` where your flows allow it) on the session cookie, explicitly. It removes the cookie from cross-site form posts, image requests and `fetch`, as the table shows. It is a good baseline and it is **not enough on its own**: `Lax` does not cover a top-level `GET`, the same-site column shows what it cannot see, and the no-attribute case has the short window described above. Treat it as defense in depth.

### Defense 3: CSRF tokens

`lab-defenses.js` runs each server-side defense with the cookie set to `SameSite=None; Secure`, the weakest setting, so that **only the defense under test stands between the attack and the ledger**. For each one it checks two things in a real browser: does the bank's own page still work (a normal form submit, and a `fetch` from the bank's own script), and does each attack stop. Verified directly:

```text
                  --- bank's own page ---   ------------------------ evil site ------------------------
protection        form      fetch           form       form        fetch      fetch+hdr   image GET
                                            x-site     same-site   x-site     x-site      x-site
none              works     works           MOVED      MOVED       MOVED      blocked     MOVED    
token             works     works           blocked    blocked     blocked    blocked     MOVED    
double-submit     works     works           blocked    blocked     blocked    blocked     MOVED    
origin            works     works           blocked    blocked     blocked    blocked     MOVED    
custom-header     FAILS     works           blocked    blocked     blocked    blocked     MOVED    
```

And the bank's own reason for each refusal, taken from the 403 it sent (ports vary):

```text
  token          x-site form: no token sent
                 same-site form: no token sent
                 fetch text/plain: no token sent
  double-submit  x-site form: no token sent
                 same-site form: no token sent
                 fetch text/plain: no token sent
  origin         x-site form: Origin http://127.0.0.1:PORT is not allowed
                 same-site form: Origin http://localhost:PORT is not allowed
                 fetch text/plain: Origin http://127.0.0.1:PORT is not allowed
  custom-header  x-site form: custom header missing
                 same-site form: custom header missing
                 fetch text/plain: custom header missing
```

#### The synchronizer token

The server creates an unguessable random value per session, keeps it in the session, and embeds it in every form (a hidden `_csrf` field) and in a `<meta>` tag for scripts. Each state-changing request must send it back, and the server compares it with the stored value. The attacker's page cannot read the bank's page to learn it, because the browser's same-origin policy blocks that (a later section shows what breaks this). The comparison uses `crypto.timingSafeEqual`, which **throws** when the two values have different lengths. Verified directly with `token-helpers-demo.js`:

```text
2. crypto.timingSafeEqual throws when lengths differ; safeEqual does not
   timingSafeEqual directly: ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH
   safeEqual("short", "a much longer value") -> false
   safeEqual(token, token)                   -> true
   safeEqual(token, undefined)               -> false
```

so `csrf-token.js` checks the length first. Tokens are 32 random bytes (43 base64url characters, observed).

#### The signed double-submit cookie

If you do not want server-side state, the server sets the token in a cookie **and** requires the same value in a header or form field, and the request is valid only if the two match. A cross-site form POST carries the cookie but cannot add the matching header or field, so it fails ("no token sent", above). The version in `csrf-token.js` is **signed and bound to the session**: the token is `random.signature`, where the signature is an HMAC of the session id and the random part, made with a server secret. Verified directly:

```text
3. signed double-submit: the token is bound to a session id
   cookie and header match, session-A:                    true
   same pair, but presented on session-B:                 false
   header differs from the cookie:                        false
   attacker invents a token and sets the same value twice: false
   a token signed with a different secret:                false
   missing header:                                        false
```

The signature is what rejects an invented token even when the attacker manages to set both copies. OWASP's cheat sheet lists an unsigned "naive" double-submit variant separately from the signed one, and the signature and session binding are the reason to prefer the signed form. I did not test the naive variant here.

#### Use a library

The old `csurf` package is archived. The npm registry returned this message for it when I looked it up: "This package is archived and no longer maintained. For support, visit <https://github.com/expressjs/express/discussions>". `csrf-csrf` is a maintained library that implements the signed double-submit cookie for Express, and its README recommends the same author's `csrf-sync` (the synchronizer token) for apps that have server-side sessions. `csrf-csrf-demo.js` runs it end to end with plain Node `fetch`. Verified directly (csrf-csrf 4.0.3):

```text
GET /safe-read (GET is not protected)                      -> 200 {"read":"ok"}
POST /transfer, cookie but NO token header                 -> 403 {"error":"invalid csrf token"}
POST /transfer, cookie and a made-up token header          -> 403 {"error":"invalid csrf token"}
POST /transfer, cookie and the right token header          -> 200 {"transferred":true}
POST /transfer, nadia's cookie and token on ANOTHER session -> 403 {"error":"invalid csrf token"}
POST /transfer, omar's token with nadia's cookies          -> 403 {"error":"invalid csrf token"}
```

Two settings matter, and both come from the library's README: `getSessionIdentifier` ties each token to a session, and `getCsrfTokenFromRequest` must return the token from a header or the body and **never from the cookie**, because a check that reads the cookie compares the cookie with itself. The README's defaults are a `__Host-` cookie name, `sameSite: "strict"`, `secure: true` and `httpOnly: true`. The demo turns `secure` off only because it talks to `http://localhost`.

### Defense 4: check Origin or Fetch Metadata

A browser tells the server where a request came from. The server can refuse unsafe requests that did not come from itself. `bank-app.js` checks `Origin` first (it must be on an allowlist), falls back to `Sec-Fetch-Site` (it must be `same-origin` or `none`), and **fails closed** if neither header is present. In the table above this blocked all four state-changing attacks and let the bank's own form and `fetch` through. Notice the reason for the same-site attack: it was refused because its **`Origin` differs**, even though `Sec-Fetch-Site` called it `same-site`. Check `Origin` against an exact allowlist, and do not accept `same-site`.

Two cautions. Failing closed rejects clients that send neither header, such as `curl` and some non-browser tools, so this suits browser-facing routes. And the lab builds the allowed origin from the `Host` header for brevity. A production check should compare against a configured list.

### Defense 5: require a custom header

Only JavaScript can add a custom header, and a cross-origin script cannot do it without the server's permission, because the header forces a preflight (the last row of the first table). So a bank that requires `X-Requested-With` on its JSON API is safe from forged requests with no token to manage. In the table, `custom-header` blocked every state-changing attack, and the bank's own `fetch` still worked. The cost is in the second column: **the bank's own plain HTML form failed**, because a form cannot send a custom header. This defense fits a JavaScript-driven API and breaks classic server-rendered forms.

### Where the defenses stop working

`lab-defenses.js` section 2 runs the cases where a token is **present and correct** and the attack still wins. Verified directly:

```text
a) token + SameSite=Strict + an XSS hole (Topic 85):   injected script -> MONEY MOVED
   (control, same bank, cross-site form POST:           no cookie sent (401))
b) token + bank reflects Origin with credentials = false:  evil page could read the bank's page: no -> no money moved   (the bank answered the GET with 200, cookie sent: true)
b) token + bank reflects Origin with credentials = true :  evil page could read the bank's page: yes, got a token: true -> MONEY MOVED   (the bank answered the GET with 200, cookie sent: true)
```

**(a) XSS beats everything on this list.** The bank had a token **and** a `Strict` cookie, and one reflected XSS hole let an injected script read the token from the bank's own page and make the transfer. The control line shows the same bank refusing a cross-site form POST. OWASP's CSRF cheat sheet says the same thing in one sentence: cross-site scripting can defeat all CSRF mitigation techniques. This is why Topic 85 comes first.

**(b) A permissive CORS setup hands the token over.** The token's protection rests on the evil page being unable to **read** the bank's page. When the bank answered every `Origin` with that origin plus `Access-Control-Allow-Credentials: true` (the dangerous configuration from Topic 82), the evil page read the page, extracted the token, and used it. With CORS off, the read failed. Look at the detail in both lines: the bank answered the `GET` with a 200 and the cookie **did** arrive. The request was never stopped. The browser simply refused to hand the response to the evil page. That is the same lesson as Topic 82: the browser enforces who may read, and the server still did the work.

### Login by Authorization header

CSRF needs the browser to attach the credential for you. A token the page keeps in memory and sends in an `Authorization` header is not attached by the browser, so a forged request does not carry it. Verified directly:

```text
bank's own page, token kept in memory:        status 200, ledger: ["POST /api/bearer/transfer"]
evil fetch to the cookie-authenticated API:   MONEY MOVED
evil fetch to the Bearer-authenticated API:   blocked (401); the request carried the session cookie: true, an Authorization header: false
```

The cookie was sent on the forged request (the lab cookie is `SameSite=None`), and it did not matter, because that endpoint wants the header. It is the same evil request with the same cookie, one endpoint moved money and the other refused. That is the case for a header-based login, and it is how Topic 81's API worked.

It is a trade, not a free win. A token the page can hold in memory or in `localStorage` is a token an injected script can read: Topic 85 showed the `localStorage` token leaking to the attacker. Cookie-based sessions with `HttpOnly` need CSRF defenses. Header-based tokens need XSS defenses and a decision about where the token lives. Whichever you choose, the other half of the work still has to be done: cookies need the CSRF defenses above, and header tokens need Topic 85's XSS defenses.

### What this topic does not cover

- **Login CSRF and logout CSRF**, where the attacker forges the login itself so the victim ends up in the attacker's account.
- **WebSockets**, GraphQL, and multipart uploads, which need an `Origin` check or a token like any other state-changing request.
- **`csrf-sync`** (the synchronizer token library), the `__Host-` cookie prefix in a browser, and cookies over real HTTPS: the labs ran over `http://localhost`, where Chromium accepted `SameSite=None; Secure`.
- **Sibling subdomains**, cookie injection from a subdomain, and the naive double-submit weakness. They are described above where relevant but were not run.
- **Browsers other than Chromium**, whose `SameSite` defaults and exceptions differ.

### Common mistakes

| Mistake | What happens |
| --- | --- |
| A state-changing `GET` (`/delete?id=3`, `/transfer?to=...`) | Image and link attacks work, even with `SameSite=Lax`. Observed. |
| Relying on the `SameSite` default | A cookie with no attribute let a cross-site form POST through for the first moments. Observed. |
| Believing `SameSite=Strict` stops everything | A page on another port of the same site moved money under `Strict`. Observed. |
| Accepting any JSON `Content-Type` (`type: () => true`) | A `text/plain` request becomes a working attack. Observed. |
| Treating "it is a JSON API" as a defense | Only a custom header or a token is. Observed with the `text/plain` row. |
| Reading the CSRF token from the cookie on the server | The check compares the cookie with itself and proves nothing. |
| An unsigned token you do not bind to the session | Anything the attacker can set in the cookie jar becomes valid. (Described by OWASP, not run.) |
| Accepting `Sec-Fetch-Site: same-site` | A request from another origin on the same site passes. Observed. |
| Reflecting any `Origin` with credentials in CORS | The evil page reads the token and uses it. Observed. |
| An XSS hole next to a token | The injected script reads the token from the page. Observed. |
| Comparing tokens with `===` | Use a constant-time comparison, and check lengths first. |

### Practical tips

- Make every state-changing route a `POST`, `PUT`, `PATCH` or `DELETE`, and never change state on a `GET`.
- Set the session cookie explicitly: `HttpOnly`, `Secure` in production, and `SameSite=Lax` (or `Strict`). Do not rely on a default.
- For cookie-authenticated apps, add a CSRF token (a library such as `csrf-csrf` or `csrf-sync`) on top of `SameSite`. Layer an `Origin` check on browser-facing routes if you can.
- For a JavaScript-only API, requiring a custom header is a simple, token-free defense.
- Do not configure the JSON parser to accept every content type.
- Keep CORS to an exact allowlist (Topic 82). Never reflect arbitrary origins with credentials.
- Fix XSS first. A CSRF defense does not survive it.
- Rotate the session, and the token with it, when someone logs in.

## Resources

- OWASP, Cross-Site Request Forgery Prevention Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html>
- MDN, Cross-site request forgery (CSRF): <https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF>
- web.dev, SameSite cookies explained: <https://web.dev/articles/samesite-cookies-explained>
- csrf-csrf, double-submit CSRF protection for Express: <https://github.com/Psifi-Solutions/csrf-csrf>

## Practice

1. In `lab-attacks.js`, change the bank's `allowGetTransfer` to `false` and run it again. Predict which rows change before you run it, then explain what the image and redirect attacks do now.
2. In `bank-app.js`, change the `origin` check to accept `Sec-Fetch-Site` of `same-site` as well. Run `lab-defenses.js` and find which attack now succeeds, then explain why in terms of the `Origin` and `Sec-Fetch-Site` values shown above.
3. Pass `http://127.0.0.1:PORT` (the evil site's origin) in `allowedOrigins` for the `origin` protection and rerun the defenses lab. Write down why an `Origin` allowlist must be exact and short.
4. Extend `csrf-csrf-demo.js`: log in again to get a new `sid`, then check whether the **old** token and cookie still work. Decide where in a real app you would rotate the token, and write the check that proves it.
5. Replace the bank's cookie session with a signed JWT that lives only in an `Authorization` header (Topic 81). Repeat the "login by Authorization header" run. Then describe, in three sentences, what an XSS payload from Topic 85 could do to that design, and what it could not.

## Code Example

- [bank-app.js](./04-csrf/bank-app.js)
- [attacker-site.js](./04-csrf/attacker-site.js)
- [csrf-token.js](./04-csrf/csrf-token.js)
- [lab-common.js](./04-csrf/lab-common.js)
- [lab-attacks.js](./04-csrf/lab-attacks.js)
- [lab-defenses.js](./04-csrf/lab-defenses.js)
- [lax-post-window.js](./04-csrf/lax-post-window.js)
- [token-helpers-demo.js](./04-csrf/token-helpers-demo.js)
- [csrf-csrf-demo.js](./04-csrf/csrf-csrf-demo.js)

To run it yourself, run `npm install` in the project folder. The scripts that drive a browser (`lab-attacks.js`, `lab-defenses.js`, `lax-post-window.js`) need a Chromium. Either set `CHROMIUM_PATH` to a Chrome or Chromium you already have (this is how everything here was run), or install one with `npx playwright-core install chromium`. That second route was not run here.

Then run `npm run attacks`, `npm run defenses`, `npm run tokens`, `npm run library` and `npm run lax-post` (about two minutes, because it waits). `npm run tokens` and `npm run library` need no browser.

To try it by hand in your own browser, start the bank with `SAMESITE=lax PROTECTION=token GET_TRANSFER=1 node bank-app.js 4960` (the other switches are `JSON_ANY=1` and `CORS_REFLECT=1`), start the evil site with `node attacker-site.js 4961`, log in by opening `http://localhost:4960/login?user=nadia`, and then, in the same browser, open `http://127.0.0.1:4961/form-post?bank=4960` (the other pages are `img-get`, `nav-get`, `fetch-simple` and `fetch-json`). Open the evil site through `127.0.0.1`, not `localhost`, so the browser treats it as a different site. Run the bank only on your own machine.

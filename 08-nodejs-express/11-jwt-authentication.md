# JWT Authentication

**Topic 81 of 89** (Section: Node.js / Express, 11 of 12)

## Notes

### Project structure

```text
jwt-anatomy.js     -> a token taken apart with no JWT library: what is readable, what is not
jwt-failures.js    -> what verify() rejects, decode() vs verify(), expiry, "none", algorithm pinning
auth-app.js        -> an Express app: login, a bearer-token middleware, role checks, logout
.env.example       -> the two settings auth-app.js reads
package.json
```

This topic builds directly on three earlier ones. The token check is a middleware (Topic 76), a rejected request is a status code and a JSON error (Topics 77 and 78), and the signing secret is read from the environment and the app refuses to start without it (Topic 79). Two neighbouring topics are deliberately left to later: how passwords are stored (Topic 84, Password Hashing) and how a browser-held token is attacked (Topics 86 and 87, XSS and CSRF).

### Authentication and authorization are two questions

**Authentication** asks who you are. **Authorization** asks what you are allowed to do. In `auth-app.js` they are two separate middleware functions: `requireAuth` answers the first, `requireRole` answers the second, and they return different status codes on purpose (below).

### What a JWT is

A JSON Web Token is a string of three base64url-encoded parts joined by dots: `header.payload.signature`. The server signs a small JSON payload with a secret only it knows, hands the string to the client at login, and the client sends it back with each request. Because the signature can be checked, the server does not need to look the user up in a session store to believe the token.

`jwt-anatomy.js` signs a token and takes it apart using only Node's `Buffer`. Verified directly:

```text
number of dot-separated parts: 3

header   (decoded with no secret): { alg: 'HS256', typ: 'JWT' }
payload  (decoded with no secret): { role: 'author', iat: 1792250647, exp: 1792251547, sub: 'user-42' }
signature (raw bytes, not JSON)  : 32 bytes

exp - iat = 900 seconds (15m = 900)
```

Two things follow from this output. First, the payload was decoded with no secret at all, so **a JWT is signed, not encrypted**: anyone holding the token can read every claim in it. Never put a password, an API key, or anything private in the payload. Second, the signature is 32 bytes, the size of an HMAC-SHA256 result. The signature does not hide the payload, it only makes any change to the header or payload detectable. `iat` ("issued at"), `exp` ("expires at") and `sub` ("subject", usually the user id) are standard claims, and `iat` and `exp` are plain seconds since 1970.

### What verify() rejects

`jwt-failures.js` runs each case and prints what the library actually reports. Verified directly:

```text
1. untouched token, right secret                      -> ACCEPTED: reader
2a. jwt.decode() on the tampered token                -> ACCEPTED: admin
2b. jwt.verify() on the same tampered token           -> REJECTED: JsonWebTokenError: invalid signature
3. right token, wrong secret                          -> REJECTED: JsonWebTokenError: invalid signature
4a. 1-second token, checked immediately               -> ACCEPTED: reader
4b. the same token after 1.6 seconds                  -> REJECTED: TokenExpiredError: jwt expired
5. unsigned token claiming alg 'none'                 -> REJECTED: JsonWebTokenError: jwt signature is required
6a. HS512 token, verify() with default options        -> ACCEPTED: reader
6b. HS512 token, verify() pinned to ['HS256']         -> REJECTED: JsonWebTokenError: invalid algorithm
```

Case 2 is the most important line in this topic. In 2a and 2b the payload was edited so `role` says `admin`, keeping the original header and signature. `jwt.decode()` returned `admin`, because decoding checks nothing. `jwt.verify()` rejected the same string, because the signature no longer matches the changed payload. **Using `decode()` where `verify()` was needed is a real vulnerability**: it makes every claim attacker-controlled. Only `verify()` should ever feed an authorization decision.

Case 5 shows an unsigned token (header `alg: "none"`, empty signature) being refused when a secret is supplied. Case 6 is easy to miss: with default options, `verify()` accepted a token signed with HS512 even though the app was written around HS256. Passing `algorithms: ["HS256"]` closes that, which is why `auth-app.js` pins it in `verify()` and also in `sign()`. Let the verifier decide which algorithms it accepts, never the token.

### The Express flow: login, verify on every request, check the role

```js
// POST /login: credentials in, token out
const token = jwt.sign({ role: user.role }, SECRET, {
  algorithm: "HS256",
  subject: String(user.id),
  expiresIn: "15m",
  jwtid: crypto.randomUUID(),
});

// middleware: require a valid bearer token
const [scheme, token] = (req.header("authorization") || "").split(" ");
const payload = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
req.user = { id: payload.sub, role: payload.role, jti: payload.jti, exp: payload.exp };
```

The client sends the token in the `Authorization: Bearer <token>` header. The server was started with `JWT_SECRET="..." node auth-app.js`; started with no `JWT_SECRET` it refused to run. Verified directly:

```text
startup with NO JWT_SECRET -> Error: Missing required environment variable: JWT_SECRET   (exit code 1)

GET /public                         -> 200 {"message":"anyone can read this"}
GET /me           (no header)        -> 401 {"error":"missing bearer token"}

POST /login  wrong password          -> 401 {"error":"invalid credentials"}
POST /login  unknown user            -> 401 {"error":"invalid credentials"}
```

The two failed logins return the identical message, so a caller cannot use the response to learn which usernames exist. After a successful login the decoded payload was:

```text
{"role":"author","iat":1792250695,"exp":1792251595,"sub":"1","jti":"0f8be706-97c1-41bb-89e9-5f498d4a5342"}
```

`GET /me` with that token returned `{"user":{"id":"1","role":"author",...}}`. Note that `sub` (and so `req.user.id`) is the **string** `"1"`, not the number `1`. JWT claims are JSON, and the library stored what `subject: String(user.id)` gave it; comparing `req.user.id === 1` would be false.

### 401 and 403 mean different things

```text
nadia (role author) -> GET /admin/stats   -> 403 {"error":"forbidden: requires role admin"}
admin               -> GET /admin/stats   -> 200 {"visits":1042,"signups":37}
```

`401 Unauthorized` means the server could not establish who you are (no token, a bad one, an expired one). `403 Forbidden` means it knows who you are and you may not do this. Nadia's valid token got a 403, not a 401, because authentication succeeded and authorization did not. Bad credentials in the header all gave 401:

```text
Authorization: Basic abc123                          -> 401 {"error":"missing bearer token"}
Authorization: Bearer not.a.token                     -> 401 {"error":"invalid token"}
Authorization: Bearer                                 -> 401 {"error":"missing bearer token"}
forged admin payload, original signature              -> 401 {"error":"invalid token"}
```

The last line is the tampering case from earlier, now against the running app: the forged token claimed `role: admin` and was refused at the verification step, before any role check could trust it. A token that has expired returns a different message, which helps a client know to log in again, verified through the app with a one-second lifetime:

```text
immediately:        {"user":{"id":"1","role":"author",...}}
after 1.6 seconds:  {"error":"token expired"}   [401]
```

### Logout is the hard part of a stateless token

The server keeps no record of a token it issued, so there is nothing to delete at logout. Until `exp`, anyone holding the token can use it. `auth-app.js` shows the common workaround: give each token a unique `jti`, and keep a denylist of revoked ids that the middleware checks. Verified directly, with two separate logins for the same user (token A and token B):

```text
POST /logout with A        -> 204
GET /me with A             -> 401 {"error":"token revoked"}
GET /me with B             -> returned the user (same person, different token, still valid)
GET /me with admin's token -> returned the user
```

Revocation is per token, not per user: B kept working. And the denylist here is a `Set` in the process's memory, so a restart empties it. After restarting the server:

```text
revoked token A, GET /me after restart -> returned the user again
```

The token was still inside its lifetime and the signature was still valid, so with the denylist gone the server accepted it. That is the honest cost of stateless tokens: **revocation needs shared state, and a short lifetime is your main protection.** The demo's `Set` is fine for learning. A real deployment would keep the denylist somewhere that survives restarts and is shared by every server instance (a database or a cache such as Redis), and would keep `expiresIn` short (minutes, not weeks). A common design pairs a short-lived access token with a longer-lived refresh token so users are not logging in every fifteen minutes. That pattern is not implemented in this folder, so nothing about it is verified here.

### The secret

HS256 uses one shared secret both to sign and to verify, so anyone who learns it can mint a valid token for any user. It must be long, random, and kept out of the code and out of version control. A suitable one can be generated with:

```text
node -p "require('crypto').randomBytes(48).toString('base64url')"
```

That printed a 64-character string when tested. Put it in the environment (Topic 79), as `.env.example` shows. HS256 is symmetric, so every service that verifies tokens must also hold the secret. Asymmetric algorithms such as RS256 sign with a private key and verify with a public one, which suits setups where many services verify but only one issues. They are not demonstrated here.

### Where the client keeps the token

The server side is only half of the design. A browser app has to store the token somewhere, and the usual choices (a JavaScript-readable store such as `localStorage`, or an `httpOnly` cookie) trade exposure to script injection against exposure to cross-site requests. That trade-off is the subject of Topics 86 (XSS) and 87 (CSRF), and nothing in this folder tests either option, so treat it as a pointer to those topics rather than a finding.

### Practical tips

- Use `jwt.verify()` for every authorization decision and never `jwt.decode()`. The tampered-token test above is the reason.
- Pin the accepted algorithms in `verify()` with the `algorithms` option.
- Treat the payload as public. Keep it small and put only identifiers and coarse claims in it, such as `sub` and `role`.
- Keep `expiresIn` short, and plan for revocation before you need it, because a stateless token cannot be recalled by itself.
- Return the same error for "no such user" and "wrong password", and keep passwords out of the token entirely.
- The plain-text password comparison in `auth-app.js` is a demo shortcut. Do not copy it. Topic 84 covers hashing.

## Resources

- RFC 7519, JSON Web Token: <https://datatracker.ietf.org/doc/html/rfc7519>
- jsonwebtoken on npm (options for sign and verify): <https://www.npmjs.com/package/jsonwebtoken>
- MDN, the Authorization header: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization>
- MDN, 401 Unauthorized: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401>
- MDN, 403 Forbidden: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403>

## Practice

1. In `jwt-anatomy.js`, change the payload to include a `name` field, re-run it, and confirm from the decoded output that the name is readable without the secret.
2. In `jwt-failures.js`, add a case that verifies a token with `{ clockTolerance: 5 }` just after it expires, and describe what changes.
3. Add a `requireRole` case to `auth-app.js` that lets either `admin` or `author` through to a new `/drafts` route, and test it with both tokens using `curl`.
4. Make logout survive a restart by writing revoked `jti` values to a file (or a small JSON database) and loading it at startup. Then explain what still would not work with two server instances.
5. Change the middleware to read the token from a cookie instead of the `Authorization` header, then read Topics 86 and 87 and list what new risks that choice introduces.

## Code Example

- [jwt-anatomy.js](./11-jwt-authentication/jwt-anatomy.js)
- [jwt-failures.js](./11-jwt-authentication/jwt-failures.js)
- [auth-app.js](./11-jwt-authentication/auth-app.js)
- [.env.example](./11-jwt-authentication/.env.example)

To run it yourself: `npm install` in the project folder, then `node jwt-anatomy.js` and `node jwt-failures.js` (no setup needed). For the app, run `JWT_SECRET="a-long-random-string" node auth-app.js` and use `curl` against it: `curl -X POST -H "Content-Type: application/json" -d '{"username":"nadia","password":"pw-nadia"}' http://localhost:4600/login` returns a token, then `curl -H "Authorization: Bearer <token>" http://localhost:4600/me`. The two demo users are `nadia` (role author, password `pw-nadia`) and `admin` (role admin, password `pw-admin`). Set `ACCESS_TOKEN_TTL=1s` to watch a token expire.

# Password Hashing

**Topic 84 of 89** (Section: Web Security Basics, 2 of 4)

## Notes

### Project structure

```text
fast-hash-problem.js     -> why plain text and an unsalted SHA-256 both fail the moment the database leaks
salt-demo.js             -> what a salt fixes, and what it does not: salted SHA-256 vs salted scrypt
scrypt-builtin.js        -> hashing with only Node's built-in crypto: storage format, constant-time compare, memory limit
bcrypt-demo.js           -> bcrypt (via bcryptjs): hash anatomy, the cost factor, the 72-byte limit
argon2-demo.js           -> argon2id: the PHC string, parameters, needsRehash(), malformed input
cost-benchmark.js        -> milliseconds per hash for each approach, side by side
event-loop-blocking.js   -> where hashing runs: blocking the event loop, and starving the thread pool
password-service.js      -> the one file that knows how passwords are hashed (argon2id)
auth-app-hashed.js       -> register, login and /me with hashed passwords and JWT, replacing Topic 81's plain-text shortcut
login-timing-check.js    -> can login timing reveal which usernames exist? (and the fix)
rehash-on-login-demo.js  -> upgrading stored hashes to stronger settings without resetting anyone's password
.env.example             -> the one setting auth-app-hashed.js reads (JWT_SECRET)
package.json
```

Topic 81's `auth-app.js` compared passwords as plain text and said so in a comment: "Topic 84 covers the correct way". This is that topic. It also builds on Topic 83, because the register and login routes validate their input before anything is hashed, and on Topic 72, because hashing is deliberately slow work, and where slow work runs decides whether the rest of the server keeps responding.

Every result below was run on Node 22.22.0, on a sandbox with 2 CPU cores, with Express 5.3.0, `argon2` 0.45.1, `bcryptjs` 3.0.3, `jsonwebtoken` 9.0.3 and Zod 4.6.7. Timings are specific to that machine. Compare the numbers with each other, not with your laptop.

### The goal: a leaked database should not leak passwords

A password is never stored. What is stored is the output of a **password hash**: a one-way function, so that the server can check a login attempt without keeping the password itself. The reason is not that your own database is careless. It is that databases do leak (a backup in the wrong place, an injection bug like the ones in Topic 83), and users reuse passwords across sites, so a leak from you becomes a break-in somewhere else.

`fast-hash-problem.js` uses four made-up accounts to show how each weaker design fails once the table is in an attacker's hands.

**1. Plain text.** The leaked table is the passwords. There is nothing to crack.

**2. An unsalted SHA-256.** SHA-256 is a good hash for many jobs, but a bad one here. Verified directly:

```text
nadia  816a4092660e4e87b5b584c4...
omar   816a4092660e4e87b5b584c4...      nadia and omar have the same hash: true
karim  0b14d501a594442a01c68595...
lina   5c819c38d5bee02a7e37d4b0...

looking each hash up in a precomputed table of 10 common passwords:
nadia -> CRACKED: "sunshine123"     omar -> CRACKED: "sunshine123"
karim -> CRACKED: "password1"       lina -> not in the table
all four lookups took 0.04 ms
```

Two problems show up. The same password always gives the same hash, so nadia and omar are visibly using the same password without anyone cracking anything. And an attacker can compute `hash -> password` once, for a list of common passwords, and reuse that table against every leak. A strong, unusual password (lina's) survived the table, but see the next point about speed.

**3. Speed is the problem.** SHA-256 was built to be fast. Hashing guesses in a plain JavaScript loop on one thread, this machine made 857,444 SHA-256 guesses per second in one run, and about 500,000 to 900,000 across several runs. Dedicated cracking hardware is far faster, but that was not measured here. A hash that is fast for you is fast for the attacker too, so a short or common password falls quickly even without a table.

### Salting: necessary, not sufficient

A **salt** is a random value, unique per password, that is mixed into the hash and stored next to it. Verified directly with `salt-demo.js`:

```text
salted SHA-256, same password "sunshine123" for both users:
nadia: salt e76744d76b4f...  hash e98b71b0e5ffe858e0da...
omar:  salt 4a914126cf7d...  hash b7a031c0223dda7a161b...      identical hashes? false

a precomputed (unsalted) table against the salted hash: no match
```

That fixes the two problems above: duplicate passwords are no longer visible, and a table built in advance is useless because the salt changes every hash. But the salt is stored beside the hash, so it is **not a secret**, and an attacker who wants one specific account just uses it:

```text
attacking ONE user's salted SHA-256 with the same 10-word list:
  CRACKED "sunshine123" in 0.046 ms
  salted SHA-256 guess rate: 898,761 per second (one thread)
```

A salt does not slow anything down. The real defense is making each guess expensive.

### Slow, tunable hashes: scrypt, bcrypt, argon2id

Password-hashing algorithms are designed to be slow on purpose, with a setting (a **cost** or **work factor**) that lets you make them slower as hardware improves. Scrypt and argon2id also require a large amount of **memory** per hash, which is meant to make running many guesses in parallel on specialised hardware more costly. (That is the design goal. It was not measured here.) Verified directly, same salted target and same 10-word list as before, using scrypt at OWASP's minimum settings (N=2^17, r=8, p=1):

```text
scrypt: CRACKED "sunshine123" after 6 guesses, 2580 ms in total
scrypt cost per guess: 440 ms = 2.3 guesses per second (one thread)
ratio: about 395,437 times more salted-SHA-256 guesses per second than scrypt guesses
```

The same wordlist attack went from under a millisecond to 2.6 seconds, and the guess rate dropped by a factor in the hundreds of thousands (about 395,000 in the run above, 256,000 in a later run; the exact figure moves with machine load). A weak password like `sunshine123` still falls to a wordlist. Slow hashing does not rescue bad passwords, it makes every guess cost something and so protects the reasonable ones.

#### Which algorithm, and with what settings

OWASP's Password Storage Cheat Sheet (read while writing this topic) gives this order of preference and these minimums:

| Algorithm | When OWASP recommends it | Minimum settings it lists |
| --- | --- | --- |
| **Argon2id** | First choice | 19 MiB memory (`m=19456`), 2 iterations, parallelism 1 (it lists several equivalent combinations, such as 46 MiB with 1 iteration) |
| **scrypt** | If Argon2id is not available | N=2^17 (128 MiB), r=8, p=1 |
| **bcrypt** | Legacy systems | Work factor of 10 or more, and a 72-byte maximum password length |
| **PBKDF2** | When FIPS-140 compliance is required | HMAC-SHA256 with 600,000 iterations |

Raise these over time, and measure on your own server rather than copying numbers. `cost-benchmark.js` timed one hash of each, in milliseconds on this machine:

```text
SHA-256 (one hash, for scale)                                0.0022
PBKDF2-HMAC-SHA256, 600,000 iterations                        126.8
bcrypt cost 10 (bcryptjs)                                      87.0
bcrypt cost 12 (bcryptjs)                                     352.6
scrypt N=2^14 r=8 p=1 (Node default)                           45.1
scrypt N=2^17 r=8 p=1 (OWASP minimum)                         396.7
argon2id m=19456 KiB t=2 p=1 (OWASP minimum)                   40.9
argon2id m=65536 KiB t=3 p=1                                  191.3
```

These timings fluctuate from run to run (the PBKDF2 row came out at 101, 127 and 274 ms in three runs here), so treat them as rough. Do not conclude from the table that one algorithm is "faster and therefore weaker". These are different implementations and different settings, with different memory use. Pick an algorithm from the table above, then choose settings by measuring how long a login can take on your own hardware.

### Built-in scrypt: no install needed

Node's `crypto` module has `scrypt`. `scrypt-builtin.js` wraps it with a stored format that keeps the settings next to the hash, and compares in constant time:

```js
// stored: scrypt$N$r$p$<salt base64>$<hash base64>
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 32, { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  return ["scrypt", 2 ** 17, 8, 1, salt.toString("base64"), hash.toString("base64")].join("$");
}

async function verifyPassword(stored, password) {
  const [scheme, N, r, p, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length,
    { N: Number(N), r: Number(r), p: Number(p), maxmem: 256 * 1024 * 1024 });
  return crypto.timingSafeEqual(actual, expected);  // constant time; throws if the lengths differ
}
```

Verified directly:

```text
stored string: scrypt$131072$8$1$zR4/jipMOuZaEQRaDsL2AQ==$4LNFvqfC7CfZkjdXMabLYyZMDWstZ9/KEvHP2TgYMiU=
parts: 6, salt 16 bytes, hash 32 bytes, took 448 ms

correct password -> true   wrong password -> false   empty password -> false   garbage stored string -> false
the same password hashed twice: identical stored strings? false, and both still verify

N=2^17 without maxmem -> ERR_CRYPTO_INVALID_SCRYPT_PARAMS
N=2^14 without maxmem -> works (but below the OWASP minimum)
a stored string made with N=2^14 still verifies against the code that now uses N=2^17: true
```

Three details deserve attention. **Compare with `crypto.timingSafeEqual`**, not `===`: an ordinary comparison can stop at the first differing byte, and the time it takes can leak information (a general property of such comparisons, not measured here). **Store the settings with the hash** (`131072$8$1` here), so you can raise them later and still verify old hashes, which the last line shows. And **Node limits scrypt's memory by default**, so the OWASP-minimum N=2^17 fails with `ERR_CRYPTO_INVALID_SCRYPT_PARAMS` until `maxmem` is raised. Writing the storage format yourself is the part most likely to contain a mistake, which is a reason to prefer a library that does it for you, covered next.

Node 22.22.0 has no built-in argon2: `typeof crypto.argon2` was `undefined`. The current Node documentation lists `crypto.argon2` and `argon2Sync`, so newer Node versions have one, but it was not tested here.

### bcrypt

bcrypt is the long-standing choice and you will meet it in most existing codebases. `bcrypt-demo.js` uses `bcryptjs`, a pure JavaScript version that needs no native build (its npm page says it is about 30% slower than the native binding). Verified directly:

```text
hash: $2b$12$GY.Q3Y7d20lfopWtppJas.eQNpFuB1bV3olRDTTwD70PjXY9u6aZ2
length 60; version "$2b$"; cost 12; salt "GY.Q3Y7d20lfopWtppJas." (22 chars); hash "eQNpFuB1bV3olRDTTwD70PjXY9u6aZ2" (31 chars)
the same password twice: different salts, identical? false
```

The salt, the cost and the hash all live inside the one 60-character string, so `bcrypt.compare(password, hash)` needs nothing else. The cost factor is an exponent: each +1 doubles the work.

```text
cost  8:  25 ms     cost  9:  49 ms     cost 10:  99 ms
cost 11: 185 ms     cost 12: 386 ms     cost 13: 694 ms        (median of 3, hashSync)
```

**The 72-byte limit** is the bcrypt trap. bcrypt only uses the first 72 bytes of the password:

```text
bcrypt.truncates(73-byte password) -> true
hashed 72 x 'a' + 'X'; compare with 72 x 'a' + 'Y'  -> true     (the last byte did not matter)
compare with 71 x 'a'                               -> false
"é" x 40 is 80 bytes; truncates? -> true
```

That last line matters: the limit is in **bytes**, not characters, and a 40-character password of accented letters is already over it. `bcryptjs` truncates silently rather than raising an error. OWASP's advice is to enforce a maximum password length of 72 bytes (or less) when using bcrypt.

### argon2id

Argon2id is OWASP's first choice and is specified in RFC 9106. `argon2-demo.js` uses the `argon2` npm package, a native addon that shipped its own prebuilt binary and installed with a plain `npm install` here. Verified directly:

```text
$argon2id$v=19$m=65536,p=4,t=3$PrVaAnHkDYWAj4h3QFMXCg$g0pmlG9B0uR2Tu0Bj8518dx6WOy6l4rkR04Ettp8uuU
algorithm argon2id; v=19; parameters m=65536,p=4,t=3; salt 22 base64 chars; hash 43 base64 chars
```

That is the **PHC string format**, which OWASP recommends for storing the algorithm and settings with each hash. The package's defaults (64 MiB, 3 passes, 4 lanes) are above OWASP's minimum. Time per hash, median of three:

```text
OWASP first option  m=19456 KiB t=2 p=1         41 ms
stronger            m=65536 KiB t=3 p=1        213 ms
package default     m=65536 KiB t=3 p=4        150 ms
```

`needsRehash()` answers "is this stored hash weaker than the settings I want today?", which is what makes upgrades possible:

```text
made with the OWASP minimum, wanted = stronger  -> true
made with the OWASP minimum, wanted = same      -> false
made with the stronger settings, wanted = same  -> false
the old hash still verifies: true
```

Malformed stored values behave differently from wrong passwords:

```text
a bcrypt hash   -> false
plain text      -> THROWS "pchstr must contain a $ as first char"
an empty string -> THROWS "pchstr must be a non-empty string"
```

`argon2.verify()` **throws** on a string that is not a PHC hash, so a login route must catch that instead of crashing (`password-service.js` turns it into `false`). It also returned plain `false` for a bcrypt hash rather than recognising it, so if you migrate from bcrypt to argon2 you need to look at the stored prefix (`$2b$` or `$argon2id$`) yourself and choose the matching verifier.

### Where hashing runs matters (Topic 72 again)

Hashing is slow on purpose, so the question is what else is stuck waiting while it runs. `event-loop-blocking.js` runs a ticker that should fire every 10 ms and records the longest gap between ticks during each call. Verified directly:

| Call | Total time | Longest gap between ticks |
| --- | --- | --- |
| `crypto.scryptSync` (OWASP minimum) | 532 ms | **532 ms** |
| `crypto.scrypt` (async) | 533 ms | 10 ms |
| `bcryptjs.hashSync` (cost 12) | 383 ms | **383 ms** |
| `bcryptjs.hash` (async, cost 12) | 366 ms | **101 ms** |
| `argon2.hash` (OWASP minimum) | 40 ms | 11 ms |

A synchronous call freezes the whole server for its entire duration, so no request is answered during that half second. Use the synchronous versions only in scripts. Node's own async `scrypt` and the native `argon2` package run the work off the main thread, and the ticker stayed on schedule. `bcryptjs` is plain JavaScript with no native code, so even its async version still blocked the event loop, in slices of about 100 ms. That makes a native implementation the better choice for a busy server.

Off-thread work is not free either. Node runs it in libuv's **thread pool**, which has 4 threads by default (Topic 72). Other work uses the same pool, for example `fs` calls. The test starts 8 scrypt hashes and then reads a tiny file right behind them:

```text
UV_THREADPOOL_SIZE unset (default 4):
  fs.readFile when nothing else is running:   0.52 ms
  fs.readFile queued behind 8 scrypt hashes:  892 ms
  all 8 hashes finished after 929 ms

UV_THREADPOOL_SIZE=16:
  fs.readFile queued behind 8 scrypt hashes:   40 ms
  all 8 hashes finished after 940 ms
```

In this test, a burst of logins made an unrelated file read wait almost a second. A bigger pool fixed the read in this test, but the 8 hashes took the same total time, which fits a machine with only 2 cores: a bigger pool does not create CPU. A repeat run gave the same pattern (774 ms for the queued read at the default size, 64 ms with 16 threads). The real protection against a flood of login attempts is limiting how many are allowed, which is the subject of Topic 89 (Rate Limiting), and nothing about it was tested here.

### Putting it together: register, login, and the JWT

`password-service.js` is the only file that knows the algorithm. The app calls three functions, so changing algorithm or settings later happens in one place:

```js
const OWASP_MINIMUM = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

hashPassword(password)            // -> a PHC string
verifyPassword(storedHash, pw)    // -> true or false, and false (not a crash) for a malformed hash
needsRehash(storedHash)           // -> true when the stored settings are weaker than today's
```

`auth-app-hashed.js` combines Topic 83's validation, this topic's hashing and Topic 81's JWT. It was started with `JWT_SECRET` set and exercised with `curl`. Verified directly:

| Request | Result |
| --- | --- |
| `POST /register` `{"username":"  Nadia ","password":"correct horse battery staple"}` | `201 {"id":1,"username":"nadia","role":"user"}` (the name was trimmed and lowercased, and no hash in the response) |
| register `nadia` again | `409 {"error":"username_taken"}` |
| register with username `x!` and password `short` | `400`, both problems listed together |
| register with a 5000-character password | `400`, `Too big: expected string to have <=128 characters` |
| register with an extra `"role":"admin"` field | `400`, `Unrecognized key: "role"` |
| `POST /login`, right password | `200` with a token whose payload was `{"role":"user","iat":...,"exp":...,"sub":"1","jti":"..."}` |
| `POST /login`, wrong password | `401 {"error":"invalid credentials"}` |
| `POST /login`, unknown user | `401 {"error":"invalid credentials"}` (the identical response) |
| `GET /me` with the token | `200 {"id":1,"username":"nadia","role":"user"}` |
| `GET /me` with no token | `401 {"error":"missing bearer token"}` |

No response ever contained `argon2` or `passwordHash`: the app builds its reply from a short allowlist of fields (`id`, `username`, `role`) instead of returning the stored record. Started without `JWT_SECRET`, the app refuses to run, the same pattern as Topic 81.

A few choices in the validation schema are deliberate. The password rule is length only (8 to 128 characters), not "must contain a digit and a symbol". The password is **not trimmed**, because silently changing it could make it impossible to type again later. The cap on the length keeps absurd inputs out, and bcrypt would ignore everything after 72 bytes anyway. At login, the password is only checked for being a string of sane size, so a login response does not reveal the registration rules. These are design choices for the demo, so check your own requirements.

#### Timing can reveal which usernames exist

Returning the same `401` message for "no such user" and "wrong password" (Topic 81) is not enough if one of the two cases is much faster. An unknown user needs no hash verification, so a naive login returns almost immediately. `login-timing-check.js` runs two copies of the app and times 15 requests of each kind after a warm-up. Verified directly:

```text
equalizeTiming: false (returns early for unknown users)
  unknown user, any password : median    1.8 ms   (range 1.5 to 7.8)
  known user, wrong password : median   34.0 ms   (range 28.9 to 39.2)
  difference of medians      : 32.1 ms
  same response either way?    true   (401 {"error":"invalid credentials"})

equalizeTiming: true (verifies against a dummy hash)
  unknown user, any password : median   29.7 ms   (range 27.8 to 36.1)
  known user, wrong password : median   30.3 ms   (range 28.5 to 34.9)
  difference of medians      : 0.6 ms
```

Without the fix, the body was identical but the clock gave the answer away: about 1.8 ms for a username that does not exist, and about 34 ms for one that does. The fix is to verify the submitted password against a **dummy hash** (a real hash of a throwaway value, computed at startup) when the user is not found, so both paths do the same work. This was measured on localhost within one process, where noise is small, and a repeat run gave the same picture (1.9 ms vs 31.3 ms without the fix, a 0.9 ms difference with it). Over a real network the difference is harder to see but can be averaged out by an attacker with enough requests, which was not tested here. Registration has a related leak that this demo does not fix: `username_taken` tells anyone which usernames exist. Many sites accept that trade-off for registration and hide it elsewhere (for example, in "reset password" flows). The mitigations were not demonstrated.

#### Upgrading hashes on login

You cannot rehash stored hashes in bulk, because you do not have the passwords. You can only rehash a password at the moment you hold it, which is a successful login. `rehash-on-login-demo.js` registers a user while the app uses the OWASP minimum, then "redeploys" with stronger settings and the same user store. Verified directly:

```text
version 1 (OWASP minimum)       stored parameters: m=19456,p=1,t=2
version 2 (stronger settings):
  login with the WRONG password -> 401   stored parameters after the failed login: m=19456,p=1,t=2 | hash unchanged: true
  login with the RIGHT password -> 200   stored parameters after the successful login: m=65536,p=1,t=3
  app log: [ 'rehashed password for nadia' ]
login again -> 200 | log entries so far: 1     (not rehashed a second time)
```

A failed login leaves the hash untouched, a successful one upgrades it, and the next login does nothing more. Accounts that never log in again keep their old hash, which OWASP's cheat sheet also notes. It suggests expiring long-inactive accounts, or forcing a reset, for those.

### What this topic does not cover

- **A pepper**, a secret value kept outside the database and mixed into every password. OWASP's page treats it as extra protection when only the database leaks, and notes that changing it later forces affected users to reset. Not demonstrated.
- **Limiting login attempts**, account lockout and rate limiting (Topic 89).
- **Multi-factor authentication**, password reset flows, and checking passwords against known-breached lists.
- **Stealing a password at the browser**, which is XSS (Topic 85), and abusing a logged-in session, which is CSRF (Topic 86).

### Common mistakes

| Mistake | What it costs |
| --- | --- |
| Storing passwords as plain text | A leak is the passwords themselves. |
| Using SHA-256 or MD5 for passwords | Fast by design: about 500,000 to 900,000 guesses per second per thread here. |
| Hashing without a salt | The same password gives the same hash, and a precomputed table cracks the leak instantly. |
| Treating the salt as a secret | It is stored beside the hash, so it only defeats precomputation. |
| Using `scryptSync`, `hashSync` or `pbkdf2Sync` in a request handler | The whole server was frozen for 380 to 530 ms per call. |
| Comparing hashes with `===` | Use a constant-time comparison such as `crypto.timingSafeEqual`, or the library's `verify`. |
| Using bcrypt with long passwords | Only the first 72 bytes count. |
| Returning early when the user does not exist | A 1.8 ms vs 34 ms gap reveals which usernames exist. |
| Returning the stored user object from a route | The hash leaks. Build the reply from an allowlist of fields. |
| Hard-coding the algorithm and settings in many places | One file (`password-service.js`) should own it so upgrades are one change. |
| Copying someone's parameters without measuring | Choose settings against a login latency budget on your own hardware. |

### Practical tips

- Use argon2id if you can install it, scrypt (built in) if not, and bcrypt for an existing system. Use the library's own `hash` and `verify`, and store the whole PHC or bcrypt string in one column.
- Use the **async** API, so hashing runs off the main thread, and prefer a native implementation (`argon2`, native `bcrypt`, or `crypto.scrypt`) over pure JavaScript on a busy server.
- Keep the algorithm and settings in one module, and upgrade stored hashes at login with `needsRehash`.
- Make "unknown user" and "wrong password" identical in both the response body and the work done.
- Validate input first (Topic 83), cap the password length, never trim or transform a password, and never log one.
- Never return a stored user record from a route. Pick the fields you mean to send.
- Put a limit on login attempts (Topic 89), because every attempt is expensive for you as well.

## Resources

- OWASP, Password Storage Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html>
- RFC 9106, Argon2 Memory-Hard Function for Password Hashing: <https://www.rfc-editor.org/rfc/rfc9106>
- Node.js documentation, crypto (`scrypt`, `timingSafeEqual`): <https://nodejs.org/api/crypto.html>
- bcrypt.js on npm: <https://www.npmjs.com/package/bcryptjs>

## Practice

1. In `fast-hash-problem.js`, add five more passwords to `commonPasswords` and three more accounts, then count how many of the accounts the precomputed table cracks. Then change the hashing to the salted version from `salt-demo.js` and count again.
2. In `scrypt-builtin.js`, change `N` to `2 ** 15` and find the smallest `maxmem` that makes it work. Then explain why a stored hash made with the old `N` still verifies after you change the constant.
3. In `bcrypt-demo.js`, find the longest password made of the character `é` that does not truncate. Then write a Zod schema (Topic 83) that rejects passwords over 72 **bytes** for a bcrypt-backed app.
4. In `auth-app-hashed.js`, set `equalizeTiming` to `false` and write a `curl` loop that times 20 logins for an unknown user and 20 for a known user. Compare your numbers with `login-timing-check.js`.
5. Add a `migrate-from-bcrypt` path to `password-service.js`: if the stored string starts with `$2b$`, verify with `bcryptjs`, and on success replace it with an argon2id hash. Test it with a user whose hash was created by `bcrypt-demo.js`.

## Code Example

- [fast-hash-problem.js](./02-password-hashing/fast-hash-problem.js)
- [salt-demo.js](./02-password-hashing/salt-demo.js)
- [scrypt-builtin.js](./02-password-hashing/scrypt-builtin.js)
- [bcrypt-demo.js](./02-password-hashing/bcrypt-demo.js)
- [argon2-demo.js](./02-password-hashing/argon2-demo.js)
- [cost-benchmark.js](./02-password-hashing/cost-benchmark.js)
- [event-loop-blocking.js](./02-password-hashing/event-loop-blocking.js)
- [password-service.js](./02-password-hashing/password-service.js)
- [auth-app-hashed.js](./02-password-hashing/auth-app-hashed.js)
- [login-timing-check.js](./02-password-hashing/login-timing-check.js)
- [rehash-on-login-demo.js](./02-password-hashing/rehash-on-login-demo.js)
- [.env.example](./02-password-hashing/.env.example)

To run it yourself, run `npm install` in the project folder. Each demo is a plain script: `node fast-hash-problem.js`, `node salt-demo.js`, `node scrypt-builtin.js`, `node bcrypt-demo.js`, `node argon2-demo.js`, `node cost-benchmark.js`, `node event-loop-blocking.js` (also try `UV_THREADPOOL_SIZE=16 node event-loop-blocking.js`), `node login-timing-check.js` and `node rehash-on-login-demo.js`. For the app, run `JWT_SECRET="a-long-random-string" node auth-app-hashed.js` (port 4900) and use `curl`, for example `curl -X POST -H "Content-Type: application/json" -d '{"username":"nadia","password":"correct horse battery staple"}' http://localhost:4900/register`, then the same body to `/login`, then `curl -H "Authorization: Bearer <token>" http://localhost:4900/me`. `argon2` is a native package that ships a prebuilt binary, so it installed without a compiler here. On a platform without a matching binary, `npm install` may need a build toolchain, and that was not tested.

# Input Validation

**Topic 83 of 89** (Section: Web Security Basics, 1 of 4)

## Notes

### Project structure

```text
no-validation-app.js      -> an API that trusts everything, and the requests that break it
validation-by-hand.js     -> the same API with hand-written checks: type first, an allowlist, all errors at once
zod-basics.js             -> Zod's behaviour one rule at a time, with no Express involved
zod-app.js                -> Zod as Express middleware for body, query and URL params, plus a central error handler
express-input-limits.js   -> what Express does with raw input before your code runs: size limit, strict JSON, query parser
nosql-injection-demo.js   -> operator injection, using an in-memory MongoDB-style engine (mingo), and two fixes
sql-injection-demo.js     -> SQL injection on a real in-memory SQLite database, and the real fix
redos-demo.js             -> a validation regex that freezes the whole server
package.json
```

This section, Web Security Basics, starts with the idea every other security topic leans on: **everything that comes from outside your server is untrusted**. The request body, the query string, the URL params, the headers and the cookies are all written by whoever sent the request, and that is not always your own frontend. Validation is the code that checks, before you use a value, that it has the shape, type and range you expected.

It builds on earlier topics. Validation is a middleware (Topic 76) that answers with the status codes and error shapes from Topics 77 and 78. The login route from Topic 81 is the one an attacker targets first, and Topic 82 showed that the browser, not the server, enforces CORS, which is the same lesson in another form: a server cannot assume anything about the client. The next topics build on this one: password storage (Topic 84), XSS (Topic 85) and CSRF (Topic 86).

Everything below was run on Node 22.22.0 with Express 5.3.0, Zod 4.6.7, mingo 7.2.5 and Mongoose 9.11.2. Where something is not a measured result, the notes say so.

### Frontend validation is a convenience, not a defense

A form with `required`, `type="email"` and `maxlength` gives users fast feedback, but none of it reaches the server. Anyone can send a request that no form would ever produce. `no-validation-app.js` is an API that trusts its input, and the requests below are exactly what `curl` can send and a browser form cannot:

```js
app.post("/users", (req, res) => {
  const user = { id: users.length + 1, role: "user", ...req.body };  // the client decides every field
  user.email = user.email.toLowerCase();                              // assumes a string
  users.push(user);
  res.status(201).json(user);
});
```

| Request body | Result |
| --- | --- |
| `{"name":"Nadia","email":"Nadia@Example.com"}` | `201`, stored with a lowercased email. The one request that behaves. |
| `{"name":"Bad","email":123}` | **`500`**, the error was `TypeError: user.email.toLowerCase is not a function` |
| `{"name":"NoEmail"}` | **`500`**, `TypeError: Cannot read properties of undefined (reading 'toLowerCase')` |
| `{"name":"Mallory","email":"m@x.io","role":"admin","id":999}` | **`201`, and the stored user is `{"id":999,"role":"admin",...}`** |
| `{"name":["a","b"],"email":"z@x.io","age":"abc","bio":{"nested":true}}` | `201`, and the array, the text age and the nested object were all stored as sent |

Three separate problems showed up, and each one has a name worth knowing:

- **Type confusion.** The code assumed `email` was a string. A number, a missing field or an object made it throw, so the client could trigger a `500` at will.
- **Mass assignment.** Spreading `req.body` into a new record let the client set `role` to `"admin"` and choose its own `id`. Nothing in the route asked for those fields, and the stored record was still affected.
- **Query strings are always strings.** `GET /items?page=2` followed by `page + 1` produced `{"page":"2","next":"21","typeOfNext":"string"}`, string concatenation instead of addition.

### Validation by hand

`validation-by-hand.js` serves the same endpoint with every rule written out, so the ideas are visible before a library hides them:

```js
function validateNewUser(body) {
  const errors = [];
  if (!isPlainObject(body)) return { errors: [{ field: "(body)", message: "must be a JSON object" }] };

  let email = body.email;
  if (typeof email !== "string") {
    errors.push({ field: "email", message: "must be a string" });          // type first
  } else {
    email = email.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {   // then length, then pattern
      errors.push({ field: "email", message: "must be a valid email address" });
    }
  }
  // ... name and age are checked the same way ...

  if (errors.length > 0) return { errors };
  return { value: { name, email, ...(age !== undefined && { age }) } };   // a NEW object, built from an allowlist
}
```

The same requests, run against it:

| Request body | Result |
| --- | --- |
| `{"name":"  Nadia ","email":"  Nadia@Example.com ","age":29}` | `201`, stored as `{"id":1,"role":"user","name":"Nadia","email":"nadia@example.com","age":29}` |
| `{"name":"Bad","email":123}` | `400 {"errors":[{"field":"email","message":"must be a string"}]}` |
| `{"name":"NoEmail"}` | `400`, the same message as the line above |
| `{"name":"Mallory","email":"m@x.io","role":"admin","id":999}` | `201`, stored as `{"id":2,"role":"user","name":"Mallory","email":"m@x.io"}`. `role` and `id` were never copied. |
| `{"name":["a","b"],"email":"z@x.io","age":"abc","bio":{...}}` | `400`, with errors for `name` and `age` in the same response |
| `[1,2,3]` | `400 {"errors":[{"field":"(body)","message":"must be a JSON object"}]}` |
| `{"name":"   ","email":"a@b.co","age":29.5}` | `400`, with errors for `name` (empty after trimming) and `age` (not a whole number) |

Three habits in that code carry over to every approach:

1. **Check the type first, then the content.** `"must be a string"` has to come before any call to a string method.
2. **Build a new object from an allowlist of fields.** The `role` attack from the previous section failed because `role` was never copied, not because anyone looked for the word "admin". An allowlist (accept only what you expect) beats a denylist (reject what you recognise as bad), because you will never recognise every bad input.
3. **Collect every problem and answer once with a `400`.** The client sees all its mistakes in one round trip.

The hand-written version also shows its limits: a missing email and an email of the wrong type produce the same message, and every new field is more code to get right. That is the case for a schema library.

### Schema validation with Zod

A **schema** describes the data you accept, and a library checks input against it. Zod is a widely used one in the TypeScript and Node world, and the same schemas can be shared between a React form and an Express route. These notes use Zod 4.6.7. Some function names differ in Zod 3 (for example `z.string().email()` instead of `z.email()`), and only 4.6.7 was tested.

#### What `safeParse` returns

`safeParse` never throws. It returns an object with `success`, and either `data` or an `error` holding a list of `issues`. Verified directly with `zod-basics.js`:

```text
valid input: success / data     -> {"success":true,"data":{"name":"Nadia","email":"nadia@example.com","age":29}}
  (the input was { name: "  Nadia ", ... }: the trim ran as part of parsing)

invalid input { name: 5, email: "not-an-email", age: 29.5 }:
  issue at path [name]          -> invalid_type: Invalid input: expected string, received number
  issue at path [email]         -> invalid_format: Invalid email address
  issue at path [age]           -> invalid_type: Invalid input: expected int, received number
```

Unlike the hand-written version, Zod tells "missing" from "wrong type": `{ email }` with no name gave `expected string, received undefined`, and `{ name: null }` gave `expected string, received null`.

#### Unknown keys

By default `z.object` **drops** keys it does not know, and `z.strictObject` **rejects** them:

```text
input { name: "Mallory", email: "m@x.io", role: "admin", id: 999 }
z.object (default)          -> {"name":"Mallory","email":"m@x.io"}
z.strictObject              -> success false, issue: unrecognized_keys ["role","id"]
```

Dropping makes the mass-assignment attack harmless without telling the client. Rejecting tells the client it sent something wrong. `zod-app.js` uses the default for creating a user and `strictObject` for the `PATCH` route.

#### Query strings, coercion, and its traps

Every query-string and URL-param value arrives as a string, so numbers and booleans need converting. Zod offers `z.coerce.number()` and `z.coerce.boolean()`, which look like the obvious tool. Verified directly, they are traps:

```text
z.coerce.number() on:  "12" -> 12    ""  -> 0 (OK)    "   " -> 0 (OK)    "abc" -> rejected
                       null -> 0 (OK)   true -> 1 (OK)   [] -> 0 (OK)   "1e3" -> 1000   "0x10" -> 16

z.coerce.boolean() on: "true" -> true   "false" -> TRUE   "0" -> TRUE   "no" -> TRUE   "" -> false
z.stringbool()     on: "true" -> true   "false" -> false  "0" -> false  "no" -> false  "" -> rejected
```

An empty `?page=` quietly becoming `0`, and the text `"false"` becoming `true`, are the kind of bug that passes review. The safer pattern accepts a strict shape first, then converts, then checks the range:

```js
const page = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(1000));
```

Verified: `"2"` is accepted as `2`, and `""`, `"   "`, `"abc"`, `"1e3"`, `"0x10"`, `"0"`, `"5000"`, `"-1"` and `"2.5"` are all rejected. For booleans, `z.stringbool()` treats the string `"false"` as `false`.

#### Normalising while validating

`z.string().trim().toLowerCase().pipe(z.email())` turned `"  Nadia@Example.COM  "` into `nadia@example.com` and then validated it. Defaults work the same way: `z.object({ q: z.string().default(""), limit: ... .default(20) }).parse({})` gave `{"q":"","limit":20}`.

#### Zod as Express middleware

`zod-app.js` wraps the schemas in one reusable middleware that checks the body, the query and the params, and passes a single error to the central error handler (the Topic 78 pattern):

```js
function validate({ body, query, params }) {
  const parts = { body, query, params };
  return (req, res, next) => {
    const details = [];
    const validated = {};
    for (const [where, schema] of Object.entries(parts)) {
      if (!schema) continue;
      const result = schema.safeParse(req[where]);
      if (result.success) validated[where] = result.data;
      else for (const issue of result.error.issues)
        details.push({ in: where, field: issue.path.join(".") || "(root)", message: issue.message });
    }
    if (details.length > 0) return next(new ValidationError(details));
    req.validated = validated;     // not req.query = ...; see the Express section below
    next();
  };
}

app.post("/users", validate({ body: newUser }), (req, res) => {
  const user = { id: users.length + 1, role: "user", ...req.validated.body };
  ...
});
```

Because the route reads `req.validated.body`, which holds only the fields the schema kept, spreading it is safe, unlike the unvalidated app. Verified directly, with these requests:

| Request | Result |
| --- | --- |
| `POST /users` with a padded, mixed-case email | `201`, stored as `nadia@example.com` |
| `POST /users` with `role` and `id` in the body | `201`, and the stored user has `"role":"user"` and `"id":2`, the extras dropped |
| `POST /users` with `name: ["a","b"]`, `email: "nope"`, `age: "abc"` | `400`, **all three problems** in `details` |
| `POST /users` with no body at all | `400`, `Invalid input: expected object, received undefined` |
| `POST /users` with malformed JSON `{"name": "x",` | `400 {"error":"entity.parse.failed"}` |
| `GET /users?page=1&limit=5&active=true&q=nad` | `200`, with `query` parsed to `{"q":"nad","page":1,"limit":5,"active":true}` (real numbers and a real boolean) |
| `GET /users` | `200`, defaults applied: `{"page":1,"limit":20}` |
| `GET /users?page=abc` | `400`, `Invalid string: must match pattern /^\d+$/` |
| `GET /users?limit=500&q=a&q=b` | `400`, `limit` too big **and** `q` rejected because a repeated parameter arrives as an array |
| `GET /users/abc` | `400`, `must be a whole number` (the params schema) |
| `GET /users/42` | `404`, a valid shape but no such user. Validation and "not found" are different questions. |
| `PATCH /users/1` with `{"name":"N","role":"admin"}` | `400`, `Unrecognized key: "role"` |
| `PATCH /users/1` with `{}` | `400`, `send at least one field to change` (a `.refine()` rule) |
| `PATCH /users/xyz` with `{"age":-5}` | `400`, with one error `in: "body"` and one `in: "params"` |

A full error response looks like this, and it has the same shape every time:

```json
{
  "error": "validation_failed",
  "details": [
    { "in": "body", "field": "name",  "message": "Invalid input: expected string, received array" },
    { "in": "body", "field": "email", "message": "Invalid email address" }
  ]
}
```

The central handler returns `{"error":"internal_error"}` for anything unexpected, with no stack trace and no message. None of the requests above reached it: the server log held nothing but its startup line. `400` is the usual status for invalid input. Some APIs use `422 Unprocessable Content` for "well-formed but invalid"; either works, and what matters is choosing one and using it everywhere. `z.flattenError(error)` is a ready-made alternative shape: `{"formErrors":[],"fieldErrors":{"name":[...],"email":[...]}}`.

### What Express does with raw input before your code runs

`express-input-limits.js` starts small servers and probes them with `fetch`. These behaviours apply before any of your own validation.

**Body size limit.** `express.json()` has a default limit (the body-parser documentation gives it as 100kb, and the boundary measured here is consistent with that):

```text
express.json() default          body ~0.5 kB -> 200     ~90 kB -> 200     ~110 kB -> 413 {"type":"entity.too.large"}
express.json({ limit: "1kb" })  body ~0.5 kB -> 200     ~90 kB -> 413     ~110 kB -> 413
```

(The sizes are in KiB, 1024 bytes.) A request over the limit is refused with `413` before your route runs. Set a limit that fits your API instead of leaving the default, since most JSON endpoints need far less than 100kb.

**Strict JSON, and the content type.**

```text
{"a":1}  (object)                     -> 200, body parsed
[1,2]    (array)                      -> 200, body parsed
"hello"  (top-level string)           -> 400 entity.parse.failed
5        (top-level number)           -> 400 entity.parse.failed
null                                  -> 400 entity.parse.failed
{"a":1} with Content-Type: text/plain -> 200, but req.body is undefined
no Content-Type and no body           -> 200, req.body is undefined
```

By default `express.json()` only accepts objects and arrays at the top level. The last two lines are easy to miss: when the parser does not run (wrong `Content-Type`, no body), **`req.body` is `undefined`** in Express 5, not an empty object. Code that does `req.body.email` throws a `TypeError` there, which is why the validator must treat `undefined` as invalid input (the Zod run above answered the no-body request with a clean `400`).

**The query-string parser.** The default parser in Express 5.3.0 is `"simple"` (`app.get("query parser")` returned `"simple"`). Compare it with `"extended"`, the nested parsing that was the default in Express 4 according to the Express 5 migration notes (Express 4 itself was not run here):

```text
                       default ("simple")                 "extended"
?tag=a&tag=b           {"tag":["a","b"]}                   {"tag":["a","b"]}
?user[name]=ana        {"user[name]":"ana"}                {"user":{"name":"ana"}}
?filter[$ne]=x         {"filter[$ne]":"x"}                 {"filter":{"$ne":"x"}}
?id[]=1&id[]=2         {"id[]":["1","2"]}                  {"id":["1","2"]}
```

Two things matter. A repeated key becomes an **array** in both modes, so code that expects a string can receive an array (which is why the Zod schema above rejected `?q=a&q=b`). And with `"extended"`, a plain URL such as `?filter[$ne]=x` produces `{ filter: { $ne: "x" } }`, an object with a `$` key built from nothing but a query string. If that object is passed into a MongoDB query it is an operator injection, shown below. Express 5's default does not do this, but an app that switches to `"extended"` brings the risk back.

**`req.query` is read-only in Express 5.** A validation middleware that does `req.query = parsedQuery` looks natural, and does not work:

```text
sloppy-mode handler:   req.query = { page: 99 }  ->  {"afterAssignment":{"page":"1"}}   (assignment silently ignored)
strict-mode handler:   req.query = { page: 99 }  ->  TypeError: Cannot set property query of #<IncomingMessage> which has only a getter
```

A normal CommonJS file is not in strict mode, so the assignment fails **silently** and the route carries on with the unvalidated strings. That is why `validate()` stores its result on `req.validated` instead.

### Injection: what validation is most famous for

An **injection** attack happens when input is interpreted as code or as a query operator instead of being treated as plain data.

#### NoSQL operator injection

A MongoDB filter is an object, so a client that can send an object where a string was expected can send an **operator**. `nosql-injection-demo.js` runs an Express login route against an in-memory data set. `mingo` implements MongoDB's query operators and stands in for the database. **No MongoDB server was involved**, so this shows how the operators behave, not a run against a real server. The passwords are plain text for the demo only (Topic 84 covers hashing).

```js
// VULNERABLE: the body goes straight into the filter
const { username, password } = req.body;
findOne({ username, password });
```

Three versions of the route were sent the same six requests:

| Request | Vulnerable | Validated with Zod (`z.string()`) | `mongoose.sanitizeFilter` |
| --- | --- | --- | --- |
| correct credentials | `200` admin | `200` admin | `200` admin |
| wrong password | `401` | `401` | `401` |
| `password: {"$ne": null}` (admin, password unknown) | **`200` logged in as admin** | `400` | `401` |
| `username` and `password` both `{"$ne": null}` | **`200` logged in as admin** (first user in the data) | `400` | `401` |
| `password: {"$regex": "^s3"}` | **`200`** | `400` | `401` |
| `password: {"$regex": "^zz"}` | `401` | `400` | `401` |

The last two rows show why this is worse than a bypass: `$regex` turns the login into a yes/no question about the stored password, and the difference between `200` and `401` is the answer. The fixes:

- **Validate the shape.** A `z.string()` field cannot hold `{"$ne": null}`, and the route answered `400` to all four attacks. This is the direct benefit of validating types, not just formats.
- **`mongoose.sanitizeFilter`** wraps any nested object with `$` keys in `$eq`, so it is compared as a value instead of run as an operator: `{"username":"admin","password":{"$ne":null}}` became `{"username":"admin","password":{"$eq":{"$ne":null}}}`, and every attack then failed with `401`. It was called here as a plain function; Mongoose also offers a `sanitizeFilter` query option, which was not run. Use it as a second layer, not a replacement.

#### SQL injection, and why validation alone is not the fix

`sql-injection-demo.js` uses Node's built-in `node:sqlite` (no install; Node prints an "experimental" warning, which `--disable-warning=ExperimentalWarning` hides). It runs one lookup three ways against a real in-memory SQLite database:

```js
// 1. concatenation: the input becomes SQL text
db.prepare("SELECT id, name, role FROM users WHERE name = '" + name + "'").all();

// 2. parameterized: fixed SQL text, the value travels separately
db.prepare("SELECT id, name, role FROM users WHERE name = ?").all(name);
```

| Input | Concatenation | Parameterized | Allowlist validation, then concatenation |
| --- | --- | --- | --- |
| `nadia` | 1 row | 1 row | 1 row |
| `x' OR '1'='1` | **3 rows, every user** | 0 rows | rejected |
| `x' UNION SELECT id, label \|\| ': ' \|\| value, 'leaked' FROM secrets --` | **1 row: `api_key: sk-live-123456`, a value from a different table** | 0 rows | rejected |
| `Conor O'Brien` (a real name) | **error: `near "Brien": syntax error`** | 1 row | **rejected** |

The SQL the concatenation version built for the second input shows the mechanism: `... WHERE name = 'x' OR '1'='1'`, where the quotes in the input closed the string and added logic of its own.

Parameterized queries are the fix, because the database never parses the value as SQL: the attacks return zero rows, and `O'Brien` works. Validation alone (an allowlist `^[A-Za-z0-9_]{1,30}$` in front of the vulnerable query) did block both attacks, but it also **rejected a legitimate customer**, and it only protects you for as long as every future field gets the same careful pattern. The point is not that validation is useless. It is that the two jobs are different: parameterization makes a class of bug impossible, and validation keeps garbage, oversized and malformed values out. Use both.

### Validation, sanitization and escaping are three different jobs

| Job | What it does | Where it runs | Example here |
| --- | --- | --- | --- |
| **Validation** | Accepts or rejects the input | At the boundary, once, on the way in | `z.string().max(100)`, a `400` response |
| **Sanitization / normalisation** | Transforms accepted input into a canonical form | On the way in, after (or while) validating | `trim()`, `toLowerCase()` on an email |
| **Escaping / encoding** | Makes a value safe for one specific output context | At the moment of output, for that context | A SQL parameter, HTML encoding (Topic 85) |

Escaping depends on where the value ends up, and the same string needs different treatment in HTML, in SQL, in a shell command and in a URL, so it cannot be done once on input. Stripping "dangerous characters" on the way in is the mistake that rejected `Conor O'Brien` above. HTML escaping and XSS are the subject of Topic 85, and nothing about HTML output was tested here.

### Validation code can be the vulnerability: ReDoS

A regular expression with nested quantifiers can take exponential time on input that almost matches (**catastrophic backtracking**). Node runs JavaScript on one thread (Topic 72), so while the regex runs, nothing else is served. `redos-demo.js` tests `/^(\w+\s?)+$/`, a plausible "words separated by spaces" check, against `"aaaa...a!"`. Verified directly (one run; exact numbers differ from run to run and between machines, but the growth does not):

```text
input length   17        19        21        23        25        27
milliseconds    9.1       2.0       7.5      38.2     122.9     482.6      (and about 2 seconds at length 29)
```

In this run, every two added characters multiplied the time by roughly 3 to 5. The matching safe regex `/^[\w ]+$/` took 0.30 ms on a 100,001-character input. (It is not identical: it also allows runs of spaces.) A timer set to tick every 50 ms showed what the freeze means for a server:

```text
one regex call took 2004 ms; the longest gap between 50 ms ticks was 2054 ms
```

For two seconds nothing else ran. And the obvious defense does not work by itself:

```text
vulnerable regex + a length limit of 100    input length  29:  1962.41 ms
vulnerable regex + a length limit of 100    input length 151:     0.01 ms   (rejected by the limit)
safe regex       + a length limit of 100    input length  29:     0.01 ms
```

The blow-up starts at about 25 characters, far below any normal limit, so a length cap rejects huge inputs but not short evil ones. A length limit before a pattern is still good practice, but the real fix is a pattern without nested quantifiers (or a library validator, which still deserves a test with long almost-valid input). The built-in validators in Zod were not tested for this here.

### Common mistakes

| Mistake | What happens |
| --- | --- |
| Validating only in the frontend | Any `curl` call skips it. The unvalidated app took every request above. |
| Spreading `req.body` into a record | Mass assignment: the client set `role: "admin"` and `id: 999`. |
| `z.coerce.number()` or `z.coerce.boolean()` on query strings | `""` and `null` become `0`, and the text `"false"` becomes `true`. |
| `req.query = parsed` in Express 5 | Silently ignored in normal CommonJS code, so unvalidated strings carry on. |
| Assuming `req.body` is an object | It is `undefined` when the parser did not run, and `req.body.x` throws. |
| Passing request objects into a database filter | Operator injection: `{"$ne": null}` logged in as admin. |
| Building SQL with string concatenation | Tautologies, `UNION` data leaks, and even honest names with an apostrophe break. |
| Switching the query parser to `"extended"` without validating | A URL can create `$`-operator objects. |
| Nested quantifiers in a validation regex | One short request can block the whole process. |
| Returning stack traces or raw error messages | The central handler answered `{"error":"internal_error"}` and nothing more. |

### Practical tips

- Validate at the boundary: one middleware per route, before any logic, so the code after it works with typed, trusted data.
- Check the type before the content, and a length limit before a pattern.
- Use an allowlist: define what you accept, and build a new object from only those fields.
- Set an explicit body size limit that suits the route, and expect `413` from it.
- Convert query-string numbers and booleans with a strict pattern (`^\d+$`) or `z.stringbool()`, not `z.coerce`.
- Put validated data on its own property (`req.validated`), never back on `req.query`.
- Use parameterized queries for SQL, and validate or sanitize filters for MongoDB. Do not rely on either layer alone.
- Return one consistent error shape with a `400`, and list every problem at once.
- Treat validation as protection for your own code and data, not as a replacement for escaping on output (Topic 85) or for authentication and authorization (Topic 81).

## Resources

- OWASP, Input Validation Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html>
- OWASP, SQL Injection Prevention Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html>
- OWASP, Regular expression Denial of Service (ReDoS): <https://community.owasp.org/attacks/Regular_expression_Denial_of_Service_-_ReDoS>
- Zod documentation: <https://zod.dev>
- Express API reference (`express.json`, `req.query`): <https://expressjs.com/en/api.html>

## Practice

1. In `no-validation-app.js`, add a `DELETE /users/:id` route that trusts `req.params.id`, then call it with `abc` and with a very long value. Then fix it with a params schema in `zod-app.js` and compare the responses.
2. In `zod-app.js`, change the `POST /users` schema to `z.strictObject` and send the `role` and `id` request again. Write down what the client now learns that it did not before, and why you might prefer the old behaviour for a public API.
3. In `zod-basics.js`, test `z.coerce.number()` on `"Infinity"` and `"-0"`, then write a stricter schema for a `price` query parameter that allows two decimal places and rejects everything else.
4. In `express-input-limits.js`, change the `express.json()` limit to `"10kb"`, find where the `413` starts, and add a custom message for it in the central error handler.
5. In `redos-demo.js`, find another nested-quantifier pattern (for example `/^(a|aa)+$/`), measure it with the same input style, and write the safe equivalent.

## Code Example

- [no-validation-app.js](./01-input-validation/no-validation-app.js)
- [validation-by-hand.js](./01-input-validation/validation-by-hand.js)
- [zod-basics.js](./01-input-validation/zod-basics.js)
- [zod-app.js](./01-input-validation/zod-app.js)
- [express-input-limits.js](./01-input-validation/express-input-limits.js)
- [nosql-injection-demo.js](./01-input-validation/nosql-injection-demo.js)
- [sql-injection-demo.js](./01-input-validation/sql-injection-demo.js)
- [redos-demo.js](./01-input-validation/redos-demo.js)

To run it yourself, run `npm install` in the project folder. `node zod-basics.js`, `node express-input-limits.js`, `node nosql-injection-demo.js` and `node redos-demo.js` need nothing else. For the SQL demo run `node --disable-warning=ExperimentalWarning sql-injection-demo.js` (it was tested on Node 22.22.0; older Node versions may need `--experimental-sqlite`, which was not tested). The three servers take an optional port and are used with `curl`: `node no-validation-app.js` (port 4800), `node validation-by-hand.js` (port 4801) and `node zod-app.js` (port 4802), for example `curl -X POST -H "Content-Type: application/json" -d '{"name":"Mallory","email":"m@x.io","role":"admin","id":999}' http://localhost:4802/users`.

# Environment Config

**Topic 79 of 89** (Section: Node.js / Express, 9 of 12)

## Notes

### Project structure

```text
.env                       -> local defaults for this demo
.env.development            -> NODE_ENV=development overrides
.env.production              -> NODE_ENV=production overrides
raw-process-env-demo.js      -> process.env with nothing, and then something, loading .env
dotenv-demo.js                -> the dotenv package loading .env in code
multi-env-files-demo.js        -> picking a .env.* file based on NODE_ENV
config.js                       -> a centralized, validated, type-coerced config module
config-usage-demo.js             -> a small Express app that only ever imports config.js
```

Topic 68 covered environment variables inside Next.js, where the framework's own build step does real work for you: a `NEXT_PUBLIC_` variable gets compiled into a literal constant everywhere, and `.env`/`.env.local` loading is automatic. None of that exists in a plain Node.js/Express app. This topic is about what's actually true with nothing but Node itself, and the conventions that fill the gap.

### Nothing loads .env for you, and every value is a string

`raw-process-env-demo.js` reads `process.env.PORT` and `process.env.DEBUG_MODE`, values defined only in a `.env` file. Verified directly, run two different ways:

```text
plain `node raw-process-env-demo.js`, no flags:
  PORT from process.env: undefined
  DEBUG_MODE from process.env: undefined

`node --env-file=.env raw-process-env-demo.js`:
  PORT from process.env: 3000
  typeof PORT: string
  DEBUG_MODE from process.env: true
  typeof DEBUG_MODE: string
  PORT + 1 = 30001 (string concatenation, not addition!)
  Number(PORT) + 1 = 3001 (this is what you actually want)
  DEBUG_MODE === true ? false (always false, it's the STRING "true", not the boolean true)
```

Two separate facts here, both easy to trip over in a real app: first, a `.env` file is just a text file, nothing reads it unless something is told to; second, every single value that ends up in `process.env`, no matter what it looks like, is always a plain string. `"3000" + 1` is `"30001"`, not `3001`, and `"true" === true` is `false`. Anything that needs a real number or boolean has to convert it explicitly, every time.

### Two ways to actually load a .env file: Node's own flag, or the dotenv package

```text
node --env-file=.env app.js        <- built into Node itself (Node 20.6+), no package needed
```

```js
require("dotenv").config();         // dotenv package, called at the very top of the entry file
```

Verified directly, `dotenv-demo.js` loading the same `.env` file in code:

```text
◇ injected env (5) from .env
APP_NAME: Topic79Demo
PORT: 3000 (string)
MAX_RETRIES: 5 (string)
```

Most existing Express projects still use the `dotenv` package rather than `--env-file`, mainly so `node app.js` behaves identically everywhere, in a deploy script, a process manager, or someone else's terminal, without that flag needing to be remembered or wired in separately. Node's native `--env-file` is newer and perfectly workable for a project willing to standardize on how it's always started.

### A real environment variable always wins over the .env file

Verified directly, for both loading methods, with `PORT=9999` exported in the shell and `PORT=3000` sitting in `.env`:

```text
dotenv:         PORT: 9999    (and it logged "injected env (4)", not 5, it skipped PORT entirely)
--env-file:      PORT: 9999
```

Neither method overwrites a variable that the real environment already provided. This is exactly the behavior you want in production: a platform (a container host, a CI system) sets real environment variables for secrets and per-deploy config, and a checked-in `.env` file, if one exists at all in that environment, only fills in values nothing else already supplied.

### Loading a different .env file per environment

Plain Node has no built-in convention for this, unlike Next.js. `multi-env-files-demo.js` does it by hand with dotenv's `path` option:

```js
const envName = process.env.NODE_ENV || "development";
require("dotenv").config({ path: path.join(__dirname, `.env.${envName}`) });
```

Verified directly, three different `NODE_ENV` values, three different files actually loaded:

```text
NODE_ENV unset (defaults to "development") -> loaded .env.development
  APP_NAME: Topic79Demo (development)
  LOG_LEVEL: debug
  DATABASE_URL: postgres://localhost:5432/myapp_dev

NODE_ENV=production -> loaded .env.production
  APP_NAME: Topic79Demo (production)
  LOG_LEVEL: error
  DATABASE_URL: postgres://prod-db.internal:5432/myapp
```

### Centralizing config: validate once, coerce once, import everywhere

Scattering `process.env.PORT` and `process.env.DEBUG_MODE === "true"` across many files means every one of them has to remember the string-coercion rules above, and a missing variable only gets noticed the first time some deeply nested code path actually tries to use it. `config.js` fixes both problems in one place:

```js
require("dotenv").config();

const REQUIRED_VARS = ["PORT", "APP_NAME", "API_SECRET"];
const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
}

module.exports = {
  port: Number(process.env.PORT),
  appName: process.env.APP_NAME,
  apiSecret: process.env.API_SECRET,
  debugMode: process.env.DEBUG_MODE === "true",
  maxRetries: Number(process.env.MAX_RETRIES || 3),
};
```

`config-usage-demo.js` is a tiny Express app that only ever imports this module, never touching `process.env` directly itself. Verified directly:

```text
GET / -> {"app":"Topic79Demo","debugMode":true,"debugModeType":"boolean","maxRetries":5,"maxRetriesType":"number"}
server log: Topic79Demo listening on port 3000 (a real number: number)
```

`config.port`, unlike raw `process.env.PORT`, really is the JavaScript number `3000`, and `config.debugMode` really is the boolean `true`, converted exactly once, in exactly one file. Removing `API_SECRET` from the `.env` file and requiring `config.js` again proves the fail-fast behavior, verified directly:

```text
Error: Missing required environment variable(s): API_SECRET
    at Object.<anonymous> (config.js:17:9)
```

The app never even starts, with a message naming exactly which variable is missing, instead of crashing later with a confusing `undefined` somewhere deep inside a request handler.

### Practical tips

- `.gitignore` every real `.env*` file that can hold secrets (`.env`, `.env.local`, `.env.production`, ...); commit a `.env.example` instead, listing every variable name the app needs with a placeholder or empty value, so a new contributor knows exactly what to fill in.
- Treat `config.js` (or whatever a project calls its centralized config module) as the only file in the codebase allowed to read `process.env` directly; everything else imports typed, validated values from it.
- Validate required variables at the very top of the app's startup path, before anything else runs; a crash in the first 10 lines with a clear message is far easier to diagnose than one three requests into production.
- Remember that a platform's real environment variables (set in a hosting dashboard, a container's env block, a CI secret) always take precedence over a checked-in `.env` file, this is intentional and is what makes it safe to ship a `.env.example` or even a non-secret `.env` alongside real code.

## Resources

- Node.js Docs, --env-file: <https://nodejs.org/api/cli.html#--env-fileconfig>
- dotenv on npm: <https://www.npmjs.com/package/dotenv>
- The Twelve-Factor App, Config: <https://12factor.net/config>

## Practice

1. Add a `NODE_ENV` validity check to `config.js` that throws if `NODE_ENV` is set to anything other than `"development"`, `"test"`, or `"production"`.
2. Change `multi-env-files-demo.js` to fall back to the plain `.env` file when no `.env.<NODE_ENV>` file exists for the current environment, instead of dotenv silently loading nothing.
3. Add a `PORT` range check to `config.js` (reject anything below 1024 or above 65535) and confirm it throws a clear error for an invalid value.
4. Write a `.env.example` file for this project, listing every variable `config.js` requires, with placeholder values instead of the real ones.
5. Add a `maskedSecret` field to the object `config.js` exports, showing only the first 3 characters of `API_SECRET` followed by asterisks, safe enough to log for debugging without exposing the real value.

## Code Example

- [.env](./09-environment-config/.env) · [.env.development](./09-environment-config/.env.development) · [.env.production](./09-environment-config/.env.production)
- [raw-process-env-demo.js](./09-environment-config/raw-process-env-demo.js)
- [dotenv-demo.js](./09-environment-config/dotenv-demo.js)
- [multi-env-files-demo.js](./09-environment-config/multi-env-files-demo.js)
- [config.js](./09-environment-config/config.js) · [config-usage-demo.js](./09-environment-config/config-usage-demo.js)

To run it yourself: `npm install express dotenv` in a folder containing these files, then run `node raw-process-env-demo.js` plain and again as `node --env-file=.env raw-process-env-demo.js`, `node dotenv-demo.js`, `NODE_ENV=production node multi-env-files-demo.js`, and `node config-usage-demo.js` followed by `curl http://localhost:3000/`.

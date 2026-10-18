// zod-basics.js
// What Zod does, one behaviour at a time, with no Express involved.
//
//   node zod-basics.js

const { z } = require("zod");

const show = (label, value) => console.log(label.padEnd(46), "->", typeof value === "string" ? value : JSON.stringify(value));

// ---- 1. safeParse never throws; it returns a result object ----
console.log("== 1. safeParse result shape");
const user = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email(),
  age: z.number().int().min(0).max(150).optional(),
});

const good = user.safeParse({ name: "  Nadia ", email: "nadia@example.com", age: 29 });
show("valid input: success / data", { success: good.success, data: good.data });

const bad = user.safeParse({ name: 5, email: "not-an-email", age: 29.5 });
show("invalid input: success", bad.success);
for (const issue of bad.error.issues) {
  show(`  issue at path [${issue.path.join(".")}]`, `${issue.code}: ${issue.message}`);
}

// ---- 2. Missing vs wrong type ----
console.log("\n== 2. missing field vs wrong type");
for (const input of [{ email: "a@b.co" }, { name: null, email: "a@b.co" }]) {
  const r = user.safeParse(input);
  show(JSON.stringify(input), r.error.issues.map((i) => i.message).join(" | "));
}

// ---- 3. Unknown keys: stripped by default, rejected by strictObject ----
console.log("\n== 3. unknown keys");
const withExtras = { name: "Mallory", email: "m@x.io", role: "admin", id: 999 };
show("z.object (default)", user.safeParse(withExtras).data);
const strict = z.strictObject({ name: z.string(), email: z.email() });
const strictResult = strict.safeParse(withExtras);
show("z.strictObject: success", strictResult.success);
show("z.strictObject: issues", strictResult.error.issues.map((i) => `${i.code} ${JSON.stringify(i.keys)}`).join(" | "));

// ---- 4. Query strings are strings: coercion, and its traps ----
console.log("\n== 4. z.coerce.number() on typical query-string values");
const coercedNumber = z.coerce.number();
for (const v of ["12", "", "   ", "abc", null, true, [], "1e3", "0x10"]) {
  const r = coercedNumber.safeParse(v);
  show(`coerce.number(${JSON.stringify(v)})`, r.success ? `OK ${JSON.stringify(r.data)}` : "rejected");
}

console.log("\n== 5. z.coerce.boolean() vs z.stringbool()");
for (const v of ["true", "false", "0", "", "no"]) {
  const c = z.coerce.boolean().safeParse(v);
  const s = z.stringbool().safeParse(v);
  show(`input ${JSON.stringify(v)}`, `coerce.boolean: ${c.data}   stringbool: ${s.success ? s.data : "rejected"}`);
}

console.log("\n== 6. a stricter way to accept a page number from a query string");
const page = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(1000));
for (const v of ["2", "", "   ", "abc", "1e3", "0x10", "0", "5000", "-1", "2.5"]) {
  const r = page.safeParse(v);
  show(`page(${JSON.stringify(v)})`, r.success ? `OK ${r.data}` : "rejected");
}

// ---- 7. Normalising while validating ----
console.log("\n== 7. trim and lowercase run as part of parsing");
const email = z.string().trim().toLowerCase().pipe(z.email());
show('email("  Nadia@Example.COM  ")', email.parse("  Nadia@Example.COM  "));

// ---- 8. Defaults and optional ----
console.log("\n== 8. defaults");
const search = z.object({ q: z.string().default(""), limit: z.coerce.number().int().min(1).max(100).default(20) });
show("search.parse({})", search.parse({}));

// ---- 9. A string schema rejects an operator object ----
console.log("\n== 9. a z.string() field and an injected object");
const login = z.object({ username: z.string(), password: z.string() });
const attack = login.safeParse({ username: { $ne: null }, password: { $ne: null } });
show("login.safeParse({ $ne } objects): success", attack.success);

// ---- 10. Turning issues into something a client can use ----
console.log("\n== 10. z.flattenError");
const flat = z.flattenError(user.safeParse({ name: "", email: "x", extra: 1 }).error);
show("flattenError", flat);

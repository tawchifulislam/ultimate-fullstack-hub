// sql-injection-demo.js
// SQL injection against a real (in-memory) SQLite database, using Node's
// built-in node:sqlite module (no install; Node prints an "experimental"
// warning because the module is still marked experimental).
//
// Three defences are compared on the same inputs:
//   1. string concatenation       (vulnerable)
//   2. parameterized query        (the actual fix)
//   3. validation alone           (helps, but is NOT the fix)
//
//   node sql-injection-demo.js

const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync(":memory:");
db.exec(`
  CREATE TABLE users   (id INTEGER PRIMARY KEY, name TEXT, role TEXT);
  CREATE TABLE secrets (id INTEGER PRIMARY KEY, label TEXT, value TEXT);
  INSERT INTO users   (name, role) VALUES ('nadia', 'user'), ('admin', 'admin'), ('Conor O''Brien', 'user');
  INSERT INTO secrets (label, value) VALUES ('api_key', 'sk-live-123456');
`);

// 1. VULNERABLE: the input becomes part of the SQL text.
function findByNameConcat(name) {
  return db.prepare("SELECT id, name, role FROM users WHERE name = '" + name + "'").all();
}

// 2. SAFE: the SQL text is fixed; the value travels separately as a parameter.
function findByNameParam(name) {
  return db.prepare("SELECT id, name, role FROM users WHERE name = ?").all(name);
}

// 3. Validation only: an allowlist pattern in front of the vulnerable query.
const SAFE_NAME = /^[A-Za-z0-9_]{1,30}$/;
function findByNameValidatedOnly(name) {
  if (!SAFE_NAME.test(name)) return "REJECTED by validation";
  return findByNameConcat(name);
}

const inputs = [
  ["a. ordinary name", "nadia"],
  ["b. tautology", "x' OR '1'='1"],
  ["c. UNION into another table", "x' UNION SELECT id, label || ': ' || value, 'leaked' FROM secrets --"],
  ["d. legitimate name with an apostrophe", "Conor O'Brien"],
];

const run = (fn, input) => {
  try {
    const result = fn(input);
    return typeof result === "string" ? result : `${result.length} row(s) ${JSON.stringify(result.map((r) => r.name))}`;
  } catch (err) {
    return `ERROR ${err.message}`;
  }
};

for (const [title, fn] of [
  ["1. concatenation", findByNameConcat],
  ["2. parameterized", findByNameParam],
  ["3. validation only (allowlist /^[A-Za-z0-9_]{1,30}$/ then concatenation)", findByNameValidatedOnly],
]) {
  console.log(`\n== ${title}`);
  for (const [label, input] of inputs) {
    console.log(`${label.padEnd(40)} -> ${run(fn, input)}`);
  }
}

// What did the attack's SQL actually look like?
console.log("\n== the SQL text the concatenation version built for input b and c");
for (const [, input] of inputs.slice(1, 3)) {
  console.log("SELECT id, name, role FROM users WHERE name = '" + input + "'");
}

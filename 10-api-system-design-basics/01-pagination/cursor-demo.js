// cursor-demo.js
// Cursor (keyset) pagination: the cursor, the "limit + 1" trick, the last page,
// a different sort order, what happens to garbage cursors, and the same condition
// written without row values.
//
//   node --disable-warning=ExperimentalWarning cursor-demo.js

const { createDatabase } = require("./db");
const { cursorPage, decodeCursor, CursorError } = require("./pagination");
const { median } = require("./timing");

const db = createDatabase();
const ids = (r) => r.data.map((x) => x.id).join(", ");
const asJson = (cursor) => Buffer.from(cursor, "base64url").toString("utf8");

console.log("== 1. three pages of 5, following nextCursor");
let cursor = null;
for (let page = 1; page <= 3; page++) {
  const r = cursorPage(db, { cursor, limit: 5 });
  console.log(`   page ${page}: ids ${ids(r)}   hasNext ${r.meta.hasNext}`);
  console.log(`           nextCursor ${r.nextCursor}`);
  console.log(`           decoded    ${asJson(r.nextCursor)}`);
  cursor = r.nextCursor;
}

console.log("\n== 2. the last page: no COUNT(*), no empty extra page");
// 100,000 rows with limit 50,000 is exactly two pages.
const p1 = cursorPage(db, { limit: 50_000 });
const p2 = cursorPage(db, { limit: 50_000, cursor: p1.nextCursor });
console.log(`   page 1: ${p1.data.length} rows, hasNext ${p1.meta.hasNext}`);
console.log(`   page 2: ${p2.data.length} rows, hasNext ${p2.meta.hasNext}, nextCursor ${p2.nextCursor}`);
console.log("   (the query asked for limit + 1 rows; page 2 got exactly 50,000, so it knew there was nothing after it)");

console.log("\n== 3. a different sort order: score (highest first, ties broken by id)");
const s1 = cursorPage(db, { limit: 4, sort: "score" });
const s2 = cursorPage(db, { limit: 4, sort: "score", cursor: s1.nextCursor });
for (const [label, r] of [["page 1", s1], ["page 2", s2]]) {
  console.log(`   ${label}: ${r.data.map((x) => `id ${x.id} (score ${x.score})`).join(", ")}`);
}
console.log(`   cursor: ${asJson(s1.nextCursor)}`);

console.log("\n== 4. cursors are not secret, and bad ones are rejected");
const makeCursor = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const attempts = [
  // [what the client sent, the cursor, the sort it asked for]
  ["not base64 at all", "!!!not-a-cursor!!!", "created_at"],
  ["valid base64, not JSON", Buffer.from("hello").toString("base64url"), "created_at"],
  ["empty object", makeCursor({}), "created_at"],
  ["a SQL string where a number belongs", makeCursor({ s: "created_at", v: ["1; DROP TABLE posts", 5] }), "created_at"],
  ["a fractional number", makeCursor({ s: "created_at", v: [1.5, 2] }), "created_at"],
  ["a score cursor sent with sort=created_at", makeCursor({ s: "score", v: [50, 2] }), "created_at"],
  ["a created_at cursor sent with sort=score", makeCursor({ s: "created_at", v: [1_700_000_100, 1] }), "score"],
];
for (const [label, cursorText, sort] of attempts) {
  try {
    cursorPage(db, { cursor: cursorText, limit: 3, sort });
    console.log(`   ${label.padEnd(42)} -> accepted`);
  } catch (err) {
    console.log(`   ${label.padEnd(42)} -> ${err instanceof CursorError ? "CursorError" : err.constructor.name}: ${err.message}`);
  }
}
const tableStillThere = db.prepare("SELECT COUNT(*) AS n FROM posts").get().n;
console.log(`   posts table still has ${tableStillThere} rows after the SQL-string attempt`);

// A well-formed cursor that a client made up is accepted: it just means "start after this position".
const forged = makeCursor({ s: "created_at", v: [1_700_000_100, 1] });
const jumped = cursorPage(db, { cursor: forged, limit: 3 });
console.log(`   a made-up but well-formed cursor -> accepted, starts at ids ${ids(jumped)}   (the cursor is a position, not a permission)`);
console.log("   decodeCursor on it:", JSON.stringify(decodeCursor(forged, "created_at")));

console.log("\n== 5. the same condition written without row values: same rows, different plan");
// "(created_at, id) < (?, ?)" spelled out for databases without row values:
//   created_at < ?  OR  (created_at = ?  AND  id < ?)
const COLUMNS = "id, title, author, score, created_at";
const rowValue = `SELECT ${COLUMNS} FROM posts WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT 100`;
const spelledOut = `SELECT ${COLUMNS} FROM posts WHERE created_at < ? OR (created_at = ? AND id < ?) ORDER BY created_at DESC, id DESC LIMIT 100`;
function walkWith(sql, args) {
  const seen = [];
  let last = db.prepare(`SELECT ${COLUMNS} FROM posts ORDER BY created_at DESC, id DESC LIMIT 100`).all();
  while (last.length) {
    seen.push(...last.map((r) => r.id));
    const { created_at, id } = last.at(-1);
    last = db.prepare(sql).all(...args(created_at, id));
  }
  return seen;
}
const a = walkWith(rowValue, (t, id) => [t, id]);
const b = walkWith(spelledOut, (t, id) => [t, t, id]);
console.log(`   walking all 100,000 rows, 100 at a time: row-value ${a.length} rows, spelled-out ${b.length} rows, same order: ${a.join() === b.join()}`);
const deep = db.prepare("SELECT created_at, id FROM posts ORDER BY created_at DESC, id DESC LIMIT 1 OFFSET 99899").get();
for (const [label, sql, args] of [
  ["row value ", rowValue, [deep.created_at, deep.id]],
  ["spelled out", spelledOut, [deep.created_at, deep.created_at, deep.id]],
]) {
  const plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...args).map((r) => r.detail);
  console.log(`   ${label}: ${median(() => db.prepare(sql).all(...args)).toFixed(3)} ms near the end of the table, plan ${JSON.stringify(plan)}`);
}

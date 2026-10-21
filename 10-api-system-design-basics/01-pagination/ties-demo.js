// ties-demo.js
// Sorting by a column that is not unique (a score, a timestamp) leaves ties, and
// pagination needs a TOTAL order. This shows three things:
//   1. the order of tied rows is not defined: SQLite changed it when an index was added
//   2. offset paging across that change repeats and skips rows, and a unique tie-breaker fixes it
//   3. a cursor that remembers only the sort column skips rows (or loops), and (column, id) fixes it
//
//   node --disable-warning=ExperimentalWarning ties-demo.js

const { DatabaseSync } = require("node:sqlite");
const { createDatabase } = require("./db");
const { cursorPage } = require("./pagination");

function smallTable() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE p (id INTEGER PRIMARY KEY, score INTEGER)");
  const insert = db.prepare("INSERT INTO p (score) VALUES (?)");
  for (let i = 1; i <= 12; i++) insert.run(i % 3); // scores 1, 2, 0, 1, 2, 0 ...
  return db;
}
const list = (db, orderBy, limit = 12, offset = 0) =>
  db.prepare(`SELECT id FROM p ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(limit, offset).map((r) => r.id);

console.log("== 1. the same query, before and after CREATE INDEX p_score ON p(score)  (12 rows, score = id % 3)");
for (const orderBy of ["score DESC", "score DESC, id DESC"]) {
  const db = smallTable();
  const before = list(db, orderBy);
  db.exec("CREATE INDEX p_score ON p (score)");
  const after = list(db, orderBy);
  console.log(`   ORDER BY ${orderBy.padEnd(19)} before: ${before.join(",").padEnd(35)} after: ${after.join(",").padEnd(35)} same: ${before.join() === after.join()}`);
}

console.log("\n== 2. paging 5 at a time, while the plan changes (an index is added) between page 1 and page 2");
for (const orderBy of ["score DESC", "score DESC, id DESC"]) {
  const db = smallTable();
  const page1 = list(db, orderBy, 5, 0);
  db.exec("CREATE INDEX p_score ON p (score)");
  const page2 = list(db, orderBy, 5, 5);
  const topTenNow = list(db, orderBy, 10, 0); // the first 10 rows, in the order the database uses NOW
  const seen = [...page1, ...page2];
  const twice = [...new Set(seen.filter((id, i) => seen.indexOf(id) !== i))];
  const skipped = topTenNow.filter((id) => !seen.includes(id));
  console.log(`   ORDER BY ${orderBy.padEnd(19)} page 1: ${page1.join(",")}   page 2: ${page2.join(",")}   shown twice: ${twice.join(",") || "none"}   skipped: ${skipped.join(",") || "none"}`);
}

console.log("\n== 3. walking 100,000 rows, 100 at a time, with different kinds of cursor");
const SIZE = 100;
const db = createDatabase();
const COLUMNS = "id, title, author, score, created_at";

// A cursor that remembers only the sort column: "everything with created_at < the last one I saw".
function walkNaive() {
  const seen = [];
  let last = null;
  for (;;) {
    const rows =
      last === null
        ? db.prepare(`SELECT ${COLUMNS} FROM posts ORDER BY created_at DESC, id DESC LIMIT ?`).all(SIZE)
        : db.prepare(`SELECT ${COLUMNS} FROM posts WHERE created_at < ? ORDER BY created_at DESC, id DESC LIMIT ?`).all(last, SIZE);
    if (!rows.length) return seen;
    seen.push(...rows.map((r) => r.id));
    last = rows.at(-1).created_at;
  }
}
const naive = walkNaive();
const naiveUnique = new Set(naive).size;
console.log(`   cursor = last created_at only, "<"   : received ${naive.length}, unique ${naiveUnique}, rows NEVER returned: ${100_000 - naiveUnique}`);

const proper = [];
for (let cursor = null, done = false; !done; ) {
  const r = cursorPage(db, { cursor, limit: SIZE });
  proper.push(...r.data.map((x) => x.id));
  cursor = r.nextCursor;
  done = !r.meta.hasNext;
}
console.log(`   cursor = (created_at, id), "<"        : received ${proper.length}, unique ${new Set(proper).size}, rows never returned: ${100_000 - new Set(proper).size}`);

// The other "fix" people reach for: <= instead of <. Sort by score, where about 1,000 rows share each value.
console.log("\n   the '<=' version, sorting by score (about 1,000 rows share each score), first four pages:");
let last = null;
for (let page = 1; page <= 4; page++) {
  const rows =
    last === null
      ? db.prepare(`SELECT ${COLUMNS} FROM posts ORDER BY score DESC, id DESC LIMIT ?`).all(SIZE)
      : db.prepare(`SELECT ${COLUMNS} FROM posts WHERE score <= ? ORDER BY score DESC, id DESC LIMIT ?`).all(last, SIZE);
  console.log(`     page ${page}: first id ${rows[0].id}, last id ${rows.at(-1).id}, last score ${rows.at(-1).score}`);
  last = rows.at(-1).score;
}
console.log("   the same 100 rows come back every time: a client that follows this cursor never reaches the end.");

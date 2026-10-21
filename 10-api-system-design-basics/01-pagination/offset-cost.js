// offset-cost.js
// Why deep pages get slow with OFFSET, and why they do not with a cursor.
// OFFSET N does not jump to row N. The database walks past N rows and throws
// them away. A cursor condition (WHERE (created_at, id) < (?, ?)) jumps straight
// to the right place in the index.
//
// For each position, the SAME 100 rows are fetched both ways (and checked to be identical).
//
//   node --disable-warning=ExperimentalWarning offset-cost.js

const { createDatabase } = require("./db");
const { median } = require("./timing");

const db = createDatabase();
const SIZE = 100;
const COLUMNS = "id, title, author, score, created_at";

const byOffset = db.prepare(`SELECT ${COLUMNS} FROM posts ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`);
const byCursor = db.prepare(`SELECT ${COLUMNS} FROM posts WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT ?`);

console.log("== 1. milliseconds to fetch 100 rows starting at position N (median of 15 runs)");
console.log("position (offset)    OFFSET      cursor      OFFSET / cursor");
for (const offset of [0, 1_000, 10_000, 50_000, 99_900]) {
  // The cursor for "the 100 rows after position `offset`" is the row just before them.
  const before = offset === 0 ? null : db.prepare(`SELECT created_at, id FROM posts ORDER BY created_at DESC, id DESC LIMIT 1 OFFSET ?`).get(offset - 1);
  const viaOffset = () => byOffset.all(SIZE, offset);
  const viaCursor = before
    ? () => byCursor.all(before.created_at, before.id, SIZE)
    : () => db.prepare(`SELECT ${COLUMNS} FROM posts ORDER BY created_at DESC, id DESC LIMIT ?`).all(SIZE);

  const same = JSON.stringify(viaOffset()) === JSON.stringify(viaCursor());
  const a = median(viaOffset);
  const b = median(viaCursor);
  console.log(
    `${String(offset).padStart(17)}    ${a.toFixed(3).padStart(8)}    ${b.toFixed(3).padStart(8)}    ${(a / b).toFixed(0).padStart(6)}x   same rows: ${same}`
  );
}

console.log("\n== 2. what the database says it does (EXPLAIN QUERY PLAN)");
const plan = (sql, ...params) => db.prepare("EXPLAIN QUERY PLAN " + sql).all(...params).map((r) => r.detail);
console.log("   OFFSET :", plan(`SELECT ${COLUMNS} FROM posts ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, SIZE, 50_000));
console.log("   cursor :", plan(`SELECT ${COLUMNS} FROM posts WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT ?`, 1_700_010_000, 50_000, SIZE));
console.log("   Both use the same index. The difference is where the scan STARTS: OFFSET scans from the top and");
console.log("   discards N rows, the cursor starts at the boundary (created_at<?).");

console.log("\n== 3. the same query with NO index to sort by (a full sort every time)");
const bare = createDatabase({ indexes: false });
const bareOffset = bare.prepare(`SELECT ${COLUMNS} FROM posts ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`);
console.log("   plan:", bare.prepare(`EXPLAIN QUERY PLAN SELECT ${COLUMNS} FROM posts ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`).all(SIZE, 0).map((r) => r.detail));
console.log(`   OFFSET 0     : ${median(() => bareOffset.all(SIZE, 0), 7).toFixed(3)} ms`);
console.log(`   OFFSET 99900 : ${median(() => bareOffset.all(SIZE, 99_900), 7).toFixed(3)} ms`);

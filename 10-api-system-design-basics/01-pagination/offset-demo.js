// offset-demo.js
// Offset (page-number) pagination: what the query is, what comes back, and what
// the edges look like (the last page, a page past the end, an uneven last page),
// and why the sort column has to come from an allowlist (ORDER BY cannot be a bound parameter).
//
//   node --disable-warning=ExperimentalWarning offset-demo.js

const { createDatabase } = require("./db");
const { offsetPage } = require("./pagination");
const { median } = require("./timing");

const db = createDatabase();
const ids = (result) => result.data.map((r) => r.id).join(", ");

const one = (sql) => db.prepare(sql).get();
console.log("== 0. the data");
console.log(`   rows: ${one("SELECT COUNT(*) AS n FROM posts").n}`);
console.log(`   distinct created_at values: ${one("SELECT COUNT(DISTINCT created_at) AS n FROM posts").n}   (so many posts share a second)`);
console.log(`   most posts sharing one created_at: ${one("SELECT MAX(c) AS n FROM (SELECT COUNT(*) AS c FROM posts GROUP BY created_at)").n}`);
console.log(`   distinct score values: ${one("SELECT COUNT(DISTINCT score) AS n FROM posts").n}   (about 1,000 posts per score)\n`);

console.log("== 1. the query behind 'page 3, 5 per page':");
console.log("   SELECT ... FROM posts ORDER BY created_at DESC, id DESC LIMIT 5 OFFSET 10   (offset = (page - 1) * pageSize)\n");

console.log("== 2. the first pages, 5 per page (newest first)");
for (const page of [1, 2, 3]) {
  const r = offsetPage(db, { page, pageSize: 5 });
  console.log(`   page ${page}: ids ${ids(r)}`);
}
console.log("   meta:", JSON.stringify(offsetPage(db, { page: 3, pageSize: 5 }).meta));

console.log("\n== 3. the edges (100,000 rows)");
for (const [page, pageSize] of [[5000, 20], [5001, 20], [3333, 30], [3334, 30], [3335, 30]]) {
  const r = offsetPage(db, { page, pageSize });
  console.log(`   page ${String(page).padStart(4)} of size ${pageSize}: ${String(r.data.length).padStart(2)} rows, totalPages ${r.meta.totalPages}`);
}

console.log("\n== 4. the cost of the total count that page-number UIs need");
const countAll = median(() => db.prepare("SELECT COUNT(*) AS n FROM posts").get());
const countOne = median(() => db.prepare("SELECT COUNT(*) AS n FROM posts WHERE author = ?").get("nadia"));
const page1 = median(() => db.prepare("SELECT id, title, author, score, created_at FROM posts ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 0").all());
console.log(`   SELECT COUNT(*) FROM posts                    : ${countAll.toFixed(3)} ms   (median of 15)`);
console.log(`   SELECT COUNT(*) ... WHERE author = 'nadia'    : ${countOne.toFixed(3)} ms   (12,500 matching rows, no index on author)`);
console.log(`   the page itself, LIMIT 20 OFFSET 0            : ${page1.toFixed(3)} ms`);

console.log("\n== 5. ORDER BY cannot be a bound parameter (20 rows, no index, so nothing else decides the order)");
const small = createDatabase({ rows: 20, indexes: false });
const show = (label, rows) => console.log(`   ${label.padEnd(40)} ${rows.map((r) => `${r.id}:${r.score}`).join(" ")}`);
show("ORDER BY score DESC (in the SQL text)", small.prepare("SELECT id, score FROM posts ORDER BY score DESC LIMIT 5").all());
show("ORDER BY ? DESC, bound to 'score'", small.prepare("SELECT id, score FROM posts ORDER BY ? DESC LIMIT 5").all("score"));
show("ORDER BY ? DESC, bound to 'nonsense'", small.prepare("SELECT id, score FROM posts ORDER BY ? DESC LIMIT 5").all("nonsense"));
console.log("   (id:score pairs. A bound value is data, so it is a constant: no sorting, and no error for a column that does not exist.)");

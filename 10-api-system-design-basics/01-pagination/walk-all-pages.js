// walk-all-pages.js
// A client that downloads EVERYTHING, page by page (an export, a sync job, an
// infinite scroll that someone leaves running), against 100,000 rows, 100 per page.
// For each run it counts what it received, so completeness is measured, not assumed.
//
//   1. nothing changes while it runs
//   2. a new post is published after every page
//   3. the client's user deletes the first post of every page they just received
//
//   node --disable-warning=ExperimentalWarning walk-all-pages.js

const { createDatabase, addPost } = require("./db");
const { offsetPage, cursorPage } = require("./pagination");
const { time } = require("./timing");

const SIZE = 100;
const ORIGINAL = 100_000;

function walkOffset(db, afterPage) {
  const seen = [];
  let pages = 0;
  for (let page = 1; ; page++) {
    const r = offsetPage(db, { page, pageSize: SIZE });
    if (!r.data.length) break; // an empty page means "past the end"
    pages++;
    seen.push(...r.data.map((x) => x.id));
    afterPage(db, r.data);
  }
  return { seen, pages };
}

function walkCursor(db, afterPage) {
  const seen = [];
  let pages = 0;
  for (let cursor = null; ; ) {
    const r = cursorPage(db, { cursor, limit: SIZE });
    pages++;
    seen.push(...r.data.map((x) => x.id));
    afterPage(db, r.data);
    if (!r.meta.hasNext) break;
    cursor = r.nextCursor;
  }
  return { seen, pages };
}

const scenarios = [
  ["1. data does not change", () => {}],
  ["2. a post is published after every page", (db) => addPost(db)],
  ["3. the first post of every page is deleted", (db, rows) => db.prepare("DELETE FROM posts WHERE id = ?").run(rows[0].id)],
];

console.log(`scenario                                   method   pages  received  unique  shown twice  original rows missed  time`);
for (const [name, afterPage] of scenarios) {
  for (const [method, walk] of [["offset", walkOffset], ["cursor", walkCursor]]) {
    const db = createDatabase();
    const { ms, value } = time(() => walk(db, afterPage));
    const unique = new Set(value.seen);
    let missed = 0;
    for (let id = 1; id <= ORIGINAL; id++) if (!unique.has(id)) missed++;
    console.log(
      `${name.padEnd(42)} ${method}   ${String(value.pages).padStart(5)}  ${String(value.seen.length).padStart(8)}  ${String(unique.size).padStart(6)}  ${String(value.seen.length - unique.size).padStart(11)}  ${String(missed).padStart(20)}  ${ms.toFixed(0).padStart(5)} ms`
    );
  }
}
console.log("\n'original rows missed' counts only the 100,000 rows that existed when the walk started.");
console.log("In scenario 2 the cursor walk never sees the new posts: they are newer than the position it started from.");

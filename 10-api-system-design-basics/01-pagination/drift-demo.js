// drift-demo.js
// The other problem with OFFSET: the data moves while the client is paging.
// Offset says "skip the first N rows". If a row is added or removed above the
// client's position between two requests, "the first N rows" is a different set,
// and the next page repeats a row or silently skips one. A cursor says "after
// THIS row", which does not care what changed above it.
//
//   node --disable-warning=ExperimentalWarning drift-demo.js

const { createDatabase, addPost } = require("./db");
const { offsetPage, cursorPage } = require("./pagination");

const SIZE = 5;
const ids = (r) => r.data.map((x) => x.id);
const show = (list) => (list.length ? list.join(", ") : "none");

// The first 20 rows in their ORIGINAL order, before anything changes. Here ids and
// created_at grow together, so "newest first" is also "highest id first".
const original = ids(offsetPage(createDatabase(), { page: 1, pageSize: 20 }));
const expected = original.slice(0, 2 * SIZE);

function report(label, page1, page2) {
  const seen = [...page1, ...page2];
  const duplicated = [...new Set(seen.filter((id, i) => seen.indexOf(id) !== i))];
  // "Skipped" = an original row that sits above the last row the client reached, but was never delivered.
  // (A row merely pushed down to page 3 is not skipped: the client will still get it.)
  const lowest = Math.min(...seen);
  const skipped = original.filter((id) => id > lowest && !seen.includes(id));
  console.log(`   ${label}`);
  console.log(`     page 1: ${show(page1)}`);
  return { duplicated, skipped };
}

function scenario(title, change) {
  console.log(`\n${title}`);
  for (const method of ["offset", "cursor"]) {
    const db = createDatabase();
    let page1;
    let cursor;
    if (method === "offset") page1 = ids(offsetPage(db, { page: 1, pageSize: SIZE }));
    else {
      const r = cursorPage(db, { limit: SIZE });
      page1 = ids(r);
      cursor = r.nextCursor;
    }

    const note = change(db, page1);
    const page2 = method === "offset" ? ids(offsetPage(db, { page: 2, pageSize: SIZE })) : ids(cursorPage(db, { limit: SIZE, cursor }));

    const r = report(method === "offset" ? "OFFSET  (page=1, then page=2)" : "CURSOR  (first page, then nextCursor)", page1, page2);
    console.log(`     ${note}`);
    console.log(`     page 2: ${show(page2)}`);
    console.log(`     shown twice: ${show(r.duplicated)}     skipped (above the client's position, never delivered): ${show(r.skipped)}`);
  }
}

console.log(`Without any change, two pages of ${SIZE} are exactly the first ${expected.length} rows: ${expected.join(", ")}`);

scenario("== A. a new post is published between page 1 and page 2", (db) => {
  const id = addPost(db);
  return `(post ${id} was just published, so it is now the newest)`;
});

scenario("== B. the user deletes the first post they just saw, between page 1 and page 2", (db, page1) => {
  db.prepare("DELETE FROM posts WHERE id = ?").run(page1[0]);
  return `(post ${page1[0]} was deleted)`;
});

// The cursor stores a position (the sort value and the id), not a reference to the row,
// so deleting the very row it points at does not break it.
scenario("== C. the last post on page 1 (the one the cursor points at) is deleted before page 2", (db, page1) => {
  const last = page1.at(-1);
  db.prepare("DELETE FROM posts WHERE id = ?").run(last);
  return `(post ${last} was deleted)`;
});

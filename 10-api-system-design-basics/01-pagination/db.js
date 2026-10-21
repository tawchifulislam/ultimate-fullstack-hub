// db.js
// A real database to paginate: an in-memory SQLite database (Node's built-in
// node:sqlite, the same one Topic 83 used) with 100,000 posts.
//
// The data is shaped on purpose, because pagination bugs live in the ties:
//   created_at  about 5 posts share each second, in bursts (so "sort by time" has many ties)
//   score       a random whole number from 0 to 100    (so "sort by score" has ~1,000 posts per value)
// Both sort columns are NOT unique. The primary key id is the only unique column.
//
// Run scripts that use it with:  node --disable-warning=ExperimentalWarning <script>

const { DatabaseSync } = require("node:sqlite");

const BASE_TIME = 1_700_000_000; // an arbitrary start, in unix seconds
const AUTHORS = ["nadia", "omar", "lina", "karim", "sara", "ravi", "mei", "tariq"];

function createDatabase({ rows = 100_000, perSecond = 5, indexes = true } = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE posts (
    id         INTEGER PRIMARY KEY,
    title      TEXT    NOT NULL,
    author     TEXT    NOT NULL,
    score      INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`);

  // A tiny deterministic random generator, so every run builds the same data.
  let seed = 12345;
  const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

  const insert = db.prepare("INSERT INTO posts (title, author, score, created_at) VALUES (?, ?, ?, ?)");
  db.exec("BEGIN");
  let time = BASE_TIME;
  for (let i = 0; i < rows; i++) {
    // Posts arrive in bursts: the clock moves on after a post with probability 1/perSecond,
    // so the number of posts sharing a second varies (about perSecond on average), as it does in real data.
    if (i > 0 && random() < 1 / perSecond) time++;
    insert.run(`Post number ${i + 1}`, AUTHORS[i % AUTHORS.length], Math.floor(random() * 101), time);
  }
  db.exec("COMMIT");

  if (indexes) {
    // One index per sort order. Each ends in id, the tie-breaker (see pagination.js).
    db.exec("CREATE INDEX idx_posts_created ON posts (created_at DESC, id DESC)");
    db.exec("CREATE INDEX idx_posts_score ON posts (score DESC, id DESC)");
  }
  return db;
}

// A new post appears at the top of "newest first": its created_at is later than every other.
function addPost(db, { title = "A brand new post", author = "nadia", score = 50 } = {}) {
  const latest = db.prepare("SELECT MAX(created_at) AS t FROM posts").get().t;
  const result = db.prepare("INSERT INTO posts (title, author, score, created_at) VALUES (?, ?, ?, ?)").run(title, author, score, latest + 1);
  return Number(result.lastInsertRowid);
}

module.exports = { createDatabase, addPost, BASE_TIME };

// origin.js
// The "slow thing" that a cache sits in front of. Two kinds of slowness, both labeled honestly:
//
//   getProduct(id)    SIMULATED: a fixed delay (default 100 ms) that stands in for a database
//                     on another machine. The data is a plain Map. Nothing is really slow.
//   topCustomers()    REAL: a GROUP BY over 200,000 rows in an in-memory SQLite table
//                     (Node's built-in node:sqlite). The time it takes is real CPU work.
//
// Both count how often they were called, because "how many times did the origin run?" is the
// number every caching demo in this topic is really about.
//
// Run scripts that use it with:  node --disable-warning=ExperimentalWarning <script>

const { DatabaseSync } = require("node:sqlite");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createOrigin({ latencyMs = 100, orderRows = 0 } = {}) {
  const products = new Map();
  for (let id = 1; id <= 1000; id++) {
    products.set(id, { id, name: `Product ${id}`, price: 10 + (id % 50), updatedAt: 0 });
  }
  const calls = { getProduct: 0, updateProduct: 0, topCustomers: 0 };

  let db = null;
  if (orderRows > 0) {
    db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE orders (id INTEGER PRIMARY KEY, customer INTEGER NOT NULL, amount INTEGER NOT NULL)");
    const insert = db.prepare("INSERT INTO orders (customer, amount) VALUES (?, ?)");
    let seed = 777;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    db.exec("BEGIN");
    for (let i = 0; i < orderRows; i++) insert.run(Math.floor(random() * 5000), Math.floor(random() * 500));
    db.exec("COMMIT");
  }

  return {
    calls,
    latencyMs,
    async getProduct(id) {
      calls.getProduct++;
      await sleep(latencyMs);
      const product = products.get(id);
      return product ? { ...product } : null; // a copy, like a row coming back from a database
    },
    async updateProduct(id, patch) {
      calls.updateProduct++;
      const product = products.get(id);
      if (!product) return null;
      Object.assign(product, patch, { updatedAt: product.updatedAt + 1 });
      return { ...product };
    },
    // REAL work. Synchronous on purpose: it blocks the event loop for as long as it runs.
    topCustomers() {
      calls.topCustomers++;
      return db
        .prepare("SELECT customer, COUNT(*) AS orders, SUM(amount) AS total FROM orders GROUP BY customer ORDER BY total DESC, customer LIMIT 5")
        .all();
    },
    sleep,
  };
}

module.exports = { createOrigin, sleep };

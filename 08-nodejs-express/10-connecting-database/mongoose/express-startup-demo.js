// express-startup-demo.js
// Startup order matters when an Express app depends on a database.
//
//   node express-startup-demo.js connect-first   (default)
//   node express-startup-demo.js listen-first
//
// Run both against a machine with NO MongoDB, as the build environment was,
// to see what each order does when the database is down.

const express = require("express");
const mongoose = require("mongoose");

const mode = process.argv[2] || "connect-first";
const port = process.argv[3] || 4500;
const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/topic80demo";

// Shorten both waits so the demo finishes quickly. The defaults are
// 30000ms for server selection and 10000ms for buffering.
mongoose.set("bufferTimeoutMS", 1000);

const User = mongoose.model("User", new mongoose.Schema({ name: String }));

const app = express();

app.get("/users", async (req, res) => {
  const users = await User.find({}); // a rejected promise reaches the error handler (Topic 78)
  res.json({ data: users });
});

app.use((err, req, res, next) => {
  console.log(`[error-handler] ${err.name}: ${err.message}`);
  res.status(503).json({ error: "database unavailable" });
});

async function connect() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });
  console.log("database connected");
}

if (mode === "connect-first") {
  // Do not accept traffic until the database is reachable.
  connect()
    .then(() => app.listen(port, () => console.log(`listening on ${port}`)))
    .catch((err) => {
      console.log(`startup failed, not listening: ${err.message}`);
      process.exit(1);
    });
} else {
  // Accept traffic immediately, connect in the background.
  app.listen(port, () => console.log(`listening on ${port} (database not confirmed yet)`));
  connect().catch((err) => console.log(`background connect failed: ${err.message}`));
}

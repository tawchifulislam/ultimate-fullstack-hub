// connection-pattern.js
// The standard way to connect Mongoose to MongoDB, with the failure path
// handled. This file is run against a server that is NOT there (nothing
// listens on port 27017 in the build environment), so what it verifies is
// real: how Mongoose behaves when the connection cannot be made. The
// success path and CRUD calls live in crud-pattern.js, which needs a
// running MongoDB (local mongod or an Atlas connection string).

const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/topic80demo";

// Connection lifecycle events, useful for logging in a real app.
mongoose.connection.on("connected", () => console.log("[event] connected"));
mongoose.connection.on("error", (err) => console.log("[event] error:", err.name));
mongoose.connection.on("disconnected", () => console.log("[event] disconnected"));

async function main() {
  console.log("readyState before connect:", mongoose.connection.readyState, "(0 = disconnected)");

  try {
    // serverSelectionTimeoutMS bounds how long Mongoose waits to find a
    // reachable server. The default is 30000ms; a short value makes a
    // misconfigured URI fail fast instead of hanging for half a minute.
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log("connected, readyState:", mongoose.connection.readyState, "(1 = connected)");
    await mongoose.disconnect();
  } catch (err) {
    console.log("\nconnect() rejected:");
    console.log("  err.name:", err.name);
    console.log("  err.message:", err.message);
    console.log("readyState after failure:", mongoose.connection.readyState);
    process.exitCode = 1; // a real app would stop starting up here
  }
}

main();

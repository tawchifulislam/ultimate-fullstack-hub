// buffering-demo.js
// Mongoose does not fail instantly when you run a query before the
// connection is ready. It buffers the operation and waits, so forgetting
// to await mongoose.connect() shows up as a slow timeout error, not an
// immediate "not connected" one. bufferTimeoutMS is shortened to 1000 here
// so the demo finishes quickly (the default is 10000).

const mongoose = require("mongoose");

mongoose.set("bufferTimeoutMS", 1000);

const Note = mongoose.model("Note", new mongoose.Schema({ text: String }));

async function main() {
  console.log("readyState:", mongoose.connection.readyState, "(0 = never connected)");

  const startedAt = Date.now();
  try {
    await Note.find({}); // no connect() was ever called
  } catch (err) {
    console.log("find() rejected after", Date.now() - startedAt, "ms");
    console.log("  err.name:", err.name);
    console.log("  err.message:", err.message);
  }
}

main();

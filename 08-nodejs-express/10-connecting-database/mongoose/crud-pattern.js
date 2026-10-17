// crud-pattern.js
//
// NOT EXECUTED IN THE BUILD ENVIRONMENT. This file needs a running MongoDB
// (a local mongod, or a MongoDB Atlas connection string in MONGODB_URI).
// The build sandbox had no MongoDB server and could not download one, so
// the calls below were only syntax-checked (node --check), not run. The
// pieces that do not need a server (schemas, validation, casting, query
// construction, connection failure handling) are verified separately in
// the other files in this folder.
//
// Run it yourself with:
//   MONGODB_URI="mongodb://127.0.0.1:27017/topic80demo" node crud-pattern.js

const mongoose = require("mongoose");

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    age: Number,
  })
);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/topic80demo", {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await User.deleteMany({}); // start from an empty collection for the demo

    // CREATE
    const created = await User.create({ name: "Nadia", email: "nadia@example.com", age: 30 });
    console.log("created:", created.toObject());

    // READ: many, and one by id
    const adults = await User.find({ age: { $gte: 18 } }).sort({ name: 1 });
    console.log("find count:", adults.length);
    const found = await User.findById(created._id);
    console.log("findById name:", found.name);

    // UPDATE: returnDocument: "after" returns the updated document.
    // The default is "before", the document as it was prior to the update.
    const updated = await User.findByIdAndUpdate(created._id, { age: 31 }, { returnDocument: "after" });
    console.log("updated age:", updated.age);

    // DELETE
    const result = await User.deleteOne({ _id: created._id });
    console.log("deletedCount:", result.deletedCount);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("crud-pattern failed:", err.message);
  process.exitCode = 1;
});

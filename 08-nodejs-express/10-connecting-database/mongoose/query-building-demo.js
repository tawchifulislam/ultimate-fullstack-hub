// query-building-demo.js
// Everything here runs with NO MongoDB server. It shows that a Mongoose
// document gets its _id the moment it is constructed (not when it is
// saved), and that a query is just an object describing a request: it only
// goes to the database when it is awaited or .exec() is called.

const mongoose = require("mongoose");

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    age: Number,
    role: { type: String, default: "reader" },
  })
);

// --- A new document already has an _id, before any database is involved ---
const doc = new User({ name: "Nadia", email: "nadia@example.com", age: 30 });
console.log("_id is an ObjectId:", doc._id instanceof mongoose.Types.ObjectId);
console.log("_id length (hex chars):", String(doc._id).length);
console.log("isNew (not yet saved):", doc.isNew);
console.log("toObject():", doc.toObject());

// --- Building a query does not run it ---
const query = User.find({ role: "author" })
  .where("age")
  .gte(18)
  .sort({ name: 1 })
  .limit(5)
  .select("name email");

console.log("\nquery filter :", JSON.stringify(query.getFilter()));
console.log("query options:", JSON.stringify(query.getOptions()));
console.log("query fields :", JSON.stringify(query.projection()));
console.log("query is a thenable (awaiting it runs it):", typeof query.then === "function");

// --- ObjectId validity check, a cheap guard before findById() ---
console.log("\nisValidObjectId('abc'):", mongoose.isValidObjectId("abc"));
console.log("isValidObjectId(doc._id):", mongoose.isValidObjectId(String(doc._id)));

// --- Update-and-return options: how the 'return the new document' option shows up ---
const withNew = User.findByIdAndUpdate(doc._id, { age: 31 }, { new: true });
const withReturnDocument = User.findByIdAndUpdate(doc._id, { age: 31 }, { returnDocument: "after" });
console.log("\n{ new: true } options          :", JSON.stringify(withNew.getOptions()));
console.log("{ returnDocument:'after' } opts:", JSON.stringify(withReturnDocument.getOptions()));

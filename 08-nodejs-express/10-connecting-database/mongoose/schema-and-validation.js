// schema-and-validation.js
// Mongoose is an ODM (Object-Document Mapper) for MongoDB: it lets you
// define a schema in JavaScript even though MongoDB itself is schemaless,
// and enforces that shape before anything ever reaches the database.
//
// Validation happens entirely inside Mongoose, in JavaScript. It needs NO
// database connection at all, which is what document.validate() proves
// below: every result here comes from pure in-memory checking, resolved
// or rejected without ever touching a network socket.

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 2 },
  email: {
    type: String,
    required: true,
    validate: {
      validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: (props) => `${props.value} is not a valid email address`,
    },
  },
  age: { type: Number, min: 0, max: 130 },
  role: { type: String, enum: ["reader", "author", "admin"], default: "reader" },
});

const User = mongoose.model("User", userSchema);

async function main() {
  // --- A fully valid document ---
  const validUser = new User({ name: "Nadia", email: "nadia@example.com", age: 30 });
  await validUser.validate(); // resolves with no value when everything passes
  console.log("valid user -> validate() resolved with no errors");
  console.log("valid user -> role defaulted to:", validUser.role);

  // --- An invalid document: missing name, bad email, age out of range ---
  const invalidUser = new User({ email: "not-an-email", age: 200 });
  try {
    await invalidUser.validate();
  } catch (err) {
    console.log("\ninvalid user -> validate() rejected with:");
    for (const field of Object.keys(err.errors)) {
      console.log(`  ${field}: ${err.errors[field].message}`);
    }
  }

  // --- An enum violation ---
  const badRoleUser = new User({ name: "Tomas", email: "tomas@example.com", role: "superadmin" });
  try {
    await badRoleUser.validate();
  } catch (err) {
    console.log("\nbad role -> validate() rejected with:");
    console.log(`  role: ${err.errors.role.message}`);
  }
}

main();

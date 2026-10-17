// casting-demo.js
// Mongoose casts incoming values to the type a schema declares, the
// moment a document is constructed. This also needs no database
// connection, casting is pure JavaScript.

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  inStock: Boolean,
  releaseDate: Date,
});

const Product = mongoose.model("Product", productSchema);

async function main() {
  // Values arriving as strings (exactly what you'd get from a web form or
  // a query string) get cast to the schema's real types automatically.
  const product = new Product({
    name: "Desk Lamp",
    price: "29.99", // string in, becomes a real number
    inStock: "true", // string in, becomes a real boolean
    releaseDate: "2026-01-15", // string in, becomes a real Date
  });

  console.log("price:", product.price, `(${typeof product.price})`);
  console.log("inStock:", product.inStock, `(${typeof product.inStock})`);
  console.log("releaseDate:", product.releaseDate, `(instanceof Date: ${product.releaseDate instanceof Date})`);

  // A value that genuinely cannot be cast does NOT throw at construction.
  // Mongoose leaves the field undefined and remembers the failure; the
  // CastError only surfaces when validate() (or save()) runs.
  const broken = new Product({ name: "Broken", price: "not-a-number-at-all" });
  console.log("\nbroken product constructed without throwing, price =", broken.price);

  try {
    await broken.validate();
  } catch (err) {
    console.log("validate() rejected with:", err.name);
    console.log("  inner error type:", err.errors.price.name);
    console.log("  message:", err.errors.price.message);
  }
}

main();

// jwt-anatomy.js
// A JWT is three base64url-encoded pieces joined by dots:
//   header.payload.signature
// This file signs one with the jsonwebtoken library, then takes it apart
// using only Node's Buffer, to show what is (and is not) protected.

const jwt = require("jsonwebtoken");

const DEMO_SECRET = "demo-only-secret-do-not-use-in-real-code";

const token = jwt.sign({ role: "author" }, DEMO_SECRET, {
  subject: "user-42",
  expiresIn: "15m",
});

console.log("token:", token);

const [headerB64, payloadB64, signatureB64] = token.split(".");
console.log("\nnumber of dot-separated parts:", token.split(".").length);

// Decoding needs NO secret. Base64url is an encoding, not encryption.
const decode = (part) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
console.log("\nheader   (decoded with no secret):", decode(headerB64));
console.log("payload  (decoded with no secret):", decode(payloadB64));
console.log("signature (raw bytes, not JSON)  :", Buffer.from(signatureB64, "base64url").length, "bytes");

// The expiry claim is a plain number of seconds since 1970.
const payload = decode(payloadB64);
console.log("\nexp - iat =", payload.exp - payload.iat, "seconds (15m = 900)");

// verify() checks the signature AND the expiry, and returns the payload.
console.log("\nverify() with the right secret:", jwt.verify(token, DEMO_SECRET));

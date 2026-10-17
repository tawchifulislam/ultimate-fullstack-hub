// jwt-failures.js
// What jwt.verify() rejects, and the difference between jwt.decode() (reads
// the payload, checks nothing) and jwt.verify() (checks the signature).

const jwt = require("jsonwebtoken");

const SECRET = "demo-only-secret-do-not-use-in-real-code";
const b64urlJson = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const decodePart = (part) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

function attempt(label, fn) {
  try {
    const result = fn();
    console.log(`${label}\n  -> ACCEPTED:`, result);
  } catch (err) {
    console.log(`${label}\n  -> REJECTED: ${err.name}: ${err.message}`);
  }
}

async function main() {
  const good = jwt.sign({ role: "reader" }, SECRET, { subject: "user-7", expiresIn: "15m" });

  attempt("1. untouched token, right secret", () => jwt.verify(good, SECRET).role);

  // 2. Someone edits the payload to grant themselves admin, keeping the
  //    original header and signature.
  const [h, p, s] = good.split(".");
  const forgedPayload = { ...decodePart(p), role: "admin" };
  const tampered = `${h}.${b64urlJson(forgedPayload)}.${s}`;

  attempt("2a. jwt.decode() on the tampered token (checks nothing)", () => jwt.decode(tampered).role);
  attempt("2b. jwt.verify() on the same tampered token", () => jwt.verify(tampered, SECRET).role);

  // 3. Right token, wrong secret.
  attempt("3. right token, wrong secret", () => jwt.verify(good, "some-other-secret"));

  // 4. A token that really expires: lifetime of 1 second, then wait.
  const shortLived = jwt.sign({ role: "reader" }, SECRET, { expiresIn: "1s" });
  attempt("4a. short-lived token, checked immediately", () => jwt.verify(shortLived, SECRET).role);
  await new Promise((resolve) => setTimeout(resolve, 1600));
  attempt("4b. the same token after 1.6 seconds", () => jwt.verify(shortLived, SECRET));

  // 5. An unsigned token: header says alg "none", signature part is empty.
  const unsigned = `${b64urlJson({ alg: "none", typ: "JWT" })}.${b64urlJson({ role: "admin" })}.`;
  attempt("5. unsigned token claiming alg 'none'", () => jwt.verify(unsigned, SECRET));

  // 6. Algorithm pinning. A token signed with HS512 and the same secret.
  const hs512 = jwt.sign({ role: "reader" }, SECRET, { algorithm: "HS512" });
  attempt("6a. HS512 token, verify() with default options", () => jwt.verify(hs512, SECRET).role);
  attempt("6b. HS512 token, verify() pinned to algorithms: ['HS256']", () =>
    jwt.verify(hs512, SECRET, { algorithms: ["HS256"] })
  );
}

main();

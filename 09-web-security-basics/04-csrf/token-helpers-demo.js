// token-helpers-demo.js
// What csrf-token.js does, with no browser and no server: tokens are random, the
// comparison never throws, and a double-submit token is only good for the session
// it was signed for.
//
//   node token-helpers-demo.js

const crypto = require("crypto");
const { newToken, safeEqual, makeDoubleSubmit, verifyDoubleSubmit } = require("./csrf-token");

console.log("1. tokens are random and long");
const a = newToken();
const b = newToken();
console.log(`   ${a}  (${a.length} characters)`);
console.log(`   ${b}`);
console.log(`   the two differ: ${a !== b}`);

console.log("\n2. crypto.timingSafeEqual throws when lengths differ; safeEqual does not");
try {
  crypto.timingSafeEqual(Buffer.from("short"), Buffer.from("a much longer value"));
} catch (err) {
  console.log(`   timingSafeEqual directly: ${err.code}`);
}
console.log(`   safeEqual("short", "a much longer value") -> ${safeEqual("short", "a much longer value")}`);
console.log(`   safeEqual(token, token)                   -> ${safeEqual(a, a)}`);
console.log(`   safeEqual(token, undefined)               -> ${safeEqual(a, undefined)}`);

console.log("\n3. signed double-submit: the token is bound to a session id");
const SECRET = "demo-only-secret";
const mine = makeDoubleSubmit(SECRET, "session-A");
console.log(`   issued for session-A: ${mine.slice(0, 30)}...`);
console.log(`   cookie and header match, session-A:                    ${verifyDoubleSubmit(SECRET, "session-A", mine, mine)}`);
console.log(`   same pair, but presented on session-B:                 ${verifyDoubleSubmit(SECRET, "session-B", mine, mine)}`);
console.log(`   header differs from the cookie:                        ${verifyDoubleSubmit(SECRET, "session-A", mine, makeDoubleSubmit(SECRET, "session-A"))}`);
const forged = `${newToken()}.${newToken()}`;
console.log(`   attacker invents a token and sets the same value twice: ${verifyDoubleSubmit(SECRET, "session-A", forged, forged)}`);
console.log(`   a token signed with a different secret:                ${verifyDoubleSubmit(SECRET, "session-A", makeDoubleSubmit("other", "session-A"), makeDoubleSubmit("other", "session-A"))}`);
console.log(`   missing header:                                        ${verifyDoubleSubmit(SECRET, "session-A", mine, undefined)}`);

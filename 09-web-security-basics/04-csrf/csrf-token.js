// csrf-token.js
// The small building blocks behind CSRF tokens. No framework needed.
//
//   newToken()                       an unguessable random token
//   safeEqual(a, b)                  constant-time comparison that never throws
//   makeDoubleSubmit(secret, sid)    "token.signature", the signature is bound to the session id
//   verifyDoubleSubmit(secret, sid, cookieValue, sentValue)
//
// A synchronizer token (stored on the server, in the session) uses newToken() and
// safeEqual(). The signed double-submit pattern keeps nothing on the server except
// the secret: the cookie and the request must carry the same value, and the value
// must have been signed for THIS session.

const crypto = require("crypto");

const newToken = () => crypto.randomBytes(32).toString("base64url");

// crypto.timingSafeEqual throws if the lengths differ, so compare lengths first.
function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const sign = (secret, sid, token) => crypto.createHmac("sha256", secret).update(`${sid}!${token}`).digest("base64url");

function makeDoubleSubmit(secret, sid) {
  const token = newToken();
  return `${token}.${sign(secret, sid, token)}`;
}

function verifyDoubleSubmit(secret, sid, cookieValue, sentValue) {
  if (!cookieValue || !sentValue) return false;
  if (!safeEqual(cookieValue, sentValue)) return false; // the two copies must match
  const [token, signature] = String(cookieValue).split(".");
  if (!token || !signature) return false;
  return safeEqual(signature, sign(secret, sid, token)); // and must be signed for this session
}

module.exports = { newToken, safeEqual, makeDoubleSubmit, verifyDoubleSubmit };

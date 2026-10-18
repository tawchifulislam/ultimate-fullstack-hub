// password-service.js
// The only file in the project that knows HOW passwords are hashed. The app
// calls hashPassword / verifyPassword / needsRehash and nothing else, so the
// algorithm or its settings can change in one place.
//
// Algorithm: argon2id, using OWASP's first listed minimum by default
// (19 MiB of memory, 2 passes, 1 lane).

const argon2 = require("argon2");

const OWASP_MINIMUM = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

function createPasswordService(params = OWASP_MINIMUM) {
  return {
    params,

    // Returns a self-describing string: algorithm, version, settings, salt and hash.
    hashPassword(password) {
      return argon2.hash(password, params);
    },

    // false for a wrong password AND for a stored value that is not a valid hash.
    // (argon2.verify throws on a malformed string; a login must not crash on that.)
    async verifyPassword(storedHash, password) {
      try {
        return await argon2.verify(storedHash, password);
      } catch {
        return false;
      }
    },

    // true when the stored hash was made with weaker settings than `params`.
    needsRehash(storedHash) {
      return argon2.needsRehash(storedHash, params);
    },
  };
}

module.exports = { createPasswordService, OWASP_MINIMUM };

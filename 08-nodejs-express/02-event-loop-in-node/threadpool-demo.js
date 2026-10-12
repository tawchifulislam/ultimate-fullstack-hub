// fs, crypto (pbkdf2, scrypt, randomBytes), dns.lookup, and zlib hand their
// actual work off to libuv's thread pool, a small set of real OS threads
// separate from the single JS thread, so they don't block anything else
// from running while the slow work happens. But the pool defaults to only
// 4 threads (UV_THREADPOOL_SIZE), so only 4 of these CPU-heavy calls can
// truly run in parallel; a 5th has to wait for one to free up.
const crypto = require("crypto");

const start = Date.now();
const ROUNDS = 300_000; // tuned so one pbkdf2 call takes a noticeable amount of time

function timedPbkdf2(label) {
  crypto.pbkdf2("password", "salt", ROUNDS, 64, "sha512", () => {
    console.log(`${label} finished at ${Date.now() - start}ms`);
  });
}

for (let i = 1; i <= 6; i++) {
  timedPbkdf2(`job ${i}`);
}

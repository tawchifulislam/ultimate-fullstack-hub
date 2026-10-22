// rate-limit-middleware.js
// Express middleware that turns any limiter (in-memory or Redis, sync or async) into a 429.
//
//   app.use(rateLimit({ limiter, key: (req) => req.ip }))
//
// On every response it sends X-RateLimit-Limit and X-RateLimit-Remaining (a widespread convention,
// not a standard). When it refuses a request it answers 429 Too Many Requests with a Retry-After
// header (seconds, rounded UP and never below 1) and a small JSON body.

function rateLimit({ limiter, key = (req) => req.ip }) {
  return async (req, res, next) => {
    try {
      const result = await limiter.check(key(req));
      res.set("X-RateLimit-Limit", String(result.limit));
      res.set("X-RateLimit-Remaining", String(result.remaining));
      if (result.allowed) return next();
      const retryAfter = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
      res.set("Retry-After", String(retryAfter));
      res.status(429).json({ error: "too_many_requests", retryAfterSeconds: retryAfter });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { rateLimit };

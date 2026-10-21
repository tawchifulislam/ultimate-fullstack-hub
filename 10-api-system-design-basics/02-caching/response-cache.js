// response-cache.js
// Express middleware that caches whole JSON responses in a TTLCache, so a repeated request is
// answered without running the route handler at all.
//
//   app.use(responseCache({ cache, key: (req) => ... }))
//
// It caches only GET requests that answered 200 with res.json(). The `key` function is the
// whole design: it decides which requests are treated as "the same request". Everything the
// response depends on (the URL, the query string, WHO is asking) has to be in the key, or has to
// be kept out of the cache.

function responseCache({ cache, key }) {
  return (req, res, next) => {
    if (req.method !== "GET") return next();
    const cacheKey = key(req);
    const hit = cache.get(cacheKey);
    if (hit !== undefined) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(hit);
    }
    const send = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) cache.set(cacheKey, body);
      res.set("X-Cache", "MISS");
      return send(body);
    };
    next();
  };
}

module.exports = { responseCache };

# Request/Response Cycle

**Topic 74 of 89** (Section: Node.js / Express, 4 of 12)

## Notes

### Project structure

```text
server-basics.js              -> http.createServer, manual routing, req.url parsing
post-body-demo.js              -> req as a readable stream, manual JSON body parsing
forget-end-demo.js             -> res.end() is mandatory, not optional
headers-after-write-error.js   -> ERR_HTTP_HEADERS_SENT
streaming-vs-buffering.js      -> piping a response vs collecting it first
timing-client.js               -> a small Node http client used to time streaming-vs-buffering.js
```

This topic is deliberately framework-free: everything here uses only Node's built-in `http` module, the layer Express (Topic 5 onward) is built on top of. Seeing what Express actually adds for you only makes sense once you've seen what's there without it.

### http.createServer: one callback, two streams, nothing else

```js
const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "GET" && parsed.pathname === "/") { ... }
  else if (...) { ... }
  else { res.writeHead(404); res.end("Not Found"); }
});
```

There is no router, no `req.params`, no `req.query`. `req.url` is only ever the raw path and query string (`/json?x=1&y=2`), never parsed into pieces for you, that's what `new URL(req.url, base)` is for. Routing is just `if`/`else` on `req.method` and the parsed pathname. Verified directly, four real requests against this exact server:

```text
GET /        -> 200, "Home page"
GET /about   -> 200, "About page"
GET /json?x=1&y=2 -> 200, {"hello":"world","query":{"x":"1","y":"2"}}
GET /nope    -> 404, "Not Found"
```

### req is a readable stream; there is no req.body

```js
const chunks = [];
req.on("data", (chunk) => chunks.push(chunk));
req.on("end", () => {
  const raw = Buffer.concat(chunks).toString("utf8");
  const parsed = JSON.parse(raw);
  ...
});
```

A POST body arrives as a stream of `Buffer` chunks over time, not as one ready-made object. `post-body-demo.js` reports exactly how many `data` events it saw. Verified directly:

```text
small body (29 bytes)   -> chunkCount: 1
larger body (500013 bytes) -> chunkCount: 11
```

The small body arrived in a single chunk; the 500KB one arrived in 11 separate pieces. Code that assumes a body always arrives whole in one `data` event works by accident on tiny test payloads and breaks on real ones, this is exactly the bug class `express.json()` (Topic 6) exists to handle correctly once and for all, instead of every handler re-implementing it.

### res.end() is not optional

```js
res.writeHead(200, { "Content-Type": "text/plain" });
res.write("partial content... but then nothing else happens.");
// no res.end() here
```

Node has no concept of "the handler function returned, so send what we have." A response stays open until `res.end()` is explicitly called, Node will wait forever. Verified directly, `forget-end-demo.js`'s own log shows the handler finished instantly either way:

```text
/correct: handler finished, res.end() was called
/forgot: handler finished, but res.end() was NEVER called
```

but the client's experience was completely different:

```text
/correct -> completed in 0.014s, full body received
/forgot  -> curl: (28) Operation timed out after 3002ms, only the first partial write (49 bytes) ever arrived
```

`/forgot`'s handler function returning is not the same event as the HTTP response completing, the two are only connected because `res.end()` is what actually closes out the response.

### Headers can only be sent once

```js
res.writeHead(200, { "Content-Type": "text/plain" });
res.write("first chunk of the body\n");
res.setHeader("X-Too-Late", "yep"); // throws: headers already went out
```

The status line and headers go out with the very first bytes of the body. Verified directly:

```text
HTTP/1.1 200 OK          <- the original 200 stuck; the later writeHead(201) never took effect
...
first chunk of the body
(server caught: ERR_HTTP_HEADERS_SENT)
final chunk of the body
```

```text
caught error: ERR_HTTP_HEADERS_SENT - Cannot set headers after they are sent to the client
```

In practice this almost always shows up as "I set the status code/header, but it didn't change", after already having written to the response somewhere earlier in the handler, often in an error-handling branch that runs after a success branch already started writing.

### Streaming a response changes when the client gets bytes, not just how fast

`streaming-vs-buffering.js` serves the same five chunks (200ms apart, simulating any slow source: a big file, a database cursor, a slow API) two ways: `/stream` pipes them straight through; `/buffer` collects all five first, then sends one combined response. `timing-client.js` timestamps every byte the client actually receives. Verified directly:

```text
GET /stream
  received "chunk-1 " at 224ms
  received "chunk-2 " at 424ms
  received "chunk-3 " at 625ms
  received "chunk-4 " at 826ms
  received "chunk-5 " at 1027ms
  response fully ended at 1028ms

GET /buffer
  received "chunk-1 chunk-2 chunk-3 chunk-4 chunk-5 " at 1018ms   <- nothing before this
  response fully ended at 1020ms
```

Both finish at essentially the same total time (~1020ms), but `/stream`'s client saw its first byte at 224ms, over 4x sooner, while `/buffer`'s client saw nothing at all until the entire response was ready. Piping (`source.pipe(res)`) is what gives you that earlier first byte; collecting everything into memory before calling `res.end()` throws that advantage away even when the total work is identical.

### Practical tips

- Always derive the path with `new URL(req.url, "http://" + req.headers.host)` (or `req.url.split("?")[0]` for a quick pathname-only check); never pattern-match on the raw `req.url` string directly, a query string will break a naive `===` comparison.
- Set every header and the status code before the first `res.write()`/`res.end()` call; decide the status code before you start writing body content, not partway through.
- Always pair a `data`/`end` listener on `req` with an `error` listener; a client that disconnects mid-upload fires `error`, not `end`, and an unhandled stream error can crash the process.
- Reach for `.pipe()` (or `for await (const chunk of stream)`) over "collect everything, then respond" whenever the source is inherently slow or large; the client starts getting useful bytes immediately instead of waiting for the whole thing.

## Resources

- Node.js Docs, HTTP: <https://nodejs.org/api/http.html>
- Node.js Docs, http.IncomingMessage (req): <https://nodejs.org/api/http.html#class-httpincomingmessage>
- Node.js Docs, http.ServerResponse (res): <https://nodejs.org/api/http.html#class-httpserverresponse>
- Node.js Docs, Stream.pipe(): <https://nodejs.org/api/stream.html#readablepipedestination-options>

## Practice

1. Add a `/stats` route to `server-basics.js` that returns `req.method`, every request header, and the parsed query string as JSON, using only what's already shown in this topic.
2. Modify `post-body-demo.js` to reject any body over a size limit (say 1KB) while it's still streaming in, by counting bytes inside the `data` handler and calling `req.destroy()` early, instead of waiting for `end` and checking afterward.
3. Change `forget-end-demo.js`'s `/forgot` route to call `res.end()` from inside a `setTimeout` 2 seconds later, and confirm the client now receives a (very slow) complete response instead of timing out.
4. Add a `try/catch` around the whole handler in `headers-after-write-error.js` that checks `res.headersSent` before attempting to send an error response, a real pattern for safely reporting an error that occurs partway through a response that's already started.
5. Change `streaming-vs-buffering.js`'s slow source to 20 chunks of 50ms each (same ~1 second total) and rerun `timing-client.js` against both routes, confirming the total time stays about the same while `/stream`'s first byte arrives much sooner.

## Code Example

- [server-basics.js](./04-request-response-cycle/server-basics.js)
- [post-body-demo.js](./04-request-response-cycle/post-body-demo.js)
- [forget-end-demo.js](./04-request-response-cycle/forget-end-demo.js)
- [headers-after-write-error.js](./04-request-response-cycle/headers-after-write-error.js)
- [streaming-vs-buffering.js](./04-request-response-cycle/streaming-vs-buffering.js) · [timing-client.js](./04-request-response-cycle/timing-client.js)

To run it yourself: with just Node.js installed, run any server file with `node <file>.js [port]`, then use `curl` against it in another terminal (`curl -i http://localhost:4100/about`, `curl -i -X POST -d '{"a":1}' http://localhost:4101/`, etc.). For the streaming comparison, start `streaming-vs-buffering.js` on port 4104, then run `node timing-client.js /stream` and `node timing-client.js /buffer` to see the timestamps above.

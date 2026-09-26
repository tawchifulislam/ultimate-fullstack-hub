# Fetch API

**Topic 34 of 89** (Section: JavaScript, 22 of 26)

## Notes

### What is the Fetch API?

`fetch()` is the modern, Promise-based browser API for making HTTP requests, replacing the older `XMLHttpRequest` for most everyday use. `fetch(url, options)` returns a Promise that resolves to a `Response` object as soon as the response's headers have arrived, not necessarily once the whole body has finished downloading.

### The critical gotcha: fetch does not reject on an HTTP error status

```js
const response = await fetch("/api/todos/999");
// response.ok is false for a 404, but fetch itself did not reject
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}
```

A `fetch()` promise only rejects on a genuine network failure, a bad URL, no connection, a CORS block. A 404 or 500 response is still, as far as `fetch()` is concerned, a "successful" fetch: it resolves with a real `Response` object whose `.ok` is `false` and `.status` holds the actual code. Forgetting to check `response.ok` is one of the most common fetch bugs, code can end up silently treating an error page's body as if it were the expected data.

### Reading the response body

A `Response`'s body is stream-based, so it is read through a separate async method:

- `response.json()`: parses the body as JSON.
- `response.text()`: returns the raw body as a string.
- `response.blob()`: for binary data such as images or files.

Each of these can only be called **once** per response; the body stream is consumed after the first read.

### Making requests with options

```js
const response = await fetch("/api/todos", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title: "Learn fetch" }),
});
```

`GET` is the default if no method is given. `body` must be a string (or a `FormData`/`Blob`/etc.), never a plain object, `fetch` does not serialize it for you, `JSON.stringify()` is required for a JSON body. The `Content-Type` header should match whatever is actually in `body`, since the server relies on it to parse the request correctly.

### Error handling

```js
try {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
} catch (err) {
  // catches both a real network failure AND the manually thrown HTTP error above
}
```

### AbortController: cancelling an in-flight request

```js
const controller = new AbortController();
fetch(url, { signal: controller.signal });
controller.abort(); // the fetch's promise rejects with an AbortError
```

This is the standard way to cancel a request that is no longer needed, the classic example is search-as-you-type, where each new keystroke should cancel whatever previous request is still pending.

### Practical tips

- Always check `response.ok` (or `response.status`) before treating a fetch as successful; the promise resolving is not the same thing as the request having actually succeeded at the HTTP level.
- Remember `response.json()`/`.text()` can only be read once; if both a status check and the body are needed, read the body once and branch on the parsed result.
- A small wrapper function that does the `response.ok` check in one place, instead of repeating it at every call site, keeps fetch usage consistent across a codebase.

## Resources

- MDN, Using the Fetch API: <https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch>
- MDN, fetch() global function: <https://developer.mozilla.org/en-US/docs/Web/API/fetch>
- MDN, AbortController: <https://developer.mozilla.org/en-US/docs/Web/API/AbortController>

## Practice / Exercises

- Fetch a URL that doesn't exist on a real API you have access to, log `response.ok` and `response.status`, and confirm the `catch` block does not run.
- Build a small search box that cancels its previous request with `AbortController` every time a new one starts, and confirm only the final request's result actually gets rendered.

## Code Example

See [`22-fetch-api.html`](./22-fetch-api.html), [`22-fetch-api.js`](./22-fetch-api.js), and [`22-fetch-api-server.js`](./22-fetch-api-server.js) in this folder. This one needs three files: run `node 22-fetch-api-server.js` first (a tiny local backend with no dependencies), then open `22-fetch-api.html` in a browser. Following the earlier discussion, the browser-side JavaScript is now in its own linked file (`<script src="...">`) rather than inline in the HTML, matching real-world practice.

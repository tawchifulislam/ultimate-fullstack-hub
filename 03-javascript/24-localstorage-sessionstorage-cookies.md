# LocalStorage, SessionStorage, Cookies

**Topic 36 of 89** (Section: JavaScript, 24 of 26)

## Notes

### Three ways to store data in the browser

- **localStorage**: persists indefinitely, until explicitly cleared. Scoped per origin (protocol + domain + port) and shared across every tab and window of that origin. Never sent to the server automatically.
- **sessionStorage**: persists only for the lifetime of one tab, cleared the moment that tab closes (it does survive a reload). Scoped per origin **and** per tab, two tabs open to the exact same page do not share sessionStorage. Also never sent to the server automatically.
- **Cookies**: small (roughly 4KB per cookie), and, unlike the two above, sent automatically with every matching HTTP request to the server, adding overhead to every request whether it's needed or not. Cookies can carry an expiration, be scoped to a specific path, and carry security flags: `HttpOnly`, `Secure`, and `SameSite`.

### Storage capacity

localStorage and sessionStorage typically allow around 5 to 10MB per origin, depending on the browser. Cookies are far smaller, around 4KB each, and browsers also cap how many cookies a single domain can set.

### The localStorage / sessionStorage API

Both share the exact same API, only their lifetime and scope differ:

```js
localStorage.setItem("key", "value"); // value must be a string
localStorage.getItem("key");          // returns a string, or null if not set
localStorage.removeItem("key");
localStorage.clear();                 // wipes everything for this origin
```

Web Storage only stores strings. Storing an object directly silently coerces it through `.toString()`, producing the literal string `"[object Object]"`, a real and common bug. Storing an object correctly requires `JSON.stringify()` first, and `JSON.parse()` to read it back (see the JSON topic).

### The storage event

```js
window.addEventListener("storage", (event) => {
  // event.key, event.oldValue, event.newValue, event.storageArea
});
```

This fires in **other** tabs and windows of the same origin when `localStorage` changes, never in the tab that made the change itself. It's the standard mechanism for syncing state across multiple open tabs, for example, logging out in one tab and reflecting that in every other open tab automatically.

### Cookies via document.cookie

```js
document.cookie = "username=Ada; max-age=3600; path=/";
document.cookie; // reading returns EVERY cookie as one semicolon-separated string
```

`document.cookie` is a genuinely awkward API. Setting it only ever adds or updates the one cookie named in the string, despite looking like it overwrites everything. Reading it returns every cookie for the current path combined into a single string, with no built-in way to read just one cookie by name, that parsing has to be written by hand.

### HttpOnly cookies are invisible to JavaScript, on purpose

A cookie marked `HttpOnly` cannot be read or set through `document.cookie` at all; it can only be set by the server, through a `Set-Cookie` response header. This is a deliberate security boundary, not a limitation to work around.

### Security: this is where the real decision matters

`localStorage` and `sessionStorage` are both fully readable by any JavaScript running on the page, including an injected script from a successful XSS attack or a compromised npm package. Neither should hold a real authentication or session token if it can be avoided. An `HttpOnly` cookie is the standard, safer place for that: since JavaScript cannot read it at all, an XSS attack cannot steal it directly. `SameSite=Strict` or `SameSite=Lax` further protects a cookie against being sent on cross-site requests, which is what mitigates CSRF.

### When to use which

- **Cookies**: whenever the server itself needs to see the value on every request (an auth or session token), or when a real expiration date matters.
- **localStorage**: client-only data that should persist across sessions and tabs, a theme preference, non-sensitive cached data, draft form content.
- **sessionStorage**: client-only data scoped to just the current tab's lifetime, in-progress state for a multi-step flow that shouldn't leak into a freshly opened tab.

### Practical tips

- Wrap Web Storage access in `try/catch` in real code; both can throw in some browsers' private/incognito mode, or when the storage quota is exceeded.
- Avoid storing real auth tokens in `localStorage` or `sessionStorage` when an `HttpOnly` cookie is an option; the difference is whether an XSS bug can steal the token directly.
- Remember `sessionStorage` never shares across tabs, even two tabs open to the exact same URL, this trips people up constantly.

### A practical gotcha: cookies specifically don't work when you just open the file

Opening an HTML file directly by double-clicking it loads it under the `file://` protocol. `localStorage` and `sessionStorage` still work fine there in real Chrome and Firefox. Cookies are the exception: Chrome, Firefox, and Safari all block `document.cookie` on `file://` pages by default. If sections 1, 2, and 4 below work but section 3 (cookies) doesn't seem to do anything, that's why, not a bug in the code. Serving the file over `http://` (any simple local server, even a one-line one) makes the cookie section work too.

## Resources

- MDN, Window: localStorage property: <https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage>
- MDN, Document: cookie property: <https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie>
- MDN, Using the Web Storage API: <https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API>

## Practice / Exercises

- Store an object in `localStorage` without `JSON.stringify()` first, read it back, and observe the `"[object Object]"` bug directly, then fix it.
- Open the same page in two browser tabs, add a `storage` event listener in one, change `localStorage` from the other, and confirm the listener only fires in the tab that did *not* make the change.

## Code Example

See [`24-localstorage-sessionstorage-cookies.html`](./24-localstorage-sessionstorage-cookies.html) and [`24-localstorage-sessionstorage-cookies.js`](./24-localstorage-sessionstorage-cookies.js) in this folder. Open the `.html` file directly in a browser, localStorage and sessionStorage work fine that way. Only the cookie section needs `http://` instead of `file://` to actually do anything, per the note above.

# Cross-Site Scripting (XSS)

**Topic 85 of 89** (Section: Web Security Basics, 3 of 4)

## Notes

### Project structure

```text
vulnerable-app.js         -> a guestbook with three deliberate XSS holes: reflected, stored and DOM-based
safe-app.js               -> the same guestbook with the holes closed (ejs escaping, textContent, SameSite cookie)
attacker-listener.js      -> a local stand-in for "the attacker's server", records what an injected script sends out
lab.js                    -> runs all three attacks against both apps in a real Chromium and reports what leaked
public/                   -> home.js (puts a JWT in localStorage), welcome-vulnerable.html/.js and welcome-safe.html/.js (the DOM-based pair)
dom-sinks-lab.js          -> which browser APIs turn a string into running code, and which do not
ejs-escaping.js           -> ejs <%= %> (escapes) vs <%- %> (raw)
contexts-lab.js           -> why one escape function is not enough: HTML text, attributes, URLs, JSON inside a script block
blocklist-filter-demo.js  -> why "remove <script> from the input" fails
dompurify-lab.js          -> sanitizing HTML that users are allowed to send
react-escaping.js         -> what React escapes for you, and where dangerouslySetInnerHTML opens the door
csp-lab.js                -> Content-Security-Policy and helmet as a second line of defense
package.json
```

Topic 83 said that escaping depends on where a value ends up, so it cannot be done once on input, and that nothing about HTML output was tested there. This topic tests it in a real browser. It also connects to Topic 81, because the JWT the demo app keeps in `localStorage` is exactly the thing an injected script can read, and to Topic 82, because CORS turns out to have nothing to say about an attack that runs inside your own origin. Topic 86 (CSRF) is the neighbouring attack, and the cookie flags below are the place where the two overlap.

Every result below was run on Node 22.22.0, with Chromium 141.0.7390.37 driven by playwright-core 1.64.1, Express 5.3.0, ejs 7.0.2, helmet 8.3.0, DOMPurify 3.4.17, and React and React DOM 19.3.1. Browser results are specific to that Chromium version. Other browsers were not tested.

The demo apps are deliberately vulnerable. Run them only on your own machine. The "attacker's server" is a small local listener on another port of the same machine, and nothing in this topic contacts anything outside it.

### What XSS is

Cross-site scripting happens when text that an attacker controls ends up in your page **as code instead of as text**, and the browser runs it. The browser cannot tell your script from the attacker's. Injected script runs with the **origin of your page**, so it can do anything your own JavaScript can do for the logged-in user: read the page, read `localStorage`, and call your API with the user's cookies attached.

There are three kinds, and they differ only in where the text travels:

| Type | Where the payload travels | Who is hit |
| ------ | ---------------------------- | ----------- |
| **Reflected** | Inside the request (a link with `?q=...`), echoed straight back in the response | Whoever is tricked into opening the crafted link |
| **Stored** | Saved on the server (a comment, a profile name), then served in pages | Everyone who views the page, with no link needed |
| **DOM-based** | Browser-side JavaScript reads something (the URL, `postMessage`, storage) and writes it into the page through a dangerous API | Whoever loads the page. The server's HTML can be perfectly clean |

All three use the same payload in this topic's lab:

```html
<img src=x onerror="(async()=>{ ...read things, send them to the attacker... })()">
```

An `<img>` with a broken `src` fires its `onerror` handler immediately, with no click needed. It is used instead of `<script>` because, as the sinks table below shows, `<script>` inserted through `innerHTML` does not run, while this does.

### What injected script can reach

`lab.js` plays both sides in a real Chromium. The victim "logs in" (the server sets an `HttpOnly` session cookie and an ordinary `theme` cookie, and `public/home.js` stores a JWT in `localStorage`, as many single-page apps do). The victim then loads a poisoned page. The payload reads `document.cookie`, reads the `localStorage` token, calls the session-protected `GET /api/me` with `fetch`, and sends all three to the listener with an image request.

Verified directly, against `vulnerable-app.js`. The reflected, stored and DOM-based attacks each produced exactly this:

```text
== reflected XSS  (GET /search?q=<payload>)
   victim's cookie jar:                 session (HttpOnly), theme
   requests the attacker's server got:  1
     document.cookie     -> "theme=dark"
     localStorage token  -> "demo.jwt.token-for-nadia"
     GET /api/me result  -> {"user":"nadia","email":"nadia@example.com"}
   what the victim's page showed:       Search You searched for:
```

Four things stand out:

1. **`HttpOnly` did its job, and it was not enough.** `document.cookie` showed only `theme=dark`. The session cookie was hidden from the script. But the script simply called `/api/me`, and the browser attached the session cookie to that request by itself. The attacker never needed the cookie value, only the ability to make requests as the user.
2. **The `localStorage` token was stolen outright.** Any script on the page can read `localStorage`, so a JWT stored there (Topic 81) is exposed to every XSS hole in the app.
3. **Adding `SameSite=Strict` did not help.** I re-ran the vulnerable app with `SameSite=Strict` added to the session cookie. All three attacks still returned the `/api/me` result. That is expected, because the request comes from the same site as the page it is made from. (To try it, add `SameSite=Strict` to the `Set-Cookie` line in `vulnerable-app.js` and run `lab.js`. The shipped file does not include it.)
4. **The victim saw nothing.** The page text just lacks the payload, which is a broken image with no visible trace. The leak happened in the background.

CORS (Topic 82) was not involved: the script's request to `/api/me` is same-origin, and the data left through an image request to another origin, which the attacker's listener received.

Verified directly, against `safe-app.js`, the same three attacks:

```text
== reflected XSS  (GET /search?q=<payload>)
   requests the attacker's server got:  0
   what the victim's page showed:       Search You searched for: <img src=x onerror="(async()=>{const me=await fetch('/api/me').then(r=>r.text());new ...
```

The stored and DOM-based attacks also gave 0 requests, and the payload appeared on the page as literal text.

### The three holes in code

The reflected hole is a template string that drops the query into HTML. The fix is a template engine that escapes by default:

```js
// vulnerable-app.js
res.send(page(`<h1>Search</h1><p>You searched for: ${req.query.q || ""}</p>`));

// safe-app.js
res.send(render("<h1>Search</h1><p>You searched for: <%= q %></p>", { q: req.query.q || "" }));
```

Verified directly with `curl -G --data-urlencode 'q=<img src=x onerror=alert(1)>'` against both servers:

```text
vulnerable:  <p>You searched for: <img src=x onerror=alert(1)></p>
safe:        <p>You searched for: &lt;img src=x onerror=alert(1)&gt;</p>
```

The stored hole is the same mistake, but the text is saved first. The safe app saves the **original** text and escapes it when it prints. Verified with `curl`, after posting a comment whose text is the same `<img>` payload:

```text
vulnerable:  <li><b>mallory</b>: <img src=x onerror=alert(1)></li>
safe:        <li><b>mallory</b>: &lt;img src=x onerror=alert(1)&gt;</li>
```

The DOM-based hole is entirely in browser code. The server sends a static file, and the script turns the URL into HTML:

```js
// public/welcome-vulnerable.js
document.getElementById("greeting").innerHTML = "Hello, " + name;   // DANGEROUS SINK

// public/welcome-safe.js
document.getElementById("greeting").textContent = "Hello, " + name; // SAFE SINK
```

One detail worth knowing: for a `?name=...` URL the query string does reach the server in the request line, but a `#fragment` does not. Verified directly: the browser reported `location.hash` as `#secret-in-fragment`, and the server received only `/x?name=A`. So a DOM-based payload placed in the fragment never shows up in server logs.

### Dangerous sinks and safe sinks

A **sink** is a browser API that takes a string and acts on it. `dom-sinks-lab.js` runs each one in Chromium with an attacker string and checks whether code ran. Verified directly (Chromium 141):

| Code | Did the payload run? |
| ------ | ---------------------- |
| `el.innerHTML = '<script>...</script>'` | did not run |
| `el.innerHTML = '<img src=x onerror=...>'` | **RAN** |
| `el.innerHTML = '<svg onload=...>'` | did not run |
| `el.insertAdjacentHTML('beforeend', '<img src=x onerror=...>')` | **RAN** |
| `el.textContent = '<img src=x onerror=...>'` | did not run (shown as text) |
| `el.innerText = '<img src=x onerror=...>'` | did not run (shown as text) |
| `createElement('p')` plus `.textContent = ...` | did not run (shown as text) |
| `a.setAttribute('href', 'javascript:...')`, then a click | **RAN** |
| `eval(string)` | **RAN** |
| `setTimeout(string, 0)` | **RAN** |
| `new Function(string)()` | **RAN** |

Read the first and third rows with care. A `<script>` inserted through `innerHTML` did not run, and neither did the `<svg onload>` in this Chromium, but the `<img onerror>` in the very same sink did. "The obvious payload failed" is not evidence that a sink is safe. The safe rule is simple: put text in with `textContent` (or `innerText`, or `createElement` and `textContent`), and treat `innerHTML`, `insertAdjacentHTML`, `eval`, string `setTimeout`, `new Function`, and URL attributes (`href`, `src`) as dangerous whenever any part of the string comes from outside.

### Escape on output, by context

The primary defense is to escape the data **at the moment it is written into the page**, with the escaping that matches **where it lands**. In ejs, `<%= x %>` escapes and `<%- x %>` prints raw. Verified directly with `ejs-escaping.js`:

```text
<p><%= x %></p>          ->  <p>&lt;img src=x onerror=alert(1)&gt;</p>
<p><%- x %></p>          ->  <p><img src=x onerror=alert(1)></p>
<input value="<%= x %>"> ->  <input value="&#34; onfocus=&#34;alert(1)&#34; autofocus=&#34;">
```

One character of difference decides whether the template is safe. Most template engines and UI frameworks escape by default and make the unsafe form something you have to ask for. Search a codebase for the raw forms (`<%-`, `|safe`, `v-html`, `dangerouslySetInnerHTML`, `innerHTML`) and review every hit.

**Escape on output, not on input.** The safe app stores the comment exactly as typed and escapes it when it prints. The right escaping depends on where the text lands (next section), and a comment like `a < b` is legitimate text. If you escape on the way in, you store text that is wrong for every other place it will be used.

#### One escape function is not enough

`contexts-lab.js` serves five pages that place the same attacker value in five different spots, all using a standard HTML escape function (`& < > " '` replaced by entities) or `JSON.stringify`. Verified directly, in Chromium:

| Where the value lands | Escaping used | Did the payload run? | Correct handling | With the fix |
| --- | --- | --- | --- | --- |
| HTML text, `<p>X</p>` | HTML escape | did not run | already correct | |
| Quoted attribute, `value="X"` | HTML escape | did not run | already correct | |
| **Unquoted attribute**, `value=X` | HTML escape | **RAN** | always quote the attribute | did not run |
| **URL**, `href="X"` | HTML escape | **RAN** | allowlist the URL scheme | did not run |
| **JSON in a script block**, `var data = X` | `JSON.stringify` | **RAN** | escape `<` as `<` | did not run |

What each failure looks like:

- **Unquoted attribute.** The payload `x onfocus=window.__pwned=true autofocus` contains no `<`, `>` or quote character, so the HTML escape has nothing to change. A space is enough to end an unquoted attribute and start a new one. Always quote attribute values.
- **URL.** `javascript:window.__pwned=true` contains nothing to escape either, and it ran when the link was clicked. Escaping stops a value from breaking out of an attribute, but it does not make a URL safe to follow. Check the scheme against an allowlist.
- **JSON in a script block.** The payload `</script><script>...</script>` ran even through `JSON.stringify`, because the HTML parser ends a `<script>` element at the first `</script>` it sees, whatever is inside a JavaScript string. Replacing `<` with `<` inside the JSON fixes it without changing the data.

The URL fix in `contexts-lab.js` parses the value and keeps only `http:`, `https:` and `mailto:`. Verified directly, including the sneaky spellings:

```text
"https://example.com/?a=1&b=2"     -> href="https://example.com/?a=1&b=2"
"mailto:nadia@example.com"         -> href="mailto:nadia@example.com"
"/relative/path"                   -> href="/relative/path"
"javascript:alert(1)"              -> href="#"
"JaVaScRiPt:alert(1)"              -> href="#"
" javascript:alert(1)"             -> href="#"
"data:text/html,hi"                -> href="#"
```

A safer design for the script-block case is to avoid it: send data as a separate JSON response, or put it in a `data-` attribute that is properly escaped, and read it from a script file. That is design advice and was not run here.

### Why blocklist filters fail

The tempting fix is to remove the dangerous parts from the input. `blocklist-filter-demo.js` uses a filter that deletes `<script>...</script>` blocks and sends four payloads through it and through proper escaping. Verified directly, in Chromium:

```text
payload            after the naive filter                                   filter     escaping
plain <script>     ""                                                       did not run did not run
<img onerror>      "<img src=x onerror=\"window.__pwned=true\">"            RAN        did not run
<svg onload>       "<svg onload=\"window.__pwned=true\"></svg>"             RAN        did not run
nested tags        "<script>window.__pwned=true</script>"                   RAN        did not run
```

The filter handled the one payload its author thought of. The `<img>` and `<svg>` payloads pass straight through. The nested payload is the instructive one: the filter deletes the inner `<script></script>` pairs, and what remains **glues itself back into a working script tag**. The filter built the attack. Escaping stopped all four, because it does not try to recognise attacks. It changes the meaning of every special character.

### Validation is not an XSS defense

Topic 83 validates the shape of input: a type, a length, a format. That is worth doing, and for some fields (a username limited to letters and digits) it also happens to remove the characters XSS needs. But a comment, a display name or a bio has to accept `<`, quotes and `&`, because people type them. The text that must be accepted is the same text that must be escaped. Validation limits what comes in, and output escaping makes whatever came in safe to display. You need both, and the second one is the XSS defense.

A URL field is a special case: do not assume a URL validator rejects `javascript:`. Check the scheme yourself, as `contexts-lab.js` does.

### Sanitizing: when users may send HTML

Escaping turns a user's `<b>bold</b>` into the literal characters. If your product really lets users send formatting (a rich-text editor, a CMS), the HTML has to be **sanitized** instead: parsed, then reduced to a safe allowlist of tags and attributes. DOMPurify does this inside a real DOM. `dompurify-lab.js` loads its browser bundle into Chromium and compares raw `innerHTML` with the sanitized result. Verified directly (DOMPurify 3.4.17):

```text
case                 raw innerHTML        sanitized innerHTML   output of sanitize()
formatting only      did not run          did not run           "<p>Hello <b>world</b> and <i>friends</i></p>"
img onerror          RAN                  did not run           "<img src=\"x\">"
script tag           did not run          did not run           "<p>hi</p>"
javascript: link     RAN                  did not run           "<a>click me</a>"
svg onload           did not run          did not run           "<svg></svg>"
iframe srcdoc        RAN                  did not run           ""
safe link            did not run          did not run           "<a href=\"https://example.com/page\" title=\"t\">link</a>"
style tag            did not run          did not run           "<p>text</p>"
```

Legitimate formatting and a normal link survive, and each dangerous part is stripped: the `onerror` attribute, the `javascript:` link target, the whole `<iframe>`, and the `<script>` and `<style>` elements. You can tighten the allowlist further. With `ALLOWED_TAGS: ["b", "i", "a"]` and `ALLOWED_ATTR: ["href"]`, this input and output were observed:

```text
in:   <h1>title</h1><p>Hello <b>world</b> <a href="https://example.com" onclick="x()">link</a> <img src=x></p>
out:  titleHello <b>world</b> <a href="https://example.com">link</a> 
```

Note that disallowed tags lose their tags but **keep their text** (`title` stays, with no heading around it), and the `<img>` and the `onclick` are gone.

**The mistake that defeats sanitizing.** Verified directly: building `clean + name` with a raw `name` after calling `sanitize()` ran the payload (`true`). Sanitize the **final** string, and do nothing to it afterwards. The DOMPurify documentation also warns that its defaults are intentionally restrictive and that widening the allowlist can introduce risk, and that `sanitize()` is not re-entrant, so it should not be called from inside a hook.

DOMPurify needs a DOM. In the browser that is free. On a Node server you would need to give it one (for example with jsdom), and that setup was not run here.

### React

React escapes values placed in JSX, which removes the most common XSS bug in React apps. `react-escaping.js` renders six cases with `react-dom/server` and loads each result into Chromium to see whether it runs (cases 4 to 6 also click the link, and the script records that the click really happened). Verified directly (React 19.3.1):

```text
case                           payload ran?  link click?   HTML that React produced
1. text child                  did not run   n/a           <div>&lt;img src=x onerror=&quot;window.__pwned=true&quot;&gt;</div>
2. attribute value             did not run   n/a           <input value="&quot; onfocus=&quot;window.__pwned=true&quot; autofocus=&quot;"/>
3. dangerouslySetInnerHTML     RAN           n/a           <div><img src=x onerror="window.__pwned=true"></div>
4. href from user input        did not run   clicked       <a id="link" href="javascript:throw new Error(&#x27;React has blocked a javascript: URL as a security precaution.&#x27;)">click me</a>
5. href with a scheme check    did not run   clicked       <a id="link" href="#">click me</a>
6. control: same link, raw HTML RAN           clicked       <div><a id="link" href="javascript:window.__pwned=true">click me</a></div>
```

Cases 1 and 2 show escaping by default, in text and in an attribute value. Case 3 shows that `dangerouslySetInnerHTML` is a raw `innerHTML` with a friendly name, and the name is a warning: if the HTML is user-controlled, pass it through a sanitizer first. Case 4 is a pleasant surprise: React 19.3.1 rewrote a `javascript:` URL into a stub that throws, and the payload did not run. Case 6 is the control that proves the click in this script would have run the payload otherwise. Two limits: that rewrite was observed in **server rendering** (`renderToString`) only, and older React versions and client-side rendering were not tested. Do not count on a framework for URL safety. Checking the scheme yourself (case 5) is cheap and works everywhere.

### Content-Security-Policy and helmet: the second line of defense

A **Content-Security-Policy** (CSP) is a response header that tells the browser which scripts it may run. If an injection slips past your escaping, a good policy can still make the browser refuse to run it. `csp-lab.js` serves the same vulnerable page (the query value is inserted unescaped) under six headers and tries three payloads against each in Chromium, while the page's own inline script and its own `/app.js` show what each policy costs legitimate code. Verified directly:

```text
CSP header sent                        <script>     onerror      plain <b>    own inline   own /app.js
no CSP header                          RAN          RAN          rendered     runs         runs
script-src 'self' 'unsafe-inline'      RAN          RAN          rendered     runs         runs
default-src 'self'                     blocked      blocked      rendered     BLOCKED      runs
script-src 'nonce-...' (per request)   blocked      blocked      rendered     runs         runs
helmet() defaults                      blocked      blocked      rendered     BLOCKED      runs
helmet() + nonce                       blocked      blocked      rendered     runs         runs
```

What to take from it:

- **`'unsafe-inline'` cancels the protection.** With it, both injected payloads ran exactly as with no header.
- **A strict policy blocks injected script and your own inline script alike.** Under `default-src 'self'` and under helmet's defaults, the page's own inline `<script>` was blocked too. Move inline code into files served from your own origin, or use a nonce.
- **A nonce keeps your inline script and blocks the injected one.** The server puts a random value in the header (`script-src 'nonce-...'`) and the same value in the `nonce` attribute of each script it wants to allow. An attacker's injected tag has no valid nonce. Verified directly, the value was different on each response, which is the whole point (your values will differ, they are random):

```text
request 1: script-src 'nonce-P8xNw10RAxi1D5/a5RHMGg=='
request 2: script-src 'nonce-pl+C16ZUJrPMCAYTUOmNdw=='
```

- **Event-handler attributes are blocked too.** The `onerror` payload was refused under each of the four policies that restrict inline code. Under `default-src 'self'`, Chromium logged `Refused to execute inline script because it violates the following Content Security Policy directive` for the inline script, and `Refused to execute inline event handler because it violates...` for the handler. The console is where you see these when a policy breaks something.
- **CSP stops script, not HTML injection.** The plain `<b>injected</b>` element was rendered under every policy. An attacker can still change what the page shows, so CSP does not replace escaping. It is the net under it.

**helmet** is Express middleware that sets a group of security headers in one call. Verified directly (helmet 8.3.0, with `helmet()` applied and no options), these were the response headers:

```text
content-security-policy        default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
strict-transport-security      max-age=31536000; includeSubDomains
x-content-type-options         nosniff
x-frame-options                SAMEORIGIN
referrer-policy                no-referrer
cross-origin-opener-policy     same-origin
cross-origin-resource-policy   same-origin
x-powered-by                   (not sent)
```

Express sends `X-Powered-By: Express` on its own (checked with `curl -I` against the vulnerable app), and helmet removed it. The default policy is strict (`script-src 'self'`, `script-src-attr 'none'`), which is why the page's own inline script was blocked above. A real app usually starts from these defaults and loosens one directive at a time.

### Cookies, tokens and limiting the damage

If an injection gets through, these choices decide how much the attacker gets. Everything in this list that is marked "observed" was run in the lab above:

- **`HttpOnly` cookies keep the cookie value out of the script's hands** (observed: `document.cookie` did not show `session`). They do **not** stop the script from acting as the user (observed: `/api/me` was called with the session).
- **A token in `localStorage` is readable by any injected script** (observed: the JWT was sent to the listener). The difference between the two storage choices is portability: a copied token is something an attacker can use from their own machine, while an `HttpOnly` cookie cannot be copied out. I did not test replaying a stolen token, so that part is reasoning. The trade-off is that a cookie-based session is the case CSRF attacks (Topic 86) go after.
- **`SameSite` does not help against XSS** (observed with `SameSite=Strict`). It is a CSRF control. The script runs inside your site, so its requests are same-site.

None of these is a substitute for stopping the injection. They are limits on the damage.

### What this topic does not cover

- **Trusted Types**, a browser feature that locks dangerous sinks so only approved, sanitized values can reach them. The OWASP cheat sheet below mentions it, and it was not tested.
- **Mutation XSS** and other sanitizer bypasses, and other browsers: only Chromium was used.
- **Server-side template injection**, which is a different bug that happens to look similar.
- **Markdown, SVG uploads, and file uploads**, which are common sources of stored XSS and need the same sanitizing treatment.
- **React client-side rendering and older React versions**, DOMPurify on Node (jsdom), and CSP reporting directives.
- **Clickjacking**, which `frame-ancestors` and `X-Frame-Options` (both in helmet's output above) address.

### Common mistakes

| Mistake | What happens |
| --- | --- |
| Using the raw form for user text (`<%-`, `\|safe`, `innerHTML`, `dangerouslySetInnerHTML`) | The text becomes code. Observed for every raw form tested above. |
| One escape function for every context | Unquoted attributes, URLs and JSON in a script block all ran through a standard HTML escape. Observed. |
| Removing `<script>` from the input | `<img onerror>`, `<svg onload>` and nested tags still run. Observed. |
| Sanitizing, then editing the string | The payload added afterwards runs. Observed. |
| Escaping on the way in and storing the result | The stored text is wrong for every other place it will be used. Store the original and escape on output. |
| Believing `HttpOnly` makes XSS harmless | The script still calls your API as the user. Observed. |
| Keeping a JWT in `localStorage` | One XSS hole leaks it. Observed. |
| `'unsafe-inline'` in `script-src` | The policy no longer blocks injected script. Observed. |
| Treating CSP as the fix | It does not stop HTML injection, and a policy has holes. Escape first, CSP second. |
| Rendering a user-supplied URL without checking the scheme | `javascript:` links run on click. Observed. |
| Testing only with `<script>alert(1)</script>` | In `innerHTML` it does not run, which makes a vulnerable sink look safe. Observed. |

### Practical tips

- Output-escape everything, using the escaping that fits the context. Let the template engine or the framework do it, and treat every raw form as something to review.
- Put text into the DOM with `textContent`. Never build HTML by joining strings that contain user data.
- If users may send HTML, sanitize it with DOMPurify, sanitize the final string, and keep the tag allowlist as small as the feature allows.
- Check URL schemes against an allowlist (`http:`, `https:`, `mailto:`) before putting a user-supplied URL in `href` or `src`.
- Send `helmet()`'s headers from the start, then tune the CSP. Use a nonce rather than `'unsafe-inline'`, and read the console when a policy blocks something.
- Prefer `HttpOnly` cookies for session tokens, and know that this trades one risk for another (Topic 86).
- Test with several payloads, including `<img src=x onerror=...>`, and check in a real browser. "My `<script>` payload did nothing" proves little.

## Resources

- OWASP, Cross Site Scripting Prevention Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html>
- MDN, Content Security Policy (CSP): <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP>
- DOMPurify, a DOM-only XSS sanitizer for HTML, MathML and SVG: <https://github.com/cure53/DOMPurify>

## Practice

1. In `vulnerable-app.js`, fix the stored hole with a hand-written `escapeHtml` for `c.text` but forget `c.author`. Post a comment whose **author** is the payload, then change `lab.js` (or use `curl`) to show the leak still works.
2. In `dom-sinks-lab.js`, add four more cases: `outerHTML`, `document.write`, `iframe.srcdoc`, and `location = "javascript:..."`. Record which ones run in your browser, and add a `textContent` or `createElement` version of each that does not.
3. In `contexts-lab.js`, add a page that puts the value inside an inline event handler attribute, such as `onclick="show('X')"`, using `escapeHtml`. Find a payload that still runs, and explain why escaping for an HTML attribute is not the same as escaping for JavaScript.
4. In `csp-lab.js`, add a variant that sends the policy as `Content-Security-Policy-Report-Only` instead of `Content-Security-Policy`. Find out what the browser does with the injected payload, and what appears in the console.
5. Add a markdown comment feature to `safe-app.js`: render markdown to HTML with a library, then sanitize the result with DOMPurify (you will need jsdom on the server) before storing or printing it. Write down every payload you tried and the result.

## Code Example

- [vulnerable-app.js](./03-xss/vulnerable-app.js)
- [safe-app.js](./03-xss/safe-app.js)
- [attacker-listener.js](./03-xss/attacker-listener.js)
- [lab.js](./03-xss/lab.js)
- [public/home.js](./03-xss/public/home.js)
- [public/welcome-vulnerable.html](./03-xss/public/welcome-vulnerable.html)
- [public/welcome-vulnerable.js](./03-xss/public/welcome-vulnerable.js)
- [public/welcome-safe.html](./03-xss/public/welcome-safe.html)
- [public/welcome-safe.js](./03-xss/public/welcome-safe.js)
- [dom-sinks-lab.js](./03-xss/dom-sinks-lab.js)
- [ejs-escaping.js](./03-xss/ejs-escaping.js)
- [contexts-lab.js](./03-xss/contexts-lab.js)
- [blocklist-filter-demo.js](./03-xss/blocklist-filter-demo.js)
- [dompurify-lab.js](./03-xss/dompurify-lab.js)
- [react-escaping.js](./03-xss/react-escaping.js)
- [csp-lab.js](./03-xss/csp-lab.js)

To run it yourself, run `npm install` in the project folder. Everything that drives a browser (`lab.js`, `dom-sinks-lab.js`, `contexts-lab.js`, `blocklist-filter-demo.js`, `dompurify-lab.js`, `react-escaping.js`, `csp-lab.js`) needs a Chromium. Either set `CHROMIUM_PATH` to a Chrome or Chromium you already have (this is how everything here was run), or install one with `npx playwright-core install chromium`. That second route was not run here.

Then run the scripts with `npm run lab`, `npm run dom-sinks`, `npm run contexts`, `npm run blocklist`, `npm run dompurify`, `npm run react` and `npm run csp`. `npm run ejs` needs no browser. To explore the apps by hand, run `node vulnerable-app.js` (port 4950) and `node safe-app.js` (port 4951), open `http://localhost:4950/login` first to get the cookies, then try `http://localhost:4950/search?q=<h1>hello</h1>` and `http://localhost:4950/welcome-vulnerable.html?name=<b>bold</b>`, and the same paths on port 4951. Run the vulnerable app only on your own machine.

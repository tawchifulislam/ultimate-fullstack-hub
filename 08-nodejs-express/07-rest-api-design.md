# REST API Design

**Topic 77 of 89** (Section: Node.js / Express, 7 of 12)

## Notes

### Project structure

```text
books-api.js   -> a complete REST resource (CRUD + status codes + headers + a non-CRUD action)
```

Topics 71 to 76 built up the pieces Express is made of: the HTTP layer, routing, and middleware. This topic is about a different kind of thing, a set of conventions for how to shape an API out of those pieces so it behaves the way any client (a frontend, another service, a future version of yourself) will expect, without having to read the code first. REST is not a library or a protocol Express enforces for you, it is a style, and `books-api.js` is a single resource (`/api/v1/books`) built to follow it closely enough to show what each convention buys you.

### URLs are nouns, not verbs

```text
GET    /api/v1/books          list all books
GET    /api/v1/books/1        one specific book
POST   /api/v1/books          create a new book
PUT    /api/v1/books/1        replace book 1 entirely
PATCH  /api/v1/books/1        update part of book 1
DELETE /api/v1/books/1        remove book 1
```

The URL names a resource (`books`, or one specific book); the HTTP method says what to do to it. There is no `/getBooks` or `/createBook` route anywhere in `books-api.js`, the verb already lives in the HTTP method, repeating it in the path is redundant and is the single most common REST anti-pattern in real codebases.

### HTTP methods map to CRUD, and the response status proves it

Verified directly against the running server:

```text
GET  /api/v1/books            -> 200 {"data":[...],"count":2}
GET  /api/v1/books/1           -> 200 {"data":{"id":1,...}}
GET  /api/v1/books/999          -> 404 {"error":"no book with id 999"}

POST /api/v1/books  (valid)      -> 201 Created, Location: /api/v1/books/3
                                      {"data":{"id":3,"title":"Refactoring",...}}
POST /api/v1/books  (missing fields) -> 400 {"error":"title, author, and isbn are all required"}
POST /api/v1/books  (duplicate isbn) -> 409 {"error":"a book with isbn ... already exists"}

PUT  /api/v1/books/1  (full body)  -> 200 {"data":{...fully replaced...}}
PUT  /api/v1/books/1  (partial body) -> 400 {"error":"PUT replaces the whole resource: ..."}

PATCH /api/v1/books/2  ({"author":"..."}) -> 200 {"data":{...only author changed...}}

DELETE /api/v1/books/1 (exists)     -> 204 (empty body)
DELETE /api/v1/books/1 (already gone) -> 404 {"error":"no book with id 1"}
```

Each status code is carrying real information a client can branch on without parsing the response body: `201` plus a `Location` header tells a client exactly where the new resource lives; `204` tells it a delete succeeded and there is deliberately nothing to read back; `400` versus `404` versus `409` separate "you sent something wrong," "this doesn't exist," and "this conflicts with something that does," three genuinely different situations a client needs to handle differently.

### PUT replaces, PATCH updates; this is a real, enforced difference here

`PUT /api/v1/books/1` requires `title`, `author`, and `isbn` all over again, because it is defined as replacing the resource entirely, sending only one field is treated as an incomplete replacement and rejected with `400`. `PATCH /api/v1/books/2` with only `{"author": "..."}` changes exactly that one field and leaves the rest alone, verified directly:

```text
PATCH /api/v1/books/2  {"author":"Andy Hunt and Dave Thomas"}
-> {"data":{"id":2,"title":"The Pragmatic Programmer","author":"Andy Hunt and Dave Thomas","isbn":"9780135957059","archived":false}}
```

`title` and `isbn` came back completely unchanged, only `author` moved.

### Idempotency: same request, same end state, repeated safely

An idempotent method can be sent more than once without changing the outcome beyond the first time. Verified directly, the exact same `PUT` request sent twice in a row:

```text
PUT /api/v1/books/1  (1st time) -> 200 {"data":{"title":"Clean Code 2nd Ed",...}}
PUT /api/v1/books/1  (2nd time) -> 200 {"data":{"title":"Clean Code 2nd Ed",...}}   <- identical result
```

`DELETE` is idempotent in a subtler sense, the status code differs between calls, but the resulting server state does not:

```text
DELETE /api/v1/books/1  (1st time, book exists)     -> 204
DELETE /api/v1/books/1  (2nd time, book already gone) -> 404
```

Either way, after both calls, book 1 does not exist, the end state is identical even though the second response reports an error. `POST`, by contrast, is never idempotent by design, the exact same body sent twice creates two separate resources with two separate ids, verified directly:

```text
POST /api/v1/books {"title":"Dup Title","...","isbn":"1111..."}  -> created as id 4
POST /api/v1/books {"title":"Dup Title 2","...","isbn":"2222..."} -> created as id 5
```

Knowing which methods are safe to retry automatically (on a flaky network, say) and which are not is a direct, practical consequence of this distinction.

### Not everything is CRUD: modeling an action as a sub-resource

"Archive this book" is not a create, a full replace, a partial update in the usual sense, or a delete. The common REST-consistent way to handle an action like this is a nested, resource-shaped endpoint rather than a verb in the path:

```js
app.post("/api/v1/books/:id/archive", (req, res) => { ... });
```

```text
POST /api/v1/books/2/archive -> 200 {"data":{"id":2,...,"archived":true}}
```

This keeps the URL still reading as a noun (`archive`, as a sub-resource of one specific book) instead of introducing an endpoint like `POST /api/v1/archiveBook` that breaks the method-as-verb convention everywhere else in the API.

### Filtering and sorting through query parameters

```text
GET /api/v1/books?author=hunt   -> only books whose author contains "hunt" (case-insensitive)
GET /api/v1/books?sort=title    -> the same list, alphabetical by title
```

Verified directly, filtering returned exactly the one matching book, and sorting returned all four remaining books in alphabetical order (`Dup Title`, `Dup Title 2`, `Refactoring`, `The Pragmatic Programmer`). Query parameters are the conventional place for options that shape a GET's result without changing which resource is being addressed; the resource is still `/api/v1/books`, the query string only narrows or reorders it. Pagination, a closely related idea, gets its own dedicated topic later in the roadmap (API / System Design Basics), since it involves more than just a query parameter, limits, cursors or offsets, and total counts.

### Versioning in the URL

Every route in this topic lives under `/api/v1/`. Putting a version in the path is the simplest and most common way to let an API change its shape later (`v2`) without breaking clients still relying on `v1`'s behavior, at the cost of eventually running two versions of the same logic side by side. The alternative, a version carried in a request header instead of the URL, avoids that duplication but is less visible and harder to test with a plain browser address bar or a quick curl command, which is part of why the URL-prefix style remains the most widely used in practice.

### Practical tips

- Treat the response status code as part of the API's contract, not an afterthought; a client should be able to branch on `201` vs `200` vs `404` vs `409` without ever needing to inspect the body.
- Reserve `PUT` for a genuine full replace and validate it that way, as `books-api.js` does; silently treating `PUT` like `PATCH` (accepting a partial body) quietly breaks the idempotency guarantee clients rely on.
- `204 No Content` should genuinely have an empty body; sending JSON back with a `204` status is inconsistent with what the status code promises and confuses HTTP clients that treat `204` as "nothing to parse."
- When an operation doesn't map to create/read/update/delete, prefer a nested, resource-shaped endpoint (`/books/:id/archive`) over a verb bolted onto the collection URL (`/archiveBook`); it keeps the rest of the API's URL conventions intact.

## Resources

- MDN, HTTP request methods: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods>
- MDN, HTTP response status codes: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Status>
- Microsoft REST API Guidelines (a widely cited practical reference): <https://github.com/microsoft/api-guidelines>
- Roy Fielding's dissertation, Chapter 5 (the original definition of REST): <https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm>

## Practice

1. Add a `GET /api/v1/books?archived=true` filter and confirm it returns only the book archived earlier in this topic.
2. Change `DELETE` to instead set `archived: true` on the book rather than removing it from the array (a "soft delete"), and decide, with reasoning, what status code the endpoint should return afterward.
3. Add an `PATCH /api/v1/books/:id` validation rule that rejects an attempt to change `isbn` to one that already belongs to a different book, returning `409`.
4. Add a second resource, `/api/v1/authors`, and a nested read-only route `/api/v1/authors/:id/books` that lists only that author's books, to practice a resource that is naturally nested under another.
5. Add a `GET /api/v1/books` response header, `X-Total-Count`, carrying the unfiltered total number of books, and explain why a client might want that even when filtering is applied.

## Code Example

- [books-api.js](./07-rest-api-design/books-api.js)

To run it yourself: `npm install express` in a folder containing this file, then run `node books-api.js [port]` and use `curl` against it, matching the requests shown above (`curl -X POST -H "Content-Type: application/json" -d '{"title":"...","author":"...","isbn":"..."}' http://localhost:4300/api/v1/books`, and so on for `PUT`, `PATCH`, and `DELETE`).

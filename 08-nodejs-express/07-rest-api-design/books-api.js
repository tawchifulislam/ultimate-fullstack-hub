// books-api.js
// A small REST API for a "books" resource, demonstrating the conventions
// REST API design actually means in practice: resource-shaped URLs (nouns,
// not verbs), HTTP methods standing in for CRUD actions, meaningful status
// codes, and a predictable JSON shape for every response.

const express = require("express");
const app = express();
const port = process.argv[2] || 4300;

app.use(express.json());

// In-memory "database". A real API would use Topic 80's database layer;
// this topic is only about the shape of the API in front of it.
let books = [
  { id: 1, title: "Clean Code", author: "Robert Martin", isbn: "9780132350884", archived: false },
  { id: 2, title: "The Pragmatic Programmer", author: "Andrew Hunt", isbn: "9780135957059", archived: false },
];
let nextId = 3;

// ---- GET /api/v1/books : list, with optional filtering and sorting ----
app.get("/api/v1/books", (req, res) => {
  let result = books;

  if (req.query.author) {
    result = result.filter((b) =>
      b.author.toLowerCase().includes(String(req.query.author).toLowerCase())
    );
  }

  if (req.query.sort === "title") {
    result = [...result].sort((a, b) => a.title.localeCompare(b.title));
  }

  res.status(200).json({ data: result, count: result.length });
});

// ---- GET /api/v1/books/:id : a single resource ----
app.get("/api/v1/books/:id", (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) {
    return res.status(404).json({ error: `no book with id ${req.params.id}` });
  }
  res.status(200).json({ data: book });
});

// ---- POST /api/v1/books : create. Not idempotent, validated, can 409 ----
app.post("/api/v1/books", (req, res) => {
  const { title, author, isbn } = req.body || {};

  if (!title || !author || !isbn) {
    return res.status(400).json({ error: "title, author, and isbn are all required" });
  }

  if (books.some((b) => b.isbn === isbn)) {
    return res.status(409).json({ error: `a book with isbn ${isbn} already exists` });
  }

  const book = { id: nextId++, title, author, isbn, archived: false };
  books.push(book);

  // 201 Created + Location header pointing at the new resource's own URL
  // is the conventional way to tell the client exactly what was created
  // and where to find it again.
  res
    .status(201)
    .location(`/api/v1/books/${book.id}`)
    .json({ data: book });
});

// ---- PUT /api/v1/books/:id : full replace. Idempotent. ----
app.put("/api/v1/books/:id", (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) {
    return res.status(404).json({ error: `no book with id ${req.params.id}` });
  }

  const { title, author, isbn } = req.body || {};
  if (!title || !author || !isbn) {
    return res.status(400).json({ error: "PUT replaces the whole resource: title, author, and isbn are all required" });
  }

  book.title = title;
  book.author = author;
  book.isbn = isbn;
  res.status(200).json({ data: book });
});

// ---- PATCH /api/v1/books/:id : partial update ----
app.patch("/api/v1/books/:id", (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) {
    return res.status(404).json({ error: `no book with id ${req.params.id}` });
  }

  const allowed = ["title", "author", "isbn"];
  for (const key of Object.keys(req.body || {})) {
    if (allowed.includes(key)) book[key] = req.body[key];
  }
  res.status(200).json({ data: book });
});

// ---- DELETE /api/v1/books/:id : idempotent in end-state, 204 on success ----
app.delete("/api/v1/books/:id", (req, res) => {
  const index = books.findIndex((b) => b.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: `no book with id ${req.params.id}` });
  }
  books.splice(index, 1);
  // 204 No Content: the request succeeded, there is nothing to send back.
  res.status(204).end();
});

// ---- A practical sub-resource action for something that is not CRUD ----
// "archive a book" is not creating, reading, updating as a full replace, or
// deleting it. Modeling it as its own nested resource ("archived-status")
// keeps the URL a noun, instead of inventing a verb-shaped endpoint like
// POST /api/v1/archiveBook.
app.post("/api/v1/books/:id/archive", (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) {
    return res.status(404).json({ error: `no book with id ${req.params.id}` });
  }
  book.archived = true;
  res.status(200).json({ data: book });
});

app.listen(port, () => console.log(`books-api listening on ${port}`));

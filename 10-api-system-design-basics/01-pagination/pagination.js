// pagination.js
// The two pagination strategies, as plain functions over the posts table.
//
//   offsetPage(db, { page, pageSize, sort })   "page 3, 20 per page":  LIMIT ? OFFSET ?
//   cursorPage(db, { cursor, limit, sort })    "20 after THIS row":    WHERE (sort, id) < (?, ?)
//
// Both sort newest/highest first. Both end the ORDER BY with id, the tie-breaker:
// the sort columns are not unique, and without a unique last column the order of
// tied rows is unspecified (see ties-demo.js).

// The sort column goes into the SQL text, because ORDER BY cannot be a bound parameter.
// So it must come from this allowlist, never straight from the request (Topic 83).
const SORTS = {
  created_at: { column: "created_at" },
  score: { column: "score" },
};

const MAX_PAGE_SIZE = 100;
const COLUMNS = "id, title, author, score, created_at";

class CursorError extends Error {}

function sortColumn(sort) {
  if (!Object.hasOwn(SORTS, sort)) throw new CursorError(`unknown sort "${sort}"`);
  return SORTS[sort].column;
}

// ---- offset / page-number pagination ----

function offsetPage(db, { page = 1, pageSize = 20, sort = "created_at" } = {}) {
  const column = sortColumn(sort);
  const total = db.prepare("SELECT COUNT(*) AS n FROM posts").get().n;
  const data = db
    .prepare(`SELECT ${COLUMNS} FROM posts ORDER BY ${column} DESC, id DESC LIMIT ? OFFSET ?`)
    .all(pageSize, (page - 1) * pageSize);
  return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

// ---- cursor (keyset) pagination ----

// The cursor is the sort value and the id of the LAST row the client received.
// Base64url of JSON is "opaque" only in the sense that clients should not parse it.
// It is not encrypted and not signed (Topic 81: encoded is not secret).
function encodeCursor(sort, row) {
  return Buffer.from(JSON.stringify({ s: sort, v: [row[sortColumn(sort)], row.id] })).toString("base64url");
}

function decodeCursor(text, sort) {
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(String(text), "base64url").toString("utf8"));
  } catch {
    throw new CursorError("cursor is not valid");
  }
  const ok =
    parsed &&
    parsed.s === sort && // a cursor made for one sort order is meaningless for another
    Array.isArray(parsed.v) &&
    parsed.v.length === 2 &&
    parsed.v.every((n) => Number.isSafeInteger(n));
  if (!ok) throw new CursorError("cursor is not valid for this request");
  return parsed.v;
}

function cursorPage(db, { cursor = null, limit = 20, sort = "created_at" } = {}) {
  const column = sortColumn(sort);
  let where = "";
  const params = [];
  if (cursor) {
    const [value, id] = decodeCursor(cursor, sort);
    where = `WHERE (${column}, id) < (?, ?)`; // "strictly after the last row I saw", as one row comparison
    params.push(value, id);
  }
  // Ask for one row more than needed. If it comes back, there is a next page,
  // and no separate COUNT(*) is needed to know that.
  const rows = db.prepare(`SELECT ${COLUMNS} FROM posts ${where} ORDER BY ${column} DESC, id DESC LIMIT ?`).all(...params, limit + 1);
  const hasNext = rows.length > limit;
  if (hasNext) rows.pop();
  return { data: rows, meta: { limit, hasNext }, nextCursor: hasNext ? encodeCursor(sort, rows.at(-1)) : null };
}

module.exports = { SORTS, MAX_PAGE_SIZE, CursorError, offsetPage, cursorPage, encodeCursor, decodeCursor };

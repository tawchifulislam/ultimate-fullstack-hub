// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

// This is a plain, static route, not a dynamic one, but it sits right next
// to app/products/[id]/, at the same /products/* level. Visiting
// /products/new renders this file, not the dynamic [id] route with
// id="new", a static segment always wins over a dynamic one when both
// could otherwise match (confirmed in the Notes).

export default function NewProductPage() {
  return (
    <main>
      <h1>Create a new product</h1>
    </main>
  );
}

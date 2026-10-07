// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

// No dynamic API (headers, cookies, searchParams) is used anywhere here, so
// Next.js can render this page once, at build time, and reuse that same
// HTML for every request, this is static rendering (SSG).

export default function StaticPage() {
  const renderedAt = Date.now();
  return (
    <main>
      <h1>Static page</h1>
      <p>Rendered at: {renderedAt}</p>
    </main>
  );
}

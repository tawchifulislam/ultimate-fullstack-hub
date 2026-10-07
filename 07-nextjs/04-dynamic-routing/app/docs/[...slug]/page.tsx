// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

// [...slug] is a catch-all segment, matching one or more path segments
// after /docs/, bound together as an array. /docs/a matches with
// slug = ["a"], /docs/a/b/c matches with slug = ["a", "b", "c"]. Visiting
// /docs itself (zero segments) does not match this file at all, a catch-all
// requires at least one segment (confirmed in the Notes).

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;

  return (
    <main>
      <h1>Docs</h1>
      <p>Segments: {slug.join(' / ')}</p>
    </main>
  );
}

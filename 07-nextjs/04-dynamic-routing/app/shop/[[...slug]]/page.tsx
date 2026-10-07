// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

// [[...slug]], with the extra pair of brackets, is an optional catch-all.
// It behaves exactly like [...slug], except it also matches zero segments,
// so /shop itself matches this file too, with slug left undefined, not
// just /shop/a or /shop/a/b (confirmed in the Notes).

export default async function ShopPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;

  return (
    <main>
      <h1>Shop</h1>
      <p>
        Segments: {slug ? slug.join(' / ') : '(none, this is the shop root)'}
      </p>
    </main>
  );
}

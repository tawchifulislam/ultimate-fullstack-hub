// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

// [id] in the folder name is a dynamic segment. Visiting /products/1 or
// /products/42 both match this file, with "id" bound to whatever text was
// actually in that position of the URL.

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // params is a Promise in this version of Next.js, it must be awaited
  // before reading id. Reading params.id directly, without awaiting, does
  // not error, it silently renders an empty value instead (confirmed in the
  // Notes), which is a more dangerous mistake than a loud one.
  const { id } = await params;

  return (
    <main>
      <h1>Product {id}</h1>
    </main>
  );
}

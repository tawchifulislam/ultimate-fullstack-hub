// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

import { headers } from 'next/headers';

// Reading headers() (or cookies(), or a searchParams prop) is request-
// specific information that cannot be known at build time, so this page
// forces Next.js to render it fresh on every single request instead,
// this is dynamic rendering (SSR).

export default async function DynamicPage() {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') ?? 'unknown';
  const renderedAt = Date.now();

  return (
    <main>
      <h1>Dynamic page</h1>
      <p>Rendered at: {renderedAt}</p>
      <p>User agent length: {userAgent.length}</p>
    </main>
  );
}

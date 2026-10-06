// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

import { getMaskedSecret } from './lib/secret-data';

export default function HomePage() {
  const masked = getMaskedSecret();
  return (
    <main>
      <h1>Home</h1>
      <p>API key on file: {masked}</p>
    </main>
  );
}

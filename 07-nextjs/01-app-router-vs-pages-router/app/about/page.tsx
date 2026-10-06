// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

'use client';

// "use client" is required here because useState only works in a Client
// Component. Without this directive, the build fails (see the Notes for the
// exact error message).

import { useState } from 'react';

export default function AboutPage() {
  const [clicks, setClicks] = useState(0);

  return (
    <main>
      <h1>About (App Router, Client Component)</h1>
      <p>CLIENT_COMPONENT_MARKER_VALUE</p>
      <button onClick={() => setClicks(c => c + 1)}>
        Clicked {clicks} times
      </button>
    </main>
  );
}

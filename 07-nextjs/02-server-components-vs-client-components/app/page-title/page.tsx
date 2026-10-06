// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

'use client';

import { useEffect, useState } from 'react';
import { getPageTitleFromDocument } from '../client-lib/browser-fact';

// "use client" is required here because getPageTitleFromDocument reads
// document, and because the read happens inside useEffect, only after the
// component has mounted in a real browser, never during server rendering.

export default function PageTitlePage() {
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    setTitle(getPageTitleFromDocument());
  }, []);

  return (
    <main>
      <h1>Page title reader</h1>
      <p>Page title: {title ?? '(not read yet)'}</p>
    </main>
  );
}

// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

'use client';

import type { ReactNode } from 'react';

// An ordinary, reusable Client Component. Its onClick prop works fine as
// long as the function handed to it was created in a Client Component, the
// way Disclosure creates its own toggle function. A Server Component
// handing this an inline function directly is a different story, covered in
// the Notes.

export default function ClientButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return <button onClick={onClick}>{children}</button>;
}

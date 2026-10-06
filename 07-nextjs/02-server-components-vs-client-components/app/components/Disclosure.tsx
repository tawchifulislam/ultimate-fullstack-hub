// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import ClientButton from './ClientButton';

// A Client Component that only owns the interactive toggle. It knows
// nothing about what is inside it, "children" can be anything, including a
// Server Component that was already rendered on the server before this
// component ever saw it. Its toggle function is defined right here, in a
// Client Component, which is why handing it to ClientButton works fine.

export default function Disclosure({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <ClientButton onClick={() => setOpen(value => !value)}>
        {open ? 'Hide details' : 'Show details'}
      </ClientButton>
      {open && <div data-testid="disclosure-body">{children}</div>}
    </div>
  );
}

// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

'use client';

import { useState } from 'react';
import Link from 'next/link';

// A small, reusable interactive counter with two links. Used inside both a
// layout and a template to compare what navigating between the two links
// does to this component's state.

export default function VisitCounter({
  label,
  firstHref,
  firstLabel,
  secondHref,
  secondLabel,
}: {
  label: string;
  firstHref: string;
  firstLabel: string;
  secondHref: string;
  secondLabel: string;
}) {
  const [count, setCount] = useState(0);

  return (
    <nav>
      <p>
        {label}: {count}
      </p>
      <button onClick={() => setCount(value => value + 1)}>Increment</button>
      <Link href={firstHref}>{firstLabel}</Link>
      {' | '}
      <Link href={secondHref}>{secondLabel}</Link>
    </nav>
  );
}

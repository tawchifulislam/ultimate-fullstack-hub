// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

import Disclosure from '../components/Disclosure';
import ServerFact from '../components/ServerFact';

// This page is itself a Server Component. It renders ServerFact (another
// Server Component) as the children of Disclosure (a Client Component).
// Disclosure never imports ServerFact, it only receives already-rendered
// output through its "children" prop, so no Server-Component-into-Client-
// Component import ever actually happens.

export default function CompositionDemoPage() {
  return (
    <main>
      <h1>Composition demo</h1>
      <Disclosure>
        <ServerFact />
      </Disclosure>
    </main>
  );
}

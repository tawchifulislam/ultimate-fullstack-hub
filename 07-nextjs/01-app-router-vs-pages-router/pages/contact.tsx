// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

// This file lives under pages/, not app/, so it uses the Pages Router.
// There is no Server/Client Component split here at all, no "use client" is
// needed to use useState, every Pages Router component works this way.

import { useState } from 'react';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <main>
      <h1>Contact (Pages Router)</h1>
      <button onClick={() => setSent(true)}>Send</button>
      {sent && <p>Message sent.</p>}
    </main>
  );
}

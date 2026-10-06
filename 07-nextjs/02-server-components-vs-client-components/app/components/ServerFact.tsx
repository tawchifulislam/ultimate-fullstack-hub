// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

import { getMaskedSecret } from '../lib/secret-data';

// An ordinary Server Component, no "use client" here. It directly uses the
// server-only secret helper, something it is only allowed to do because
// nothing marks it (or anything importing it directly) as a Client
// Component.

export default function ServerFact() {
  return <p>SERVER_FACT_MARKER key on file: {getMaskedSecret()}</p>;
}

// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: the "server-only" package and its type definitions are not
// installed in this learning resource.

import 'server-only';

// This "secret" stands in for something that must never reach the browser,
// a database credential, an internal API key, and so on. The "server-only"
// import above is what actually enforces that, not just good intentions.

const API_SECRET = 'sk_live_51AbCdEfGh';

export function getMaskedSecret(): string {
  return API_SECRET.slice(0, 7) + '...';
}

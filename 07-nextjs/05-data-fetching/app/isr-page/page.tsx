// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

// revalidate tells Next.js to keep serving the statically generated page
// for at least this many seconds before regenerating it in the background.
// Regeneration is triggered by a request, not a timer, so the exact moment
// it happens depends on when a request actually arrives after the window
// has passed (confirmed in the Notes).

export const revalidate = 5;

export default function IsrPage() {
  const renderedAt = Date.now();
  return (
    <main>
      <h1>ISR page</h1>
      <p>Rendered at: {renderedAt}</p>
    </main>
  );
}

// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

// This is a Server Component: it runs only on the server, so it CAN read
// a server-only variable like API_SECRET_KEY. But its rendered output is
// still HTML sent to the browser, so the raw secret is never printed here,
// only a boolean derived from it.
export default function HomePage() {
  const hasSecret = Boolean(process.env.API_SECRET_KEY);

  return (
    <main>
      <h1>{process.env.NEXT_PUBLIC_SITE_NAME}</h1>
      <p id="has-secret">Server can see API_SECRET_KEY: {String(hasSecret)}</p>
    </main>
  );
}

// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

// This is a Server Component by default, no "use client" directive needed.
// It can be an async function and await data directly in the component body,
// something a Client Component is never allowed to do.

async function fetchDashboardTotalsFromSecretServerOnlyModule(): Promise<number> {
  // In a real app this would be a database query or an internal API call.
  // The function name itself is used in the Notes to prove this code never
  // reaches the browser's JavaScript bundle.
  return 42;
}

export default async function HomePage() {
  const total = await fetchDashboardTotalsFromSecretServerOnlyModule();

  return (
    <main>
      <h1>Home (App Router)</h1>
      <p>Dashboard total: {total}</p>
    </main>
  );
}

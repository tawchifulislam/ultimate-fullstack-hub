// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

import VisitCounter from '../components/VisitCounter';

// A nested layout. It only wraps routes under app/dashboard/, the root
// layout still wraps this layout in turn, layouts nest rather than replace
// each other. This one is never re-created while navigating between
// /dashboard and /dashboard/settings, which is the whole point of a layout
// instead of a template (see template-demo for the contrast).

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <p>DASHBOARD-LAYOUT-MARKER</p>
      <VisitCounter
        label="Layout count"
        firstHref="/dashboard"
        firstLabel="Dashboard"
        secondHref="/dashboard/settings"
        secondLabel="Settings"
      />
      {children}
    </div>
  );
}

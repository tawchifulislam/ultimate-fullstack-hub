// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

import VisitCounter from '../components/VisitCounter';

// A template, not a layout. It wraps the same kind of nested routes a
// layout would (this page and its "other" sibling), but Next.js creates a
// fresh instance of it on every navigation, state inside it does not
// survive moving between /template-demo and /template-demo/other, unlike
// DashboardLayout's counter.

export default function TemplateDemoTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <p>TEMPLATE-DEMO-MARKER</p>
      <VisitCounter
        label="Template count"
        firstHref="/template-demo"
        firstLabel="Template demo"
        secondHref="/template-demo/other"
        secondLabel="Other"
      />
      {children}
    </div>
  );
}

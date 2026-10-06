// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: the "client-only" package and its type definitions are not
// installed in this learning resource.

import 'client-only';

// document only exists in a browser. The "client-only" import above turns a
// confusing runtime crash ("document is not defined") into a clear build
// error if this ever gets pulled into server-rendered code.

export function getPageTitleFromDocument(): string {
  return document.title;
}

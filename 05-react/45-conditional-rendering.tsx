// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React packages are not installed in this learning resource.

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// 1. Early return (if/else before the JSX)
// Handling each case as an early return keeps the main JSX simple, this
// avoids a deeply nested ternary once there is more than one condition.
interface StatusProps {
  isLoading: boolean;
  data: string | null;
}

function Status({ isLoading, data }: StatusProps) {
  if (isLoading) {
    return <p>Loading...</p>;
  }
  if (data === null) {
    return <p>No data available.</p>;
  }
  return <p>Data: {data}</p>;
}

// 2. Ternary operator inside JSX
// Good for choosing between exactly two small pieces of JSX, inline.
function AuthButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  return <button>{isLoggedIn ? 'Log out' : 'Log in'}</button>;
}

// 3. Logical && operator
// Good for "render this, or render nothing at all". JavaScript's && returns
// its second operand only when the first is truthy, otherwise it returns
// the falsy first operand, which React then renders as nothing (for false,
// null, or undefined specifically).
function NotificationBadge({ count }: { count: number }) {
  return (
    <div>
      Inbox
      {count > 0 && <span className="badge">{count}</span>}
    </div>
  );
}

// 4. A common pitfall: using && directly with a number that can be 0.
// JSX renders numbers as visible text. When "count" is 0, "count && X"
// evaluates to 0, not false, so React renders the literal text "0" instead
// of rendering nothing. Always compare to produce an actual boolean
// (count > 0), rather than relying on the number's own truthiness.
function BrokenBadge({ count }: { count: number }) {
  return (
    <div>
      Inbox
      {count && <span className="badge">{count}</span>}
    </div>
  );
}

// 5. Returning null renders nothing at all, not even an empty element.
function Tooltip({ message }: { message: string | null }) {
  if (message === null) {
    return null;
  }
  return <div className="tooltip">{message}</div>;
}

// --- Demonstrations ---
console.log('--- Status: loading ---');
console.log(renderToStaticMarkup(<Status isLoading={true} data={null} />));

console.log('\n--- Status: loaded with data ---');
console.log(renderToStaticMarkup(<Status isLoading={false} data="42 users" />));

console.log('\n--- AuthButton: logged out ---');
console.log(renderToStaticMarkup(<AuthButton isLoggedIn={false} />));

console.log('\n--- AuthButton: logged in ---');
console.log(renderToStaticMarkup(<AuthButton isLoggedIn={true} />));

console.log('\n--- NotificationBadge: count=3 (uses count > 0, correct) ---');
console.log(renderToStaticMarkup(<NotificationBadge count={3} />));

console.log(
  '\n--- NotificationBadge: count=0 (uses count > 0, renders nothing extra) ---',
);
console.log(renderToStaticMarkup(<NotificationBadge count={0} />));

console.log(
  "\n--- BrokenBadge: count=0 (the pitfall, a stray '0' appears) ---",
);
console.log(renderToStaticMarkup(<BrokenBadge count={0} />));

console.log(
  '\n--- Tooltip: message=null (renders nothing, empty string output) ---',
);
console.log(`"${renderToStaticMarkup(<Tooltip message={null} />)}"`);

console.log('\n--- Tooltip: message set ---');
console.log(renderToStaticMarkup(<Tooltip message="Click to copy" />));

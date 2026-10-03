// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React packages are not installed in this learning resource.

import { JSDOM } from 'jsdom';

// React's rendering functions need real DOM globals (document, window) to
// exist before they are used. Outside a browser, here in a plain Node
// script, jsdom provides a fake but fully functional DOM for this purpose.
const dom = new JSDOM('<!doctype html><div id="root"></div>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});
// Tells React this script is a controlled test-like environment, so the
// "not configured to support act()" warning is not printed below.
(global as any).IS_REACT_ACT_ENVIRONMENT = true;

import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

// --- Demo 1: re-rendering with the same element type reuses the DOM node ---
// React does not throw away and rebuild the real DOM on every render. It
// builds a new Virtual DOM tree (a lightweight description of the UI),
// compares it against the previous one (this comparison is "reconciliation"),
// and only touches the real DOM where something actually changed.

interface ClockProps {
  time: string;
}

function Clock({ time }: ClockProps) {
  return (
    <div>
      <h1>Current time</h1>
      <span id="time-display">{time}</span>
    </div>
  );
}

const container = document.getElementById('root') as HTMLDivElement;
const root = createRoot(container);

act(() => {
  root.render(<Clock time="10:00:00" />);
});
const spanBeforeUpdate = document.getElementById('time-display');
console.log('Initial text:', spanBeforeUpdate?.textContent);

act(() => {
  root.render(<Clock time="10:00:01" />);
});
const spanAfterUpdate = document.getElementById('time-display');
console.log('Updated text:', spanAfterUpdate?.textContent);
console.log(
  'Same <span> DOM node reused across the update:',
  spanBeforeUpdate === spanAfterUpdate,
);

// --- Demo 2: changing the element type at the same position replaces the node ---
// Reconciliation's core rule: if an element at a given position is the same
// type across renders (both <span>, or both the same component function),
// React keeps the underlying DOM node and updates only what changed. If the
// type is different (a <span> becomes a <p>, or one component is swapped for
// another), React cannot safely reuse it, it tears down the old node and
// builds a brand new one in its place.

function Message({ urgent }: { urgent: boolean }) {
  return urgent ? (
    <span id="message">Warning!</span>
  ) : (
    <p id="message">All good.</p>
  );
}

act(() => {
  root.render(<Message urgent={false} />);
});
const messageAsParagraph = document.getElementById('message');
console.log('\nFirst render tag name:', messageAsParagraph?.tagName);

act(() => {
  root.render(<Message urgent={true} />);
});
const messageAsSpan = document.getElementById('message');
console.log('Second render tag name:', messageAsSpan?.tagName);
console.log(
  'Same DOM node kept after the type changed:',
  messageAsParagraph === messageAsSpan,
);

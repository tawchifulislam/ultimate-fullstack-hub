// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React packages are not installed in this learning resource.

import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="root"></div>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});
(global as any).IS_REACT_ACT_ENVIRONMENT = true;

import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

function renderInNewContainer(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return { container, root };
}

// --- 1. Containment: a generic wrapper that renders whatever is put inside it ---
// React favors composition over inheritance for reuse: instead of a base
// "Card" class that subclasses customize, one Card component accepts
// "children" and stays completely unaware of what it is wrapping.

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="card-body">{children}</div>
    </div>
  );
}

console.log('--- Card wrapping a paragraph ---');
console.log(
  renderToStaticMarkup(
    <Card title="Welcome">
      <p>Thanks for signing up.</p>
    </Card>,
  ),
);

console.log('\n--- The same Card wrapping a completely different list ---');
console.log(
  renderToStaticMarkup(
    <Card title="Shopping List">
      <ul>
        <li>Milk</li>
        <li>Eggs</li>
      </ul>
    </Card>,
  ),
);

// --- 2. Specialization: a specific component built from a generic one ---
// Rather than a Dialog base class with a ConfirmDialog subclass overriding
// behavior, ConfirmDialog is simply a Dialog, used with specific content.
// It composes Dialog instead of inheriting from it.

function Dialog({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dialog">
      <h2>{title}</h2>
      <div className="dialog-body">{children}</div>
    </div>
  );
}

function ConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog title="Please confirm">
      <p>Are you sure you want to continue?</p>
      <button onClick={onConfirm}>Yes</button>
      <button onClick={onCancel}>No</button>
    </Dialog>
  );
}

let confirmed = false;
let cancelled = false;
const confirmDialog = renderInNewContainer(
  <ConfirmDialog
    onConfirm={() => (confirmed = true)}
    onCancel={() => (cancelled = true)}
  />,
);

console.log('\n--- ConfirmDialog structure (a specialized Dialog) ---');
console.log(confirmDialog.container.querySelector('.dialog h2')?.textContent);
console.log(
  confirmDialog.container.querySelector('.dialog-body p')?.textContent,
);

const buttons = confirmDialog.container.querySelectorAll('button');
act(() => {
  (buttons[0] as HTMLButtonElement).click();
});
console.log(
  'Clicked Yes, onConfirm called:',
  confirmed,
  '| onCancel called:',
  cancelled,
);

// --- 3. Slots: passing JSX through named props instead of just "children" ---
// A component can accept more than one "hole" to fill, each as its own
// prop holding JSX, when there is more than one distinct region to compose.
// This avoids threading layout data through a component that only cares
// about arranging content, not what that content actually is.

function SplitPane({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="split-pane">
      <div className="pane-left">{left}</div>
      <div className="pane-right">{right}</div>
    </div>
  );
}

function Sidebar() {
  return <nav>Links go here</nav>;
}

function MainContent() {
  return <article>Page content goes here</article>;
}

console.log('\n--- SplitPane composed from two unrelated components ---');
console.log(
  renderToStaticMarkup(
    <SplitPane left={<Sidebar />} right={<MainContent />} />,
  ),
);

// SplitPane never imported or knew about Sidebar or MainContent, it only
// knows it has a "left" slot and a "right" slot to render, whatever JSX is
// handed to it. The same SplitPane works for entirely different pages.
console.log('\n--- The same SplitPane reused with different content ---');
console.log(
  renderToStaticMarkup(
    <SplitPane left={<p>Filters</p>} right={<p>Search results</p>} />,
  ),
);

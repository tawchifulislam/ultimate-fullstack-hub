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

import React, { useRef, useState, useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

function renderInNewContainer(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return { container, root };
}

// --- 1. Accessing a DOM node directly ---
// Passing a ref created with useRef to an element's "ref" attribute gives
// direct access to the real DOM node, through ref.current, after React has
// committed it. This is how imperative actions a browser API requires
// (focusing, measuring, scrolling) get done from React code.

function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return <input ref={inputRef} />;
}

const focusDemo = renderInNewContainer(<AutoFocusInput />);
console.log(
  'Input is focused after mount:',
  dom.window.document.activeElement ===
    focusDemo.container.querySelector('input'),
);

// --- 2. A ref persists across renders, without causing one ---
// Unlike useState, changing ref.current does not schedule a re-render, and
// it is applied immediately, not on the next render. A ref is for values a
// component needs to remember, but that have no business being reflected
// in the UI on their own.

let clickDemoRenderCount = 0;
let capturedClickRef: { current: number } | null = null;

function ClickTracker() {
  clickDemoRenderCount++;
  const clickCountRef = useRef(0);
  capturedClickRef = clickCountRef; // exposed only so this demo can inspect it
  return (
    <button
      onClick={() => {
        clickCountRef.current++;
      }}
    >
      Click
    </button>
  );
}

const clickDemo = renderInNewContainer(<ClickTracker />);
console.log('\nRender count after mount:', clickDemoRenderCount);
act(() => {
  (clickDemo.container.querySelector('button') as HTMLButtonElement).click();
});
act(() => {
  (clickDemo.container.querySelector('button') as HTMLButtonElement).click();
});
act(() => {
  (clickDemo.container.querySelector('button') as HTMLButtonElement).click();
});
console.log(
  "Render count after 3 clicks (unchanged, refs don't trigger renders):",
  clickDemoRenderCount,
);
console.log(
  'ref.current after 3 clicks (updated immediately regardless):',
  capturedClickRef!.current,
);

// --- 3. The pitfall: a ref cannot drive what is displayed ---
// Since changing ref.current does not cause a re-render, displaying
// ref.current directly in JSX shows a stale value, it only catches up the
// next time the component re-renders for some unrelated reason.

function BrokenDisplay() {
  const countRef = useRef(0);
  const [, forceRerender] = useState(0);
  return (
    <div>
      <span data-testid="count">{countRef.current}</span>
      <button
        data-testid="increment"
        onClick={() => {
          countRef.current++;
        }}
      >
        Increment
      </button>
      <button data-testid="force" onClick={() => forceRerender(n => n + 1)}>
        Force rerender
      </button>
    </div>
  );
}

const broken = renderInNewContainer(<BrokenDisplay />);
act(() => {
  (
    broken.container.querySelector(
      '[data-testid="increment"]',
    ) as HTMLButtonElement
  ).click();
});
act(() => {
  (
    broken.container.querySelector(
      '[data-testid="increment"]',
    ) as HTMLButtonElement
  ).click();
});
act(() => {
  (
    broken.container.querySelector(
      '[data-testid="increment"]',
    ) as HTMLButtonElement
  ).click();
});
console.log(
  '\nDisplayed count after 3 clicks on the ref (stale, still shows 0):',
  broken.container.querySelector('[data-testid="count"]')?.textContent,
);

act(() => {
  (
    broken.container.querySelector('[data-testid="force"]') as HTMLButtonElement
  ).click();
});
console.log(
  'Displayed count after an unrelated forced rerender (now catches up to 3):',
  broken.container.querySelector('[data-testid="count"]')?.textContent,
);

// --- 4. A legitimate use for a value that changes on every render: tracking "previous" ---
// A ref updated inside an effect (which runs after the render, and after
// the DOM reflects the current render) correctly lags one render behind,
// which is exactly what is needed to compare "current" against "previous".

function PreviousValueDemo({ value }: { value: number }) {
  const prevValueRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    prevValueRef.current = value;
  });
  return (
    <div data-testid="values">
      Current: {value}, Previous: {prevValueRef.current ?? 'none'}
    </div>
  );
}

const prevContainer = document.createElement('div');
document.body.appendChild(prevContainer);
const prevRoot = createRoot(prevContainer);

act(() => {
  prevRoot.render(<PreviousValueDemo value={1} />);
});
console.log(
  '\nFirst render (value=1):',
  prevContainer.querySelector('[data-testid="values"]')?.textContent,
);

act(() => {
  prevRoot.render(<PreviousValueDemo value={2} />);
});
console.log(
  'Second render (value=2):',
  prevContainer.querySelector('[data-testid="values"]')?.textContent,
);

act(() => {
  prevRoot.render(<PreviousValueDemo value={3} />);
});
console.log(
  'Third render (value=3):',
  prevContainer.querySelector('[data-testid="values"]')?.textContent,
);

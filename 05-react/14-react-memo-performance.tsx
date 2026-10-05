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

import React, { useState, memo } from 'react';
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

// --- 1. The default: a child re-renders whenever its parent does ---
// By default, React re-renders every child whenever its parent renders,
// regardless of whether that child's own props actually changed. This is
// usually fine, most components are cheap to re-render, it only becomes
// worth addressing for a component that is expensive to re-render often.

let plainRenders = 0;
function PlainChild({ label }: { label: string }) {
  plainRenders++;
  return <span>{label}</span>;
}

function PlainParent() {
  const [tick, setTick] = useState(0);
  return (
    <div>
      <button data-testid="tick" onClick={() => setTick(t => t + 1)}>
        Tick: {tick}
      </button>
      <PlainChild label="fixed" />
    </div>
  );
}

const plain = renderInNewContainer(<PlainParent />);
console.log('Plain child renders after mount:', plainRenders);
act(() => {
  (
    plain.container.querySelector('[data-testid="tick"]') as HTMLButtonElement
  ).click();
});
act(() => {
  (
    plain.container.querySelector('[data-testid="tick"]') as HTMLButtonElement
  ).click();
});
console.log(
  'Plain child renders after 2 unrelated ticks (label never changed):',
  plainRenders,
);

// --- 2. React.memo: skip re-rendering when props are shallowly equal ---
// memo(Component) compares each prop to its previous value with the same
// comparison React itself uses for state (Object.is), and skips rendering
// the component again if every prop is equal.

let memoRenders = 0;
const MemoChild = memo(function MemoChild({ label }: { label: string }) {
  memoRenders++;
  return <span>{label}</span>;
});

function MemoParent() {
  const [tick, setTick] = useState(0);
  return (
    <div>
      <button data-testid="tick" onClick={() => setTick(t => t + 1)}>
        Tick: {tick}
      </button>
      <MemoChild label="fixed" />
    </div>
  );
}

const memoized = renderInNewContainer(<MemoParent />);
console.log('\nMemo child renders after mount:', memoRenders);
act(() => {
  (
    memoized.container.querySelector(
      '[data-testid="tick"]',
    ) as HTMLButtonElement
  ).click();
});
act(() => {
  (
    memoized.container.querySelector(
      '[data-testid="tick"]',
    ) as HTMLButtonElement
  ).click();
});
console.log(
  'Memo child renders after 2 unrelated ticks (same prop value, skipped):',
  memoRenders,
);

// --- 3. A gotcha: JSX passed as "children" is a new value every render too ---
// "children" is just another prop. JSX written inline between a component's
// tags is re-created as a new element on every render of whichever
// component wrote it, so wrapping a component in memo does not help if what
// changes every render is the children passed into it.

let childrenMemoRenders = 0;
const MemoWithChildren = memo(function MemoWithChildren({
  children,
}: {
  children: React.ReactNode;
}) {
  childrenMemoRenders++;
  return <div>{children}</div>;
});

function ParentPassingChildren() {
  const [tick, setTick] = useState(0);
  return (
    <div>
      <button data-testid="tick" onClick={() => setTick(t => t + 1)}>
        Tick: {tick}
      </button>
      <MemoWithChildren>
        <span>static content</span>
      </MemoWithChildren>
    </div>
  );
}

const withChildren = renderInNewContainer(<ParentPassingChildren />);
console.log('\nMemoWithChildren renders after mount:', childrenMemoRenders);
act(() => {
  (
    withChildren.container.querySelector(
      '[data-testid="tick"]',
    ) as HTMLButtonElement
  ).click();
});
act(() => {
  (
    withChildren.container.querySelector(
      '[data-testid="tick"]',
    ) as HTMLButtonElement
  ).click();
});
console.log(
  'MemoWithChildren renders after 2 unrelated ticks (new children element each time, memo cannot help):',
  childrenMemoRenders,
);

// --- 4. A custom comparison function, for when shallow equality is too strict ---
// memo's optional second argument replaces the default shallow comparison.
// This is useful when a prop is an object whose VALUES, not reference,
// are what actually matter, but it should be reached for sparingly: a
// comparison function that itself does expensive work can cost more than
// the re-render it was meant to prevent.

interface Point {
  x: number;
  y: number;
}

let defaultCompareRenders = 0;
const DefaultCompare = memo(function DefaultCompare({
  point,
}: {
  point: Point;
}) {
  defaultCompareRenders++;
  return (
    <span>
      {point.x},{point.y}
    </span>
  );
});

function DefaultCompareParent() {
  const [tick, setTick] = useState(0);
  return (
    <div>
      <button data-testid="tick" onClick={() => setTick(t => t + 1)}>
        Tick: {tick}
      </button>
      {/* A brand new object with identical values, on every render. */}
      <DefaultCompare point={{ x: 1, y: 2 }} />
    </div>
  );
}

const def = renderInNewContainer(<DefaultCompareParent />);
console.log(
  '\nDefault shallow comparison renders after mount:',
  defaultCompareRenders,
);
act(() => {
  (
    def.container.querySelector('[data-testid="tick"]') as HTMLButtonElement
  ).click();
});
act(() => {
  (
    def.container.querySelector('[data-testid="tick"]') as HTMLButtonElement
  ).click();
});
console.log(
  'Default shallow comparison renders after 2 ticks (same values, new object, still re-renders):',
  defaultCompareRenders,
);

let customCompareRenders = 0;
const CustomCompare = memo(
  function CustomCompare({ point }: { point: Point }) {
    customCompareRenders++;
    return (
      <span>
        {point.x},{point.y}
      </span>
    );
  },
  (prevProps, nextProps) =>
    prevProps.point.x === nextProps.point.x &&
    prevProps.point.y === nextProps.point.y,
);

function CustomCompareParent() {
  const [tick, setTick] = useState(0);
  return (
    <div>
      <button data-testid="tick" onClick={() => setTick(t => t + 1)}>
        Tick: {tick}
      </button>
      <CustomCompare point={{ x: 1, y: 2 }} />
    </div>
  );
}

const custom = renderInNewContainer(<CustomCompareParent />);
console.log('\nCustom comparison renders after mount:', customCompareRenders);
act(() => {
  (
    custom.container.querySelector('[data-testid="tick"]') as HTMLButtonElement
  ).click();
});
act(() => {
  (
    custom.container.querySelector('[data-testid="tick"]') as HTMLButtonElement
  ).click();
});
console.log(
  'Custom comparison renders after 2 ticks (compares actual x/y values, correctly skipped):',
  customCompareRenders,
);

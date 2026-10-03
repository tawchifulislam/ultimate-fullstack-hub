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

import React, { useState } from 'react';
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

// --- Demo 1: state persists across renders, setState triggers a re-render ---
// A plain local variable resets to its initial value on every call to the
// component function. useState gives a component a value that React
// remembers between renders, and calling its setter both updates that
// value and schedules the component to render again.

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}

const counter = renderInNewContainer(<Counter />);
act(() => {
  (counter.container.querySelector('button') as HTMLButtonElement).click();
});
console.log(
  'Counter after one click:',
  counter.container.querySelector('[data-testid="count"]')?.textContent,
);

// --- Demo 2: stale closures, and the functional-update fix ---
// Inside one call to handleClick, "count" is a fixed value captured from
// the render that created this handler. Calling setCount(count + 1) three
// times in a row computes the same "count + 1" three times, it does not
// see its own previous calls, so the state only ends up one higher, not
// three higher.

function TripleIncrementBroken() {
  const [count, setCount] = useState(0);
  function handleClick() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={handleClick}>+3 (broken)</button>
    </div>
  );
}

// Passing a function to the setter instead ("prev => prev + 1") fixes this:
// React guarantees each queued update function is called with the result
// of the one before it, so all three updates are applied in sequence.
function TripleIncrementFixed() {
  const [count, setCount] = useState(0);
  function handleClick() {
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
  }
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={handleClick}>+3 (fixed)</button>
    </div>
  );
}

const broken = renderInNewContainer(<TripleIncrementBroken />);
act(() => {
  (broken.container.querySelector('button') as HTMLButtonElement).click();
});
console.log(
  '\nBroken version after one click meant to add 3:',
  broken.container.querySelector('[data-testid="count"]')?.textContent,
);

const fixed = renderInNewContainer(<TripleIncrementFixed />);
act(() => {
  (fixed.container.querySelector('button') as HTMLButtonElement).click();
});
console.log(
  'Fixed version after one click meant to add 3:',
  fixed.container.querySelector('[data-testid="count"]')?.textContent,
);

// --- Demo 3: never mutate state directly ---
// React decides whether to re-render by comparing the new state value to
// the old one. For objects and arrays that comparison is by reference, so
// mutating the existing array and passing that same reference back to the
// setter looks like "no change" to React, nothing re-renders.

function BrokenList() {
  const [items, setItems] = useState<string[]>(['a', 'b']);
  function addItem() {
    items.push('c'); // mutates the existing array in place
    setItems(items); // same reference as before, React sees no change
  }
  return (
    <div>
      <span data-testid="items">{items.join(',')}</span>
      <button onClick={addItem}>Add (broken)</button>
    </div>
  );
}

function FixedList() {
  const [items, setItems] = useState<string[]>(['a', 'b']);
  function addItem() {
    setItems([...items, 'c']); // a new array, a new reference
  }
  return (
    <div>
      <span data-testid="items">{items.join(',')}</span>
      <button onClick={addItem}>Add (fixed)</button>
    </div>
  );
}

const brokenList = renderInNewContainer(<BrokenList />);
act(() => {
  (brokenList.container.querySelector('button') as HTMLButtonElement).click();
});
console.log(
  '\nBroken list after adding an item (mutated in place):',
  brokenList.container.querySelector('[data-testid="items"]')?.textContent,
);

const fixedList = renderInNewContainer(<FixedList />);
act(() => {
  (fixedList.container.querySelector('button') as HTMLButtonElement).click();
});
console.log(
  'Fixed list after adding an item (new array):',
  fixedList.container.querySelector('[data-testid="items"]')?.textContent,
);

// --- Demo 4: lazy initial state ---
// useState(someExpensiveCall()) runs someExpensiveCall() on every single
// render, even though React only uses its result on the very first one.
// useState(() => someExpensiveCall()) passes a function instead, React
// only calls that function once, on mount.

let eagerCallCount = 0;
function computeEager() {
  eagerCallCount++;
  return 42;
}

function EagerInit() {
  const [value] = useState(computeEager());
  const [, forceRerender] = useState(0);
  return (
    <button onClick={() => forceRerender(n => n + 1)}>
      Rerender ({value})
    </button>
  );
}

let lazyCallCount = 0;
function computeLazy() {
  lazyCallCount++;
  return 42;
}

function LazyInit() {
  const [value] = useState(() => computeLazy());
  const [, forceRerender] = useState(0);
  return (
    <button onClick={() => forceRerender(n => n + 1)}>
      Rerender ({value})
    </button>
  );
}

const eager = renderInNewContainer(<EagerInit />);
const lazy = renderInNewContainer(<LazyInit />);

// Force two more renders on each, unrelated to the initial value itself.
for (let i = 0; i < 2; i++) {
  act(() => {
    (eager.container.querySelector('button') as HTMLButtonElement).click();
  });
  act(() => {
    (lazy.container.querySelector('button') as HTMLButtonElement).click();
  });
}

console.log('\nAfter mount plus 2 forced rerenders on each:');
console.log('computeEager() calls (runs every render):', eagerCallCount);
console.log('computeLazy() calls (runs once, on mount):', lazyCallCount);

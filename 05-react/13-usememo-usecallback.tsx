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

import React, { useState, useMemo, useCallback, memo } from 'react';
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

// --- 1. useMemo: skip recomputing a value when its inputs have not changed ---
// Without useMemo, an expensive calculation re-runs on every render of the
// component, even when the render was caused by something unrelated to
// that calculation's own inputs.

let withoutMemoCalls = 0;
function expensiveWithout(n: number) {
  withoutMemoCalls++;
  let result = 0;
  for (let i = 0; i < 1000; i++) result += i * n;
  return result;
}

function WithoutMemo({ n, tick }: { n: number; tick: number }) {
  const result = expensiveWithout(n);
  return (
    <div>
      {result} (tick {tick})
    </div>
  );
}

const withoutContainer = document.createElement('div');
document.body.appendChild(withoutContainer);
const withoutRoot = createRoot(withoutContainer);
act(() => {
  withoutRoot.render(<WithoutMemo n={2} tick={0} />);
});
act(() => {
  withoutRoot.render(<WithoutMemo n={2} tick={1} />); // n is unchanged
});
act(() => {
  withoutRoot.render(<WithoutMemo n={2} tick={2} />); // n is still unchanged
});
console.log(
  'Without useMemo, calls after mount + 2 unrelated re-renders (n never changed):',
  withoutMemoCalls,
);

// useMemo(calculation, deps) only re-runs "calculation" when a value in
// "deps" is different from the previous render, an unrelated re-render
// just reuses the previously computed result.
let withMemoCalls = 0;
function expensiveWith(n: number) {
  withMemoCalls++;
  let result = 0;
  for (let i = 0; i < 1000; i++) result += i * n;
  return result;
}

function WithMemo({ n, tick }: { n: number; tick: number }) {
  const result = useMemo(() => expensiveWith(n), [n]);
  return (
    <div>
      {result} (tick {tick})
    </div>
  );
}

const withContainer = document.createElement('div');
document.body.appendChild(withContainer);
const withRoot = createRoot(withContainer);
act(() => {
  withRoot.render(<WithMemo n={2} tick={0} />);
});
act(() => {
  withRoot.render(<WithMemo n={2} tick={1} />);
});
act(() => {
  withRoot.render(<WithMemo n={2} tick={2} />);
});
console.log(
  'With useMemo, calls after mount + 2 unrelated re-renders (n never changed):',
  withMemoCalls,
);
act(() => {
  withRoot.render(<WithMemo n={3} tick={2} />); // n actually changes now
});
console.log('With useMemo, calls after n actually changes:', withMemoCalls);

// --- 2. useCallback: keep a function's identity stable across renders ---
// A function defined directly inside a component body is a new function,
// with a new identity, on every single render, even if its code never
// changes. useCallback(fn, deps) returns the same function reference
// across renders as long as deps have not changed.

const capturedWithout: Array<() => void> = [];
function WithoutCallback({ tick }: { tick: number }) {
  const handleClick = () => {};
  capturedWithout.push(handleClick);
  return <button onClick={handleClick}>{tick}</button>;
}
const withoutCbContainer = document.createElement('div');
document.body.appendChild(withoutCbContainer);
const withoutCbRoot = createRoot(withoutCbContainer);
act(() => {
  withoutCbRoot.render(<WithoutCallback tick={0} />);
});
act(() => {
  withoutCbRoot.render(<WithoutCallback tick={1} />);
});
console.log(
  '\nWithout useCallback, same function reference across renders:',
  capturedWithout[0] === capturedWithout[1],
);

const capturedWith: Array<() => void> = [];
function WithCallback({ tick }: { tick: number }) {
  const handleClick = useCallback(() => {}, []);
  capturedWith.push(handleClick);
  return <button onClick={handleClick}>{tick}</button>;
}
const withCbContainer = document.createElement('div');
document.body.appendChild(withCbContainer);
const withCbRoot = createRoot(withCbContainer);
act(() => {
  withCbRoot.render(<WithCallback tick={0} />);
});
act(() => {
  withCbRoot.render(<WithCallback tick={1} />);
});
console.log(
  'With useCallback ([] deps), same function reference across renders:',
  capturedWith[0] === capturedWith[1],
);

// --- 3. Why identity matters in practice: avoiding a child's wasted re-render ---
// React.memo (covered in full in the next topic) skips re-rendering a
// component when its props are unchanged. A function prop re-created every
// render defeats that, since it looks like a "changed" prop every time,
// even though it does the same thing.

let badChildRenders = 0;
const BadChild = memo(function BadChild({ onSave }: { onSave: () => void }) {
  badChildRenders++;
  return <button onClick={onSave}>Save</button>;
});

function BadParent() {
  const [tick, setTick] = useState(0);
  const handleSave = () => {}; // a new function every render
  return (
    <div>
      <button data-testid="tick" onClick={() => setTick(t => t + 1)}>
        Tick: {tick}
      </button>
      <BadChild onSave={handleSave} />
    </div>
  );
}

const bad = renderInNewContainer(<BadParent />);
console.log('\nBad child renders after mount:', badChildRenders);
act(() => {
  (
    bad.container.querySelector('[data-testid="tick"]') as HTMLButtonElement
  ).click();
});
act(() => {
  (
    bad.container.querySelector('[data-testid="tick"]') as HTMLButtonElement
  ).click();
});
console.log('Bad child renders after 2 unrelated ticks:', badChildRenders);

let goodChildRenders = 0;
const GoodChild = memo(function GoodChild({ onSave }: { onSave: () => void }) {
  goodChildRenders++;
  return <button onClick={onSave}>Save</button>;
});

function GoodParent() {
  const [tick, setTick] = useState(0);
  const handleSave = useCallback(() => {}, []); // same reference every render
  return (
    <div>
      <button data-testid="tick" onClick={() => setTick(t => t + 1)}>
        Tick: {tick}
      </button>
      <GoodChild onSave={handleSave} />
    </div>
  );
}

const good = renderInNewContainer(<GoodParent />);
console.log('\nGood child renders after mount:', goodChildRenders);
act(() => {
  (
    good.container.querySelector('[data-testid="tick"]') as HTMLButtonElement
  ).click();
});
act(() => {
  (
    good.container.querySelector('[data-testid="tick"]') as HTMLButtonElement
  ).click();
});
console.log('Good child renders after 2 unrelated ticks:', goodChildRenders);

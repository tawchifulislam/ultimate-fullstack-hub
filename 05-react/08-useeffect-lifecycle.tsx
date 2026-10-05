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

import React, { useEffect, useState } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

// --- Demo 1: what the dependency array controls ---
// No array: the effect runs after every render.
// Empty array []: the effect runs exactly once, after the first render.
// [someValue]: the effect runs after the first render, and again any time
// someValue is different from its previous render (compared with Object.is).

let everyRenderCalls = 0;
let mountOnlyCalls = 0;
let countChangeCalls = 0;

function EffectDemo({ count }: { count: number }) {
  useEffect(() => {
    everyRenderCalls++;
  });
  useEffect(() => {
    mountOnlyCalls++;
  }, []);
  useEffect(() => {
    countChangeCalls++;
  }, [count]);
  return <div>{count}</div>;
}

const demoContainer = document.getElementById('root') as HTMLDivElement;
const demoRoot = createRoot(demoContainer);

act(() => {
  demoRoot.render(<EffectDemo count={0} />);
});
console.log('After mount (count=0):', {
  everyRenderCalls,
  mountOnlyCalls,
  countChangeCalls,
});

act(() => {
  demoRoot.render(<EffectDemo count={0} />);
});
console.log('After re-render, count still 0:', {
  everyRenderCalls,
  mountOnlyCalls,
  countChangeCalls,
});

act(() => {
  demoRoot.render(<EffectDemo count={1} />);
});
console.log('After re-render, count changes to 1:', {
  everyRenderCalls,
  mountOnlyCalls,
  countChangeCalls,
});

act(() => {
  demoRoot.render(<EffectDemo count={1} />);
});
console.log('After re-render, count still 1:', {
  everyRenderCalls,
  mountOnlyCalls,
  countChangeCalls,
});

// --- Demo 2: cleanup runs before the next effect, and on unmount ---
// Returning a function from an effect registers a cleanup. React calls it
// right before running the effect again (if its dependencies changed), and
// one final time when the component unmounts. This is how an effect that
// subscribes to something also reliably unsubscribes from it.

const subscriptionLog: string[] = [];

function subscribe(id: number) {
  subscriptionLog.push(`subscribe(${id})`);
  return () => {
    subscriptionLog.push(`unsubscribe(${id})`);
  };
}

function Subscriber({ id }: { id: number }) {
  useEffect(() => {
    const unsubscribe = subscribe(id);
    return unsubscribe;
  }, [id]);
  return null;
}

const subContainer = document.createElement('div');
document.body.appendChild(subContainer);
const subRoot = createRoot(subContainer);

act(() => {
  subRoot.render(<Subscriber id={1} />);
});
console.log('\nAfter mount with id=1:', [...subscriptionLog]);

act(() => {
  subRoot.render(<Subscriber id={1} />);
});
console.log('After re-render, id still 1 (no change, no re-subscribe):', [
  ...subscriptionLog,
]);

act(() => {
  subRoot.render(<Subscriber id={2} />);
});
console.log('After re-render, id changes to 2 (cleanup then re-subscribe):', [
  ...subscriptionLog,
]);

act(() => {
  subRoot.unmount();
});
console.log('After unmount (final cleanup):', [...subscriptionLog]);

// --- Demo 3: a stale closure inside an effect, and the fix ---
// setInterval's callback is created once, when the effect first runs (empty
// dependency array). That callback closes over "count" as it was at that
// moment, forever, it never sees any later value, no matter how many times
// it actually fires.
//
// setInterval itself is replaced here with a version that just remembers
// its callback, so this demo can trigger "ticks" manually and run
// instantly, instead of actually waiting on real timers.
let capturedTick: (() => void) | null = null;
(global as any).setInterval = (cb: () => void) => {
  capturedTick = cb;
  return 1 as unknown as ReturnType<typeof setInterval>;
};
(global as any).clearInterval = () => {};

function BrokenTicker() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // "count" here is permanently 0, from mount
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return <span data-testid="count">{count}</span>;
}

const brokenContainer = document.createElement('div');
document.body.appendChild(brokenContainer);
const brokenRoot = createRoot(brokenContainer);
act(() => {
  brokenRoot.render(<BrokenTicker />);
});

const brokenTick = capturedTick!;
act(() => {
  brokenTick();
});
act(() => {
  brokenTick();
});
act(() => {
  brokenTick();
});
console.log(
  '\nBroken ticker after 3 ticks (stuck, stale closure):',
  brokenContainer.querySelector('[data-testid="count"]')?.textContent,
);

// The fix: the functional update form reads the actual latest state each
// time it runs, not whatever "count" was when the effect's closure was
// created, so it keeps counting correctly regardless of when it fires.
function FixedTicker() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCount(prev => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return <span data-testid="count">{count}</span>;
}

const fixedContainer = document.createElement('div');
document.body.appendChild(fixedContainer);
const fixedRoot = createRoot(fixedContainer);
act(() => {
  fixedRoot.render(<FixedTicker />);
});

const fixedTick = capturedTick!;
act(() => {
  fixedTick();
});
act(() => {
  fixedTick();
});
act(() => {
  fixedTick();
});
console.log(
  'Fixed ticker after 3 ticks (correct):',
  fixedContainer.querySelector('[data-testid="count"]')?.textContent,
);

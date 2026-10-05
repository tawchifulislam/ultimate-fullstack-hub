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

// --- An error boundary is still, deliberately, a class component ---
// This is the one place left in modern React where a class is required:
// there is no hook equivalent of getDerivedStateFromError or
// componentDidCatch. A function component cannot catch errors thrown by
// its children, this functionality only exists on class components.

class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  // Called during rendering, right after a descendant throws. Returning new
  // state here is how the fallback UI actually gets switched on.
  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  // Called after the error has been handled, a good place for the actual
  // side effect of logging it somewhere (an error reporting service, say).
  componentDidCatch(error: Error) {
    console.log('Logged by componentDidCatch:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// --- 1. Catching a render error, instead of crashing the whole app ---
function Buggy(): React.ReactElement {
  throw new Error('Something broke in render');
}

function AppWithRenderError() {
  return (
    <ErrorBoundary
      fallback={<p data-testid="fallback">Something went wrong.</p>}
    >
      <Buggy />
    </ErrorBoundary>
  );
}

const renderErrorContainer = document.createElement('div');
document.body.appendChild(renderErrorContainer);
const renderErrorRoot = createRoot(renderErrorContainer);

act(() => {
  renderErrorRoot.render(<AppWithRenderError />);
});
console.log(
  'Fallback shown after a render error (the app kept running):',
  renderErrorContainer.querySelector('[data-testid="fallback"]')?.textContent,
);

// --- 2. What error boundaries do NOT catch: event handler errors ---
// An error thrown inside an event handler happens outside of React's
// render process entirely, by the time it runs, rendering already
// finished successfully. Error boundaries only catch errors thrown while
// rendering, so this kind of error is reported separately (the same way a
// real browser reports an uncaught error in any event listener) and never
// reaches the boundary at all.

function BuggyButton() {
  return (
    <button
      onClick={() => {
        throw new Error('Thrown from a click handler');
      }}
    >
      Click to crash
    </button>
  );
}

function AppWithEventError() {
  return (
    <ErrorBoundary
      fallback={<p data-testid="fallback">Something went wrong.</p>}
    >
      <BuggyButton />
    </ErrorBoundary>
  );
}

const eventErrorContainer = document.createElement('div');
document.body.appendChild(eventErrorContainer);
const eventErrorRoot = createRoot(eventErrorContainer);
act(() => {
  eventErrorRoot.render(<AppWithEventError />);
});

act(() => {
  (eventErrorContainer.querySelector('button') as HTMLButtonElement).click();
});
console.log(
  '\nAfter a click handler throws, fallback shown (should be none, not caught):',
  eventErrorContainer.querySelector('[data-testid="fallback"]'),
);
console.log(
  'Button is still there and the app is still usable (boundary was never involved):',
  !!eventErrorContainer.querySelector('button'),
);

// --- 3. Resetting a boundary: changing its key remounts it fresh ---
// An error boundary that has caught an error stays in its "hasError" state
// until something forces it to start over. Giving it a "key" that changes
// makes React treat it as an entirely new instance, discarding the old one
// (and its error state) and mounting a fresh one in its place.

function RetryableBuggy({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('boom');
  }
  return <p data-testid="ok">All good</p>;
}

function AppWithRetry() {
  const [attempt, setAttempt] = useState(0);
  const [shouldThrow, setShouldThrow] = useState(true);
  return (
    <div>
      <button
        data-testid="retry"
        onClick={() => {
          setShouldThrow(false);
          setAttempt(a => a + 1);
        }}
      >
        Retry
      </button>
      <ErrorBoundary
        key={attempt}
        fallback={<p data-testid="fallback">Failed, try again.</p>}
      >
        <RetryableBuggy shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </div>
  );
}

const retryContainer = document.createElement('div');
document.body.appendChild(retryContainer);
const retryRoot = createRoot(retryContainer);
act(() => {
  retryRoot.render(<AppWithRetry />);
});
console.log(
  '\nAfter first render (throws):',
  retryContainer.querySelector('[data-testid="fallback"]')?.textContent,
);

act(() => {
  (
    retryContainer.querySelector('[data-testid="retry"]') as HTMLButtonElement
  ).click();
});
console.log(
  'After clicking Retry (key changed, boundary remounted fresh):',
  retryContainer.querySelector('[data-testid="ok"]')?.textContent,
);

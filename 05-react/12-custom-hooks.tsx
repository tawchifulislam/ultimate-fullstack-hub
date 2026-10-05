// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React packages are not installed in this learning resource.

import { JSDOM } from 'jsdom';

// A real URL (rather than the default "about:blank") is passed here so
// window.localStorage works the way it does in an actual browser, this
// matters specifically for the useLocalStorage demo further down.
const dom = new JSDOM('<!doctype html><div id="root"></div>', {
  url: 'http://localhost/',
});
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).localStorage = dom.window.localStorage;
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});
(global as any).IS_REACT_ACT_ENVIRONMENT = true;

import React, { useState, useRef, useEffect } from 'react';
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

// --- 1. A custom hook shares logic, not UI ---
// A custom hook is just a function whose name starts with "use" and that
// calls other hooks inside it. Components still decide how to render,
// the hook only packages up the reusable stateful behavior.

function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial);
  const toggle = () => setValue(v => !v);
  return [value, toggle];
}

function ToggleButton() {
  const [isOn, toggle] = useToggle(false);
  return <button onClick={toggle}>{isOn ? 'ON' : 'OFF'}</button>;
}

const toggleDemo = renderInNewContainer(<ToggleButton />);
console.log(
  'Initial:',
  toggleDemo.container.querySelector('button')?.textContent,
);
act(() => {
  (toggleDemo.container.querySelector('button') as HTMLButtonElement).click();
});
console.log(
  'After 1 click:',
  toggleDemo.container.querySelector('button')?.textContent,
);
act(() => {
  (toggleDemo.container.querySelector('button') as HTMLButtonElement).click();
});
console.log(
  'After 2 clicks:',
  toggleDemo.container.querySelector('button')?.textContent,
);

// --- 2. Extracting the "previous value" pattern from the useRef topic ---
// The ref-plus-effect pattern for tracking a previous value, seen directly
// inline in the useRef topic, is exactly the kind of logic worth lifting
// into its own reusable hook once more than one component needs it.

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

function PreviousValueDemo({ value }: { value: number }) {
  const previous = usePrevious(value);
  return (
    <div data-testid="values">
      Current: {value}, Previous: {previous ?? 'none'}
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
  '\nFirst render:',
  prevContainer.querySelector('[data-testid="values"]')?.textContent,
);
act(() => {
  prevRoot.render(<PreviousValueDemo value={2} />);
});
console.log(
  'Second render:',
  prevContainer.querySelector('[data-testid="values"]')?.textContent,
);

// --- 3. A more complete example: syncing state with localStorage ---
// This combines useState (for the value components actually render) with
// useEffect (to persist it to an outside system any time it changes),
// packaged up so any component can opt into "remembered" state with one call.

function useLocalStorage(
  key: string,
  initialValue: string,
): [string, (v: string) => void] {
  const [value, setValue] = useState<string>(() => {
    const stored = window.localStorage.getItem(key);
    return stored !== null ? stored : initialValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, value);
  }, [key, value]);
  return [value, setValue];
}

function NameForm() {
  const [name, setName] = useLocalStorage('demo-name', '');
  return (
    <div>
      <span data-testid="name">{name}</span>
      <button onClick={() => setName('Ada')}>Set name</button>
    </div>
  );
}

const storageContainer = document.createElement('div');
document.body.appendChild(storageContainer);
const storageRoot = createRoot(storageContainer);
act(() => {
  storageRoot.render(<NameForm />);
});
console.log(
  '\nName before setting:',
  JSON.stringify(
    storageContainer.querySelector('[data-testid="name"]')?.textContent,
  ),
);
act(() => {
  (storageContainer.querySelector('button') as HTMLButtonElement).click();
});
console.log(
  'Name shown after clicking:',
  storageContainer.querySelector('[data-testid="name"]')?.textContent,
);
console.log(
  'Value actually saved in localStorage:',
  window.localStorage.getItem('demo-name'),
);

// --- 4. Why the rules of hooks matter: a real crash, not just a style rule ---
// React tracks hooks by the order they are called in, on every render, to
// know which state belongs to which useState/useRef call. Calling a hook
// conditionally changes that order between renders, and React detects this
// and throws, it is not a silent bug. Note that this is a runtime check by
// React itself, TypeScript's type checker does not catch it (real projects
// normally also run the eslint-plugin-react-hooks lint rule, which catches
// it before the code ever runs at all).

function BrokenConditionalHook({ showExtra }: { showExtra: boolean }) {
  const [a] = useState(0);
  if (showExtra) {
    const [b] = useState(0); // only called on some renders: breaks the rule
  }
  return <div>{a}</div>;
}

const rulesContainer = document.createElement('div');
document.body.appendChild(rulesContainer);
const rulesRoot = createRoot(rulesContainer);

act(() => {
  rulesRoot.render(<BrokenConditionalHook showExtra={true} />);
});
console.log('\nMounted fine with showExtra=true (2 hooks called)');

try {
  act(() => {
    rulesRoot.render(<BrokenConditionalHook showExtra={false} />);
  });
  console.log('No error thrown (unexpected)');
} catch (err) {
  console.log('Re-rendering with showExtra=false (only 1 hook called) throws:');
  console.log((err as Error).message);
}

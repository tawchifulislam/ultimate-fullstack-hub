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

import React, { createContext, useContext, useState, memo } from 'react';
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

// --- Demo 1: avoiding prop drilling, and updating context over time ---
// Without context, a value needed deep in the tree has to be passed down as
// a prop through every component in between, even ones that never use it
// themselves ("prop drilling"). Context lets any descendant read a value
// directly, no matter how deeply nested, without every component in
// between repeating it as a prop.

interface ThemeContextValue {
  color: string;
  toggleColor: () => void;
}

// createContext's argument is the default value, used by any component
// that calls useContext without a matching Provider above it.
const ThemeContext = createContext<ThemeContextValue>({
  color: 'black',
  toggleColor: () => {},
});

function ThemedButton() {
  const theme = useContext(ThemeContext);
  return (
    <button data-testid="themed-button" onClick={theme.toggleColor}>
      Current color: {theme.color}
    </button>
  );
}

function Toolbar() {
  // Toolbar has no idea what a "theme" is, it never receives or passes one,
  // it just renders ThemedButton, which reaches into context on its own.
  return (
    <div>
      <ThemedButton />
    </div>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [color, setColor] = useState('blue');
  const toggleColor = () => setColor(c => (c === 'blue' ? 'green' : 'blue'));
  return (
    <ThemeContext.Provider value={{ color, toggleColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

const themed = renderInNewContainer(
  <ThemeProvider>
    <Toolbar />
  </ThemeProvider>,
);
console.log(
  'Initial themed button text:',
  themed.container.querySelector('[data-testid="themed-button"]')?.textContent,
);

act(() => {
  (
    themed.container.querySelector(
      '[data-testid="themed-button"]',
    ) as HTMLButtonElement
  ).click();
});
console.log(
  'After one click (color toggled through context):',
  themed.container.querySelector('[data-testid="themed-button"]')?.textContent,
);

// --- Demo 2: the default value, used with no Provider above ---
const unwrapped = renderInNewContainer(<ThemedButton />);
console.log(
  '\nThemedButton with no Provider above it, uses the default value:',
  unwrapped.container.querySelector('[data-testid="themed-button"]')
    ?.textContent,
);

// --- Demo 3: a fresh value object on every render causes extra re-renders ---
// React.memo (covered in full in an upcoming topic) stops a component from
// re-rendering just because its parent re-rendered, it still re-renders if
// the context or props it actually reads changes. It is used here only to
// isolate and prove this one effect, not as the main subject of this demo.
//
// Creating the Provider's "value" as a fresh object literal on every render
// means every consumer sees a "new" value and re-renders, even when the
// data inside that object has not actually changed.

interface UserContextValue {
  user: string;
  setUser: (u: string) => void;
}

const BadUserContext = createContext<UserContextValue | null>(null);

let badConsumerRenderCount = 0;
const BadConsumer = memo(function BadConsumer() {
  badConsumerRenderCount++;
  const ctx = useContext(BadUserContext)!;
  return <p data-testid="user">{ctx.user}</p>;
});

function BadUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState('Ada');
  // A brand new object, every time BadUserProvider itself re-renders,
  // whether or not "user" actually changed.
  return (
    <BadUserContext.Provider value={{ user, setUser }}>
      {children}
    </BadUserContext.Provider>
  );
}

function BadApp() {
  const [tick, setTick] = useState(0);
  return (
    <BadUserProvider>
      <div>
        <button data-testid="tick" onClick={() => setTick(t => t + 1)}>
          Unrelated tick: {tick}
        </button>
        <BadConsumer />
      </div>
    </BadUserProvider>
  );
}

const bad = renderInNewContainer(<BadApp />);
console.log('\nBad consumer renders after mount:', badConsumerRenderCount);
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
console.log(
  'Bad consumer renders after 2 unrelated ticks (user never changed):',
  badConsumerRenderCount,
);

// --- The fix: keep the value's identity stable across unrelated renders ---
// Holding the whole context value in its own useState means React returns
// the exact same object on every render until something actually calls its
// setter, an unrelated re-render of the provider no longer creates a new
// object for consumers to react to.

const GoodUserContext = createContext<UserContextValue | null>(null);

let goodConsumerRenderCount = 0;
const GoodConsumer = memo(function GoodConsumer() {
  goodConsumerRenderCount++;
  const ctx = useContext(GoodUserContext)!;
  return <p data-testid="user">{ctx.user}</p>;
});

function GoodUserProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<UserContextValue>(() => ({
    user: 'Ada',
    setUser: (newUser: string) => {
      setValue(prev => ({ ...prev, user: newUser }));
    },
  }));
  return (
    <GoodUserContext.Provider value={value}>
      {children}
    </GoodUserContext.Provider>
  );
}

function GoodApp() {
  const [tick, setTick] = useState(0);
  return (
    <GoodUserProvider>
      <div>
        <button data-testid="tick" onClick={() => setTick(t => t + 1)}>
          Unrelated tick: {tick}
        </button>
        <GoodConsumer />
      </div>
    </GoodUserProvider>
  );
}

const good = renderInNewContainer(<GoodApp />);
console.log('\nGood consumer renders after mount:', goodConsumerRenderCount);
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
console.log(
  'Good consumer renders after 2 unrelated ticks (user never changed):',
  goodConsumerRenderCount,
);

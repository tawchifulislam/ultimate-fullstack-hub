// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: Redux Toolkit, react-redux, and React itself are not installed in
// this learning resource (see the Notes file for the install command).

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
import { createSlice, configureStore, PayloadAction } from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';

// --- 1. A slice: state, actions, and reducer logic in one place ---
// createSlice generates the action creators and the reducer together from
// one definition, instead of writing action type strings, action creator
// functions, and a switch-statement reducer separately, by hand, the way
// older Redux code required.

interface CounterState {
  value: number;
}

const initialState: CounterState = { value: 0 };

const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: state => {
      // This looks like a direct mutation of "state", it is not one.
      // createSlice uses Immer internally, this code is recorded and
      // replayed as a safe, immutable update behind the scenes.
      state.value += 1;
    },
    decrement: state => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
});

const { increment, decrement, incrementByAmount } = counterSlice.actions;

// --- 2. The store: where the actual application state lives ---
const store = configureStore({
  reducer: { counter: counterSlice.reducer },
});

type RootState = ReturnType<typeof store.getState>;

// --- 3. Components read state with useSelector, and dispatch with useDispatch ---
// Any component under the Provider can reach the same store directly, no
// prop has to be threaded down to it, and no parent component has to own
// this state itself the way lifting state up would require.

function CounterControls() {
  const dispatch = useDispatch();
  return (
    <div>
      <button data-testid="inc" onClick={() => dispatch(increment())}>
        +1
      </button>
      <button data-testid="dec" onClick={() => dispatch(decrement())}>
        -1
      </button>
      <button data-testid="add5" onClick={() => dispatch(incrementByAmount(5))}>
        +5
      </button>
    </div>
  );
}

function CounterDisplayA() {
  const count = useSelector((state: RootState) => state.counter.value);
  return <span data-testid="displayA">{count}</span>;
}

function CounterDisplayB() {
  const count = useSelector((state: RootState) => state.counter.value);
  return <span data-testid="displayB">{count}</span>;
}

const container = document.getElementById('root') as HTMLDivElement;
const root = createRoot(container);

act(() => {
  root.render(
    <Provider store={store}>
      <CounterDisplayA />
      <CounterDisplayB />
      <CounterControls />
    </Provider>,
  );
});

console.log(
  'Initial, two unrelated components reading the same store:',
  container.querySelector('[data-testid="displayA"]')?.textContent,
  container.querySelector('[data-testid="displayB"]')?.textContent,
);

act(() => {
  (container.querySelector('[data-testid="inc"]') as HTMLButtonElement).click();
});
console.log(
  'After +1, both stay in sync:',
  container.querySelector('[data-testid="displayA"]')?.textContent,
  container.querySelector('[data-testid="displayB"]')?.textContent,
);

act(() => {
  (
    container.querySelector('[data-testid="add5"]') as HTMLButtonElement
  ).click();
});
console.log(
  'After +5, both stay in sync:',
  container.querySelector('[data-testid="displayA"]')?.textContent,
  container.querySelector('[data-testid="displayB"]')?.textContent,
);

act(() => {
  (container.querySelector('[data-testid="dec"]') as HTMLButtonElement).click();
});
console.log(
  'After -1, both stay in sync:',
  container.querySelector('[data-testid="displayA"]')?.textContent,
  container.querySelector('[data-testid="displayB"]')?.textContent,
);

// --- 4. Proving Immer's "mutating" syntax is actually safe and immutable ---
// Writing state.user.address.city = ... inside a reducer looks dangerous,
// real mutation would break React's ability to detect changes. Immer
// intercepts this and produces a real new object for every changed branch
// of the state tree, while reusing (not copying) any branch that was not
// touched, "structural sharing".

interface AppState {
  user: { name: string; address: { city: string; zip: string } };
  unrelated: { count: number };
}

const appSlice = createSlice({
  name: 'app',
  initialState: {
    user: { name: 'Ada', address: { city: 'Austin', zip: '00000' } },
    unrelated: { count: 1 },
  } as AppState,
  reducers: {
    updateCity: (state, action: PayloadAction<string>) => {
      state.user.address.city = action.payload;
    },
  },
});

const before = appSlice.reducer(undefined, { type: '@@INIT' });
const after = appSlice.reducer(before, appSlice.actions.updateCity('Boston'));

console.log(
  '\nCity before:',
  before.user.address.city,
  '| City after:',
  after.user.address.city,
);
console.log('The whole state object is a new reference:', before !== after);
console.log(
  'The changed branch (user) is a new reference:',
  before.user !== after.user,
);
console.log(
  'The untouched branch (unrelated) kept the exact same reference:',
  before.unrelated === after.unrelated,
);

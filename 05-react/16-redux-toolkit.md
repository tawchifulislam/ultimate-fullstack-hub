# Redux Toolkit

**Topic 58 of 89** (Section: React, 16 of 16)

## Notes

### Why Redux, when Context already exists

The Context API topic covered sharing a value across a tree without prop drilling. Redux solves a related but larger problem: a single, centralized store for state that many unrelated parts of a large app need to read and update, often frequently, with predictable rules about how it can change (every update goes through a reducer function, never a direct mutation), plus tooling (time-travel debugging, inspecting every action that ever fired) that becomes valuable once an app's state logic grows complex. For a small amount of infrequently changing shared state, Context is usually simpler and sufficient, Redux is reached for once an app's shared state and the logic around it genuinely outgrows that.

### Redux Toolkit is the modern way to write Redux

Older Redux code required writing action type string constants, action creator functions, and a reducer as a hand-written `switch` statement, all separately, for every single piece of state. Redux Toolkit (RTK) is the official, current way to write Redux, it generates all of that from one definition.

### createSlice: actions and reducer logic together

```tsx
const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
});

const { increment, decrement, incrementByAmount } = counterSlice.actions;
```

Each function under `reducers` both defines what that action does and automatically generates a matching action creator (`increment()`, `incrementByAmount(5)`) exported through `counterSlice.actions`.

### Immer: the "mutating" syntax is actually safe

Writing `state.value += 1` looks like a direct mutation, which would normally break React and Redux's ability to detect what changed. `createSlice` uses a library called Immer internally: the code inside each reducer is recorded against a special proxy object, and Immer produces a real, new, immutable state object from it behind the scenes. Any branch of the state that was not touched is reused as-is (not copied), this is called structural sharing, and it is why comparing old and new state by reference still works correctly everywhere else in React and Redux.

### configureStore and Provider

`configureStore` sets up the actual store from one or more slices' reducers, with good defaults (development warnings, the dev tools extension, and more) already wired in:

```tsx
const store = configureStore({
  reducer: { counter: counterSlice.reducer },
});
```

Wrapping the app in `<Provider store={store}>` (from `react-redux`) makes that store available to every component underneath it, the same general idea as a Context provider, but specifically for Redux's store.

### useSelector and useDispatch

Inside the `Provider`, any component reads whatever slice of state it needs with `useSelector`, and sends actions with `useDispatch`:

```tsx
function Counter() {
  const count = useSelector((state: RootState) => state.counter.value);
  const dispatch = useDispatch();
  return (
    <div>
      <span>{count}</span>
      <button onClick={() => dispatch(increment())}>+1</button>
    </div>
  );
}
```

Two completely unrelated components can both call `useSelector` against the same piece of state, and both stay in sync automatically, whichever one dispatches an action, every component reading that state re-renders with the new value, with no props passed between them at all.

### Practical tips

- Not every piece of state belongs in Redux, component-local state (`useState`) is still correct for anything only one component (and its own children) cares about, reach for a shared store for state genuinely needed across unrelated parts of the app.
- `useSelector` should select the smallest piece of state a component actually needs, selecting the entire state object causes that component to re-render on every single change anywhere in the store, selecting just `state.counter.value` means it only re-renders when that specific value changes.
- Redux Toolkit also includes `createAsyncThunk` for handling asynchronous logic (API calls) in a standardized way, and RTK Query for data fetching and caching built directly on top of the same store, both worth knowing exist once a real app needs them.

### Running this topic's example

This example needs Redux Toolkit and react-redux alongside React itself, plus `jsdom` to provide a DOM in plain Node, the same approach used for earlier interactive React topics:

```text
npm install react react-dom @reduxjs/toolkit react-redux jsdom
npm install --save-dev typescript @types/react @types/react-dom @types/node @types/jsdom
npx tsc --jsx react-jsx --module commonjs --target es2020 --esModuleInterop --strict --types node,jsdom --outDir dist 58-redux-toolkit.tsx
node dist/58-redux-toolkit.js
```

## Resources

- Redux Toolkit docs, Quick Start: <https://redux-toolkit.js.org/tutorials/quick-start>
- Redux Toolkit docs, createSlice: <https://redux-toolkit.js.org/api/createSlice>
- Redux docs, Why Redux?: <https://redux.js.org/faq/general#when-should-i-use-redux>

## Practice / Exercises

- Build a `todosSlice` with `addTodo`, `toggleTodo`, and `removeTodo` reducers, then build two components, a form that dispatches `addTodo` and a list that reads the todos with `useSelector`, confirm the list updates without any props connecting the two components directly.
- Add a second slice (for example, a `themeSlice` with a `toggleTheme` reducer) to the same store, and confirm both slices' state can be read independently through `useSelector` from the same `Provider`.

## Code Example

See [`16-redux-toolkit.tsx`](./16-redux-toolkit.tsx) in this folder.

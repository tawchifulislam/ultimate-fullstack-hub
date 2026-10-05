# 5. React

This is the fifth section of the Full Stack Skill Roadmap: sixteen topics covering React from a plain function component up through a Redux Toolkit store. Every code example in this section runs in plain Node, through `jsdom` for anything that needs a real DOM, rather than a browser or a bundler, so each topic's behavior could actually be compiled and run and checked, not just described.

## Topics in this section

| # | Topic | What it covers | Files |
| --- | ------- | ----------------- | ------- |
| 1 | Components and Props | Function components, typed props, default values, the `children` prop, composing components. | [Notes](./01-components-props.md) &middot; [Code](./01-components-props.tsx) |
| 2 | Virtual DOM and Reconciliation | What the Virtual DOM is, render vs commit, the same-type-reuses/different-type-rebuilds diffing rule. | [Notes](./02-virtual-dom-reconciliation.md) &middot; [Code](./02-virtual-dom-reconciliation.tsx) |
| 3 | Conditional Rendering | Early returns, ternaries, `&&`, the `count && <X/>` stray-zero pitfall, returning `null`. | [Notes](./03-conditional-rendering.md) &middot; [Code](./03-conditional-rendering.tsx) |
| 4 | Keys and Lists | Rendering with `.map()`, why keys exist, the index-as-key pitfall proven with a reordered, stateful list. | [Notes](./04-keys-and-lists.md) &middot; [Code](./04-keys-and-lists.tsx) |
| 5 | Event Handling | Passing handler references, arguments via inline arrows, the event object, `preventDefault`. | [Notes](./05-event-handling.md) &middot; [Code](./05-event-handling.tsx) |
| 6 | useState | State vs a plain variable, stale closures and the functional update fix, never mutating state, lazy init. | [Notes](./06-usestate.md) &middot; [Code](./06-usestate.tsx) |
| 7 | Controlled vs Uncontrolled Components | `value`/`onChange` vs `defaultValue`, reading an uncontrolled form with `FormData`. | [Notes](./07-controlled-uncontrolled.md) &middot; [Code](./07-controlled-uncontrolled.tsx) |
| 8 | useEffect and Lifecycle | The dependency array's three forms, cleanup timing, the classic stale-closure `setInterval` bug. | [Notes](./08-useeffect-lifecycle.md) &middot; [Code](./08-useeffect-lifecycle.tsx) |
| 9 | Context API | Avoiding prop drilling, default values, updating context over time, the fresh-object-every-render pitfall. | [Notes](./09-context-api.md) &middot; [Code](./09-context-api.tsx) |
| 10 | Component Composition | Containment, specialization instead of inheritance, slot props, composition as an alternative to prop drilling. | [Notes](./10-component-composition.md) &middot; [Code](./10-component-composition.tsx) |
| 11 | useRef | DOM access, refs vs state, the ref-cannot-drive-the-UI pitfall, tracking a previous value. | [Notes](./11-useref.md) &middot; [Code](./11-useref.tsx) |
| 12 | Custom Hooks | Sharing logic (not UI) between components, extracting `usePrevious`, the rules of hooks as a real crash, not just style. | [Notes](./12-custom-hooks.md) &middot; [Code](./12-custom-hooks.tsx) |
| 13 | useMemo and useCallback | Memoizing a value vs a function's identity, why identity matters for memoized children, not over-using either. | [Notes](./13-usememo-usecallback.md) &middot; [Code](./13-usememo-usecallback.tsx) |
| 14 | React.memo and Performance Optimization | Shallow prop comparison, the `children`-prop gotcha, a custom comparison function, when it is and isn't worth it. | [Notes](./14-react-memo-performance.md) &middot; [Code](./14-react-memo-performance.tsx) |
| 15 | Error Boundaries | The one place a class component is still required, what is and isn't caught, resetting a boundary with `key`. | [Notes](./15-error-boundaries.md) &middot; [Code](./15-error-boundaries.tsx) |
| 16 | Redux Toolkit | `createSlice`, Immer's safe "mutating" syntax, `configureStore`, `useSelector`/`useDispatch`, structural sharing. | [Notes](./16-redux-toolkit.md) &middot; [Code](./16-redux-toolkit.tsx) |

## How the section fits together

Components and Props (Topic 1) is the foundation everything else renders through. Virtual DOM and Reconciliation (Topic 2) explains the mechanism underneath every render before any hook is introduced, so later topics about re-renders and memoization have something concrete to refer back to. Conditional Rendering and Keys and Lists (Topics 3 to 4) cover the two things almost every component needs to do with that JSX: show different content, and show many items correctly. Event Handling (Topic 5) is the last piece needed before state means anything, a component has to be able to respond to something before changing its own data matters.

useState (Topic 6) introduces state itself, and Controlled vs Uncontrolled Components (Topic 7) is its first serious application, two different ways to let a form hold data. useEffect and Lifecycle (Topic 8) adds the other half of "time" in React: not just state changing, but synchronizing with anything outside React entirely. Context API and Component Composition (Topics 9 to 10) are two different answers to the same underlying problem, getting data or UI deep into a tree without threading it through every layer by hand, covered back to back so the difference between passing a value and passing already-built JSX is clear.

useRef (Topic 11) introduces the one kind of data that deliberately does not trigger a re-render, and Custom Hooks (Topic 12) immediately reuses that exact pattern (`usePrevious`) to show what a custom hook actually is: packaging up hooks already covered, not a new primitive. useMemo, useCallback, and React.memo (Topics 13 to 14) form one continuous idea, keeping a value's or function's identity stable, and why that stability is what a memoized component actually depends on, proven directly with render counters in both topics. Error Boundaries (Topic 15) is the deliberate exception to every function-component topic before it, the one place a class is still required. Redux Toolkit (Topic 16) closes the section by scaling the same state-and-subscription idea from Context up to a single, centralized store, the natural next step once a real app's shared state outgrows what Context alone is meant for.

## How each topic is structured

Every topic has two files: an explanation (`.md`) and a matching `.tsx` code example. Because this repository does not install `react`, `react-dom`, or any other package, every `.tsx` file begins with a `// @ts-nocheck` directive and a short comment explaining why, this keeps the code readable in an editor without red squiggly import errors. That directive is only for the delivered file, every example was actually type-checked with `tsc --strict` (with the directive removed) and then compiled and run with Node before being included here, several using `jsdom` to provide a real DOM for interactive, click-and-type-driven proofs, not just plausible-sounding claims. A topic whose example needs more than `react`/`react-dom`/`jsdom` (Context's and later topics' `memo`, or Redux Toolkit's own packages) says exactly what to install and how to compile it, in its own Notes file.

## Suggested capstone exercise

Build a small todo app that deliberately uses most of this section at once: a `TodoItem` component (Topic 1) rendered from a `.map()` with a real id as its `key` (Topic 4); an `AddTodoForm` as a controlled input (Topic 7) whose submit handler calls `preventDefault` (Topic 5); `useState` for the todo list itself (Topic 6) persisted to `localStorage` through a custom `useLocalStorage` hook (Topic 12); a `ThemeContext` (Topic 9) toggling light/dark, read by a `Card` wrapper component (Topic 10) that every section of the page composes with; a `useRef`-based autofocus on the add-todo input (Topic 11); a `useMemo`-filtered "active only" view plus a `useCallback`-stabilized delete handler passed to a `memo`-wrapped `TodoItem` (Topics 13 to 14), confirmed with a render counter that unrelated typing in the form does not re-render the whole list; and an `ErrorBoundary` (Topic 15) around the list itself. As a final exercise, replace the `useState`-held todo list with a Redux Toolkit slice (Topic 16) and confirm the rest of the app keeps working unchanged.

## Previous section

[TypeScript](../04-typescript/README.md)

## Next section

[Testing](../06-testing/README.md)

[Back to main roadmap](../README.md)

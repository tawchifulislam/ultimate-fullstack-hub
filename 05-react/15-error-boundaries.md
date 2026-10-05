# Error Boundaries

**Topic 57 of 89** (Section: React, 15 of 16)

## Notes

### What an error boundary does

By default, a JavaScript error thrown anywhere while rendering crashes the entire component tree React was managing, the whole app disappears, not just the broken part. An error boundary is a component that catches an error thrown by any component below it in the tree, during rendering, and renders a fallback UI in its place instead, leaving the rest of the app (anything outside that boundary) completely unaffected.

### The one place a class component is still required

Every other topic in this section has used function components and hooks. Error boundaries are the one deliberate exception: there is no hook equivalent of the two class lifecycle methods an error boundary needs, `getDerivedStateFromError` and `componentDidCatch`. Catching a descendant's error is only possible from a class component, this has not changed across React's recent versions.

```tsx
class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  // Runs during rendering, right after a descendant throws. Returning new
  // state from here is what actually switches on the fallback UI.
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  // Runs after the error has been handled, the place for the side effect
  // of logging it (to an error reporting service, for example).
  componentDidCatch(error: Error) {
    logErrorToService(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

Wrapping any part of the tree in this component catches errors from everything underneath it:

```tsx
<ErrorBoundary fallback={<p>Something went wrong.</p>}>
  <Buggy />
</ErrorBoundary>
```

### What error boundaries do NOT catch

Error boundaries only catch errors thrown while React is rendering. Several common sources of errors happen outside of that and are not caught:

- **Event handlers.** By the time a click handler runs, rendering already finished successfully, an error thrown inside `onClick` (or any other handler) is not a rendering error. It is reported the same way an uncaught error in any browser event listener normally is, and it does not reach the boundary, the rest of the app, including that same component, keeps working normally.
- **Asynchronous code.** An error thrown inside a `setTimeout` callback, a Promise's `.then`, or an `async` function similarly happens outside of React's rendering process and is not caught.
- **Errors in the boundary itself.** A boundary cannot catch an error it throws itself, only errors from components below it.
- **Server-side rendering errors.**

Event handler and asynchronous errors need their own handling, a `try`/`catch` around the risky code, or a `.catch()` on a promise.

### Resetting a boundary

Once a boundary has caught an error, it stays in that state, showing the fallback, until something tells it to try again. Giving the boundary a `key` that changes is a simple way to do this: changing a `key` makes React treat the element as an entirely new instance, discarding the old one, error state included, and mounting a fresh one from scratch.

```tsx
<ErrorBoundary key={attempt} fallback={<p>Failed, try again.</p>}>
  <RetryableBuggy shouldThrow={shouldThrow} />
</ErrorBoundary>
```

Incrementing `attempt` (alongside fixing whatever caused the error, `shouldThrow` here) remounts the boundary and its children cleanly, giving them a genuine fresh attempt.

### Practical tips

- Placing a single error boundary around an entire app means one broken component takes down the whole page's content, placing several smaller boundaries around independent sections (a sidebar, a particular widget, a single route) keeps a failure contained to just that section.
- The `react-error-boundary` package is a popular, well-tested implementation of this same class-component pattern, with a nicer function-based API for configuring it, worth knowing about even though it is still a class component underneath.
- Development builds of React log a caught error to the console in detail even though the boundary successfully handled it, this is intentional, so errors are never silently invisible during development, it does not mean the boundary failed.

## Resources

- React docs, Catching rendering errors with an error boundary: <https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary>
- React docs, static getDerivedStateFromError: <https://react.dev/reference/react/Component#static-getderivedstatefromerror>
- react-error-boundary (npm): <https://www.npmjs.com/package/react-error-boundary>

## Practice / Exercises

- Build an `ErrorBoundary` around a small widget that sometimes throws based on a prop, confirm the rest of the page around it keeps working while the widget shows its fallback.
- Reproduce the event-handler gotcha yourself: confirm an error thrown inside an `onClick` does not trigger your boundary's fallback, then wrap just that handler's risky code in a `try`/`catch` instead.

## Code Example

See [`15-error-boundaries.tsx`](./15-error-boundaries.tsx) in this folder.

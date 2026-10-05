# React Testing Library

**Topic 60 of 89** (Section: Testing, 2 of 2)

## Notes

React Testing Library (RTL) is a set of utilities built on top of Jest (or any other test runner) for testing React components the way a user would actually interact with them: by finding things on the screen and clicking, typing, and reading text, instead of reaching into a component's internal state or instance. It runs against a real DOM provided by `jsdom`, the same approach used throughout the React section of this roadmap.

### Why jsdom has to be configured again

Since Jest 28, the default test environment is `"node"`, which has no DOM at all. Testing actual components needs `"jsdom"` instead, and modern Jest ships it as a separate package, `jest-environment-jsdom`, rather than bundling it with the main `jest` package. A project can set `testEnvironment: "jsdom"` globally in `jest.config.js` to apply it everywhere, or set it per file with a docblock comment at the very top of a test file:

```ts
/**
 * @jest-environment jsdom
 */
```

This repository uses the per-file docblock, because Topic 59's tests have no need for a DOM and run fine in the faster `"node"` environment, while this topic's tests need a real DOM. Mixing environments like this, instead of forcing every test file onto the heaviest environment any one of them needs, is a realistic pattern once a project has both plain logic tests and component tests.

### render() and screen

`render(<Component />)` from `@testing-library/react` mounts a component into a jsdom document. After that, every query goes through `screen`, which always looks at the current full document, there is no separate element handle returned from `render` that has to be passed around and kept in sync.

```tsx
render(<Greeting name="Ada" />);
expect(screen.getByText("Hello, Ada!")).toBeInTheDocument();
```

### Queries: getBy, queryBy, and by role or label

RTL's queries are the main way this library differs from manipulating the DOM directly. The most commonly recommended ones are:

- `getByRole("button", { name: "Increment" })`, finding an element the same way assistive technology would, by its accessible role and accessible name. This is the query RTL's own documentation recommends reaching for first, it also catches accessibility problems, since an element with no accessible name cannot be found this way.
- `getByLabelText("Your name")`, finding a form field through its associated `<label>`, exactly how a sighted user reading the label, or a screen reader announcing it, would identify the field. This is more realistic than selecting an input by its `id`.
- `getByText("Hello, Ada!")`, a more direct fallback when role or label do not apply.

Every `getBy*` query throws an error immediately if nothing matches, which makes it useless for asserting something is absent. `queryBy*` is the version for that case: it returns `null` instead of throwing, so it can be used in a normal `toBe(null)` or `not.toBeInTheDocument()` assertion.

```tsx
expect(() => screen.getByText("Goodbye, Ada!")).toThrow();
expect(screen.queryByText("Goodbye, Ada!")).toBe(null);
```

(RTL also has `findBy*` queries, which return a promise and wait for an element to appear, useful for anything that renders asynchronously. This topic's examples are all synchronous, so `findBy*` is not used here, but it follows the same naming pattern.)

### fireEvent simulates real DOM events

`fireEvent.click(element)`, `fireEvent.change(input, { target: { value: "..." } })`, and the rest of the `fireEvent` helpers dispatch actual DOM events, the same events a browser would dispatch from a real click or keystroke. A component's `onClick` or `onChange` handler responds to these exactly as it would in production.

```tsx
const button = screen.getByRole("button", { name: "Increment" });
fireEvent.click(button);
expect(screen.getByText("Count: 1")).toBeInTheDocument();
```

### @testing-library/jest-dom's custom matchers

Plain Jest has no idea what a DOM element is, so asserting on one normally means reaching into properties by hand, like checking `element.disabled === true`. `@testing-library/jest-dom` adds matchers written specifically for DOM elements, such as `toBeInTheDocument()`, `toBeDisabled()`, and `toHaveTextContent()`, each reading closer to the actual intent of the assertion. Importing the package once, `import "@testing-library/jest-dom";`, is enough to make every one of its matchers available on `expect` for the rest of the file.

```tsx
expect(button).toBeDisabled();
expect(button).toHaveTextContent("Submit");
```

### Automatic cleanup between tests

`@testing-library/react` registers its own `afterEach` cleanup hook as soon as it is imported, which unmounts whatever was rendered after every test finishes. This is why one test's rendered output never leaks into the next test's queries, and it happens without any setup code of the project's own.

## Resources

- React Testing Library documentation: <https://testing-library.com/docs/react-testing-library/intro/>
- Guiding principles (why queries are ordered the way they are): <https://testing-library.com/docs/guiding-principles/>
- About queries (getBy/queryBy/findBy and the priority order): <https://testing-library.com/docs/queries/about>
- jest-dom custom matchers: <https://github.com/testing-library/jest-dom>
- Configuring testEnvironment: <https://jestjs.io/docs/configuration#testenvironment-string>

## Practice

1. Render a component with a disabled checkbox and assert on it with `toBeDisabled()` and `toBeChecked()`.
2. Build a small form with two labeled inputs, simulate filling in both with `fireEvent.change`, and assert the submitted summary text.
3. Write a component that shows an error message only after a failed action, and use `queryByText` to prove the error is absent before that action happens.
4. Try switching the project's `jest.config.js` to set `testEnvironment: "jsdom"` globally, remove the per-file docblock, and confirm both test files still pass.
5. Add a `getByRole("button")` query for a button with no accessible name and observe the query fail, then fix it by adding visible text or an `aria-label`.

## Code Example

See [02-react-testing-library.test.tsx](./02-react-testing-library.test.tsx).

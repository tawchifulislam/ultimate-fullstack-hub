# 6. Testing

This is the sixth section of the Full Stack Skill Roadmap: two topics covering the fundamentals of automated testing in JavaScript and TypeScript, from a plain Jest test up through testing a React component the way a user actually interacts with it. Every claim in this section was checked by actually running `npx jest` against a real test file, not just described, the same compile-then-run discipline used throughout the rest of this roadmap.

## Topics in this section

| # | Topic | What it covers | Files |
| - | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1 | Jest Fundamentals | `test`/`expect` and matchers, `toBe` vs `toEqual`, `describe` and the exact order of `beforeAll`/`beforeEach`/`afterEach`/`afterAll`, `jest.fn()` mock functions, testing async code. | [Notes](./01-jest-fundamentals.md) &middot; [Code](./01-jest-fundamentals.test.ts) |
| 2 | React Testing Library | `render`/`screen`, `getByRole`/`getByLabelText`/`getByText`, `getBy` vs `queryBy`, simulating real events with `fireEvent`, `@testing-library/jest-dom` matchers, automatic cleanup between tests. | [Notes](./02-react-testing-library.md) &middot; [Code](./02-react-testing-library.test.tsx) |

## How the section fits together

Jest Fundamentals (Topic 1) covers the test runner itself, independent of React or any UI at all: what a test is, how to assert on a value, how to group tests and control what runs before and after each one, how to stand in for a dependency with a mock function, and how to test code that returns a promise. Everything in this topic runs in Jest's plain `"node"` test environment, because none of it needs a DOM.

React Testing Library (Topic 2) builds directly on that foundation to test actual React components. It needs a real DOM, which is why this topic reintroduces `jsdom`, through the separate `jest-environment-jsdom` package modern Jest requires, configured per test file with a `@jest-environment jsdom` docblock rather than switched on globally, since Topic 1's tests have no need for a DOM and should keep running in the lighter `"node"` environment. Where the React section (Section 5) tested components by hand, constructing a `JSDOM` instance and driving `react-dom/client` directly, React Testing Library is the purpose-built library for the same job: it replaces that hand-rolled setup with `render`, `screen`, and queries built around how a real user finds and interacts with things on a page.

## How each topic is structured

Every topic has two files: an explanation (`.md`) and a matching code file. Topic 1's code runs as a Jest test file directly. Topic 2's code imports `react` and `@testing-library/react`, neither of which is installed in this repository, so it begins with a `// @ts-nocheck` directive and a short comment explaining why, this keeps the code readable in an editor without red squiggly import errors. That directive is only present in the delivered file, every example was actually type-checked with `tsc --strict` (with the directive removed) and then run with `npx jest` before being included here, with the real pass/fail counts quoted in each topic's notes.

To run either file, a project needs `jest`, `ts-jest`, and `typescript` installed, plus a `tsconfig.json` whose `compilerOptions.types` includes `"jest"` so TypeScript recognizes Jest's global functions. Topic 2 additionally needs `react`, `react-dom`, `@testing-library/react`, `@testing-library/jest-dom`, and `jest-environment-jsdom`.

## Suggested capstone exercise

Pick one small component from the React section, such as the `Counter` from Topic 6 (useState) or the `NameForm` style of controlled input from Topic 7, and write a full test file for it using only what this section covers: a `describe` block grouping its tests, a `beforeEach` that renders a fresh instance before every test, `getByRole` and `getByLabelText` queries to find its elements, `fireEvent` to click a button or type into a field, and `@testing-library/jest-dom` matchers to assert on the result. Then add one test using `jest.fn()` to confirm a callback prop is called with the right arguments when the component's button is clicked. As a final exercise, add a test that asserts something is correctly absent from the page before an action happens, using `queryByText` rather than `getByText`, to practice the one distinction every one of this section's examples relies on.

## Previous section

[React](../05-react/README.md)

## Next section

[Next.js](../07-nextjs/README.md)

[Back to main roadmap](../README.md)

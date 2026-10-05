/**
 * @jest-environment jsdom
 */
// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, React Testing Library, and their type definitions are not
// installed in this learning resource.

import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// --- A few small components to test against ---

function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>;
}

function Counter() {
  const [count, setCount] = React.useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}

function NameForm() {
  const [name, setName] = React.useState('');
  return (
    <div>
      <label htmlFor="name-input">Your name</label>
      <input
        id="name-input"
        value={name}
        onChange={event => setName(event.target.value)}
      />
      {name ? <p>Hi, {name}</p> : <p>Please enter your name</p>}
    </div>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  return <button disabled={disabled}>Submit</button>;
}

// --- 1. render() and screen queries ---
// render() mounts a component into a real (jsdom) DOM. screen is where every
// query lives afterward, there is no element handle to pass around.

test('render() plus getByText finds text that is actually on the page', () => {
  render(<Greeting name="Ada" />);
  expect(screen.getByText('Hello, Ada!')).toBeInTheDocument();
});

test('getByRole finds an element by its accessible role and name', () => {
  render(<Greeting name="Grace" />);
  const heading = screen.getByRole('heading', { name: 'Hello, Grace!' });
  expect(heading).toBeInTheDocument();
});

// --- 2. fireEvent simulates real DOM events ---
// fireEvent.click dispatches an actual "click" event, the same event the
// component's onClick handler is listening for.

test("fireEvent.click triggers the button's onClick and the DOM updates", () => {
  render(<Counter />);
  expect(screen.getByText('Count: 0')).toBeInTheDocument();

  const button = screen.getByRole('button', { name: 'Increment' });
  fireEvent.click(button);
  expect(screen.getByText('Count: 1')).toBeInTheDocument();

  fireEvent.click(button);
  fireEvent.click(button);
  expect(screen.getByText('Count: 3')).toBeInTheDocument();
});

// --- 3. getByLabelText and fireEvent.change for form inputs ---
// getByLabelText is the recommended way to find a form field, it finds the
// input the same way a person reading the label would, through the
// label's "for"/htmlFor association, not through an id selector.

test('getByLabelText plus fireEvent.change simulates typing into a controlled input', () => {
  render(<NameForm />);
  expect(screen.getByText('Please enter your name')).toBeInTheDocument();

  const input = screen.getByLabelText('Your name');
  fireEvent.change(input, { target: { value: 'Ada' } });

  expect(screen.getByText('Hi, Ada')).toBeInTheDocument();
  expect(screen.queryByText('Please enter your name')).toBe(null);
});

// --- 4. queryBy vs getBy for absent elements ---
// getBy throws an error when nothing matches, which is correct for
// asserting something IS on the page, but unusable for asserting something
// is NOT there. queryBy returns null instead of throwing, which is what a
// negative assertion needs.

test('getByText throws when nothing matches, queryByText returns null instead', () => {
  render(<Greeting name="Ada" />);

  expect(() => screen.getByText('Goodbye, Ada!')).toThrow();
  expect(screen.queryByText('Goodbye, Ada!')).toBe(null);
});

// --- 5. jest-dom's custom matchers ---
// @testing-library/jest-dom adds DOM-specific matchers like toBeDisabled,
// toBeInTheDocument, and toHaveTextContent, each reads better than the
// plain-DOM check it replaces (for example toBeDisabled instead of
// checking element.disabled === true by hand).

test('toBeDisabled and toHaveTextContent read naturally for DOM assertions', () => {
  render(<SubmitButton disabled={true} />);
  const button = screen.getByRole('button');

  expect(button).toBeDisabled();
  expect(button).toHaveTextContent('Submit');
});

// --- 6. Automatic cleanup between tests ---
// @testing-library/react automatically unmounts whatever was rendered after
// each test (through an afterEach it registers itself), so one test's
// elements never leak into the next test's queries. Calling cleanup()
// directly here just makes that automatic behavior visible.

test("the previous test's elements are gone, cleanup happens automatically", () => {
  expect(screen.queryByRole('button')).toBe(null);
  cleanup();
  expect(screen.queryByRole('button')).toBe(null);
});

# Components and Props

**Topic 43 of 89** (Section: React, 1 of 16)

## Notes

### What is a component?

A React component is just a function that returns JSX (a description of what the UI should look like). Component names must start with a capital letter, this is how JSX tells apart a custom component (`<Greeting />`) from a plain HTML tag (`<div>`).

```tsx
function Greeting() {
  return <h1>Hello!</h1>;
}
```

### Props: passing data into a component

Props ("properties") are how a parent passes data down into a component. React collects everything written as attributes on a JSX tag into a single object and passes that object as the function's first argument.

```tsx
interface GreetingProps {
  name: string;
}

function Greeting({ name }: GreetingProps) {
  return <h1>Hello, {name}!</h1>;
}

// Used like this:
<Greeting name="Ada" />
```

Destructuring the props object (`{ name }`) directly in the function's parameter list is the common convention, it avoids writing `props.name` everywhere in the component body.

### Typing props

In TypeScript, a props interface (or type alias) documents exactly what a component expects and lets the compiler catch mistakes, a missing required prop, a typo in a prop name, or a value of the wrong type, before the code ever runs.

```tsx
interface ButtonProps {
  label: string;
  variant?: "primary" | "secondary"; // the ? marks this prop optional
}
```

### Default prop values

An optional prop can be given a default value using a default function parameter. If the caller does not pass that prop, the default is used instead.

```tsx
function Button({ label, variant = "primary" }: ButtonProps) {
  return <button className={`btn btn-${variant}`}>{label}</button>;
}

<Button label="Save" />                       // renders btn-primary
<Button label="Cancel" variant="secondary" /> // renders btn-secondary
```

### The children prop

Anything written between a component's opening and closing tags is passed to it automatically as a special prop called `children`. React's type definitions provide `React.ReactNode` as the type for "anything React can render" (JSX, strings, numbers, arrays of these, or nothing).

```tsx
interface CardProps {
  title: string;
  children: React.ReactNode;
}

function Card({ title, children }: CardProps) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="card-body">{children}</div>
    </section>
  );
}

// Used like this, the <p> becomes the "children" prop:
<Card title="Notice">
  <p>Your changes have been saved.</p>
</Card>
```

### Composing components

Larger UIs are built by having components render other components, this is called composition. A component can pass its own props straight through to a child, pass a different value entirely, or mix several child components together.

```tsx
function UserProfile({ name, role }: { name: string; role: string }) {
  return (
    <Card title="User Profile">
      <Greeting name={name} />
      <p>Role: {role}</p>
      <Button label="Edit Profile" />
      <Button label="Delete" variant="secondary" />
    </Card>
  );
}
```

`UserProfile` never needs to know how `Card`, `Greeting`, or `Button` render their own markup, it only needs to know what props each one accepts. This separation is what makes components reusable and independently testable.

### Props are read-only

A component must never modify the props object it receives. React relies on this to decide when and how to re-render efficiently, and a parent re-rendering with new props should always be the only way a child's props change. If a value needs to change over time in response to user interaction, that is what component state (`useState`, covered in a later topic) is for, not a mutated prop.

### Practical tips

- One component should do one thing. If a component's JSX or prop list is growing hard to read, it is usually a sign to split part of it into a smaller child component.
- Keep props as plain, serializable-looking data (strings, numbers, booleans, simple objects, callback functions) rather than passing entire unrelated objects just because they happen to be in scope.
- A missing or misspelled prop is one of the most common React bugs, a typed `interface`/`type` for props turns that into a compile-time error instead of a silent runtime `undefined`.

## Resources

- React docs, Passing Props to a Component: <https://react.dev/learn/passing-props-to-a-component>
- React docs, Your First Component: <https://react.dev/learn/your-first-component>
- TypeScript Handbook, React section on typing props: <https://www.typescriptlang.org/docs/handbook/react.html>

## Practice / Exercises

- Write a `Badge` component that accepts a `text` prop and an optional `color` prop (defaulting to `"gray"`), and renders a `<span>` styled with that color.
- Write an `Alert` component that accepts a `children` prop and renders it inside a styled `<div>`, then nest a list (`<ul>`/`<li>`) inside it to confirm arbitrary JSX can be passed as children.

## Code Example

See [`01-components-props.tsx`](./01-components-props.tsx) in this folder.

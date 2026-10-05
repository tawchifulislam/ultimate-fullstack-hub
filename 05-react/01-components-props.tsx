// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React packages are not installed in this learning resource.

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// A function component is just a function that returns JSX.
// Props (short for "properties") are the inputs to that function,
// passed in as a single object and typically destructured.

// 1. A basic component with a typed props interface.
interface GreetingProps {
  name: string;
}

function Greeting({ name }: GreetingProps) {
  return <h1>Hello, {name}!</h1>;
}

// 2. Props can have default values using default parameters.
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
}

function Button({ label, variant = 'primary' }: ButtonProps) {
  return <button className={`btn btn-${variant}`}>{label}</button>;
}

// 3. The "children" prop lets a component wrap other JSX passed between
// its opening and closing tags. React provides a type for this.
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

// 4. Components compose: a component can render other components,
// passing its own props down or defining new ones.
interface UserProfileProps {
  name: string;
  role: string;
}

function UserProfile({ name, role }: UserProfileProps) {
  return (
    <Card title="User Profile">
      <Greeting name={name} />
      <p>Role: {role}</p>
      <Button label="Edit Profile" />
      <Button label="Delete" variant="secondary" />
    </Card>
  );
}

// 5. Render a few examples and print the resulting HTML so you can see
// exactly what each component produces.
console.log("--- Greeting with name='Ada' ---");
console.log(renderToStaticMarkup(<Greeting name="Ada" />));

console.log('\n--- Button with default variant ---');
console.log(renderToStaticMarkup(<Button label="Save" />));

console.log('\n--- Button with explicit secondary variant ---');
console.log(
  renderToStaticMarkup(<Button label="Cancel" variant="secondary" />),
);

console.log('\n--- Card with children ---');
console.log(
  renderToStaticMarkup(
    <Card title="Notice">
      <p>Your changes have been saved.</p>
    </Card>,
  ),
);

console.log('\n--- Composed UserProfile ---');
console.log(
  renderToStaticMarkup(<UserProfile name="Ada" role="Administrator" />),
);

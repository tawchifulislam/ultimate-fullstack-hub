// This file uses dynamic import() so it can stay a plain, directly runnable
// .js file (`node 19-modules.js`) without needing package.json changes.
// In real day-to-day code, the same exports would normally be consumed with
// static import syntax at the top of a file instead, for example:
//
//   import multiply, { add, PI, counter, increment } from "./19-modules-lib.mjs";
//
// Static import only works inside a file the runtime already treats as a
// module (an .mjs file, or "type": "module" in package.json), which is
// exactly why this demo file uses the dynamic form instead.

(async () => {
  // Demo 1: named exports and the default export
  const lib = await import('./19-modules-lib.mjs');
  console.log('named export, add(2, 3):', lib.add(2, 3));
  console.log('named export, PI:', lib.PI);
  console.log('default export, multiply(2, 3):', lib.default(2, 3));

  // Demo 2: imported bindings are live, not a one-time copy
  console.log('\ncounter before increment():', lib.counter);
  lib.increment();
  lib.increment();
  console.log('counter after increment() x2:', lib.counter); // reflects the change

  // Demo 3: a module's top-level code runs exactly once, ever
  console.log(
    '\nimporting the same module again (should NOT log the body again):',
  );
  const libAgain = await import('./19-modules-lib.mjs');
  console.log('same namespace object both times:', lib === libAgain);
  console.log('shared state carried over, counter is still:', libAgain.counter);
})();

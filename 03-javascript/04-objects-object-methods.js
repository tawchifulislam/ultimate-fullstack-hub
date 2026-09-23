// Demo 1: property/method shorthand and computed property names
const name = 'Ada';
const key = 'role';
const person = {
  name,
  [key]: 'Engineer',
  greet() {
    return `Hi, I'm ${this.name}`;
  },
};
console.log('shorthand object:', person);
console.log('greet():', person.greet());

// Demo 2: Object.keys / values / entries
console.log('\nObject.keys:', Object.keys(person));
console.log('Object.values:', Object.values(person));
console.log('Object.entries:', Object.entries(person));

// Demo 3: Object.assign and spread merging, later keys win
const defaults = { theme: 'light', fontSize: 14 };
const userPrefs = { fontSize: 18 };
const merged = { ...defaults, ...userPrefs };
console.log('\nmerged (spread):', merged);
console.log('merged (Object.assign):', Object.assign({}, defaults, userPrefs));

// Demo 4: Object.freeze is shallow
const frozen = Object.freeze({ a: 1, nested: { b: 2 } });
frozen.a = 999; // silently fails (throws in strict mode)
frozen.nested.b = 999; // this WORKS, freeze does not reach nested objects
console.log('\nfrozen.a (unchanged):', frozen.a);
console.log('frozen.nested.b (changed!):', frozen.nested.b);

// Demo 5: optional chaining and nullish coalescing
const config = { server: { port: 3000 } };
console.log('\nconfig?.server?.port:', config?.server?.port);
console.log('config?.database?.port:', config?.database?.port); // undefined, no throw
console.log("0 ?? 'default':", 0 ?? 'default'); // 0, since 0 is not null/undefined
console.log("0 || 'default':", 0 || 'default'); // "default", since 0 is falsy

// Demo 6: shallow copy vs deep copy
const original = { title: 'Event', details: { year: 2026 } };
const shallow = { ...original };
shallow.details.year = 3000;
console.log("\nafter mutating shallow copy's nested object:");
console.log('original.details.year (also changed!):', original.details.year);

const original2 = { title: 'Event', details: { year: 2026 } };
const deep = structuredClone(original2);
deep.details.year = 3000;
console.log("\nafter mutating structuredClone copy's nested object:");
console.log('original2.details.year (unchanged):', original2.details.year);
console.log('deep.details.year:', deep.details.year);

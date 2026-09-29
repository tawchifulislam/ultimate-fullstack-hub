// Demo 1: basic round trip
const original = { name: 'Ada', age: 30 };
const json = JSON.stringify(original);
const parsed = JSON.parse(json);
console.log('stringified:', json);
console.log('parsed back:', parsed);
console.log(
  'deep-equal but NOT the same object:',
  JSON.stringify(parsed) === json,
  original !== parsed,
);

// Demo 2: undefined/function/Symbol, dropped as properties, null in arrays
const withUnsupported = {
  a: undefined,
  b: function () {},
  c: Symbol('x'),
  d: 'kept',
};
console.log(
  '\nobject properties (dropped entirely):',
  JSON.stringify(withUnsupported),
);
console.log(
  'array elements (become null instead):',
  JSON.stringify([undefined, function () {}, Symbol('x'), 'kept']),
);

// Demo 3: NaN and Infinity become null, never omitted
console.log(
  '\nNaN/Infinity:',
  JSON.stringify({ a: NaN, b: Infinity, c: -Infinity }),
);

// Demo 4: BigInt throws
try {
  JSON.stringify({ big: 10n });
} catch (err) {
  console.log('\nBigInt threw:', err.constructor.name);
}

// Demo 5: Date, toJSON, and what parsing gives back
const withDate = { createdAt: new Date('2026-01-15T00:00:00.000Z') };
const dateJson = JSON.stringify(withDate);
console.log('\nDate stringified:', dateJson);
const dateParsed = JSON.parse(dateJson);
console.log(
  'parsed back, is it a real Date?',
  dateParsed.createdAt instanceof Date,
);
console.log('parsed back, actual type:', typeof dateParsed.createdAt);

// Demo 6: circular reference throws
const circular = { name: 'loop' };
circular.self = circular;
try {
  JSON.stringify(circular);
} catch (err) {
  console.log(
    '\ncircular reference threw:',
    err.constructor.name,
    '-',
    err.message,
  );
}

// Demo 7: replacer as a whitelist array, and as a filtering function
const user = { id: 1, name: 'Ada', password: 'secret123', role: 'admin' };
console.log(
  '\nreplacer array (whitelist):',
  JSON.stringify(user, ['name', 'role']),
);
console.log(
  'replacer function (drop password):',
  JSON.stringify(user, (key, value) =>
    key === 'password' ? undefined : value,
  ),
);

// Demo 8: space for pretty-printing
console.log('\nspace: 2 (pretty-printed):');
console.log(JSON.stringify({ a: 1, b: [2, 3] }, null, 2));

// Demo 9: reviver, turning ISO date strings back into real Dates
const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const revived = JSON.parse(dateJson, (key, value) =>
  typeof value === 'string' && isoDateRegex.test(value)
    ? new Date(value)
    : value,
);
console.log(
  '\nwith a reviver, is createdAt a real Date now?',
  revived.createdAt instanceof Date,
);

// Demo 10: the old deep-clone trick loses functions, undefined, and Dates
const complex = {
  fn: () => {},
  missing: undefined,
  when: new Date('2026-01-01'),
};
const cloned = JSON.parse(JSON.stringify(complex));
console.log('\nold trick, fn survived?', 'fn' in cloned);
console.log('old trick, missing survived?', 'missing' in cloned);
console.log('old trick, when is still a Date?', cloned.when instanceof Date);

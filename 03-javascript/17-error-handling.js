// Demo 1: finally always runs, even with a return inside try
function withFinally() {
  try {
    return 'returned from try';
  } finally {
    console.log('finally still ran, even though try already returned');
  }
}
console.log(withFinally());

// Demo 2: optional catch binding (ES2019), no (err) needed
try {
  JSON.parse('not valid json');
} catch {
  console.log('\ncaught without binding the error object at all');
}

// Demo 3: triggering real built-in error subtypes naturally
try {
  null.someProperty;
} catch (err) {
  console.log(
    '\nnull.someProperty threw:',
    err.constructor.name,
    '-',
    err instanceof TypeError,
  );
}

try {
  new Array(-1);
} catch (err) {
  console.log(
    'new Array(-1) threw:',
    err.constructor.name,
    '-',
    err instanceof RangeError,
  );
}

try {
  console.log(notDeclaredAnywhere);
} catch (err) {
  console.log(
    'undeclared variable threw:',
    err.constructor.name,
    '-',
    err instanceof ReferenceError,
  );
}

// Demo 4: custom error class, forwarding options so cause survives
class ValidationError extends Error {
  constructor(message, field, options) {
    super(message, options); // options must be forwarded for cause to work
    this.name = 'ValidationError';
    this.field = field;
  }
}

function validateEmail(email) {
  if (!email.includes('@')) {
    throw new ValidationError('Email must contain @', 'email');
  }
}

try {
  validateEmail('not-an-email');
} catch (err) {
  console.log('\ncaught:', err.name, '-', err.message, '- field:', err.field);
  console.log(
    'err instanceof ValidationError:',
    err instanceof ValidationError,
  );
  console.log('err instanceof Error:', err instanceof Error);
}

// Demo 5: chaining with { cause }, and catching specific types vs re-throwing
class StartupError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'StartupError';
  }
}

function parseConfig() {
  throw new TypeError('config.json is not valid JSON');
}

try {
  try {
    parseConfig();
  } catch (err) {
    throw new StartupError('Failed to start application', { cause: err });
  }
} catch (err) {
  console.log('\ntop-level error:', err.name, '-', err.message);
  console.log(
    'original cause preserved:',
    err.cause.constructor.name,
    '-',
    err.cause.message,
  );
}

// Demo 6: catch a known type, re-throw everything else
function handle(err) {
  if (err instanceof ValidationError) {
    console.log('\nhandled a known ValidationError on field:', err.field);
  } else {
    throw err; // don't swallow anything unrecognized
  }
}

try {
  handle(new ValidationError('bad input', 'name'));
} catch (err) {
  console.log('this should not print for a ValidationError');
}

try {
  handle(new TypeError('some unrelated bug'));
} catch (err) {
  console.log(
    're-thrown and caught here instead:',
    err.constructor.name,
    '-',
    err.message,
  );
}

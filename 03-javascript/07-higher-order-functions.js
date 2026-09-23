// Demo 1: function as an argument
function repeat(n, action) {
  for (let i = 0; i < n; i++) action(i);
}
console.log('repeat(3, ...):');
repeat(3, i => console.log('  iteration', i));

// Demo 2: function factory, returning a specialized function
function multiplyBy(factor) {
  return function (x) {
    return x * factor;
  };
}
const double = multiplyBy(2);
const triple = multiplyBy(3);
console.log('\ndouble(5):', double(5));
console.log('triple(5):', triple(5));

// Demo 3: pipe and compose
const pipe =
  (...fns) =>
  x =>
    fns.reduce((acc, fn) => fn(acc), x);
const compose =
  (...fns) =>
  x =>
    fns.reduceRight((acc, fn) => fn(acc), x);

const addOne = x => x + 1;
const timesTwo = x => x * 2;

console.log('\npipe(addOne, timesTwo)(5):', pipe(addOne, timesTwo)(5)); // (5+1)*2 = 12
console.log('compose(addOne, timesTwo)(5):', compose(addOne, timesTwo)(5)); // (5*2)+1 = 11

// Demo 4: currying
const add3 = a => b => c => a + b + c;
console.log('\nadd3(1)(2)(3):', add3(1)(2)(3));

const add10 = add3(10); // partially applied, waiting for two more args
console.log('add10(5)(1):', add10(5)(1));

// Demo 5: decorator / wrapping pattern
function withLogging(fn) {
  return function (...args) {
    console.log(`  calling ${fn.name} with`, args);
    const result = fn(...args);
    console.log('  result:', result);
    return result;
  };
}
function square(x) {
  return x * x;
}
console.log('\nwithLogging(square)(4):');
const loggedSquare = withLogging(square);
loggedSquare(4);

// Demo 6: once(), a practical higher-order function
function once(fn) {
  let called = false;
  let cachedResult;
  return function (...args) {
    if (!called) {
      cachedResult = fn(...args);
      called = true;
    }
    return cachedResult;
  };
}
let expensiveCallCount = 0;
function expensiveSetup() {
  expensiveCallCount++;
  return 'setup complete';
}
const setupOnce = once(expensiveSetup);
console.log('\nsetupOnce():', setupOnce());
console.log('setupOnce() again:', setupOnce());
console.log('expensiveSetup actually ran this many times:', expensiveCallCount);

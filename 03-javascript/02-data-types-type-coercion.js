// Demo 1: typeof, including the famous null quirk
console.log('typeof 42:', typeof 42);
console.log("typeof 'str':", typeof 'str');
console.log('typeof true:', typeof true);
console.log('typeof undefined:', typeof undefined);
console.log('typeof null:', typeof null); // "object", the historical quirk
console.log('typeof NaN:', typeof NaN); // "number"
console.log('typeof []:', typeof []); // "object"
console.log('typeof {}:', typeof {}); // "object"
console.log('Array.isArray([]):', Array.isArray([])); // true, the reliable array check

// Demo 2: coercion surprises
console.log('\ncoercion:');
console.log('"5" + 3 =', '5' + 3); // "53"
console.log('"5" - 3 =', '5' - 3); // 2
console.log('"5" * "2" =', '5' * '2'); // 10
console.log('true + true =', true + true); // 2
console.log('[] + [] =', JSON.stringify([] + [])); // ""

// Demo 3: == vs ===
console.log('\n== vs ===:');
console.log('0 == "0":', 0 == '0'); // true
console.log('0 === "0":', 0 === '0'); // false
console.log('0 == []:', 0 == []); // true
const emptyArray = [];
console.log('0 === []:', 0 === emptyArray); // false: arrays are compared by reference
console.log('null == undefined:', null == undefined); // true
console.log('null === undefined:', null === undefined); // false

// Demo 4: NaN is never equal to itself
console.log('\nNaN behavior:');
console.log('NaN === NaN:', NaN === NaN); // false
console.log('Number.isNaN(NaN):', Number.isNaN(NaN)); // true

// Demo 5: Number.isNaN vs global isNaN
console.log('\nNumber.isNaN vs global isNaN:');
console.log('global isNaN("hello"):', isNaN('hello')); // true, coerces "hello" to NaN first
console.log('Number.isNaN("hello"):', Number.isNaN('hello')); // false, no coercion, "hello" is not the value NaN
console.log('Number.isNaN(NaN):', Number.isNaN(NaN)); // true

// Demo 6: truthy and falsy
console.log('\ntruthy/falsy surprises:');
const falsyValues = [false, 0, 0n, '', null, undefined, NaN];
falsyValues.forEach(v => console.log(`  Boolean(${String(v)}) =`, Boolean(v)));

const looksEmptyButTruthy = ['0', [], {}];
looksEmptyButTruthy.forEach(v =>
  console.log(`  Boolean(${JSON.stringify(v)}) =`, Boolean(v)),
);

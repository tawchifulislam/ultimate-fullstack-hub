// Demo 1: sort() mutates, even though it also returns a value
const original = [3, 1, 2];
const sorted = original.sort();
console.log('original after sort():', original); // mutated too!
console.log("sort()'s return value:", sorted);
console.log('same array reference?', original === sorted);

// Demo 2: the new non-mutating equivalent
const original2 = [3, 1, 2];
const sortedCopy = original2.toSorted();
console.log('\noriginal2 after toSorted():', original2); // unchanged
console.log("toSorted()'s return value:", sortedCopy);

// Demo 3: sort()'s default string-based comparison trap
console.log('\n[10, 1, 2].sort() with no compare fn:', [10, 1, 2].sort());
console.log(
  '[10, 1, 2].sort((a, b) => a - b):',
  [10, 1, 2].sort((a, b) => a - b),
);

// Demo 4: map, filter, reduce, chained
const orders = [
  { item: 'book', price: 12, paid: true },
  { item: 'pen', price: 2, paid: false },
  { item: 'lamp', price: 40, paid: true },
];

const totalPaid = orders
  .filter(o => o.paid)
  .map(o => o.price)
  .reduce((sum, price) => sum + price, 0);
console.log('\ntotal of paid orders:', totalPaid);

// Demo 5: forEach returns undefined, no early break
const forEachResult = [1, 2, 3].forEach(n => n * 2);
console.log("\nforEach's return value:", forEachResult);

// Demo 6: reduce without an initial value on an empty array throws
try {
  [].reduce((acc, n) => acc + n);
} catch (err) {
  console.log(
    'reduce with no initial value on [] threw:',
    err.constructor.name,
  );
}

// Demo 7: implementing map using only reduce
function myMap(arr, callback) {
  return arr.reduce((acc, item, index) => {
    acc.push(callback(item, index, arr));
    return acc;
  }, []);
}
console.log(
  '\nmyMap([1,2,3], x => x * 10):',
  myMap([1, 2, 3], x => x * 10),
);
console.log(
  'matches built-in map?',
  JSON.stringify(myMap([1, 2, 3], x => x * 10)) ===
    JSON.stringify([1, 2, 3].map(x => x * 10)),
);

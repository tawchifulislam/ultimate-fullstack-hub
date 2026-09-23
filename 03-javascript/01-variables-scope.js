// Demo 1: var ignores block scope, let respects it
function blockScopeDemo() {
  if (true) {
    var varInsideBlock = 'I leak out of the block';
    let letInsideBlock = 'I stay inside the block';
  }
  console.log('var outside block:', varInsideBlock); // works, var ignores blocks
  try {
    console.log('let outside block:', letInsideBlock);
  } catch (err) {
    console.log('let outside block threw:', err.constructor.name);
  }
}
blockScopeDemo();

// Demo 2: hoisting behavior, var vs let (temporal dead zone)
function hoistingDemo() {
  console.log('reading var before its declaration:', hoistedVar); // undefined, not an error
  var hoistedVar = 'now assigned';

  try {
    console.log(hoistedLet); // throws, still in the temporal dead zone
  } catch (err) {
    console.log(
      'reading let before its declaration threw:',
      err.constructor.name,
    );
  }
  let hoistedLet = 'now assigned';
}
hoistingDemo();

// Demo 3: the classic var-in-a-loop pitfall, and the let fix
console.log('var in a loop with setTimeout:');
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log('  var i:', i), 0);
}

console.log('let in a loop with setTimeout:');
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log('  let j:', j), 0);
}

// Demo 4: const protects the binding, not the value
const list = [1, 2, 3];
list.push(4); // fine, mutating the array itself
console.log('const array after push:', list);

try {
  list = []; // throws, rebinding the const itself
} catch (err) {
  console.log('reassigning a const threw:', err.constructor.name);
}

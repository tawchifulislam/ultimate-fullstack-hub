// Demo 1: independent counters, each with its own closed-over count
function makeCounter() {
  let count = 0;
  return function () {
    count++;
    return count;
  };
}
const counterA = makeCounter();
const counterB = makeCounter();
console.log('counterA():', counterA());
console.log('counterA():', counterA());
console.log('counterB():', counterB()); // independent, starts at 1 again
console.log('counterA():', counterA());

// Demo 2: the var-in-a-loop pitfall, and the let fix, using closures directly
function createFunctionsVar() {
  const fns = [];
  for (var i = 0; i < 3; i++) {
    fns.push(function () {
      return i;
    });
  }
  return fns;
}
function createFunctionsLet() {
  const fns = [];
  for (let i = 0; i < 3; i++) {
    fns.push(function () {
      return i;
    });
  }
  return fns;
}
console.log(
  '\nvar-based closures, all share one i:',
  createFunctionsVar().map(fn => fn()),
);
console.log(
  'let-based closures, each gets its own i:',
  createFunctionsLet().map(fn => fn()),
);

// Demo 3: module pattern, true data privacy via closure
function createBankAccount(initialBalance) {
  let balance = initialBalance; // not accessible from outside at all

  return {
    deposit(amount) {
      balance += amount;
      return balance;
    },
    withdraw(amount) {
      if (amount > balance) {
        throw new Error('Insufficient funds');
      }
      balance -= amount;
      return balance;
    },
    getBalance() {
      return balance;
    },
  };
}
const account = createBankAccount(100);
console.log('\nstarting balance:', account.getBalance());
console.log('after deposit(50):', account.deposit(50));
console.log('after withdraw(30):', account.withdraw(30));
console.log('direct access to balance property:', account.balance); // undefined, truly private

// Demo 4: closures capturing only what they actually use (illustrative, not GC-observable directly)
function outer() {
  const used = 'I am captured';
  const unused = 'I am not referenced by the inner function';
  return function inner() {
    return used;
  };
}
const innerFn = outer();
console.log('\ninner() only returns the captured variable:', innerFn());

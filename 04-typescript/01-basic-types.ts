// Demo 1: primitives and inference
let age: number = 30;
let userName: string = 'Ada';
let isActive: boolean = true;
console.log('age, userName, isActive:', age, userName, isActive);

let inferredAge = 30; // inferred as number
console.log('typeof inferredAge at runtime:', typeof inferredAge); // "number", the annotation itself is erased

// Demo 2: arrays and tuples
let numbers: number[] = [1, 2, 3];
let pair: [string, number] = ['Ada', 30];
console.log('numbers:', numbers, 'pair:', pair);

// Demo 3: any vs unknown
let anyValue: any = 'hello';
console.log('any lets anything through:', anyValue.toUpperCase()); // allowed, unchecked

let unknownValue: unknown = 'hello';
// unknownValue.toUpperCase(); // would NOT compile: error TS18046 "is of type 'unknown'"
if (typeof unknownValue === 'string') {
  console.log('unknown, narrowed first:', unknownValue.toUpperCase()); // fine once narrowed
}

// Demo 4: void and never
function logMessage(): void {
  console.log('void function still actually returns:', logMessage.name);
}
logMessage();

function fail(message: string): never {
  throw new Error(message);
}
try {
  fail('this always throws');
} catch (err) {
  console.log('fail() threw as expected:', (err as Error).message);
}

// Demo 5: union and literal types
let id: string | number = 42;
id = 'forty-two'; // also valid, it's a union
console.log('id can be either type:', id);

let orderStatus: 'pending' | 'active' | 'done' = 'pending';
orderStatus = 'active'; // valid, one of the allowed literals
console.log('orderStatus:', orderStatus);

// Demo 6: type assertion
let someValue: unknown = 'hello world';
let strLength = (someValue as string).length;
console.log('length via type assertion:', strLength);

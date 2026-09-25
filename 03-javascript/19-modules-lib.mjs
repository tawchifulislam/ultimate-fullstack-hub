console.log("(lib module body evaluated, this should only print once)");

export function add(a, b) {
  return a + b;
}

export const PI = 3.14159;

export let counter = 0;
export function increment() {
  counter++;
}

export default function multiply(a, b) {
  return a * b;
}

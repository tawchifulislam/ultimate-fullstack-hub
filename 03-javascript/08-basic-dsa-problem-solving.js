// Demo 1: Two Sum, naive O(n^2) vs hash map O(n)
function twoSumNaive(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return null;
}

function twoSumHashMap(nums, target) {
  const seen = new Map(); // value -> index
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) return [seen.get(complement), i];
    seen.set(nums[i], i);
  }
  return null;
}

console.log('twoSumNaive([2,7,11,15], 9):', twoSumNaive([2, 7, 11, 15], 9));
console.log('twoSumHashMap([2,7,11,15], 9):', twoSumHashMap([2, 7, 11, 15], 9));

// Demo 2: two-pointer palindrome check
function isPalindrome(str) {
  let left = 0;
  let right = str.length - 1;
  while (left < right) {
    if (str[left] !== str[right]) return false;
    left++;
    right--;
  }
  return true;
}
console.log("\nisPalindrome('racecar'):", isPalindrome('racecar'));
console.log("isPalindrome('hello'):", isPalindrome('hello'));

// Demo 3: sliding window, max sum of k consecutive elements
function maxSumSubarray(arr, k) {
  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += arr[i];
  let maxSum = windowSum;
  for (let i = k; i < arr.length; i++) {
    windowSum += arr[i] - arr[i - k]; // slide: add new, remove old
    maxSum = Math.max(maxSum, windowSum);
  }
  return maxSum;
}
console.log(
  '\nmaxSumSubarray([2,1,5,1,3,2], 3):',
  maxSumSubarray([2, 1, 5, 1, 3, 2], 3),
);

// Demo 4: anagram check via frequency count
function isAnagram(a, b) {
  if (a.length !== b.length) return false;
  const counts = {};
  for (const ch of a) counts[ch] = (counts[ch] || 0) + 1;
  for (const ch of b) {
    if (!counts[ch]) return false;
    counts[ch]--;
  }
  return true;
}
console.log("\nisAnagram('listen', 'silent'):", isAnagram('listen', 'silent'));
console.log("isAnagram('hello', 'world'):", isAnagram('hello', 'world'));

// Demo 5: recursion, base case + recursive case
function factorial(n) {
  if (n <= 1) return 1; // base case
  return n * factorial(n - 1); // recursive case
}
console.log('\nfactorial(5):', factorial(5));

// Demo 6: naive vs memoized Fibonacci, timed to make O(2^n) vs O(n) concrete
function fibNaive(n) {
  if (n <= 1) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}

function makeMemoizedFib() {
  const cache = new Map();
  function fib(n) {
    if (n <= 1) return n;
    if (cache.has(n)) return cache.get(n);
    const result = fib(n - 1) + fib(n - 2);
    cache.set(n, result);
    return result;
  }
  return fib;
}
const fibMemo = makeMemoizedFib();

const N = 30;
let start = Date.now();
const naiveResult = fibNaive(N);
const naiveMs = Date.now() - start;

start = Date.now();
const memoResult = fibMemo(N);
const memoMs = Date.now() - start;

console.log(`\nfibNaive(${N}) = ${naiveResult}, took ${naiveMs}ms`);
console.log(`fibMemo(${N}) = ${memoResult}, took ${memoMs}ms`);

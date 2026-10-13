const fs = require("fs");

const lockFile = __dirname + "/lock.txt";
try {
  fs.unlinkSync(lockFile);
} catch {
  /* fine if it didn't exist yet */
}

// The "wx" flag means "write, but fail if the file already exists" instead
// of silently overwriting it, the "w" flag's default behavior. This is the
// building block for a real file-based lock: only one caller can ever win
// the race to create the file.
fs.writeFileSync(lockFile, "locked by process A\n", { flag: "wx" });
console.log("first writeFileSync with wx: succeeded, lock acquired");

try {
  fs.writeFileSync(lockFile, "locked by process B\n", { flag: "wx" });
  console.log("second writeFileSync with wx: succeeded (this should not print)");
} catch (err) {
  console.log("second writeFileSync with wx: failed as expected ->", err.code);
}

// For comparison: the default "w" flag would have silently overwritten it.
fs.writeFileSync(lockFile, "overwritten by process C\n", { flag: "w" });
console.log("writeFileSync with the default 'w' flag: silently overwrote ->", fs.readFileSync(lockFile, "utf8").trim());

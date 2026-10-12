// Inside an I/O callback, the race above has only one possible winner.
// fs.readFile's callback runs in the poll phase; once poll has no more
// work, the loop moves straight into the check phase, where setImmediate
// callbacks live, before timers gets another turn. So setImmediate always
// wins here, no matter how many times you run this file.
const fs = require("fs");

fs.readFile(__filename, () => {
  setTimeout(() => console.log("timeout"), 0);
  setImmediate(() => console.log("immediate"));
});

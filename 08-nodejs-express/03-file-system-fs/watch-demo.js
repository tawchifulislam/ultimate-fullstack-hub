const fs = require("fs");
const path = require("path");

const watchedFile = path.join(__dirname, "watched.txt");
fs.writeFileSync(watchedFile, "initial content\n");

const watcher = fs.watch(watchedFile, (eventType, filename) => {
  console.log(`fs.watch fired: eventType=${eventType}, filename=${filename}`);
  watcher.close();
  console.log("watcher closed, exiting");
});

console.log("watching", watchedFile);

// Simulate some other process/editor modifying the file a moment later.
setTimeout(() => {
  fs.writeFileSync(watchedFile, "changed content\n");
  console.log("wrote new content to the watched file");
}, 200);

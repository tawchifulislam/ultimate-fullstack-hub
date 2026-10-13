const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "project", "nested", "deep");
fs.mkdirSync(dir, { recursive: true }); // recursive: true creates every missing parent too
fs.writeFileSync(path.join(dir, "note.txt"), "a short note\n");

console.log("created:", dir);

const entries = fs.readdirSync(path.join(__dirname, "project"), { withFileTypes: true });
for (const entry of entries) {
  console.log(`  ${entry.isDirectory() ? "[dir] " : "[file]"} ${entry.name}`);
}

const stat = fs.statSync(path.join(dir, "note.txt"));
console.log("note.txt stats:");
console.log("  size       :", stat.size, "bytes");
console.log("  isFile()   :", stat.isFile());
console.log("  isDirectory():", stat.isDirectory());
console.log("  modified   :", stat.mtime.toISOString());

fs.rmSync(path.join(__dirname, "project"), { recursive: true }); // recursive: true to remove a non-empty directory
console.log("removed project/ recursively, still exists?", fs.existsSync(path.join(__dirname, "project")));

# File System (fs)

**Topic 73 of 89** (Section: Node.js / Express, 3 of 12)

## Notes

### Project structure

```text
make-big-file.js            -> generates a 400MB big.bin used by several demos below
api-styles.js                -> callback, promise, and sync versions of the same read
sync-blocks-event-loop.js    -> proof that a sync fs call freezes the whole process
async-does-not-block.js       -> the same read, async, for comparison
whole-file-memory.js         -> memory cost of loading an entire file at once
stream-memory.js              -> memory cost of streaming the same file in chunks
exclusive-write.js            -> the "wx" flag for atomic, race-safe file creation
watch-demo.js                  -> fs.watch firing on a real file change
dir-and-stats.js               -> recursive mkdir/rm, readdir, and fs.statSync
```

### Three API styles, same operation

```js
fs.readFile(file, "utf8", (err, data) => { ... });        // callback: the original API
await fsPromises.readFile(file, "utf8");                    // fs/promises: async/await-friendly
const data = fs.readFileSync(file, "utf8");                 // sync: blocks, returns directly
```

Verified directly, `api-styles.js`'s output shows the execution order these three imply:

```text
sync style    : "Hello from the fs module.\n"
(this line runs before the callback/promise logs above print,
 since those are async and this synchronous code runs first)
callback style: "Hello from the fs module.\n"
promise style : "Hello from the fs module.\n"
```

The sync call's result and the line after it print *before* either async result, even though the async calls were made first in the source, because the synchronous code finishes the current turn before Node ever gets to the callback/microtask queues.

### A sync fs call blocks the entire event loop, not just your function

This is the most important practical fact in this topic. `sync-blocks-event-loop.js` starts a timer ticking every 20ms, then calls `fs.readFileSync` on a 400MB file. Verified directly:

text
starting readFileSync on a 400MB file...
readFileSync returned 419430400 bytes, took 257ms
during that time, how many ticks fired? count them above.
tick 1 at 264ms
tick 2 at 285ms
...

```text

Zero ticks fired during the entire 257ms read, the first tick only appears at 264ms, right after `readFileSync` returned. A timer scheduled for every 20ms should have fired about 12 times during that window; it fired zero, because `readFileSync` blocks the single JS thread completely, nothing else, not timers, not other requests in a real server, can run until it returns.

`async-does-not-block.js` runs the identical read with `fs.readFile` instead. Verified directly:

```text
starting fs.readFile (async) on the same 400MB file...
tick 1 at 20ms
tick 2 at 39ms
...
tick 17 at 340ms
fs.readFile callback returned 419430400 bytes, took 337ms
ticks that fired WHILE the read was in flight: 17
```

17 ticks fired, right on schedule, while the exact same read was happening in the background through libuv's thread pool (Topic 72). This is why a real Node server should essentially never call a `*Sync` fs function while handling a request, doing so freezes every other connection the server is handling at that moment.

### Loading a whole file vs streaming it: the memory difference is real

`whole-file-memory.js` reads the same 400MB file with `readFileSync`; `stream-memory.js` reads it with `createReadStream` in 64KB chunks. Each run in its own fresh process so the numbers aren't contaminated by the other. Verified directly:

```text
# whole-file-memory.js
readFileSync: loaded 419430400 bytes
process RSS: 39.4MB -> 439.7MB        <- +400MB, the entire file, held at once

# stream-memory.js
createReadStream: streamed 419430400 bytes in 64KB chunks
process RSS: 39.5MB -> 83.0MB, peak while streaming: 83.0MB   <- +43MB, never the whole file at once
```

`readFileSync` makes the process's memory grow by almost exactly the file's size, because the entire file has to live in memory at once before you get it back. The stream's peak memory barely moved, because at any instant it's only holding one small chunk (plus some internal buffering), handing each one off to be processed before reading the next. This is why serving or processing a large file (a video, a big CSV export, a multi-gigabyte log) should go through a stream, not `readFile`, regardless of whether it's sync or async.

### The "wx" flag: atomic, race-safe file creation

```js
fs.writeFileSync(lockFile, "locked by process A\n", { flag: "wx" }); // fails instead of overwriting, if the file exists
```

Verified directly:

```text
first writeFileSync with wx: succeeded, lock acquired
second writeFileSync with wx: failed as expected -> EEXIST
writeFileSync with the default 'w' flag: silently overwrote -> overwritten by process C
```

The default `"w"` flag creates-or-truncates silently, a second writer never finds out it collided with a first one. `"wx"` throws `EEXIST` instead, which is the building block for a real file-based lock or a "don't clobber an existing export" safety check: whichever caller's `wx` write succeeds genuinely won the race, and anyone else's `wx` write reliably fails.

### fs.watch reports real filesystem changes

```js
const watcher = fs.watch(watchedFile, (eventType, filename) => { ... });
```

Verified directly, with a file write happening 200ms after the watcher starts:

```text
watching /tmp/topic73-build/watched.txt
wrote new content to the watched file
fs.watch fired: eventType=change, filename=watched.txt
watcher closed, exiting
```

`fs.watch` is the lower-level, event-driven way to react to changes (used by things like dev-server auto-reload); it's less portable across operating systems than it looks (events and exact behavior can differ between Linux, macOS, and Windows), which is why most production file-watching tools (like `chokidar`) build extra polling and de-duplication logic on top of it rather than using it completely raw.

### Directories and stats

```js
fs.mkdirSync(dir, { recursive: true });            // creates every missing parent directory too
fs.readdirSync(dir, { withFileTypes: true });        // entries know isFile()/isDirectory() without a second stat call
fs.statSync(file);                                    // size, isFile(), isDirectory(), mtime, ...
fs.rmSync(dir, { recursive: true });                  // removes a non-empty directory tree
```

Verified directly:

```text
created: /tmp/topic73-build/project/nested/deep
  [dir]  nested
note.txt stats:
  size       : 13 bytes
  isFile()   : true
  isDirectory(): false
  modified   : 2026-10-12T07:54:59.944Z
removed project/ recursively, still exists? false
```

### Practical tips

- Reach for `fs/promises` with `async`/`await` as the default in application code; reserve `*Sync` functions for one-off scripts and truly startup-time code (reading a config file before the server starts accepting requests is fine, since nothing is being blocked from the user's perspective yet).
- Never call a `*Sync` fs function inside a request handler or any other code that runs while a server is live; the blocking demo above is exactly what that does to every other in-flight request.
- Default to streams for anything that could plausibly be large (uploads, downloads, log processing, CSV export); `readFile`'s simplicity isn't worth an out-of-memory crash on a file bigger than expected.
- Always build paths with `path.join(__dirname, ...)` rather than string concatenation, it handles the OS-specific separator and avoids a whole class of `../../etc/passwd`-style path-traversal bugs when any part of the path comes from user input.

## Resources

- Node.js Docs, File system (fs): <https://nodejs.org/api/fs.html>
- Node.js Docs, fs/promises API: <https://nodejs.org/api/fs.html#promises-api>
- Node.js Docs, fs.watch Caveats: <https://nodejs.org/api/fs.html#caveats>
- Node.js Docs, Don't Block the Event Loop: <https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop>

## Practice

1. Run `make-big-file.js` once, then run `sync-blocks-event-loop.js` with a smaller file (say 20MB) and see how much less dramatic the blocking becomes, relating the pause length back to file size.
2. Change `stream-memory.js`'s `highWaterMark` to `1024 * 1024 * 50` (50MB chunks) and rerun it, comparing the new peak RSS to the 64KB-chunk version above.
3. Modify `exclusive-write.js` to attempt the second `wx` write from inside a `try/catch` in a loop that retries with a different filename, simulating how a real queue worker might claim a uniquely-named job file.
4. Add a second `fs.watch` call on the whole `project/` directory from `dir-and-stats.js` (before the `rmSync` call) and observe how many separate events fire for a single `mkdirSync({ recursive: true })` call.
5. Rewrite `whole-file-memory.js` to use `fs.promises.readFile` instead of the sync version, and confirm the memory growth is the same, proving the memory cost comes from loading the whole file, not from being synchronous.

## Code Example

- [make-big-file.js](./03-file-system-fs/make-big-file.js)
- [api-styles.js](./03-file-system-fs/api-styles.js)
- [sync-blocks-event-loop.js](./03-file-system-fs/sync-blocks-event-loop.js)
- [async-does-not-block.js](./03-file-system-fs/async-does-not-block.js)
- [whole-file-memory.js](./03-file-system-fs/whole-file-memory.js)
- [stream-memory.js](./03-file-system-fs/stream-memory.js)
- [exclusive-write.js](./03-file-system-fs/exclusive-write.js)
- [watch-demo.js](./03-file-system-fs/watch-demo.js)
- [dir-and-stats.js](./03-file-system-fs/dir-and-stats.js)

To run it yourself: with just Node.js installed, first run `node make-big-file.js` once (creates a 400MB `big.bin` in the same folder, not included in this download), then run any of the other files with `node <file>.js`. `exclusive-write.js`, `watch-demo.js`, and `dir-and-stats.js` need no big file and can be run immediately.

# Merge Conflict Resolution

**Topic 11 of 89** (Section: Git & GitHub, 3 of 4)

## Notes

### What is a merge conflict?

A merge conflict happens when Git cannot automatically combine changes from two branches, because both sides changed the same part of a file in different ways (or one branch modified a file the other branch deleted). Git is deliberately conservative here: it will merge non-overlapping changes automatically without asking, but the moment two changes genuinely overlap and disagree, it stops and asks a human to decide, rather than guessing at intent.

### When conflicts actually happen

Two branches editing the *same file* is not enough to cause a conflict; Git merges changes to different lines of the same file just fine. A conflict needs an actual overlap: the same lines changed differently on each side, or one side deleting a file the other side is still editing.

### Anatomy of a conflict marker

When a conflict occurs, Git writes conflict markers directly into the affected file:

```console
<<<<<<< HEAD
your current branch's version of this section
=======
the incoming branch's version of this section
>>>>>>> other-branch-name
```

- Between `<<<<<<< HEAD` and `=======` is the content from the branch you are currently on.
- Between `=======` and `>>>>>>> other-branch-name` is the content coming in from the branch being merged.

### Resolving a conflict, step by step

1. Run `git status` to see which files are listed under "Unmerged paths."
2. Open each conflicted file and find the marker blocks.
3. Edit the file by hand: keep one side, the other, a combination, or something new entirely, then delete the `<<<<<<<`, `=======`, and `>>>>>>>` marker lines completely.
4. Stage the resolved file with `git add <file>`, this is what tells Git the conflict in that file is resolved.
5. Once every conflicted file is staged, run `git commit` (no `-m` needed; Git pre-fills a merge commit message you can edit or accept) to finish the merge.

### Aborting a merge

If a merge turns out to be too messy to resolve right now, `git merge --abort` cancels it and returns everything to exactly how it was before the merge started.

### Tools that help

- `git status`: the single best command to check during a conflict, it always shows exactly what is resolved and what still needs attention.
- Most editors, including VS Code, detect conflict markers automatically and offer "Accept Current Change," "Accept Incoming Change," or "Accept Both Changes" actions.
- `git checkout --ours <file>` / `git checkout --theirs <file>`: keep one side's entire version of a file and discard the other without manual editing; use carefully, since this replaces the whole file, not just the conflicting lines.

### Practical tips

- Merge or pull frequently to keep branches from diverging too far; small, frequent merges produce small, easy conflicts, while long-lived branches accumulate large, painful ones.
- After resolving a conflict, re-run and re-test the code; a resolution can look syntactically fine while still being logically wrong.
- If two people know they are about to touch the same area of code, a quick heads-up before starting often avoids the conflict entirely.

## Resources

- Pro Git book, Basic Branching and Merging (covers Basic Merge Conflicts): <https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging>
- Pro Git book, Advanced Merging: <https://git-scm.com/book/en/v2/Git-Tools-Advanced-Merging>
- git-merge documentation: <https://git-scm.com/docs/git-merge>

## Practice / Exercises

- Deliberately create a conflict: on two branches, change the exact same line of the same file to two different values, then merge one into the other and resolve it by hand.
- Try `git merge --abort` mid-conflict, confirm the working directory returned to its pre-merge state, then redo the merge and resolve it properly this time.

## Code Example

See [`03-merge-conflict-resolution.sh`](./03-merge-conflict-resolution.sh) in this folder.

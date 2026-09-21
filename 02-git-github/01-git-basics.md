# Git Basics (init, add, commit, push, pull)

**Topic 9 of 89** (Section: Git & GitHub, 1 of 4)

## Notes

### What is Git?

Git is a distributed version control system: it tracks how files change over time and lets multiple people work on the same codebase without overwriting each other's work. "Distributed" means every clone of a repository carries the full history, not just a pointer to a central server.

### The areas Git works across

- **Working directory**: the actual files on disk that you edit.
- **Staging area (the index)**: a holding area for changes you intend to include in the next commit.
- **Local repository**: the committed history, stored in the hidden `.git` folder.
- **Remote repository**: a copy hosted elsewhere, such as on GitHub, used to share work with others or back it up.

### Core commands

- `git init`: turns the current folder into a Git repository by creating a `.git` directory.
- `git status`: shows what is staged, modified, or untracked right now.
- `git add <file>` (or `git add .` for everything): stages changes for the next commit.
- `git commit -m "message"`: permanently records the staged changes as a new point in history.
- `git log` (or `git log --oneline`): shows the commit history.
- `git remote add origin <url>`: links the local repository to a remote one, named `origin` by convention.
- `git push -u origin main`: uploads local commits to the remote. The `-u` flag sets that branch to track `origin/main`, so later a plain `git push` or `git pull` is enough.
- `git pull`: downloads changes from the remote and merges them into the current local branch; it is really `git fetch` followed by a merge.
- `git clone <url>`: copies an existing remote repository onto your machine, `.git` history included.

### Typical first-time setup

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <url>
git push -u origin main
```

### Typical day-to-day loop

```bash
git pull
# make changes
git add .
git commit -m "..."
git push
```

### .gitignore

A plain text file listing patterns Git should never track, such as `node_modules/`, `.env`, or build output folders. It prevents committing secrets, dependencies, and generated files that do not belong in history.

### Practical tips

- Commit often, with small, focused, descriptive messages; a small commit is far easier to review or revert than one giant one.
- Run `git status` constantly while learning; it tells you exactly what state the working directory and staging area are in.
- Never commit secrets like API keys or passwords; keep them in `.gitignore`'d files or environment variables instead.

## Resources

- Pro Git book, Git Basics: <https://git-scm.com/book/en/v2/Git-Basics-Getting-a-Git-Repository>
- Official Git tutorial (gittutorial): <https://git-scm.com/docs/gittutorial>
- git-push documentation: <https://git-scm.com/docs/git-push>

## Practice / Exercises

- Create a new folder, run `git init`, and make three separate commits, each doing one small, distinct thing.
- Push that folder to a new empty GitHub repository using the first-time setup commands above.

## Code Example

See [`01-git-basics.sh`](./01-git-basics.sh) in this folder.

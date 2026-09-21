# 2. Git & GitHub

This is the second section of the Full Stack Skill Roadmap. It covers version control: tracking changes to a codebase over time, working on isolated branches, resolving conflicts when two changes collide, and collaborating with others through pull requests and code review. Unlike the HTML/CSS section, the "code" here is mostly command-line workflows and GitHub itself rather than a programming language, so the code examples are shell scripts and CLI walkthroughs instead of runnable pages.

## Topics in this section

| # | Topic | What it covers | Files |
| --- | ------- | ----------------- | ------- |
| 1 | Git Basics (init, add, commit, push, pull) | The working directory, staging area, local repository, and remote; the core command loop of `add`, `commit`, `push`, and `pull`; first-time setup vs day-to-day use. | [Notes](./01-git-basics.md) &middot; [Script](./01-git-basics.sh) |
| 2 | Branching | Branches as movable pointers to a commit; `git switch`/`switch -c`; naming conventions; the difference between a fast-forward merge and a three-way merge commit. | [Notes](./02-branching.md) &middot; [Script](./02-branching.sh) |
| 3 | Merge Conflict Resolution | Why conflicts happen (and when they don't), reading `<<<<<<<`/`=======`/`>>>>>>>` markers, resolving and staging a conflicted file, and `git merge --abort`. | [Notes](./03-merge-conflict-resolution.md) &middot; [Script](./03-merge-conflict-resolution.sh) |
| 4 | Pull Request & Code Review Workflow | Opening a PR, writing a good description, the three GitHub merge strategies (merge commit, squash, rebase), and review etiquette for both authors and reviewers. | [Notes](./04-pull-request-code-review-workflow.md) &middot; [Script](./04-pull-request-code-review-workflow.sh) |

## How the section fits together

Git basics (Topic 1) is the minimum loop needed to save and share work at all. Branching (Topic 2) is what makes it safe to work on something without touching the stable codebase, and the moment two branches touch the same content differently, that is exactly when a merge conflict (Topic 3) shows up, so conflict resolution is really just the branching model's edge case made concrete. Pull requests (Topic 4) then wrap that same branch-and-merge mechanism in a collaborative layer: discussion, automated checks, and review, before a merge that Topics 1 to 3 already explain the mechanics of actually happens.

## How each topic is structured

Every topic has two files:

- An explanation file (`.md`): what the concept is, why it matters, a resources list linking to official Git or GitHub documentation, and practice exercises.
- A matching script (`.sh`): either a runnable, commented walkthrough (Topics 1 to 3 can be run directly in an empty test folder) or, where a real GitHub repository and authentication are required (Topic 4's `gh` CLI commands), a reference walkthrough with the exact commands to run yourself.

## Suggested capstone exercise

Create a new repository, then run through the whole cycle end to end: initialize it and make an initial commit, branch off to add a small feature, deliberately create and resolve a merge conflict against a second branch, push everything to GitHub, and open a real pull request for the feature branch, writing a full description and merging it using whichever strategy fits.

## Previous section

[HTML / CSS](../01-html-css/README.md)

## Next section

[JavaScript](../03-javascript/README.md)

[Back to main roadmap](../README.md)

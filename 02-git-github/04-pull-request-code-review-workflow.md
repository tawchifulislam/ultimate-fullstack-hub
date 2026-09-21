# Pull Request & Code Review Workflow

**Topic 12 of 89** (Section: Git & GitHub, 4 of 4)

## Notes

### What is a pull request?

A pull request (PR) proposes merging changes from one branch into another, along with a dedicated place to discuss, review, and run automated checks against those changes before they are actually merged. It turns a set of code changes into a conversation instead of a silent merge. A pull request is a GitHub (and similar platforms') feature built on top of Git; Git itself has no built-in concept of a pull request.

### The typical PR workflow

1. Create a feature branch and commit your changes on it, then push it: `git push -u origin <branch>`.
2. Open a pull request from your feature branch into the target branch (usually `main`), with a clear title and a description of what changed and why.
3. Automated checks (CI: tests, linting, builds) run against the PR automatically.
4. Reviewers read the diff, leave comments, and submit a review as Comment, Approve, or Request changes.
5. Address feedback with more commits pushed to the same branch; the open PR updates automatically, no need to open a new one.
6. Once approved and checks pass, the PR is merged and the feature branch is usually deleted.

### Writing a good PR description

- A clear title that summarizes the change.
- What changed and, importantly, *why*; the diff already shows what, the description should explain the reasoning.
- A link to the relevant issue or ticket, if one exists.
- Screenshots or a short clip for any UI change.
- A note on breaking changes, migration steps, or deliberately deferred follow-up work.

### Merge strategies

- **Merge commit**: keeps every individual commit from the branch plus adds a new merge commit; preserves the fullest history, including intermediate review-fix commits.
- **Squash and merge**: combines every commit in the PR into a single commit on the target branch; keeps history clean and linear, but works best on short-lived branches, since anything still in progress on the same branch afterward can end up repeating conflicts already resolved once.
- **Rebase and merge**: replays each commit from the branch onto the target branch individually, with no merge commit, keeping a linear history while still preserving each individual commit.

### Code review etiquette

- As a reviewer: be specific about *why* something should change, distinguish a must-fix from a minor suggestion or nitpick, and review promptly rather than letting a PR sit for days.
- As an author: keep PRs small and focused on one thing; large diffs are hard to review carefully and tend to get rubber-stamped instead of genuinely reviewed.
- Respond to every comment, either by making the change or explaining why not; leaving comments unanswered stalls the review.
- A review's "Request changes" status is informational only, it does not by itself block merging unless the repository's branch protection rules are configured to require it.

### Branch protection

Repositories can require passing CI checks, at least one approval, and an up-to-date branch before a PR is allowed to merge. This enforces the review process through the tooling itself, rather than relying purely on team discipline.

### Practical tips

- Open a PR early, even as a draft, for visibility into long-running work rather than waiting until it feels "done."
- Keep PRs roughly under 200 to 400 changed lines where practical; review quality drops sharply on very large diffs.
- The GitHub CLI (`gh`) can create and manage PRs entirely from the terminal, without switching to the browser.

## Resources

- GitHub Docs, About pull requests: <https://docs.github.com/en/pull-requests/get-started/about-pull-requests>
- GitHub Docs, Pull request merges (merge commit, squash, rebase): <https://docs.github.com/en/pull-requests/reference/pull-request-merges>
- GitHub Docs, Pull request reviews: <https://docs.github.com/en/pull-requests/reference/pull-request-reviews>

## Practice / Exercises

- Push a feature branch to one of your own repositories and open a real pull request against `main`, writing a full description following the structure above.
- Review one of your own past PRs (or a public open-source one) and write down what you would comment on if you were reviewing it for the first time.

## Code Example

See [`04-pull-request-code-review-workflow.sh`](./04-pull-request-code-review-workflow.sh) in this folder.

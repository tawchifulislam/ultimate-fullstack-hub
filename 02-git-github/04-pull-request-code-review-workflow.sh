#!/bin/bash
# Pull request workflow walkthrough using the GitHub CLI (gh).
# This is a reference, not a run-and-forget script: gh needs to be
# installed and authenticated (`gh auth login`) against a real GitHub
# repository first, so the commands below are echoed rather than executed.

echo "== 1. branch, commit, and push your work =="
echo "git switch -c feature/add-search"
echo "# ... make changes ..."
echo "git add ."
echo "git commit -m \"Add search input to navbar\""
echo "git push -u origin feature/add-search"

echo ""
echo "== 2. open a pull request from the terminal =="
echo "gh pr create --base main --head feature/add-search \\"
echo "  --title \"Add search input to navbar\" \\"
echo "  --body \"Adds a search box to the navbar. Closes #42.\""
# Omitting --base/--head lets gh infer them and prompt interactively instead.

echo ""
echo "== 3. request specific reviewers =="
echo "gh pr create --reviewer octocat,my-team"
# Can also be combined into the same gh pr create call above.

echo ""
echo "== 4. check status: CI checks, review state, mergeability =="
echo "gh pr status"
echo "gh pr view feature/add-search"
echo "gh pr checks feature/add-search"

echo ""
echo "== 5. respond to review feedback =="
echo "# ... edit files based on comments ..."
echo "git add ."
echo "git commit -m \"Address review feedback: debounce search input\""
echo "git push"
echo "# The open PR updates automatically, no need to open a new one."

echo ""
echo "== 6. merge once approved and checks pass =="
echo "gh pr merge feature/add-search --squash --delete-branch"
echo "# --squash combines every commit into one on main."
echo "# Use --merge for a merge commit, or --rebase for rebase and merge instead."

echo ""
echo "== everyday review commands, from the reviewer's side =="
echo "gh pr list                     # see open PRs waiting for review"
echo "gh pr diff <number>            # view the diff in the terminal"
echo "gh pr review <number> --approve"
echo "gh pr review <number> --request-changes --body \"See inline comments\""
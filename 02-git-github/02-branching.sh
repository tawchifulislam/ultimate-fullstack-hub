#!/bin/bash
# Branching walkthrough: run this inside an EMPTY test folder.
# It sets up a real local repo and actually runs the git commands, so you
# can watch a fast-forward merge and a three-way merge commit happen live.

echo "== set up a base repo with one commit on main =="
git init -q -b main
git commit --allow-empty -q -m "Initial commit"

echo ""
echo "== Part 1: fast-forward merge =="
echo "-- create and switch to a feature branch --"
git switch -c feature-fast-forward
echo "line from feature-fast-forward" > fast.txt
git add fast.txt
git commit -q -m "Add fast.txt on feature-fast-forward"

echo "-- switch back to main; main has NOT moved since the branch started --"
git switch main
git merge feature-fast-forward
# Because main never advanced, Git just moves the pointer forward.
# No merge commit is created here.

echo ""
echo "== Part 2: three-way merge (merge commit) =="
echo "-- create a second feature branch from the current main --"
git switch -c feature-three-way
echo "line from feature-three-way" > three-way.txt
git add three-way.txt
git commit -q -m "Add three-way.txt on feature-three-way"

echo "-- meanwhile, main also gets a new commit, so the two branches diverge --"
git switch main
echo "an unrelated change on main" >> fast.txt
git add fast.txt
git commit -q -m "Update fast.txt directly on main"

echo "-- now merge feature-three-way into main: both sides have new commits --"
git merge feature-three-way -m "Merge feature-three-way into main"
# This time Git creates an actual merge commit with two parents.

echo ""
echo "== compare the two merges in the history graph =="
git log --oneline --graph --all

echo ""
echo "== clean up the feature branches now that they're merged =="
git branch -d feature-fast-forward
git branch -d feature-three-way
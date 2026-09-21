#!/bin/bash
# Git Basics walkthrough: run this inside an empty test folder to see each
# command's effect. Read the comments; a couple of steps need a real
# GitHub repo URL before they will actually work.

echo "== git init: turn this folder into a Git repository =="
git init
# Creates a hidden .git folder here. Nothing is tracked yet.

echo ""
echo "== create a file to track =="
echo "# My Project" > README.md

echo ""
echo "== git status: see what changed =="
git status
# README.md shows up as "untracked".

echo ""
echo "== git add: stage the file for the next commit =="
git add README.md
# Use "git add ." to stage every changed file at once.

echo ""
echo "== git status again: staged, not committed yet =="
git status

echo ""
echo "== git commit: permanently record the staged snapshot =="
git commit -m "Initial commit: add README"

echo ""
echo "== git log: view commit history =="
git log --oneline

echo ""
echo "== connect to a remote (replace this URL with your own GitHub repo) =="
echo "git remote add origin https://github.com/<your-username>/<your-repo>.git"

echo ""
echo "== push local commits to the remote for the first time =="
echo "git push -u origin main"
# -u sets the tracking relationship, so a plain "git push" is enough later.

echo ""
echo "== everyday loop from here on =="
echo "git pull        # get the latest changes before you start working"
echo "# ... make some changes ..."
echo "git add ."
echo "git commit -m \"describe what changed\""
echo "git push"
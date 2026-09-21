#!/bin/bash
# Merge conflict walkthrough: run this inside an EMPTY test folder.
# It actually creates a real conflict and resolves it, so you can see the
# marker format and the resolution step for real, not just described.

echo "== set up a base repo with one shared file =="
git init -q -b main
printf "red\ngreen\nblue\n" > colors.txt
git add colors.txt
git commit -q -m "Initial commit: add colors.txt"

echo ""
echo "== create two branches from the same starting point =="
git switch -c branch-a
sed -i 's/green/forest green/' colors.txt
git commit -q -am "branch-a: rename green to forest green"

git switch main
git switch -c branch-b
sed -i 's/green/emerald green/' colors.txt
git commit -q -am "branch-b: rename green to emerald green"

echo ""
echo "== merge branch-a into main first (fast-forward, no conflict) =="
git switch main
git merge branch-a

echo ""
echo "== now merge branch-b into main: same line changed differently on both sides =="
git merge branch-b
echo "(a conflict message above is expected, that is the point of this demo)"

echo ""
echo "== git status shows exactly which file is conflicted =="
git status

echo ""
echo "== the actual conflict markers Git inserted into colors.txt =="
cat colors.txt

echo ""
echo "== resolve by hand: here we choose to keep both names, then remove the markers =="
printf "red\nforest green and emerald green\nblue\n" > colors.txt
cat colors.txt

echo ""
echo "== stage the resolved file and complete the merge =="
git add colors.txt
git commit -q -m "Merge branch-b: resolve color name conflict"
# In real use, plain "git commit" here opens an editor with a pre-filled
# merge message; -m is only used here so the script can run unattended.

echo ""
echo "== confirm everything is resolved and see the resulting history =="
git status
git log --oneline --graph --all
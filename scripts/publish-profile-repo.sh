#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="Darrell-10"
PROFILE_DIR="$(cd "$(dirname "$0")/../profile-repo" && pwd)"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is required. Install it from https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: Run 'gh auth login' first to authenticate with your GitHub account." >&2
  exit 1
fi

if gh repo view "${REPO_NAME}/${REPO_NAME}" >/dev/null 2>&1; then
  echo "Repository ${REPO_NAME}/${REPO_NAME} already exists."
else
  echo "Creating public repository ${REPO_NAME}/${REPO_NAME}..."
  gh repo create "${REPO_NAME}/${REPO_NAME}" \
    --public \
    --description "GitHub profile README portfolio"
fi

cd "$PROFILE_DIR"

if [ ! -d .git ]; then
  git init -b main
  git add README.md
  git commit -m "Add GitHub profile README portfolio"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "https://github.com/${REPO_NAME}/${REPO_NAME}.git"
else
  git remote add origin "https://github.com/${REPO_NAME}/${REPO_NAME}.git"
fi

git push -u origin main

echo ""
echo "Done. Your profile README should appear at:"
echo "  https://github.com/${REPO_NAME}"

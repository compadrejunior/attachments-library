#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <version>  (e.g. $0 1.0.3)" >&2
  exit 1
}

[[ $# -ne 1 ]] && usage
VERSION="$1"

# ── Validate ────────────────────────────────────────────────────────────────

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must follow x.y.z semver (e.g. 1.0.3)" >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --staged --quiet; then
  echo "Error: working tree has uncommitted changes — commit or stash first" >&2
  exit 1
fi

if git tag --list | grep -qx "$VERSION"; then
  echo "Error: tag '$VERSION' already exists — never retag an existing version" >&2
  exit 1
fi

# ── Bump versions ───────────────────────────────────────────────────────────

echo "==> Updating version to $VERSION"

node -e "
const fs = require('fs');
const m = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
m.version = '$VERSION';
fs.writeFileSync('manifest.json', JSON.stringify(m, null, 2) + '\n');
"

npm version "$VERSION" --no-git-tag-version --silent

# ── Build & test ─────────────────────────────────────────────────────────────

echo "==> Running pipeline (lint + tests + build)"
npm run pipeline

# ── Commit, tag, push ────────────────────────────────────────────────────────

echo "==> Committing version bump"
git add manifest.json package.json package-lock.json
git commit -m "Bump version to $VERSION"

echo "==> Creating tag $VERSION"
git tag "$VERSION"

echo "==> Pushing commit and tag"
git push
git push origin "$VERSION"

# ── GitHub release ───────────────────────────────────────────────────────────

echo "==> Creating GitHub release"
gh release create "$VERSION" main.js manifest.json \
  --title "$VERSION" \
  --generate-notes

echo ""
echo "✓ Released $VERSION"

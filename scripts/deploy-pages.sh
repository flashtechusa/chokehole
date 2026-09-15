#!/usr/bin/env bash
#
# Publishes dist/ to the `main` Pages branch.
#
# This exists because doing it by hand is a trap: the build tree carries
# node_modules, dist and public alongside the deployed site, and on a branch
# whose .gitignore does not cover them a plain `git add -A` stages seventeen
# thousand files that do not belong on the Pages branch. This stages the built
# site by name and nothing else.
#
#   scripts/deploy-pages.sh "Deploy the skinned wrestlers"
#
set -euo pipefail

MSG="${1:-Deploy the current build}"
PAGES_BRANCH=main
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FROM="$(git rev-parse --abbrev-ref HEAD)"
if [ "$FROM" = "$PAGES_BRANCH" ]; then
  echo "Refusing to deploy from $PAGES_BRANCH itself: run this from the work branch." >&2
  exit 1
fi
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree is dirty. Commit or stash before deploying." >&2
  exit 1
fi

npm run build

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"; git checkout -q "$FROM"' EXIT
cp -r dist/. "$STAGE/"

git fetch origin "$PAGES_BRANCH"
git checkout -q "$PAGES_BRANCH"
git reset -q --hard "origin/$PAGES_BRANCH"

# Drop the previously published site, then lay the new one down. Only paths the
# build produces are touched; .nojekyll and .gitignore are branch furniture and
# stay put.
git ls-files -z | grep -zv '^\.nojekyll$' | grep -zv '^\.gitignore$' | xargs -0 rm -f --
cp -r "$STAGE/." .

# -u stages the removals above and any changed file, and by definition only
# touches paths git already tracks -- so it cannot sweep in node_modules the
# way `git add -A` would. New files are then added by name.
git add -u
git add .nojekyll .gitignore 2>/dev/null || true
(cd "$STAGE" && find . -type f | sed 's|^\./||') | while read -r f; do git add -- "$f"; done

if git diff --cached --quiet; then
  echo "Pages branch already matches this build; nothing to deploy."
else
  git commit -q -m "$MSG"
  git push -u origin "$PAGES_BRANCH"
  echo "Deployed: $(git log --oneline -1)"
fi

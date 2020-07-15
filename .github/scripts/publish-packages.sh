#!/bin/bash
cd "$(dirname "$0")/../../"

set -o errexit -o noclobber -o nounset -o pipefail
set -e
set -x

# This script uses the parent version as the version to publish a library with

getBuildType() {
  local release_type="minor"
  if [[ "$1" == *"(major)"* ]]; then
    release_type="major"
  elif [[ "$1" == *"(patch)"* ]]; then
    release_type="patch"
  fi
  echo "$release_type"
}

PARENT_DIR="$PWD"
ROOT_DIR="."
PACKAGES_DIR="$ROOT_DIR/packages"
BUILD_DIR="$ROOT_DIR/dist/packages"
COMMIT_MESSAGE="$(git log -1 --pretty=format:"%s")"
RELEASE_TYPE=${1:-$(getBuildType "$COMMIT_MESSAGE")}
DRY_RUN=${DRY_RUN:-"False"}

IGNORE=$(echo "$COMMIT_MESSAGE" | sed -nE "s/^.*\[ignore:(.+)\]$/\1/p")
if [[ "$IGNORE" != "" ]]; then
  echo "Ignoring: $IGNORE"
fi

AFFECTED=$(yarn --silent affected:libs -- --base=master --plain)
if [[ "$AFFECTED" != "" ]]; then
  cd "$PARENT_DIR"
  echo "Copy Environment Files"

  while IFS= read -r -d $' ' lib; do
    if [[ "$IGNORE" == *"$lib"* ]]; then
      echo "Skipping $lib"
    else
      echo "Setting version for $lib"
      cd "$PARENT_DIR"
      cd "$PACKAGES_DIR/${lib}"
      npm version "$RELEASE_TYPE" -f -m "NPT $RELEASE_TYPE"
      echo "Building $lib"
      cd "$PARENT_DIR"
      yarn --silent run build "$lib" -- --prod --with-deps
      wait
    fi
  done <<<"$AFFECTED " # leave space on end to generate correct output

  cd "$PARENT_DIR"
  while IFS= read -r -d $' ' lib; do
    if [[ "$DRY_RUN" == "False" || "$IGNORE" != *"$lib"* ]]; then
      echo "Publishing $lib"
      npm publish "$BUILD_DIR/${lib}" --access=public
    else
      echo "Dry Run, not publishing $lib"
    fi
    wait
  done <<<"$AFFECTED " # leave space on end to generate correct output
else
  echo "No Libraries to publish"
fi

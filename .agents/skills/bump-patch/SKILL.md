---
name: bump-patch
description: Release a Birdsong patch by checking the latest GitHub release, incrementing its patch version with npm, and pushing main and the new tag to origin.
---

# Bump patch

When the user requests a patch release, run this workflow from the repository root. Creating or editing this skill does not request a release.

1. Confirm the current branch is `main` and `git status --porcelain` is empty. If either check fails, stop and report it; do not stash or commit unrelated changes.
2. Run `git fetch origin main --tags`. Confirm `origin/main` is an ancestor of `HEAD` with `git merge-base --is-ancestor origin/main HEAD`. Stop if main is behind or diverged.
3. Read the latest published GitHub release for this repository:

   ```sh
   release_tag=$(gh release view --json tagName --jq '.tagName')
   ```

   Stop if the lookup fails or no release exists. Use the release tag as the version source, rather than `package.json` or local tags.
4. Require a tag matching `v0.0.N`, where `N` is a nonnegative integer without leading zeroes. Increment only its patch number:

   ```sh
   next_tag=$(node -e '
     const match = /^v0\.0\.(0|[1-9]\d*)$/.exec(process.argv[1]);
     if (!match) throw new Error("Expected release tag v0.0.N");
     console.log(`v0.0.${BigInt(match[1]) + 1n}`);
   ' "$release_tag")
   ```

5. Confirm the target version is greater than the version in `package.json` and that `refs/tags/$next_tag` exists neither locally nor on origin. Stop on conflicts or lookup errors; report them instead of choosing a different version or replacing a tag.
6. Run these commands sequentially, stopping immediately on any failure:

   ```sh
   npm version "$next_tag"
   git push origin main "$next_tag"
   ```

   Let `npm version` update the package files, create the version commit, and create the tag. Do not use `--force`, `--no-git-tag-version`, or `--allow-same-version`.
7. Verify that origin's `main` matches `HEAD` and its new tag matches the local tag. Report the previous version, new version, and push result. The tag push triggers `.github/workflows/release.yml`; do not run `npm publish` or create a separate GitHub release.

If a push fails after the version commit and tag were created, report the local state and failure. Preserve them for a push retry; do not rerun `npm version`, delete tags, or bump again.

# Release Process

How `program-truth` is versioned, verified, and published to npm.

## Versioning

Two independent version axes exist and must not be conflated:

- **Package version** (`package.json` `version`): semver for the package as a whole. A breaking methodology or CLI contract change is a major bump; new canonical artifacts, schemas, or optional features are minor; fixes are patch. The npm release tag (e.g. `v0.2.0`) always matches this version.
- **Artifact contract version** (`schema_version` inside a `status-artifact.json`, currently `1.0.0`): the shape of the canonical status artifact. It changes only when the artifact shape changes, independent of package releases. An artifact carrying `schema_version: 1.0.0` remains valid across package versions 0.2.x as long as the shape is unchanged; bump it when the schema in `schemas/status-artifact.schema.json` changes in a breaking way.

Before release, update `package.json` `version` and add a `CHANGELOG.md` entry. If the change alters upgrade behavior, update `MIGRATION.md` too. The tag must match the package version exactly: package `0.2.0` is released as tag `v0.2.0`.

## Local Pre-Release Checklist

Run every check from a clean checkout on Node 22 LTS:

```bash
npm ci               # reproducible clean install from the committed lockfile
npm audit --audit-level=high
npm run check        # syntax, JSON, schema sanity, sibling drift deep-compare
npm run contracts:verify
npm test
npm run pack:dry-run # also runs prepack (check + contracts:verify + test)
node bin/program-truth.js version
node bin/program-truth.js doctor --codex-target <tmp>/codex --claude-target <tmp>/claude
node bin/program-truth.js bootstrap --workspace <tmp> --client none --dry-run
```

The isolated `doctor` targets make the check deterministic on any machine, including CI runners with no skills installed. `npm run pack:dry-run` triggers `prepack`, which runs `check`, `contracts:verify`, and `test`. This is intentional and is not recursive: `prepack` never invokes `pack` or `pack:dry-run`, so the script chain terminates.

Expected outcomes:

- `check` reports 100% pass including `drift schemas/*.json` checks (deep-compared byte-for-byte against the sibling truth-tools contracts when present; skipped cleanly otherwise)
- `contracts:verify` reports 100% pass including the documented `truth-tools review` command
- all tests pass
- pack dry run lists exactly the allowlisted files from `package.json` `files`
- CLI version prints the new version; doctor reports all checks ok; bootstrap dry run asks for an anchor on an empty workspace

## Publishing

Releases are published by `.github/workflows/release.yml` using npm trusted publishing (OIDC), not by a stored token. Two trigger paths exist:

1. **Tag push (recommended):** push the version bump and changelog to `main`, then create and push the tag:
   ```bash
   git tag v0.2.0 && git push origin v0.2.0
   ```
2. **Manual dispatch:** run the `Release` workflow from the Actions tab with the explicit `tag` input (e.g. `v0.2.0`). The input is required; the workflow refuses to run without it. The workflow checks out the exact tag from the input (never the default branch), so what gets validated and published is the tagged commit, not `main`.

Either way the workflow:

1. resolves the release ref (from `GITHUB_REF` on tag push, or from the manual `tag` input — accepted as `v0.2.0`, `0.2.0`, or `refs/tags/v0.2.0`)
2. checks out that exact ref
3. verifies the tag matches `package.json` version at that ref (fail-closed on mismatch)
4. runs the full local checklist in CI: clean install, `check`, `contracts:verify`, `test`, CLI smoke (version, isolated doctor, bootstrap dry run), and `npm run pack:dry-run`
5. runs `npm publish --provenance --access public`; `npm publish` itself re-runs `prepack`, so the last gate before the registry is the same non-recursive check chain

A `concurrency` group keyed to the event name, `github.ref`, and the tag input ensures only one publish attempt per tag can be in flight: re-pushing an existing tag or double-dispatching the same tag cancels the earlier queued/in-progress run instead of publishing twice. If two different triggers for the same tag ever both proceed, the second `npm publish` fails closed because the version already exists on the registry.

Publishing requires trusted-publishing configuration for the npm OIDC provider (https://registry.npmjs.org) on the `publish` environment. If trusted publishing is not yet configured for the npm account, publishing fails closed rather than falling back to a token.

## Post-Release

- Confirm the version on npm: `npm view program-truth version`
- Confirm provenance: `npm view program-truth@<version> --json | grep -i provenance` should show a non-empty provenance entry when the registry reports it.
- Add the tag comparison links to `CHANGELOG.md` if the release introduced a new compare range.
- Run `program-truth doctor` against a fresh global install as a smoke test.

## Rollback

npm does not support unpublishing published versions lightly. Rollback procedure:

1. `npm deprecate program-truth@<bad-version> "Do not use this version; see CHANGELOG"`.
2. Fix forward with a new patch or minor version following this same process.
3. If the bad version never reached consumers and the registry window allows, unpublish as a last resort after confirming no dependents exist.

## Security

- The package has zero runtime dependencies; the supply-chain surface is the publishing step itself.
- Publishing uses provenance so consumers can verify the package was built from this repository by this workflow.
- The committed `package-lock.json` pins the dependency-free install; CI and release enforce `npm audit --audit-level=high`. `.github/dependabot.yml` keeps the GitHub Actions ecosystem updated (weekly schedule, as configured in that file).

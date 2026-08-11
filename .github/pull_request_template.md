## Summary

<!-- One paragraph: what this change does and why. -->

## Methodology Impact

<!-- Does this change the canonical status artifact contract, the SKILL.md operating contract, or the relationship to Truth Tools? If yes, state the impact explicitly and point to the affected schema or doc. -->

## Checklist

- [ ] `npm run check` passes (syntax, JSON, schema sanity, schema drift)
- [ ] `npm run contracts:verify` passes (artifact example, human report, documented `truth-tools review` command)
- [ ] `npm test` passes
- [ ] `npm run pack:dry-run` lists only allowlisted files
- [ ] CLI smoke: `node bin/program-truth.js version` and `node bin/program-truth.js doctor`
- [ ] README / SKILL / INSTALL / references updated if behavior or the artifact contract changed
- [ ] CHANGELOG.md entry added if this is a user-visible change
- [ ] MIGRATION.md updated if upgrade behavior changed

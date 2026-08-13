# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.3.x | Yes (current) |
| 0.2.x | Bug fixes only, no new features |

## Scope

This repository is a documentation and skill package with a small dependency-free Node CLI. Security issues can still exist in install instructions, example configurations, linked automation, or the installer's filesystem behavior.

What this package does and does not touch:

- The CLI writes only to the local filesystem (installer targets and bootstrap scaffolds) and refuses to replace unmanaged or locally modified skill folders without `--backup` or `--force`.
- The CLI performs no network calls and bundles no connectors. Connectors (Atlassian MCP, Notion MCP, or equivalent) are external services the user configures; credentials for them are handled by the client, never by this package.
- External writes to Jira, Confluence, or Notion are performed by the agent only after explicit user confirmation and are recorded in the status report and methodology docs.

## Reporting a Vulnerability

Please do not report suspected vulnerabilities in a public issue or pull request.

Preferred private channel:

- [GitHub private vulnerability reporting](https://github.com/hilmimuktitama/program-truth/security/advisories/new)

If that page is unavailable, use an existing private maintainer contact method rather than posting details publicly.

## Response

Security review and response are best-effort.

When a report is confirmed, the maintainer may fix the issue privately first and publish the patch after a remediation path is ready. The maintainer will acknowledge receipt when possible and will not publish details of the vulnerability before a remediation path exists.

## Publishing Security

Releases are published from `.github/workflows/release.yml` using npm trusted publishing (OIDC) with `npm publish --provenance`, so published tarballs carry provenance linking them to this repository. The package declares zero runtime dependencies, keeping the supply-chain surface small. See [docs/release-process.md](docs/release-process.md).

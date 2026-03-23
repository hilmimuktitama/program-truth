#!/usr/bin/env python3
"""Deterministic bootstrap helper for program-truth."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path
from typing import Any

TEXT_EXTENSIONS = {".md", ".markdown", ".txt", ".rst", ".json", ".yaml", ".yml"}
IGNORED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".tmp-tests",
    ".venv",
    "venv",
    "__pycache__",
    "node_modules",
}
MAX_SCAN_BYTES = 200_000
JIRA_KEY_RE = re.compile(r"\b[A-Z][A-Z0-9]+-\d+\b")
ATLASSIAN_URL_RE = re.compile(r"https?://[A-Za-z0-9.-]+\.atlassian\.net/[^\s)>\"]+")
NOTION_URL_RE = re.compile(
    r"https?://(?:(?:www\.)?notion\.so|[A-Za-z0-9-]+\.notion\.site)/[^\s)>\"]+"
)
LOCAL_SOURCE_KEYWORDS = ("spec", "status", "meeting", "note", "decision", "todo")
NEXT_PROMPT = (
    "Use program-truth to inventory available sources, identify the lowest "
    "execution-level artifacts, and tell me what is missing before making a "
    "priority call."
)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Bootstrap a program-truth workspace deterministically."
    )
    parser.add_argument(
        "--workspace",
        default=".",
        help="Workspace path to inspect and scaffold. Defaults to the current directory.",
    )
    parser.add_argument(
        "--client",
        choices=("auto", "codex", "claude", "none"),
        default="auto",
        help="Client mode. Defaults to auto-detect.",
    )
    parser.add_argument(
        "--json-in",
        metavar="PATH",
        help="Read structured input from a JSON file or '-' for stdin.",
    )
    parser.add_argument(
        "--json-out",
        action="store_true",
        help="Print machine-readable JSON only.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview writes without changing files.",
    )
    return parser.parse_args(argv)


def should_scan(path: Path, workspace: Path) -> bool:
    if path.suffix.lower() not in TEXT_EXTENSIONS:
        return False
    if any(part in IGNORED_DIRS for part in path.relative_to(workspace).parts):
        return False
    try:
        return path.stat().st_size <= MAX_SCAN_BYTES
    except OSError:
        return False


def relative(path: Path, workspace: Path) -> str:
    return path.relative_to(workspace).as_posix()


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def detect_client(workspace: Path, explicit: str) -> str:
    if explicit != "auto":
        return explicit
    if (workspace / "CLAUDE.md").exists() or (workspace / ".claude").exists():
        return "claude"
    return "none"


def unique_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str, str]] = set()
    unique: list[dict[str, Any]] = []
    for candidate in candidates:
        key = (
            str(candidate.get("kind", "")),
            str(candidate.get("value", "")),
            str(candidate.get("path", "")),
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(candidate)
    return unique


def find_candidate_sources(workspace: Path) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    local_file_candidates: list[dict[str, Any]] = []

    for path in workspace.rglob("*"):
        if not path.is_file() or not should_scan(path, workspace):
            continue
        text = load_text(path)
        rel = relative(path, workspace)

        for match in JIRA_KEY_RE.findall(text):
            candidates.append({"kind": "jira_key", "value": match, "path": rel})

        for url in ATLASSIAN_URL_RE.findall(text):
            kind = "confluence_url" if "/wiki/" in url else "jira_url"
            candidates.append({"kind": kind, "value": url, "path": rel})

        for url in NOTION_URL_RE.findall(text):
            candidates.append({"kind": "notion_url", "value": url, "path": rel})

        lowered = rel.lower()
        if any(keyword in lowered for keyword in LOCAL_SOURCE_KEYWORDS):
            local_file_candidates.append(
                {
                    "kind": "local_file",
                    "value": rel,
                    "path": rel,
                    "mtime": path.stat().st_mtime,
                }
            )

    local_file_candidates.sort(key=lambda item: item["mtime"], reverse=True)
    for candidate in local_file_candidates[:5]:
        candidate.pop("mtime", None)
        candidates.append(candidate)

    return unique_candidates(candidates)


def load_json_input(json_in: str | None) -> dict[str, Any]:
    if not json_in:
        return {}
    if json_in == "-":
        raw = sys.stdin.read()
    else:
        raw = Path(json_in).read_text(encoding="utf-8")
    payload = json.loads(raw) if raw.strip() else {}
    return payload if isinstance(payload, dict) else {}


def normalize_systems(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        values = [part.strip().lower() for part in raw.split(",")]
    elif isinstance(raw, list):
        values = [str(part).strip().lower() for part in raw]
    else:
        values = []
    allowed = {"jira", "confluence", "notion"}
    normalized = [value for value in values if value in allowed]
    return list(dict.fromkeys(normalized))


def infer_systems_from_values(values: list[str]) -> list[str]:
    inferred: list[str] = []
    for value in values:
        text = str(value).strip()
        if not text:
            continue
        if JIRA_KEY_RE.search(text) or (
            ".atlassian.net/" in text and "/wiki/" not in text
        ):
            if "jira" not in inferred:
                inferred.append("jira")
        elif ".atlassian.net/wiki/" in text:
            if "confluence" not in inferred:
                inferred.append("confluence")
        elif "notion.so/" in text or ".notion.site/" in text:
            if "notion" not in inferred:
                inferred.append("notion")
    return inferred


def collect_context(input_data: dict[str, Any], workspace: Path, client: str) -> dict[str, Any]:
    context = {
        "initiative_name": str(input_data.get("initiative_name", "")).strip(),
        "objective": str(input_data.get("objective", "")).strip(),
        "current_question": str(input_data.get("current_question", "")).strip(),
        "target_date_or_window": str(input_data.get("target_date_or_window", "")).strip(),
        "systems_in_scope": normalize_systems(input_data.get("systems_in_scope")),
        "workstreams": input_data.get("workstreams") or [],
        "known_sources": input_data.get("known_sources") or [],
        "known_claims_to_validate": input_data.get("known_claims_to_validate") or [],
        "missing_access_or_limits": input_data.get("missing_access_or_limits") or [],
        "client": client,
        "workspace_path": str(workspace),
    }
    return context


def prompt_if_missing(context: dict[str, Any], interactive: bool) -> dict[str, Any]:
    if not interactive:
        return context

    def ask(key: str, prompt: str) -> None:
        if context.get(key):
            return
        value = input(prompt).strip()
        if value:
            context[key] = value

    ask("initiative_name", "Initiative name: ")
    ask("objective", "Objective: ")
    ask("current_question", "Current question: ")
    ask("target_date_or_window", "Target date or reporting window: ")

    if not context.get("systems_in_scope"):
        systems = input(
            "Systems in scope (comma-separated from jira, confluence, notion, or leave blank): "
        ).strip()
        context["systems_in_scope"] = normalize_systems(systems)

    return context


def infer_systems(context: dict[str, Any], candidates: list[dict[str, Any]]) -> list[str]:
    systems = list(context.get("systems_in_scope", []))
    if systems:
        return systems

    inferred: list[str] = []
    for candidate in candidates:
        kind = candidate["kind"]
        if kind in {"jira_key", "jira_url"} and "jira" not in inferred:
            inferred.append("jira")
        elif kind == "confluence_url" and "confluence" not in inferred:
            inferred.append("confluence")
        elif kind == "notion_url" and "notion" not in inferred:
            inferred.append("notion")
    for system in infer_systems_from_values(context.get("known_sources") or []):
        if system not in inferred:
            inferred.append(system)
    return inferred


def summarize_workspace_state(workspace: Path, client: str) -> dict[str, Any]:
    return {
        "workspace": str(workspace),
        "client": client,
        "existing_files": {
            "CLAUDE.md": (workspace / "CLAUDE.md").exists(),
            "INITIAL-CONTEXT.md": (workspace / "INITIAL-CONTEXT.md").exists(),
            "TODO.md": (workspace / "TODO.md").exists(),
            "cross-squad/specs": (workspace / "cross-squad" / "specs").exists(),
            "cross-squad/status": (workspace / "cross-squad" / "status").exists(),
        },
    }


def is_placeholder_initial_context(path: Path) -> bool:
    if not path.exists():
        return True
    text = load_text(path).strip()
    if not text:
        return True
    return (
        "**Name:** [Program or launch name]" in text
        or "[What this initiative is trying to achieve]" in text
        or "## Initiative" not in text
    )


def build_remaining_gaps(context: dict[str, Any], candidates: list[dict[str, Any]]) -> list[str]:
    gaps: list[str] = []
    if not candidates and not (context.get("known_sources") or []):
        gaps.append(
            "one anchor artifact such as a Jira key/filter/board, Confluence page, "
            "Notion page/database, or local file"
        )
    return gaps


def build_connector_recommendations(
    systems: list[str], candidates: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    recommendations: list[dict[str, Any]] = []
    effective = systems or infer_systems({"systems_in_scope": []}, candidates)

    if any(system in effective for system in ("jira", "confluence")):
        recommendations.append(
            {
                "system": "atlassian",
                "needed": True,
                "applies_to": ["jira", "confluence"],
                "smoke_test": "mcp__atlassian__getAccessibleAtlassianResources()",
                "notes": [
                    "Use Atlassian MCP or equivalent read access.",
                    "Task-level Jira access matters more than parent summaries.",
                ],
            }
        )

    if "notion" in effective:
        recommendations.append(
            {
                "system": "notion",
                "needed": True,
                "applies_to": ["notion"],
                "smoke_test": (
                    "Search the target page or database and confirm owner/status/date "
                    "visibility plus last-edited timestamps."
                ),
                "notes": [
                    "Use an approved Notion MCP or equivalent connector.",
                    "Downgrade Notion if only prose is visible and operating fields are missing.",
                ],
            }
        )

    if not recommendations:
        recommendations.append(
            {
                "system": "local-only",
                "needed": False,
                "applies_to": [],
                "smoke_test": "None yet. Bootstrap local context first.",
                "notes": [
                    "No external systems were detected or confirmed in scope.",
                    "Start with local context and add connectors only when the program actually depends on them.",
                ],
            }
        )

    return recommendations


def select_anchor(context: dict[str, Any], candidates: list[dict[str, Any]]) -> str | None:
    known_sources = context.get("known_sources") or []
    if known_sources:
        anchor = str(known_sources[0]).strip()
        if anchor:
            return anchor
    anchor = candidate_value(
        candidates,
        {"jira_key", "jira_url", "confluence_url", "notion_url", "local_file"},
        "",
    ).strip()
    return anchor or None


def build_onboard_prompt(context: dict[str, Any], candidates: list[dict[str, Any]]) -> str:
    anchor = select_anchor(context, candidates) or "[anchor]"
    return (
        f"Use program-truth onboard from {anchor} and gather the first useful context "
        "for this workspace."
    )


def build_bootstrap_questions(remaining_gaps: list[str]) -> list[str]:
    prompts: list[str] = []
    for gap in remaining_gaps:
        if gap.startswith("one anchor artifact"):
            prompts.append(
                "One anchor artifact: Jira key/filter/board, Confluence page, "
                "Notion page/database, or local file path"
            )
    return prompts


def build_next_prompt(
    context: dict[str, Any],
    candidates: list[dict[str, Any]],
    remaining_gaps: list[str],
) -> str:
    if not remaining_gaps:
        return build_onboard_prompt(context, candidates)

    systems = ", ".join(context.get("systems_in_scope") or infer_systems(context, candidates)) or "[auto-detect from anchor]"
    source_hint = (
        (context.get("known_sources") or [None])[0]
        or candidate_value(
            candidates,
            {"jira_key", "jira_url", "confluence_url", "notion_url", "local_file"},
            "[fill in]",
        )
    )
    return (
        "Reply with one anchor so program-truth can discover the rest:\n"
        f"- Anchor: {source_hint}\n"
        "- Optional: initiative name\n"
        "- Optional: target date or reporting window\n"
        f"- Optional: systems in scope if you already know them ({systems})\n"
        "Accepted anchors: Jira key/filter/board, Confluence page, Notion page/database, "
        "or a local spec/status/meeting-note path.\n"
        "After that, ask program-truth onboard from that anchor and let it gather the first "
        "useful context for this workspace."
    )


def candidate_value(candidates: list[dict[str, Any]], kinds: set[str], default: str) -> str:
    for candidate in candidates:
        if candidate["kind"] in kinds:
            return str(candidate["value"])
    return default


def render_initial_context(
    context: dict[str, Any],
    candidates: list[dict[str, Any]],
    remaining_gaps: list[str],
) -> str:
    today = date.today().isoformat()
    systems = context.get("systems_in_scope") or infer_systems(context, candidates)
    source_rows: list[tuple[str, str, str, str, str]] = []

    if "jira" in systems:
        source_rows.append(
            (
                "Jira",
                "task-level execution",
                candidate_value(candidates, {"jira_key", "jira_url"}, "[none captured yet]"),
                today,
                "Unknown",
            )
        )
    if "confluence" in systems:
        source_rows.append(
            (
                "Confluence",
                "sync notes, decisions",
                candidate_value(candidates, {"confluence_url"}, "[none captured yet]"),
                today,
                "Unknown",
            )
        )
    if "notion" in systems:
        source_rows.append(
            (
                "Notion",
                "database rows or operating pages",
                candidate_value(candidates, {"notion_url"}, "[none captured yet]"),
                today,
                "Unknown",
            )
        )

    source_rows.append(
        ("Local spec", "planned scope", "cross-squad/specs/", today, "Yes")
    )
    source_rows.append(
        ("Local status", "recent status source", "cross-squad/status/", today, "Yes")
    )

    source_lines = "\n".join(
        f"| {system} | {contains} | {link} | {freshness} | {readable} |"
        for system, contains, link, freshness, readable in source_rows
    )

    workstreams = context.get("workstreams") or []
    if workstreams:
        scope_lines = "\n".join(
            f"| {item.get('name', '[Workstream]')} | {item.get('owner', '[Name]')} | "
            f"{item.get('area', '[Path or repo]')} | {item.get('notes', '[Optional]')} |"
            for item in workstreams
            if isinstance(item, dict)
        )
    else:
        scope_lines = "| [Workstream] | [Name] | [Path or repo] | [Optional] |"

    claims = context.get("known_claims_to_validate") or ["[Add the first claim to validate]"]
    claims_lines = "\n".join(f"- {claim}" for claim in claims)

    known_sources = context.get("known_sources") or []
    current_source_default = (
        candidate_value(
            candidates,
            {"jira_key", "jira_url", "confluence_url", "notion_url", "local_file"},
            "[none captured yet]",
        )
    )
    current_source_line = (
        known_sources[0] if known_sources else current_source_default
    )
    first_prompt = build_onboard_prompt(context, candidates)

    missing_lines = "\n".join(
        f"- {gap}" for gap in (context.get("missing_access_or_limits") or remaining_gaps or ["[none yet]"])
    )

    return f"""# Initial Context Pack

Generated by `scripts/bootstrap_program_truth.py`.

## Initiative

**Name:** {context.get("initiative_name") or "[Fill in initiative name]"}
**Objective:** {context.get("objective") or "[Fill in objective]"}
**Current Question:** {context.get("current_question") or "[Fill in current question]"}
**Target Milestone Or Date:** {context.get("target_date_or_window") or "[Fill in target date or reporting window]"}
**Last Updated:** {today}

## Scope

| Squad / Service | Owner | Repo / Area | Notes |
|-----------------|-------|-------------|-------|
{scope_lines}

## Source Systems

| System | What It Contains | Link / Path / Key | Freshness | Can The AI Read It? |
|--------|------------------|-------------------|-----------|---------------------|
{source_lines}

## Minimum Required Artifacts

### Active Spec

- Path or link: cross-squad/specs/

### Recent Status Source

- Path or link: cross-squad/status/
- Date: {today}

### Current Execution Source

- Link, key, or path: {current_source_line}
- Why it is current: [Confirm why this is the best starting point]

## Known Claims To Validate

{claims_lines}

## Missing Access Or Confidence Limits

{missing_lines}

## Recommended First Prompt

```text
{first_prompt}
```

Only after `onboard` should you ask for `daily`, `status`, or `archaeology`.
"""


def render_todo(context: dict[str, Any], recommendations: list[dict[str, Any]]) -> str:
    lines = [
        "# TODO",
        "",
        "## Bootstrap",
        "- [ ] Add one anchor artifact the skill can start from",
        "- [ ] Run program-truth onboard from that anchor",
        "- [ ] Review the missing-context checklist from onboard",
        "- [ ] Confirm target date or reporting window if needed",
    ]
    if any(item["system"] == "atlassian" for item in recommendations):
        lines.extend(
            [
                "",
                "## Connector Setup",
                "- [ ] Confirm Atlassian MCP access to Jira and Confluence",
                "- [ ] Run mcp__atlassian__getAccessibleAtlassianResources()",
            ]
        )
    if any(item["system"] == "notion" for item in recommendations):
        if "## Connector Setup" not in lines:
            lines.extend(["", "## Connector Setup"])
        lines.append("- [ ] Confirm Notion connector search/page/database access")
    return "\n".join(lines) + "\n"


def render_claude_md(context: dict[str, Any]) -> str:
    today = date.today().isoformat()
    name = context.get("initiative_name") or "[Program]"
    return f"""## TPM Workspace

**Last Updated:** {today}

## Active Programs
| Program | Spec | Status |
|---------|------|--------|
| {name} | `cross-squad/specs/` | Bootstrap |

## Key References
- `INITIAL-CONTEXT.md`
- `TODO.md`
- `cross-squad/specs/`
- `cross-squad/status/`

## Workflow Rules
- Normalize dates into `YYYY-MM-DD`
- Report execution truth from the lowest work unit available
- Distinguish facts, inferences, unknowns, and conflicts
"""


def ensure_directory(path: Path, dry_run: bool) -> str | None:
    if path.exists():
        return None
    if not dry_run:
        path.mkdir(parents=True, exist_ok=True)
    return "created"


def write_text_file(path: Path, content: str, dry_run: bool, replace: bool = False) -> str | None:
    if path.exists() and not replace:
        return None
    if not dry_run:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    return "updated" if path.exists() else "created"


def apply_scaffold(
    workspace: Path,
    client: str,
    context: dict[str, Any],
    candidates: list[dict[str, Any]],
    recommendations: list[dict[str, Any]],
    remaining_gaps: list[str],
    dry_run: bool,
) -> list[dict[str, str]]:
    files_written: list[dict[str, str]] = []

    for directory in (
        workspace / "cross-squad" / "specs",
        workspace / "cross-squad" / "status",
    ):
        status = ensure_directory(directory, dry_run)
        if status:
            files_written.append({"path": relative(directory, workspace), "status": status})

    for keep in (
        workspace / "cross-squad" / "specs" / ".gitkeep",
        workspace / "cross-squad" / "status" / ".gitkeep",
    ):
        status = write_text_file(keep, "", dry_run)
        if status:
            files_written.append({"path": relative(keep, workspace), "status": status})

    initial_context = workspace / "INITIAL-CONTEXT.md"
    initial_status = write_text_file(
        initial_context,
        render_initial_context(context, candidates, remaining_gaps),
        dry_run,
        replace=is_placeholder_initial_context(initial_context),
    )
    if initial_status:
        files_written.append({"path": "INITIAL-CONTEXT.md", "status": initial_status})

    todo_status = write_text_file(
        workspace / "TODO.md",
        render_todo(context, recommendations),
        dry_run,
    )
    if todo_status:
        files_written.append({"path": "TODO.md", "status": todo_status})

    if client == "claude":
        claude_status = write_text_file(
            workspace / "CLAUDE.md",
            render_claude_md(context),
            dry_run,
        )
        if claude_status:
            files_written.append({"path": "CLAUDE.md", "status": claude_status})

    return files_written


def human_summary(result: dict[str, Any]) -> str:
    lines = [
        f"Initialized the program-truth workspace scaffold in {result['workspace_state']['workspace']}.",
        "",
        "Files written:",
    ]
    if result["files_written"]:
        lines.extend(f"- {item['path']} ({item['status']})" for item in result["files_written"])
    else:
        lines.append("- none")

    lines.extend(["", "Best candidate sources found:"])
    if result["candidate_sources"]:
        lines.extend(
            f"- {item['kind']}: {item['value']} ({item['path']})"
            for item in result["candidate_sources"][:8]
        )
    else:
        lines.append("- none in the current workspace yet")

    lines.extend(["", "Connector recommendations:"])
    for item in result["connector_recommendations"]:
        lines.append(
            f"- {item['system']}: {'needed' if item['needed'] else 'not needed yet'}"
        )
        lines.append(f"  smoke test: {item['smoke_test']}")

    lines.extend(["", "Remaining gaps:"])
    if result["remaining_gaps"]:
        lines.extend(f"- {gap}" for gap in result["remaining_gaps"])
    else:
        lines.append("- none critical")

    if result["bootstrap_questions"]:
        lines.extend(["", "Answer these next in one message:"])
        lines.extend(f"- {question}" for question in result["bootstrap_questions"])

    lines.extend(["", "Next prompt:", result["next_prompt"]])
    return "\n".join(lines)


def run_bootstrap(
    workspace: Path,
    client_mode: str,
    input_data: dict[str, Any],
    dry_run: bool,
    interactive: bool,
) -> dict[str, Any]:
    workspace = workspace.resolve()
    client = detect_client(workspace, client_mode)
    candidates = find_candidate_sources(workspace)
    context = collect_context(input_data, workspace, client)
    context = prompt_if_missing(context, interactive)
    if not context.get("systems_in_scope"):
        context["systems_in_scope"] = infer_systems(context, candidates)
    remaining_gaps = build_remaining_gaps(context, candidates)
    recommendations = build_connector_recommendations(context["systems_in_scope"], candidates)
    bootstrap_questions = build_bootstrap_questions(remaining_gaps)
    next_prompt = build_next_prompt(context, candidates, remaining_gaps)
    files_written = apply_scaffold(
        workspace,
        client,
        context,
        candidates,
        recommendations,
        remaining_gaps,
        dry_run,
    )
    return {
        "workspace_state": summarize_workspace_state(workspace, client),
        "files_written": files_written,
        "candidate_sources": candidates[:12],
        "connector_recommendations": recommendations,
        "captured_context": {
            "initiative_name": context.get("initiative_name"),
            "objective": context.get("objective"),
            "current_question": context.get("current_question"),
            "target_date_or_window": context.get("target_date_or_window"),
            "systems_in_scope": context.get("systems_in_scope"),
        },
        "remaining_gaps": remaining_gaps,
        "bootstrap_questions": bootstrap_questions,
        "next_prompt": next_prompt,
    }


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    workspace = Path(args.workspace)
    workspace.mkdir(parents=True, exist_ok=True)
    input_data = load_json_input(args.json_in)
    interactive = not args.json_in and sys.stdin.isatty()
    result = run_bootstrap(workspace, args.client, input_data, args.dry_run, interactive)
    if args.json_out:
        json.dump(result, sys.stdout, indent=2)
        sys.stdout.write("\n")
    else:
        print(human_summary(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

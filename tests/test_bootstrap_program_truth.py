from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import sys
import unittest
import uuid
from contextlib import contextmanager
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPT_PATH = REPO_ROOT / "scripts" / "bootstrap_program_truth.py"
TEMP_ROOT = REPO_ROOT / ".tmp-tests"
TEMP_ROOT.mkdir(exist_ok=True)

spec = importlib.util.spec_from_file_location("bootstrap_program_truth", SCRIPT_PATH)
bootstrap = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(bootstrap)


@contextmanager
def scratch_workspace(prefix: str):
    workspace = TEMP_ROOT / f"{prefix}-{uuid.uuid4().hex}"
    workspace.mkdir(parents=True, exist_ok=False)
    try:
        yield workspace
    finally:
        shutil.rmtree(workspace, ignore_errors=True)


class BootstrapProgramTruthTests(unittest.TestCase):
    def test_find_candidate_sources_detects_links_and_keys(self) -> None:
        with scratch_workspace("sources") as workspace:
            note = workspace / "notes.md"
            note.write_text(
                "\n".join(
                    [
                        "Jira key ABC-123",
                        "Jira URL https://example.atlassian.net/browse/ABC-123",
                        "Confluence https://example.atlassian.net/wiki/spaces/ENG/pages/123",
                        "Notion https://www.notion.so/workspace/example-page",
                    ]
                ),
                encoding="utf-8",
            )

            candidates = bootstrap.find_candidate_sources(workspace)
            kinds = {item["kind"] for item in candidates}

            self.assertIn("jira_key", kinds)
            self.assertIn("jira_url", kinds)
            self.assertIn("confluence_url", kinds)
            self.assertIn("notion_url", kinds)

    def test_run_bootstrap_writes_scaffold_files(self) -> None:
        with scratch_workspace("bootstrap") as workspace:
            result = bootstrap.run_bootstrap(
                workspace,
                "claude",
                {
                    "initiative_name": "Program Truth Rollout",
                    "objective": "Bootstrap the workspace",
                    "current_question": "What do we need first?",
                    "target_date_or_window": "2026-03-31",
                    "systems_in_scope": ["jira"],
                },
                dry_run=False,
                interactive=False,
                scaffold_mode="full",
            )

            self.assertTrue((workspace / "INITIAL-CONTEXT.md").exists())
            self.assertTrue((workspace / "TODO.md").exists())
            self.assertTrue((workspace / "CLAUDE.md").exists())
            self.assertTrue((workspace / "cross-squad" / "specs" / ".gitkeep").exists())
            self.assertTrue((workspace / "cross-squad" / "status" / ".gitkeep").exists())
            self.assertTrue(result["files_written"])

    def test_json_mode_outputs_machine_readable_result(self) -> None:
        with scratch_workspace("json-mode") as workspace:
            payload = {
                "initiative_name": "Billing Launch",
                "objective": "Stand up a usable context pack",
                "current_question": "What should we inspect first?",
                "target_date_or_window": "2026-04-01",
                "systems_in_scope": ["jira", "confluence"],
            }
            completed = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT_PATH),
                    "--workspace",
                    str(workspace),
                    "--json-in",
                    "-",
                    "--json-out",
                    "--anchor",
                    "BILL-920",
                    "--system",
                    "jira",
                    "--dry-run",
                ],
                input=json.dumps(payload),
                text=True,
                capture_output=True,
                check=True,
            )

            result = json.loads(completed.stdout)
            self.assertIn("workspace_state", result)
            self.assertIn("files_written", result)
            self.assertIn("action_plan", result)
            self.assertIn("candidate_sources", result)
            self.assertIn("bootstrap_context_paths", result)
            self.assertIn("connector_recommendations", result)
            self.assertIn("captured_context", result)
            self.assertIn("remaining_gaps", result)
            self.assertIn("bootstrap_questions", result)
            self.assertIn("next_prompt", result)

    def test_empty_workspace_requests_bootstrap_answers_before_readiness(self) -> None:
        with scratch_workspace("empty-workspace") as workspace:
            result = bootstrap.run_bootstrap(
                workspace,
                "none",
                {},
                dry_run=True,
                interactive=False,
                scaffold_mode="minimal",
            )

            self.assertTrue(result["bootstrap_questions"])
            self.assertEqual("provide_anchor", result["action_plan"]["primary_action"])
            self.assertEqual(result["next_prompt"], result["action_plan"]["run_this_now"])
            self.assertIn("Reply with one anchor", result["next_prompt"])
            self.assertIn("anchor artifact", result["bootstrap_questions"][0].lower())

    def test_known_anchor_removes_bootstrap_blocker(self) -> None:
        with scratch_workspace("known-anchor") as workspace:
            result = bootstrap.run_bootstrap(
                workspace,
                "none",
                {
                    "anchor": "ABC-123",
                    "anchor_system": "jira",
                },
                dry_run=True,
                interactive=False,
                scaffold_mode="minimal",
            )

            self.assertFalse(result["bootstrap_questions"])
            self.assertEqual([], result["remaining_gaps"])
            self.assertEqual("run_source_discovery", result["action_plan"]["primary_action"])
            self.assertTrue(result["action_plan"]["if_blocked"])
            self.assertIn(
                "mcp__atlassian__getAccessibleAtlassianResources()",
                result["action_plan"]["if_blocked"][0],
            )
            self.assertEqual(
                "Use program-truth to start from Jira ABC-123, inventory the available sources, identify the lowest execution-level artifacts, and gather the first useful context for this workspace.",
                result["next_prompt"],
            )

    def test_minimal_scaffold_for_local_anchor_writes_initial_context_only(self) -> None:
        with scratch_workspace("local-anchor") as workspace:
            (workspace / "status-note.md").write_text("Current status", encoding="utf-8")

            result = bootstrap.run_bootstrap(
                workspace,
                "none",
                {
                    "anchor": "status-note.md",
                    "anchor_system": "local",
                },
                dry_run=False,
                interactive=False,
                scaffold_mode="minimal",
            )

            self.assertTrue((workspace / "INITIAL-CONTEXT.md").exists())
            self.assertFalse((workspace / "TODO.md").exists())
            self.assertFalse((workspace / "CLAUDE.md").exists())
            self.assertFalse((workspace / "cross-squad").exists())
            initial_context_text = (workspace / "INITIAL-CONTEXT.md").read_text(
                encoding="utf-8"
            )
            self.assertIn("## Next Step", initial_context_text)
            self.assertIn("## If Blocked", initial_context_text)
            self.assertIn("## After That", initial_context_text)
            self.assertEqual(
                [{"path": "INITIAL-CONTEXT.md", "status": "created"}],
                result["files_written"],
            )

    def test_nested_program_truth_clone_is_bootstrap_context_only(self) -> None:
        with scratch_workspace("nested-skill-repo") as workspace:
            nested = workspace / ".codex-tmp-program-truth"
            (nested / "references").mkdir(parents=True)
            (nested / "scripts").mkdir()
            (nested / "examples").mkdir()
            (nested / "SKILL.md").write_text("skill", encoding="utf-8")
            (nested / "references" / "init-bootstrap.md").write_text(
                "Use program-truth init.",
                encoding="utf-8",
            )
            (nested / "references" / "framework.md").write_text(
                "framework",
                encoding="utf-8",
            )
            (nested / "references" / "source-ranking-and-reconciliation.md").write_text(
                "ranking",
                encoding="utf-8",
            )
            (nested / "scripts" / "bootstrap_program_truth.py").write_text(
                "# helper",
                encoding="utf-8",
            )
            (nested / "README.md").write_text("Jira key ABC-123", encoding="utf-8")
            (nested / "examples" / "example-INITIAL-CONTEXT.md").write_text(
                "Confluence https://example.atlassian.net/wiki/spaces/ENG/pages/123",
                encoding="utf-8",
            )

            result = bootstrap.run_bootstrap(
                workspace,
                "none",
                {},
                dry_run=True,
                interactive=False,
                scaffold_mode="minimal",
            )

            self.assertEqual([], result["candidate_sources"])
            self.assertIn(
                ".codex-tmp-program-truth/SKILL.md", result["bootstrap_context_paths"]
            )
            self.assertTrue(result["bootstrap_questions"])
            self.assertIn("Reply with one anchor", result["next_prompt"])


if __name__ == "__main__":
    unittest.main()

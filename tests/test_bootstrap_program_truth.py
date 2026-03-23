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
            self.assertIn("candidate_sources", result)
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
            )

            self.assertTrue(result["bootstrap_questions"])
            self.assertIn("Reply with the minimum context pack", result["next_prompt"])


if __name__ == "__main__":
    unittest.main()

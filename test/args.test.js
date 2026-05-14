import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCommand, parseOptions } from "../lib/args.js";

test("parseOptions separates positional args, flags, and values", () => {
  const options = parseOptions(["codex", "--target", "tmp/skill", "--backup", "--dry-run"]);
  assert.deepEqual(options._, ["codex"]);
  assert.equal(options.target, "tmp/skill");
  assert.equal(options.backup, true);
  assert.equal(options["dry-run"], true);
});

test("parseOptions rejects missing option values", () => {
  assert.throws(() => parseOptions(["--target"]), /Missing value/);
});

test("normalizeCommand maps doctor flags to the doctor command", () => {
  assert.equal(normalizeCommand("--doctor"), "doctor");
  assert.equal(normalizeCommand("-doctor"), "doctor");
  assert.equal(normalizeCommand("doctor"), "doctor");
});

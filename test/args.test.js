import test from "node:test";
import assert from "node:assert/strict";

import { parseOptions } from "../lib/args.js";

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

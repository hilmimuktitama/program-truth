import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { stdin } from "node:process";

const TEXT_EXTENSIONS = new Set([".md", ".markdown", ".txt", ".rst", ".json", ".yaml", ".yml"]);
const IGNORED_DIRS = new Set([".git", ".hg", ".svn", ".tmp-tests", ".pytest_cache", ".venv", "venv", "__pycache__", "node_modules"]);
const MAX_SCAN_BYTES = 200000;
const JIRA_KEY_RE = /\b[A-Z][A-Z0-9]+-\d+\b/g;
const JIRA_KEY_FULL_RE = /^[A-Z][A-Z0-9]+-\d+$/;
const ATLASSIAN_URL_RE = /https?:\/\/[A-Za-z0-9.-]+\.atlassian\.net\/[^\s)>"]+/g;
const NOTION_URL_RE = /https?:\/\/(?:(?:www\.)?notion\.so|[A-Za-z0-9-]+\.notion\.site)\/[^\s)>"]+/g;
const LOCAL_SOURCE_KEYWORDS = ["spec", "status", "meeting", "note", "decision", "todo"];
const ANCHOR_SYSTEMS = new Set(["jira", "confluence", "notion", "local"]);
const SCAFFOLD_MODES = new Set(["minimal", "full"]);
const PACKAGE_ROOT_FILES = new Set(["README.md", "INSTALL.md", "SKILL.md", "LICENSE", "SECURITY.md"]);
const PACKAGE_DIR_PREFIXES = new Set([".github", "examples", "references", "tests"]);
const BOOTSTRAP_CONTEXT_PREFERRED_PATHS = [
  "SKILL.md",
  "lib/bootstrap.js",
  "references/init-bootstrap.md",
  "references/framework.md",
  "references/source-ranking-and-reconciliation.md"
];

export async function loadJsonInput(jsonIn) {
  if (!jsonIn) return {};
  const raw = jsonIn === "-"
    ? await new Promise((resolvePromise) => {
        let data = "";
        stdin.setEncoding("utf8");
        stdin.on("data", (chunk) => { data += chunk; });
        stdin.on("end", () => resolvePromise(data));
      })
    : readFileSync(resolve(jsonIn), "utf8");
  if (!raw.trim()) return {};
  const payload = JSON.parse(raw);
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
}

function toPosix(path) {
  return path.split(sep).join("/");
}

function rel(path, workspace) {
  return toPosix(relative(workspace, path));
}

function safeStat(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

function walkFiles(root) {
  const files = [];
  function walk(current) {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile()) {
        files.push(path);
      }
    }
  }
  walk(root);
  return files;
}

function looksLikeSkillRepo(workspace) {
  return existsSync(join(workspace, "SKILL.md"))
    && existsSync(join(workspace, "references", "init-bootstrap.md"))
    && (existsSync(join(workspace, "scripts", "bootstrap_program_truth.py")) || existsSync(join(workspace, "lib", "bootstrap.js")));
}

function findBootstrapContextRoots(workspace) {
  const roots = [];
  if (looksLikeSkillRepo(workspace)) roots.push(workspace);
  for (const file of walkFiles(workspace)) {
    if (basename(file) !== "SKILL.md") continue;
    const root = dirname(file);
    if (root === workspace) continue;
    const parts = rel(root, workspace).split("/");
    if (parts.some((part) => IGNORED_DIRS.has(part))) continue;
    if (looksLikeSkillRepo(root)) roots.push(root);
  }
  return Array.from(new Set(roots)).sort((a, b) => rel(a, workspace).length - rel(b, workspace).length);
}

function isBootstrapContextPath(path, workspace, roots) {
  const pathRel = rel(path, workspace);
  for (const root of roots) {
    const rootRel = rel(root, workspace);
    if (!rootRel) return true;
    if (pathRel === rootRel || pathRel.startsWith(`${rootRel}/`)) return true;
  }
  return false;
}

function isPackageContextPath(path, workspace) {
  const pathRel = rel(path, workspace);
  const first = pathRel.split("/", 1)[0];
  return PACKAGE_ROOT_FILES.has(pathRel) || PACKAGE_DIR_PREFIXES.has(first);
}

export function findBootstrapContextPaths(workspaceInput) {
  const workspace = resolve(workspaceInput);
  const paths = [];
  for (const root of findBootstrapContextRoots(workspace)) {
    for (const path of BOOTSTRAP_CONTEXT_PREFERRED_PATHS) {
      const candidate = join(root, ...path.split("/"));
      if (existsSync(candidate)) paths.push(rel(candidate, workspace));
    }
  }
  return Array.from(new Set(paths));
}

function shouldScan(path, workspace, bootstrapContextRoots = []) {
  const pathRel = rel(path, workspace);
  const stat = safeStat(path);
  if (!stat) return false;
  if (!TEXT_EXTENSIONS.has(extname(path).toLowerCase())) return false;
  if (pathRel.split("/").some((part) => IGNORED_DIRS.has(part))) return false;
  if (bootstrapContextRoots.length && isBootstrapContextPath(path, workspace, bootstrapContextRoots)) return false;
  if (looksLikeSkillRepo(workspace) && isPackageContextPath(path, workspace)) return false;
  return stat.size <= MAX_SCAN_BYTES;
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  const out = [];
  for (const item of candidates) {
    const key = `${item.kind}\0${item.value}\0${item.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function findCandidateSources(workspaceInput) {
  const workspace = resolve(workspaceInput);
  const candidates = [];
  const localFileCandidates = [];
  const roots = findBootstrapContextRoots(workspace);
  for (const path of walkFiles(workspace)) {
    if (!shouldScan(path, workspace, roots)) continue;
    const text = readFileSync(path, "utf8");
    const pathRel = rel(path, workspace);

    for (const match of text.matchAll(JIRA_KEY_RE)) {
      candidates.push({ kind: "jira_key", value: match[0], path: pathRel });
    }
    for (const match of text.matchAll(ATLASSIAN_URL_RE)) {
      const value = match[0];
      candidates.push({ kind: value.includes("/wiki/") ? "confluence_url" : "jira_url", value, path: pathRel });
    }
    for (const match of text.matchAll(NOTION_URL_RE)) {
      candidates.push({ kind: "notion_url", value: match[0], path: pathRel });
    }
    const lowered = pathRel.toLowerCase();
    if (LOCAL_SOURCE_KEYWORDS.some((keyword) => lowered.includes(keyword))) {
      localFileCandidates.push({ kind: "local_file", value: pathRel, path: pathRel, mtime: statSync(path).mtimeMs });
    }
  }
  localFileCandidates.sort((a, b) => b.mtime - a.mtime);
  for (const item of localFileCandidates.slice(0, 5)) {
    candidates.push({ kind: item.kind, value: item.value, path: item.path });
  }
  return uniqueCandidates(candidates);
}

function normalizeAnchorSystem(raw) {
  const value = String(raw || "").trim().toLowerCase();
  return ANCHOR_SYSTEMS.has(value) ? value : "";
}

function normalizeSystems(raw) {
  const values = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const allowed = new Set(["jira", "confluence", "notion"]);
  return Array.from(new Set(values.map((item) => String(item).trim().toLowerCase()).filter((item) => allowed.has(item))));
}

function inferSystemsFromValues(values) {
  const inferred = [];
  for (const raw of values) {
    const text = String(raw || "").trim();
    if (!text) continue;
    if (JIRA_KEY_RE.test(text) || (text.includes(".atlassian.net/") && !text.includes("/wiki/"))) {
      if (!inferred.includes("jira")) inferred.push("jira");
    } else if (text.includes(".atlassian.net/wiki/")) {
      if (!inferred.includes("confluence")) inferred.push("confluence");
    } else if (text.includes("notion.so/") || text.includes(".notion.site/")) {
      if (!inferred.includes("notion")) inferred.push("notion");
    }
    JIRA_KEY_RE.lastIndex = 0;
  }
  return inferred;
}

function detectClient(workspace, explicit) {
  if (explicit !== "auto") return explicit;
  if (existsSync(join(workspace, "CLAUDE.md")) || existsSync(join(workspace, ".claude"))) return "claude";
  return "none";
}

function collectContext(inputData, workspace, client) {
  return {
    anchor: String(inputData.anchor || "").trim(),
    anchor_system: normalizeAnchorSystem(inputData.anchor_system),
    initiative_name: String(inputData.initiative_name || "").trim(),
    objective: String(inputData.objective || "").trim(),
    current_question: String(inputData.current_question || "").trim(),
    target_date_or_window: String(inputData.target_date_or_window || "").trim(),
    systems_in_scope: normalizeSystems(inputData.systems_in_scope),
    workstreams: inputData.workstreams || [],
    known_sources: inputData.known_sources || [],
    known_claims_to_validate: inputData.known_claims_to_validate || [],
    missing_access_or_limits: inputData.missing_access_or_limits || [],
    client,
    workspace_path: workspace
  };
}

function candidateValue(candidates, kinds, defaultValue) {
  for (const candidate of candidates) {
    if (kinds.has(candidate.kind)) return String(candidate.value);
  }
  return defaultValue;
}

function selectAnchor(context, candidates) {
  if (context.anchor) return context.anchor;
  if (context.known_sources?.length) {
    const anchor = String(context.known_sources[0] || "").trim();
    if (anchor) return anchor;
  }
  const anchor = candidateValue(candidates, new Set(["jira_key", "jira_url", "confluence_url", "notion_url", "local_file"]), "").trim();
  return anchor || null;
}

function inferSystems(context, candidates) {
  const systems = [...(context.systems_in_scope || [])];
  const inferred = [];
  if (["jira", "confluence", "notion"].includes(context.anchor_system)) inferred.push(context.anchor_system);
  for (const system of inferSystemsFromValues([context.anchor || ""])) {
    if (!inferred.includes(system)) inferred.push(system);
  }
  for (const candidate of candidates) {
    if (["jira_key", "jira_url"].includes(candidate.kind) && !inferred.includes("jira")) inferred.push("jira");
    if (candidate.kind === "confluence_url" && !inferred.includes("confluence")) inferred.push("confluence");
    if (candidate.kind === "notion_url" && !inferred.includes("notion")) inferred.push("notion");
  }
  for (const system of inferSystemsFromValues(context.known_sources || [])) {
    if (!inferred.includes(system)) inferred.push(system);
  }
  return Array.from(new Set([...systems, ...inferred]));
}

function detectAnchorSystem(context, candidates) {
  if (normalizeAnchorSystem(context.anchor_system)) return normalizeAnchorSystem(context.anchor_system);
  const anchor = selectAnchor(context, candidates);
  return anchor ? (inferSystemsFromValues([anchor])[0] || "") : "";
}

function formatAnchor(anchor, anchorSystem) {
  if (!anchor) return "[anchor]";
  if (anchorSystem === "jira" && JIRA_KEY_FULL_RE.test(anchor)) return `Jira ${anchor}`;
  if (anchorSystem === "confluence") return `Confluence ${anchor}`;
  if (anchorSystem === "notion") return `Notion ${anchor}`;
  if (anchorSystem === "local") return `local file ${anchor}`;
  return anchor;
}

function buildDiscoveryPrompt(context, candidates) {
  const anchor = selectAnchor(context, candidates) || "[anchor]";
  return `Use program-truth to start from ${formatAnchor(anchor, detectAnchorSystem(context, candidates))}, inventory the available sources, identify the lowest execution-level artifacts, and gather the first useful context for this workspace.`;
}

function buildRemainingGaps(context, candidates) {
  return selectAnchor(context, candidates) ? [] : ["one anchor artifact such as a Jira key/filter/board, Confluence page, Notion page/database, or local file"];
}

function buildConnectorRecommendations(systems, candidates) {
  const recommendations = [];
  const effective = systems.length ? systems : inferSystems({ systems_in_scope: [] }, candidates);
  if (effective.some((item) => ["jira", "confluence"].includes(item))) {
    recommendations.push({
      system: "atlassian",
      needed: true,
      applies_to: ["jira", "confluence"],
      smoke_test: "mcp__atlassian__getAccessibleAtlassianResources()",
      notes: ["Use Atlassian MCP or equivalent read access.", "Task-level Jira access matters more than parent summaries."]
    });
  }
  if (effective.includes("notion")) {
    recommendations.push({
      system: "notion",
      needed: true,
      applies_to: ["notion"],
      smoke_test: "Search the target page or database and confirm owner/status/date visibility plus last-edited timestamps.",
      notes: ["Use an approved Notion MCP or equivalent connector.", "Downgrade Notion if only prose is visible and operating fields are missing."]
    });
  }
  if (!recommendations.length) {
    recommendations.push({
      system: "local-only",
      needed: false,
      applies_to: [],
      smoke_test: "None yet. Bootstrap local context first.",
      notes: ["No external systems were detected or confirmed in scope.", "Start with local context and add connectors only when the program actually depends on them."]
    });
  }
  return recommendations;
}

function buildBootstrapQuestions(gaps) {
  return gaps.filter((gap) => gap.startsWith("one anchor artifact")).map(() => "One anchor artifact: Jira key/filter/board, Confluence page, Notion page/database, or local file path");
}

function buildNextPrompt(context, candidates, gaps) {
  if (!gaps.length) return buildDiscoveryPrompt(context, candidates);
  const systems = (context.systems_in_scope.length ? context.systems_in_scope : inferSystems(context, candidates)).join(", ") || "[auto-detect from anchor]";
  const sourceHint = (context.known_sources || [])[0] || candidateValue(candidates, new Set(["jira_key", "jira_url", "confluence_url", "notion_url", "local_file"]), "[fill in]");
  return `Reply with one anchor so program-truth can discover the rest:
- Anchor: ${sourceHint}
- Optional: initiative name
- Optional: target date or reporting window
- Optional: systems in scope if you already know them (${systems})
Accepted anchors: Jira key/filter/board, Confluence page, Notion page/database, or a local spec/status/meeting-note path.
After that, ask program-truth to start from that anchor, inventory the available sources, identify the lowest execution-level artifacts, and gather the first useful context for this workspace.`;
}

function buildIfBlockedSteps(recommendations) {
  const steps = [];
  for (const item of recommendations) {
    if (item.system === "atlassian" && item.needed) steps.push("If Jira or Confluence access is not confirmed, call `mcp__atlassian__getAccessibleAtlassianResources()`.");
    if (item.system === "notion" && item.needed) steps.push("If Notion access is not confirmed, search the target page or database and confirm owner/status/date visibility plus last-edited timestamps.");
  }
  return steps;
}

function buildActionPlan(context, candidates, gaps, recommendations) {
  if (gaps.length) {
    return {
      primary_action: "provide_anchor",
      run_this_now: buildNextPrompt(context, candidates, gaps),
      if_blocked: [],
      after_that: ["After you provide one anchor, run source discovery from it before asking for status-critical output."]
    };
  }
  return {
    primary_action: "run_source_discovery",
    run_this_now: buildDiscoveryPrompt(context, candidates),
    if_blocked: buildIfBlockedSteps(recommendations),
    after_that: ["Ask for `status`, `deps`, or `archaeology` only after task-level evidence is available."]
  };
}

function summarizeWorkspaceState(workspace, client) {
  return {
    workspace,
    client,
    existing_files: {
      "CLAUDE.md": existsSync(join(workspace, "CLAUDE.md")),
      "INITIAL-CONTEXT.md": existsSync(join(workspace, "INITIAL-CONTEXT.md")),
      "TODO.md": existsSync(join(workspace, "TODO.md")),
      "cross-squad/specs": existsSync(join(workspace, "cross-squad", "specs")),
      "cross-squad/status": existsSync(join(workspace, "cross-squad", "status"))
    }
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function renderBulletLines(items, defaultValue) {
  return (items.length ? items : [defaultValue]).map((item) => `- ${item}`).join("\n");
}

function isPlaceholderInitialContext(path) {
  if (!existsSync(path)) return true;
  const text = readFileSync(path, "utf8").trim();
  if (!text) return true;
  return text.includes("**Name:** [Program or launch name]") || text.includes("[What this initiative is trying to achieve]") || !text.includes("## Initiative");
}

function renderInitialContext(context, candidates, gaps, actionPlan, bootstrapContextPaths) {
  const today = todayIso();
  const systems = context.systems_in_scope.length ? context.systems_in_scope : inferSystems(context, candidates);
  const anchor = selectAnchor(context, candidates);
  const anchorSystem = detectAnchorSystem(context, candidates);
  const rows = [];
  if (systems.includes("jira")) rows.push(["Jira", "task-level execution", candidateValue(candidates, new Set(["jira_key", "jira_url"]), "[none captured yet]"), today, "Unknown"]);
  if (systems.includes("confluence")) rows.push(["Confluence", "sync notes, decisions", candidateValue(candidates, new Set(["confluence_url"]), "[none captured yet]"), today, "Unknown"]);
  if (systems.includes("notion")) rows.push(["Notion", "database rows or operating pages", candidateValue(candidates, new Set(["notion_url"]), "[none captured yet]"), today, "Unknown"]);
  if (anchorSystem === "local" || candidates.some((item) => item.kind === "local_file")) rows.push(["Local file", "current execution source", anchor || candidateValue(candidates, new Set(["local_file"]), "[none captured yet]"), today, "Yes"]);
  if (!rows.length) rows.push(["[Add after anchor]", "[What it contains]", "[link, key, or path]", today, "Unknown"]);
  const sourceLines = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  const workstreams = context.workstreams || [];
  const scopeLines = workstreams.length
    ? workstreams.filter((item) => item && typeof item === "object").map((item) => `| ${item.name || "[Workstream]"} | ${item.owner || "[Name]"} | ${item.area || "[Path or repo]"} | ${item.notes || "[Optional]"} |`).join("\n")
    : "| [Workstream] | [Name] | [Path or repo] | [Optional] |";
  const claims = context.known_claims_to_validate?.length ? context.known_claims_to_validate : ["[Add the first claim to validate]"];
  const currentSourceLine = anchor || (context.known_sources || [])[0] || candidateValue(candidates, new Set(["jira_key", "jira_url", "confluence_url", "notion_url", "local_file"]), "[Add one anchor artifact]");
  const missing = context.missing_access_or_limits?.length ? context.missing_access_or_limits : gaps.length ? gaps : ["[none yet]"];
  const bootstrapContextLines = bootstrapContextPaths.length ? bootstrapContextPaths.map((path) => `- \`${path}\``).join("\n") : "- none";
  return `# Initial Context Pack

Generated by \`program-truth bootstrap\`.

## Next Step

\`\`\`text
${actionPlan.run_this_now}
\`\`\`

## If Blocked

${renderBulletLines(actionPlan.if_blocked, "No connector prerequisite was identified for this step.")}

## After That

${renderBulletLines(actionPlan.after_that, "Ask for the next TPM artifact only after source discovery is complete.")}

## Initiative

**Name:** ${context.initiative_name || "[Fill in initiative name]"}
**Objective:** ${context.objective || "[Fill in objective]"}
**Current Question:** ${context.current_question || "[Fill in current question]"}
**Target Milestone Or Date:** ${context.target_date_or_window || "[Fill in target date or reporting window]"}
**Last Updated:** ${today}

## Starting Anchor

- Anchor: ${currentSourceLine}
- Anchor Type: ${anchorSystem || "[infer from anchor]"}
- Why it is current: [Confirm why this is the best starting point]

## Real Source Set

| System | What It Contains | Link / Path / Key | Freshness | Can The AI Read It? |
|--------|------------------|-------------------|-----------|---------------------|
${sourceLines}

## Ignored Bootstrap Context

${bootstrapContextLines}

## Scope

| Squad / Service | Owner | Repo / Area | Notes |
|-----------------|-------|-------------|-------|
${scopeLines}

## Known Claims To Validate

${claims.map((claim) => `- ${claim}`).join("\n")}

## Missing Access Or Confidence Limits

${missing.map((gap) => `- ${gap}`).join("\n")}
`;
}

function renderTodo(context, recommendations) {
  const lines = ["# TODO"];
  let hasContent = false;
  if (!context.anchor && !(context.known_sources || []).length) {
    lines.push("", "## Bootstrap", "- [ ] Add one anchor artifact the skill can start from");
    hasContent = true;
  }
  if (recommendations.some((item) => item.system === "atlassian")) {
    lines.push("", "## Connector Setup", "- [ ] Confirm Atlassian MCP access to Jira and Confluence", "- [ ] Run mcp__atlassian__getAccessibleAtlassianResources()");
    hasContent = true;
  }
  if (recommendations.some((item) => item.system === "notion")) {
    if (!lines.includes("## Connector Setup")) lines.push("", "## Connector Setup");
    lines.push("- [ ] Confirm Notion connector search/page/database access");
    hasContent = true;
  }
  return hasContent ? `${lines.join("\n")}\n` : "";
}

function renderClaudeMd(context) {
  return `## TPM Workspace

**Last Updated:** ${todayIso()}

## Active Programs
| Program | Spec | Status |
|---------|------|--------|
| ${context.initiative_name || "[Program]"} | \`cross-squad/specs/\` | Bootstrap |

## Key References
- \`INITIAL-CONTEXT.md\`
- \`TODO.md\`
- \`cross-squad/specs/\`
- \`cross-squad/status/\`

## Workflow Rules
- Normalize dates into \`YYYY-MM-DD\`
- Report execution truth from the lowest work unit available
- Distinguish facts, inferences, unknowns, and conflicts
`;
}

function writeTextFile(path, content, dryRun, replace = false) {
  const existed = existsSync(path);
  if (existed && !replace) return null;
  if (!dryRun) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf8");
  }
  return existed ? "updated" : "created";
}

function ensureDirectory(path, dryRun) {
  if (existsSync(path)) return null;
  if (!dryRun) mkdirSync(path, { recursive: true });
  return "created";
}

function shouldCreateWorkstreamDirs(context, scaffoldMode) {
  if (scaffoldMode === "full") return true;
  return (context.workstreams || []).filter((item) => item && typeof item === "object").length > 1;
}

function applyScaffold(workspace, client, context, candidates, recommendations, gaps, actionPlan, bootstrapContextPaths, dryRun, scaffoldMode) {
  const filesWritten = [];
  if (shouldCreateWorkstreamDirs(context, scaffoldMode)) {
    for (const dir of [join(workspace, "cross-squad", "specs"), join(workspace, "cross-squad", "status")]) {
      const status = ensureDirectory(dir, dryRun);
      if (status) filesWritten.push({ path: rel(dir, workspace), status });
    }
    for (const keep of [join(workspace, "cross-squad", "specs", ".gitkeep"), join(workspace, "cross-squad", "status", ".gitkeep")]) {
      const status = writeTextFile(keep, "", dryRun);
      if (status) filesWritten.push({ path: rel(keep, workspace), status });
    }
  }
  const initial = join(workspace, "INITIAL-CONTEXT.md");
  const initialStatus = writeTextFile(initial, renderInitialContext(context, candidates, gaps, actionPlan, bootstrapContextPaths), dryRun, isPlaceholderInitialContext(initial));
  if (initialStatus) filesWritten.push({ path: "INITIAL-CONTEXT.md", status: initialStatus });
  const todo = renderTodo(context, recommendations);
  if (todo) {
    const status = writeTextFile(join(workspace, "TODO.md"), todo, dryRun);
    if (status) filesWritten.push({ path: "TODO.md", status });
  }
  if (client === "claude" && scaffoldMode === "full") {
    const status = writeTextFile(join(workspace, "CLAUDE.md"), renderClaudeMd(context), dryRun);
    if (status) filesWritten.push({ path: "CLAUDE.md", status });
  }
  return filesWritten;
}

export function runBootstrap({ workspace = ".", clientMode = "auto", inputData = {}, dryRun = false, scaffoldMode = "minimal" } = {}) {
  if (!SCAFFOLD_MODES.has(scaffoldMode)) throw new Error(`Invalid scaffold mode: ${scaffoldMode}`);
  const resolvedWorkspace = resolve(workspace);
  if (!dryRun) mkdirSync(resolvedWorkspace, { recursive: true });
  const client = detectClient(resolvedWorkspace, clientMode);
  const candidates = existsSync(resolvedWorkspace) ? findCandidateSources(resolvedWorkspace) : [];
  const bootstrapContextPaths = existsSync(resolvedWorkspace) ? findBootstrapContextPaths(resolvedWorkspace) : [];
  const context = collectContext(inputData, resolvedWorkspace, client);
  if (!context.systems_in_scope.length) context.systems_in_scope = inferSystems(context, candidates);
  const remainingGaps = buildRemainingGaps(context, candidates);
  const recommendations = buildConnectorRecommendations(context.systems_in_scope, candidates);
  const bootstrapQuestions = buildBootstrapQuestions(remainingGaps);
  const actionPlan = buildActionPlan(context, candidates, remainingGaps, recommendations);
  const filesWritten = applyScaffold(resolvedWorkspace, client, context, candidates, recommendations, remainingGaps, actionPlan, bootstrapContextPaths, dryRun, scaffoldMode);
  return {
    workspace_state: summarizeWorkspaceState(resolvedWorkspace, client),
    files_written: filesWritten,
    action_plan: actionPlan,
    candidate_sources: candidates.slice(0, 12),
    bootstrap_context_paths: bootstrapContextPaths,
    connector_recommendations: recommendations,
    captured_context: {
      anchor: selectAnchor(context, candidates),
      anchor_system: detectAnchorSystem(context, candidates),
      initiative_name: context.initiative_name,
      objective: context.objective,
      current_question: context.current_question,
      target_date_or_window: context.target_date_or_window,
      systems_in_scope: context.systems_in_scope
    },
    remaining_gaps: remainingGaps,
    bootstrap_questions: bootstrapQuestions,
    next_prompt: actionPlan.run_this_now
  };
}

export function humanSummary(result) {
  const lines = [
    `Initialized the program-truth workspace scaffold in ${result.workspace_state.workspace}.`,
    "",
    "Next Step:",
    result.action_plan.run_this_now,
    "",
    "If Blocked:"
  ];
  lines.push(...(result.action_plan.if_blocked.length ? result.action_plan.if_blocked.map((item) => `- ${item}`) : ["- none identified yet"]));
  lines.push("", "After That:", ...result.action_plan.after_that.map((item) => `- ${item}`));
  lines.push("", "Files written:", ...(result.files_written.length ? result.files_written.map((item) => `- ${item.path} (${item.status})`) : ["- none"]));
  lines.push("", "Best candidate sources found:", ...(result.candidate_sources.length ? result.candidate_sources.slice(0, 8).map((item) => `- ${item.kind}: ${item.value} (${item.path})`) : ["- none in the current workspace yet"]));
  lines.push("", "Ignored bootstrap context:", ...(result.bootstrap_context_paths.length ? result.bootstrap_context_paths.map((path) => `- ${path}`) : ["- none"]));
  lines.push("", "Remaining gaps:", ...(result.remaining_gaps.length ? result.remaining_gaps.map((gap) => `- ${gap}`) : ["- none critical"]));
  return lines.join("\n");
}

export function defaultHome() {
  return homedir();
}

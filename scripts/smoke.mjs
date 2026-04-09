#!/usr/bin/env node
// E2E smoke test: build the CLI, scaffold a project into a temp dir,
// assert key files exist, then clean up.
//
// Run with: pnpm smoke

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliEntry = path.join(repoRoot, "dist", "index.js");

function log(msg) {
  process.stdout.write(`[smoke] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[smoke] FAIL: ${msg}\n`);
  process.exit(1);
}

// 1. Ensure a fresh build.
log("building CLI…");
const build = spawnSync("pnpm", ["build"], { cwd: repoRoot, stdio: "inherit" });
if (build.status !== 0) fail("pnpm build failed");

if (!existsSync(cliEntry)) fail(`CLI entry not found at ${cliEntry}`);

// 2. Scaffold into a temp dir.
const workDir = mkdtempSync(path.join(tmpdir(), "agentforge-smoke-"));
const projectName = "smoke-app";
const projectDir = path.join(workDir, projectName);

log(`scaffolding ${projectName} in ${workDir}`);
const run = spawnSync(
  process.execPath,
  [cliEntry, "new", projectName, "--yes", "--no-install", "--no-git", "--lang", "en"],
  { cwd: workDir, stdio: "inherit" },
);
if (run.status !== 0) {
  rmSync(workDir, { recursive: true, force: true });
  fail(`CLI exited with status ${run.status}`);
}

// 3. Assertions.
const expected = [
  ".claude/agents/project-manager.md",
  ".claude/commands/plan.md",
  ".claude/settings.json",
  ".agent-memory/project.md",
  ".agent-memory/session-log.md",
  ".gitignore",
  "CLAUDE.md",
  "apps/backend/CLAUDE.md",
  "apps/frontend/CLAUDE.md",
  "scripts/init-project.sh",
  "lefthook.yml",
  "pnpm-workspace.yaml",
  "package.json",
];

const missing = expected.filter((rel) => !existsSync(path.join(projectDir, rel)));
if (missing.length > 0) {
  rmSync(workDir, { recursive: true, force: true });
  fail(`missing files:\n  ${missing.join("\n  ")}`);
}

// package.json should have the substituted name.
const pkg = JSON.parse(readFileSync(path.join(projectDir, "package.json"), "utf8"));
if (pkg.name !== projectName) {
  rmSync(workDir, { recursive: true, force: true });
  fail(`package.json name is "${pkg.name}", expected "${projectName}"`);
}
if (/\{\{/.test(JSON.stringify(pkg))) {
  rmSync(workDir, { recursive: true, force: true });
  fail("unresolved {{var}} placeholder in package.json");
}

// 4. Cleanup.
rmSync(workDir, { recursive: true, force: true });
log("OK — all assertions passed");

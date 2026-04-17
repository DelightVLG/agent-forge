import path from 'node:path';
import fse from 'fs-extra';
import { renderString, type RenderVars } from './render.js';
import { resolveTemplatesDir } from './paths.js';
import { getSkillDef, resolveAgents } from './skills-registry.js';

export interface ProjectStructure {
  backend: boolean;
  web: boolean;
  mobile: boolean;
}

export interface CopyTemplateOptions {
  /**
   * Path to a legacy monolithic template directory. When set, the copier walks
   * this directory as-is. Used only by the `minimal` template for now.
   */
  sourceDir?: string;

  /**
   * When set, the copier composes the project from the shared `_base` layer
   * plus one `_apps/<name>` layer per enabled platform. `sourceDir` is ignored
   * when `structure` is provided.
   */
  structure?: ProjectStructure;

  targetDir: string;
  variables: RenderVars;
  skills?: string[];
}

/**
 * Copy template content into a target directory. File/dir renaming rules:
 *  - `_name`  → `.name`   (dotfile restoration)
 *  - `x.hbs`  → `x`       (strip .hbs suffix + render)
 *  - `{{var}}` substitution in any text file while walking.
 *
 * When `skills` is provided, selected skills and required agents are copied
 * from `templates/_shared/` into the target `.claude/` directory.
 */
export async function copyTemplate(opts: CopyTemplateOptions): Promise<void> {
  const { sourceDir, structure, targetDir, variables, skills } = opts;
  await fse.ensureDir(targetDir);

  const renderVars: RenderVars = {
    ...variables,
    ...(structure
      ? {
          backend: structure.backend,
          web: structure.web,
          mobile: structure.mobile,
          hasApps: structure.backend || structure.web || structure.mobile,
          hasSharedPackages: structure.web && structure.mobile,
          hasFrontend: structure.web || structure.mobile,
        }
      : {}),
  };

  if (structure) {
    await composeFromLayers(targetDir, structure, renderVars);
  } else if (sourceDir) {
    await walk(sourceDir, targetDir, renderVars);
  } else {
    throw new Error('copyTemplate requires either `sourceDir` or `structure`.');
  }

  if (skills && skills.length > 0) {
    await copySkillsAndAgents(targetDir, skills);
  }
}

async function composeFromLayers(
  targetDir: string,
  structure: ProjectStructure,
  vars: RenderVars,
): Promise<void> {
  const templatesDir = resolveTemplatesDir();
  const baseDir = path.join(templatesDir, '_base');
  const appsDir = path.join(templatesDir, '_apps');

  await walk(baseDir, targetDir, vars);

  const enabled: Array<keyof ProjectStructure> = [];
  if (structure.backend) enabled.push('backend');
  if (structure.web) enabled.push('web');
  if (structure.mobile) enabled.push('mobile');

  if (enabled.length === 0) return;

  const targetAppsDir = path.join(targetDir, 'apps');
  await fse.ensureDir(targetAppsDir);

  for (const app of enabled) {
    const src = path.join(appsDir, app);
    const dest = path.join(targetAppsDir, app);
    if (!(await fse.pathExists(src))) continue;
    await fse.ensureDir(dest);
    await walk(src, dest, vars);
  }
}

/**
 * Remove files that only make sense when at least one app exists. Used by the
 * `new` command when the user opts out of every platform (pure agent-memory
 * skeleton, same spirit as the `minimal` template).
 */
export async function pruneEmptyAppsArtifacts(targetDir: string): Promise<void> {
  for (const rel of ['pnpm-workspace.yaml', 'apps']) {
    const abs = path.join(targetDir, rel);
    if (await fse.pathExists(abs)) {
      await fse.remove(abs);
    }
  }
}

async function copySkillsAndAgents(targetDir: string, skillIds: string[]): Promise<void> {
  const templatesDir = resolveTemplatesDir();
  const sharedDir = path.join(templatesDir, '_shared');
  const sharedSkillsDir = path.join(sharedDir, 'skills');
  const sharedAgentsDir = path.join(sharedDir, 'agents');

  const claudeDir = path.join(targetDir, '.claude');

  for (const id of skillIds) {
    const def = getSkillDef(id);
    if (!def) continue;

    const src = path.join(sharedSkillsDir, def.file);
    const dest = path.join(claudeDir, 'skills', def.file);

    if (await fse.pathExists(src)) {
      await fse.ensureDir(path.dirname(dest));
      await fse.copy(src, dest);
    }
  }

  const agents = resolveAgents(skillIds);
  for (const agent of agents) {
    const src = path.join(sharedAgentsDir, `${agent}.md`);
    const dest = path.join(claudeDir, 'agents', `${agent}.md`);

    if (await fse.pathExists(src)) {
      await fse.ensureDir(path.dirname(dest));
      await fse.copy(src, dest);
    }
  }
}

async function walk(src: string, dest: string, vars: RenderVars): Promise<void> {
  const entries = await fse.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const renamed = renameEntry(entry.name);
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, renamed.name);

    if (entry.isDirectory()) {
      await fse.ensureDir(destPath);
      await walk(srcPath, destPath, vars);
      continue;
    }

    if (entry.isSymbolicLink()) {
      const link = await fse.readlink(srcPath);
      await fse.symlink(link, destPath);
      continue;
    }

    if (renamed.render) {
      const raw = await fse.readFile(srcPath, 'utf8');
      await fse.writeFile(destPath, renderString(raw, vars), 'utf8');
    } else {
      await fse.copyFile(srcPath, destPath);
    }
  }
}

interface RenamedEntry {
  name: string;
  render: boolean;
}

function renameEntry(name: string): RenamedEntry {
  let out = name;
  let render = false;
  if (out.startsWith('_')) out = '.' + out.slice(1);
  if (out.endsWith('.hbs')) {
    out = out.slice(0, -4);
    render = true;
  }
  return { name: out, render };
}

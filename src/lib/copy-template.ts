import path from "node:path";
import fse from "fs-extra";
import { renderString } from "./render.js";

export interface CopyTemplateOptions {
  sourceDir: string;
  targetDir: string;
  variables: Record<string, string>;
}

/**
 * Recursively copy a template directory into a target directory, applying:
 *  - `_name`  → `.name`    (dotfile restoration)
 *  - `x.hbs`  → `x`        (strip .hbs suffix)
 *  - `{{var}}` substitution in file contents for known text extensions and .hbs files.
 */
export async function copyTemplate(opts: CopyTemplateOptions): Promise<void> {
  const { sourceDir, targetDir, variables } = opts;
  await fse.ensureDir(targetDir);
  await walk(sourceDir, targetDir, variables);
}

async function walk(src: string, dest: string, vars: Record<string, string>): Promise<void> {
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
      const raw = await fse.readFile(srcPath, "utf8");
      await fse.writeFile(destPath, renderString(raw, vars), "utf8");
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
  if (out.startsWith("_")) out = "." + out.slice(1);
  if (out.endsWith(".hbs")) {
    out = out.slice(0, -4);
    render = true;
  }
  return { name: out, render };
}

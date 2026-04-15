import path from "node:path";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { copyTemplate } from "../lib/copy-template.js";
import { resolveTemplatesDir } from "../lib/paths.js";
import { t } from "../i18n/index.js";
import {
  type SkillCategory,
  getSkillsByCategory,
  getDefaultSkills,
} from "../lib/skills-registry.js";

interface ProjectStructure {
  backend: boolean;
  web: boolean;
  mobile: boolean;
}

interface NewOptions {
  template?: string;
  install?: boolean;
  git?: boolean;
  yes?: boolean;
  skills?: string | boolean;
  skipSkills?: boolean;
}

export function registerNewCommand(program: Command): void {
  program
    .command("new [name]")
    .description(t("newDescription"))
    .option("-t, --template <name>", t("optTemplate"))
    .option("--install", t("optInstall"))
    .option("--no-install", t("optNoInstall"))
    .option("--git", t("optGit"))
    .option("--no-git", t("optNoGit"))
    .option("-y, --yes", t("optYes"))
    .option("-s, --skills <list>", t("optSkills"))
    .option("--skip-skills", t("optNoSkills"))
    .action(async (nameArg: string | undefined, options: NewOptions) => {
      await runNew(nameArg, options);
    });
}

async function runNew(
  nameArg: string | undefined,
  options: NewOptions,
): Promise<void> {
  p.intro(pc.bgCyan(pc.black(t("intro"))));

  const projectName = await resolveProjectName(nameArg, options.yes);
  const targetDir = path.resolve(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    const entries = await readdir(targetDir);
    if (entries.length > 0) {
      if (options.yes) {
        p.cancel(t("dirNotEmptyFatal", { path: targetDir }));
        process.exit(1);
      }
      const proceed = await p.confirm({
        message: t("dirNotEmpty", { name: pc.cyan(projectName) }),
        initialValue: false,
      });
      if (p.isCancel(proceed) || !proceed) {
        p.cancel(t("aborted"));
        process.exit(1);
      }
    }
  }

  const templatesDir = resolveTemplatesDir();

  let template: string;
  let structure: ProjectStructure;

  if (options.template) {
    template = options.template;
    structure = templateToStructure(template);
  } else if (options.yes) {
    template = "default";
    structure = { backend: true, web: true, mobile: true };
  } else {
    structure = await resolveProjectStructure();
    template = structureToTemplate(structure);
  }

  const templateDir = path.join(templatesDir, template);
  if (!existsSync(templateDir)) {
    p.cancel(t("templateNotFound", { template, path: templateDir }));
    process.exit(1);
  }

  const skillCategories = structureToCategories(structure);

  const skills = await resolveSkills(
    template,
    skillCategories,
    typeof options.skills === "string" ? options.skills : undefined,
    options.yes,
    options.skipSkills,
  );

  const shouldGit = await resolveBool(
    options.git,
    options.yes,
    t("confirmGit"),
    true,
  );
  const shouldInstall = await resolveBool(
    options.install,
    options.yes,
    t("confirmInstall"),
    false,
  );

  const spin = p.spinner();
  spin.start(t("copyingTemplate", { template }));
  await copyTemplate({
    sourceDir: templateDir,
    targetDir,
    variables: { projectName },
    skills,
  });
  spin.stop(
    t("templateCopied", {
      path: pc.cyan(path.relative(process.cwd(), targetDir) || "."),
    }),
  );

  if (skills.length > 0) {
    p.log.info(t("skillsCopied", { count: String(skills.length) }));
  }

  if (shouldGit) {
    spin.start(t("gitInit"));
    const res = spawnSync("git", ["init", "-q"], {
      cwd: targetDir,
      stdio: "ignore",
    });
    if (res.status === 0) spin.stop(t("gitInitialized"));
    else spin.stop(pc.yellow(t("gitSkipped")));
  }

  if (shouldInstall) {
    spin.start(t("pnpmInstall"));
    const res = spawnSync("pnpm", ["install"], {
      cwd: targetDir,
      stdio: "ignore",
    });
    if (res.status === 0) spin.stop(t("pnpmInstalled"));
    else spin.stop(pc.yellow(t("pnpmFailed")));
  }

  const rel = path.relative(process.cwd(), targetDir) || ".";
  p.note(
    [
      `cd ${rel}`,
      shouldInstall ? null : "pnpm install",
      t("nextStepsComment"),
      "/init-project",
    ]
      .filter(Boolean)
      .join("\n"),
    t("nextStepsTitle"),
  );
  p.outro(pc.green(t("done")));
}

async function resolveSkills(
  template: string,
  categories: SkillCategory[],
  flag: string | undefined,
  yes: boolean | undefined,
  skipSkills: boolean | undefined,
): Promise<string[]> {
  if (skipSkills) return [];
  if (flag) return flag.split(",").map((s) => s.trim());
  if (yes) return getDefaultSkills(template);

  const selected: string[] = [];

  for (const category of categories) {
    const skills = getSkillsByCategory(category);
    if (skills.length === 0) continue;

    const defaults = getDefaultSkills(template);
    const initialValues = skills
      .filter((s) => defaults.includes(s.id))
      .map((s) => s.id);

    const answer = await p.multiselect({
      message: t(`selectSkills_${category}` as keyof typeof t),
      options: skills.map((s) => ({
        value: s.id,
        label: s.name,
      })),
      initialValues,
      required: false,
    });

    if (p.isCancel(answer)) {
      p.cancel(t("aborted"));
      process.exit(1);
    }

    selected.push(...(answer as string[]));
  }

  return selected;
}

async function resolveProjectName(
  nameArg: string | undefined,
  yes: boolean | undefined,
): Promise<string> {
  if (nameArg && isValidName(nameArg)) return nameArg;
  if (nameArg && !isValidName(nameArg)) {
    p.cancel(t("projectNameInvalidArg", { name: nameArg }));
    process.exit(1);
  }
  if (yes) {
    p.cancel(t("projectNameRequiredWithYes"));
    process.exit(1);
  }
  const answer = await p.text({
    message: t("projectNamePrompt"),
    placeholder: t("projectNamePlaceholder"),
    validate: (v) => (isValidName(v) ? undefined : t("projectNameInvalid")),
  });
  if (p.isCancel(answer)) {
    p.cancel(t("aborted"));
    process.exit(1);
  }
  return answer;
}

async function resolveBool(
  flag: boolean | undefined,
  yes: boolean | undefined,
  message: string,
  defaultValue: boolean,
): Promise<boolean> {
  if (typeof flag === "boolean") return flag;
  if (yes) return defaultValue;
  const answer = await p.confirm({ message, initialValue: defaultValue });
  if (p.isCancel(answer)) {
    p.cancel(t("aborted"));
    process.exit(1);
  }
  return answer;
}

async function resolveProjectStructure(): Promise<ProjectStructure> {
  const backend = await confirmOrCancel(t("needBackend"), true);

  let web = false;
  let mobile = false;

  const frontend = await confirmOrCancel(t("needFrontend"), true);
  if (frontend) {
    web = await confirmOrCancel(t("needWeb"), true);
    mobile = await confirmOrCancel(t("needMobile"), true);
    if (!web && !mobile) {
      web = true;
    }
  }

  const structure = { backend, web, mobile };

  if (!backend && !web && !mobile) {
    p.log.info(t("nothingSelectedInfo"));
  }

  return structure;
}

function structureToTemplate(s: ProjectStructure): string {
  const has = { b: s.backend, w: s.web, m: s.mobile };
  if (has.b && (has.w || has.m)) return "default";
  if (has.b && !has.w && !has.m) return "backend-only";
  if (!has.b && has.w && !has.m) return "web-only";
  if (!has.b && !has.w && has.m) return "mobile-only";
  if (!has.b && has.w && has.m) return "default";
  return "minimal";
}

function templateToStructure(template: string): ProjectStructure {
  switch (template) {
    case "default":
      return { backend: true, web: true, mobile: true };
    case "backend-only":
      return { backend: true, web: false, mobile: false };
    case "web-only":
      return { backend: false, web: true, mobile: false };
    case "mobile-only":
      return { backend: false, web: false, mobile: true };
    default:
      return { backend: false, web: false, mobile: false };
  }
}

function structureToCategories(s: ProjectStructure): SkillCategory[] {
  const cats: SkillCategory[] = [];
  if (s.backend) cats.push("backend");
  if (s.web) cats.push("frontend");
  if (s.mobile) cats.push("mobile");
  cats.push("common");
  if (!s.backend && !s.web && !s.mobile) {
    return ["backend", "frontend", "mobile", "common"];
  }
  return cats;
}

async function confirmOrCancel(
  message: string,
  initialValue: boolean,
): Promise<boolean> {
  const answer = await p.confirm({ message, initialValue });
  if (p.isCancel(answer)) {
    p.cancel(t("aborted"));
    process.exit(1);
  }
  return answer;
}

function isValidName(name: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name);
}

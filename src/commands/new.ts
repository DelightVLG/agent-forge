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

interface NewOptions {
  template?: string;
  install?: boolean;
  git?: boolean;
  yes?: boolean;
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
    .action(async (nameArg: string | undefined, options: NewOptions) => {
      await runNew(nameArg, options);
    });
}

async function runNew(nameArg: string | undefined, options: NewOptions): Promise<void> {
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
  const template = await resolveTemplate(options.template, options.yes);
  const templateDir = path.join(templatesDir, template);
  if (!existsSync(templateDir)) {
    p.cancel(t("templateNotFound", { template, path: templateDir }));
    process.exit(1);
  }

  const shouldGit = await resolveBool(options.git, options.yes, t("confirmGit"), true);
  const shouldInstall = await resolveBool(options.install, options.yes, t("confirmInstall"), false);

  const spin = p.spinner();
  spin.start(t("copyingTemplate", { template }));
  await copyTemplate({
    sourceDir: templateDir,
    targetDir,
    variables: { projectName },
  });
  spin.stop(t("templateCopied", { path: pc.cyan(path.relative(process.cwd(), targetDir) || ".") }));

  if (shouldGit) {
    spin.start(t("gitInit"));
    const res = spawnSync("git", ["init", "-q"], { cwd: targetDir, stdio: "ignore" });
    if (res.status === 0) spin.stop(t("gitInitialized"));
    else spin.stop(pc.yellow(t("gitSkipped")));
  }

  if (shouldInstall) {
    spin.start(t("pnpmInstall"));
    const res = spawnSync("pnpm", ["install"], { cwd: targetDir, stdio: "ignore" });
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

async function resolveProjectName(nameArg: string | undefined, yes: boolean | undefined): Promise<string> {
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

async function resolveTemplate(
  flag: string | undefined,
  yes: boolean | undefined,
): Promise<string> {
  if (flag !== undefined) return flag;
  if (yes) return "default";
  const answer = await p.select({
    message: t("selectTemplate"),
    options: [
      { value: "default", label: t("templateDefaultLabel") },
      { value: "backend-only", label: t("templateBackendLabel") },
      { value: "web-only", label: t("templateWebLabel") },
      { value: "mobile-only", label: t("templateMobileLabel") },
      { value: "minimal", label: t("templateMinimalLabel") },
    ],
  });
  if (p.isCancel(answer)) {
    p.cancel(t("aborted"));
    process.exit(1);
  }
  return answer;
}

function isValidName(name: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name);
}

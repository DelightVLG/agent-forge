import { Command } from "commander";
import pc from "picocolors";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { registerNewCommand } from "./commands/new.js";
import { setLang, t } from "./i18n/index.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

export async function main(argv: string[]): Promise<void> {
  // Pre-parse --lang so that command descriptions pick up the right locale.
  applyLangFromArgv(argv);

  const program = new Command();

  program
    .name("agentforge")
    .description(t("cliDescription"))
    .option("--lang <lang>", t("optLang"))
    .version(pkg.version, "-v, --version", t("optVersion"));

  registerNewCommand(program);

  program.hook("preAction", (thisCommand) => {
    const { lang } = thisCommand.optsWithGlobals<{ lang?: string }>();
    setLang(lang);
  });

  await program.parseAsync(argv);
}

function applyLangFromArgv(argv: string[]): void {
  const idx = argv.indexOf("--lang");
  if (idx !== -1 && argv[idx + 1]) {
    setLang(argv[idx + 1]);
    return;
  }
  const eq = argv.find((a) => a.startsWith("--lang="));
  if (eq) setLang(eq.slice("--lang=".length));
}

const isEntry =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntry) {
  main(process.argv).catch((err) => {
    console.error(pc.red("✖"), err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

import { Command } from 'commander';
import pc from 'picocolors';
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { registerNewCommand } from './commands/new.js';
import { registerAddCommand } from './commands/add.js';
import { setLang, t } from './i18n/index.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

export async function main(argv: string[]): Promise<void> {
  // Pre-parse --lang so that command descriptions pick up the right locale.
  applyLangFromArgv(argv);

  const program = new Command();

  program
    .name('agentforge')
    .description(t('cliDescription'))
    .option('--lang <lang>', t('optLang'))
    .version(pkg.version, '-v, --version', t('optVersion'));

  registerNewCommand(program);
  registerAddCommand(program);

  program.hook('preAction', (thisCommand) => {
    const { lang } = thisCommand.optsWithGlobals<{ lang?: string }>();
    setLang(lang);
  });

  await program.parseAsync(argv);
}

function applyLangFromArgv(argv: string[]): void {
  const idx = argv.indexOf('--lang');
  if (idx !== -1 && argv[idx + 1]) {
    setLang(argv[idx + 1]);
    return;
  }
  const eq = argv.find((a) => a.startsWith('--lang='));
  if (eq) setLang(eq.slice('--lang='.length));
}

const isEntry = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return import.meta.url === pathToFileURL(entry).href;
  }
})();

if (isEntry) {
  main(process.argv).catch((err) => {
    console.error(pc.red('✖'), err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

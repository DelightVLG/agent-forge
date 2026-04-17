import path from 'node:path';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { type Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { copyTemplate } from '../lib/copy-template.js';
import { resolveTemplatesDir } from '../lib/paths.js';
import { t } from '../i18n/index.js';
import {
  type SkillCategory,
  getSkillsByCategory,
  getDefaultSkills,
} from '../lib/skills-registry.js';

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

interface Answers {
  projectName: string;
  structure: ProjectStructure;
  template: string;
  skills: string[];
  git: boolean;
  install: boolean;
}

export function registerNewCommand(program: Command): void {
  program
    .command('new [name]')
    .description(t('newDescription'))
    .option('-t, --template <name>', t('optTemplate'))
    .option('--install', t('optInstall'))
    .option('--no-install', t('optNoInstall'))
    .option('--git', t('optGit'))
    .option('--no-git', t('optNoGit'))
    .option('-y, --yes', t('optYes'))
    .option('-s, --skills <list>', t('optSkills'))
    .option('--skip-skills', t('optNoSkills'))
    .action(async (nameArg: string | undefined, options: NewOptions) => {
      await runNew(nameArg, options);
    });
}

async function runNew(nameArg: string | undefined, options: NewOptions): Promise<void> {
  p.intro(pc.bgCyan(pc.black(t('intro'))));

  const projectName = await resolveProjectName(nameArg, options.yes);
  const targetDir = path.resolve(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    const entries = await readdir(targetDir);
    if (entries.length > 0) {
      if (options.yes) {
        p.cancel(t('dirNotEmptyFatal', { path: targetDir }));
        process.exit(1);
      }
      const proceed = await p.confirm({
        message: t('dirNotEmpty', { name: pc.cyan(projectName) }),
        initialValue: false,
      });
      if (p.isCancel(proceed) || !proceed) {
        p.cancel(t('aborted'));
        process.exit(1);
      }
    }
  }

  const templatesDir = resolveTemplatesDir();

  // 1. Собираем начальные ответы (флаги / интерактив).
  const answers = await collectInitialAnswers(projectName, options);

  // 2. Интерактивный цикл «сводка → редактирование».
  //    В неинтерактивном режиме (`--yes`/`--template`) пропускаем.
  if (!options.yes) {
    await reviewLoop(answers, options);
  }

  // 3. Валидация шаблона после всех изменений.
  const templateDir = path.join(templatesDir, answers.template);
  if (!existsSync(templateDir)) {
    p.cancel(t('templateNotFound', { template: answers.template, path: templateDir }));
    process.exit(1);
  }

  // 4. Копируем и настраиваем.
  const spin = p.spinner();
  spin.start(t('copyingTemplate', { template: answers.template }));
  await copyTemplate({
    sourceDir: templateDir,
    targetDir,
    variables: { projectName: answers.projectName },
    skills: answers.skills,
  });
  spin.stop(
    t('templateCopied', {
      path: pc.cyan(path.relative(process.cwd(), targetDir) || '.'),
    }),
  );

  if (answers.skills.length > 0) {
    p.log.info(t('skillsCopied', { count: String(answers.skills.length) }));
  }

  if (answers.git) {
    spin.start(t('gitInit'));
    const res = spawnSync('git', ['init', '-q'], {
      cwd: targetDir,
      stdio: 'ignore',
    });
    if (res.status === 0) spin.stop(t('gitInitialized'));
    else spin.stop(pc.yellow(t('gitSkipped')));
  }

  if (answers.install) {
    spin.start(t('pnpmInstall'));
    const res = spawnSync('pnpm', ['install'], {
      cwd: targetDir,
      stdio: 'ignore',
    });
    if (res.status === 0) spin.stop(t('pnpmInstalled'));
    else spin.stop(pc.yellow(t('pnpmFailed')));
  }

  const rel = path.relative(process.cwd(), targetDir) || '.';
  p.note(
    [`cd ${rel}`, answers.install ? null : 'pnpm install', t('nextStepsComment'), '/init-project']
      .filter(Boolean)
      .join('\n'),
    t('nextStepsTitle'),
  );
  p.outro(pc.green(t('done')));
}

// ── Сбор начальных ответов ───────────────────────────────────────────────

async function collectInitialAnswers(projectName: string, options: NewOptions): Promise<Answers> {
  let template: string;
  let structure: ProjectStructure;

  if (options.template) {
    template = options.template;
    structure = templateToStructure(template);
  } else if (options.yes) {
    template = 'default';
    structure = { backend: true, web: true, mobile: true };
  } else {
    structure = await resolveProjectStructure();
    template = structureToTemplate(structure);
  }

  const skills = await resolveSkills(
    template,
    structureToCategories(structure),
    typeof options.skills === 'string' ? options.skills : undefined,
    options.yes,
    options.skipSkills,
  );

  const git = await resolveBool(options.git, options.yes, t('confirmGit'), true);
  const install = await resolveBool(options.install, options.yes, t('confirmInstall'), false);

  return { projectName, structure, template, skills, git, install };
}

// ── Цикл «сводка → редактирование» ───────────────────────────────────────

type ReviewAction =
  | 'create'
  | 'edit-name'
  | 'edit-structure'
  | 'edit-skills'
  | 'edit-git'
  | 'edit-install'
  | 'cancel';

async function reviewLoop(answers: Answers, options: NewOptions): Promise<void> {
  while (true) {
    renderSummary(answers);

    const action = (await p.select({
      message: t('reviewAction'),
      initialValue: 'create' as ReviewAction,
      options: [
        { value: 'create', label: pc.green(t('reviewActionCreate')) },
        { value: 'edit-name', label: t('reviewActionEditName') },
        { value: 'edit-structure', label: t('reviewActionEditStructure') },
        { value: 'edit-skills', label: t('reviewActionEditSkills') },
        { value: 'edit-git', label: t('reviewActionEditGit') },
        { value: 'edit-install', label: t('reviewActionEditInstall') },
        { value: 'cancel', label: pc.red(t('reviewActionCancel')) },
      ],
    })) as ReviewAction | symbol;

    if (p.isCancel(action) || action === 'cancel') {
      p.cancel(t('aborted'));
      process.exit(1);
    }

    if (action === 'create') return;

    switch (action) {
      case 'edit-name': {
        answers.projectName = await promptProjectName(answers.projectName);
        break;
      }
      case 'edit-structure': {
        answers.structure = await resolveProjectStructure(answers.structure);
        // Шаблон пересчитываем только если он не зафиксирован флагом.
        if (!options.template) {
          answers.template = structureToTemplate(answers.structure);
        }
        // Отфильтруем скиллы, которые больше не подходят по категориям.
        const allowedCategories = new Set(structureToCategories(answers.structure));
        answers.skills = answers.skills.filter((id) => {
          const cat = getSkillCategoryById(id);
          return cat ? allowedCategories.has(cat) : true;
        });
        break;
      }
      case 'edit-skills': {
        answers.skills = await resolveSkillsInteractive(
          answers.template,
          structureToCategories(answers.structure),
          answers.skills,
        );
        break;
      }
      case 'edit-git': {
        answers.git = !answers.git;
        break;
      }
      case 'edit-install': {
        answers.install = !answers.install;
        break;
      }
    }
  }
}

function renderSummary(a: Answers): void {
  const yes = pc.green(t('reviewYes'));
  const no = pc.dim(t('reviewNo'));

  const parts: string[] = [];
  if (a.structure.backend) parts.push(t('reviewStructureBackend'));
  if (a.structure.web) parts.push(t('reviewStructureWeb'));
  if (a.structure.mobile) parts.push(t('reviewStructureMobile'));
  const structureStr = parts.length > 0 ? parts.join(' + ') : t('reviewStructureEmpty');

  const skillsStr =
    a.skills.length > 0
      ? t('reviewSkillsCount', { count: String(a.skills.length) })
      : pc.dim(t('reviewSkillsNone'));

  const rows = [
    `${pad(t('reviewName'))} ${pc.cyan(a.projectName)}`,
    `${pad(t('reviewStructure'))} ${structureStr}`,
    `${pad(t('reviewTemplate'))} ${pc.cyan(a.template)}`,
    `${pad(t('reviewSkills'))} ${skillsStr}`,
    `${pad(t('reviewGit'))} ${a.git ? yes : no}`,
    `${pad(t('reviewInstall'))} ${a.install ? yes : no}`,
  ];

  p.note([pc.dim(t('reviewHint')), '', ...rows].join('\n'), t('reviewTitle'));
}

function pad(label: string): string {
  const width = 18;
  const visible = label.length;
  const padding = ' '.repeat(Math.max(1, width - visible));
  return `${label}${padding}`;
}

function getSkillCategoryById(id: string): SkillCategory | undefined {
  for (const cat of ['backend', 'frontend', 'mobile', 'common'] as SkillCategory[]) {
    if (getSkillsByCategory(cat).some((s) => s.id === id)) return cat;
  }
  return undefined;
}

// ── Скиллы ───────────────────────────────────────────────────────────────

async function resolveSkills(
  template: string,
  categories: SkillCategory[],
  flag: string | undefined,
  yes: boolean | undefined,
  skipSkills: boolean | undefined,
): Promise<string[]> {
  if (skipSkills) return [];
  if (flag) return flag.split(',').map((s) => s.trim());
  if (yes) return getDefaultSkills(template);

  return resolveSkillsInteractive(template, categories, getDefaultSkills(template));
}

async function resolveSkillsInteractive(
  template: string,
  categories: SkillCategory[],
  preselected: string[],
): Promise<string[]> {
  const selected: string[] = [];

  for (const category of categories) {
    const skills = getSkillsByCategory(category);
    if (skills.length === 0) continue;

    const initialValues = skills.filter((s) => preselected.includes(s.id)).map((s) => s.id);

    const answer = await p.multiselect({
      message: `${t(`selectSkills_${category}` as Parameters<typeof t>[0])} ${pc.dim(`(${t('multiselectHint')})`)}`,
      options: skills.map((s) => ({
        value: s.id,
        label: s.name,
      })),
      initialValues,
      required: false,
    });

    if (p.isCancel(answer)) {
      p.cancel(t('aborted'));
      process.exit(1);
    }

    selected.push(...(answer as string[]));
  }

  // template используется только чтобы в пресетах были корректные defaults,
  // поэтому после ручного выбора никакой дополнительной обработки не нужно.
  void template;
  return selected;
}

// ── Имя проекта ──────────────────────────────────────────────────────────

async function resolveProjectName(
  nameArg: string | undefined,
  yes: boolean | undefined,
): Promise<string> {
  if (nameArg && isValidName(nameArg)) return nameArg;
  if (nameArg && !isValidName(nameArg)) {
    p.cancel(t('projectNameInvalidArg', { name: nameArg }));
    process.exit(1);
  }
  if (yes) {
    p.cancel(t('projectNameRequiredWithYes'));
    process.exit(1);
  }
  return promptProjectName();
}

async function promptProjectName(initial?: string): Promise<string> {
  const answer = await p.text({
    message: t('projectNamePrompt'),
    placeholder: t('projectNamePlaceholder'),
    initialValue: initial,
    validate: (v) => (isValidName(v) ? undefined : t('projectNameInvalid')),
  });
  if (p.isCancel(answer)) {
    p.cancel(t('aborted'));
    process.exit(1);
  }
  return answer;
}

// ── Структура ────────────────────────────────────────────────────────────

async function resolveBool(
  flag: boolean | undefined,
  yes: boolean | undefined,
  message: string,
  defaultValue: boolean,
): Promise<boolean> {
  if (typeof flag === 'boolean') return flag;
  if (yes) return defaultValue;
  const answer = await p.confirm({ message, initialValue: defaultValue });
  if (p.isCancel(answer)) {
    p.cancel(t('aborted'));
    process.exit(1);
  }
  return answer;
}

async function resolveProjectStructure(initial?: ProjectStructure): Promise<ProjectStructure> {
  const backend = await confirmOrCancel(t('needBackend'), initial?.backend ?? true);

  let web = false;
  let mobile = false;

  const frontend = await confirmOrCancel(
    t('needFrontend'),
    initial ? initial.web || initial.mobile : true,
  );
  if (frontend) {
    web = await confirmOrCancel(t('needWeb'), initial?.web ?? true);
    mobile = await confirmOrCancel(t('needMobile'), initial?.mobile ?? true);
    if (!web && !mobile) {
      web = true;
    }
  }

  const structure = { backend, web, mobile };

  if (!backend && !web && !mobile) {
    p.log.info(t('nothingSelectedInfo'));
  }

  return structure;
}

function structureToTemplate(s: ProjectStructure): string {
  const has = { b: s.backend, w: s.web, m: s.mobile };
  if (has.b && (has.w || has.m)) return 'default';
  if (has.b && !has.w && !has.m) return 'backend-only';
  if (!has.b && has.w && !has.m) return 'web-only';
  if (!has.b && !has.w && has.m) return 'mobile-only';
  if (!has.b && has.w && has.m) return 'default';
  return 'minimal';
}

function templateToStructure(template: string): ProjectStructure {
  switch (template) {
    case 'default':
      return { backend: true, web: true, mobile: true };
    case 'backend-only':
      return { backend: true, web: false, mobile: false };
    case 'web-only':
      return { backend: false, web: true, mobile: false };
    case 'mobile-only':
      return { backend: false, web: false, mobile: true };
    default:
      return { backend: false, web: false, mobile: false };
  }
}

function structureToCategories(s: ProjectStructure): SkillCategory[] {
  const cats: SkillCategory[] = [];
  if (s.backend) cats.push('backend');
  if (s.web) cats.push('frontend');
  if (s.mobile) cats.push('mobile');
  cats.push('common');
  if (!s.backend && !s.web && !s.mobile) {
    return ['backend', 'frontend', 'mobile', 'common'];
  }
  return cats;
}

async function confirmOrCancel(message: string, initialValue: boolean): Promise<boolean> {
  const answer = await p.confirm({ message, initialValue });
  if (p.isCancel(answer)) {
    p.cancel(t('aborted'));
    process.exit(1);
  }
  return answer;
}

function isValidName(name: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name);
}

import path from 'node:path';
import { existsSync } from 'node:fs';
import { type Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import fse from 'fs-extra';
import { resolveTemplatesDir } from '../lib/paths.js';
import { t } from '../i18n/index.js';
import { getSkillDef, listAllSkillIds, SKILL_REGISTRY } from '../lib/skills-registry.js';

export function registerAddCommand(program: Command): void {
  program
    .command('add')
    .description(t('addDescription'))
    .argument('<type>', t('addTypeArg'))
    .argument('[name]', t('addNameArg'))
    .action(async (type: string, name: string | undefined) => {
      if (type === 'skill') {
        await addSkill(name);
      } else {
        p.cancel(t('addUnknownType', { type }));
        process.exit(1);
      }
    });
}

async function addSkill(skillId: string | undefined): Promise<void> {
  p.intro(pc.bgCyan(pc.black(t('addSkillIntro'))));

  const cwd = process.cwd();
  const claudeDir = path.join(cwd, '.claude');

  if (!existsSync(claudeDir)) {
    p.cancel(t('notAgentforgeProject'));
    process.exit(1);
  }

  // If no skill ID given, show interactive selector
  if (!skillId) {
    const answer = await p.select({
      message: t('selectSkillToAdd'),
      options: SKILL_REGISTRY.map((s) => ({
        value: s.id,
        label: `${s.name}`,
        hint: s.category,
      })),
    });
    if (p.isCancel(answer)) {
      p.cancel(t('aborted'));
      process.exit(1);
    }
    skillId = answer as string;
  }

  const def = getSkillDef(skillId);
  if (!def) {
    p.cancel(
      t('skillNotFound', {
        skill: skillId,
        available: listAllSkillIds().join(', '),
      }),
    );
    process.exit(1);
  }

  const templatesDir = resolveTemplatesDir();
  const sharedDir = path.join(templatesDir, '_shared');

  // Check if skill already exists
  const destSkill = path.join(claudeDir, 'skills', def.file);
  if (existsSync(destSkill)) {
    const overwrite = await p.confirm({
      message: t('skillExists', { skill: def.name }),
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel(t('aborted'));
      process.exit(1);
    }
  }

  const spin = p.spinner();

  // Copy required agents if missing
  for (const agent of def.agents) {
    const srcAgent = path.join(sharedDir, 'agents', `${agent}.md`);
    const destAgent = path.join(claudeDir, 'agents', `${agent}.md`);

    if (!existsSync(destAgent) && (await fse.pathExists(srcAgent))) {
      spin.start(t('copyingAgent', { agent }));
      await fse.ensureDir(path.dirname(destAgent));
      await fse.copy(srcAgent, destAgent);
      spin.stop(t('agentAdded', { agent }));
    }
  }

  // Copy skill
  spin.start(t('copyingSkill', { skill: def.name }));
  const srcSkill = path.join(sharedDir, 'skills', def.file);
  await fse.ensureDir(path.dirname(destSkill));
  await fse.copy(srcSkill, destSkill);
  spin.stop(t('skillAdded', { skill: def.name }));

  p.note(
    t('skillAddedNote', {
      skill: def.name,
      path: path.relative(cwd, destSkill),
    }),
    t('skillAddedTitle'),
  );
  p.outro(pc.green(t('done')));
}

#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pkgPath = resolve(root, 'package.json');

const bump = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error(`Usage: node scripts/release.mjs [patch|minor|major]`);
  process.exit(1);
}

const run = (cmd) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
};

// 1. Ensure clean working tree
const status = execSync('git status --porcelain', { cwd: root, encoding: 'utf-8' }).trim();
if (status) {
  console.error('Working tree is not clean. Commit or stash changes first.');
  process.exit(1);
}

// 2. Bump version
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

const next =
  bump === 'major' ? `${major + 1}.0.0` :
  bump === 'minor' ? `${major}.${minor + 1}.0` :
                      `${major}.${minor}.${patch + 1}`;

pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`\nVersion: ${pkg.version} → ${next}`);

// 3. Build
run('pnpm build');

// 4. Commit, tag, push
run('git add package.json');
run(`git commit -m "release: v${next}"`);
run(`git tag v${next}`);
run('git push && git push --tags');

// 5. Publish
run('pnpm publish --access public --no-git-checks');

console.log(`\n✅ v${next} published successfully`);

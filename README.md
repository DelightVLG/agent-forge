# agentforge

> **Русский** · [English](./README.en.md)

CLI, который разворачивает новый проект, уже настроенный под работу с sub-агентами Claude Code (PM → dev → tester → reviewer), с markdown-памятью в `.agent-memory/`.

Стек-агностично: шаблон не навязывает backend/frontend стек. При первом запуске сгенерированного проекта одноразовое интервью наполняет `.agent-memory/project.md` реальным стеком.

## Установка

```bash
# глобально
npm i -g @delightvlg/agent-forge
# или одноразово
pnpm create @delightvlg/agent-forge my-app
npm create @delightvlg/agent-forge my-app
pnpm dlx @delightvlg/agent-forge new my-app
npx @delightvlg/agent-forge new my-app
```

## Использование

```bash
agentforge new my-app                     # интерактивно
agentforge new my-app --yes --no-install  # без вопросов, без pnpm install
agentforge new my-app -t default          # выбрать шаблон (пока только "default")
agentforge new my-app --lang en           # язык интерфейса CLI
```

Флаги:

| Флаг | По умолчанию | Описание |
| --- | --- | --- |
| `-t, --template <name>` | `default` | Используемый шаблон (должен быть в `templates/`). |
| `--git / --no-git` | спрашивает | `git init` в новом проекте. |
| `--install / --no-install` | спрашивает | `pnpm install` в новом проекте. |
| `-y, --yes` | `false` | Принять значения по умолчанию; требует передать название проекта аргументом. |
| `--lang <en\|ru>` | авто | Язык интерфейса CLI. Автодетект по `LANG` / `LC_ALL`. Можно также задать `AGENTFORGE_LANG=ru`. |

После создания:

```bash
cd my-app
pnpm install
claude           # открой Claude Code
> /init-project  # context-collector наполнит .agent-memory/project.md
```

## Локализация

CLI поддерживает два языка: **английский** (по умолчанию) и **русский**.

Порядок определения языка:

1. Флаг `--lang en|ru` (приоритет).
2. Переменная окружения `AGENTFORGE_LANG=ru`.
3. Системная локаль (`LC_ALL`, `LC_MESSAGES`, `LANG`). Если начинается с `ru` — русский.
4. Иначе — английский.

```bash
AGENTFORGE_LANG=ru agentforge new my-app   # русский через env
agentforge --lang ru new my-app            # русский через флаг
agentforge --lang en new my-app            # английский принудительно
```

Добавить новый язык — значит положить файл `src/i18n/<lang>.ts` с тем же набором ключей, что `en.ts`, и зарегистрировать его в `src/i18n/index.ts`. Никакого внешнего рантайма не требуется.

## Что получаешь

Шаблон `default` создаёт монорепо на `pnpm workspaces`, настроенный под sub-агентов Claude Code:

```
.claude/
  agents/        project-manager, context-collector, backend-dev, frontend-dev, tester, codex-reviewer
  commands/      /init-project /plan /implement /review /status
  skills/        переиспользуемые инструкции (common/backend/frontend)
  settings.json  права на инструменты
.agent-memory/   долговременная память, git-tracked, читается каждой сессией
  project.md     стек + конвенции (наполняется context-collector при первом запуске)
  session-log.md append-only лог
  tasks/         одна задача = один файл
  decisions/     ADR-стиль записи решений
apps/
  backend/       CLAUDE.md с BE-правилами
  frontend/      CLAUDE.md с FE-правилами
scripts/         init-project.sh, dev-task.sh, review.sh, status.sh
CLAUDE.md        корневые правила
lefthook.yml     pre-commit (lint) + pre-push (тесты + codex)
pnpm-workspace.yaml
```

Агенты рассчитывают на локальный Claude Code CLI, `codex` CLI (OpenAI) для внешнего ревью и `gh` для GitHub Issues/PR. Ключ Claude API не используется — всё идёт через локальный Claude Code CLI.

## Флоу разработки (внутри сгенерированного проекта)

```
идея пользователя
   │
   ▼
[project-manager / opus]    уточнение → декомпозиция → файлы задач → GitHub Issues
   ▼
[backend-dev | frontend-dev / sonnet]   реализация + тесты в том же изменении
   ▼
[tester / sonnet]           прогон тестов → отчёт pass/fail + покрытие AC
   ▼
[codex-reviewer / sonnet]   `codex exec` на диффе → APPROVE / REQUEST_CHANGES / BLOCK
   ▼
gh pr create                ты ревьюишь и мерджишь
```

## Структура этого репозитория

```
src/                исходники CLI (TypeScript, ESM)
  index.ts          вход на commander
  commands/new.ts   команда `agentforge new`
  lib/              copy-template, render, paths
  i18n/             en.ts, ru.ts, index.ts
templates/
  default/          сам шаблон — дотфайлы хранятся как _name, шаблонные файлы как *.hbs
packages/
  create-agent-forge/ тонкий пакет-инициализатор для `pnpm create @delightvlg/agent-forge`
scripts/
  smoke.mjs         E2E smoke-тест
dist/               собранный CLI (публикуется в npm)
package.json        манифест пакета CLI
tsup.config.ts      конфиг сборки
ROADMAP.md          будущие доработки
```

### Правила авторинга шаблонов

- Дотфайлы хранятся с префиксом `_`: `_claude/`, `_gitignore`. При копировании переименовываются обратно в `.name`.
- Файлы с суффиксом `.hbs` проходят через рендер с подстановкой `{{projectName}}` и теряют суффикс: `package.json.hbs` → `package.json`.
- Обычные файлы копируются без изменений, байт в байт.

## Разработка CLI

```bash
pnpm install
pnpm dev new /tmp/smoke --yes --no-install --no-git     # запуск из исходников через tsx
pnpm build                                               # сборка в dist/
node dist/index.js new /tmp/smoke --yes --no-install --no-git
pnpm smoke                                               # E2E: собирает, скафолдит, проверяет файлы
```

## Лицензия

MIT

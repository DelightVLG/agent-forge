<div align="center">

# Agent Forge

**Scaffold projects pre-wired for Claude Code multi-agent workflows**

[![npm](https://img.shields.io/npm/v/@delightvlg/agent-forge?color=CB3837&label=npm&logo=npm&logoColor=white)](https://www.npmjs.com/package/@delightvlg/agent-forge)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)

> **Русский** ·
> [English](https://github.com/DelightVLG/agent-forge/blob/main/README.md)

</div>

---

Одна команда — и у тебя готовое монорепо с командой AI-агентов: PM планирует,
разработчик пишет код, тестировщик проверяет, ревьюер смотрит diff. Всё работает
через локальный Claude Code CLI, без API-ключей.

<div align="center">

![agentforge new demo](https://raw.githubusercontent.com/DelightVLG/agent-forge/main/demo.gif)

</div>

## ![Quick Start](https://img.shields.io/badge/Quick_Start-6C47FF?style=for-the-badge&logo=terminal&logoColor=white)

```bash
# Установи глобально
npm i -g @delightvlg/agent-forge

# Создай проект (интерактивный режим)
agentforge new my-app

# Или без установки — через npx / pnpm
npx @delightvlg/agent-forge new my-app
pnpm dlx @delightvlg/agent-forge new my-app
```

```bash
cd my-app && pnpm install
claude                    # открой Claude Code
> /init-project           # интервью → заполнит стек и настроит проект
```

## ![Skills](https://img.shields.io/badge/Интерактивная_настройка_и_скиллы-8B5CF6?style=for-the-badge&logo=sparkles&logoColor=white)

При запуске `agentforge new` CLI проведёт тебя через интерактивную настройку:

1. **Структура проекта** — выбери нужные слои: backend, web, mobile. CLI
   автоматически подберёт правильный шаблон.
2. **Выбор скиллов** — для каждого слоя выбери технологии и best practices,
   которые должны знать твои агенты. Скиллы — это `.md`-инструкции, которые учат
   агентов _как именно_ писать код для твоего стека.

### Что такое скиллы?

Скиллы — это курированные гайды по лучшим практикам, которые попадают в
`.claude/skills/`. Каждый скилл содержит правила, паттерны и анти-паттерны для
конкретной технологии. Когда агент работает с твоим кодом, он следует этим
инструкциям — результат: консистентный, идиоматичный, production-ready код.

<details>
<summary><b>Доступные скиллы (40+)</b></summary>

| Категория    | Скиллы                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Backend**  | NestJS, Express, TypeScript, PostgreSQL, Prisma, TypeORM, Drizzle, Redis, GraphQL, REST API, Backend Testing, BullMQ (Queues), S3 / Object Storage                             |
| **Frontend** | React, Next.js, Vite + React, Tailwind CSS, TypeScript, Zustand, React Query, React Hook Form + Zod, Frontend Testing, Accessibility, Component Design, Performance, Storybook |
| **Mobile**   | React Native, Expo, Expo Router, React Navigation, RN Testing Library, App Store / Google Play                                                                                 |
| **Common**   | Monorepo, Docker, CI/CD, Auth (JWT/OAuth2), Conventions, Git Flow, Security, Error Handling, Logging & Observability, Environment & Config                                     |

</details>

Добавить скилл в существующий проект можно в любой момент:

```bash
agentforge add skill prisma
```

> **С `--yes`** CLI использует разумные умолчания (без вопросов). **С
> `-s nestjs,prisma,react`** можно передать скиллы явно.

---

## ![What's Inside](https://img.shields.io/badge/Что_внутри-1A1A2E?style=for-the-badge&logo=files&logoColor=white)

Agent Forge создаёт **монорепо на pnpm workspaces** с полностью настроенной
инфраструктурой для AI-разработки:

<table>
<tr>
<td width="50%">

### Агенты

| Агент                 | Роль                             |
| --------------------- | -------------------------------- |
| **project-manager**   | Декомпозиция задач, планирование |
| **context-collector** | Сбор стека и конвенций проекта   |
| **backend-dev**       | Разработка серверной части       |
| **web-dev**           | Разработка веб-интерфейса        |
| **mobile-dev**        | Разработка мобильного приложения |
| **tester**            | Прогон тестов, проверка AC       |
| **codex-reviewer**    | Внешнее ревью через OpenAI Codex |

</td>
<td width="50%">

### Структура

```
.claude/
  agents/       ← конфиги агентов
  commands/     ← /plan /implement /review /status
  skills/       ← переиспользуемые инструкции
.agent-memory/
  project.md    ← стек + конвенции
  session-log.md
  tasks/        ← задача = файл
  decisions/    ← ADR-записи
apps/
  backend/      ← если выбран backend
  web/          ← если выбран web
  mobile/       ← если выбран mobile (Expo)
packages/
  shared/       ← общие типы (web + mobile)
```

</td>
</tr>
</table>

> **Стек-агностично:** шаблон не навязывает фреймворк. При первом
> `/init-project` интервью определяет платформы и наполняет
> `.agent-memory/project.md` реальным стеком.

---

## ![Workflow](https://img.shields.io/badge/Флоу_разработки-16213E?style=for-the-badge&logo=workflow&logoColor=white)

После создания проекта, весь процесс разработки проходит через цепочку
AI-агентов:

```
  ┌─────────────────┐
  │  Твоя идея      │
  └────────┬────────┘
           ▼
  ┌──────────────────────────────────────────────────┐
  │  Project Manager                        (opus)   │
  │  Уточняет требования → декомпозирует на задачи   │
  │  → создаёт файлы в tasks/ → GitHub Issues        │
  └────────┬─────────────────────────────────────────┘
           ▼
  ┌──────────────────────────────────────────────────┐
  │  Dev Agent (backend / web / mobile)    (sonnet)  │
  │  Реализует задачу + пишет тесты                  │
  └────────┬─────────────────────────────────────────┘
           ▼
  ┌──────────────────────────────────────────────────┐
  │  Tester                                (sonnet)  │
  │  Прогоняет тесты → pass/fail + покрытие AC       │
  └────────┬─────────────────────────────────────────┘
           ▼
  ┌──────────────────────────────────────────────────┐
  │  Codex Reviewer                        (sonnet)  │
  │  Ревью диффа → APPROVE / REQUEST_CHANGES         │
  └────────┬─────────────────────────────────────────┘
           ▼
  ┌───────────────────┐
  │  PR → Ты мерджишь │
  └───────────────────┘
```

---

## ![CLI](https://img.shields.io/badge/Команды_и_флаги-0A1628?style=for-the-badge&logo=gnubash&logoColor=white)

```bash
agentforge new <name>                     # интерактивно
agentforge new <name> --yes --no-install  # без вопросов
agentforge new <name> -t default          # выбрать шаблон
agentforge new <name> --lang en           # язык CLI
```

| Флаг                       | По умолчанию | Описание                 |
| -------------------------- | :----------: | ------------------------ |
| `-t, --template <name>`    |  `default`   | Шаблон проекта           |
| `--git / --no-git`         |  спрашивает  | Инициализировать git     |
| `--install / --no-install` |  спрашивает  | Запустить `pnpm install` |
| `-y, --yes`                |   `false`    | Принять все умолчания    |
| `--lang <en\|ru>`          |     авто     | Язык интерфейса CLI      |

### Локализация

CLI определяет язык автоматически: флаг `--lang` → переменная `AGENTFORGE_LANG`
→ системная локаль → английский.

```bash
AGENTFORGE_LANG=ru agentforge new my-app   # через env
agentforge --lang ru new my-app            # через флаг
```

---

## ![Dependencies](https://img.shields.io/badge/Зависимости-1B1F3B?style=for-the-badge&logo=dependabot&logoColor=white)

Agent Forge рассчитывает на:

- [**Claude Code CLI**](https://docs.anthropic.com/en/docs/claude-code) —
  основной движок агентов
- [**Codex CLI**](https://github.com/openai/codex) _(опционально)_ — внешнее
  ревью
- [**gh CLI**](https://cli.github.com/) _(опционально)_ — работа с GitHub Issues
  / PR

> API-ключ Claude **не нужен** — всё работает через локальный Claude Code.

---

## ![Contributing](https://img.shields.io/badge/Для_контрибьюторов-2D2D2D?style=for-the-badge&logo=github&logoColor=white)

<details>
<summary><b>Разработка CLI</b></summary>

```bash
pnpm install
pnpm dev new /tmp/smoke --yes --no-install --no-git   # запуск из исходников
pnpm build                                             # сборка в dist/
pnpm smoke                                             # E2E smoke-тест
```

</details>

<details>
<summary><b>Структура репозитория</b></summary>

```
src/                 исходники CLI (TypeScript, ESM)
  index.ts           точка входа
  commands/new.ts    команда `agentforge new`
  lib/               copy-template, render, paths
  i18n/              en.ts, ru.ts, index.ts
templates/
  default/           шаблон проекта
packages/
  create-agent-forge/  пакет для `pnpm create`
scripts/
  smoke.mjs          E2E smoke-тест
```

</details>

<details>
<summary><b>Правила авторинга шаблонов</b></summary>

- Дотфайлы хранятся с префиксом `_`: `_claude/`, `_gitignore` → при копировании
  становятся `.name`
- Файлы `*.hbs` проходят через рендер с `{{projectName}}` и теряют суффикс
- Обычные файлы копируются как есть

</details>

---

<div align="center">

**MIT** · Made by [Sergey Kompanietc](https://github.com/DelightVLG)

</div>

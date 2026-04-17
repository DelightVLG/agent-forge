# Roadmap

Будущие доработки `agentforge`. Не обязательства, а живой список идей в порядке
приоритета.

## Ближайшее

- [x] **Дополнительные шаблоны.** `minimal` (без `apps/`), `backend-only`,
      `web-only`, `mobile-only`. Выбор через `--template <name>` или
      интерактивный селектор.
- [ ] **Флаг `--pm <npm|pnpm|yarn|bun>`.** Сейчас всегда запускается
      `pnpm install` — дать выбор пакетного менеджера и подставлять корректные
      инструкции в «Next steps».
- [ ] **Автоопределение пакетного менеджера.** По `npm_config_user_agent`, чтобы
      `pnpm create @delightvlg/agent-forge` → pnpm, `npm create` → npm и т.д.
- [ ] **`agentforge doctor`.** Проверка окружения сгенерированного проекта:
      `claude --version`, `codex --version`, `gh auth status`, `pnpm --version`,
      Node ≥ 20.
- [ ] **`agentforge upgrade`.** Обновить `.claude/`, `.agent-memory/` структуры
      в уже существующем проекте из новой версии шаблона (diff + merge).
- [ ] **`agentforge list-templates`.** Показать доступные шаблоны с описанием.

## Качество и релиз

- [ ] **Unit-тесты для `lib/`** (`copy-template`, `render`, `paths`) через
      `vitest`.
- [ ] **E2E матрица.** Прогонять `smoke.mjs` на Node 18 / 20 / 22, macOS / Linux
      через GitHub Actions.
- [ ] **Release automation.** `changesets` или `release-please` для версий и
      публикации в npm.
- [ ] **Провайдер контрольных сумм / lockfile** для воспроизводимых сборок CLI.
- [ ] **`npm pack --dry-run` в CI** для проверки, что в tarball попадают только
      нужные файлы.

## Документация

- [x] **Скриншоты / asciinema** в README с демо интерактивного режима.
- [ ] **Страница шаблонов** в `docs/templates/` с описанием каждого пресета.
- [ ] **ADR о выборе single-package репо** в `.agent-memory/decisions/`
      сгенерированного проекта как пример.

## Локализация

- [x] **README на английском** уже есть (`README.en.md`). Держать в синхроне.
- [x] **Расширить i18n CLI** на `en` + `ru` — сейчас покрыт базовый набор. По
      мере добавления команд переводить новые строки в обе локали.
- [ ] **Больше локалей** (es, de, zh) — после стабилизации API сообщений.

## Скиллы для технологий

Специализированные скиллы (`.claude/skills/`) под конкретные технологии. Агенты
подключают их на основе стека из `project.md`.

### Backend

- [x] **NestJS** — модули, контроллеры, провайдеры, guards, interceptors, pipes,
      декораторы
- [x] **Express** — middleware, роутинг, error handling
- [x] **TypeScript (backend)** — строгая типизация, generics, utility types,
      конвенции
- [x] **PostgreSQL** — запросы, индексы, миграции, оптимизация,
      партиционирование
- [x] **Prisma** — схема, миграции, seeding, relations, client generation
- [x] **TypeORM** — entities, repositories, migrations, query builder, relations
- [x] **Drizzle** — schema definition, migrations, queries
- [x] **Redis** — кэширование, pub/sub, сессии
- [x] **GraphQL** — schema-first / code-first, resolvers, dataloaders
- [x] **REST API** — OpenAPI/Swagger, валидация, versioning

### Web frontend

- [x] **React** — хуки, паттерны композиции, memo, Suspense, Server Components
- [x] **Next.js** — App Router, SSR/SSG/ISR, middleware, API routes
- [x] **Vite + React** — конфигурация, плагины, HMR
- [x] **Tailwind CSS** — утилиты, кастомизация темы, responsive design
- [x] **TypeScript (frontend)** — типизация компонентов, пропсов, событий
- [x] **Zustand / Redux Toolkit** — state management patterns
- [x] **React Query / TanStack Query** — data fetching, caching, mutations
- [x] **React Hook Form + Zod** — формы и валидация

### Mobile

- [x] **React Native** — компоненты, стилизация, платформо-специфичный код,
      производительность
- [x] **Expo** — managed workflow, config plugins, EAS Build, EAS Update, OTA
- [x] **Expo Router** — file-based routing, layouts, deep linking
- [x] **React Navigation** — stack, tab, drawer navigators, deep linking
- [x] **React Native Testing Library** — тестирование компонентов и хуков
- [x] **App Store / Google Play** — подготовка к публикации, скриншоты, metadata

### Common

- [x] **Monorepo** — pnpm workspaces, shared packages, зависимости между apps
- [x] **Docker** — Dockerfile, multi-stage builds, docker-compose
- [x] **CI/CD** — GitHub Actions, pipelines для тестов и деплоя
- [x] **Auth** — JWT, OAuth2, session-based, роли и permissions

## 0.3.0 — Миграция wizard на Ink

Переводим интерактивный мастер `agentforge new` с `@clack/prompts` на
[Ink](https://github.com/vadimdemedes/ink) (React для CLI). Цель — полноценный
wizard со стейтом вместо линейной цепочки prompt'ов.

Предпосылки: clack не умеет навигацию назад, условные шаги и живой preview без
костылей. По мере роста количества скиллов и шаблонов это становится
ограничением.

- [ ] **Каркас на Ink.** Один корневой `<Wizard>` со стейтом шагов и ответов,
      хинт-бар снизу (`↑↓ navigate · ⏎ confirm · Esc back · Ctrl+C cancel`),
      breadcrumbs «Шаг N из M».
- [ ] **Навигация назад (`Esc`).** Явная и видимая пользователю возможность
      вернуться к любому предыдущему шагу без потери уже введённых ответов.
- [ ] **Живой preview шаблона.** При выборе структуры (backend / web / mobile)
      справа показывается, какой пресет будет применён (`default`,
      `backend-only`, `web-only`, `mobile-only`, `minimal`) и краткое описание
      его содержимого.
- [ ] **Группировка и поиск по скиллам.** Скиллы разбиты по категориям (backend
      / frontend / mobile / common) с поиском по имени/описанию, мульти-выбором
      и indicator'ом «N selected».
- [ ] **Прогресс копирования и установки.** Полноценный прогресс-бар на этапе
      `copyTemplate` (файл за файлом) и `pnpm install` с возможностью отмены по
      `Esc`.
- [ ] **Review-экран.** Финальный шаг со сводкой всех ответов и возможностью
      отредактировать любую секцию перед запуском генерации.
- [ ] **Headless-режим сохранён.** `--yes`, `-t <template>`, `-s <skills>`,
      `--skip-skills`, `--no-install`, `--no-git` продолжают работать без TTY
      (CI, скрипты) — Ink рендерится только в интерактивном режиме.
- [ ] **Тесты UI** через `ink-testing-library` для ключевых шагов мастера.

## Крупное

- [ ] **Генераторы внутри проекта.** `agentforge add agent <name>`,
      `agentforge add skill <name>` для расширения `.claude/` без копипасты.
- [ ] **Remote templates.** `agentforge new my-app --from github:user/repo`
      (через `giget`), чтобы шаблоны можно было хранить отдельно.
- [ ] **Plugin API.** Сторонние расширения — свой набор агентов/команд,
      публикуется как npm пакет.
- [ ] **Интеграция с `gh repo create --template`** как альтернативный путь
      доставки для тех, кто предпочитает GitHub Template.

## Отложено / обсуждается

- [ ] Поддержка `deno` и `bun` в качестве рантайма сгенерированного проекта.
- [ ] Telemetry (opt-in) для статистики использования шаблонов — только с явным
      согласием.

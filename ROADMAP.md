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

- [ ] **Скриншоты / asciinema** в README с демо интерактивного режима.
- [ ] **Страница шаблонов** в `docs/templates/` с описанием каждого пресета.
- [ ] **ADR о выборе single-package репо** в `.agent-memory/decisions/`
      сгенерированного проекта как пример.

## Локализация

- [ ] **README на английском** уже есть (`README.en.md`). Держать в синхроне.
- [ ] **Расширить i18n CLI** на `en` + `ru` — сейчас покрыт базовый набор. По
      мере добавления команд переводить новые строки в обе локали.
- [ ] **Больше локалей** (es, de, zh) — после стабилизации API сообщений.

## Скиллы для технологий

Специализированные скиллы (`.claude/skills/`) под конкретные технологии. Агенты
подключают их на основе стека из `project.md`.

### Backend

- [ ] **NestJS** — модули, контроллеры, провайдеры, guards, interceptors, pipes,
      декораторы
- [ ] **Express** — middleware, роутинг, error handling
- [ ] **TypeScript (backend)** — строгая типизация, generics, utility types,
      конвенции
- [ ] **PostgreSQL** — запросы, индексы, миграции, оптимизация,
      партиционирование
- [ ] **Prisma** — схема, миграции, seeding, relations, client generation
- [ ] **TypeORM** — entities, repositories, migrations, query builder, relations
- [ ] **Drizzle** — schema definition, migrations, queries
- [ ] **Redis** — кэширование, pub/sub, сессии
- [ ] **GraphQL** — schema-first / code-first, resolvers, dataloaders
- [ ] **REST API** — OpenAPI/Swagger, валидация, versioning

### Web frontend

- [ ] **React** — хуки, паттерны композиции, memo, Suspense, Server Components
- [ ] **Next.js** — App Router, SSR/SSG/ISR, middleware, API routes
- [ ] **Vite + React** — конфигурация, плагины, HMR
- [ ] **Tailwind CSS** — утилиты, кастомизация темы, responsive design
- [ ] **TypeScript (frontend)** — типизация компонентов, пропсов, событий
- [ ] **Zustand / Redux Toolkit** — state management patterns
- [ ] **React Query / TanStack Query** — data fetching, caching, mutations
- [ ] **React Hook Form + Zod** — формы и валидация

### Mobile

- [ ] **React Native** — компоненты, стилизация, платформо-специфичный код,
      производительность
- [ ] **Expo** — managed workflow, config plugins, EAS Build, EAS Update, OTA
- [ ] **Expo Router** — file-based routing, layouts, deep linking
- [ ] **React Navigation** — stack, tab, drawer navigators, deep linking
- [ ] **React Native Testing Library** — тестирование компонентов и хуков
- [ ] **App Store / Google Play** — подготовка к публикации, скриншоты, metadata

### Common

- [ ] **Monorepo** — pnpm workspaces, shared packages, зависимости между apps
- [ ] **Docker** — Dockerfile, multi-stage builds, docker-compose
- [ ] **CI/CD** — GitHub Actions, pipelines для тестов и деплоя
- [ ] **Auth** — JWT, OAuth2, session-based, роли и permissions

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
- [ ] GUI-обёртка (TUI на `ink`) для тех, кто не любит `@clack/prompts`.
- [ ] Telemetry (opt-in) для статистики использования шаблонов — только с явным
      согласием.

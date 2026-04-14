export type SkillCategory = "backend" | "frontend" | "mobile" | "common";

export interface SkillDef {
  id: string;
  name: string;
  file: string;
  category: SkillCategory;
  agents: string[];
}

export const SKILL = {
  NESTJS: "nestjs",
  EXPRESS: "express",
  TYPESCRIPT_BACKEND: "typescript-backend",
  POSTGRESQL: "postgresql",
  PRISMA: "prisma",
  TYPEORM: "typeorm",
  DRIZZLE: "drizzle",
  REDIS: "redis",
  GRAPHQL: "graphql",
  REST_API: "rest-api",
  REACT: "react",
  NEXTJS: "nextjs",
  VITE_REACT: "vite-react",
  TAILWIND: "tailwind",
  TYPESCRIPT_FRONTEND: "typescript-frontend",
  ZUSTAND: "zustand",
  REACT_QUERY: "react-query",
  REACT_HOOK_FORM_ZOD: "react-hook-form-zod",
  REACT_NATIVE: "react-native",
  EXPO: "expo",
  EXPO_ROUTER: "expo-router",
  REACT_NAVIGATION: "react-navigation",
  RN_TESTING_LIBRARY: "rn-testing-library",
  APP_STORE_PUBLISH: "app-store-publish",
  MONOREPO: "monorepo",
  DOCKER: "docker",
  CI_CD: "ci-cd",
  AUTH: "auth",
  CONVENTIONS: "conventions",
  GIT_FLOW: "git-flow",
  SECURITY_BASICS: "security-basics",
} as const;

export const SKILL_REGISTRY: SkillDef[] = [
  // ── Backend ──────────────────────────────────────────────
  {
    id: SKILL.NESTJS,
    name: "NestJS",
    file: "backend/nestjs.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: SKILL.EXPRESS,
    name: "Express",
    file: "backend/express.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: SKILL.TYPESCRIPT_BACKEND,
    name: "TypeScript (backend)",
    file: "backend/typescript-backend.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: SKILL.POSTGRESQL,
    name: "PostgreSQL",
    file: "backend/postgresql.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: SKILL.PRISMA,
    name: "Prisma",
    file: "backend/prisma.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: SKILL.TYPEORM,
    name: "TypeORM",
    file: "backend/typeorm.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: SKILL.DRIZZLE,
    name: "Drizzle",
    file: "backend/drizzle.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: SKILL.REDIS,
    name: "Redis",
    file: "backend/redis.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: SKILL.GRAPHQL,
    name: "GraphQL",
    file: "backend/graphql.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: SKILL.REST_API,
    name: "REST API (OpenAPI)",
    file: "backend/rest-api.md",
    category: "backend",
    agents: ["backend-dev"],
  },

  // ── Frontend ─────────────────────────────────────────────
  {
    id: SKILL.REACT,
    name: "React",
    file: "frontend/react.md",
    category: "frontend",
    agents: ["web-dev"],
  },
  {
    id: SKILL.NEXTJS,
    name: "Next.js",
    file: "frontend/nextjs.md",
    category: "frontend",
    agents: ["web-dev"],
  },
  {
    id: SKILL.VITE_REACT,
    name: "Vite + React",
    file: "frontend/vite-react.md",
    category: "frontend",
    agents: ["web-dev"],
  },
  {
    id: SKILL.TAILWIND,
    name: "Tailwind CSS",
    file: "frontend/tailwind.md",
    category: "frontend",
    agents: ["web-dev"],
  },
  {
    id: SKILL.TYPESCRIPT_FRONTEND,
    name: "TypeScript (frontend)",
    file: "frontend/typescript-frontend.md",
    category: "frontend",
    agents: ["web-dev"],
  },
  {
    id: SKILL.ZUSTAND,
    name: "Zustand / Redux Toolkit",
    file: "frontend/zustand.md",
    category: "frontend",
    agents: ["web-dev"],
  },
  {
    id: SKILL.REACT_QUERY,
    name: "React Query / TanStack Query",
    file: "frontend/react-query.md",
    category: "frontend",
    agents: ["web-dev"],
  },
  {
    id: SKILL.REACT_HOOK_FORM_ZOD,
    name: "React Hook Form + Zod",
    file: "frontend/react-hook-form-zod.md",
    category: "frontend",
    agents: ["web-dev"],
  },

  // ── Mobile ───────────────────────────────────────────────
  {
    id: SKILL.REACT_NATIVE,
    name: "React Native",
    file: "mobile/react-native.md",
    category: "mobile",
    agents: ["mobile-dev"],
  },
  {
    id: SKILL.EXPO,
    name: "Expo",
    file: "mobile/expo.md",
    category: "mobile",
    agents: ["mobile-dev"],
  },
  {
    id: SKILL.EXPO_ROUTER,
    name: "Expo Router",
    file: "mobile/expo-router.md",
    category: "mobile",
    agents: ["mobile-dev"],
  },
  {
    id: SKILL.REACT_NAVIGATION,
    name: "React Navigation",
    file: "mobile/react-navigation.md",
    category: "mobile",
    agents: ["mobile-dev"],
  },
  {
    id: SKILL.RN_TESTING_LIBRARY,
    name: "RN Testing Library",
    file: "mobile/rn-testing-library.md",
    category: "mobile",
    agents: ["mobile-dev"],
  },
  {
    id: SKILL.APP_STORE_PUBLISH,
    name: "App Store / Google Play",
    file: "mobile/app-store-publish.md",
    category: "mobile",
    agents: ["mobile-dev"],
  },

  // ── Common ───────────────────────────────────────────────
  {
    id: SKILL.MONOREPO,
    name: "Monorepo (pnpm workspaces)",
    file: "common/monorepo.md",
    category: "common",
    agents: [],
  },
  {
    id: SKILL.DOCKER,
    name: "Docker",
    file: "common/docker.md",
    category: "common",
    agents: [],
  },
  {
    id: SKILL.CI_CD,
    name: "CI/CD (GitHub Actions)",
    file: "common/ci-cd.md",
    category: "common",
    agents: [],
  },
  {
    id: SKILL.AUTH,
    name: "Auth (JWT / OAuth2)",
    file: "common/auth.md",
    category: "common",
    agents: [],
  },
  {
    id: SKILL.CONVENTIONS,
    name: "Conventions",
    file: "common/conventions.md",
    category: "common",
    agents: [],
  },
  {
    id: SKILL.GIT_FLOW,
    name: "Git Flow",
    file: "common/git-flow.md",
    category: "common",
    agents: [],
  },
  {
    id: SKILL.SECURITY_BASICS,
    name: "Security Basics",
    file: "common/security-basics.md",
    category: "common",
    agents: [],
  },
];

/** Agents that are always included regardless of skill selection. */
export const BASE_AGENTS = [
  "project-manager",
  "context-collector",
  "tester",
  "codex-reviewer",
];

/** Which skill categories are relevant for each template. */
export const TEMPLATE_CATEGORIES: Record<string, SkillCategory[]> = {
  default: ["backend", "frontend", "mobile", "common"],
  "backend-only": ["backend", "common"],
  "web-only": ["frontend", "common"],
  "mobile-only": ["mobile", "common"],
  minimal: ["common"],
};

/** Default skill presets when --yes is used. */
export const TEMPLATE_DEFAULTS: Record<string, string[]> = {
  default: [
    SKILL.NESTJS,
    SKILL.REACT,
    SKILL.NEXTJS,
    SKILL.TAILWIND,
    SKILL.EXPO,
    SKILL.DOCKER,
    SKILL.CI_CD,
    SKILL.CONVENTIONS,
    SKILL.GIT_FLOW,
    SKILL.SECURITY_BASICS,
    SKILL.TYPESCRIPT_BACKEND,
    SKILL.TYPESCRIPT_FRONTEND,
  ],
  "backend-only": [
    SKILL.NESTJS,
    SKILL.SECURITY_BASICS,
    SKILL.TYPESCRIPT_BACKEND,
    SKILL.DOCKER,
    SKILL.CONVENTIONS,
    SKILL.GIT_FLOW,
  ],
  "web-only": [
    SKILL.REACT,
    SKILL.NEXTJS,
    SKILL.TAILWIND,
    SKILL.CONVENTIONS,
    SKILL.GIT_FLOW,
    SKILL.SECURITY_BASICS,
    SKILL.TYPESCRIPT_FRONTEND,
  ],
  "mobile-only": [
    SKILL.EXPO,
    SKILL.EXPO_ROUTER,
    SKILL.REACT_NATIVE,
    SKILL.CONVENTIONS,
    SKILL.GIT_FLOW,
    SKILL.SECURITY_BASICS,
    SKILL.TYPESCRIPT_FRONTEND,
  ],
  minimal: [SKILL.CONVENTIONS, SKILL.GIT_FLOW, SKILL.SECURITY_BASICS],
};

export function getSkillDef(id: string): SkillDef | undefined {
  return SKILL_REGISTRY.find((s) => s.id === id);
}

export function getSkillsByCategory(category: SkillCategory): SkillDef[] {
  return SKILL_REGISTRY.filter((s) => s.category === category);
}

export function getSkillsForTemplate(template: string): SkillDef[] {
  const cats = TEMPLATE_CATEGORIES[template] ?? ["common"];
  return SKILL_REGISTRY.filter((s) => cats.includes(s.category));
}

export function getDefaultSkills(template: string): string[] {
  return TEMPLATE_DEFAULTS[template] ?? [];
}

export function resolveAgents(skillIds: string[]): string[] {
  const agents = new Set<string>(BASE_AGENTS);
  for (const id of skillIds) {
    const def = getSkillDef(id);
    if (def) {
      for (const a of def.agents) agents.add(a);
    }
  }
  return [...agents];
}

export function listAllSkillIds(): string[] {
  return SKILL_REGISTRY.map((s) => s.id);
}

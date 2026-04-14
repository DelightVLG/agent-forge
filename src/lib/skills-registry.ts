export type SkillCategory = "backend" | "frontend" | "mobile" | "common";

export interface SkillDef {
  id: string;
  name: string;
  file: string;
  category: SkillCategory;
  agents: string[];
}

export const SKILL_REGISTRY: SkillDef[] = [
  // ── Backend ──────────────────────────────────────────────
  {
    id: "nestjs",
    name: "NestJS",
    file: "backend/nestjs.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: "express",
    name: "Express",
    file: "backend/express.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: "typescript-backend",
    name: "TypeScript (backend)",
    file: "backend/typescript-backend.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    file: "backend/postgresql.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: "prisma",
    name: "Prisma",
    file: "backend/prisma.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: "typeorm",
    name: "TypeORM",
    file: "backend/typeorm.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: "drizzle",
    name: "Drizzle",
    file: "backend/drizzle.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: "redis",
    name: "Redis",
    file: "backend/redis.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: "graphql",
    name: "GraphQL",
    file: "backend/graphql.md",
    category: "backend",
    agents: ["backend-dev"],
  },
  {
    id: "rest-api",
    name: "REST API (OpenAPI)",
    file: "backend/rest-api.md",
    category: "backend",
    agents: ["backend-dev"],
  },

  // ── Frontend ─────────────────────────────────────────────
  {
    id: "react",
    name: "React",
    file: "frontend/react.md",
    category: "frontend",
    agents: ["web-dev"],
  },
  {
    id: "nextjs",
    name: "Next.js",
    file: "frontend/nextjs.md",
    category: "frontend",
    agents: ["web-dev"],
  },
  {
    id: "vite-react",
    name: "Vite + React",
    file: "frontend/vite-react.md",
    category: "frontend",
    agents: ["web-dev"],
  },
  {
    id: "tailwind",
    name: "Tailwind CSS",
    file: "frontend/tailwind.md",
    category: "frontend",
    agents: ["web-dev"],
  },
  {
    id: "typescript-frontend",
    name: "TypeScript (frontend)",
    file: "frontend/typescript-frontend.md",
    category: "frontend",
    agents: ["web-dev"],
  },
  {
    id: "zustand",
    name: "Zustand / Redux Toolkit",
    file: "frontend/zustand.md",
    category: "frontend",
    agents: ["web-dev"],
  },
  {
    id: "react-query",
    name: "React Query / TanStack Query",
    file: "frontend/react-query.md",
    category: "frontend",
    agents: ["web-dev"],
  },
  {
    id: "react-hook-form-zod",
    name: "React Hook Form + Zod",
    file: "frontend/react-hook-form-zod.md",
    category: "frontend",
    agents: ["web-dev"],
  },

  // ── Mobile ───────────────────────────────────────────────
  {
    id: "react-native",
    name: "React Native",
    file: "mobile/react-native.md",
    category: "mobile",
    agents: ["mobile-dev"],
  },
  {
    id: "expo",
    name: "Expo",
    file: "mobile/expo.md",
    category: "mobile",
    agents: ["mobile-dev"],
  },
  {
    id: "expo-router",
    name: "Expo Router",
    file: "mobile/expo-router.md",
    category: "mobile",
    agents: ["mobile-dev"],
  },
  {
    id: "react-navigation",
    name: "React Navigation",
    file: "mobile/react-navigation.md",
    category: "mobile",
    agents: ["mobile-dev"],
  },
  {
    id: "rn-testing-library",
    name: "RN Testing Library",
    file: "mobile/rn-testing-library.md",
    category: "mobile",
    agents: ["mobile-dev"],
  },
  {
    id: "app-store-publish",
    name: "App Store / Google Play",
    file: "mobile/app-store-publish.md",
    category: "mobile",
    agents: ["mobile-dev"],
  },

  // ── Common ───────────────────────────────────────────────
  {
    id: "monorepo",
    name: "Monorepo (pnpm workspaces)",
    file: "common/monorepo.md",
    category: "common",
    agents: [],
  },
  {
    id: "docker",
    name: "Docker",
    file: "common/docker.md",
    category: "common",
    agents: [],
  },
  {
    id: "ci-cd",
    name: "CI/CD (GitHub Actions)",
    file: "common/ci-cd.md",
    category: "common",
    agents: [],
  },
  {
    id: "auth",
    name: "Auth (JWT / OAuth2)",
    file: "common/auth.md",
    category: "common",
    agents: [],
  },
  {
    id: "conventions",
    name: "Conventions",
    file: "common/conventions.md",
    category: "common",
    agents: [],
  },
  {
    id: "git-flow",
    name: "Git Flow",
    file: "common/git-flow.md",
    category: "common",
    agents: [],
  },
  {
    id: "security-basics",
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
    "nestjs",
    "prisma",
    "react",
    "nextjs",
    "tailwind",
    "expo",
    "docker",
    "ci-cd",
    "conventions",
    "git-flow",
    "security-basics",
  ],
  "backend-only": [
    "nestjs",
    "prisma",
    "docker",
    "conventions",
    "git-flow",
    "security-basics",
  ],
  "web-only": [
    "react",
    "nextjs",
    "tailwind",
    "conventions",
    "git-flow",
    "security-basics",
  ],
  "mobile-only": [
    "expo",
    "expo-router",
    "react-native",
    "conventions",
    "git-flow",
    "security-basics",
  ],
  minimal: ["conventions", "git-flow", "security-basics"],
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

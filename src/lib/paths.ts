import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Templates live next to the built CLI (dist/) or at the repo root during dev.
 * Walk up from the current file until we find a `templates/` sibling.
 */
export function resolveTemplatesDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  let current = here;
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(current, "templates");
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(`Could not locate templates/ directory starting from ${here}`);
}

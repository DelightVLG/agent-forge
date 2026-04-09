# Shared Conventions

- Read neighbor files before inventing a new pattern.
- No TODO comments without an issue number: `// TODO(#42): ...`.
- No commented-out code in commits.
- No `console.log` / `print` debugging left in committed code — use the project's logger.
- Secrets never in code. Always env vars, loaded via whatever mechanism `project.md` defines.
- Errors are typed/structured, not stringly-typed.

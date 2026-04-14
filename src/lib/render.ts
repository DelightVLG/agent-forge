/**
 * Minimal mustache-style substitution: replaces `{{name}}` with variables[name].
 * Unknown variables are left untouched so template authors notice them.
 */
export function renderString(
  input: string,
  variables: Record<string, string>,
): string {
  return input.replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
    (match, key: string) => {
      return Object.prototype.hasOwnProperty.call(variables, key)
        ? variables[key]!
        : match;
    },
  );
}

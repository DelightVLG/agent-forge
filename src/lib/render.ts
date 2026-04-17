/**
 * Tiny mustache/handlebars-ish renderer used by the template copier.
 *
 * Supports:
 *   - `{{name}}`                          — variable substitution (strings / booleans / numbers).
 *   - `{{#if name}}...{{/if}}`            — conditional block (truthy check).
 *   - `{{#if name}}...{{else}}...{{/if}}` — conditional with else branch.
 *   - `{{#unless name}}...{{/unless}}`    — inverse conditional.
 *   - Nested blocks of any depth.
 *
 * `{{#if}}` / `{{#unless}}` blocks are resolved first, so variables inside
 * blocks are substituted only in the surviving branch. Unknown `{{var}}` tokens
 * are left untouched so template authors notice them.
 */

export type RenderValue = string | number | boolean | null | undefined;
export type RenderVars = Record<string, RenderValue>;

type TagKind = 'openIf' | 'openUnless' | 'else' | 'close';

interface Tag {
  kind: TagKind;
  key?: string;
  start: number;
  end: number;
}

const TAG_RE = /\{\{\s*(#if|#unless|else|\/if|\/unless)(?:\s+([a-zA-Z_][a-zA-Z0-9_]*))?\s*\}\}/g;

export function renderString(input: string, variables: RenderVars): string {
  // Before parsing, trim whitespace-only lines that contain nothing but a
  // standalone block tag (`  {{#if ...}}  \n`). Handlebars calls these
  // "standalone" tags; eating the surrounding newline prevents blank lines
  // from accumulating in the output.
  const trimmed = eatStandaloneTagLines(input);
  const afterBlocks = resolveBlocks(trimmed, variables);
  return substituteVars(afterBlocks, variables);
}

function eatStandaloneTagLines(input: string): string {
  // Match a line that contains only whitespace + one block tag + whitespace +
  // newline. Keep the tag, drop the surrounding whitespace + newline.
  return input.replace(
    /(^|\n)[ \t]*(\{\{\s*(?:#if|#unless|else|\/if|\/unless)(?:\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*\}\})[ \t]*\n/g,
    (_m, lead: string, tag: string) => `${lead}${tag}`,
  );
}

function resolveBlocks(input: string, vars: RenderVars): string {
  const tags = collectTags(input);
  if (tags.length === 0) return input;

  const result = renderSegment(input, 0, input.length, tags, 0, vars).out;
  return result;
}

function collectTags(input: string): Tag[] {
  const tags: Tag[] = [];
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(input)) !== null) {
    const [full, kindRaw, key] = m;
    const kind: TagKind =
      kindRaw === '#if'
        ? 'openIf'
        : kindRaw === '#unless'
          ? 'openUnless'
          : kindRaw === 'else'
            ? 'else'
            : 'close';
    tags.push({
      kind,
      key,
      start: m.index,
      end: m.index + full!.length,
    });
  }
  return tags;
}

/**
 * Render the slice `input[from, to)` using the tags whose indices start at
 * `tagIdx`. Stops when a closing/else tag at the current depth is reached and
 * returns how many tags were consumed so the caller can skip past them.
 */
function renderSegment(
  input: string,
  from: number,
  to: number,
  tags: Tag[],
  tagIdx: number,
  vars: RenderVars,
): { out: string; nextTagIdx: number } {
  let out = '';
  let cursor = from;
  let i = tagIdx;

  while (i < tags.length && tags[i]!.start < to) {
    const tag = tags[i]!;
    // Append literal text between cursor and this tag.
    out += input.slice(cursor, tag.start);

    if (tag.kind === 'openIf' || tag.kind === 'openUnless') {
      // Find the matching close/else at the same depth.
      const matched = findMatchingClose(tags, i);
      const key = tag.key!;
      const truthy = isTruthy(vars[key]);
      const takeThen = tag.kind === 'openIf' ? truthy : !truthy;

      // `then` branch is between this open tag and the else/close.
      const thenStart = tag.end;
      const thenEnd =
        matched.elseIdx !== -1 ? tags[matched.elseIdx]!.start : tags[matched.closeIdx]!.start;
      const elseStart =
        matched.elseIdx !== -1 ? tags[matched.elseIdx]!.end : tags[matched.closeIdx]!.start;
      const elseEnd = tags[matched.closeIdx]!.start;

      if (takeThen) {
        const rendered = renderSegment(input, thenStart, thenEnd, tags, i + 1, vars);
        out += rendered.out;
      } else if (matched.elseIdx !== -1) {
        const rendered = renderSegment(input, elseStart, elseEnd, tags, matched.elseIdx + 1, vars);
        out += rendered.out;
      }

      cursor = tags[matched.closeIdx]!.end;
      i = matched.closeIdx + 1;
    } else {
      // We hit a tag we don't own (close/else at our level). The caller handles it.
      break;
    }
  }

  // Append trailing literal text up to `to`.
  out += input.slice(cursor, to);

  return { out, nextTagIdx: i };
}

/**
 * Given the index of an opening tag, find the index of its matching close tag
 * and, if present, the index of the else tag at the same depth.
 */
function findMatchingClose(tags: Tag[], openIdx: number): { closeIdx: number; elseIdx: number } {
  let depth = 1;
  let elseIdx = -1;
  for (let i = openIdx + 1; i < tags.length; i++) {
    const t = tags[i]!;
    if (t.kind === 'openIf' || t.kind === 'openUnless') {
      depth++;
    } else if (t.kind === 'close') {
      depth--;
      if (depth === 0) return { closeIdx: i, elseIdx };
    } else if (t.kind === 'else' && depth === 1) {
      elseIdx = i;
    }
  }
  throw new Error('Template has an unclosed {{#if}} / {{#unless}} block.');
}

function substituteVars(input: string, vars: RenderVars): string {
  return input.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(vars, key)) return match;
    const v = vars[key];
    if (v === null || v === undefined || v === false) return '';
    return String(v);
  });
}

function isTruthy(v: RenderValue): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return v.length > 0;
}

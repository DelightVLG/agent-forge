import en, { type Messages } from './en.js';
import ru from './ru.js';

export type Lang = 'en' | 'ru';

const tables: Record<Lang, Messages> = { en, ru };

let currentLang: Lang = detectLang();

export function detectLang(): Lang {
  const raw =
    process.env.AGENTFORGE_LANG ||
    process.env.LC_ALL ||
    process.env.LC_MESSAGES ||
    process.env.LANG ||
    '';
  return /^ru/i.test(raw) ? 'ru' : 'en';
}

export function setLang(lang: string | undefined): void {
  if (lang === 'ru' || lang === 'en') {
    currentLang = lang;
  }
}

export function getLang(): Lang {
  return currentLang;
}

export function t(key: keyof Messages, vars?: Record<string, string>): string {
  const template = tables[currentLang][key] ?? en[key] ?? String(key);
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}

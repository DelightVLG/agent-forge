# Tailwind CSS

Rules and patterns for styling with Tailwind CSS. Apply on top of
`conventions.md`.

## Rules

- **Utility-first always.** Write styles as utility classes in JSX. Only extract
  when the same combination appears 3+ times across files.
- **No `@apply` in global CSS** unless building a design-system primitive
  (`btn-primary`, `input-base`). Prefer component abstractions over CSS
  abstractions.
- **Design tokens via `theme.extend`.** Never hard-code hex colors, pixel
  values, or font sizes in class names. Use the theme (`bg-brand-500`,
  `text-sm`, `p-4`) so changes propagate globally.
- **Responsive mobile-first.** Default styles target mobile; add `sm:`, `md:`,
  `lg:` for wider screens. Never use `max-*` breakpoints unless absolutely
  necessary.
- **Dark mode via `class` strategy.** Use `dark:` variant and toggle a `.dark`
  class on `<html>`. Avoid `media` strategy in apps with a manual toggle.
- **Consistent spacing scale.** Stick to the default 4px grid (`p-1` = 4px,
  `p-2` = 8px). Avoid arbitrary values (`p-[13px]`) — if it doesn't fit the
  scale, extend the theme.
- **Keep class strings readable.** Order: layout → sizing → spacing → typography
  → colors → borders → effects → state variants. Use Prettier plugin
  `prettier-plugin-tailwindcss` to auto-sort.
- **Purge is automatic.** Ensure `content` paths in `tailwind.config` cover all
  files containing classes. Never use dynamic class concatenation
  (`bg-${color}-500`) — the purge can't detect it.
- **No `!important` via `!` prefix** unless overriding third-party styles. If
  you need it, it's a specificity smell.
- **Use `cn()` or `clsx()` for conditional classes.** Never string-template
  classes manually.

## Patterns

### Theme extension

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
          500: "#3b82f6",
          900: "#1e3a5f",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### Conditional classes with cn()

```tsx
import { cn } from "@/lib/utils";

interface Props {
  variant: "primary" | "ghost";
  className?: string;
}

export function Button({ variant, className, ...props }: Props) {
  return (
    <button
      className={cn(
        "rounded-lg px-4 py-2 font-medium transition-colors",
        variant === "primary" && "bg-brand-500 text-white hover:bg-brand-600",
        variant === "ghost" && "text-gray-700 hover:bg-gray-100",
        className,
      )}
      {...props}
    />
  );
}
```

### Responsive layout

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {items.map((item) => (
    <Card key={item.id} item={item} />
  ))}
</div>
```

### Dark mode support

```tsx
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
  <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Title</h1>
</div>
```

## Anti-patterns

```tsx
// ❌ Dynamic class construction — purge can't detect
const color = "blue";
<div className={`bg-${color}-500`} />;

// ✅ Map to full class names
const colorMap = { blue: "bg-blue-500", red: "bg-red-500" };
<div className={colorMap[color]} />;
```

```tsx
// ❌ Arbitrary values everywhere
<div className="mt-[13px] p-[7px] text-[15px]" />;

// ✅ Stick to the spacing/typography scale
<div className="mt-3 p-2 text-sm" />;
```

```css
/* ❌ @apply for one-off component styles */
.user-card {
  @apply flex items-center gap-4 rounded-lg border p-4;
}

/* ✅ Keep utilities in JSX, extract a React component instead */
```

```tsx
// ❌ Manual string concatenation
<div className={"p-4 " + (active ? "bg-blue-500" : "")} />;

// ✅ cn() / clsx()
<div className={cn("p-4", active && "bg-blue-500")} />;
```

## Checklist

- [ ] No hard-coded colors or pixel values — everything from theme
- [ ] Classes sorted consistently (prettier plugin or manual convention)
- [ ] Responsive styles are mobile-first (`sm:`, `md:`, `lg:`)
- [ ] Dark mode variants added for all color/background classes
- [ ] No dynamic class concatenation that breaks purge
- [ ] `cn()` / `clsx()` used for conditional classes
- [ ] No excessive `@apply` — component abstraction preferred
- [ ] `content` paths in config cover all template files
- [ ] Arbitrary values (`[...]`) are rare and justified

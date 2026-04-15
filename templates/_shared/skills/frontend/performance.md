# Frontend Performance

Rules and patterns for building performant React applications. Apply on top of
`react.md` and `conventions.md`.

## Rules

- **Code-split at route level.** Use `React.lazy()` + `Suspense` for every route
  component. Never bundle the entire app into a single chunk. Each route should
  load only its own code.
- **Lazy-load heavy dependencies.** Libraries like chart renderers, rich text
  editors, PDF viewers, and date pickers should be dynamically imported
  (`import()`) at the point of use, not at the top of the file.
- **Memoize expensive computations.** Use `useMemo` for costly calculations that
  depend on specific inputs. Use `useCallback` for functions passed as props to
  memoized children. Don't memoize everything — only where profiling shows a
  bottleneck.
- **Avoid unnecessary re-renders.** Use `React.memo` for components receiving
  stable props from frequently-updating parents. Keep state as local as possible
  — lifting state up causes subtree re-renders. Use Zustand selectors to
  subscribe to specific slices.
- **Optimize images.** Use `next/image` (Next.js) or explicit `width`/`height`
  attributes. Serve modern formats (WebP, AVIF). Lazy-load below-the-fold images
  with `loading="lazy"`. Use responsive `srcSet` for different viewports.
- **Bundle analysis.** Run `npx vite-bundle-visualizer` or
  `@next/bundle-analyzer` periodically. Track total JS size. Set budgets:
  initial bundle < 200KB gzipped. Investigate any chunk > 50KB.
- **Virtualize long lists.** Lists with 50+ items must use virtualization
  (`@tanstack/react-virtual`, `react-window`). Never render 1000 DOM nodes —
  render only visible items plus a small overscan buffer.
- **Debounce expensive interactions.** Search inputs, resize handlers, scroll
  listeners — debounce with 150–300ms delay. Use `useDeferredValue` for
  non-urgent UI updates in React 18+.
- **Preload critical resources.** Use `<link rel="preload">` for fonts, hero
  images, and critical API data. Prefetch next-page resources on hover/focus
  with `<link rel="prefetch">` or React Query's `prefetchQuery`.
- **Core Web Vitals.** Monitor LCP (< 2.5s), FID/INP (< 200ms), CLS (< 0.1). Use
  `web-vitals` library or Lighthouse CI in the pipeline. Treat regressions as
  bugs.
- **No layout thrashing.** Batch DOM reads and writes. Never read layout
  properties (offsetHeight, getBoundingClientRect) inside loops or animation
  frames that also write styles.

## Anti-Patterns

- Importing the entire `lodash` library instead of `lodash/debounce`.
- Using `index` as `key` in dynamic lists — causes reconciliation bugs.
- Inline object/array literals as props (`style={{}}`, `options={[]}`) — creates
  new references every render.
- Fetching data in `useEffect` without cancellation or race condition handling.
- `useEffect` with missing or empty dependency arrays to avoid re-runs — fix the
  deps, don't suppress them.

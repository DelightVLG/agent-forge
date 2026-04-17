# Storybook

Rules and patterns for component documentation with Storybook. Apply on top of
`react.md` and `component-design.md`.

## Rules

- **Every shared component gets a story.** Components in `shared/`, `ui/`, or
  design system packages must have a `.stories.tsx` file. Page-level and one-off
  components don't need stories unless they have complex states.
- **Stories live next to components.** Place `Button.stories.tsx` alongside
  `Button.tsx` in the same directory. Never put stories in a separate `stories/`
  tree — co-location keeps stories maintained when components change.
- **Use Component Story Format (CSF3).** Export a `meta` object satisfying
  `Meta<typeof Component>` and individual stories as named exports. Use the
  `satisfies` keyword for type safety:

  ```tsx
  const meta = {
    component: Button,
    tags: ['autodocs'],
  } satisfies Meta<typeof Button>;
  export default meta;

  type Story = StoryObj<typeof meta>;
  export const Primary: Story = {
    args: { variant: 'primary', children: 'Click' },
  };
  ```

- **Cover all visual states.** Each component must have stories for: default
  state, all variants/sizes, loading/disabled states, error states, empty
  states, edge cases (long text, missing data). One story per meaningful state.
- **Use `args` for props, not hardcoded JSX.** Define props through `args` so
  Storybook's controls panel works automatically. Use `argTypes` to customize
  controls (select for enums, color pickers, range sliders).
- **Enable autodocs.** Add `tags: ["autodocs"]` to meta. This generates a
  documentation page from your stories and component props automatically. Write
  JSDoc comments on component props for better autodocs output.
- **Decorators for context.** If a component needs providers (theme, router,
  query client), add decorators at the story or preview level — not inside each
  story's render function. Keep decorators in `.storybook/preview.tsx` for
  global context.
- **Use play functions for interaction stories.** For components with complex
  interactions (forms, dropdowns, modals), use `play` functions with
  `@storybook/testing-library` to automate clicks, typing, and assertions.
- **Visual regression testing.** Integrate Chromatic or a similar tool to catch
  unintended visual changes. Stories are your visual test suite — the more
  states you cover, the fewer visual bugs slip through.
- **Keep stories fast.** Mock API calls with MSW handlers at the story level.
  Never hit real APIs from stories. Use static data in args. Stories should
  render in < 1s.

## Anti-Patterns

- Writing stories with inline JSX instead of `args` — breaks controls panel.
- One "kitchen sink" story with all props — write separate stories per state.
- Stories that depend on global state or external services.
- Outdated stories that don't match the current component API.
- Using `render` function when `args` alone would suffice.

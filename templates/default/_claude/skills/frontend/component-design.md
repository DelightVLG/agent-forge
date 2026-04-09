# Frontend Component Design

- Composition over prop explosion. >8 props = split the component.
- Co-locate component + test + styles in one folder.
- No prop drilling beyond 2 levels — lift to context or state manager.
- Controlled inputs for forms unless there's an explicit reason otherwise.
- Loading, error, and empty states are designed from the start, not retrofitted.

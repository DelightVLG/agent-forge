# Frontend Testing

- Testing Library (or equivalent): assert on what the user sees, not implementation.
- Query priority: `getByRole` > `getByLabelText` > `getByText` > `getByTestId` (last resort).
- Mock the network at the boundary (MSW), not the fetch call.
- Don't test framework internals. Test your logic.
- Cross-component user flows → small Playwright e2e if the project uses it.

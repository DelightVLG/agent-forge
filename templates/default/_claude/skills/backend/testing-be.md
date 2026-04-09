# Backend Testing

- Unit tests for pure logic. Integration tests for DB + HTTP handlers against a real test DB.
- Tests are independent. No shared mutable state. Rollback transactions between tests.
- Name by behavior: `it("rejects login with expired token")`, not `it("login()")`.
- Cover behaviors, not lines. Coverage target lives in `project.md`.

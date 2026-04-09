# Backend API Design

- RESTful resource naming: plural nouns, nested sparingly (`/users/:id/sessions`).
- Correct status codes: 200/201/204/400/401/403/404/409/422/5xx.
- Consistent error envelope defined once, reused everywhere:
  ```json
  { "error": { "code": "validation_failed", "message": "...", "fields": {} } }
  ```
- Version from day one if the API is public (`/v1/...`).
- Cursor-based pagination for unbounded lists.
- Idempotency keys for anything that charges money or sends messages.

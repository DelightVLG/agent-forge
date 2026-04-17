# Backend Testing

Rules and patterns for testing backend applications. Apply on top of
`conventions.md`.

## Rules

- **Unit tests for pure logic.** Services, utils, validators — anything without
  I/O. Mock only external boundaries (HTTP clients, message queues), never the
  database.
- **Integration tests for DB + HTTP handlers** against a real test database.
  Never mock the database layer — it hides schema mismatches and query bugs.
- **Tests are independent.** No shared mutable state between tests. Each test
  sets up its own data and cleans up after itself.
- **Rollback transactions between tests.** Wrap each test in a transaction that
  rolls back, or truncate tables in `beforeEach`. Never rely on test execution
  order.
- **Name tests by behavior.** Use `it("rejects login with expired token")`, not
  `it("login()")` or `it("should work")`.
- **Cover behaviors, not lines.** Focus on edge cases, error paths, and business
  rules. Coverage target lives in `project.md`.
- **Test the contract, not the implementation.** Assert on HTTP status codes,
  response shapes, and side effects — not on which internal method was called.
- **Factories over fixtures.** Use factory functions to create test data with
  sensible defaults and per-test overrides. Avoid shared JSON fixtures.
- **One assertion group per test.** A test should verify one behavior. Multiple
  `expect` calls are fine if they validate the same outcome.
- **Fast tests by default.** Unit tests < 5ms each. Integration tests < 500ms
  each. If a test is slow, investigate — don't just increase the timeout.

## Patterns

### Test file structure

```
src/modules/users/
  users.service.ts
  users.service.spec.ts        # unit tests
  users.controller.spec.ts     # unit tests for controller
test/
  users.e2e-spec.ts            # integration / e2e tests
  helpers/
    test-app.ts                # shared app setup
    factories.ts               # data factories
    db.ts                      # database utilities
```

### Factory function

```typescript
// test/helpers/factories.ts
import { faker } from '@faker-js/faker';

export function buildUser(
  overrides: Partial<CreateUserDto> = {},
): CreateUserDto {
  return {
    email: faker.internet.email(),
    password: faker.internet.password({ length: 12 }),
    name: faker.person.fullName(),
    ...overrides,
  };
}
```

### Unit test for service

```typescript
// users.service.spec.ts
describe('UsersService', () => {
  let service: UsersService;
  let repo: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useClass: Repository },
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  it('throws ConflictException when email already exists', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue({ id: '1' } as User);

    await expect(service.create(buildUser())).rejects.toThrow(
      ConflictException,
    );
  });
});
```

### Integration test with real DB

```typescript
// test/users.e2e-spec.ts
describe('POST /users', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp(); // sets up app with real test DB
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateTables(['users']); // clean state
  });

  it('creates a user and returns 201', async () => {
    const dto = buildUser({ email: 'test@example.com' });

    const response = await request(app.getHttpServer())
      .post('/users')
      .send(dto)
      .expect(201);

    expect(response.body).toMatchObject({
      email: 'test@example.com',
      id: expect.any(String),
    });
    expect(response.body).not.toHaveProperty('password');
  });

  it('returns 409 when email already taken', async () => {
    const dto = buildUser({ email: 'dup@example.com' });
    await request(app.getHttpServer()).post('/users').send(dto);

    await request(app.getHttpServer()).post('/users').send(dto).expect(409);
  });
});
```

### Transaction rollback helper

```typescript
// test/helpers/db.ts
export async function withRollback(
  dataSource: DataSource,
  fn: (queryRunner: QueryRunner) => Promise<void>,
): Promise<void> {
  const qr = dataSource.createQueryRunner();
  await qr.startTransaction();
  try {
    await fn(qr);
  } finally {
    await qr.rollbackTransaction();
    await qr.release();
  }
}
```

## Anti-patterns

```typescript
// ❌ Mocking the database — hides real query issues
jest.spyOn(prisma.user, 'findMany').mockResolvedValue([mockUser]);

// ✅ Use a real test database for integration tests
const users = await request(app.getHttpServer()).get('/users').expect(200);
```

```typescript
// ❌ Vague test name
it("should work", async () => { ... });
it("login()", async () => { ... });

// ✅ Behavior-driven name
it("rejects login with expired token", async () => { ... });
it("returns 404 when user does not exist", async () => { ... });
```

```typescript
// ❌ Tests depend on execution order
it('creates a user', async () => {
  await createUser({ email: 'shared@test.com' });
});
it('fetches the user created above', async () => {
  const user = await getUser('shared@test.com'); // depends on previous test
});

// ✅ Each test sets up its own data
it('fetches a user by email', async () => {
  await createUser({ email: 'test@test.com' });
  const user = await getUser('test@test.com');
  expect(user.email).toBe('test@test.com');
});
```

```typescript
// ❌ Testing implementation details
expect(service.hashPassword).toHaveBeenCalledWith('secret');
expect(repo.save).toHaveBeenCalledTimes(1);

// ✅ Testing observable behavior
expect(response.status).toBe(201);
expect(response.body.email).toBe('user@test.com');
```

## Checklist

- [ ] Unit tests cover pure business logic (services, validators)
- [ ] Integration tests run against a real test database
- [ ] No shared mutable state between tests
- [ ] Tables cleaned/rolled back between tests
- [ ] Test names describe the behavior being verified
- [ ] Factory functions used instead of hardcoded fixtures
- [ ] Error paths and edge cases covered, not just happy paths
- [ ] No database mocking in integration tests
- [ ] Tests run fast (unit < 5ms, integration < 500ms)
- [ ] CI runs the full test suite before merge

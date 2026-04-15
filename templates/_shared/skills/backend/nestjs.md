# NestJS

Rules and patterns for building NestJS applications. Apply on top of
`conventions.md`.

## Rules

- **One module per bounded context.** Don't dump everything into `AppModule`.
  Each domain area (users, orders, payments) gets its own module with its own
  controllers, services, and entities.
- **Controllers are thin.** A controller method validates input, calls a
  service, and returns a response. No business logic, no direct DB access.
- **Services own business logic.** One public method = one use case. Keep
  services focused; split if a service exceeds ~300 lines.
- **Always use DTOs for request/response.** Define them in a `dto/` folder next
  to the module. Validate with `class-validator` decorators.
- **Use `ConfigService`** for all env vars — never read `process.env` directly.
  Register config via `@nestjs/config` with a typed schema (Zod or Joi).
- **Prefer constructor injection.** Avoid `@Inject()` with string tokens unless
  you need an interface-based provider.
- **Global exception filter** for consistent error responses. Map domain
  exceptions to HTTP status codes in one place.
- **Guards for auth, interceptors for cross-cutting concerns** (logging,
  caching, response mapping). Don't mix their responsibilities.
- **Pipes for validation/transformation only.** Use `ValidationPipe` globally
  with `whitelist: true` and `forbidNonWhitelisted: true`.
- **Use `@nestjs/swagger`** decorators on every DTO and controller. API docs
  should be auto-generated, not hand-written.

## Patterns

### Module structure

```
src/
  modules/
    users/
      users.module.ts
      users.controller.ts
      users.service.ts
      dto/
        create-user.dto.ts
        update-user.dto.ts
        user-response.dto.ts
      entities/
        user.entity.ts
      users.service.spec.ts
```

### DTO with validation

```typescript
// dto/create-user.dto.ts
import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
```

### Thin controller

```typescript
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }
}
```

### Global exception filter

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, body } =
      exception instanceof HttpException
        ? {
            status: exception.getStatus(),
            body: exception.getResponse(),
          }
        : {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            body: { message: "Internal server error" },
          };

    response.status(status).json({
      statusCode: status,
      ...(typeof body === "string" ? { message: body } : body),
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Config with typed schema

```typescript
// config/app.config.ts
import { z } from "zod";

export const appConfigSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
```

## Anti-patterns

```typescript
// ❌ Business logic in controller
@Post()
async create(@Body() dto: CreateUserDto) {
  const exists = await this.repo.findOne({ where: { email: dto.email } });
  if (exists) throw new ConflictException();
  const hashed = await bcrypt.hash(dto.password, 10);
  return this.repo.save({ ...dto, password: hashed });
}

// ✅ Controller delegates to service
@Post()
create(@Body() dto: CreateUserDto) {
  return this.usersService.create(dto);
}
```

```typescript
// ❌ Reading env directly
const port = Number(process.env.PORT);

// ✅ Using ConfigService
const port = this.configService.get<number>("PORT");
```

```typescript
// ❌ God module with 20 providers
@Module({
  providers: [UsersService, OrdersService, PaymentsService, EmailService, ...],
})
export class AppModule {}

// ✅ One module per domain
@Module({ imports: [UsersModule, OrdersModule, PaymentsModule] })
export class AppModule {}
```

## Checklist

- [ ] Each module is self-contained (own controller, service, DTOs, entities)
- [ ] Controllers contain zero business logic
- [ ] All DTOs have `class-validator` decorators
- [ ] `ValidationPipe` is global with `whitelist: true`
- [ ] No direct `process.env` reads — using `ConfigService`
- [ ] Swagger decorators on every endpoint and DTO
- [ ] Global exception filter is registered
- [ ] Unit tests for services, e2e tests for critical flows

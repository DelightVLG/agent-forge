# Auth (JWT / OAuth2)

Rules and patterns for authentication and authorization. Apply on top of
`conventions.md` and `security-basics.md`.

## Rules

- **Short-lived access tokens, long-lived refresh tokens.** Access token TTL:
  15–30 minutes. Refresh token TTL: 7–30 days. Never issue access tokens that
  live for hours or days.
- **Refresh token rotation.** On each refresh, issue a new refresh token and
  invalidate the old one. If a revoked token is reused, invalidate the entire
  family (token reuse detection).
- **Store refresh tokens server-side** (database or Redis). Access tokens are
  stateless (JWT), refresh tokens are stateful.
- **Hash passwords with bcrypt (cost 12) or argon2id.** Never use MD5, SHA-256,
  or any non-password-specific hash. Never store plaintext passwords.
- **Never store tokens in localStorage.** Use `httpOnly`, `secure`,
  `SameSite=Strict` cookies for web. For mobile/SPA, use in-memory storage with
  refresh via `httpOnly` cookie.
- **Separate authentication from authorization.** Auth middleware verifies
  identity (who are you?). Guards/policies check permissions (can you do this?).
  Don't merge them into one check.
- **RBAC as the default model.** Use roles (`admin`, `user`, `editor`) mapped to
  permissions. Only reach for ABAC when you need attribute-based rules (e.g.
  "author can edit own posts").
- **Rate-limit auth endpoints.** Login: 5 attempts per minute per IP+email.
  Refresh: 10 per minute. Password reset: 3 per hour per email.
- **OAuth2: use Authorization Code + PKCE.** Never use Implicit Flow. Always
  validate `state` parameter to prevent CSRF.
- **Log auth events.** Log login success, login failure, token refresh, password
  change, role change. Never log passwords, tokens, or secrets.

## Patterns

### JWT payload (access token)

```typescript
interface AccessTokenPayload {
  sub: string; // user ID
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}
```

### Auth module structure

```
src/modules/auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  strategies/
    jwt.strategy.ts
    local.strategy.ts
  guards/
    jwt-auth.guard.ts
    roles.guard.ts
  decorators/
    current-user.decorator.ts
    roles.decorator.ts
  dto/
    login.dto.ts
    register.dto.ts
    refresh-token.dto.ts
    token-response.dto.ts
```

### Login flow

```typescript
// auth.service.ts
async login(dto: LoginDto): Promise<TokenResponseDto> {
  const user = await this.usersService.findByEmail(dto.email);
  if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
    throw new UnauthorizedException("Invalid credentials");
  }

  const accessToken = this.jwtService.sign(
    { sub: user.id, email: user.email, roles: user.roles },
    { expiresIn: "15m" },
  );

  const refreshToken = randomUUID();
  await this.tokenStore.save({
    token: await hash(refreshToken),
    userId: user.id,
    family: randomUUID(),
    expiresAt: addDays(new Date(), 7),
  });

  return { accessToken, refreshToken };
}
```

### Refresh with rotation

```typescript
async refresh(oldRefreshToken: string): Promise<TokenResponseDto> {
  const stored = await this.tokenStore.findByHash(await hash(oldRefreshToken));

  if (!stored || stored.revoked) {
    // Reuse detection — revoke entire family
    if (stored?.family) {
      await this.tokenStore.revokeFamily(stored.family);
    }
    throw new UnauthorizedException("Invalid refresh token");
  }

  // Revoke old token
  await this.tokenStore.revoke(stored.id);

  // Issue new pair
  const user = await this.usersService.findById(stored.userId);
  return this.issueTokens(user, stored.family);
}
```

### Roles guard

```typescript
// guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>("roles", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}

// Usage
@Roles("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Delete(":id")
remove(@Param("id") id: string) { ... }
```

### Cookie setup for tokens

```typescript
// Set refresh token as httpOnly cookie
response.cookie("refresh_token", refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/api/auth/refresh",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

## Anti-patterns

```typescript
// ❌ Long-lived access token
this.jwtService.sign(payload, { expiresIn: "7d" });

// ✅ Short-lived access + refresh rotation
this.jwtService.sign(payload, { expiresIn: "15m" });
```

```typescript
// ❌ Token in localStorage
localStorage.setItem("token", accessToken);

// ✅ httpOnly cookie or in-memory variable
response.cookie("refresh_token", token, { httpOnly: true, secure: true });
```

```typescript
// ❌ Weak hashing
const hash = crypto.createHash("sha256").update(password).digest("hex");

// ✅ Password-specific hashing
const hash = await bcrypt.hash(password, 12);
```

```typescript
// ❌ Auth and authz merged
if (!user || user.role !== "admin") throw new UnauthorizedException();

// ✅ Separated concerns
// Step 1: JwtAuthGuard verifies token (authn)
// Step 2: RolesGuard checks permissions (authz)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
```

## Checklist

- [ ] Access token TTL ≤ 30 minutes
- [ ] Refresh tokens stored server-side and rotated on each use
- [ ] Token reuse detection revokes the entire family
- [ ] Passwords hashed with bcrypt (cost ≥ 12) or argon2id
- [ ] No tokens in localStorage — using httpOnly cookies
- [ ] Auth endpoints rate-limited
- [ ] Authentication and authorization are separate middleware/guards
- [ ] OAuth2 uses Authorization Code + PKCE (no Implicit Flow)
- [ ] Auth events logged (without secrets)
- [ ] CSRF protection in place for cookie-based auth

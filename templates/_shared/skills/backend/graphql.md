# GraphQL

Rules and patterns for building GraphQL APIs. Apply on top of `conventions.md`
and `security-basics.md`.

## Rules

- **Code-first for NestJS, schema-first for standalone.** In NestJS projects,
  use `@nestjs/graphql` with code-first decorators. For other setups,
  schema-first with codegen is preferred.
- **DataLoaders for every relation resolver.** The N+1 problem is the default in
  GraphQL. Use DataLoader to batch and cache database calls within a single
  request.
- **Validate inputs with custom scalars and input types.** Define `DateTime`,
  `Email`, `PositiveInt` etc. as custom scalars. Validate input types with
  class-validator or Zod.
- **Cursor-based pagination (Relay-style) for lists.** Use `Connection` / `Edge`
  / `PageInfo` pattern. Offset pagination is acceptable only for admin
  interfaces.
- **Authorize at the resolver level.** Use guards or directives to enforce
  permissions on each field/resolver. Never rely on frontend to hide
  unauthorized data.
- **Limit query depth and complexity.** Use `graphql-depth-limit` and
  `graphql-query-complexity` to prevent resource exhaustion from deeply nested
  or expensive queries.
- **Error handling via union types.** Return `Result = Success | Error` unions
  for mutations instead of throwing exceptions. Reserve GraphQL errors for
  unexpected failures.
- **Use codegen for client-side types.** Run `graphql-codegen` to generate
  TypeScript types from the schema. Never hand-write types that duplicate the
  schema.
- **No business logic in resolvers.** Resolvers are thin — they call services
  and return data. All business logic lives in the service layer.
- **Schema design: think in graphs, not endpoints.** Design types around domain
  entities and their relationships. Avoid creating types that mirror REST
  endpoints.

## Patterns

### Code-first schema (NestJS)

```typescript
// models/user.model.ts
@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;

  @Field(() => [Post])
  posts: Post[];
}

// models/post.model.ts
@ObjectType()
export class Post {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field(() => User)
  author: User;
}
```

### DataLoader

```typescript
// loaders/posts.loader.ts
import DataLoader from "dataloader";

export function createPostsLoader(db: DbClient) {
  return new DataLoader<string, Post[]>(async (userIds) => {
    const posts = await db.post.findMany({
      where: { authorId: { in: [...userIds] } },
    });

    const postsByUser = new Map<string, Post[]>();
    for (const post of posts) {
      const list = postsByUser.get(post.authorId) ?? [];
      list.push(post);
      postsByUser.set(post.authorId, list);
    }

    return userIds.map((id) => postsByUser.get(id) ?? []);
  });
}

// resolver
@ResolveField(() => [Post])
async posts(@Parent() user: User, @Context() ctx: GqlContext) {
  return ctx.loaders.posts.load(user.id);
}
```

### Cursor-based pagination (Relay)

```typescript
@ObjectType()
class UserEdge {
  @Field()
  cursor: string;

  @Field(() => User)
  node: User;
}

@ObjectType()
class PageInfo {
  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;

  @Field({ nullable: true })
  startCursor?: string;

  @Field({ nullable: true })
  endCursor?: string;
}

@ObjectType()
class UserConnection {
  @Field(() => [UserEdge])
  edges: UserEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

@Query(() => UserConnection)
async users(
  @Args("first", { type: () => Int, nullable: true }) first?: number,
  @Args("after", { nullable: true }) after?: string,
): Promise<UserConnection> {
  return this.usersService.paginate({ first: first ?? 20, after });
}
```

### Error handling via union types

```typescript
@ObjectType()
class CreateUserSuccess {
  @Field(() => User)
  user: User;
}

@ObjectType()
class EmailAlreadyTaken {
  @Field()
  message: string;
}

const CreateUserResult = createUnionType({
  name: "CreateUserResult",
  types: () => [CreateUserSuccess, EmailAlreadyTaken],
});

@Mutation(() => CreateUserResult)
async createUser(@Args("input") input: CreateUserInput) {
  const existing = await this.usersService.findByEmail(input.email);
  if (existing) {
    return new EmailAlreadyTaken({ message: "Email is already registered" });
  }
  const user = await this.usersService.create(input);
  return new CreateUserSuccess({ user });
}
```

### Query depth and complexity limits

```typescript
// main.ts
import depthLimit from "graphql-depth-limit";
import { createComplexityRule } from "graphql-query-complexity";

GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  validationRules: [
    depthLimit(7),
    createComplexityRule({
      maximumComplexity: 1000,
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
    }),
  ],
});
```

## Anti-patterns

```typescript
// ❌ N+1 — querying in resolver without DataLoader
@ResolveField(() => [Post])
async posts(@Parent() user: User) {
  return this.db.post.findMany({ where: { authorId: user.id } });
  // Called once per user in the list → N+1
}

// ✅ Use DataLoader to batch
@ResolveField(() => [Post])
async posts(@Parent() user: User, @Context() ctx: GqlContext) {
  return ctx.loaders.posts.load(user.id);
}
```

```typescript
// ❌ Throwing errors for expected outcomes
@Mutation(() => User)
async createUser(@Args("input") input: CreateUserInput) {
  const exists = await this.usersService.findByEmail(input.email);
  if (exists) throw new ConflictException("Email taken"); // GQL error
}

// ✅ Union type for expected failure
@Mutation(() => CreateUserResult)
async createUser(@Args("input") input: CreateUserInput) {
  // Returns typed success or failure
}
```

```typescript
// ❌ No depth limit — allows malicious deep queries
// query { user { posts { author { posts { author { posts { ... } } } } } } }

// ✅ Limit query depth and complexity
validationRules: [depthLimit(7)];
```

```typescript
// ❌ Business logic in resolver
@Mutation(() => User)
async createUser(@Args("input") input: CreateUserInput) {
  const hashed = await bcrypt.hash(input.password, 12);
  return this.db.user.create({ data: { ...input, password: hashed } });
}

// ✅ Resolver delegates to service
@Mutation(() => CreateUserResult)
async createUser(@Args("input") input: CreateUserInput) {
  return this.usersService.create(input);
}
```

## Checklist

- [ ] DataLoaders used for every relation resolver (no N+1)
- [ ] Query depth limit configured (max 7–10 levels)
- [ ] Query complexity limit configured
- [ ] Cursor-based pagination for all list queries
- [ ] Authorization applied at resolver/field level
- [ ] Mutations return union types for expected errors
- [ ] Resolvers are thin — business logic in services
- [ ] Custom scalars for validated types (Email, DateTime, etc.)
- [ ] Code generation configured for client-side types
- [ ] Schema documented with descriptions on types and fields

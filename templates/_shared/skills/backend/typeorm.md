# TypeORM

Rules and patterns for working with TypeORM. Apply on top of `conventions.md`
and `db-migrations.md`.

## Rules

- **Entities are classes with decorators.** Each entity maps to a database
  table. Use `@Entity()`, `@Column()`, `@PrimaryGeneratedColumn()`, and relation
  decorators.
- **Generate migrations, don't write them by hand.** Use
  `typeorm migration:generate` to diff entities against the current schema.
  Hand-written migrations drift from entities.
- **Never use `synchronize: true` in production.** It auto-alters tables based
  on entities and can drop columns/data. Use it only in local development.
- **Use repositories, not the entity manager directly.** Inject
  `Repository<Entity>` via `@InjectRepository()`. Custom repositories extend
  `Repository` when you need reusable query methods.
- **Eager loading is off by default.** Don't set `eager: true` on relations. Use
  `relations` option in `find` or QueryBuilder `leftJoinAndSelect` to load
  relations explicitly per query.
- **Select only needed columns.** Use `select` in find options or
  `QueryBuilder.select()` to avoid fetching entire rows.
- **Transactions for multi-step writes.** Use `DataSource.transaction()` or
  `QueryRunner` for atomic operations. Never leave transactions open during
  external I/O.
- **Cascade with caution.** Set `cascade: true` only on the owning side and only
  when the child entity has no independent lifecycle. Prefer explicit saves.
- **Use migrations for seeding, or a separate seed script.** Don't mix seed data
  with schema migrations. Seeds must be idempotent.
- **Keep entity files focused.** One entity per file. Place relations, indexes,
  and hooks in the same file as the entity they belong to.

## Patterns

### Entity definition

```typescript
// entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Post } from './post.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  email: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', default: 'user' })
  role: string;

  @Column({ type: 'text', name: 'password_hash' })
  passwordHash: string;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

### Relations

```typescript
// entities/post.entity.ts
@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'boolean', default: false })
  published: boolean;

  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

### Repository usage

```typescript
// users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'role'],
    });
  }

  async findWithPosts(id: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { id },
      relations: ['posts'],
    });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.usersRepo.create(dto);
    return this.usersRepo.save(user);
  }
}
```

### QueryBuilder for complex queries

```typescript
async findActiveAuthors(limit = 10): Promise<User[]> {
  return this.usersRepo
    .createQueryBuilder("user")
    .leftJoin("user.posts", "post")
    .where("post.published = :published", { published: true })
    .groupBy("user.id")
    .orderBy("COUNT(post.id)", "DESC")
    .select(["user.id", "user.name", "user.email"])
    .take(limit)
    .getMany();
}
```

### Transaction

```typescript
async transferCredits(fromId: string, toId: string, amount: number): Promise<void> {
  await this.dataSource.transaction(async (manager) => {
    const sender = await manager.findOneOrFail(User, {
      where: { id: fromId },
      lock: { mode: "pessimistic_write" },
    });

    if (sender.credits < amount) {
      throw new AppError("INSUFFICIENT_CREDITS", "Not enough credits", 422);
    }

    await manager.decrement(User, { id: fromId }, "credits", amount);
    await manager.increment(User, { id: toId }, "credits", amount);
  });
}
```

### Migration generation

```bash
# Generate migration from entity changes
pnpm typeorm migration:generate src/migrations/AddUserPhone -d src/data-source.ts

# Run pending migrations
pnpm typeorm migration:run -d src/data-source.ts

# Revert last migration
pnpm typeorm migration:revert -d src/data-source.ts
```

## Anti-patterns

```typescript
// ❌ synchronize: true in production
// data-source.ts
{ synchronize: true } // drops columns, alters tables without migrations

// ✅ Use migrations
{ synchronize: false, migrationsRun: true }
```

```typescript
// ❌ Eager loading on relations — always loads even when not needed
@OneToMany(() => Post, (post) => post.author, { eager: true })
posts: Post[];

// ✅ Load explicitly per query
const user = await usersRepo.findOne({
  where: { id },
  relations: ["posts"], // only when needed
});
```

```typescript
// ❌ Using entity manager directly everywhere
const user = await entityManager.findOne(User, { where: { id } });

// ✅ Use injected repository
const user = await this.usersRepo.findOne({ where: { id } });
```

```typescript
// ❌ Cascade on both sides
@OneToMany(() => Post, (post) => post.author, { cascade: true })
posts: Post[];

@ManyToOne(() => User, (user) => user.posts, { cascade: true })
author: User;

// ✅ Cascade only on owning side, and only when appropriate
@OneToMany(() => Post, (post) => post.author, { cascade: ["insert"] })
posts: Post[];
```

```typescript
// ❌ SELECT * — fetching all columns
const users = await usersRepo.find();

// ✅ Select only needed columns
const users = await usersRepo.find({
  select: ['id', 'email', 'name'],
});
```

## Checklist

- [ ] Entities have proper decorators and column types
- [ ] Migrations generated via `migration:generate`, not hand-written
- [ ] `synchronize: false` in production
- [ ] Repositories injected via `@InjectRepository()`, not entity manager
- [ ] No `eager: true` on relations — loaded explicitly per query
- [ ] `select` used to limit fetched columns
- [ ] Multi-step writes wrapped in transactions
- [ ] Cascades used sparingly and only on the owning side
- [ ] Foreign key columns have indexes
- [ ] One entity per file with clear naming (`user.entity.ts`)

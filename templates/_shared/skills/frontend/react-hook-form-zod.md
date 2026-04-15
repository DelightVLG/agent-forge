# React Hook Form + Zod

Rules and patterns for type-safe forms with validation. Apply on top of
`react.md` and `conventions.md`.

## Rules

- **Zod schema is the single source of truth.** Define the schema first, then
  infer the TypeScript type with `z.infer<typeof schema>`. Never duplicate types
  manually.
- **Always use `zodResolver`.** Connect Zod to React Hook Form via
  `@hookform/resolvers/zod`. Never write manual `validate` functions.
- **Uncontrolled by default.** Use `register()` for native inputs. Only use
  `Controller` for third-party components (date pickers, selects, rich editors)
  that don't expose a `ref`.
- **Show errors next to fields.** Display `errors.fieldName?.message` directly
  below each input. Never collect errors at the top of the form only.
- **Server errors map to fields.** Use `setError()` to attach server validation
  errors to specific fields. Use `setError("root", ...)` for general form-level
  errors.
- **Reset on success.** Call `reset()` after a successful submission, not
  before.
- **Disable submit while submitting.** Use `formState.isSubmitting` to disable
  the button and prevent double submissions.
- **Validate on blur, submit on submit.** Use `mode: "onBlur"` for per-field
  validation and `reValidateMode: "onChange"` for instant correction feedback.
- **Coerce numeric and date inputs.** Use `z.coerce.number()` or
  `z.coerce.date()` for inputs that come as strings from the DOM.

## Patterns

### Schema + inferred type

```typescript
// schemas/create-user.schema.ts
import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  age: z.coerce.number().min(18, "Must be at least 18").optional(),
  role: z.enum(["admin", "member", "viewer"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

### Form component

```tsx
// components/create-user-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserSchema,
  type CreateUserInput,
} from "@/schemas/create-user.schema";

interface Props {
  onSubmit: (data: CreateUserInput) => Promise<void>;
}

export function CreateUserForm({ onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    mode: "onBlur",
    defaultValues: { role: "member" },
  });

  const submit = async (data: CreateUserInput) => {
    try {
      await onSubmit(data);
      reset();
    } catch (err) {
      setError("root", { message: "Failed to create user. Try again." });
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" {...register("name")} />
        {errors.name && <p role="alert">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register("email")} />
        {errors.email && <p role="alert">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="age">Age</label>
        <input id="age" type="number" {...register("age")} />
        {errors.age && <p role="alert">{errors.age.message}</p>}
      </div>

      {errors.root && <p role="alert">{errors.root.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}
```

### Dynamic field array

```tsx
import { useFieldArray, useForm } from "react-hook-form";

const schema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.coerce.number().min(1),
      }),
    )
    .min(1, "At least one item required"),
});

type FormValues = z.infer<typeof schema>;

export function OrderForm() {
  const { control, register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ name: "", quantity: 1 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`items.${index}.name`)} />
          <input type="number" {...register(`items.${index}.quantity`)} />
          <button type="button" onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => append({ name: "", quantity: 1 })}>
        Add Item
      </button>
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Controller for third-party components

```tsx
import { Controller } from "react-hook-form";
import { DatePicker } from "@/components/ui/date-picker";

<Controller
  control={control}
  name="startDate"
  render={({ field, fieldState }) => (
    <div>
      <DatePicker value={field.value} onChange={field.onChange} />
      {fieldState.error && <p role="alert">{fieldState.error.message}</p>}
    </div>
  )}
/>;
```

## Anti-patterns

```typescript
// ❌ Duplicated type — will drift from schema
interface CreateUserInput {
  name: string;
  email: string;
}
const schema = z.object({ name: z.string(), email: z.string().email() });

// ✅ Infer from schema
const schema = z.object({ name: z.string(), email: z.string().email() });
type CreateUserInput = z.infer<typeof schema>;
```

```tsx
// ❌ Manual validation instead of zodResolver
const { register } = useForm({
  validate: (values) => {
    const errors = {};
    if (!values.name) errors.name = "Required";
    return errors;
  },
});

// ✅ zodResolver handles all validation
const { register } = useForm({ resolver: zodResolver(schema) });
```

```tsx
// ❌ Controlled inputs everywhere
<Controller name="name" control={control} render={({ field }) => (
  <input {...field} />
)} />

// ✅ register() for native inputs — better performance
<input {...register("name")} />
```

```tsx
// ❌ Errors only at the top
{Object.values(errors).map((e) => <p>{e.message}</p>)}
<input {...register("name")} />
<input {...register("email")} />

// ✅ Errors next to each field
<input {...register("name")} />
{errors.name && <p>{errors.name.message}</p>}
```

## Checklist

- [ ] Zod schema is the single source of truth — types inferred via `z.infer`
- [ ] `zodResolver` used, no manual validation
- [ ] `register()` for native inputs, `Controller` only for third-party
- [ ] Error messages displayed next to each field
- [ ] Server errors attached via `setError()`
- [ ] Submit button disabled while `isSubmitting`
- [ ] `mode: "onBlur"` or `"onTouched"` for field-level validation
- [ ] Numeric/date inputs use `z.coerce`
- [ ] `reset()` called after successful submission
- [ ] Dynamic fields use `useFieldArray` with stable `field.id` keys

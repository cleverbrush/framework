import { highlightTS } from '@/lib/highlight';

export default function ImmutabilitySection() {
    return (
        <>
            {/* ── Immutability ─────────────────────────────────── */}
            <div className="card">
                <h2>Immutability</h2>
                <a href="/playground/immutability" className="playground-link">
                    ▶ Open in Playground
                </a>
                <p>
                    Every method on a schema builder returns a{' '}
                    <strong>new instance</strong>. The original is never
                    modified. This means you can safely derive new schemas from
                    existing ones without worrying about side effects:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { string } from '@cleverbrush/schema';

const base = string().minLength(1);
const strict = base.maxLength(50);    // new instance — base is unchanged
const loose  = base.optional(); // another new instance

// base still only has minLength(1)
// strict has minLength(1) + maxLength(50)
// loose has minLength(1) + optional`)
                        }}
                    />
                </pre>
                <p>
                    This is especially powerful when building a library of
                    reusable schema fragments:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`const Email = string().minLength(5).maxLength(255);
const Name  = string().minLength(1).maxLength(100);

const CreateUser = object({ name: Name, email: Email });
const UpdateUser = object({ name: Name.optional(), email: Email.optional() });
// Both schemas share the same base constraints but differ in optionality`)
                        }}
                    />
                </pre>
            </div>

            {/* ── JSDoc Comments Preservation ─────────────────── */}
            <div className="card">
                <h2>JSDoc Comments Preservation</h2>
                <p>
                    When you define an object schema, JSDoc comments on
                    properties are preserved in the inferred TypeScript type.
                    This means your IDE tooltips, hover documentation, and
                    autocomplete descriptions all carry through from the schema
                    definition — no need to maintain separate documentation:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { object, string, number, type InferType } from '@cleverbrush/schema';

const UserSchema = object({
  /** Full display name of the user */
  name: string().minLength(1).maxLength(200),
  /** Contact email — must be unique across all users */
  email: string().minLength(5),
  /** Age in years. Must be a positive integer. */
  age: number().min(0).max(150)
});

type User = InferType<typeof UserSchema>;
// Hovering over User.name in your IDE shows:
//   "Full display name of the user"
// Hovering over User.email shows:
//   "Contact email — must be unique across all users"`)
                        }}
                    />
                </pre>
                <p>
                    This is a unique advantage over other validation libraries:
                    your schema is not just a runtime validator but also the
                    canonical source of documentation for every property. Other
                    libraries like Zod, Yup, and Joi do not carry JSDoc comments
                    through to their inferred types.
                </p>
            </div>

            {/* ── Composing Schemas ────────────────────────────── */}
            <div className="card">
                <h2>Composing Schemas</h2>
                <a
                    href="/playground/composing-schemas"
                    className="playground-link"
                >
                    ▶ Open in Playground
                </a>
                <p>
                    Schemas can be extended with additional properties, combined
                    with unions, or nested inside arrays and objects:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { object, string, number, array, union } from '@cleverbrush/schema';

// Extend an existing schema with new properties
const BaseEntity = object({
  id:        string(),
  createdAt: string()
});

const UserEntity = BaseEntity.addProps({
  name:  string().minLength(2),
  email: string().minLength(5)
});

// Nest objects
const TeamSchema = object({
  name:    string().minLength(1),
  members: array(UserEntity).minLength(1).maxLength(50)
});

// Union types
const IdOrEmail = union(string().minLength(1)) // lookup by ID
  .or(string().matches(/^[^@]+@[^@]+$/));       // or by email
`)
                        }}
                    />
                </pre>
            </div>
        </>
    );
}

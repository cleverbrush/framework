import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function TypeInferenceSection() {
    return (
        <>
            <div className="section-header">
                <h1>Type Inference</h1>
                <p className="subtitle">
                    Derive TypeScript types directly from your schema — no
                    duplicate interfaces, no manual synchronization.
                </p>
            </div>

            <div className="card">
                <h2>InferType</h2>
                <a href="/playground/quick-start" className="playground-link">
                    ▶ Open in Playground
                </a>
                <p>
                    Use <code>{'InferType<typeof MySchema>'}</code> to extract
                    the TypeScript type from any schema. The inferred type
                    updates automatically when you change the schema — no manual
                    synchronization needed.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { object, string, number, array, boolean, type InferType } from '@cleverbrush/schema';

const UserSchema = object({
  name:     string().minLength(2),
  email:    string().email(),
  age:      number().min(0).optional(),
  isActive: boolean(),
  tags:     array(string())
});

type User = InferType<typeof UserSchema>;
// {
//   name: string;
//   email: string;
//   age?: number | undefined;
//   isActive: boolean;
//   tags: string[];
// }`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Optional &amp; Nullable</h2>
                <p>
                    <code>.optional()</code> adds <code>undefined</code> to the
                    type and removes the field from required keys.{' '}
                    <code>.nullable()</code> adds <code>null</code>.{' '}
                    <code>.nullish()</code> adds both.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { string, type InferType } from '@cleverbrush/schema';

type A = InferType<typeof string().optional()>;
// string | undefined

type B = InferType<typeof string().nullable()>;
// string | null

type C = InferType<typeof string().nullish()>;
// string | null | undefined`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Default Values Narrow the Type</h2>
                <p>
                    When <code>.default()</code> is applied to an optional
                    schema, <code>undefined</code> is removed from the inferred
                    type — because the default value will always fill in.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { number, type InferType } from '@cleverbrush/schema';

const Port = number().optional().default(3000);
type Port = InferType<typeof Port>;
// number  (not number | undefined)`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Branded Types</h2>
                <p>
                    Use <code>.brand()</code> to create nominal types that
                    prevent accidental mixing of structurally identical values.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { string, type InferType } from '@cleverbrush/schema';

const UserId = string().uuid().brand('UserId');
const OrderId = string().uuid().brand('OrderId');

type UserId = InferType<typeof UserId>;
// string & { __brand: 'UserId' }

type OrderId = InferType<typeof OrderId>;
// string & { __brand: 'OrderId' }

function getUser(id: UserId) { /* ... */ }

const uid = UserId.validate('...').object;
const oid = OrderId.validate('...').object;

getUser(uid); // ✓ compiles
getUser(oid); // ✗ TypeScript error — OrderId is not assignable to UserId`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Union &amp; Discriminated Union Inference</h2>
                <p>
                    Unions produce TypeScript union types. When each branch has
                    a literal-typed discriminator field, the inferred type is a
                    proper discriminated union — enabling <code>switch</code>{' '}
                    narrowing.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { union, object, string, number, type InferType } from '@cleverbrush/schema';

const Shape = union(
  object({ kind: string().equals('circle'), radius: number() })
).or(
  object({ kind: string().equals('rect'), width: number(), height: number() })
);

type Shape = InferType<typeof Shape>;
// { kind: 'circle'; radius: number }
// | { kind: 'rect'; width: number; height: number }

function area(s: Shape) {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2; // s narrowed to circle
    case 'rect':   return s.width * s.height;       // s narrowed to rect
  }
}`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Readonly Inference</h2>
                <p>
                    <code>.readonly()</code> wraps the inferred type in{' '}
                    <code>Readonly&lt;&gt;</code> or{' '}
                    <code>ReadonlyArray&lt;&gt;</code> — a type-level-only
                    constraint that prevents mutation at compile time.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { object, array, string, number, type InferType } from '@cleverbrush/schema';

type User = InferType<typeof object({ name: string(), age: number() }).readonly()>;
// Readonly<{ name: string; age: number }>

type Tags = InferType<typeof array(string()).readonly()>;
// ReadonlyArray<string>`)
                        }}
                    />
                </pre>
            </div>
        </>
    );
}

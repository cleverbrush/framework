import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function ObjectConstructorsSection() {
    return (
        <div className="card">
            <h2>Object Constructor Schemas</h2>
            <p>
                Use <code>.addConstructor(funcSchema)</code> on an{' '}
                <code>object()</code> builder to attach one or more typed
                constructor overloads. Each call appends a new construct
                signature to the inferred TypeScript type — the resulting type
                is an intersection of all construct signatures with the plain
                instance type.
            </p>
            <p>
                Constructor schemas are a <em>compile-time annotation</em>.
                Runtime validation still operates on plain objects, not on
                constructor calls.
            </p>

            <p>
                <strong>Single constructor</strong>:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { object, string, number, func, InferType } from '@cleverbrush/schema';

const PersonSchema = object({ name: string(), age: number() })
    .addConstructor(
        func().addParameter(string()).addParameter(number())
    );

type Person = InferType<typeof PersonSchema>;
// → { new (p0: string, p1: number): { name: string; age: number } }
//   & { name: string; age: number }

// Runtime validation still works on plain objects
PersonSchema.validate({ name: 'Alice', age: 30 }); // { valid: true }

// Introspect constructor schemas at runtime
PersonSchema.introspect().constructorSchemas.length; // 1`)
                    }}
                />
            </pre>

            <p>
                <strong>Multiple constructors</strong> — chain{' '}
                <code>.addConstructor()</code> calls to produce overloaded
                signatures:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { object, number, func, InferType } from '@cleverbrush/schema';

const PointSchema = object({ x: number(), y: number() })
    .addConstructor(func())                                       // no-arg ctor
    .addConstructor(func().addParameter(number()).addParameter(number())); // (x, y) ctor

type Point = InferType<typeof PointSchema>;
// → { new (): { x: number; y: number } }
//   & { new (p0: number, p1: number): { x: number; y: number } }
//   & { x: number; y: number }`)
                    }}
                />
            </pre>

            <p>
                Use <code>.clearConstructors()</code> to remove all registered
                constructor overloads and revert to the plain object type:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`const Plain = PointSchema.clearConstructors();

type PlainPoint = InferType<typeof Plain>;
// → { x: number; y: number }

Plain.introspect().constructorSchemas; // []`)
                    }}
                />
            </pre>
        </div>
    );
}

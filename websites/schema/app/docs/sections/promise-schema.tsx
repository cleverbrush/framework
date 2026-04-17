import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function PromiseSchemaSection() {
    return (
        <div className="card">
            <h2>Promise Schemas</h2>
            <p>
                Use <code>promise()</code> to validate that a value is a
                JavaScript <code>Promise</code> (or any thenable — an object
                with a <code>then</code> function). Pass an optional schema to
                annotate the <em>resolved</em> value type so that{' '}
                <code>InferType</code> produces <code>{'Promise<T>'}</code>{' '}
                instead of <code>Promise&lt;any&gt;</code>.
            </p>

            <p>
                <strong>Untyped promise</strong> — accepts any Promise:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { promise, InferType } from '@cleverbrush/schema';

const schema = promise();

type Result = InferType<typeof schema>;
// → Promise<any>

schema.validate(Promise.resolve(42));  // { valid: true }
schema.validate('not a promise' as any); // { valid: false }
schema.validate({ then: () => {} });   // { valid: true }  — any thenable passes`)
                    }}
                />
            </pre>

            <p>
                <strong>Typed resolved value</strong> — pass a schema to
                constrain what the promise is expected to resolve with. The
                inferred TypeScript type becomes <code>{'Promise<T>'}</code>:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { promise, string, number, object, InferType } from '@cleverbrush/schema';

// Promise<string>
const stringPromise = promise(string());
type StringPromise = InferType<typeof stringPromise>;
// → Promise<string>

// Promise<{ id: number; name: string }>
const userPromise = promise(
    object({ id: number(), name: string() })
);
type UserPromise = InferType<typeof userPromise>;
// → Promise<{ id: number; name: string }>

// Introspect the resolved-type schema at runtime
const info = userPromise.introspect();
// info.resolvedType instanceof ObjectSchemaBuilder`)
                    }}
                />
            </pre>

            <p>
                The <code>.hasResolvedType(schema)</code> method lets you set or
                replace the resolved-type schema on an existing builder — useful
                when composing schemas incrementally:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { promise, number, string } from '@cleverbrush/schema';

// Start untyped, then refine
const schema = promise()
    .hasResolvedType(number())
    .optional()
    .default(Promise.resolve(0));

type Result = InferType<typeof schema>;
// → Promise<number>`)
                    }}
                />
            </pre>

            <p>
                All standard builder methods are available:{' '}
                <code>.optional()</code>, <code>.nullable()</code>,{' '}
                <code>.default(value)</code>, <code>.catch(value)</code>,{' '}
                <code>.readonly()</code>, <code>.addValidator(fn)</code>,{' '}
                <code>.addPreprocessor(fn)</code>.
            </p>
        </div>
    );
}

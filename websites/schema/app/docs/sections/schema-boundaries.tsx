export default function SchemaBoundariesSection() {
    return (
        <>
            <div className="section-header">
                <h1>Schemas Across Boundaries</h1>
                <p className="subtitle">
                    Compose named references and explicit input-to-output
                    decoding without duplicating validation rules.
                </p>
            </div>
            <div className="card">
                <h2>Optional fallbacks</h2>
                <pre>
                    <code>{`const text = string().optional().catch(undefined);
const nullableText = string().nullable().catch(null);`}</code>
                </pre>
                <p>
                    Legacy optional schemas accept null at runtime. A fallback
                    does not replace a value that passed validation. Normalize
                    null explicitly if your application requires undefined; this
                    release does not change that compatibility behavior.
                </p>
            </div>
            <div className="card">
                <h2>One named definition</h2>
                <pre>
                    <code>{`const User = object({ name: string() }).schemaName('User');
const History = object({
    current: schemaRef(User),
    previous: schemaRef(User).nullable().optional()
        .describe('Previous user')
});`}</code>
                </pre>
                <p>
                    Reference modifiers apply at the use site. The original
                    named definition remains unchanged, and genuinely
                    conflicting definitions still fail registration.
                </p>
            </div>
            <div className="card">
                <h2>Declared input and output</h2>
                <pre>
                    <code>{`const PageSize = decode(
    string(),
    number().isInteger().min(1).max(100),
    value => Number(value)
);
type Editable = InferInput<typeof PageSize>; // string
type Validated = InferOutput<typeof PageSize>; // number
PageSize.parse('20'); // 20`}</code>
                </pre>
                <p>
                    The input is validated before conversion; the converted
                    result is validated against the output schema. Converter
                    errors become validation failures. Use parseAsync for
                    asynchronous converters. InferType remains an output alias.
                </p>
                <p>
                    Nested schemas and Standard Schema retain both types.
                    Defaults on the input schema run before conversion; a
                    default on the boundary is an output default.
                </p>
            </div>
            <div className="card">
                <h2>Export and adoption</h2>
                <pre>
                    <code>{`toJsonSchema(PageSize, { mode: 'input' });
toJsonSchema(PageSize, { mode: 'output' }); // default`}</code>
                </pre>
                <p>
                    OpenAPI uses input for requests and output for responses,
                    splitting named components when their shapes differ. Export
                    describes declared shapes, not arbitrary conversion logic.
                </p>
                <p>
                    Form state and typed-client request inference are separate
                    integrations. Until adopted there, keep explicit wire
                    contracts and decode at your application boundary. No
                    reverse conversion is inferred.
                </p>
                <a href="https://github.com/cleverbrush/framework/blob/development/libs/schema/BOUNDARIES.md">
                    Read the full composition guide
                </a>
            </div>
        </>
    );
}

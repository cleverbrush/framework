export default function SchemaBoundariesSection() {
    return (
        <>
            <div className="section-header">
                <h1>Schemas Across Boundaries</h1>
                <p className="subtitle">
                    Compose optional fallbacks and named references without
                    duplicating validation rules.
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
                <h2>API documents</h2>
                <p>
                    JSON Schema, OpenAPI and AsyncAPI preserve one canonical
                    named definition with local reference annotations.
                    Independent definitions with the same name still fail
                    registration. Existing inference and static type overrides
                    are unchanged.
                </p>
                <a href="https://github.com/cleverbrush/framework/blob/development/libs/schema/BOUNDARIES.md">
                    Read the full composition guide
                </a>
            </div>
        </>
    );
}

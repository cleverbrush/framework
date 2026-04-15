import { highlightTS } from '@/lib/highlight';

export default function SchemaNameSection() {
    return (
        <div className="card">
            <h2>schemaName</h2>
            <p>
                Every schema builder supports <code>.schemaName(name)</code>.
                This is a <strong>metadata-only</strong> modifier — it attaches
                a component name to the schema for OpenAPI tooling. It has no
                effect on validation or TypeScript type inference.
            </p>
            <p>
                When used with{' '}
                <a href="/server-openapi">
                    <code>@cleverbrush/server-openapi</code>
                </a>
                , any schema carrying a <code>schemaName</code> is automatically
                extracted into <code>components/schemas</code> and every usage
                in the generated document is replaced with a{' '}
                <code>{'$ref'}</code> pointer — eliminating repeated inline
                definitions and producing cleaner, more readable OpenAPI specs.
            </p>
            <div className="table-wrap">
                <table className="api-table">
                    <thead>
                        <tr>
                            <th>Method / Property</th>
                            <th>Signature</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <code>.schemaName(name)</code>
                            </td>
                            <td>
                                <code>{'schemaName(name: string): this'}</code>
                            </td>
                            <td>
                                Returns a new builder; original is unchanged
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>.introspect().schemaName</code>
                            </td>
                            <td>
                                <code>{'string | undefined'}</code>
                            </td>
                            <td>
                                The name passed to <code>.schemaName()</code>,
                                or <code>undefined</code> if not set
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(
                            `import { object, string, number, array } from '@cleverbrush/schema';
import { endpoint } from '@cleverbrush/server';
import { generateOpenApiSpec } from '@cleverbrush/server-openapi';

// Mark the schema with a name — export as a constant and reuse everywhere
export const UserSchema = object({
    id:   number(),
    name: string().nonempty(),
}).schemaName('User');

// Accessible at runtime
console.log(UserSchema.introspect().schemaName); // 'User'

// Chains naturally with other modifiers
const AddressSchema = object({
    street: string(),
    city:   string(),
})
    .schemaName('Address')
    .describe('A physical address');

// --- OpenAPI integration ---
const GetUser   = endpoint.get('/api/users/:id').returns(UserSchema);
const ListUsers = endpoint.get('/api/users').returns(array(UserSchema));

const spec = generateOpenApiSpec({
    registrations: [GetUser.registration, ListUsers.registration],
    info: { title: 'My API', version: '1.0.0' },
});

// User is emitted once in components.schemas:
// {
//   "type": "object",
//   "properties": { "id": { "type": "number" }, "name": { "type": "string" } },
//   "required": ["id", "name"]
// }
//
// Both endpoints reference it via $ref instead of repeating the inline definition:
// { "$ref": "#/components/schemas/User" }`
                        )
                    }}
                />
            </pre>
            <h3>Name uniqueness</h3>
            <p>
                Registering two <em>different</em> schema instances under the
                same name throws during spec generation. Always export named
                schemas as constants and reuse the same reference:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(
                            `// ✅ Correct — one constant, reused everywhere
export const UserSchema = object({ id: number() }).schemaName('User');

// ❌ Error — two distinct instances share a name
const A = object({ id: number() }).schemaName('User');
const B = object({ id: number() }).schemaName('User');
// generateOpenApiSpec() throws:
// "Schema name \\"User\\" is already registered by a different schema instance."`
                        )
                    }}
                />
            </pre>
        </div>
    );
}

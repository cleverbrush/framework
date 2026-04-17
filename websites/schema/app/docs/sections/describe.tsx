import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function DescribeSection() {
    return (
        <div className="card">
            <h2>Describe</h2>
            <a href="/playground/describe-metadata" className="playground-link">
                ▶ Open in Playground
            </a>
            <p>
                Every schema builder supports <code>.describe(text)</code>. This
                attaches a human-readable description to the schema as{' '}
                <strong>metadata only</strong> — it has no effect on validation,
                but it is accessible via <code>.introspect().description</code>{' '}
                and is automatically emitted as the <code>description</code>{' '}
                field by <code>toJsonSchema()</code> (including nested
                properties).
            </p>
            <div className="table-wrap">
                <table className="api-table">
                    <thead>
                        <tr>
                            <th>Method</th>
                            <th>Signature</th>
                            <th>Returns</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <code>.describe(text)</code>
                            </td>
                            <td>
                                <code>{'describe(text: string): this'}</code>
                            </td>
                            <td>
                                New builder instance with{' '}
                                <code>description</code> set; original is
                                unchanged
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>.introspect().description</code>
                            </td>
                            <td>
                                <code>{'string | undefined'}</code>
                            </td>
                            <td>
                                The text passed to <code>.describe()</code>, or{' '}
                                <code>undefined</code> if not set
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { object, string, number } from '@cleverbrush/schema';
import { toJsonSchema } from '@cleverbrush/schema-json';

const ProductSchema = object({
    id:    string().uuid().describe('Unique product identifier'),
    name:  string().nonempty().describe('Display name shown to customers'),
    price: number().positive().describe('Price in USD')
}).describe('A product in the catalogue');

// Read description back at runtime
console.log(ProductSchema.introspect().description);
// 'A product in the catalogue'

// toJsonSchema emits description fields automatically
const schema = toJsonSchema(ProductSchema, { $schema: false });
// {
//   type: 'object',
//   description: 'A product in the catalogue',
//   properties: {
//     id:    { type: 'string', format: 'uuid', description: 'Unique product identifier' },
//     name:  { type: 'string', minLength: 1,   description: 'Display name shown to customers' },
//     price: { type: 'number', exclusiveMinimum: 0, description: 'Price in USD' }
//   }
// }

// Chains naturally with all other modifiers — order does not matter
const field = string().optional().describe('Optional note').minLength(1);`)
                    }}
                />
            </pre>
        </div>
    );
}

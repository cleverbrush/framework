import { highlightTS } from '@/lib/highlight';

export default function PropertyDescriptorsSection() {
    return (
        <div className="card">
            <h2>PropertyDescriptors</h2>
            <p>
                A <code>PropertyDescriptor</code> is a runtime metadata object
                attached to each property in an object schema. It provides
                type-safe access to:
            </p>
            <ul>
                <li>
                    <strong>getValue / setValue</strong> — read and write
                    property values on any object matching the schema, with full
                    type safety
                </li>
                <li>
                    <strong>getSchema</strong> — retrieve the schema builder for
                    the property (its type, constraints, validators)
                </li>
                <li>
                    <strong>parent</strong> — navigate up the descriptor tree
                </li>
            </ul>
            <p>
                PropertyDescriptors are what make the entire ecosystem work. The
                mapper library uses them as <strong>selectors</strong> — like C#
                expression trees — to point at source and target properties
                type-safely. The form library uses them to bind fields to
                specific schema properties and read their validation constraints
                automatically.
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { object, string, ObjectSchemaBuilder } from '@cleverbrush/schema';

const AddressSchema = object({
  city:   string().minLength(1),
  street: string().minLength(1),
  zip:    string().minLength(5).maxLength(10)
});

const UserSchema = object({
  name:    string().minLength(2),
  address: AddressSchema
});

// Get the PropertyDescriptor tree
const tree = ObjectSchemaBuilder.getPropertiesFor(UserSchema);

// Type-safe property access
const user = { name: 'Alice', address: { city: 'NYC', street: '5th Ave', zip: '10001' } };
const cityDesc = tree.address.city;

// Read a value
const cityResult = cityDesc[Symbol.for('schemaPropertyDescriptor')].getValue(user);
console.log(cityResult.value); // 'NYC'`)
                    }}
                />
            </pre>
        </div>
    );
}

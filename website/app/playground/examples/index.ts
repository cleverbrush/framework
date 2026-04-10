export interface Example {
    id: string;
    title: string;
    description: string;
    group: string;
    code: string;
    testData: string;
}

export const EXAMPLE_GROUPS = [
    { label: 'Getting Started', ids: ['quick-start', 'schema-types'] },
    {
        label: 'Constraints',
        ids: [
            'string-constraints',
            'number-constraints',
            'optional-fields',
            'custom-error-messages',
            'readonly-modifier'
        ]
    },
    {
        label: 'Objects & Composition',
        ids: [
            'object-schemas',
            'nested-objects',
            'composing-schemas',
            'immutability',
            'deep-partial',
            'recursive-schemas'
        ]
    },
    {
        label: 'Arrays & Unions',
        ids: [
            'arrays',
            'tuples',
            'record-basics',
            'record-key-constraints',
            'record-nested',
            'record-errors',
            'union-types',
            'discriminated-unions',
            'nullable'
        ]
    },
    {
        label: 'Function Schemas',
        ids: ['function-schema', 'function-typed-params', 'function-in-object']
    },
    {
        label: 'Promise Schemas',
        ids: ['promise-schema', 'promise-typed']
    },
    { label: 'Validation', ids: ['validation-errors', 'custom-validators'] },
    {
        label: 'Error Scenarios',
        ids: [
            'primitive-errors',
            'object-errors',
            'nested-object-errors',
            'partial-errors',
            'array-errors',
            'deep-nesting-errors'
        ]
    },
    {
        label: 'Extensions',
        ids: ['builtin-extensions', 'custom-extensions', 'enum']
    },
    { label: 'Metadata', ids: ['describe-metadata'] },
    {
        label: 'Default Values',
        ids: [
            'default-static',
            'default-factory',
            'default-optional',
            'default-object',
            'default-validation',
            'default-introspect'
        ]
    },
    {
        label: 'Catch / Fallback',
        ids: [
            'catch-static',
            'catch-factory',
            'catch-vs-default',
            'catch-parse',
            'catch-introspect'
        ]
    },
    {
        label: 'External Schema Interop',
        ids: ['extern-basic']
    }
];

export const examples: Example[] = [
    // ── Getting Started ─────────────────────────────
    {
        id: 'quick-start',
        title: 'Quick Start',
        description:
            'Define a schema, infer its TypeScript type, and validate data — all from a single definition.',
        group: 'Getting Started',
        code: `import { object, string, number, boolean } from '@cleverbrush/schema';

// Define a schema with fluent constraints
const UserSchema = object({
    /** Full name — at least 2 characters */
    name: string().nonempty('Name is required').minLength(2, 'Name must be at least 2 characters'),
    /** Must be a valid email address */
    email: string().email('Please enter a valid email address'),
    /** Age in years (0–150) */
    age: number().min(0, 'Age cannot be negative').max(150, 'Age seems unrealistic').positive(),
    /** Whether the account is currently active */
    isActive: boolean()
});

// Validate data at runtime
const result = UserSchema.validate({
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
    isActive: true
});
`,
        testData:
            '{ "name": "Alice", "email": "alice@example.com", "age": 30, "isActive": true }'
    },
    {
        id: 'schema-types',
        title: 'Schema Types',
        description:
            'All available schema builder functions: <code>string()</code>, <code>number()</code>, <code>boolean()</code>, <code>object()</code>, <code>array()</code>, <code>union()</code>, and more.',
        group: 'Getting Started',
        code: `import { string, number, boolean, object, array, union } from '@cleverbrush/schema';

// String schema
const name = string().minLength(1);

// Number schema
const age = number().min(0).max(120);

// Boolean schema
const isActive = boolean();

// Object schema — compose other schemas
const UserSchema = object({
    /** Display name */
    name: name.required(),
    /** Age in years */
    age: age,
    /** Account active flag */
    isActive: isActive
});

// Array schema — validate each element
const tags = array(string().minLength(1));

// Union schema — accept multiple types
const idOrName = union(string()).or(number());

const result = UserSchema.validate({
    name: "Alice",
    age: 30,
    isActive: true
});
`,
        testData: '{ "name": "Alice", "age": 30, "isActive": true }'
    },

    // ── Constraints ─────────────────────────────────
    {
        id: 'string-constraints',
        title: 'String Constraints',
        description:
            'Use <code>.minLength()</code>, <code>.maxLength()</code>, <code>.matches()</code>, <code>.email()</code>, <code>.url()</code>, and more.',
        group: 'Constraints',
        code: `import { string } from '@cleverbrush/schema';

// Length constraints
const username = string().minLength(3).maxLength(50);

// Built-in pattern validators
const email = string().email();
const website = string().url();
const id = string().uuid();

// Custom regex pattern
const slug = string().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

// Try different values!
const result = username.validate("ab");
`,
        testData: '"ab"'
    },
    {
        id: 'number-constraints',
        title: 'Number Constraints',
        description:
            'Use <code>.min()</code>, <code>.max()</code>, <code>.isInteger()</code>, <code>.positive()</code>, <code>.negative()</code>, and <code>.multipleOf()</code>.',
        group: 'Constraints',
        code: `import { number } from '@cleverbrush/schema';

// Range constraints
const age = number().min(0).max(120).isInteger();

// Sign constraints
const price = number().positive();
const debt = number().negative();

// Multiple-of constraint
const percentage = number().min(0).max(100).multipleOf(5);

const result = age.validate(25);
`,
        testData: '25'
    },
    {
        id: 'optional-fields',
        title: 'Optional Fields',
        description:
            'All schemas are required by default. Use <code>.optional()</code> to allow <code>undefined</code>.',
        group: 'Constraints',
        code: `import { object, string, number } from '@cleverbrush/schema';

const UserSchema = object({
    /** Required — cannot be undefined */
    name: string().required(),
    /** Optional display nickname */
    nickname: string().optional(),
    /** Age in years (optional) */
    age: number().optional()
});

// nickname and age are optional — this is valid
const result = UserSchema.validate({
    name: "Alice"
});
`,
        testData: '{ "name": "Alice" }'
    },
    {
        id: 'custom-error-messages',
        title: 'Custom Error Messages',
        description:
            'Every constraint accepts an optional custom error message as a second argument.',
        group: 'Constraints',
        code: `import { object, string, number } from '@cleverbrush/schema';

const UserSchema = object({
    /** User's full name */
    name: string()
        .required('Name is required')
        .minLength(2, 'Name must be at least 2 characters'),
    /** Contact email */
    email: string()
        .required('Email is required')
        .email('Please enter a valid email address'),
    /** Must be between 0 and 150 */
    age: number()
        .required('Age is required')
        .min(0, 'Age cannot be negative')
        .max(150, 'Age seems unrealistic')
});

// This object has multiple problems — check the errors!
const result = UserSchema.validate(
    { name: 'A', email: 'invalid', age: -5 },
    { doNotStopOnFirstError: true }
);
`,
        testData: '{ "name": "A", "email": "invalid", "age": -5 }'
    },
    {
        id: 'readonly-modifier',
        title: 'Readonly Modifier',
        description:
            "Use <code>.readonly()</code> to mark a schema's inferred type as immutable. This is <strong>type-level only</strong> — validation behaviour is unchanged, but TypeScript will enforce immutability.",
        group: 'Constraints',
        code: `import { object, array, string, number, InferType } from '@cleverbrush/schema';

// Readonly object — top-level props become readonly
const UserSchema = object({
    name: string().required(),
    age: number()
}).readonly();

type User = InferType<typeof UserSchema>;
// Readonly<{ name: string; age: number }>
// user.name = 'Bob'; // ✗ TypeScript error!

// Readonly array — no push, pop, etc.
const TagsSchema = array(string()).readonly();
type Tags = InferType<typeof TagsSchema>;
// ReadonlyArray<string>

// Chains with .optional() and .default()
const ConfigSchema = object({
    host: string().default('localhost'),
    port: number().default(3000)
}).readonly().optional();

type Config = InferType<typeof ConfigSchema>;
// Readonly<{ host: string; port: number }> | undefined

// isReadonly flag via .introspect()
console.log(UserSchema.introspect().isReadonly); // true
console.log(TagsSchema.introspect().isReadonly); // true

// Validation works as normal
const result = UserSchema.validate({ name: 'Alice', age: 30 });
`,
        testData: '{ "name": "Alice", "age": 30 }'
    },

    // ── Objects & Composition ───────────────────────
    {
        id: 'object-schemas',
        title: 'Object Schemas',
        description:
            'Compose schemas into an <code>object()</code> to validate structured data with automatic TypeScript type inference.',
        group: 'Objects & Composition',
        code: `import { object, string, number } from '@cleverbrush/schema';

const UserSchema = object({
    /** Full name (min 2 chars) */
    name: string().required().minLength(2),
    /** Valid email address */
    email: string().required().email(),
    /** Age in years (0–120) */
    age: number().min(0).max(120)
});

// InferType<typeof UserSchema> gives you the TypeScript type automatically!
const result = UserSchema.validate({
    name: "Alice",
    email: "alice@example.com",
    age: 30
});
`,
        testData: '{ "name": "Alice", "email": "alice@example.com", "age": 30 }'
    },
    {
        id: 'nested-objects',
        title: 'Nested Objects',
        description:
            'Nest objects inside objects to model real-world data. Error paths use dot notation like <code>$.address.city</code>.',
        group: 'Objects & Composition',
        code: `import { object, string, number } from '@cleverbrush/schema';

const AddressSchema = object({
    /** City name */
    city: string().required().minLength(1),
    /** Street address */
    street: string().required().minLength(1),
    /** Postal / ZIP code (5–10 chars) */
    zip: string().required().minLength(5).maxLength(10)
});

const UserSchema = object({
    /** Full name (min 2 chars) */
    name: string().required().minLength(2),
    /** Mailing address */
    address: AddressSchema
});

const result = UserSchema.validate({
    name: "Alice",
    address: { city: "NYC", street: "5th Ave", zip: "10001" }
});
`,
        testData:
            '{ "name": "Alice", "address": { "city": "NYC", "street": "5th Ave", "zip": "10001" } }'
    },
    {
        id: 'composing-schemas',
        title: 'Composing Schemas',
        description:
            'Extend existing schemas with <code>.addProps()</code>, nest them in arrays, and combine with unions.',
        group: 'Objects & Composition',
        code: `import { object, string, number, array, union } from '@cleverbrush/schema';

// Extend an existing schema with new properties
const BaseEntity = object({
    /** Unique identifier */
    id: string(),
    /** ISO date string */
    createdAt: string()
});

const UserEntity = BaseEntity.addProps({
    /** Display name */
    name: string().minLength(2),
    /** Email address */
    email: string().minLength(5)
});

// Nest objects inside arrays
const TeamSchema = object({
    /** Team name */
    name: string().minLength(1),
    /** Team members (1–50) */
    members: array(UserEntity).minLength(1).maxLength(50)
});

const result = TeamSchema.validate({
    name: "Engineering",
    members: [
        { id: "1", createdAt: "2024-01-01", name: "Alice", email: "alice@test.com" }
    ]
});
`,
        testData:
            '{ "name": "Engineering", "members": [{ "id": "1", "createdAt": "2024-01-01", "name": "Alice", "email": "alice@test.com" }] }'
    },
    {
        id: 'immutability',
        title: 'Immutability',
        description:
            'Every method returns a new schema instance. The original is never modified — safe to compose and reuse.',
        group: 'Objects & Composition',
        code: `import { string, object } from '@cleverbrush/schema';

const base = string().minLength(1);
const strict = base.maxLength(50);    // new instance — base is unchanged
const loose = base.optional();        // another new instance

// Reusable schema fragments
const Email = string().minLength(5).maxLength(255);
const Name = string().minLength(1).maxLength(100);

const CreateUser = object({ name: Name, email: Email });
const UpdateUser = object({ name: Name.optional(), email: Email.optional() });
// Both share base constraints but differ in optionality

const result = CreateUser.validate({ name: "Alice", email: "alice@test.com" });
`,
        testData: '{ "name": "Alice", "email": "alice@test.com" }'
    },
    {
        id: 'deep-partial',
        title: 'Deep Partial',
        description:
            'Use <code>.deepPartial()</code> to make every property optional at every nesting level — ideal for PATCH request bodies and partial form state.',
        group: 'Objects & Composition',
        code: `import { object, string, number, type InferType } from '@cleverbrush/schema';

const CreateUser = object({
    name:    string(),
    address: object({
        street: string(),
        city:   string(),
        zip:    string()
    }),
    settings: object({
        theme:    string(),
        language: string()
    })
});

// Every property at every level is optional
const PatchUser = CreateUser.deepPartial();

type PatchPayload = InferType<typeof PatchUser>;
// { name?: string; address?: { street?: string; city?: string; zip?: string };
//   settings?: { theme?: string; language?: string } }

// Send only the fields you want to update
const result = PatchUser.validate({
    address: { city: 'Paris' }
});
`,
        testData: '{ "address": { "city": "Paris" } }'
    },
    {
        id: 'recursive-schemas',
        title: 'Recursive Schemas',
        description:
            'Use <code>lazy()</code> to define self-referential schemas for tree structures, comment threads, nested menus, and any type that references itself.',
        group: 'Objects & Composition',
        code: `import { object, string, number, array, lazy } from '@cleverbrush/schema';
import type { SchemaBuilder } from '@cleverbrush/schema';

// TypeScript can't infer recursive types — explicit annotation required
type TreeNode = { value: number; children: TreeNode[] };

const treeNode: SchemaBuilder<TreeNode, true> = object({
    value: number(),
    children: array(lazy(() => treeNode))
});

const result = treeNode.validate({
    value: 1,
    children: [
        { value: 2, children: [] },
        { value: 3, children: [{ value: 4, children: [] }] }
    ]
});
`,
        testData:
            '{ "value": 1, "children": [{ "value": 2, "children": [] }, { "value": 3, "children": [{ "value": 4, "children": [] }] }] }'
    },

    // ── Arrays & Unions ─────────────────────────────
    {
        id: 'arrays',
        title: 'Arrays',
        description:
            'Validate arrays with element schemas using <code>array()</code>. Supports <code>.minLength()</code>, <code>.maxLength()</code>, <code>.nonempty()</code>, and <code>.unique()</code>.',
        group: 'Arrays & Unions',
        code: `import { array, string, number, object } from '@cleverbrush/schema';

// Array of strings
const tags = array(string().minLength(1)).nonempty().unique();

const result = tags.validate(["typescript", "schema", "validation"]);
`,
        testData: '["typescript", "schema", "validation"]'
    },
    {
        id: 'union-types',
        title: 'Union Types',
        description:
            'Use <code>union()</code> to accept multiple types. <code>InferType</code> correctly infers the union at the type level.',
        group: 'Arrays & Unions',
        code: `import { union, string, number } from '@cleverbrush/schema';

// Accept string OR number
const flexible = union(string()).or(number());

// Validate different types
const r1 = flexible.validate("hello");   // valid
const result = flexible.validate(42);    // also valid
`,
        testData: '42'
    },
    {
        id: 'discriminated-unions',
        title: 'Discriminated Unions',
        description:
            "Use <code>string('literal')</code> for the discriminator field. No special API needed — TypeScript narrows the type automatically.",
        group: 'Arrays & Unions',
        code: `import { object, string, number, union } from '@cleverbrush/schema';

// Each variant has a literal "type" field acting as the discriminator
const Circle = object({
    /** Discriminator literal */
    type: string('circle'),
    /** Circle radius (non-negative) */
    radius: number().min(0)
});

const Rectangle = object({
    /** Discriminator literal */
    type: string('rectangle'),
    /** Width (non-negative) */
    width: number().min(0),
    /** Height (non-negative) */
    height: number().min(0)
});

const Triangle = object({
    /** Discriminator literal */
    type: string('triangle'),
    /** Base length (non-negative) */
    base: number().min(0),
    /** Height (non-negative) */
    height: number().min(0)
});

// Combine with union() — no special .discriminator() call needed
const ShapeSchema = union(Circle).or(Rectangle).or(Triangle);

const result = ShapeSchema.validate({ type: 'circle', radius: 5 });
`,
        testData: '{ "type": "circle", "radius": 5 }'
    },

    // ── Validation ──────────────────────────────────
    {
        id: 'validation-errors',
        title: 'Validation Errors',
        description:
            'Explore the error structure: each error has a <code>path</code> and <code>message</code>. Use <code>doNotStopOnFirstError</code> to collect all errors.',
        group: 'Validation',
        code: `import { object, string, number } from '@cleverbrush/schema';

const UserSchema = object({
    /** Full name (min 2 chars) */
    name: string().required("Name is required").minLength(2),
    /** Contact email */
    email: string().required("Email is required"),
    /** Must be 18 or older */
    age: number().required("Age is required").min(18)
});

// This object has multiple problems — check the errors!
const result = UserSchema.validate(
    {
        name: "A",          // too short
        email: undefined,   // missing
        age: 10             // too young
    },
    { doNotStopOnFirstError: true }
);
`,
        testData: '{ "name": "A", "email": null, "age": 10 }'
    },
    {
        id: 'custom-validators',
        title: 'Custom Validators',
        description:
            'Add custom validation logic with <code>.addValidator()</code>. Validators return <code>{ valid, errors }</code>.',
        group: 'Validation',
        code: `import { object, string } from '@cleverbrush/schema';

const SignupSchema = object({
    /** At least 8 characters */
    password: string().required().minLength(8),
    /** Must match password */
    confirmPassword: string().required().minLength(8)
}).addValidator((value) => {
    if (value.password !== value.confirmPassword) {
        return {
            valid: false,
            errors: [{ message: 'Passwords do not match' }]
        };
    }
    return { valid: true };
});

const result = SignupSchema.validate({
    password: "secret123",
    confirmPassword: "secret456"
});
`,
        testData: '{ "password": "secret123", "confirmPassword": "secret456" }'
    },

    // ── Error Scenarios ─────────────────────────────
    {
        id: 'primitive-errors',
        title: 'Primitive Errors',
        description:
            'Errors from standalone string, number, and boolean schemas — shown as a flat list.',
        group: 'Error Scenarios',
        code: `import { string, number, boolean } from '@cleverbrush/schema';

// String: expected an email
const emailResult = string().email('Not a valid email').validate('not-an-email');

// Number: out of range
const ageResult = number()
    .min(0, 'Must be non-negative')
    .max(150, 'Must be realistic')
    .validate(-5);

// Boolean: wrong type entirely
const flagResult = boolean().validate('yes' as any);

// Pick one to see in the panel:
const result = emailResult;
`,
        testData: '"not-an-email"'
    },
    {
        id: 'object-errors',
        title: 'Object Errors',
        description:
            'Per-property errors on a flat object schema, displayed as a tree using <code>getErrorsFor()</code>.',
        group: 'Error Scenarios',
        code: `import { object, string, number } from '@cleverbrush/schema';

const ProfileSchema = object({
    /** Display name (2–50 chars) */
    name: string().required('Name is required').minLength(2, 'Too short').maxLength(50, 'Too long'),
    /** Valid email address */
    email: string().required('Email is required').email('Invalid email'),
    /** Portfolio or blog URL */
    website: string().url('Must be a valid URL'),
    /** Years of experience */
    experience: number().min(0, 'Cannot be negative').max(60, 'Seems too high')
});

const result = ProfileSchema.validate(
    {
        name: 'A',                   // too short
        email: 'not-an-email',       // invalid format
        website: 'just some text',   // not a URL
        experience: -3               // negative
    },
    { doNotStopOnFirstError: true }
);
`,
        testData:
            '{ "name": "A", "email": "not-an-email", "website": "just some text", "experience": -3 }'
    },
    {
        id: 'nested-object-errors',
        title: 'Nested Object Errors',
        description:
            'Errors on a schema with nested objects — the error tree displays property-level errors at each nesting depth.',
        group: 'Error Scenarios',
        code: `import { object, string, number } from '@cleverbrush/schema';

const OrderSchema = object({
    /** Order reference */
    orderId: string().required('Order ID is required'),
    /** Shipping destination */
    shippingAddress: object({
        /** Street line */
        street: string().required('Street is required'),
        /** City name */
        city: string().required('City is required').minLength(2),
        /** Postal / ZIP code */
        zip: string().required('ZIP code is required').minLength(4, 'ZIP too short'),
        /** ISO country code */
        country: string().required('Country is required').minLength(2).maxLength(2, 'Use 2-letter code')
    }),
    /** Total amount in cents */
    totalCents: number().required().min(1, 'Total must be positive')
});

const result = OrderSchema.validate(
    {
        orderId: '',                    // empty
        shippingAddress: {
            street: '',                  // empty
            city: 'A',                   // too short
            zip: '1',                    // too short
            country: 'United States'     // too long
        },
        totalCents: 0                   // not positive
    },
    { doNotStopOnFirstError: true }
);
`,
        testData:
            '{ "orderId": "", "shippingAddress": { "street": "", "city": "A", "zip": "1", "country": "United States" }, "totalCents": 0 }'
    },
    {
        id: 'partial-errors',
        title: 'Partially Valid Object',
        description:
            'Some fields pass and some fail — the error tree only shows properties with problems.',
        group: 'Error Scenarios',
        code: `import { object, string, number } from '@cleverbrush/schema';

const ProductSchema = object({
    /** Product name (required) */
    name: string().required('Name is required').minLength(2),
    /** SKU identifier */
    sku: string().required('SKU is required').minLength(4, 'SKU must be at least 4 chars'),
    /** Price in dollars */
    price: number().required('Price is required').positive('Price must be positive'),
    /** Number in stock */
    stock: number().min(0, 'Stock cannot be negative'),
    /** Product description */
    description: string().maxLength(500)
});

const result = ProductSchema.validate(
    {
        name: 'Widget',              // ✓ valid
        sku: 'AB',                   // ✗ too short
        price: -10,                  // ✗ negative
        stock: 42,                   // ✓ valid
        description: 'A fine widget' // ✓ valid
    },
    { doNotStopOnFirstError: true }
);
`,
        testData:
            '{ "name": "Widget", "sku": "AB", "price": -10, "stock": 42, "description": "A fine widget" }'
    },
    {
        id: 'array-errors',
        title: 'Array & Element Errors',
        description:
            'Validation on array schemas — element-level constraints and min/max length checks.',
        group: 'Error Scenarios',
        code: `import { object, string, number, array } from '@cleverbrush/schema';

const TeamSchema = object({
    /** Team name */
    name: string().required('Team name is required'),
    /** 2–10 members required */
    members: array(
        object({
            /** Member name */
            name: string().required('Member name is required').minLength(2),
            /** Role in team */
            role: string().required('Role is required')
        })
    ).minLength(2, 'Need at least 2 members').maxLength(10)
});

const result = TeamSchema.validate(
    {
        name: 'Alpha Squad',
        members: [
            { name: 'A', role: '' }  // name too short, role empty — only 1 member (need 2)
        ]
    },
    { doNotStopOnFirstError: true }
);
`,
        testData:
            '{ "name": "Alpha Squad", "members": [{ "name": "A", "role": "" }] }'
    },
    {
        id: 'deep-nesting-errors',
        title: 'Deep Nesting Errors',
        description:
            'Three levels of nested objects — errors propagate through the full tree.',
        group: 'Error Scenarios',
        code: `import { object, string, number } from '@cleverbrush/schema';

const CompanySchema = object({
    /** Company legal name */
    name: string().required('Company name is required'),
    /** Primary office */
    headquarters: object({
        /** Office address */
        address: object({
            /** Street address */
            street: string().required('Street is required'),
            /** City name */
            city: string().required('City is required'),
            /** 5-digit ZIP */
            zip: string().required('ZIP is required').minLength(5, 'Need 5 digits')
        }),
        /** Number of employees at this office */
        employeeCount: number().min(1, 'Must have at least 1 employee')
    }),
    /** Year company was founded */
    foundedYear: number()
        .required('Founded year is required')
        .min(1800, 'Year must be after 1800')
        .max(2026, 'Year cannot be in the future')
});

const result = CompanySchema.validate(
    {
        name: '',                         // empty
        headquarters: {
            address: {
                street: '',               // empty
                city: '',                 // empty
                zip: '12'                 // too short
            },
            employeeCount: 0             // must be >= 1
        },
        foundedYear: 1750                // too old
    },
    { doNotStopOnFirstError: true }
);
`,
        testData:
            '{ "name": "", "headquarters": { "address": { "street": "", "city": "", "zip": "12" }, "employeeCount": 0 }, "foundedYear": 1750 }'
    },

    // ── Extensions ──────────────────────────────────
    {
        id: 'builtin-extensions',
        title: 'Common Validators',
        description:
            'The default import includes ready-to-use validators: <code>.email()</code>, <code>.url()</code>, <code>.uuid()</code>, <code>.positive()</code>, <code>.nonempty()</code>, and more.',
        group: 'Extensions',
        code: `import { string, number, array } from '@cleverbrush/schema';

// String extensions
const email = string().email();
const website = string().url();
const id = string().uuid();
const trimmed = string().trim().toLowerCase();

// Number extensions
const price = number().positive();
const score = number().finite();
const step = number().multipleOf(5);

// Array extensions
const items = array(string()).nonempty().unique();

const r1 = email.validate("not-an-email");
const result = price.validate(-5);
`,
        testData: '"not-an-email"'
    },
    {
        id: 'nullable',
        title: 'Nullable Fields',
        description:
            'Use <code>.nullable()</code> to accept the original type <em>or</em> <code>null</code>. Use <code>.notNullable()</code> to reverse it. Both are native methods on every builder — the inferred type updates automatically.',
        group: 'Arrays & Unions',
        code: `import { string, number, object, InferType } from '@cleverbrush/schema';

const name = string().nullable();
type Name = InferType<typeof name>; // string | null

// Validators chain before .nullable()
const email = string().email().nullable(); // string | null

// .optional().nullable() — accepts string | null | undefined
const bio = string().optional().nullable();

// Use inside objects
const User = object({
    name: string().nonempty(),
    bio:  string().nullable(),
    age:  number().nullable(),
});

const result = User.validate({
    name: 'Alice',
    bio:  null,
    age:  null,
});

// Toggle back with .notNullable()
const strictName = string().nullable().notNullable();
type StrictName = InferType<typeof strictName>; // string (not string | null)

strictName.validate(null);    // invalid
strictName.validate('Alice'); // valid

// Introspect at runtime
string().nullable().introspect().isNullable;                // true
string().nullable().notNullable().introspect().isNullable;  // false
`,
        testData: '{ "name": "Alice", "bio": null, "age": null }'
    },
    {
        id: 'tuples',
        title: 'Tuples',
        description:
            'Use <code>tuple([...schemas])</code> for fixed-length arrays with per-position types — mirrors TypeScript tuple types. Use <code>.rest(schema)</code> for variadic tails.',
        group: 'Arrays & Unions',
        code: `import { tuple, string, number, boolean } from '@cleverbrush/schema';

// Fixed-length tuple: [string, number, boolean]
const entry = tuple([string(), number(), boolean()]);

// Validate a matching tuple
const result = entry.validate(['hello', 42, true]);
// result.valid === true, result.object === ['hello', 42, true]

// Wrong type at position 1 → invalid
const bad = entry.validate(['hello', 'oops', true] as any);
// bad.valid === false

// 2-D coordinate pair
const point = tuple([number(), number()]);
const p = point.validate([10.5, 20.3]);
// p.object === [10.5, 20.3]

// Variadic tail with .rest()
const log = tuple([string(), number()]).rest(string());
// Type: [string, number, ...string[]]
const l = log.validate(['info', 200, 'request ok', 'extra detail']);
// l.valid === true
`,
        testData: '["hello", 42, true]'
    },
    {
        id: 'record-basics',
        title: 'Record Schemas',
        description:
            'Use <code>record(keySchema, valueSchema)</code> to validate objects with <strong>dynamic string keys</strong> — lookup tables, i18n bundles, caches, and any <code>Record&lt;K,V&gt;</code> shape. Unlike <code>object()</code>, the set of keys need not be known at schema-definition time.',
        group: 'Arrays & Unions',
        code: `import { record, string, number, InferType } from '@cleverbrush/schema';

// string keys → number values
const scores = record(string(), number().min(0).max(100));
type Scores = InferType<typeof scores>; // Record<string, number>

// Optional record with a factory default
const cache = record(string(), number()).optional().default(() => ({}));

const result = scores.validate({ alice: 95, bob: 87 });
// result.valid === true
// result.object === { alice: 95, bob: 87 }
`,
        testData: '{ "alice": 95, "bob": 87 }'
    },
    {
        id: 'record-key-constraints',
        title: 'Record — Key Constraints',
        description:
            'The first argument to <code>record()</code> is a <code>StringSchemaBuilder</code> — chain any string constraint to restrict which keys are valid. Here <code>.startsWith()</code> also <strong>narrows the inferred key type</strong> to a template literal.',
        group: 'Arrays & Unions',
        code: `import { record, string, InferType } from '@cleverbrush/schema';

// Keys must start with "get" AND match a camelCase getter pattern.
// .startsWith('get') narrows the inferred key type to \`get\${string}\`.
const i18n = record(
    string().startsWith('get').matches(/^get[A-Z]/),
    string().nonempty()
);

type I18n = InferType<typeof i18n>;
// Record<\`get\${string}\`, string>
// — only "get…" keys are type-safe

const result = i18n.validate({
    getWelcome:  'Welcome!',
    getGoodbye:  'Goodbye!',
    getNotFound: 'Page not found'
});
// result.valid === true

// i18n.validate({ welcome: 'hi' })     → invalid (missing "get" prefix)
// i18n.validate({ getWelcome: '' })     → invalid (empty string value)
// i18n.validate({ GetWelcome: 'hi' })   → invalid (uppercase "G")
`,
        testData: '{ "getWelcome": "Welcome!", "getGoodbye": "Goodbye!" }'
    },
    {
        id: 'record-nested',
        title: 'Record — Nested Object Values',
        description:
            'Values in a record can be any schema, including <code>object()</code>. This is useful for maps from an ID or key to a structured entity.',
        group: 'Arrays & Unions',
        code: `import { record, string, number, object, InferType } from '@cleverbrush/schema';

const userMap = record(
    string(),
    object({ name: string(), age: number().min(0) })
);

type UserMap = InferType<typeof userMap>;
// Record<string, { name: string; age: number }>

const result = userMap.validate({
    u1: { name: 'Alice', age: 30 },
    u2: { name: 'Bob',   age: 25 }
});
// result.valid === true
`,
        testData:
            '{ "u1": { "name": "Alice", "age": 30 }, "u2": { "name": "Bob", "age": 25 } }'
    },
    {
        id: 'record-errors',
        title: 'Record — Per-Key Errors',
        description:
            'Use <code>getErrorsFor(key)</code> to retrieve rich per-entry error information — error messages, the seen value, and a <strong>descriptor</strong> that lets you read and write the entry on the validated object. Use <code>getErrorsFor()</code> (no argument) for root-level errors.',
        group: 'Arrays & Unions',
        code: `import { record, string, number } from '@cleverbrush/schema';

const schema = record(string(), number().min(0));

const result = schema.validate(
    { a: 1, b: -2, c: -3 },
    { doNotStopOnFirstError: true }
);
// result.valid === false

// Root-level errors (e.g. "object expected" when a non-object is passed)
const root = result.getErrorsFor();
// root.isValid === true  (the container itself is valid)
// root.seenValue        === { a: 1, b: -2, c: -3 }

// Per-key result: errors, seen value, and a descriptor
const bResult = result.getErrorsFor('b');
// bResult.isValid    === false
// bResult.errors[0]  === 'the value must be >= 0'
// bResult.seenValue  === -2

// Descriptor: key name, schema, get/set helpers
const desc = bResult.descriptor;
// desc.key === 'b'
// desc.getSchema()               → NumberSchemaBuilder
// desc.getValue(result.object)   → { success: true, value: -2 }
// desc.setValue(result.object, 0) → fixes 'b' in-place
`,
        testData: '{ "a": 1, "b": -2, "c": -3 }'
    },
    {
        id: 'custom-extensions',
        title: 'Custom Extensions',
        description:
            'Define reusable extensions with <code>defineExtension()</code> and apply them with <code>withExtensions()</code>.',
        group: 'Extensions',
        code: `import { defineExtension, withExtensions } from '@cleverbrush/schema';

// Define a custom "hexColor" extension for strings
const colorExtension = defineExtension({
    string: {
        hexColor() {
            return this.addValidator((value) => {
                const valid = /^#[0-9a-fA-F]{6}$/.test(value);
                return {
                    valid,
                    errors: valid ? [] : [{ message: 'Must be a valid hex color (e.g. #ff00aa)' }]
                };
            });
        }
    }
});

// Apply it to get augmented factories
const { string: xstring, object: xobject, number: xnumber } = withExtensions(colorExtension);

const ThemeSchema = xobject({
    /** Primary brand color */
    primaryColor: xstring().hexColor(),
    /** Secondary brand color */
    secondaryColor: xstring().hexColor(),
    /** Theme display name */
    name: xstring().minLength(1)
});

const result = ThemeSchema.validate({
    primaryColor: "#ff00aa",
    secondaryColor: "#00ff00",
    name: "Ocean"
});
`,
        testData:
            '{ "primaryColor": "#ff00aa", "secondaryColor": "#00ff00", "name": "Ocean" }'
    },
    {
        id: 'enum',
        title: 'Enum / oneOf',
        description:
            'Use <code>enumOf()</code> or <code>.oneOf()</code> to constrain a string or number to a fixed set of literal values. The inferred type narrows automatically.',
        group: 'Extensions',
        code: `import { string, number, enumOf, InferType } from '@cleverbrush/schema';

// Top-level factory — mirrors Zod's z.enum()
const Role = enumOf('admin', 'user', 'guest');
type Role = InferType<typeof Role>; // 'admin' | 'user' | 'guest'

const r1 = Role.validate('admin');   // valid
const r2 = Role.validate('other');   // invalid

// Equivalent: string().oneOf()
const Status = string().oneOf('active', 'inactive', 'pending');
type Status = InferType<typeof Status>; // 'active' | 'inactive' | 'pending'

// Number enum
const Priority = number().oneOf(1, 2, 3);
type Priority = InferType<typeof Priority>; // 1 | 2 | 3

const p1 = Priority.validate(2);  // valid
const p2 = Priority.validate(4);  // invalid

// Chains with .nullable() and .optional()
const OptionalRole = enumOf('admin', 'user').nullable();
// Type: 'admin' | 'user' | null

const r3 = OptionalRole.validate('admin'); // valid
const r4 = OptionalRole.validate(null);    // valid

// Runtime access to allowed values
const meta = Role.introspect();
// meta.extensions.oneOf === ['admin', 'user', 'guest']
`,
        testData: '"admin"'
    },

    // ── Default Values ──────────────────────────────
    {
        id: 'default-static',
        title: 'Static Defaults',
        description:
            'Use <code>.default(value)</code> to provide a fallback when input is <code>undefined</code>. The default value is used during validation.',
        group: 'Default Values',
        code: `import { string } from '@cleverbrush/schema';

// When input is undefined, the static default value is used
const Name = string().default('Anonymous');

// Try changing the test data to {} to see the default kick in
const result = Name.validate(undefined as any);
// result.object === 'Anonymous'
`,
        testData: '"Alice"'
    },
    {
        id: 'default-factory',
        title: 'Factory Defaults',
        description:
            'Pass a function to <code>.default()</code> for mutable defaults like arrays or dates. A fresh value is created on every validation.',
        group: 'Default Values',
        code: `import { array, string } from '@cleverbrush/schema';

// Factory function creates a fresh array each time
const Tags = array(string()).default(() => ['general']);

// Validate with undefined — the factory produces the default
const result = Tags.validate(undefined as any);
// result.object is ['general']
`,
        testData: 'null'
    },
    {
        id: 'default-optional',
        title: 'Optional + Default',
        description:
            'Combine <code>.optional()</code> with <code>.default()</code> to accept <code>undefined</code> input while removing it from the output type.',
        group: 'Default Values',
        code: `import { number, InferType } from '@cleverbrush/schema';

// .optional() allows undefined, .default() fills it in
const Port = number().optional().default(3000);

// The inferred type is number — not number | undefined
type PortType = InferType<typeof Port>;

const result = Port.validate(undefined as any);
// result.object === 3000
`,
        testData: '8080'
    },
    {
        id: 'default-object',
        title: 'Object with Defaults',
        description:
            'Apply <code>.default()</code> to individual object properties to build configuration schemas with sensible fallbacks.',
        group: 'Default Values',
        code: `import { object, string, number, array, date, InferType } from '@cleverbrush/schema';

const Config = object({
    /** Server hostname */
    host: string().default('localhost'),
    /** Listening port */
    port: number().default(8080),
    /** Tags for categorisation */
    tags: array(string()).default(() => []),
    /** When the config was created */
    createdAt: date().default(() => new Date())
});

type ConfigType = InferType<typeof Config>;
// { host: string; port: number; tags: string[]; createdAt: Date }

// Missing fields are filled with their defaults
const result = Config.validate({});
`,
        testData: '{ "host": "0.0.0.0", "port": 3000 }'
    },
    {
        id: 'default-validation',
        title: 'Default Validation',
        description:
            'Default values are validated against the schema constraints. An invalid default produces a validation error.',
        group: 'Default Values',
        code: `import { number } from '@cleverbrush/schema';

// The default value -1 violates the .min(0) constraint
const Bad = number().min(0).default(-1);

// Validation fails because the default itself is invalid
const result = Bad.validate(undefined as any);
// result.valid === false
`,
        testData: 'null'
    },
    {
        id: 'describe-metadata',
        title: 'Schema Descriptions',
        description:
            'Use <code>.describe()</code> to attach human-readable descriptions to any schema. Descriptions are metadata-only — they have no effect on validation but are accessible via <code>.introspect()</code> and emitted as <code>description</code> fields by <code>toJsonSchema()</code>.',
        group: 'Metadata',
        code: `import { object, string, number, array, InferType } from '@cleverbrush/schema';
import { toJsonSchema } from '@cleverbrush/schema-json';

// Attach descriptions to individual fields and the top-level schema
const ProductSchema = object({
    id: string()
        .uuid()
        .describe('Unique product identifier (UUID v4)'),
    name: string()
        .nonempty()
        .describe('Display name shown to customers'),
    price: number()
        .positive()
        .describe('Price in USD, must be greater than 0'),
    tags: array(string())
        .describe('Searchable keywords for filtering')
}).describe('A product in the catalogue');

// Read descriptions back via .introspect()
const info = ProductSchema.introspect();
console.log(info.description);
// 'A product in the catalogue'

console.log(info.props.name.introspect().description);
// 'Display name shown to customers'

// Convert to JSON Schema — descriptions are emitted automatically
const jsonSchema = toJsonSchema(ProductSchema, { $schema: false });
console.log(JSON.stringify(jsonSchema, null, 2));
// {
//   "type": "object",
//   "description": "A product in the catalogue",
//   "properties": {
//     "name": { "type": "string", "description": "Display name ..." },
//     ...
//   }
// }

// .describe() chains with all other modifiers — order doesn't matter
const OptionalDescription = string()
    .optional()
    .describe('Optional note')
    .minLength(1);

// Validation is completely unaffected
const result = ProductSchema.validate({
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Widget',
    price: 9.99,
    tags: ['sale', 'featured']
});
`,
        testData:
            '{"id":"550e8400-e29b-41d4-a716-446655440000","name":"Widget","price":9.99,"tags":["sale","featured"]}'
    },
    {
        id: 'default-introspect',
        title: 'Introspecting Defaults',
        description:
            'Use <code>.introspect()</code> to inspect whether a schema has a default and what value it holds.',
        group: 'Default Values',
        code: `import { string } from '@cleverbrush/schema';

const schema = string().default('hello');

// Introspection reveals the default configuration
const info = schema.introspect();
// info.hasDefault === true
// info.defaultValue === 'hello'

const result = schema.validate(undefined as any);
`,
        testData: '"world"'
    },

    // ── Catch / Fallback ────────────────────────────────────────
    {
        id: 'catch-static',
        title: 'Static Catch Fallback',
        description:
            'Use <code>.catch(value)</code> to provide a fallback when validation fails for <em>any</em> reason — wrong type, constraint violation, or missing required value.',
        group: 'Catch / Fallback',
        code: `import { string, number } from '@cleverbrush/schema';

// Static fallback string
const Name = string().catch('unknown');
// Wrong type → fallback
// Name.validate(42)    → { valid: true, object: 'unknown' }
// null → fallback
// Name.validate(null)  → { valid: true, object: 'unknown' }
// Valid input passes through unchanged
// Name.validate('Alice') → { valid: true, object: 'Alice' }

// Constraint violation also triggers catch
const Age = number().min(0).catch(-1);
// Age.validate(-5)    → { valid: true, object: -1 }

const result = Name.validate(undefined as any);
`,
        testData: '"Alice"'
    },
    {
        id: 'catch-factory',
        title: 'Factory Function Fallback',
        description:
            'Pass a factory function to <code>.catch()</code> to produce a fresh fallback value on each failure — essential for mutable values like arrays and objects.',
        group: 'Catch / Fallback',
        code: `import { array, object, string } from '@cleverbrush/schema';

// Factory function — a NEW array is created on each failure
const Tags = array(string()).catch(() => []);

const r1 = Tags.validate(null as any);
const r2 = Tags.validate(null as any);
// r1.object ⇒ []
// r2.object ⇒ []
// r1.object !== r2.object  — separate instances each time

// Useful for objects too
const UserFallback = object({ name: string(), age: string() })
  .catch(() => ({ name: 'Guest', age: '0' }));

const result = Tags.validate(999 as any);
`,
        testData: '["tag1", "tag2"]'
    },
    {
        id: 'catch-vs-default',
        title: 'Catch vs Default',
        description:
            '<code>.default(value)</code> fires only when input is <code>undefined</code>. <code>.catch(value)</code> fires on <em>any</em> validation failure — including type mismatches and constraint violations.',
        group: 'Catch / Fallback',
        code: `import { string } from '@cleverbrush/schema';

// .default() — fires only on undefined
const withDefault = string().default('anon');
// withDefault.validate(undefined) → { valid: true, object: 'anon' }  ← fires
// withDefault.validate(42)        → { valid: false, errors: [...] }  ← does NOT fire

// .catch() — fires on any validation failure
const withCatch = string().catch('anon');
// withCatch.validate(undefined) → { valid: true, object: 'anon' }  ← fires
// withCatch.validate(42)        → { valid: true, object: 'anon' }  ← also fires

// Combining both:
// .default() handles missing values, .catch() handles any remaining failures
const schema = string().default('default-val').catch('catch-val');
// schema.validate(undefined) → { valid: true, object: 'default-val' }  (default fires first)
// schema.validate(42)        → { valid: true, object: 'catch-val' }   (catch fires)

const result = withCatch.validate(42 as any);
`,
        testData: '"Alice"'
    },
    {
        id: 'catch-validate',
        title: 'validate() Never Throws',
        description:
            'When <code>.catch()</code> is set, <code>.validate()</code> and <code>.validateAsync()</code> will never throw a <code>SchemaValidationError</code> — the fallback is returned instead.',
        group: 'Catch / Fallback',
        code: `import { string, object, number } from '@cleverbrush/schema';

const Name = string().catch('unknown');

// Without .catch(), validate() returns valid: false on invalid input
// string().validate(42)  ← { valid: false, errors: [...] }

// With .catch(), validate() always returns valid: true with the fallback
const result1 = Name.validate(42 as any);   // { valid: true, object: 'unknown' }
const result2 = Name.validate('Alice');      // { valid: true, object: 'Alice' }

// Works with complex schemas too
const User = object({ name: string(), age: number() })
  .catch({ name: 'Guest', age: 0 });

const result3 = User.validate('not an object' as any);
// { valid: true, object: { name: 'Guest', age: 0 } }

const result = Name.validate(123 as any);
`,
        testData: '"hello"'
    },
    {
        id: 'catch-introspect',
        title: 'Introspecting Catch',
        description:
            'Use <code>.introspect()</code> to inspect the catch configuration of a schema at runtime.',
        group: 'Catch / Fallback',
        code: `import { string, number } from '@cleverbrush/schema';

const schema = string().catch('unknown');

// Inspect the catch configuration
const info = schema.introspect();
// info.hasCatch   → true
// info.catchValue → 'unknown'

const noFallback = number();
// noFallback.introspect().hasCatch → false

// Catch state survives fluent chaining
const chained = string().minLength(5).catch('short').optional();
// chained.introspect().hasCatch   → true
// chained.introspect().catchValue → 'short'

const result = schema.validate(42 as any);
`,
        testData: '"hello"'
    },

    // ── Function Schemas ────────────────────────────
    {
        id: 'function-schema',
        title: 'Function Schemas',
        description:
            'Use <code>func()</code> to validate that a value is a JavaScript function. Like every other builder, it supports <code>.optional()</code>, <code>.nullable()</code>, <code>.default()</code>, and custom validators.',
        group: 'Function Schemas',
        code: `import { func } from '@cleverbrush/schema';

// Basic — validates that the value is a function
const anyFn = func();

const result1 = anyFn.validate(() => 42);
// { valid: true, object: [Function] }

const result2 = anyFn.validate('not a function' as any);
// { valid: false, errors: [{ message: 'expected type function, but saw string' }] }

// Optional — undefined is also accepted
const optionalFn = func().optional();
const result3 = optionalFn.validate(undefined as any);
// { valid: true, object: undefined }

// Default value
const withDefault = func().default(() => () => 0);
const result4 = withDefault.validate(undefined as any);
// { valid: true, object: [Function] }

const result = anyFn.validate(() => 'hello');
`,
        testData: 'null'
    },
    {
        id: 'function-typed-params',
        title: 'Typed Parameters & Return Type',
        description:
            'Use <code>.addParameter(schema)</code> to describe each positional argument and <code>.hasReturnType(schema)</code> to describe the return value. TypeScript infers the full function signature \u2014 no separate type annotation required.',
        group: 'Function Schemas',
        code: `import { func, string, number, boolean, InferType } from '@cleverbrush/schema';

// Build up a typed signature one parameter at a time
const greet = func()
    .addParameter(string())            // first arg:  string
    .addParameter(number().optional()) // second arg: number | undefined
    .hasReturnType(string());          // return type: string

// TypeScript infers the full signature automatically
type Greet = InferType<typeof greet>;
// → (param0: string, param1: number | undefined) => string

// func() still only validates that the value IS a function at runtime
const result1 = greet.validate((name: string) => \`Hello, \${name}!\`);
// { valid: true }

const result2 = greet.validate('not a fn' as any);
// { valid: false }

// Introspect the schema at runtime
const info = greet.introspect();
// info.parameters.length  → 2
// info.returnType         → StringSchemaBuilder

const result = greet.validate((name: string) => \`Hi \${name}\`);
`,
        testData: 'null'
    },
    {
        id: 'function-in-object',
        title: 'Functions Inside Object Schemas',
        description:
            'Compose <code>func()</code> schemas inside <code>object()</code> to model callback props, event handlers, or service interfaces with fully typed signatures.',
        group: 'Function Schemas',
        code: `import { func, object, string, number, boolean, InferType } from '@cleverbrush/schema';

// Model a component prop interface with typed callbacks
const ButtonProps = object({
    label: string().nonempty('Label is required'),
    disabled: boolean().optional(),
    onClick: func()
        .hasReturnType(boolean())
        .optional(),
    onChange: func()
        .addParameter(string())
        .hasReturnType(boolean())
        .optional(),
});

type Props = InferType<typeof ButtonProps>;
// {
//   label: string;
//   disabled?: boolean;
//   onClick?: () => boolean;
//   onChange?: (param0: string) => boolean;
// }

// Validate a conforming props object
const result = ButtonProps.validate({
    label: 'Submit',
    onClick: () => true,
    onChange: (value: string) => value.length > 0,
});
// { valid: true }
`,
        testData: '{ "label": "Submit", "disabled": false }'
    },

    // ── Promise Schemas ─────────────────────────────
    {
        id: 'promise-schema',
        title: 'Promise Schemas',
        description:
            'Use <code>promise()</code> to validate that a value is a JavaScript <code>Promise</code>. Like every other builder, it supports <code>.optional()</code>, <code>.nullable()</code>, <code>.default()</code>, and custom validators.',
        group: 'Promise Schemas',
        code: `import { promise } from '@cleverbrush/schema';

// Basic — validates that the value is a Promise
const anyPromise = promise();

const result1 = anyPromise.validate(Promise.resolve(42));
// { valid: true, object: Promise }

const result2 = anyPromise.validate('not a promise' as any);
// { valid: false, errors: [{ message: 'expected a Promise, but saw string' }] }

// Optional — undefined is also accepted
const optionalPromise = promise().optional();
const result3 = optionalPromise.validate(undefined as any);
// { valid: true, object: undefined }

// Default value
const withDefault = promise().default(() => Promise.resolve(0));
const result4 = withDefault.validate(undefined as any);
// { valid: true, object: Promise }

const result = anyPromise.validate(Promise.resolve('hello'));
`,
        testData: 'null'
    },
    {
        id: 'promise-typed',
        title: 'Typed Promise Resolved Value',
        description:
            'Pass a schema to <code>promise(schema)</code> or call <code>.hasResolvedType(schema)</code> to annotate the type of the resolved value. TypeScript infers <code>Promise&lt;T&gt;</code> automatically \u2014 no separate type annotation required.',
        group: 'Promise Schemas',
        code: `import { promise, string, number, object, InferType } from '@cleverbrush/schema';

// Typed resolved value via factory argument
const stringPromise = promise(string());
type StringPromise = InferType<typeof stringPromise>;
// → Promise<string>

// Typed resolved value via fluent method
const numPromise = promise().hasResolvedType(number());
type NumPromise = InferType<typeof numPromise>;
// → Promise<number>

// Introspect at runtime
const info = numPromise.introspect();
// info.resolvedType → NumberSchemaBuilder

// Promise of an object
const userFetch = promise(
    object({ id: number(), name: string() })
);
type UserFetch = InferType<typeof userFetch>;
// → Promise<{ id: number; name: string }>

// Optional typed promise
const optStringPromise = promise(string()).optional();
type OptStringPromise = InferType<typeof optStringPromise>;
// → Promise<string> | undefined

const result = numPromise.validate(Promise.resolve(42));
`,
        testData: 'null'
    },

    // ── External Schema Interop ─────────────────────
    {
        id: 'extern-basic',
        title: 'Wrapping Zod with extern()',
        description:
            'Use <code>extern()</code> to wrap a Zod schema (or any <a href="https://standardschema.dev/" target="_blank">Standard Schema v1</a> library) into a <code>@cleverbrush/schema</code> builder. Mix and match schemas from different libraries — types and <code>getErrorsFor()</code> work across the boundary.',
        group: 'External Schema Interop',
        code: `import { z } from 'zod';
import { object, number, extern } from '@cleverbrush/schema';

// Existing Zod schema — keep as-is, no need to rewrite
const ZodAddress = z.object({
  street: z.string().min(1, 'Street is required'),
  city:   z.string().min(1, 'City is required'),
  zip:    z.string().length(5, 'ZIP must be 5 characters'),
});

// Compose into a @cleverbrush/schema object
const OrderSchema = object({
  /** Shipping address (validated by Zod) */
  address:    extern(ZodAddress),
  /** Total amount in cents */
  totalCents: number().min(1, 'Total must be positive'),
});

// Validate — Zod handles address, @cleverbrush handles totalCents
const result = OrderSchema.validate(
  {
    address: { street: '', city: '', zip: '1' },
    totalCents: 0,
  },
  { doNotStopOnFirstError: true }
);
`,
        testData:
            '{ "address": { "street": "5th Ave", "city": "NYC", "zip": "10001" }, "totalCents": 4999 }'
    }
];

export function getExampleById(id: string): Example | undefined {
    return examples.find(e => e.id === id);
}

export const DEFAULT_EXAMPLE_ID = 'quick-start';

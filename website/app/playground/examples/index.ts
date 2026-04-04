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
            'custom-error-messages'
        ]
    },
    {
        label: 'Objects & Composition',
        ids: [
            'object-schemas',
            'nested-objects',
            'composing-schemas',
            'immutability',
            'recursive-schemas'
        ]
    },
    {
        label: 'Arrays & Unions',
        ids: ['arrays', 'union-types', 'discriminated-unions']
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
    { label: 'Extensions', ids: ['builtin-extensions', 'custom-extensions'] },
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
    }
];

export function getExampleById(id: string): Example | undefined {
    return examples.find(e => e.id === id);
}

export const DEFAULT_EXAMPLE_ID = 'quick-start';

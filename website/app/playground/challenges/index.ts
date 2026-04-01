export interface Challenge {
    id: string;
    title: string;
    description: string;
    concept: string;
    startingCode: string;
    testData: string;
    hints: string[];
    solution: string;
    activePanel: 'validation' | 'type' | 'introspection';
    explanation: string;
    validate: (result: {
        validationResult?: { valid: boolean; errors?: { path: string; message: string }[] };
        introspection?: Record<string, unknown>;
        error?: string;
    }) => { passed: boolean; feedback: string };
}

export const CHALLENGE_GROUPS = [
    { label: 'Basics', ids: ['hello-schema', 'adding-constraints', 'required-fields', 'number-schemas', 'object-schemas'] },
    { label: 'Intermediate', ids: ['nested-objects', 'arrays', 'union-types', 'validation-errors', 'custom-validators'] },
    { label: 'Advanced', ids: ['builtin-extensions', 'property-descriptors', 'discriminated-unions', 'branded-types', 'custom-extensions'] }
];

export const challenges: Challenge[] = [
    // ── Basics ──────────────────────────────────────
    {
        id: 'hello-schema',
        title: 'Hello Schema',
        description: 'Create your first schema! Define a <code>string()</code> schema and validate a value against it.',
        concept: 'Schema factory functions & .validate()',
        startingCode: `import { string } from '@cleverbrush/schema';

// 1. Create a string schema
const mySchema = string();

// 2. Validate a value — the result will appear in the panel →
const result = mySchema.validate("hello world");
`,
        testData: '"hello world"',
        hints: [
            'Call string() to create a string schema builder.',
            'Use .validate(value) to check a value against the schema.',
            'The result object has { valid, object, errors }.'
        ],
        solution: `import { string } from '@cleverbrush/schema';

const mySchema = string();
const result = mySchema.validate("hello world");
`,
        activePanel: 'validation',
        explanation: 'Every schema starts with a factory function like <code>string()</code>, <code>number()</code>, or <code>object()</code>. The <code>.validate()</code> method synchronously checks a value and returns <code>{ valid, object, errors }</code>.',
        validate: ({ validationResult }) => {
            if (validationResult?.valid) return { passed: true, feedback: 'Your first schema validates successfully!' };
            return { passed: false, feedback: 'The validation result should be valid. Make sure you\'re validating a string value.' };
        }
    },
    {
        id: 'adding-constraints',
        title: 'Adding Constraints',
        description: 'Add <code>.minLength()</code> and <code>.maxLength()</code> constraints so the schema rejects strings that are too short or too long.',
        concept: 'Fluent builder chaining',
        startingCode: `import { string } from '@cleverbrush/schema';

// Make this schema require strings between 3 and 50 characters
const username = string();

// This should fail — "ab" is too short
const result = username.validate("ab");
`,
        testData: '"ab"',
        hints: [
            'Chain .minLength(3) after string().',
            'Then chain .maxLength(50) — builders are immutable, each call returns a new builder.',
            'With the constraints, validating "ab" should return { valid: false }.'
        ],
        solution: `import { string } from '@cleverbrush/schema';

const username = string().minLength(3).maxLength(50);
const result = username.validate("ab");
`,
        activePanel: 'validation',
        explanation: 'Schema builders are <strong>immutable</strong> — each method like <code>.minLength(3)</code> returns a new builder. You can safely chain them in a fluent style. The original builder is never modified.',
        validate: ({ validationResult }) => {
            if (validationResult && !validationResult.valid && validationResult.errors?.length) {
                return { passed: true, feedback: 'The schema correctly rejects "ab" as too short!' };
            }
            return { passed: false, feedback: 'The validation should fail for "ab". Add .minLength(3) to the schema.' };
        }
    },
    {
        id: 'required-fields',
        title: 'Optional Fields',
        description: 'By default schemas are <strong>required</strong> (reject <code>undefined</code>). Make a schema optional and see what happens when you validate <code>undefined</code>.',
        concept: '.optional() vs required',
        startingCode: `import { string } from '@cleverbrush/schema';

// Make this optional so undefined is accepted
const name = string();

const result = name.validate(undefined);
`,
        testData: 'undefined',
        hints: [
            'Chain .optional() on the schema.',
            'You can pass a custom message: .optional("Name is optional").',
            'By default, undefined fails validation — .optional() allows it.'
        ],
        solution: `import { string } from '@cleverbrush/schema';

const name = string().optional();
const result = name.validate(undefined);
`,
        activePanel: 'validation',
        explanation: 'All schemas are <strong>required by default</strong> — <code>undefined</code> fails validation. Calling <code>.optional()</code> changes the schema so <code>undefined</code> is allowed. You can pass a custom message as an argument.',
        validate: ({ validationResult }) => {
            if (validationResult && validationResult.valid) {
                return { passed: true, feedback: 'The schema correctly accepts undefined as optional!' };
            }
            return { passed: false, feedback: 'Add .optional() so undefined is accepted.' };
        }
    },
    {
        id: 'number-schemas',
        title: 'Number Schemas',
        description: 'Create a number schema with <code>.min()</code>, <code>.max()</code>, and <code>.isInteger()</code> constraints.',
        concept: 'Number builders & numeric constraints',
        startingCode: `import { number } from '@cleverbrush/schema';

// Create a schema for age: integer, 0-120
const age = number();

const result = age.validate(25);
`,
        testData: '25',
        hints: [
            'Chain .min(0) to set a minimum value.',
            'Chain .max(120) to set a maximum.',
            '.isInteger() ensures no decimals are accepted.'
        ],
        solution: `import { number } from '@cleverbrush/schema';

const age = number().min(0).max(120).isInteger();
const result = age.validate(25);
`,
        activePanel: 'validation',
        explanation: '<code>number()</code> creates a number schema builder. Like string, it supports fluent chaining. <code>.min()</code>, <code>.max()</code>, and <code>.isInteger()</code> are built-in validators.',
        validate: ({ validationResult }) => {
            if (validationResult?.valid) {
                return { passed: true, feedback: 'Your number schema validates 25 correctly!' };
            }
            return { passed: false, feedback: 'Make sure .validate(25) passes. 25 is a valid integer between 0 and 120.' };
        }
    },
    {
        id: 'object-schemas',
        title: 'Object Schemas',
        description: 'Compose schemas into an <code>object()</code> to validate structured data. This is where schemas get powerful.',
        concept: 'Object composition & InferType',
        startingCode: `import { object, string, number } from '@cleverbrush/schema';

// Build a User schema with name (required string) and age (number)
const User = object({

});

const result = User.validate({ name: "Alice", age: 30 });
`,
        testData: '{ "name": "Alice", "age": 30 }',
        hints: [
            'Pass an object of schemas: object({ name: string().required(), age: number() }).',
            'Each key maps to a schema that validates that property.',
            'Check the Type panel to see the inferred TypeScript type!'
        ],
        solution: `import { object, string, number } from '@cleverbrush/schema';

const User = object({
    name: string().required(),
    age: number()
});

const result = User.validate({ name: "Alice", age: 30 });
`,
        activePanel: 'type',
        explanation: '<code>object()</code> takes a record of schemas and validates each property. The magic:  <code>InferType&lt;typeof User&gt;</code> automatically derives the TypeScript type — required fields become non-optional, optional fields get <code>| undefined</code>. Check the Type panel!',
        validate: ({ validationResult }) => {
            if (validationResult?.valid) {
                return { passed: true, feedback: 'Your User schema works! Check the Type panel to see the inferred type.' };
            }
            return { passed: false, feedback: 'Add name and age properties to the object schema. Name should be required.' };
        }
    },

    // ── Intermediate ────────────────────────────────
    {
        id: 'nested-objects',
        title: 'Nested Objects',
        description: 'Nest objects inside objects to model real-world data like an address.',
        concept: 'Deep nesting & error paths',
        startingCode: `import { object, string, number } from '@cleverbrush/schema';

// Create a schema with a nested address object
const Contact = object({
    name: string().required(),
    // Add: address: object({ city, zip })
});

const result = Contact.validate({
    name: "Bob",
    address: { city: "", zip: "12345" }
});
`,
        testData: '{ "name": "Bob", "address": { "city": "", "zip": "12345" } }',
        hints: [
            'Add address: object({ city: string().required(), zip: string().required() }).',
            'Nested errors use dot-path notation like "$.address.city".',
            'Look at the error paths in the Validation panel.'
        ],
        solution: `import { object, string } from '@cleverbrush/schema';

const Contact = object({
    name: string().required(),
    address: object({
        city: string().required().minLength(1),
        zip: string().required()
    })
});

const result = Contact.validate({
    name: "Bob",
    address: { city: "", zip: "12345" }
});
`,
        activePanel: 'validation',
        explanation: 'Object schemas nest naturally. Error paths use <code>$.</code> notation — <code>"$.address.city"</code> pinpoints exactly which nested field failed. This makes it easy to display per-field errors in UIs.',
        validate: ({ validationResult }) => {
            if (validationResult && !validationResult.valid) {
                const hasNestedError = validationResult.errors?.some(e => e.path?.includes('address'));
                if (hasNestedError) return { passed: true, feedback: 'You have nested validation working with proper error paths!' };
            }
            if (validationResult?.valid) return { passed: false, feedback: 'The empty city should cause a validation error. Add .required() or .minLength(1) to city.' };
            return { passed: false, feedback: 'Add an address property with nested city and zip schemas.' };
        }
    },
    {
        id: 'arrays',
        title: 'Arrays',
        description: 'Validate arrays of items using <code>array()</code> with an element schema.',
        concept: 'Array schemas & element validation',
        startingCode: `import { array, string } from '@cleverbrush/schema';

// Create a schema for a list of tags (non-empty strings)
const tags = array();

const result = tags.validate(["typescript", "schema", ""]);
`,
        testData: '["typescript", "schema", ""]',
        hints: [
            'Pass an element schema: array(string().required().minLength(1)).',
            'Array validates each element against the inner schema.',
            'The empty string "" should cause a validation error.'
        ],
        solution: `import { array, string } from '@cleverbrush/schema';

const tags = array(string().required().minLength(1));

const result = tags.validate(["typescript", "schema", ""]);
`,
        activePanel: 'validation',
        explanation: '<code>array(elementSchema)</code> validates that the value is an array, then validates each element against the inner schema. Errors include the array index in the path.',
        validate: ({ validationResult }) => {
            if (validationResult && !validationResult.valid) {
                return { passed: true, feedback: 'The empty string element is correctly caught!' };
            }
            return { passed: false, feedback: 'Pass an element schema to array() so the empty string is rejected.' };
        }
    },
    {
        id: 'union-types',
        title: 'Union Types',
        description: 'Use <code>union()</code> to accept multiple types — a value that can be either a string or a number.',
        concept: 'Union schemas & type-level OR',
        startingCode: `import { union, string, number } from '@cleverbrush/schema';

// Create a schema that accepts string OR number
const flexible = string(); // Change this!

const r1 = flexible.validate("hello");
const r2 = flexible.validate(42);
`,
        testData: '42',
        hints: [
            'Use union(schema1).or(schema2) to combine schemas.',
            'union(string()).or(number()) accepts either type.',
            'Both "hello" and 42 should pass validation.'
        ],
        solution: `import { union, string, number } from '@cleverbrush/schema';

const flexible = union(string()).or(number());

const r1 = flexible.validate("hello");
const r2 = flexible.validate(42);
`,
        activePanel: 'type',
        explanation: '<code>union(schema).or(otherSchema)</code> creates a union type. At the type level, <code>InferType</code> correctly infers <code>string | number</code>. You can chain multiple <code>.or()</code> calls.',
        validate: ({ validationResult }) => {
            if (validationResult?.valid) {
                return { passed: true, feedback: 'The union schema accepts both types!' };
            }
            return { passed: false, feedback: 'Use union(string()).or(number()) to accept both strings and numbers.' };
        }
    },
    {
        id: 'validation-errors',
        title: 'Validation Errors',
        description: 'Submit an object with multiple invalid fields and explore the error structure.',
        concept: 'Error introspection & paths',
        startingCode: `import { object, string, number } from '@cleverbrush/schema';

const UserSchema = object({
    name: string().required("Name is required").minLength(2),
    email: string().required("Email is required"),
    age: number().required("Age is required").min(18)
});

// This object has multiple problems — check the errors!
const result = UserSchema.validate({
    name: "A",      // too short
    email: undefined, // missing
    age: 10          // too young
});
`,
        testData: '{ "name": "A", "email": null, "age": 10 }',
        hints: [
            'Look at the Validation panel — each error has a path and message.',
            'Paths use $ notation: $.name, $.email, $.age.',
            'Custom messages appear in the error output.'
        ],
        solution: `import { object, string, number } from '@cleverbrush/schema';

const UserSchema = object({
    name: string().required("Name is required").minLength(2),
    email: string().required("Email is required"),
    age: number().required("Age is required").min(18)
});

const result = UserSchema.validate({
    name: "A",
    email: undefined,
    age: 10
});
`,
        activePanel: 'validation',
        explanation: 'Each error includes a <code>path</code> (like <code>"$.email"</code>) and a <code>message</code>. Custom messages from <code>.required("...")</code> appear directly. This structure makes it easy to map errors to form fields.',
        validate: ({ validationResult }) => {
            if (validationResult && !validationResult.valid && (validationResult.errors?.length ?? 0) >= 2) {
                return { passed: true, feedback: 'Multiple validation errors detected — check the paths!' };
            }
            return { passed: false, feedback: 'The object should have multiple validation errors. Make sure the test data has invalid fields.' };
        }
    },
    {
        id: 'custom-validators',
        title: 'Custom Validators',
        description: 'Add a custom validator function with <code>.addValidator()</code> for logic beyond built-in constraints.',
        concept: 'Custom validation functions',
        startingCode: `import { string } from '@cleverbrush/schema';

// Add a custom validator that checks if the value
// contains the word "schema" (case-insensitive)
const mustMentionSchema = string().required();

const result = mustMentionSchema.validate("I love TypeScript");
`,
        testData: '"I love TypeScript"',
        hints: [
            'Use .addValidator(fn) where fn receives the value.',
            'Return { valid: false, errors: [{ message: "..." }] } to fail, or { valid: true } to pass.',
            'value.toLowerCase().includes("schema") checks for the word.'
        ],
        solution: `import { string } from '@cleverbrush/schema';

const mustMentionSchema = string()
    .required()
    .addValidator((value) => {
        const valid = value.toLowerCase().includes("schema");
        return {
            valid,
            errors: valid ? [] : [{ message: 'Must mention "schema"' }]
        };
    });

const result = mustMentionSchema.validate("I love TypeScript");
`,
        activePanel: 'validation',
        explanation: '<code>.addValidator(fn)</code> accepts a function that receives the value and must return <code>{ valid: boolean, errors?: [{ message: string }] }</code>. Return <code>{ valid: false, errors: [...] }</code> to fail or <code>{ valid: true }</code> to pass. This is how you add any custom validation logic.',
        validate: ({ validationResult }) => {
            if (validationResult && !validationResult.valid) {
                return { passed: true, feedback: 'Custom validator correctly rejects the value!' };
            }
            return { passed: false, feedback: 'Add a .addValidator() that rejects strings not containing "schema".' };
        }
    },

    // ── Advanced ────────────────────────────────────
    {
        id: 'builtin-extensions',
        title: 'Built-in Extensions',
        description: 'Use pre-built extension methods like <code>.email()</code>, <code>.url()</code>, <code>.positive()</code>, and <code>.nonempty()</code>.',
        concept: 'Extension pack — zero-config validators',
        startingCode: `import { string, number, array } from '@cleverbrush/schema';

// Use built-in extensions:
//   string: .email(), .url(), .uuid(), .ip(), .trim(), .toLowerCase(), .nonempty()
//   number: .positive(), .negative(), .finite(), .multipleOf()
//   array:  .nonempty(), .unique()

const email = string();    // Make this validate emails
const price = number();    // Make this positive
const items = array();     // Make this non-empty

const r1 = email.validate("not-an-email");
const r2 = price.validate(-5);
`,
        testData: '"not-an-email"',
        hints: [
            'Chain .email() on the string schema.',
            'Chain .positive() on the number schema.',
            'Chain .nonempty() on the array schema.',
            'These are NOT custom validators — they come from the built-in extension pack.'
        ],
        solution: `import { string, number, array } from '@cleverbrush/schema';

const email = string().email();
const price = number().positive();
const items = array().nonempty();

const r1 = email.validate("not-an-email");
const r2 = price.validate(-5);
`,
        activePanel: 'introspection',
        explanation: 'The default <code>@cleverbrush/schema</code> import includes a built-in extension pack. These methods (<code>.email()</code>, <code>.positive()</code>, etc.) add validators AND record metadata in the extension system — check the Introspection panel to see it!',
        validate: ({ validationResult }) => {
            if (validationResult && !validationResult.valid) {
                return { passed: true, feedback: 'Extensions are working! Check the Introspection panel to see extension metadata.' };
            }
            return { passed: false, feedback: 'Add .email() to the string schema so "not-an-email" is rejected.' };
        }
    },
    {
        id: 'property-descriptors',
        title: 'PropertyDescriptors',
        description: 'Inspect a schema\'s internal structure using <code>.introspect()</code> — the feature that makes this library unique.',
        concept: 'Schema introspection — the library\'s moat',
        startingCode: `import { object, string, number } from '@cleverbrush/schema';

// Build a schema and inspect it
const Product = object({
    name: string().required().minLength(1).maxLength(200),
    price: number().required().positive(),
    sku: string().required().matches(/^[A-Z]{3}-\\d{4}$/)
});

// Call .introspect() to see the schema's metadata
const descriptor = Product.introspect();
`,
        testData: '{ "name": "Widget", "price": 29.99, "sku": "ABC-1234" }',
        hints: [
            '.introspect() returns the schema\'s full metadata tree.',
            'For objects, the descriptor includes a "properties" map.',
            'Each property has type, validators, required status, extensions, etc.',
            'This is what powers @cleverbrush/mapper and @cleverbrush/react-form!'
        ],
        solution: `import { object, string, number } from '@cleverbrush/schema';

const Product = object({
    name: string().required().minLength(1).maxLength(200),
    price: number().required().positive(),
    sku: string().required().matches(/^[A-Z]{3}-\\d{4}$/)
});

const descriptor = Product.introspect();
`,
        activePanel: 'introspection',
        explanation: '<code>.introspect()</code> returns a full metadata tree describing every aspect of the schema. Unlike zod (opaque), <strong>@cleverbrush schemas are transparent</strong>. This introspection powers the entire ecosystem: mapper reads descriptors to auto-map fields, react-form reads them to render forms. This is architecturally impossible with zod.',
        validate: ({ introspection }) => {
            if (introspection && typeof introspection === 'object' && 'type' in introspection) {
                return { passed: true, feedback: 'You can see the full schema structure! This is what makes @cleverbrush/schema unique.' };
            }
            return { passed: false, feedback: 'Make sure you have a schema defined. Call .introspect() on it.' };
        }
    },
    {
        id: 'discriminated-unions',
        title: 'Discriminated Unions',
        description: 'Model tagged unions using <code>union()</code> with a <code>type</code> discriminator field — a common real-world pattern.',
        concept: 'Discriminated unions with literal strings',
        startingCode: `import { union, object, string, number } from '@cleverbrush/schema';

// Create a discriminated union:
// - { type: "email", address: string }
// - { type: "sms", phone: string }

const Notification = union(
    object({
        // First variant: email notification
    })
).or(
    object({
        // Second variant: SMS notification
    })
);

const result = Notification.validate({
    type: "email",
    address: "user@example.com"
});
`,
        testData: '{ "type": "email", "address": "user@example.com" }',
        hints: [
            'Use string("email") to create a literal string type for the discriminator.',
            'Each object variant should have type: string("email") or type: string("sms").',
            'The union tries each variant until one passes.',
        ],
        solution: `import { union, object, string } from '@cleverbrush/schema';

const Notification = union(
    object({
        type: string("email").required(),
        address: string().required().email()
    })
).or(
    object({
        type: string("sms").required(),
        phone: string().required()
    })
);

const result = Notification.validate({
    type: "email",
    address: "user@example.com"
});
`,
        activePanel: 'type',
        explanation: '<code>string("email")</code> creates a <strong>literal string type</strong>. Combined with <code>union().or()</code>, this gives you fully type-safe discriminated unions. TypeScript narrows the type when you check the <code>type</code> field. No special <code>.discriminator()</code> API needed!',
        validate: ({ validationResult }) => {
            if (validationResult?.valid) {
                return { passed: true, feedback: 'Discriminated union works! Check the Type panel for the union type.' };
            }
            return { passed: false, feedback: 'Each variant needs a type field with a literal string, e.g. string("email").' };
        }
    },
    {
        id: 'branded-types',
        title: 'Branded Types',
        description: 'Use <code>.brand()</code> to prevent mixing semantically different values at the type level.',
        concept: 'Phantom types for type safety',
        startingCode: `import { string } from '@cleverbrush/schema';

// Create two branded string schemas that are
// structurally identical but type-incompatible
const Email = string().email().brand("Email");
const Username = string().minLength(3).brand("Username");

// Both are strings, but TypeScript treats them as different types!
const emailResult = Email.validate("user@example.com");
const usernameResult = Username.validate("alice");
`,
        testData: '"user@example.com"',
        hints: [
            '.brand("Name") adds a phantom type brand — zero runtime cost.',
            'Check the Type panel to see the branded types.',
            'A branded Email cannot be assigned to a Username variable.',
        ],
        solution: `import { string } from '@cleverbrush/schema';

const Email = string().email().brand("Email");
const Username = string().minLength(3).brand("Username");

const emailResult = Email.validate("user@example.com");
const usernameResult = Username.validate("alice");
`,
        activePanel: 'type',
        explanation: '<code>.brand("Name")</code> adds a phantom type tag with zero runtime cost. The inferred type becomes <code>string & { readonly [BRAND]: "Email" }</code>. This prevents accidentally passing an email where a username is expected — TypeScript catches it at compile time.',
        validate: ({ validationResult }) => {
            if (validationResult?.valid) {
                return { passed: true, feedback: 'Branded validation works! Check the Type panel to see the branded types.' };
            }
            return { passed: false, feedback: 'Make sure the email value is valid.' };
        }
    },
    {
        id: 'custom-extensions',
        title: 'Custom Extensions',
        description: 'Define your own reusable extension using <code>defineExtension()</code> and <code>withExtensions()</code> — the ultimate power feature.',
        concept: 'The extension system — build & share validators',
        startingCode: `import {
    string,
    defineExtension, withExtensions
} from '@cleverbrush/schema';

// Define a custom "hexColor" extension for strings.
// Extension methods receive 'this' (the builder) and must return a builder.
const colorExtension = defineExtension({
    // Your extension here!
});

// Apply it to get augmented factories
// const { string: xstring } = withExtensions(colorExtension);
// const color = xstring().hexColor();
`,
        testData: '"#ff00aa"',
        hints: [
            'defineExtension() takes an object with string/number/array/object keys.',
            'Each key maps to an object of methods. Methods receive "this" (the builder) and return a builder.',
            'Inside a method, call this.addValidator(...) to add validation logic.',
            'Validators must return { valid: boolean, errors?: [{ message: string }] }.',
            'Use withExtensions(ext) to get new factory functions with the extension applied.'
        ],
        solution: `import {
    string, defineExtension, withExtensions
} from '@cleverbrush/schema';

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

const { string: xstring } = withExtensions(colorExtension);
const color = xstring().hexColor();
const result = color.validate("#ff00aa");
`,
        activePanel: 'introspection',
        explanation: '<code>defineExtension()</code> + <code>withExtensions()</code> is the library\'s <strong>power feature</strong>. Extension methods are regular functions with <code>this</code> bound to the builder — call <code>this.addValidator()</code> or other builder methods and return the result for fluent chaining. Extensions add methods to schema builders, and their metadata is automatically captured in PropertyDescriptors. You can publish extensions as npm packages.',
        validate: ({ validationResult }) => {
            if (validationResult?.valid) {
                return { passed: true, feedback: 'Your custom extension works! You\'ve completed the advanced tour.' };
            }
            return { passed: false, feedback: 'Define an extension with defineExtension() and apply it with withExtensions().' };
        }
    }
];

export function getChallengeById(id: string): Challenge | undefined {
    return challenges.find(c => c.id === id);
}

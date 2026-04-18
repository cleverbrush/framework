import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function GenericSchemasSection() {
    return (
        <div className="card">
            <h2>Generic Schemas</h2>
            <a href="/playground/generic-basic" className="playground-link">
                ▶ Open in Playground
            </a>
            <p>
                Use <code>generic(fn)</code> to create reusable, parameterized
                schema templates. The template function accepts one or more
                schema builders as arguments and returns a concrete schema. Call{' '}
                <code>.apply(...schemas)</code> to instantiate the template with
                specific schemas — TypeScript infers the resulting type
                automatically from the function&apos;s own generic signature.
            </p>
            <p>
                <strong>Single type parameter</strong> — a paginated list that
                works for any element type:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import {
    generic, object, array, number, string,
    type SchemaBuilder, type InferType
} from '@cleverbrush/schema';

const PaginatedList = generic(
    <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
        object({
            items: array(itemSchema),
            total: number(),
            page:  number(),
        })
);

// Instantiate with a concrete schema — TypeScript infers the full type
const PaginatedUsers = PaginatedList.apply(
    object({ name: string(), age: number() })
);

type PaginatedUsersType = InferType<typeof PaginatedUsers>;
// → { items: { name: string; age: number }[]; total: number; page: number }

PaginatedUsers.validate({
    items: [{ name: 'Alice', age: 30 }],
    total: 1,
    page:  1
});
// { valid: true, object: { items: [...], total: 1, page: 1 } }`)
                    }}
                />
            </pre>
            <p>
                <strong>Multiple type parameters</strong> — a Result / Either
                type with independent value and error schemas:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import {
    generic, object, boolean, string, number,
    type SchemaBuilder, type InferType
} from '@cleverbrush/schema';

const Result = generic(
    <
        T extends SchemaBuilder<any, any, any, any, any>,
        E extends SchemaBuilder<any, any, any, any, any>
    >(
        valueSchema: T,
        errorSchema: E
    ) =>
        object({
            ok:    boolean(),
            value: valueSchema.optional(),
            error: errorSchema.optional(),
        })
);

const StringResult = Result.apply(string(), number());

type StringResultType = InferType<typeof StringResult>;
// → { ok: boolean; value?: string; error?: number }

StringResult.validate({ ok: true,  value: 'hello' }); // valid
StringResult.validate({ ok: false, error: 404 });      // valid`)
                    }}
                />
            </pre>
            <p>
                <strong>Default arguments</strong> — supply a{' '}
                <code>defaults</code> array as the first argument so the
                template can be validated directly without calling{' '}
                <code>.apply()</code> first:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import {
    generic, object, array, number, any,
    type SchemaBuilder
} from '@cleverbrush/schema';

// 'any()' is the default for the single type parameter
const AnyList = generic(
    [any()],
    <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
        object({ items: array(itemSchema), total: number() })
);

// Validate directly — uses the 'any()' default
AnyList.validate({ items: [1, 'two', true], total: 3 }); // valid

// Or apply concrete schemas first for a stricter type
AnyList.apply(string()).validate({ items: ['a', 'b'], total: 2 }); // valid`)
                    }}
                />
            </pre>
            <blockquote>
                <strong>Tip:</strong> Each call to <code>.apply()</code> returns
                an independent schema builder. You can call{' '}
                <code>.optional()</code>, <code>.addValidator()</code>,{' '}
                <code>.default(value)</code>, and every other fluent method on
                the result just like you would on any other schema.
            </blockquote>
        </div>
    );
}

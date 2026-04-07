import { highlightTS } from '@/lib/highlight';

export default function DefaultValuesSection() {
    return (
        <>
            <div className="card">
                <h2>Default Values</h2>
                <a
                    href="/playground/default-values"
                    className="playground-link"
                >
                    ▶ Open in Playground
                </a>
                <p>
                    Every schema builder supports <code>.default(value)</code>.
                    When the input is <code>undefined</code>, the default value
                    is used instead — and the result is still validated against
                    the schema&apos;s constraints.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { string, number, array, date, object, type InferType } from '@cleverbrush/schema';

// Static default
const Name = string().default('Anonymous');
Name.validate(undefined); // { valid: true, object: 'Anonymous' }
Name.validate('Alice');   // { valid: true, object: 'Alice' }

// Factory function — useful for mutable defaults like arrays or dates
const Tags = array(string()).default(() => []);

// Works with .optional() — .default() removes undefined from the inferred type
const Port = number().optional().default(3000);
type Port = InferType<typeof Port>; // number`)
                        }}
                    />
                </pre>
                <p>
                    Use a factory function for mutable values (arrays, objects,
                    dates) to avoid shared references:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`const Config = object({
  host: string().default('localhost'),
  port: number().default(8080),
  tags: array(string()).default(() => []),
  createdAt: date().default(() => new Date())
});

type Config = InferType<typeof Config>;
// { host: string; port: number; tags: string[]; createdAt: Date }
// All fields are non-optional — defaults fill in missing values`)
                        }}
                    />
                </pre>
                <p>
                    Default values are exposed via <code>.introspect()</code>,
                    making them available for form generation, serialization,
                    and other tooling:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`const schema = string().default('hello');
const info = schema.introspect();
console.log(info.hasDefault);    // true
console.log(info.defaultValue);  // 'hello'`)
                        }}
                    />
                </pre>
            </div>
        </>
    );
}

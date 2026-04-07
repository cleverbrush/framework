import { highlightTS } from '@/lib/highlight';

export default function CatchFallbackSection() {
    return (
        <div className="card">
            <h2>Catch / Fallback</h2>
            <a href="/playground/catch-static" className="playground-link">
                ▶ Open in Playground
            </a>
            <p>
                Every schema builder supports <code>.catch(value)</code>. When
                validation <strong>fails for any reason</strong> — wrong type,
                constraint violation, missing required value — the fallback is
                returned as a successful result instead of errors.
            </p>
            <p>
                Unlike <code>.default()</code>, which only fires when the input
                is <code>undefined</code>, <code>.catch()</code> fires on{' '}
                <strong>any</strong> validation failure. When{' '}
                <code>.catch()</code> is set, <code>.validate()</code> and{' '}
                <code>.validateAsync()</code> will <strong>never throw</strong>.
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { string, number, array } from '@cleverbrush/schema';

// Static fallback
const Name = string().catch('unknown');
Name.validate(42);        // { valid: true, object: 'unknown' }
Name.validate(null);      // { valid: true, object: 'unknown' }
Name.validate('Alice');   // { valid: true, object: 'Alice' }

// Constraint violation also triggers catch
const Age = number().min(0).catch(-1);
Age.validate(-5);         // { valid: true, object: -1 }

// .validate() never throws when .catch() is set
Name.validate(42);           // { valid: true, object: 'unknown' }
`)
                    }}
                />
            </pre>
            <p>
                Use a factory function for mutable fallback values to avoid
                shared references between calls:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`const Tags = array(string()).catch(() => []);

const r1 = Tags.validate(null);  // { valid: true, object: [] }
const r2 = Tags.validate(null);  // { valid: true, object: [] }
// r1.object !== r2.object  — a fresh [] each time

// Introspect the fallback state
const schema = string().catch('unknown');
const info = schema.introspect();
console.log(info.hasCatch);    // true
console.log(info.catchValue);  // 'unknown'`)
                    }}
                />
            </pre>
        </div>
    );
}

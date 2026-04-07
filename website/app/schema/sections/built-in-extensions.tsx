import { highlightTS } from '@/lib/highlight';

export default function BuiltInExtensionsSection() {
    return (
        <div className="card">
            <h2>Built-in Extensions</h2>
            <a
                href="/playground/builtin-extensions"
                className="playground-link"
            >
                ▶ Open in Playground
            </a>
            <p>
                The default import from <code>@cleverbrush/schema</code>{' '}
                includes a pre-applied extension pack with common validators.
                You get these methods automatically — no extra setup required:
            </p>

            <h3>String Extensions</h3>
            <div className="table-wrap">
                <table className="api-table">
                    <thead>
                        <tr>
                            <th>Method</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <code>.email(errorMessage?)</code>
                            </td>
                            <td>Validates email format</td>
                        </tr>
                        <tr>
                            <td>
                                <code>.url(opts?, errorMessage?)</code>
                            </td>
                            <td>
                                Validates URL format.{' '}
                                <code>opts.protocols</code> narrows allowed
                                schemes
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>.uuid(errorMessage?)</code>
                            </td>
                            <td>Validates UUID (versions 1–5) format</td>
                        </tr>
                        <tr>
                            <td>
                                <code>.ip(opts?, errorMessage?)</code>
                            </td>
                            <td>
                                Validates IPv4 or IPv6.{' '}
                                <code>opts.version</code> narrows to{' '}
                                <code>&apos;v4&apos;</code> or{' '}
                                <code>&apos;v6&apos;</code>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>.trim()</code>
                            </td>
                            <td>
                                Preprocessor — trims whitespace before
                                validation
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>.toLowerCase()</code>
                            </td>
                            <td>
                                Preprocessor — lowercases value before
                                validation
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>.nonempty(errorMessage?)</code>
                            </td>
                            <td>Rejects empty strings</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <h3>Number Extensions</h3>
            <div className="table-wrap">
                <table className="api-table">
                    <thead>
                        <tr>
                            <th>Method</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <code>.positive(errorMessage?)</code>
                            </td>
                            <td>Value must be &gt; 0</td>
                        </tr>
                        <tr>
                            <td>
                                <code>.negative(errorMessage?)</code>
                            </td>
                            <td>Value must be &lt; 0</td>
                        </tr>
                        <tr>
                            <td>
                                <code>.finite(errorMessage?)</code>
                            </td>
                            <td>Value must be finite</td>
                        </tr>
                        <tr>
                            <td>
                                <code>.multipleOf(n, errorMessage?)</code>
                            </td>
                            <td>
                                Value must be an exact multiple of{' '}
                                <code>n</code> (float-safe)
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <h3>Array Extensions</h3>
            <div className="table-wrap">
                <table className="api-table">
                    <thead>
                        <tr>
                            <th>Method</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <code>.nonempty(errorMessage?)</code>
                            </td>
                            <td>Array must have at least one element</td>
                        </tr>
                        <tr>
                            <td>
                                <code>.unique(keyFn?, errorMessage?)</code>
                            </td>
                            <td>
                                All elements must be unique. Optional{' '}
                                <code>keyFn</code> extracts comparison key
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p>
                All validator extensions accept an optional error message as the
                last parameter — either a string or a function (matching the
                same <code>ValidationErrorMessageProvider</code> pattern used by
                built-in constraints like <code>.minLength()</code>
                ):
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { string, number, array } from '@cleverbrush/schema';

// String error messages
const email = string().email('Please enter a valid email');
const age = number().positive('Age must be positive');
const tags = array().of(string()).nonempty('At least one tag required');

// Function error messages — receive the invalid value
const name = string().nonempty((val) => \`"\${val}" is not allowed\`);
const score = number().multipleOf(5, (val) => \`\${val} is not a multiple of 5\`);`)
                    }}
                />
            </pre>

            <h3>
                The <code>/core</code> Sub-path
            </h3>
            <p>
                If you need bare builders <strong>without</strong> the built-in
                extensions (e.g. to apply only your own custom extensions),
                import from the <code>/core</code> sub-path:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`// Bare builders — no built-in extensions
import { string, number, array, withExtensions } from '@cleverbrush/schema/core';

// Apply only your own extensions
const s = withExtensions(myCustomExtension);`)
                    }}
                />
            </pre>
            <p>
                The default import re-exports everything from <code>/core</code>{' '}
                and overrides the nine factory functions with pre-extended
                versions. The extension descriptors themselves (
                <code>stringExtensions</code>, <code>numberExtensions</code>,{' '}
                <code>arrayExtensions</code>) are also exported so you can
                compose them with your own.
            </p>
        </div>
    );
}

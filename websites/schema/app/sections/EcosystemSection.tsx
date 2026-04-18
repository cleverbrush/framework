import Link from 'next/link';

export function EcosystemSection() {
    return (
        <section className="section" id="ecosystem">
            <div className="container">
                <h2 className="section-title">What the schema enables</h2>
                <p className="subtitle" style={{ marginBottom: '2rem' }}>
                    @cleverbrush/schema&apos;s runtime introspection powers a
                    family of companion libraries. Define your data shape once
                    and get type-safe mapping, JSON Schema interop, and headless
                    React forms — all from the same schema object.
                </p>

                <div className="ecosystem-diagram">
                    <div className="ecosystem-center">
                        <Link href="/docs" className="ecosystem-core">
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            @cleverbrush/schema
                        </Link>
                    </div>
                    <div className="ecosystem-spokes">
                        <div className="ecosystem-spoke">
                            <div className="ecosystem-spoke-icon">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M17 1l4 4-4 4" />
                                    <path d="M3 11V9a4 4 0 014-4h14" />
                                    <path d="M7 23l-4-4 4-4" />
                                    <path d="M21 13v2a4 4 0 01-4 4H3" />
                                </svg>
                            </div>
                            <div>
                                <strong>@cleverbrush/mapper</strong>
                                <span>
                                    Type-safe object mapping between two
                                    schemas. Compile-time completeness — the
                                    compiler errors if you forget a property.
                                </span>
                            </div>
                            <div className="spoke-links">
                                <Link href="/mapper" className="ecosystem-link">
                                    Docs →
                                </Link>
                                <a
                                    href="https://www.npmjs.com/package/@cleverbrush/mapper"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="spoke-npm-link"
                                >
                                    npm ↗
                                </a>
                            </div>
                        </div>
                        <div className="ecosystem-spoke">
                            <div className="ecosystem-spoke-icon">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <rect
                                        x="3"
                                        y="3"
                                        width="18"
                                        height="18"
                                        rx="2"
                                    />
                                    <path d="M3 9h18" />
                                    <path d="M9 21V9" />
                                </svg>
                            </div>
                            <div>
                                <strong>@cleverbrush/react-form</strong>
                                <span>
                                    Headless, schema-driven React forms. Works
                                    with Material UI, Ant Design, or plain HTML
                                    inputs.
                                </span>
                            </div>
                            <div className="spoke-links">
                                <a
                                    href="https://docs.cleverbrush.com/react-form"
                                    className="ecosystem-link"
                                >
                                    Docs →
                                </a>
                                <a
                                    href="https://www.npmjs.com/package/@cleverbrush/react-form"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="spoke-npm-link"
                                >
                                    npm ↗
                                </a>
                            </div>
                        </div>
                        <div className="ecosystem-spoke">
                            <div className="ecosystem-spoke-icon">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="8" y1="13" x2="16" y2="13" />
                                    <line x1="8" y1="17" x2="16" y2="17" />
                                </svg>
                            </div>
                            <div>
                                <strong>@cleverbrush/schema-json</strong>
                                <span>
                                    Bidirectional JSON Schema (Draft 7 /
                                    2020-12) interop — convert to and from typed
                                    schema builders.
                                </span>
                            </div>
                            <div className="spoke-links">
                                <Link
                                    href="/schema-json"
                                    className="ecosystem-link"
                                >
                                    Docs →
                                </Link>
                                <a
                                    href="https://www.npmjs.com/package/@cleverbrush/schema-json"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="spoke-npm-link"
                                >
                                    npm ↗
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

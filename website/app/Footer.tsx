export function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h4>
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            style={{
                                marginRight: '0.4rem',
                                verticalAlign: 'middle',
                                display: 'inline-block',
                                marginTop: '-2px'
                            }}
                        >
                            <path
                                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity="0.5"
                            />
                        </svg>
                        Cleverbrush
                    </h4>
                    <p>
                        Strongly typed libraries for full-stack web
                        development. Open source &amp; community-driven.
                    </p>
                </div>
                <div className="footer-section">
                    <h4>Resources</h4>
                    <a
                        href="https://github.com/cleverbrush/framework"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        GitHub Repository
                    </a>
                    <a href="/api-docs">
                        API Reference
                    </a>
                    <a
                        href="https://cleverbrush.com/editor"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Cleverbrush Editor
                    </a>
                </div>
                <div className="footer-section">
                    <h4>Contribute</h4>
                    <a
                        href="https://github.com/cleverbrush/framework/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Report an Issue
                    </a>
                    <a
                        href="https://github.com/cleverbrush/framework/pulls"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Pull Requests
                    </a>
                    <a
                        href="https://github.com/cleverbrush/framework/discussions"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Discussions
                    </a>
                </div>
                <div className="footer-section">
                    <h4>Packages</h4>
                    <a
                        href="https://www.npmjs.com/package/@cleverbrush/schema"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @cleverbrush/schema
                    </a>
                    <a
                        href="https://www.npmjs.com/package/@cleverbrush/mapper"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @cleverbrush/mapper
                    </a>
                    <a
                        href="https://www.npmjs.com/package/@cleverbrush/react-form"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @cleverbrush/react-form
                    </a>
                </div>
            </div>
            <div className="footer-bottom">
                <p>
                    BSD-3-Clause License •{' '}
                    <a
                        href="https://cleverbrush.com"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        cleverbrush.com
                    </a>
                </p>
            </div>
        </footer>
    );
}

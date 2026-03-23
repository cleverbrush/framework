export function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h4>Cleverbrush Libs</h4>
                    <p>
                        Open-source TypeScript libraries for schema validation,
                        object mapping, and headless React forms.
                    </p>
                </div>
                <div className="footer-section">
                    <h4>Links</h4>
                    <a
                        href="https://github.com/cleverbrush/framework"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        GitHub Repository
                    </a>
                    <a
                        href="https://docs.cleverbrush.com"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Documentation
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

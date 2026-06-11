import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>Page not found</h1>
                    <p className="subtitle">
                        The schema documentation page you requested does not
                        exist or has moved.
                    </p>
                </div>
                <div className="card">
                    <p>
                        Start from the schema docs, or open the interactive
                        playground.
                    </p>
                    <div className="hero-actions">
                        <Link
                            href="/docs/why"
                            className="hero-btn hero-btn-secondary"
                        >
                            Schema docs
                        </Link>
                        <Link
                            href="/playground"
                            className="hero-btn hero-btn-primary"
                        >
                            Playground
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

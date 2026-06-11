import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>Page not found</h1>
                    <p className="subtitle">
                        The documentation page you requested does not exist or
                        has moved.
                    </p>
                </div>
                <div className="card">
                    <p>
                        Start from the framework overview, or jump into the
                        getting started guide.
                    </p>
                    <div className="hero-actions">
                        <Link href="/" className="hero-btn hero-btn-secondary">
                            Documentation home
                        </Link>
                        <Link
                            href="/getting-started"
                            className="hero-btn hero-btn-primary"
                        >
                            Getting started
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

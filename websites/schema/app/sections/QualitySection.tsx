export function QualitySection() {
    return (
        <div className="card quality-card">
            <h3>Thoroughly Tested</h3>
            <p>
                Every package ships with a comprehensive unit test suite run
                with{' '}
                <a
                    href="https://vitest.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Vitest
                </a>{' '}
                across the full monorepo. Coverage is measured and published on
                every release.
            </p>
            <div className="quality-stats">
                <div className="quality-stat">
                    <span className="quality-stat-value">98.4%</span>
                    <span className="quality-stat-label">Line coverage</span>
                </div>
                <div className="quality-stat">
                    <span className="quality-stat-value">98.7%</span>
                    <span className="quality-stat-label">
                        Function coverage
                    </span>
                </div>
                <div className="quality-stat">
                    <span className="quality-stat-value">92.6%</span>
                    <span className="quality-stat-label">Branch coverage</span>
                </div>
            </div>
            <a
                href="https://github.com/cleverbrush/framework"
                target="_blank"
                rel="noopener noreferrer"
                className="hero-btn hero-btn-secondary"
            >
                View source &amp; tests on GitHub →
            </a>
        </div>
    );
}

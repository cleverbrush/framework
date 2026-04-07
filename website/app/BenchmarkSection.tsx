import { type BenchmarkGroup, loadBenchmarks } from '@/lib/benchmarks';

const SCHEMA_NAME = '@cleverbrush/schema';
const ZOD_NAME = 'zod';

function formatOps(hz: number): string {
    if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(1)}M`;
    if (hz >= 1_000) return `${(hz / 1_000).toFixed(0)}K`;
    return hz.toFixed(0);
}

function rankBadge(rank: number) {
    if (rank === 1)
        return (
            <span className="bench-rank-badge bench-rank-badge-1" title="#1">
                1
            </span>
        );
    if (rank === 2)
        return (
            <span className="bench-rank-badge bench-rank-badge-2" title="#2">
                2
            </span>
        );
    return (
        <span
            className="bench-rank-badge bench-rank-badge-other"
            title={`#${rank}`}
        >
            {rank}
        </span>
    );
}

function BenchmarkBar({
    group,
    compact
}: {
    group: BenchmarkGroup;
    compact?: boolean;
}) {
    const maxHz = Math.max(...group.entries.map(e => e.hz));
    const sorted = [...group.entries].sort((a, b) => b.hz - a.hz);
    const winner = sorted[0];
    const zodWins = winner.name === ZOD_NAME;

    return (
        <div className={`bench-group${compact ? ' bench-group-compact' : ''}`}>
            <h4 className="bench-group-label">{group.label}</h4>
            <div className="bench-bars">
                {sorted.map((entry, i) => {
                    const rank = i + 1;
                    const pct = (entry.hz / maxHz) * 100;
                    const isSchema = entry.name === SCHEMA_NAME;
                    const zodWinsThisRow = zodWins && isSchema;
                    return (
                        <div
                            key={entry.name}
                            className={`bench-row${isSchema && !zodWinsThisRow ? ' bench-row-highlight' : ''}${zodWinsThisRow ? ' bench-row-zod-wins' : ''}`}
                        >
                            <span className="bench-lib-name">
                                {rankBadge(rank)}
                                {entry.name.replace('@cleverbrush/', '')}
                            </span>
                            <div className="bench-bar-track">
                                <div
                                    className={`bench-bar-fill${isSchema && !zodWinsThisRow ? ' bench-bar-accent' : ''}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <span className="bench-ops">
                                {formatOps(entry.hz)} ops/s
                            </span>
                        </div>
                    );
                })}
            </div>
            {zodWins && (
                <p className="bench-honest-note">
                    <strong>Zod wins this one.</strong> We show all results —
                    including the ones we don&apos;t top.
                </p>
            )}
        </div>
    );
}

export function BenchmarkSection() {
    const groups = loadBenchmarks();
    const validGroups = groups.filter(g => g.label.includes('(valid)'));
    const invalidGroups = groups.filter(g => g.label.includes('(invalid)'));

    return (
        <section className="section" id="benchmarks">
            <div className="container">
                <h2 className="section-title">Performance</h2>
                <p className="bench-intro">
                    Numbers generated automatically from our benchmark suite
                    (Vitest bench, Node {'>'}= 22). Higher is better. We show{' '}
                    <strong>all tests</strong> — including the ones where we
                    don&apos;t come first.
                </p>
                <div className="bench-columns">
                    <div className="bench-column">
                        <h3 className="bench-column-title">Valid Input</h3>
                        {validGroups.map(g => (
                            <BenchmarkBar key={g.label} group={g} />
                        ))}
                    </div>
                    <div className="bench-column">
                        <h3 className="bench-column-title">Invalid Input</h3>
                        {invalidGroups.map(g => (
                            <BenchmarkBar key={g.label} group={g} compact />
                        ))}
                    </div>
                </div>
                <p className="bench-footnote">
                    Benchmarks compare @cleverbrush/schema, Zod, Yup, and Joi.
                    Each test runs for 500 ms per library. Full source in{' '}
                    <code>libs/benchmarks/</code>.
                </p>
            </div>
        </section>
    );
}

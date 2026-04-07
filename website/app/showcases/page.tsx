import Link from 'next/link';

const SHOWCASES = [
    {
        href: '/showcases/tanstack-form',
        title: 'TanStack Form',
        description:
            'Field-level validation in TanStack Form using @cleverbrush/schema validators passed directly as Standard Schema v1 objects — no adapter needed.',
        badge: 'Forms'
    },
    {
        href: '/showcases/t3-env',
        title: 'T3 Env',
        description:
            'Type-safe, validated environment variables with T3 Env and @cleverbrush/schema. Define server and client schemas once; T3 Env validates them at startup via Standard Schema.',
        badge: 'Config'
    }
];

export default function ShowcasesPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>Showcases</h1>
                    <p className="subtitle">
                        Real-world integrations of{' '}
                        <code>@cleverbrush/schema</code> with popular libraries
                        via the{' '}
                        <a
                            href="https://standardschema.dev"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Standard Schema v1
                        </a>{' '}
                        interface.
                    </p>
                </div>

                <div className="features-grid">
                    {SHOWCASES.map(s => (
                        <Link
                            key={s.href}
                            href={s.href}
                            className="feature-card"
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.6rem',
                                    marginBottom: '0.6rem'
                                }}
                            >
                                <h3 style={{ margin: 0 }}>{s.title}</h3>
                                <span
                                    style={{
                                        fontSize: '0.7rem',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '4px',
                                        background: 'rgba(129,140,248,0.12)',
                                        color: 'var(--accent-indigo)',
                                        fontWeight: 600,
                                        letterSpacing: '0.03em'
                                    }}
                                >
                                    {s.badge}
                                </span>
                            </div>
                            <p
                                style={{
                                    margin: 0,
                                    color: 'var(--text-secondary)',
                                    lineHeight: 1.6
                                }}
                            >
                                {s.description}
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

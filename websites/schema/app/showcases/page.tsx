import { PerformativeGlassGrid } from '@cleverbrush/website-shared/components/Performative';
import { schemaMetadata } from '../site';

export const metadata = schemaMetadata('/showcases');

interface Showcase {
    href: string;
    title: string;
    description: string;
    badge: string;
    external?: boolean;
}

const SHOWCASES: Showcase[] = [
    {
        href: 'https://xpenser.cleverbrush.com',
        title: 'xpenser',
        description:
            'Self-hostable personal finance tracker and real Cleverbrush reference app using schemas, contracts, server handlers, typed clients, React forms, OpenAPI, observability, Telegram, and MCP.',
        badge: 'App',
        external: true
    },
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

                <PerformativeGlassGrid
                    items={SHOWCASES.map(s => ({
                        title: s.title,
                        body: s.description,
                        icon: s.badge,
                        href: s.href,
                        external: s.external,
                        linkLabel: 'Open showcase'
                    }))}
                />
            </div>
        </div>
    );
}

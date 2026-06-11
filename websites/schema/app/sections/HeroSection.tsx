import {
    PerformativeHero,
    PerformativeProofRow,
    PerformativeSlippyWords
} from '@cleverbrush/website-shared/components/Performative';

export function HeroSection({
    smallGzip,
    fullGzip
}: {
    smallGzip: string;
    fullGzip: string;
}) {
    return (
        <>
            <PerformativeHero
                eyebrow="The cornerstone of type-safe TypeScript"
                headline="One schema for"
                rotatingWords={['types', 'validation', 'forms', 'JSON Schema']}
                body={
                    <>
                        <code>@cleverbrush/schema</code> infers TypeScript types
                        at compile time, validates untrusted data at runtime,
                        and exposes typed descriptors that power forms, mappers,
                        OpenAPI, and your own tooling.
                    </>
                }
                actions={[
                    {
                        href: '/docs',
                        label: 'Explore the schema library',
                        variant: 'glow'
                    },
                    {
                        href: '/playground',
                        label: 'Try the playground',
                        variant: 'wave'
                    },
                    {
                        href: 'https://github.com/cleverbrush/framework',
                        label: 'GitHub',
                        external: true,
                        variant: 'ghost'
                    }
                ]}
                metrics={[
                    { value: smallGzip, label: 'minimal gzipped build' },
                    { value: fullGzip, label: 'full gzipped build' },
                    { value: '0', label: 'runtime dependencies' },
                    { target: 98, suffix: '%', label: 'line coverage' }
                ]}
                badges={[
                    'Immutable builders',
                    'Standard Schema compatible',
                    'Typed field selectors',
                    'BSD-3 licensed'
                ]}
                code={{
                    filename: 'schema.ts',
                    code: `import { object, string, number } from '@cleverbrush/schema';

const User = object({
    name: string().minLength(2),
    email: string().email(),
    age: number().min(0).max(150)
});

const result = User.validate(input);

if (!result.valid) {
    result.getErrorsFor(u => u.email);
}`
                }}
            />
            <section className="section cb-pui-home-proof">
                <div className="container">
                    <PerformativeSlippyWords
                        words={[
                            'runtime validation',
                            'compile-time inference',
                            'property descriptors',
                            'schema-driven forms',
                            'JSON Schema interop',
                            'typed mappers'
                        ]}
                    />
                    <PerformativeProofRow
                        marquee={[
                            { label: '@cleverbrush/schema', tone: 'mono' },
                            { label: '@cleverbrush/mapper', tone: 'mono' },
                            { label: '@cleverbrush/react-form', tone: 'mono' },
                            { label: '@cleverbrush/schema-json', tone: 'mono' },
                            { label: 'Standard Schema', tone: 'strong' },
                            { label: 'TypeScript', tone: 'serif' }
                        ]}
                        items={[
                            {
                                href: 'https://github.com/cleverbrush/framework',
                                icon: 'GH',
                                title: 'Open source on GitHub',
                                subtitle: 'BSD-3-Clause framework monorepo'
                            },
                            {
                                href: 'https://www.npmjs.com/package/@cleverbrush/schema',
                                icon: 'npm',
                                title: '@cleverbrush/schema',
                                subtitle: `${smallGzip} minimal gzipped build`
                            },
                            {
                                href: '/playground',
                                icon: 'Run',
                                title: 'Browser playground',
                                subtitle:
                                    'Try validation and type inference live'
                            }
                        ]}
                    />
                </div>
            </section>
        </>
    );
}

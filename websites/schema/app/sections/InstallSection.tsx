import { InstallBanner } from '@cleverbrush/website-shared/components/InstallBanner';

export function InstallSection() {
    return (
        <section className="install-section">
            <div className="container">
                <div className="install-section-header">
                    <h2>Get started in seconds</h2>
                    <p>
                        Install only what you need — each package is independent
                        and tree-shakeable.
                    </p>
                </div>
                <InstallBanner
                    commands={[
                        {
                            command: 'npm install @cleverbrush/schema',
                            label: 'Schema — validation + TypeScript inference'
                        },
                        {
                            command: 'npm install @cleverbrush/mapper',
                            label: 'Type-safe object mapping (optional)'
                        },
                        {
                            command: 'npm install @cleverbrush/schema-json',
                            label: 'JSON Schema Draft 7 / 2020-12 interop (optional)'
                        }
                    ]}
                    note={
                        <>
                            <code>@cleverbrush/schema</code> and{' '}
                            <code>@cleverbrush/mapper</code> have zero runtime
                            dependencies.
                        </>
                    }
                />
            </div>
        </section>
    );
}

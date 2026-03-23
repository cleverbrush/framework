import { highlightTS } from '../highlight';

export default function HomePage() {
    return (
        <>
            <section className="hero">
                <h1>Cleverbrush Framework</h1>
                <p className="tagline">
                    Type-safe TypeScript libraries for schema validation, object
                    mapping, and headless React forms. Define once — validate,
                    map, and render anywhere.
                </p>
                <p className="production-note">
                    🚀 These libraries are fairly new and not yet widely known,
                    but they are battle-tested in production at{' '}
                    <a
                        href="https://cleverbrush.com/editor"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        cleverbrush.com/editor
                    </a>
                    . The entire editor — with dozens of interactive panels,
                    complex forms, and real-time collaboration — runs on these
                    three packages. They are stable, performant, and ready for
                    production use.
                </p>
                <div className="hero-badges">
                    <span className="badge">TypeScript-first</span>
                    <span className="badge">Zero dependencies*</span>
                    <span className="badge">Immutable schemas</span>
                    <span className="badge">BSD-3 Licensed</span>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <h2 className="section-title">The Libraries</h2>
                    <div className="lib-cards">
                        <a href="#/schema" className="lib-card">
                            <h3>@cleverbrush/schema</h3>
                            <p>
                                Immutable, composable schema definitions with
                                built-in validation and TypeScript type
                                inference. Define once — get types, validation,
                                and runtime introspection from a single source.
                            </p>
                            <span className="lib-card-link">
                                Learn more →
                            </span>
                        </a>
                        <a href="#/mapper" className="lib-card">
                            <h3>@cleverbrush/mapper</h3>
                            <p>
                                Type-safe object mapping between schemas with
                                compile-time completeness checking. Never miss a
                                property when converting between object shapes.
                            </p>
                            <span className="lib-card-link">
                                Learn more →
                            </span>
                        </a>
                        <a href="#/react-form" className="lib-card">
                            <h3>@cleverbrush/react-form</h3>
                            <p>
                                Headless, schema-driven React forms. Define your
                                schema once and get validated forms with any UI
                                library — Material UI, Ant Design, or plain
                                HTML.
                            </p>
                            <span className="lib-card-link">
                                Learn more →
                            </span>
                        </a>
                    </div>

                    <div className="card" style={{ marginTop: '2rem' }}>
                        <h3>How They Work Together</h3>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`// 1. Define a schema once
import { object, string, number } from '@cleverbrush/schema';

const UserSchema = object({
  name:  string().min(2).max(100),
  email: string().min(5),
  age:   number().min(0).max(150)
});

// 2. Use it for validation
const result = await UserSchema.validate(someData);

// 3. Use it for object mapping
import { MappingRegistry } from '@cleverbrush/mapper';
const registry = new MappingRegistry();
// ... map between schemas

// 4. Use it for React forms
import { useSchemaForm, Field } from '@cleverbrush/react-form';
const form = useSchemaForm(UserSchema);
// ... render type-safe form fields`)
                                }}
                            />
                        </pre>
                    </div>

                    <p className="footnote">
                        * <code>@cleverbrush/schema</code> and{' '}
                        <code>@cleverbrush/mapper</code> have zero runtime
                        dependencies. <code>@cleverbrush/react-form</code>{' '}
                        depends only on React and the schema library.
                    </p>
                </div>
            </section>
        </>
    );
}

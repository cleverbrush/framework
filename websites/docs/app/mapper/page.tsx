/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: needed for code examples */
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export const metadata = {
    title: 'Mapper — @cleverbrush/mapper',
    description:
        'Schema-to-schema object mapping with compile-time completeness checking and auto-mapping.'
};

export default function MapperPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>Mapper</h1>
                    <p className="subtitle">
                        Schema-to-schema object mapping with compile-time
                        completeness checking, auto-mapping, and zero
                        decorators.
                    </p>
                </div>

                {/* ── Install ─────────────────────────────────────── */}
                <div className="card">
                    <h2>Installation</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(
                                    'npm install @cleverbrush/mapper @cleverbrush/schema'
                                )
                            }}
                        />
                    </pre>
                </div>

                {/* ── Why ─────────────────────────────────────────── */}
                <div className="why-box">
                    <h2>Why use a mapper?</h2>
                    <p>
                        In non-trivial apps, the shape of data differs between
                        layers — API DTOs, domain models, database rows, view
                        models. Manual mapping code is repetitive and silently
                        breaks when you add a new field.
                    </p>
                    <p>
                        <code>@cleverbrush/mapper</code> uses your existing{' '}
                        <code>@cleverbrush/schema</code> definitions to generate
                        mapping functions — and gives you a{' '}
                        <strong>compile-time error</strong> if any target
                        property is unmapped.
                    </p>
                </div>

                {/* ── Basic usage ─────────────────────────────────── */}
                <div className="card">
                    <h2>Basic usage</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number } from '@cleverbrush/schema';
import { mapper } from '@cleverbrush/mapper';

const ApiUser = object({
    first_name: string(),
    last_name: string(),
    birth_year: number()
});

const DomainUser = object({
    fullName: string(),
    age: number()
});

const registry = mapper().configure(ApiUser, DomainUser, (m) =>
    m
        .for((t) => t.fullName)
            .compute((src) => src.first_name + ' ' + src.last_name)
        .for((t) => t.age)
            .compute((src) => new Date().getFullYear() - src.birth_year)
);

const mapFn = registry.getMapper(ApiUser, DomainUser);
const result = await mapFn({
    first_name: 'Jane',
    last_name: 'Doe',
    birth_year: 1995
});
// { fullName: 'Jane Doe', age: 30 }`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Mapping strategies ──────────────────────────── */}
                <div className="card">
                    <h2>Mapping strategies</h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Strategy</th>
                                    <th>Syntax</th>
                                    <th>Purpose</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>.from()</code>
                                    </td>
                                    <td>
                                        <code>
                                            .for(t =&gt; t.x).from(s =&gt; s.y)
                                        </code>
                                    </td>
                                    <td>Copy from a source property</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.compute()</code>
                                    </td>
                                    <td>
                                        <code>
                                            .for(t =&gt; t.x).compute(s =&gt;
                                            ...)
                                        </code>
                                    </td>
                                    <td>
                                        Compute from a sync or async function
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.ignore()</code>
                                    </td>
                                    <td>
                                        <code>.for(t =&gt; t.x).ignore()</code>
                                    </td>
                                    <td>Exclude property from output</td>
                                </tr>
                                <tr>
                                    <td>Auto-mapped</td>
                                    <td>(no config needed)</td>
                                    <td>
                                        Same-name compatible primitives, or
                                        registered nested schemas
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Auto-mapping ────────────────────────────────── */}
                <div className="card">
                    <h2>Auto-mapping</h2>
                    <p>
                        Properties with the same name and compatible types are
                        mapped automatically — you only need to configure the
                        differences:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const Source = object({
    id: string(),
    name: string(),
    email: string(),
    age: number()
});

const Target = object({
    id: string(),
    name: string(),
    email: string(),
    ageGroup: string()
});

const registry = mapper().configure(Source, Target, (m) =>
    m
        .for((t) => t.ageGroup)
            .compute((src) => (src.age < 18 ? 'minor' : 'adult'))
    // id, name, email are auto-mapped — no configuration needed
);`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Nested schemas ──────────────────────────────── */}
                <div className="card">
                    <h2>Nested &amp; array schemas</h2>
                    <p>
                        Register the child mapping first, and the parent mapper
                        automatically uses it for nested objects and array
                        elements:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const Address    = object({ city: string(), houseNr: number() });
const AddressDto = object({ city: string() });

const Person    = object({ name: string(), address: Address });
const PersonDto = object({ name: string(), address: AddressDto });

const registry = mapper()
    .configure(Address, AddressDto, (m) =>
        m.for((t) => t.city).from((f) => f.city)
    )
    .configure(Person, PersonDto, (m) =>
        m.for((t) => t.name).from((f) => f.name)
    );
    // address is auto-mapped using the registered Address→AddressDto mapper`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Compile-time safety ─────────────────────────── */}
                <div className="card">
                    <h2>Compile-time completeness</h2>
                    <p>
                        If you add a new property to the target schema and
                        forget to map it, TypeScript reports an error{' '}
                        <strong>at build time</strong> — not at runtime:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// Target gains a new 'role' property
const Target = object({ name: string(), role: string() });

// ❌ TypeScript error:
// 'role' is unmapped — SYMBOL_UNMAPPED prevents compilation
const registry = mapper().configure(Source, Target, (m) =>
    m.for((t) => t.name).from((s) => s.name)
);`)
                            }}
                        />
                    </pre>
                    <p>
                        The registry is <strong>immutable</strong> —{' '}
                        <code>configure()</code> returns a new registry, safe to
                        share and extend.
                    </p>
                </div>
            </div>
        </div>
    );
}

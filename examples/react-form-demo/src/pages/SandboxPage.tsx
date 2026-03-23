import { useState, useCallback, useRef } from 'react';
import * as Schema from '@cleverbrush/schema';
import * as Mapper from '@cleverbrush/mapper';

const SANDBOX_EXAMPLES: Record<string, string> = {
    schema: `// @cleverbrush/schema — define, infer, validate
const { object, string, number, boolean } = Schema;

const UserSchema = object({
  name:  string().min(2).max(50),
  email: string().min(5),
  age:   number().min(0).max(150),
  admin: boolean()
});

const result = await UserSchema.validate({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  admin: false
});

log('Valid:', result.valid);
log('Errors:', JSON.stringify(result.errors, null, 2));

// Try invalid data:
const bad = await UserSchema.validate({ name: 'A', email: '', age: -5, admin: 'yes' });
log('\\nInvalid example:');
log('Valid:', bad.valid);
log('Errors:', JSON.stringify(bad.errors, null, 2));`,

    mapper: `// @cleverbrush/mapper — schema-to-schema mapping
const { object, string, number } = Schema;
const { MappingRegistry } = Mapper;

const Source = object({
  firstName: string(),
  lastName:  string(),
  years:     number()
});

const Dest = object({
  fullName: string(),
  age:      number()
});

const registry = new MappingRegistry()
  .configure(Source, Dest, (m) =>
    m
      .for((t) => t.fullName)
        .compute((src) => src.firstName + ' ' + src.lastName)
      .for((t) => t.age)
        .compute((src) => src.years)
  );

const mapper = registry.getMapper(Source, Dest);
const mapped = await mapper({
  firstName: 'Jane',
  lastName:  'Doe',
  years:     28
});

log('Mapped result:', JSON.stringify(mapped, null, 2));`
};

export default function SandboxPage() {
    const [code, setCode] = useState(SANDBOX_EXAMPLES.schema);
    const [output, setOutput] = useState('');
    const [isError, setIsError] = useState(false);
    const outputRef = useRef<string[]>([]);

    const handleExampleChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const key = e.target.value;
            if (key in SANDBOX_EXAMPLES) {
                setCode(SANDBOX_EXAMPLES[key]);
                setOutput('');
                setIsError(false);
            }
        },
        []
    );

    const runCode = useCallback(() => {
        outputRef.current = [];
        setIsError(false);

        const log = (...args: unknown[]) => {
            outputRef.current.push(
                args
                    .map((a) =>
                        typeof a === 'string' ? a : JSON.stringify(a, null, 2)
                    )
                    .join(' ')
            );
        };

        try {
            const wrapped = `return (async () => { ${code} })()`;
            const fn = new Function('Schema', 'Mapper', 'log', wrapped);
            const promise = fn(Schema, Mapper, log) as Promise<void>;
            promise
                .then(() => {
                    setOutput(
                        outputRef.current.length > 0
                            ? outputRef.current.join('\n')
                            : '(no output — use log() to print results)'
                    );
                })
                .catch((err: unknown) => {
                    setIsError(true);
                    setOutput(
                        err instanceof Error
                            ? `${err.name}: ${err.message}`
                            : String(err)
                    );
                });
        } catch (err) {
            setIsError(true);
            setOutput(
                err instanceof Error
                    ? `${err.name}: ${err.message}`
                    : String(err)
            );
        }
    }, [code]);

    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>Interactive Sandbox</h1>
                    <p className="subtitle">
                        Try <code>@cleverbrush/schema</code> and{' '}
                        <code>@cleverbrush/mapper</code> right in the browser.
                        Edit the code and hit <strong>Run</strong>.
                    </p>
                    <p>
                        The <code>Schema</code> and <code>Mapper</code> modules
                        are available as globals. Use <code>log()</code> to
                        print output. Async/await is supported.
                    </p>
                </div>

                <div className="card">
                    <div className="sandbox-toolbar">
                        <select
                            onChange={handleExampleChange}
                            defaultValue="schema"
                        >
                            <option value="schema">
                                Schema — Validation
                            </option>
                            <option value="mapper">
                                Mapper — Object Mapping
                            </option>
                        </select>
                        <button className="btn btn-success" onClick={runCode}>
                            ▶ Run
                        </button>
                    </div>

                    <div className="sandbox-container">
                        <div className="sandbox-editor">
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                spellCheck={false}
                            />
                        </div>
                        <div className="sandbox-output">
                            <div
                                className={`sandbox-output-box${isError ? ' error' : ''}`}
                            >
                                {output || 'Output will appear here…'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

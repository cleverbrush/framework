export default function ComparisonSection() {
    return (
        <>
            <div className="card">
                <h2>Comparison with Alternatives</h2>
                <p>
                    How does <code>@cleverbrush/schema</code> compare to other
                    popular TypeScript validation libraries?
                </p>
                <div className="table-wrap">
                    <table className="comparison-table">
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th>@cleverbrush/schema</th>
                                <th>Zod</th>
                                <th>Yup</th>
                                <th>Joi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>TypeScript type inference</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="partial">~</td>
                                <td className="cross">✗</td>
                            </tr>
                            <tr>
                                <td>Immutable schemas</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                            </tr>
                            <tr>
                                <td>PropertyDescriptors</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                                <td className="partial">~</td>
                            </tr>
                            <tr>
                                <td>JSDoc comments preservation</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                            </tr>
                            <tr>
                                <td>Fluent / chainable API</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                            </tr>
                            <tr>
                                <td>Zero dependencies</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                            </tr>
                            <tr>
                                <td>Custom error messages</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                            </tr>
                            <tr>
                                <td>Per-property error inspection</td>
                                <td className="check">✓</td>
                                <td className="partial">~</td>
                                <td className="partial">~</td>
                                <td className="partial">~</td>
                            </tr>
                            <tr>
                                <td>Sync + async validation</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                            </tr>
                            <tr>
                                <td>Standard Schema v1</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                            </tr>
                            <tr>
                                <td>Extension / plugin system</td>
                                <td className="check">✓</td>
                                <td className="partial">~</td>
                                <td className="cross">✗</td>
                                <td className="partial">~</td>
                            </tr>
                            <tr>
                                <td>
                                    External schema interop (
                                    <code>extern()</code>)
                                </td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                            </tr>
                            <tr>
                                <td>Built-in validators (email…)</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                            </tr>
                            <tr>
                                <td>Default values</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

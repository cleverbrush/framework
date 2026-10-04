import Knex from 'knex';

export type CapturedQuery = {
    sql: string;
    bindings: unknown[];
    method: string;
};

/** Exercise real Knex compilation while replacing only the database driver. */
export function mockDriver() {
    const knex = Knex({ client: 'pg' });
    const queries: CapturedQuery[] = [];
    const fixture = {
        knex,
        queries,
        respond: (_query: CapturedQuery): unknown[] => []
    };
    knex.client.acquireConnection = async () => ({
        query(options: any, callback: any) {
            const captured = {
                sql: options.text ?? options,
                bindings: options.values ?? [],
                method: String(options.text ?? options)
                    .split(' ')[0]
                    .toLowerCase()
            };
            queries.push(captured);
            try {
                const rows = fixture.respond(captured);
                callback(null, {
                    rows,
                    rowCount: rows.length,
                    command:
                        captured.method === 'with'
                            ? 'SELECT'
                            : captured.method.toUpperCase()
                });
            } catch (error) {
                callback(error);
            }
        }
    });
    knex.client.releaseConnection = async () => {};
    return fixture;
}

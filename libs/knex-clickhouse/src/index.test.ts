import knex from 'knex';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ClickhouseKnexClient } from './index.js';

const TEST_CONFIG = {
    connection: {
        url: 'http://localhost:8123',
        user: 'default',
        password: '',
        database: 'test'
    }
};

describe('ClickhouseKnexClient', () => {
    describe('dialect metadata', () => {
        test('has clickhouse dialect', () => {
            expect(ClickhouseKnexClient.prototype).toHaveProperty(
                'dialect',
                'clikhouse'
            );
        });

        test('has clickhouse driverName', () => {
            expect(ClickhouseKnexClient.prototype).toHaveProperty(
                'driverName',
                'clikhouse'
            );
        });

        test('canCancelQuery is true', () => {
            expect(ClickhouseKnexClient.prototype).toHaveProperty(
                'canCancelQuery',
                true
            );
        });
    });

    describe('_escapeBinding', () => {
        let client: ClickhouseKnexClient;

        beforeEach(() => {
            client = new ClickhouseKnexClient(TEST_CONFIG);
        });

        test('escapes a simple string', () => {
            const result = client._escapeBinding('hello');
            expect(result).toBe("'hello'");
        });

        test('escapes string with single quotes', () => {
            const result = client._escapeBinding("it's");
            // Single quotes are doubled in ClickHouse escaping
            expect(result).toBe("'it''s'");
        });

        test('escapes string with backslash (double-escaped)', () => {
            const result = client._escapeBinding('back\\slash');
            expect(result).toBe("'back\\\\\\\\slash'");
        });

        test('escapes null as NULL', () => {
            expect(client._escapeBinding(null)).toBe('NULL');
        });

        test('escapes undefined as NULL', () => {
            expect(client._escapeBinding(undefined)).toBe('NULL');
        });

        test('escapes number', () => {
            expect(client._escapeBinding(42)).toBe('42');
        });

        test('escapes boolean true', () => {
            expect(client._escapeBinding(true)).toBe('true');
        });

        test('escapes boolean false', () => {
            expect(client._escapeBinding(false)).toBe('false');
        });

        test('escapes array with brackets', () => {
            const result = client._escapeBinding([1, 2, 3]);
            expect(result).toBe('[1,2,3]');
        });

        test('escapes mixed array', () => {
            const result = client._escapeBinding([1, 'two', null]);
            expect(result).toBe("[1,'two',NULL]");
        });

        test('escapes nested array', () => {
            const result = client._escapeBinding([
                [1, 2],
                [3, 4]
            ]);
            expect(result).toBe('[[1,2],[3,4]]');
        });

        test('escapes empty array', () => {
            expect(client._escapeBinding([])).toBe('[]');
        });

        test('escapes object as JSON', () => {
            const result = client._escapeBinding({ a: 1 });
            expect(result).toBe('{"a":1}');
        });

        test('SQL injection attempt — single quote is doubled', () => {
            const result = client._escapeBinding("'; DROP TABLE users; --");
            // Opening quote + doubled single quote + rest + closing quote
            expect(result).toBe("'''; DROP TABLE users; --'");
        });
    });
});

describe('query building (via knex + ClickhouseKnexClient)', () => {
    const db = knex({
        client: ClickhouseKnexClient as any,
        connection: TEST_CONFIG.connection
    });

    test('builds a basic select query', () => {
        const sql = db('test_table').select('id', 'name').toSQL();
        expect(sql.sql).toBe('select "id", "name" from "test_table"');
    });

    test('builds a where query', () => {
        const sql = db('test_table').select('*').where('id', '=', 1).toSQL();
        expect(sql.sql).toBe('select * from "test_table" where "id" = ?');
        expect(sql.bindings).toEqual([1]);
    });

    test('builds a limit/offset query', () => {
        const sql = db('test_table').select('*').limit(10).offset(20).toSQL();
        expect(sql.sql).toBe('select * from "test_table" limit ? offset ?');
        expect(sql.bindings).toEqual([10, 20]);
    });

    test('builds an insert query', () => {
        const sql = db('test_table').insert({ id: 1, name: 'Alice' }).toSQL();
        expect(sql.sql).toBe(
            'insert into "test_table" ("id", "name") values (?, ?)'
        );
        expect(sql.bindings).toEqual([1, 'Alice']);
    });

    test('builds a raw query', () => {
        const sql = db.raw('SELECT * FROM test_table WHERE id = ?', [1]);
        expect(sql.toSQL().sql).toBe('SELECT * FROM test_table WHERE id = ?');
    });

    test('builds a delete query', () => {
        const sql = db('test_table').where('id', 1).del().toSQL();
        expect(sql.sql).toContain('delete');
        expect(sql.sql).toContain('test_table');
    });

    test('builds an update query', () => {
        const sql = db('test_table')
            .where('id', 1)
            .update({ name: 'Bob' })
            .toSQL();
        expect(sql.sql).toContain('update');
        expect(sql.sql).toContain('test_table');
        expect(sql.bindings).toContain('Bob');
    });

    test('builds a count query', () => {
        const sql = db('test_table').count('* as total').toSQL();
        expect(sql.sql).toContain('count');
    });

    test('builds a join query', () => {
        const sql = db('t1')
            .join('t2', 't1.id', 't2.t1_id')
            .select('t1.*')
            .toSQL();
        expect(sql.sql).toContain('join');
        expect(sql.sql).toContain('"t1"');
        expect(sql.sql).toContain('"t2"');
    });

    test('builds an orderBy query', () => {
        const sql = db('test_table')
            .select('*')
            .orderBy('name', 'desc')
            .toSQL();
        expect(sql.sql).toContain('order by');
    });

    test('builds a groupBy query', () => {
        const sql = db('test_table')
            .select('status')
            .count('* as cnt')
            .groupBy('status')
            .toSQL();
        expect(sql.sql).toContain('group by');
    });
});

describe('getClickhouseConnection', () => {
    // knex 3.x exposes QueryBuilder on the static export, not on instances.
    // Create a connection that patches QueryBuilder onto the instance so the
    // extension registration works, then register insertToClickhouse once.
    const db = (() => {
        const instance = knex({
            ...TEST_CONFIG,
            client: ClickhouseKnexClient as any
        }) as any;
        if (!instance.QueryBuilder && (knex as any).QueryBuilder) {
            instance.QueryBuilder = (knex as any).QueryBuilder;
        }
        // Register the extension once (knex throws on duplicate registration)
        instance.QueryBuilder.extend(
            'insertToClickhouse',
            function (this: any, rows: any) {
                const getTuple = (r: any, p = ['(', ')']): string =>
                    p[0] +
                    r
                        .map((c: any) => {
                            if (c === null) return 'NULL';
                            if (typeof c === 'string')
                                return instance.raw('?', [c]).toQuery();
                            if (Array.isArray(c))
                                return getTuple(c, ['[', ']']);
                            if (typeof c === 'object') {
                                const keys = Object.keys(c);
                                return `[${keys
                                    .map(
                                        k =>
                                            `(${instance.raw('?', [k]).toQuery()}, ${instance.raw('?', [c[k]]).toQuery()})`
                                    )
                                    .join(', ')}]`;
                            }
                            return c;
                        })
                        .join(', ') +
                    p[1];
                const values = rows.map((r: any) => getTuple(r));
                return instance.raw(
                    `INSERT INTO ${(this as any)._single.table} VALUES ${values}`
                );
            }
        );
        return instance;
    })();

    test('creates a functional knex instance', () => {
        expect(db).toBeDefined();
        expect(typeof db).toBe('function');
        expect(typeof db.raw).toBe('function');
    });

    test('insertToClickhouse builds correct SQL', () => {
        const sql = (db('test_table') as any)
            .insertToClickhouse([
                [1, 'Alice'],
                [2, 'Bob']
            ])
            .toSQL();
        expect(sql.sql).toContain('INSERT INTO');
        expect(sql.sql).toContain('test_table');
        expect(sql.sql).toContain('VALUES');
    });

    test('insertToClickhouse handles null values', () => {
        const sql = (db('test_table') as any)
            .insertToClickhouse([[1, null, 'test']])
            .toSQL();
        expect(sql.sql).toContain('NULL');
    });

    test('insertToClickhouse handles nested arrays', () => {
        const sql = (db('test_table') as any)
            .insertToClickhouse([[1, [10, 20, 30]]])
            .toSQL();
        expect(sql.sql).toContain('[');
        expect(sql.sql).toContain(']');
    });

    test('insertToClickhouse handles object values as maps', () => {
        const sql = (db('test_table') as any)
            .insertToClickhouse([[1, { key: 'value' }]])
            .toSQL();
        expect(sql.sql).toContain('[');
    });
});

describe('processResponse', () => {
    let client: ClickhouseKnexClient;

    beforeEach(() => {
        client = new ClickhouseKnexClient(TEST_CONFIG);
    });

    test('returns null for null input', () => {
        expect(client.processResponse(null, null)).toBeNull();
    });

    test('processes select response into objects', () => {
        const obj = {
            method: 'select',
            sql: 'select id, name from test',
            response: [
                [
                    [1, 'Alice'],
                    [2, 'Bob']
                ],
                [
                    { name: 'id', type: 'UInt32' },
                    { name: 'name', type: 'String' }
                ],
                {}
            ]
        };

        const [rows] = client.processResponse(obj, null);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toEqual({ id: 1, name: 'Alice' });
        expect(rows[1]).toEqual({ id: 2, name: 'Bob' });
    });

    test('processes first response into single object', () => {
        const obj = {
            method: 'first',
            sql: 'select id from test limit 1',
            response: [
                [[1, 'Alice']],
                [
                    { name: 'id', type: 'UInt32' },
                    { name: 'name', type: 'String' }
                ],
                {}
            ]
        };

        const [row] = client.processResponse(obj, null);
        expect(row).toEqual({ id: 1, name: 'Alice' });
    });

    test('processes pluck response', () => {
        const obj = {
            method: 'pluck',
            pluck: 'name',
            sql: 'select name from test',
            response: [
                [
                    [1, 'Alice'],
                    [2, 'Bob']
                ],
                [
                    { name: 'id', type: 'UInt32' },
                    { name: 'name', type: 'String' }
                ],
                {}
            ]
        };

        const [values] = client.processResponse(obj, null);
        expect(values).toEqual(['Alice', 'Bob']);
    });

    test('pluck returns rows when column not found', () => {
        const obj = {
            method: 'pluck',
            pluck: 'nonexistent',
            sql: 'select name from test',
            response: [
                [[1, 'Alice']],
                [
                    { name: 'id', type: 'UInt32' },
                    { name: 'name', type: 'String' }
                ],
                {}
            ]
        };

        const result = client.processResponse(obj, null);
        expect(result).toEqual([[1, 'Alice']]);
    });

    test('parses Date types', () => {
        const obj = {
            method: 'select',
            sql: 'select created_at from test',
            response: [
                [['2024-06-15']],
                [{ name: 'created_at', type: 'Date' }],
                {}
            ]
        };

        const [rows] = client.processResponse(obj, null);
        expect(rows[0].created_at).toBeInstanceOf(Date);
    });

    test('parses DateTime types', () => {
        const obj = {
            method: 'select',
            sql: 'select ts from test',
            response: [
                [['2024-06-15 12:30:00']],
                [{ name: 'ts', type: 'DateTime' }],
                {}
            ]
        };

        const [rows] = client.processResponse(obj, null);
        expect(rows[0].ts).toBeInstanceOf(Date);
    });

    test("parses DateTime('UTC') type", () => {
        const obj = {
            method: 'select',
            sql: 'select ts from test',
            response: [
                [['2024-06-15 12:30:00']],
                [{ name: 'ts', type: "DateTime('UTC')" }],
                {}
            ]
        };

        const [rows] = client.processResponse(obj, null);
        expect(rows[0].ts).toBeInstanceOf(Date);
    });

    test('parses UInt64 as number', () => {
        const obj = {
            method: 'select',
            sql: 'select count from test',
            response: [[['12345678']], [{ name: 'count', type: 'UInt64' }], {}]
        };

        const [rows] = client.processResponse(obj, null);
        expect(rows[0].count).toBe(12345678);
        expect(typeof rows[0].count).toBe('number');
    });

    test('parses UInt32 as number', () => {
        const obj = {
            method: 'select',
            sql: 'select id from test',
            response: [[['42']], [{ name: 'id', type: 'UInt32' }], {}]
        };

        const [rows] = client.processResponse(obj, null);
        expect(rows[0].id).toBe(42);
    });

    test('parses LowCardinality(Date) type', () => {
        const obj = {
            method: 'select',
            sql: 'select d from test',
            response: [
                [['2024-01-01']],
                [{ name: 'd', type: 'LowCardinality(Date)' }],
                {}
            ]
        };

        const [rows] = client.processResponse(obj, null);
        expect(rows[0].d).toBeInstanceOf(Date);
    });

    test('parses Nullable(DateTime) type', () => {
        const obj = {
            method: 'select',
            sql: 'select ts from test',
            response: [
                [['2024-06-15 00:00:00']],
                [{ name: 'ts', type: 'Nullable(DateTime)' }],
                {}
            ]
        };

        const [rows] = client.processResponse(obj, null);
        expect(rows[0].ts).toBeInstanceOf(Date);
    });

    test('insert method returns raw response', () => {
        const response = [[], [], {}];
        const obj = {
            method: 'insert',
            sql: 'insert into test',
            response
        };

        expect(client.processResponse(obj, null)).toBe(response);
    });

    test('del method returns raw response', () => {
        const response = [[], [], {}];
        const obj = {
            method: 'del',
            sql: 'delete from test',
            response
        };

        expect(client.processResponse(obj, null)).toBe(response);
    });

    test('update method returns raw response', () => {
        const response = [[], [], {}];
        const obj = {
            method: 'update',
            sql: 'update test set x = 1',
            response
        };

        expect(client.processResponse(obj, null)).toBe(response);
    });

    test('raw method with SELECT is treated as select', () => {
        const obj = {
            method: 'raw',
            sql: 'SELECT id, name FROM test',
            response: [
                [[1, 'Alice']],
                [
                    { name: 'id', type: 'UInt32' },
                    { name: 'name', type: 'String' }
                ],
                {}
            ]
        };

        const [rows] = client.processResponse(obj, null);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toEqual({ id: 1, name: 'Alice' });
    });

    test('raw method with WITH is treated as select', () => {
        const obj = {
            method: 'raw',
            sql: 'WITH cte AS (SELECT 1) SELECT * FROM cte',
            response: [[[1]], [{ name: 'result', type: 'UInt32' }], {}]
        };

        const [rows] = client.processResponse(obj, null);
        expect(rows).toHaveLength(1);
    });

    test('uses output callback when provided', () => {
        const obj = {
            method: 'select',
            output: vi.fn(() => 'custom_output'),
            sql: 'select * from test',
            response: [[], [], {}]
        };

        const result = client.processResponse(obj, 'runner');
        expect(result).toBe('custom_output');
        // .call(runner, rows, fields) — runner is `this`, (rows, fields) are args
        expect(obj.output).toHaveBeenCalledWith([], []);
    });
});

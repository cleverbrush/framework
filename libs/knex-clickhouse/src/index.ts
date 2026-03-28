import { retry } from '@cleverbrush/async';
import { deepExtend } from '@cleverbrush/deep';
import ClickhouseDriver, {
    type ClickHouseClient,
    type ClickHouseSettings
} from '@clickhouse/client';
import knex, { type Knex } from 'knex';
import { makeEscape } from './makeEscape.js';

export type { ClickHouseClient };

const parseDate = (value: any) => new Date(Date.parse(value));

// Access the Client class from the knex runtime object (CJS compat)
const KnexClient: typeof Knex.Client = (knex as any).Client;

// this function is taken from knex npm package
function arrayString(arr: any[], esc: (val: any) => string) {
    let result = '';
    for (let i = 0; i < arr.length; i++) {
        if (i > 0) result += ',';
        const val = arr[i];
        if (val === null || typeof val === 'undefined') {
            result += 'NULL';
        } else if (Array.isArray(val)) {
            result += arrayString(val, esc);
        } else if (typeof val === 'number') {
            result += val;
        } else {
            result += esc(val);
        }
    }
    return `[${result}]`;
}

type AdditionalClientOptions = {
    /**
     * Options for retrying the query,
     * by default it will retry 10 times with a delay factor of 2 and a minimum delay of
     * 100ms and delay randomization of 10%.
     * and will retry only if the error code is 'ECONNRESET',
     * you can override this behavior by passing your own options.
     * If this option is set to `null` then the query will not be retried.
     */
    retry?: Parameters<typeof retry>[1];
};

export class ClickhouseKnexClient extends KnexClient {
    _driver() {
        return ClickhouseDriver;
    }

    #retryOptions: Parameters<typeof retry>[1];

    constructor(config: Knex.Config<any> & AdditionalClientOptions = {}) {
        const { retry: retryOptions } = config;

        super(config);

        this.#retryOptions = retryOptions
            ? deepExtend(
                  {
                      maxRetries: 10,
                      delayFactor: 2,
                      minDelay: 100,
                      delayRandomizationPercent: 0.1,
                      shouldRetry: (error: any) => error.code === 'ECONNRESET'
                  },
                  retryOptions
              )
            : undefined;
    }

    #typeParsers = {
        Date: parseDate,
        DateTime: parseDate,
        'LowCardinality(Date)': parseDate,
        'LowCardinality(DateTime)': parseDate,
        'Nullable(Date)': parseDate,
        'Nullable(DateTime)': parseDate,
        "DateTime('UTC')": parseDate,
        "Nullable(DateTime('UTC'))": parseDate,
        'LowCardinality(Nullable(Date))': parseDate,
        'LowCardinality(Nullable(DateTime))': parseDate,
        UInt64: (value: any) => Number(value),
        UInt32: (value: any) => Number(value)
    };

    #selectQueryRegex = /^(\s+)?(select|with)/i;

    _escapeBinding(value: any) {
        const escapeBinding = makeEscape({
            escapeArray(val: any, esc: any) {
                return arrayString(val, esc);
            },
            escapeString(str: string) {
                let escaped = "'";
                for (let i = 0; i < str.length; i++) {
                    const c = str[i];
                    if (c === "'") {
                        escaped += c + c;
                    } else if (c === '\\') {
                        escaped += c + c;
                    } else {
                        escaped += c;
                    }
                }
                escaped += "'";
                return escaped;
            },
            escapeObject(
                val: any,
                prepareValue: any,
                _timezone: any,
                seen: any[] = []
            ) {
                if (val && typeof val.toPostgres === 'function') {
                    seen = seen || [];
                    if (seen.indexOf(val) !== -1) {
                        throw new Error(
                            `circular reference detected while preparing "${val}" for query`
                        );
                    }
                    seen.push(val);
                    return prepareValue(val.toPostgres(prepareValue), seen);
                }
                return JSON.stringify(val);
            }
        });

        const result = escapeBinding(value);

        if (typeof result === 'string') {
            return result.replace(/\\/g, '\\\\');
        }

        return result;
    }

    /**
     *
     * @param {import('@clickhouse/client').QueryParams} obj
     * @returns
     */
    async _query(connection: ClickHouseClient, obj: any) {
        if (!obj || typeof obj === 'string') {
            obj = { sql: obj };
        } else if (!obj.sql) {
            throw new Error('The query is empty');
        }

        let { method } = obj;

        if (method === 'raw' && this.#selectQueryRegex.test(obj.sql)) {
            method = 'select';
        }

        const query =
            Array.isArray(obj.bindings) && obj.bindings.length > 0
                ? obj.sql
                      .split('?')
                      .map(
                          (x: any, i: number) =>
                              `${x}${
                                  obj.bindings.length > i
                                      ? this._escapeBinding(obj.bindings[i])
                                      : ''
                              }`
                      )
                      .join('')
                : obj.sql;

        let response;
        const queryParams = {
            clickhouse_settings: {
                exact_rows_before_limit: true
            },
            query,
            format: 'JSONCompact'
        };
        obj.finalQuery = query;

        const { preQueryCallback } = this.config as any;

        if (typeof preQueryCallback === 'function') {
            await Promise.resolve(preQueryCallback(connection));
        }

        switch (method) {
            case 'select':
            case 'first':
            case 'pluck':
                {
                    const p = (await (this.#retryOptions
                        ? retry(
                              () => connection.query(queryParams as any),
                              this.#retryOptions
                          )
                        : connection.query(queryParams as any))) as any;

                    response = await p.json();

                    const { data, meta, ...rest } = response;

                    obj.response = [data, meta, { ...rest }];
                }
                break;
            default:
                response = await (this.#retryOptions
                    ? retry(
                          () => connection.exec(queryParams as any),
                          this.#retryOptions
                      )
                    : connection.exec(queryParams as any));
        }

        return obj;
    }

    /**
     *
     * @param {import('@clickhouse/client').ResultSet} obj
     * @param {*} runner
     * @returns
     */
    processResponse(obj: any, runner: any) {
        if (obj == null) return null;
        const { response } = obj;
        const [rows, fields, meta] = response || [[]];

        const parsers = Array.isArray(fields)
            ? fields.map((field: any) =>
                  typeof (this.#typeParsers as Record<string, (v: any) => any>)[
                      field.type
                  ] === 'function'
                      ? (this.#typeParsers as Record<string, (v: any) => any>)[
                            field.type
                        ]
                      : (x: any) => x
              )
            : fields;

        const rowToObj = (row: any) => {
            const result: Record<string, unknown> = {};

            fields.forEach((field: any, index: number) => {
                result[field.name] = parsers[index](row[index]);
            });

            return result;
        };

        if (obj.output) return obj.output.call(runner, rows, fields);

        let { method } = obj;

        if (method === 'raw' && this.#selectQueryRegex.test(obj.sql)) {
            method = 'select';
        }

        switch (method) {
            case 'select':
                return [rows.map((r: any) => rowToObj(r)), fields, meta];
            case 'first':
                return [rowToObj(rows[0]), fields, meta];
            case 'pluck': {
                const pluckIndex = fields.findIndex(
                    (val: any) => val.name === obj.pluck
                );
                if (pluckIndex === -1) return rows;
                return [
                    rows.map((row: any) => row[pluckIndex]),
                    obj.pluck,
                    meta
                ];
            }
            case 'insert':
            case 'del':
            case 'update':
            case 'counter':
                return response;
            default:
                return response;
        }
    }

    /**
     * @type {import('@clickhouse/client').ClickHouseClient}
     */
    #connection: any;

    // Get a raw connection, called by the `pool` whenever a new
    // connection needs to be added to the pool.
    async acquireRawConnection() {
        if (!this.#connection) {
            const connection = ClickhouseDriver.createClient({
                url: (this.config as any).connection.url,
                username: (this.config as any).connection.user,
                password: (this.config as any).connection.password,
                database: (this.config as any).connection.database,
                compression: { request: true, response: true },
                clickhouse_settings: (this.config as any).clickHouseSettings
            });

            // @ts-expect-error
            connection.connected = true;

            this.#connection = connection;
        }

        return this.#connection;
    }

    async destroyRawConnection(connection: any) {
        connection.close();
    }
}

Object.assign(ClickhouseKnexClient.prototype, {
    dialect: 'clikhouse',
    driverName: 'clikhouse',
    canCancelQuery: true
});

const registerKnexClickhouseExtensions = (knex: any) => {
    (knex as any).QueryBuilder.extend(
        'insertToClickhouse',
        function (this: any, rows: any) {
            const getTuple = (r: any, p = ['(', ')']) =>
                p[0] +
                r
                    .map((c: any) => {
                        if (c === null) {
                            return 'NULL';
                        }
                        if (typeof c === 'string') {
                            return knex.raw('?', [c]).toQuery();
                        }

                        if (Array.isArray(c)) {
                            return getTuple(c, ['[', ']']);
                        }

                        if (typeof c === 'object') {
                            const keys = Object.keys(c);
                            return `[${keys
                                .map(
                                    (k) =>
                                        `(${knex.raw('?', [k]).toQuery()}, ${knex
                                            .raw('?', [c[k]])
                                            .toQuery()})`
                                )
                                .join(', ')}]`;
                        }

                        return c;
                    })
                    .join(', ') +
                p[1];
            const values = rows.map((r: any) => getTuple(r));
            return knex.raw(
                `INSERT INTO ${(this as any)._single.table} VALUES ${values}`
            );
        }
    );
};

/**
 *
 * @returns {import('knex').Knex<any, unknown[]>}
 */
export const getClickhouseConnection = (
    config: Knex.Config<any> & AdditionalClientOptions = {},
    clickHouseSettings?: ClickHouseSettings,
    /**
     * If defined, this function will be called before each query
     * and awaited if it returns a promise.
     *
     * Could be useful in some cases. For example you want first to check
     * if the server is not in idle state (for example Clickhouse Cloud have idling options)
     * and if it is, you want to wake it up before sending the query.
     *
     * if the function throws an error this error will not be caught and will propagate to the caller.
     * Therefore the query will not be executed.
     */
    preQueryCallback?: (connection: ClickHouseClient) => Promise<void>
) => {
    const connection = knex({
        ...config,
        client: ClickhouseKnexClient as any,
        clickHouseSettings,
        preQueryCallback
    } as any);

    registerKnexClickhouseExtensions(connection);

    return connection;
};

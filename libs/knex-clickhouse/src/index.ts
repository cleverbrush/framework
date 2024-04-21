import Knex from 'knex';
import ClickhouseDriver from '@clickhouse/client';

import { makeEscape } from './makeEscape.js';

const parseDate = (value) => new Date(Date.parse(value));

// this function is taken from knex npm package
function arrayString(arr, esc) {
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

export class ClickhouseKnexClient extends Knex.Client {
    _driver() {
        return ClickhouseDriver;
    }

    constructor(config = {}) {
        super(config);
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
        UInt64: (value) => Number(value),
        UInt32: (value) => Number(value)
    };

    #selectQueryRegex = /^(\s+)?(select|with)/i;

    _escapeBinding(value) {
        const escapeBinding = makeEscape({
            escapeArray(val, esc) {
                return arrayString(val, esc);
            },
            escapeString(str) {
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
            escapeObject(val, prepareValue, timezone, seen: any[] = []) {
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
     * @param {import('@clickhouse/client').ClickHouseClient} connection
     * @param {import('@clickhouse/client').QueryParams} obj
     * @returns
     */
    async _query(connection, obj) {
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
                          (x, i) =>
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
        switch (method) {
            case 'select':
            case 'first':
            case 'pluck':
                {
                    const p = await connection.query(queryParams);
                    response = await p.json();

                    const { data, meta, ...rest } = response;

                    obj.response = [data, meta, { ...rest }];
                }
                break;
            default:
                response = await connection.exec(queryParams);
        }

        return obj;
    }

    /**
     *
     * @param {import('@clickhouse/client').ResultSet} obj
     * @param {*} runner
     * @returns
     */
    processResponse(obj, runner) {
        if (obj == null) return null;
        const { response } = obj;
        const [rows, fields, meta] = response || [[]];

        const parsers = Array.isArray(fields)
            ? fields.map((field) =>
                  typeof this.#typeParsers[field.type] === 'function'
                      ? this.#typeParsers[field.type]
                      : (x) => x
              )
            : fields;

        const rowToObj = (row) =>
            fields.reduce(
                (acc, field, index) => ({
                    ...acc,
                    [field.name]: parsers[index](row[index])
                }),
                {}
            );

        if (obj.output) return obj.output.call(runner, rows, fields);

        let { method } = obj;

        if (method === 'raw' && this.#selectQueryRegex.test(obj.sql)) {
            method = 'select';
        }

        switch (method) {
            case 'select':
                return [rows.map((r) => rowToObj(r)), fields, meta];
            case 'first':
                return [rowToObj(rows[0]), fields, meta];
            case 'pluck': {
                const pluckIndex = fields.findIndex(
                    (val) => val.name === obj.pluck
                );
                if (pluckIndex === -1) return rows;
                return [rows.map((row) => row[pluckIndex]), obj.pluck, meta];
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
    #connection;

    // Get a raw connection, called by the `pool` whenever a new
    // connection needs to be added to the pool.
    async acquireRawConnection() {
        if (!this.#connection) {
            const connection = ClickhouseDriver.createClient({
                // @ts-ignore
                url: this.config.connection.url,
                // @ts-ignore
                username: this.config.connection.user,
                // @ts-ignore
                password: this.config.connection.password,
                // @ts-ignore
                database: this.config.connection.database,
                compression: { request: true, response: true }
            });

            // @ts-ignore
            connection.connected = true;

            this.#connection = connection;
        }

        return this.#connection;
    }

    async destroyRawConnection(connection) {
        connection.close();
    }
}

Object.assign(ClickhouseKnexClient.prototype, {
    dialect: 'clikhouse',
    driverName: 'clikhouse',
    canCancelQuery: true
});

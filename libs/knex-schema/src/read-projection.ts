import { number, string } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import {
    type AggregateExpression,
    type AliasedColumn,
    compileAggregate,
    EXPRESSION,
    isAggregate
} from './expressions.js';
import {
    compileReadSchema,
    type ReadNode,
    type ReadSchema,
    ReadSchemaError,
    readExpression
} from './read-schema.js';

/** @internal One selected field drives SQL, decoding and exposed schema metadata. */
export type ReadField = {
    node: ReadNode;
    expression: (knex: Knex) => Knex.Raw;
    aggregate?: boolean;
};
/** @internal Compile typed columns and aggregates using a caller-owned column resolver. */
export function compileReadProjection(
    knex: Knex,
    selection: Record<string, AliasedColumn<any> | AggregateExpression<any>>,
    resolve: (column: AliasedColumn<any>) => {
        name: string | Knex.Raw;
        node: ReadNode;
    }
): Record<string, ReadField> {
    if (!Object.keys(selection).length)
        throw new ReadSchemaError('A non-empty projection is required');
    return Object.fromEntries(
        Object.entries(selection).map(([key, expression]) => {
            if (!isAggregate(expression)) {
                const { name, node } = resolve(expression);
                return [
                    key,
                    {
                        node,
                        expression: (db: Knex) => readExpression(db, node, name)
                    }
                ];
            }
            const { kind, column, output } = expression[EXPRESSION];
            const compiled = compileAggregate(
                knex,
                expression,
                c => resolve(c as AliasedColumn<any>).name
            );
            let node: ReadNode;
            if (output) {
                if (!('introspect' in output))
                    throw new ReadSchemaError(
                        'Aggregate output requires an introspectable Framework schema'
                    );
                node = compileReadSchema(output as ReadSchema, false);
            } else if (kind === 'count' || kind === 'countDistinct')
                node = compileReadSchema(number());
            else if (kind === 'sum' || kind === 'avg')
                node = compileReadSchema(string().nullable());
            else
                node = compileReadSchema(
                    resolve(column as AliasedColumn<any>).node.schema.nullable()
                );
            const dateResult =
                !output && node.schema.introspect().type === 'date';
            return [
                key,
                {
                    node: {
                        ...node,
                        decode: (value: unknown, path: string) =>
                            node.decode(
                                dateResult ? value : compiled.decode(value),
                                path
                            )
                    },
                    expression: () =>
                        dateResult
                            ? knex.raw('cast(? as text)', [compiled.native])
                            : compiled.sql,
                    aggregate: true
                }
            ];
        })
    );
}

// @cleverbrush/orm-cli — db push command
//
// Applies schema changes directly to the live database without writing a
// migration file.  Intended for development only.

import readline from 'node:readline';
import {
    applyDiff,
    diffSchema,
    generateCreateTable,
    getPolymorphicVariantSchemas,
    getTableName,
    introspectDatabase,
    isDiffEmpty,
    tableExistsInDb
} from '@cleverbrush/knex-schema';
import type { OrmCliConfig } from '../types.js';

/**
 * Sync every registered entity's schema to the live database without
 * generating a migration file.
 *
 * - New tables are created via {@link generateCreateTable}.
 * - Existing tables are altered via {@link applyDiff}.
 * - All changes run inside a single transaction.
 * - Aborted (no `--yes`) when `NODE_ENV=production`.
 */
export async function push(
    config: OrmCliConfig,
    flags: Record<string, string | true>
): Promise<void> {
    const isProduction = process.env.NODE_ENV === 'production';
    const confirmed = flags['--yes'] === true;

    if (isProduction && !confirmed) {
        console.error(
            '\nError: `db push` is not allowed in NODE_ENV=production ' +
                'without the --yes flag.\n'
        );
        process.exit(1);
    }

    if (!confirmed) {
        const answer = await prompt(
            '\nThis will apply schema changes directly to the database ' +
                '(no migration file will be created).\nContinue? [y/N] '
        );
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
            console.log('Aborted.');
            return;
        }
    }

    // Collect all (schema, tableName) pairs including CTI variant tables
    const tableEntries: { schema: any; tableName: string }[] = [];
    for (const entity of Object.values(config.entities)) {
        const schema = entity.schema;
        const tableName = getTableName(schema);
        tableEntries.push({ schema, tableName });

        for (const vs of getPolymorphicVariantSchemas(schema)) {
            const vt = vs.getExtension('tableName') as string | undefined;
            if (vt) tableEntries.push({ schema: vs, tableName: vt });
        }
    }

    // Deduplicate (STI variants share the base table)
    const seen = new Set<string>();
    const unique = tableEntries.filter(e => {
        if (seen.has(e.tableName)) return false;
        seen.add(e.tableName);
        return true;
    });

    await config.knex.transaction(async trx => {
        let changed = 0;

        for (const { schema, tableName } of unique) {
            const exists = await tableExistsInDb(trx as any, tableName);

            if (!exists) {
                await generateCreateTable(schema)(trx as any);
                console.log(`  + Created table: ${tableName}`);
                changed++;
            } else {
                const dbState = await introspectDatabase(trx as any, tableName);
                const diff = diffSchema(schema, dbState);
                if (!isDiffEmpty(diff)) {
                    await applyDiff(trx as any, diff, tableName);
                    console.log(`  ~ Altered table: ${tableName}`);
                    changed++;
                }
            }
        }

        if (changed === 0) {
            console.log('No schema changes detected.');
        } else {
            console.log(`\nApplied ${changed} table change(s).`);
        }
    });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

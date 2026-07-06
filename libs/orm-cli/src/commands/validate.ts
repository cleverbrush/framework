// @cleverbrush/orm-cli — validate command
//
// Checks configured entities against the live database without applying
// changes or writing migration files.

import type { MigrationDiff } from '@cleverbrush/knex-schema';
import { validateEntitiesAgainstDatabase } from '@cleverbrush/knex-schema';
import type { OrmCliConfig } from '../types.js';

/**
 * Validate every configured entity against the live database.
 *
 * Exits with status 1 when a table is missing or schema drift is detected.
 */
export async function validate(config: OrmCliConfig): Promise<void> {
    const result = await validateEntitiesAgainstDatabase(
        config.knex,
        Object.values(config.entities)
    );

    if (result.valid) {
        console.log(
            `Schema is in sync (${result.checkedTables.length} table(s) checked).`
        );
        return;
    }

    console.error('Schema drift detected:');
    for (const issue of result.issues) {
        if (issue.type === 'missing-table') {
            console.error(`  - Missing table: ${issue.tableName}`);
        } else {
            console.error(
                `  - Drift in ${issue.tableName}: ${summarizeDiff(issue.diff)}`
            );
        }
    }

    process.exit(1);
}

function summarizeDiff(diff: MigrationDiff): string {
    const parts = [
        formatCount(diff.addColumns.length, 'column to add', 'columns to add'),
        formatCount(
            diff.dropColumns.length,
            'column to drop',
            'columns to drop'
        ),
        formatCount(
            diff.alterColumns.length,
            'column to alter',
            'columns to alter'
        ),
        formatCount(diff.addIndexes.length, 'index to add', 'indexes to add'),
        formatCount(
            diff.dropIndexes.length,
            'index to drop',
            'indexes to drop'
        ),
        formatCount(
            diff.addForeignKeys.length,
            'foreign key to add',
            'foreign keys to add'
        ),
        formatCount(
            diff.dropForeignKeys.length,
            'foreign key to drop',
            'foreign keys to drop'
        )
    ].filter((part): part is string => part !== null);

    return parts.length > 0 ? parts.join(', ') : 'unknown drift';
}

function formatCount(
    count: number,
    singular: string,
    plural: string
): string | null {
    if (count === 0) return null;
    return `${count} ${count === 1 ? singular : plural}`;
}

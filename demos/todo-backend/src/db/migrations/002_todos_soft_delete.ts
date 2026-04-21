import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasDeletedAt = await knex.schema.hasColumn('todos', 'deleted_at');

    if (!hasDeletedAt) {
        await knex.schema.alterTable('todos', table => {
            table.timestamp('deleted_at', { useTz: true }).nullable();
        });
    }

    await knex.raw(
        'CREATE INDEX IF NOT EXISTS idx_todos_deleted_at ON todos(deleted_at)'
    );
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw('DROP INDEX IF EXISTS idx_todos_deleted_at');

    const hasDeletedAt = await knex.schema.hasColumn('todos', 'deleted_at');

    if (hasDeletedAt) {
        await knex.schema.alterTable('todos', table => {
            table.dropColumn('deleted_at');
        });
    }
}

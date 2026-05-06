import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.table('todos', (table) => {
        table.binary('attachment_data').nullable();
        table.string('attachment_name', 1024).nullable();
        table.string('attachment_mime_type', 255).nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.table('todos', (table) => {
        table.dropColumn('attachment_data');
        table.dropColumn('attachment_name');
        table.dropColumn('attachment_mime_type');
    });
}

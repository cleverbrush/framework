import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('users', (table) => {
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).alter();
    });

    await knex.schema.alterTable('todo_activity', (table) => {
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).alter();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('todo_activity', (table) => {
        table.timestamp('created_at').notNullable().alter();
    });

    await knex.schema.alterTable('users', (table) => {
        table.timestamp('created_at').notNullable().alter();
    });
}

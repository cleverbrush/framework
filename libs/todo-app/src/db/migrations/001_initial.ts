import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('users', table => {
        table.increments('id').primary();
        table.string('email', 255).notNullable().unique();
        table.string('password_hash', 512).notNullable();
        table.string('role', 50).notNullable().defaultTo('user');
        table
            .timestamp('created_at', { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('todos', table => {
        table.increments('id').primary();
        table.string('title', 500).notNullable();
        table.text('description').nullable();
        table.boolean('completed').notNullable().defaultTo(false);
        table
            .integer('user_id')
            .notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');
        table
            .timestamp('created_at', { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated_at', { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());
        table.index(['user_id'], 'idx_todos_user_id');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('todos');
    await knex.schema.dropTableIfExists('users');
}

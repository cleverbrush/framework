import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('users', (table) => {
        table.increments('id');
        table.string('email').notNullable();
        table.string('password_hash').nullable();
        table.string('role').notNullable();
        table.string('auth_provider').notNullable();
        table.timestamp('created_at').notNullable();
    });

    await knex.schema.createTable('todo_activity_assigned', (table) => {
        table.integer('activity_id').notNullable();
        table.string('type').notNullable();
        table.integer('assigned_to_user_id').notNullable();
    });

    await knex.schema.createTable('todo_activity_commented', (table) => {
        table.integer('activity_id').notNullable();
        table.string('type').notNullable();
        table.string('comment').notNullable();
    });

    await knex.schema.createTable('todos', (table) => {
        table.increments('id');
        table.string('title').notNullable();
        table.string('description').nullable();
        table.boolean('completed').defaultTo(false).notNullable();
        table.integer('user_id').index('idx_todos_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.timestamp('created_at').notNullable();
        table.timestamp('updated_at').notNullable();
        table.specificType('author', 'jsonb').nullable();
        table.specificType('activity', 'text').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();
    });

    await knex.schema.createTable('todo_activity', (table) => {
        table.increments('id');
        table.integer('todo_id').index('idx_todo_activity_todo_id').notNullable().references('id').inTable('todos').onDelete('CASCADE');
        table.string('type').notNullable();
        table.integer('actor_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('completed_at').nullable();
        table.timestamp('created_at').notNullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('todo_activity');

    await knex.schema.dropTableIfExists('todos');

    await knex.schema.dropTableIfExists('todo_activity_commented');

    await knex.schema.dropTableIfExists('todo_activity_assigned');

    await knex.schema.dropTableIfExists('users');
}

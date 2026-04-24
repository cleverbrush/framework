import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // ── Base table (all variants share this) ──────────────────────────────────
    await knex.schema.createTable('todo_activity', table => {
        table.increments('id').primary();
        table
            .integer('todo_id')
            .notNullable()
            .references('id')
            .inTable('todos')
            .onDelete('CASCADE');
        table.string('type', 50).notNullable();
        table
            .integer('actor_user_id')
            .nullable()
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        // STI column — populated only for 'completed' variant
        table.timestamp('completed_at', { useTz: true }).nullable();
        table
            .timestamp('created_at', { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());
        table.index(['todo_id'], 'idx_todo_activity_todo_id');
        table.index(['type'], 'idx_todo_activity_type');
    });

    // ── CTI child: assigned ───────────────────────────────────────────────────
    await knex.schema.createTable('todo_activity_assigned', table => {
        table
            .integer('activity_id')
            .primary()
            .references('id')
            .inTable('todo_activity')
            .onDelete('CASCADE');
        table.string('type', 50).notNullable();
        table
            .integer('assigned_to_user_id')
            .nullable()
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
    });

    // ── CTI child: commented ──────────────────────────────────────────────────
    await knex.schema.createTable('todo_activity_commented', table => {
        table
            .integer('activity_id')
            .primary()
            .references('id')
            .inTable('todo_activity')
            .onDelete('CASCADE');
        table.string('type', 50).notNullable();
        table.text('comment').notNullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('todo_activity_commented');
    await knex.schema.dropTableIfExists('todo_activity_assigned');
    await knex.schema.dropTableIfExists('todo_activity');
}

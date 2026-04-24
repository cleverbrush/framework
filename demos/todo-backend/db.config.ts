// db.config.ts — @cleverbrush/orm-cli configuration for the todo-backend demo.
//
// Run migrations with:
//   npm run db:generate [-- <name>]
//   npm run db:run
//   npm run db:status
//   npm run db:rollback
//
// Sync schema directly (dev only):
//   npm run db:push

import knex from 'knex';
import { defineConfig } from '@cleverbrush/orm-cli';
import {
    entityMap
} from './src/db/schemas.js';

// Resolve connection from env vars with sensible dev defaults.
const db = knex({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        database: process.env.DB_NAME ?? 'todo_db',
        user: process.env.DB_USER ?? 'todo_user',
        password: process.env.DB_PASSWORD ?? 'todo_secret'
    }
});

export default defineConfig({
    knex: db,
    entities: entityMap,
    migrations: {
        directory: './migrations',
        tableName: 'knex_migrations'
    }
});

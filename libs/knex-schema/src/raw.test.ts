// @cleverbrush/knex-schema — rawQuery() tests

import Knex from 'knex';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { number, object, string } from './index.js';
import { rawQuery } from './raw.js';

const Post = object({
    id: number(),
    title: string(),
    authorId: number().hasColumnName('author_id'),
    createdAt: string().hasColumnName('created_at')
}).hasTableName('posts');

const knex = Knex({ client: 'pg' });

afterAll(async () => {
    await knex.destroy();
});

describe('rawQuery', () => {
    it('runs a raw SQL string and maps column names back to property names', async () => {
        const rawSpy = vi.spyOn(knex, 'raw').mockResolvedValueOnce({
            rows: [
                { id: 1, title: 'Hi', author_id: 7, created_at: '2024-01-01' }
            ]
        } as any);

        const rows = await rawQuery(
            knex,
            Post,
            'SELECT * FROM posts WHERE id = ?',
            [1]
        );

        expect(rawSpy).toHaveBeenCalledWith(
            'SELECT * FROM posts WHERE id = ?',
            [1]
        );
        expect(rows).toEqual([
            { id: 1, title: 'Hi', authorId: 7, createdAt: '2024-01-01' }
        ]);

        rawSpy.mockRestore();
    });

    it('defaults bindings to [] when omitted', async () => {
        const rawSpy = vi
            .spyOn(knex, 'raw')
            .mockResolvedValueOnce({ rows: [] } as any);

        await rawQuery(knex, Post, 'SELECT 1');

        expect(rawSpy).toHaveBeenCalledWith('SELECT 1', []);

        rawSpy.mockRestore();
    });

    it('handles drivers that return an array directly (no .rows wrapper)', async () => {
        const rawSpy = vi
            .spyOn(knex, 'raw')
            .mockResolvedValueOnce([
                { id: 2, title: 'X', author_id: 3, created_at: '2024-02-02' }
            ] as any);

        const rows = await rawQuery(knex, Post, 'SELECT *');

        expect(rows).toEqual([
            { id: 2, title: 'X', authorId: 3, createdAt: '2024-02-02' }
        ]);

        rawSpy.mockRestore();
    });

    it('returns [] when rows is not an array', async () => {
        const rawSpy = vi
            .spyOn(knex, 'raw')
            .mockResolvedValueOnce({ rows: { not: 'an array' } } as any);

        const rows = await rawQuery(knex, Post, 'SELECT *');
        expect(rows).toEqual([]);

        rawSpy.mockRestore();
    });

    it('passes through extra columns not in the schema unchanged', async () => {
        const rawSpy = vi.spyOn(knex, 'raw').mockResolvedValueOnce({
            rows: [
                {
                    id: 1,
                    title: 'Hi',
                    author_id: 7,
                    created_at: '2024-01-01',
                    extra_count: 42
                }
            ]
        } as any);

        const rows = await rawQuery(knex, Post, 'SELECT *');

        expect(rows[0]).toMatchObject({
            id: 1,
            authorId: 7,
            createdAt: '2024-01-01',
            extra_count: 42 // unmapped column passes through
        });

        rawSpy.mockRestore();
    });

    it('awaits a Knex query builder directly', async () => {
        const result = [
            { id: 9, title: 'Q', author_id: 1, created_at: '2024-03-03' }
        ];
        const qb = Promise.resolve(result) as any;

        const rows = await rawQuery(knex, Post, qb);

        expect(rows).toEqual([
            { id: 9, title: 'Q', authorId: 1, createdAt: '2024-03-03' }
        ]);
    });
});

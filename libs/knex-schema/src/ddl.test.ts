// @cleverbrush/knex-schema — generateCreateTableSource tests
// (generateCreateTable is already covered in orm.test.ts)

import Knex from 'knex';
import { afterAll, describe, expect, it } from 'vitest';
import {
    any,
    boolean,
    date,
    generateCreateTableSource,
    number,
    object,
    string
} from './index.js';

const knex = Knex({ client: 'pg' });
afterAll(async () => {
    await knex.destroy();
});

// ═══════════════════════════════════════════════════════════════════════════
// Basic column types
// ═══════════════════════════════════════════════════════════════════════════

describe('generateCreateTableSource — basic column types', () => {
    it('generates string column', () => {
        const S = object({
            name: string().required()
        }).hasTableName('items');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.string('name')`);
        expect(up).toContain('.notNullable()');
    });

    it('generates integer column for number', () => {
        const S = object({
            count: number().required()
        }).hasTableName('items');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.integer('count')`);
        expect(up).toContain('.notNullable()');
    });

    it('generates specificType for decimal column type', () => {
        const S = object({
            price: number().decimal(10, 2).required()
        }).hasTableName('items');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.specificType('price', 'decimal(10,2)')`);
    });

    it('generates boolean column', () => {
        const S = object({
            active: boolean().optional()
        }).hasTableName('flags');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.boolean('active')`);
        expect(up).toContain('.nullable()');
    });

    it('generates timestamp column for date', () => {
        const S = object({
            createdAt: date().hasColumnName('created_at').optional()
        }).hasTableName('events');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.timestamp('created_at')`);
        expect(up).toContain('.nullable()');
    });

    it('skips object-typed properties without columnType (navigation props)', () => {
        const S = object({
            id: number().required(),
            meta: object({ key: string() }).optional()
        }).hasTableName('items');
        const { up } = generateCreateTableSource(S);
        expect(up).not.toContain('meta');
        expect(up).toContain(`table.integer('id')`);
    });

    it('generates specificType for columnType override', () => {
        const S = object({
            id: string().columnType('uuid').required()
        }).hasTableName('items');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.specificType('id', 'uuid')`);
    });

    it('generates down statement as dropTableIfExists', () => {
        const S = object({ id: number() }).hasTableName('my_table');
        const { down } = generateCreateTableSource(S);
        expect(down).toContain(`dropTableIfExists('my_table')`);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Primary key
// ═══════════════════════════════════════════════════════════════════════════

describe('generateCreateTableSource — primary key', () => {
    it('generates increments() for auto-increment primary key', () => {
        const S = object({
            id: number().primaryKey()
        }).hasTableName('users');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.increments('id')`);
        // Should NOT have .primary() for auto-increment
        expect(up).not.toContain(`table.increments('id').primary()`);
    });

    it('generates .primary() for non-auto-increment string PK', () => {
        const S = object({
            slug: string().primaryKey().required()
        }).hasTableName('slugs');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`.primary()`);
        expect(up).not.toContain('increments');
    });

    it('generates composite primary key via hasPrimaryKey', () => {
        const S = object({
            postId: number().hasColumnName('post_id').required(),
            tagId: number().hasColumnName('tag_id').required()
        })
            .hasTableName('post_tags')
            .hasPrimaryKey(['post_id', 'tag_id']);
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.primary(["post_id","tag_id"])`);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Constraints and indexes
// ═══════════════════════════════════════════════════════════════════════════

describe('generateCreateTableSource — constraints and indexes', () => {
    it('generates .unique() for column-level unique', () => {
        const S = object({
            email: string().unique().required()
        }).hasTableName('users');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain('.unique()');
    });

    it('generates .unique({ indexName }) for named unique', () => {
        const S = object({
            email: string().unique('unq_email').required()
        }).hasTableName('users');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`unique({ indexName: 'unq_email' })`);
    });

    it('generates .index() for column-level index', () => {
        const S = object({
            slug: string().index().required()
        }).hasTableName('posts');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain('.index()');
    });

    it('generates .index(name) for named column index', () => {
        const S = object({
            slug: string().index('idx_slug').required()
        }).hasTableName('posts');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`.index('idx_slug')`);
    });

    it('generates composite table.index() via hasIndex', () => {
        const S = object({
            a: string().required(),
            b: string().required()
        })
            .hasTableName('pairs')
            .hasIndex(['a', 'b'], { name: 'idx_ab' });
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.index(["a","b"], 'idx_ab')`);
    });

    it('generates composite unique index via hasIndex with unique:true', () => {
        const S = object({
            a: string().required(),
            b: string().required()
        })
            .hasTableName('pairs')
            .hasIndex(['a', 'b'], { unique: true, name: 'unq_ab' });
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(
            `table.unique(["a","b"], { indexName: 'unq_ab' })`
        );
    });

    it('generates composite unique via hasUnique', () => {
        const S = object({
            a: string().required(),
            b: string().required()
        })
            .hasTableName('pairs')
            .hasUnique(['a', 'b'], 'unq_ab');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(
            `table.unique(["a","b"], { indexName: 'unq_ab' })`
        );
    });

    it('generates hasUnique without name', () => {
        const S = object({
            x: string().required()
        })
            .hasTableName('t')
            .hasUnique(['x']);
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.unique(["x"])`);
    });

    it('generates column-level CHECK constraint', () => {
        const S = object({
            role: string().check("role IN ('admin','user')").required()
        }).hasTableName('users');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.check("role IN ('admin','user')")`);
    });

    it('generates table-level CHECK via hasCheck', () => {
        const S = object({
            start: date().required(),
            end: date().required()
        })
            .hasTableName('ranges')
            .hasCheck('end > start');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.check("end > start")`);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Default values
// ═══════════════════════════════════════════════════════════════════════════

describe('generateCreateTableSource — default values', () => {
    it("generates knex.fn.now() for 'now' default", () => {
        const S = object({
            createdAt: date()
                .hasColumnName('created_at')
                .defaultTo('now')
                .required()
        }).hasTableName('events');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain('.defaultTo(knex.fn.now())');
    });

    it('generates literal default for string', () => {
        const S = object({
            status: string().defaultTo('active').required()
        }).hasTableName('users');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`.defaultTo('active')`);
    });

    it('generates literal default for number', () => {
        const S = object({
            count: number().defaultTo(0).required()
        }).hasTableName('items');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain('.defaultTo(0)');
    });

    it('generates knex.raw() for raw default', () => {
        const S = object({
            id: string().defaultToRaw('gen_random_uuid()').required()
        }).hasTableName('items');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`knex.raw('gen_random_uuid()')`);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Foreign key references
// ═══════════════════════════════════════════════════════════════════════════

describe('generateCreateTableSource — foreign key references', () => {
    it('generates .references().inTable()', () => {
        const S = object({
            userId: number()
                .hasColumnName('user_id')
                .references('users', 'id')
                .required()
        }).hasTableName('posts');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`.references('id').inTable('users')`);
    });

    it('generates .onDelete() and .onUpdate()', () => {
        const S = object({
            userId: number()
                .hasColumnName('user_id')
                .references('users', 'id')
                .onDelete('CASCADE')
                .onUpdate('RESTRICT')
                .required()
        }).hasTableName('posts');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`.onDelete('CASCADE')`);
        expect(up).toContain(`.onUpdate('RESTRICT')`);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Raw columns and indexes
// ═══════════════════════════════════════════════════════════════════════════

describe('generateCreateTableSource — raw columns and indexes', () => {
    it('generates specificType for raw columns via hasRawColumn', () => {
        const S = object({
            id: number().primaryKey()
        })
            .hasTableName('search_docs')
            .hasRawColumn('search_vector', 'tsvector');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.specificType('search_vector', 'tsvector')`);
    });

    it('generates await knex.raw() for raw indexes via hasRawIndex', () => {
        const S = object({
            id: number().primaryKey()
        })
            .hasTableName('docs')
            .hasRawIndex(
                'CREATE INDEX idx_fts ON docs USING gin(search_vector)'
            );
        const { up } = generateCreateTableSource(S);
        expect(up).toContain('await knex.raw(');
        expect(up).toContain('CREATE INDEX idx_fts');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// hasTimestamps and softDelete extensions
// ═══════════════════════════════════════════════════════════════════════════

describe('generateCreateTableSource — timestamps and soft delete', () => {
    it('generates created_at and updated_at for hasTimestamps', () => {
        const S = object({
            id: number().primaryKey()
        })
            .hasTableName('posts')
            .hasTimestamps();
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.timestamp('created_at')`);
        expect(up).toContain(`table.timestamp('updated_at')`);
        expect(up).toContain('.notNullable().defaultTo(knex.fn.now())');
    });

    it('generates custom timestamp column names', () => {
        const S = object({
            id: number().primaryKey()
        })
            .hasTableName('posts')
            .hasTimestamps({
                createdAt: 'inserted_at',
                updatedAt: 'modified_at'
            });
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.timestamp('inserted_at')`);
        expect(up).toContain(`table.timestamp('modified_at')`);
    });

    it('generates deleted_at for softDelete', () => {
        const S = object({
            id: number().primaryKey()
        })
            .hasTableName('posts')
            .softDelete();
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.timestamp('deleted_at').nullable()`);
    });

    it('generates custom soft-delete column name', () => {
        const S = object({
            id: number().primaryKey()
        })
            .hasTableName('users')
            .softDelete({ column: 'removed_at' });
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.timestamp('removed_at').nullable()`);
    });

    it('skips properties managed by timestamps in property loop', () => {
        const S = object({
            id: number().primaryKey(),
            createdAt: date().hasColumnName('created_at').optional()
        })
            .hasTableName('posts')
            .hasTimestamps();
        const { up } = generateCreateTableSource(S);
        // 'created_at' should appear only once (from timestamps extension, not property loop)
        const occurrences = (up.match(/created_at/g) ?? []).length;
        expect(occurrences).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// String column with maxLength
// ═══════════════════════════════════════════════════════════════════════════

describe('generateCreateTableSource — string maxLength', () => {
    it('generates table.string(col, maxLen) when maxLength is set', () => {
        const S = object({
            code: string().maxLength(3).required()
        }).hasTableName('codes');
        const { up } = generateCreateTableSource(S);
        expect(up).toContain(`table.string('code', 3)`);
    });
});

describe('generateCreateTableSource — default column type (line 516)', () => {
    it('falls back to specificType text for unknown schema type (any)', () => {
        const S = object({
            id: number().primaryKey(),
            data: any()
        }).hasTableName('mixed');
        const { up } = generateCreateTableSource(S);
        // 'any' type hits the default case -> specificType('data', 'text')
        expect(up).toContain(`table.specificType('data', 'text')`);
    });
});

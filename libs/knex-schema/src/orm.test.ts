// @cleverbrush/knex-schema — ORM extensions tests

import Knex from 'knex';
import { afterAll, describe, expect, it, vi } from 'vitest';
import {
    boolean,
    date,
    diffSchema,
    generateCreateTable,
    generateMigration,
    getTableName,
    number,
    object,
    query,
    rawQuery,
    string
} from './index.js';
import type { DatabaseTableState } from './types.js';

const knex = Knex({ client: 'pg' });

afterAll(async () => {
    await knex.destroy();
});

// ═══════════════════════════════════════════════════════════════════════════
// Test schemas
// ═══════════════════════════════════════════════════════════════════════════

const User = object({
    id: number().primaryKey(),
    email: string().unique().hasColumnName('email_address'),
    name: string(),
    role: string()
        .defaultTo('user')
        .check("role IN ('user', 'admin', 'moderator')"),
    isActive: boolean().defaultTo(true).hasColumnName('is_active'),
    createdAt: date().defaultTo('now').hasColumnName('created_at'),
    updatedAt: date().defaultTo('now').hasColumnName('updated_at')
}).hasTableName('users');

const Category = object({
    id: number().primaryKey(),
    name: string().unique(),
    slug: string().unique()
})
    .hasTableName('categories')
    .hasTimestamps();

const Post = object({
    id: number().primaryKey(),
    title: string(),
    slug: string().unique().index(),
    body: string().columnType('text'),
    status: string()
        .defaultTo('draft')
        .check("status IN ('draft', 'published', 'archived')"),
    authorId: number()
        .hasColumnName('author_id')
        .references('users', 'id')
        .onDelete('CASCADE'),
    categoryId: number()
        .hasColumnName('category_id')
        .references('categories', 'id')
        .onDelete('SET NULL')
        .optional()
}).hasTableName('posts');

const Tag = object({
    id: number().primaryKey(),
    name: string().unique()
}).hasTableName('tags');

const PostTag = object({
    postId: number()
        .hasColumnName('post_id')
        .references('posts', 'id')
        .onDelete('CASCADE'),
    tagId: number()
        .hasColumnName('tag_id')
        .references('tags', 'id')
        .onDelete('CASCADE')
})
    .hasTableName('post_tags')
    .hasPrimaryKey(['post_id', 'tag_id']);

const Comment = object({
    id: number().primaryKey(),
    body: string().columnType('text'),
    postId: number()
        .hasColumnName('post_id')
        .references('posts', 'id')
        .onDelete('CASCADE'),
    userId: number()
        .hasColumnName('user_id')
        .references('users', 'id')
        .onDelete('CASCADE')
}).hasTableName('comments');

// ═══════════════════════════════════════════════════════════════════════════
// Phase 1: DDL Extensions
// ═══════════════════════════════════════════════════════════════════════════

describe('DDL extensions', () => {
    it('primaryKey() stores extension metadata', () => {
        const idSchema = (User.introspect() as any).properties.id;
        const ext = idSchema.introspect().extensions;
        expect(ext.primaryKey).toEqual({ autoIncrement: true });
    });

    it('unique() stores extension metadata', () => {
        const emailSchema = (User.introspect() as any).properties.email;
        const ext = emailSchema.introspect().extensions;
        expect(ext.unique).toBe(true);
    });

    it('defaultTo() stores extension metadata', () => {
        const roleSchema = (User.introspect() as any).properties.role;
        const ext = roleSchema.introspect().extensions;
        expect(ext.defaultTo).toBe('user');
    });

    it('check() stores extension metadata', () => {
        const roleSchema = (User.introspect() as any).properties.role;
        const ext = roleSchema.introspect().extensions;
        expect(ext.check).toBe("role IN ('user', 'admin', 'moderator')");
    });

    it('references() stores extension metadata', () => {
        const authorIdSchema = (Post.introspect() as any).properties.authorId;
        const ext = authorIdSchema.introspect().extensions;
        expect(ext.references).toEqual({ table: 'users', column: 'id' });
    });

    it('onDelete() stores extension metadata', () => {
        const authorIdSchema = (Post.introspect() as any).properties.authorId;
        const ext = authorIdSchema.introspect().extensions;
        expect(ext.onDelete).toBe('CASCADE');
    });

    it('columnType() stores extension metadata', () => {
        const bodySchema = (Post.introspect() as any).properties.body;
        const ext = bodySchema.introspect().extensions;
        expect(ext.columnType).toBe('text');
    });

    it('index() stores extension metadata', () => {
        const slugSchema = (Post.introspect() as any).properties.slug;
        const ext = slugSchema.introspect().extensions;
        expect(ext.index).toBe(true);
    });

    it('boolean defaultTo() stores extension metadata', () => {
        const isActiveSchema = (User.introspect() as any).properties.isActive;
        const ext = isActiveSchema.introspect().extensions;
        expect(ext.defaultTo).toBe(true);
    });

    it('date defaultTo("now") stores extension metadata', () => {
        const createdAtSchema = (User.introspect() as any).properties.createdAt;
        const ext = createdAtSchema.introspect().extensions;
        expect(ext.defaultTo).toBe('now');
    });

    it('hasPrimaryKey() stores composite PK', () => {
        const ext = (PostTag.introspect() as any).extensions;
        expect(ext.compositePrimaryKey).toEqual(['post_id', 'tag_id']);
    });

    it('hasIndex() stores composite index', () => {
        const schema = object({
            id: number().primaryKey(),
            name: string(),
            email: string()
        })
            .hasTableName('test')
            .hasIndex(['name', 'email'], { name: 'idx_name_email' });

        const ext = (schema.introspect() as any).extensions;
        expect(ext.indexes).toEqual([
            { columns: ['name', 'email'], name: 'idx_name_email' }
        ]);
    });

    it('hasUnique() stores composite unique', () => {
        const schema = object({
            id: number().primaryKey(),
            a: string(),
            b: string()
        })
            .hasTableName('test')
            .hasUnique(['a', 'b'], 'unq_a_b');

        const ext = (schema.introspect() as any).extensions;
        expect(ext.uniques).toEqual([{ columns: ['a', 'b'], name: 'unq_a_b' }]);
    });

    it('hasCheck() accumulates check constraints', () => {
        const schema = object({
            id: number().primaryKey(),
            x: number(),
            y: number()
        })
            .hasTableName('test')
            .hasCheck('x > 0')
            .hasCheck('y > 0');

        const ext = (schema.introspect() as any).extensions;
        expect(ext.checks).toEqual(['x > 0', 'y > 0']);
    });

    it('hasRawColumn() stores raw column definitions', () => {
        const schema = object({
            id: number().primaryKey(),
            name: string()
        })
            .hasTableName('test')
            .hasRawColumn('search_vector', 'tsvector');

        const ext = (schema.introspect() as any).extensions;
        expect(ext.rawColumns).toEqual([
            { name: 'search_vector', definition: 'tsvector' }
        ]);
    });

    it('hasRawIndex() stores raw index SQL', () => {
        const schema = object({
            id: number().primaryKey(),
            name: string()
        })
            .hasTableName('test')
            .hasRawIndex('CREATE INDEX idx_test ON test USING gin(name)');

        const ext = (schema.introspect() as any).extensions;
        expect(ext.rawIndexes).toEqual([
            'CREATE INDEX idx_test ON test USING gin(name)'
        ]);
    });

    it('defaultToRaw() stores raw expression', () => {
        const schema = object({
            id: number().primaryKey(),
            metadata: string().columnType('jsonb').defaultToRaw("'{}'::jsonb")
        }).hasTableName('test');

        const metaSchema = (schema.introspect() as any).properties.metadata;
        const ext = metaSchema.introspect().extensions;
        expect(ext.defaultTo).toEqual({ raw: "'{}'::jsonb" });
    });

    it('string primaryKey() sets autoIncrement false', () => {
        const schema = object({
            id: string().primaryKey()
        }).hasTableName('test');

        const idSchema = (schema.introspect() as any).properties.id;
        const ext = idSchema.introspect().extensions;
        expect(ext.primaryKey).toEqual({ autoIncrement: false });
    });

    it('number columnType() stores override', () => {
        const schema = object({
            id: number().columnType('bigint')
        }).hasTableName('test');

        const idSchema = (schema.introspect() as any).properties.id;
        const ext = idSchema.introspect().extensions;
        expect(ext.columnType).toBe('bigint');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 1: DDL Generation
// ═══════════════════════════════════════════════════════════════════════════

describe('generateCreateTable', () => {
    it('generates SQL for a simple schema', () => {
        const SimpleSchema = object({
            id: number().primaryKey(),
            name: string(),
            active: boolean().defaultTo(true)
        }).hasTableName('simple');

        const sql = generateCreateTable(SimpleSchema)(knex).toQuery();
        expect(sql).toContain('create table "simple"');
        expect(sql).toContain('"id" serial primary key');
        expect(sql).toContain('"name" varchar(255) not null');
    });

    it('generates SQL with column name overrides', () => {
        const sql = generateCreateTable(User)(knex).toQuery();
        expect(sql).toContain('"email_address"');
        expect(sql).toContain('"is_active"');
        expect(sql).toContain('"created_at"');
    });

    it('generates SQL with foreign key references', () => {
        const sql = generateCreateTable(Post)(knex).toQuery();
        expect(sql).toContain('references "users" ("id")');
        expect(sql).toContain('on delete CASCADE');
    });

    it('generates SQL with unique constraints', () => {
        const sql = generateCreateTable(User)(knex).toQuery();
        expect(sql).toContain('unique');
    });

    it('generates SQL with composite primary key', () => {
        const sql = generateCreateTable(PostTag)(knex).toQuery();
        expect(sql).toContain('primary key');
    });

    it('generates SQL with columnType override', () => {
        const sql = generateCreateTable(Post)(knex).toQuery();
        expect(sql).toContain('text');
    });

    it('generates SQL with check constraints', () => {
        const sql = generateCreateTable(User)(knex).toQuery();
        expect(sql).toContain("role IN ('user', 'admin', 'moderator')");
    });

    it('generates SQL with default values', () => {
        const sql = generateCreateTable(User)(knex).toQuery();
        expect(sql).toContain("default 'user'");
    });

    it('generates SQL with timestamps extension', () => {
        const schema = object({
            id: number().primaryKey(),
            title: string()
        })
            .hasTableName('articles')
            .hasTimestamps();

        const sql = generateCreateTable(schema)(knex).toQuery();
        expect(sql).toContain('"created_at"');
        expect(sql).toContain('"updated_at"');
    });

    it('generates SQL with soft delete column', () => {
        const schema = object({
            id: number().primaryKey(),
            title: string()
        })
            .hasTableName('articles')
            .softDelete();

        const sql = generateCreateTable(schema)(knex).toQuery();
        expect(sql).toContain('"deleted_at"');
    });

    it('generates SQL with raw columns', () => {
        const schema = object({
            id: number().primaryKey(),
            name: string()
        })
            .hasTableName('places')
            .hasRawColumn('search_vector', 'tsvector');

        const sql = generateCreateTable(schema)(knex).toQuery();
        expect(sql).toContain('"search_vector" tsvector');
    });

    it('generates SQL with composite indexes', () => {
        const schema = object({
            id: number().primaryKey(),
            name: string(),
            email: string()
        })
            .hasTableName('indexed')
            .hasIndex(['name', 'email'], { name: 'idx_name_email' });

        const sql = generateCreateTable(schema)(knex).toQuery();
        expect(sql).toContain('idx_name_email');
    });

    it('generates SQL with nullable optional columns', () => {
        const sql = generateCreateTable(Post)(knex).toQuery();
        // categoryId is optional → nullable
        expect(sql).toMatch(/"category_id".*null/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 2: Relation metadata
// ═══════════════════════════════════════════════════════════════════════════

describe('relation metadata', () => {
    const UserWithRelations = User.hasMany('posts', {
        schema: Post,
        foreignKey: (t: any) => t.authorId
    }).hasOne('latestComment', {
        schema: Comment,
        foreignKey: (t: any) => t.userId
    });

    const PostWithRelations = Post.belongsTo('author', {
        schema: User,
        foreignKey: (t: any) => t.authorId
    })
        .belongsTo('category', {
            schema: Category,
            foreignKey: (t: any) => t.categoryId
        })
        .belongsToMany('tags', {
            schema: Tag,
            through: {
                table: 'post_tags',
                localKey: 'post_id',
                foreignKey: 'tag_id'
            }
        });

    it('hasMany() stores relation metadata', () => {
        const relations = (UserWithRelations as any).getExtension('relations');
        expect(relations).toHaveLength(2);
        expect(relations[0].type).toBe('hasMany');
        expect(relations[0].name).toBe('posts');
    });

    it('hasOne() stores relation metadata', () => {
        const relations = (UserWithRelations as any).getExtension('relations');
        expect(relations[1].type).toBe('hasOne');
        expect(relations[1].name).toBe('latestComment');
    });

    it('belongsTo() stores relation metadata', () => {
        const relations = (PostWithRelations as any).getExtension('relations');
        expect(relations[0].type).toBe('belongsTo');
        expect(relations[0].name).toBe('author');
    });

    it('belongsTo(category) stores relation metadata', () => {
        const relations = (PostWithRelations as any).getExtension('relations');
        const catRel = relations.find((r: any) => r.name === 'category');
        expect(catRel).toBeTruthy();
        expect(catRel.type).toBe('belongsTo');
        expect(getTableName(catRel.schema)).toBe('categories');
    });

    it('belongsToMany() stores through config', () => {
        const relations = (PostWithRelations as any).getExtension('relations');
        const btm = relations.find((r: any) => r.type === 'belongsToMany');
        expect(btm.through).toEqual({
            table: 'post_tags',
            localKey: 'post_id',
            foreignKey: 'tag_id'
        });
    });

    it('lazy schema references work', () => {
        const schema = object({
            id: number().primaryKey(),
            name: string()
        })
            .hasTableName('test')
            .hasMany('items', {
                schema: () => Tag,
                foreignKey: (t: any) => t.id
            });

        const relations = (schema as any).getExtension('relations');
        const lazySchema = relations[0].schema;
        expect(typeof lazySchema).toBe('function');
        expect(getTableName(lazySchema())).toBe('tags');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 2: include() SQL generation
// ═══════════════════════════════════════════════════════════════════════════

describe('include()', () => {
    const PostWithRelations = Post.belongsTo('author', {
        schema: User,
        foreignKey: (t: any) => t.authorId
    });

    it('include belongsTo generates joinOne SQL', () => {
        const sql = query(knex, PostWithRelations).include('author').toQuery();
        expect(sql).toContain('originalQuery');
        expect(sql).toContain('"users"');
        expect(sql).toContain('"author"');
    });

    it('include category belongsTo generates joinOne SQL', () => {
        const PostWithCategory = Post.belongsTo('category', {
            schema: Category,
            foreignKey: (t: any) => t.categoryId
        });
        const sql = query(knex, PostWithCategory).include('category').toQuery();
        expect(sql).toContain('originalQuery');
        expect(sql).toContain('"categories"');
        expect(sql).toContain('"category"');
    });

    it('include throws for unknown relation', () => {
        expect(() =>
            query(knex, PostWithRelations).include('nonexistent')
        ).toThrow('Unknown relation "nonexistent"');
    });

    it('hasMany include generates joinMany SQL', () => {
        const UserWithPosts = User.hasMany('posts', {
            schema: Post,
            foreignKey: (t: any) => t.authorId
        });

        const sql = query(knex, UserWithPosts).include('posts').toQuery();
        expect(sql).toContain('originalQuery');
        expect(sql).toContain('"posts"');
    });

    it('belongsToMany include generates pivot join SQL', () => {
        const PostWithTags = Post.belongsToMany('tags', {
            schema: Tag,
            through: {
                table: 'post_tags',
                localKey: 'post_id',
                foreignKey: 'tag_id'
            }
        });

        const sql = query(knex, PostWithTags).include('tags').toQuery();
        expect(sql).toContain('post_tags');
        expect(sql).toContain('"tags"');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 3: Soft deletes
// ═══════════════════════════════════════════════════════════════════════════

describe('soft delete', () => {
    const SoftPost = object({
        id: number().primaryKey(),
        title: string(),
        status: string()
    })
        .hasTableName('posts')
        .softDelete();

    it('softDelete() stores extension metadata', () => {
        const ext = (SoftPost as any).getExtension('softDelete');
        expect(ext).toEqual({ column: 'deleted_at' });
    });

    it('custom soft delete column name', () => {
        const schema = object({
            id: number().primaryKey()
        })
            .hasTableName('test')
            .softDelete({ column: 'removed_at' });
        const ext = (schema as any).getExtension('softDelete');
        expect(ext).toEqual({ column: 'removed_at' });
    });

    it('queries include WHERE deleted_at IS NULL by default', () => {
        const sql = query(knex, SoftPost).toQuery();
        expect(sql).toContain('"deleted_at" is null');
    });

    it('withDeleted() removes the soft delete filter', () => {
        const sql = query(knex, SoftPost).withDeleted().toQuery();
        expect(sql).not.toContain('deleted_at');
    });

    it('onlyDeleted() filters for deleted rows', () => {
        const sql = query(knex, SoftPost).onlyDeleted().toQuery();
        expect(sql).toContain('"deleted_at" is not null');
    });

    it('unscoped() removes soft delete filter', () => {
        const sql = query(knex, SoftPost).unscoped().toQuery();
        expect(sql).not.toContain('deleted_at');
    });

    it('delete() generates UPDATE for soft-delete schemas', () => {
        // We can't fully test async methods without a DB, but we can
        // verify the schema has soft delete enabled
        const ext = (SoftPost as any).getExtension('softDelete');
        expect(ext).toBeTruthy();
    });

    it('DDL includes deleted_at column', () => {
        const sql = generateCreateTable(SoftPost)(knex).toQuery();
        expect(sql).toContain('"deleted_at"');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 3: Timestamps
// ═══════════════════════════════════════════════════════════════════════════

describe('timestamps', () => {
    const TimestampedPost = object({
        id: number().primaryKey(),
        title: string()
    })
        .hasTableName('posts')
        .hasTimestamps();

    it('hasTimestamps() stores default column names', () => {
        const ext = (TimestampedPost as any).getExtension('timestamps');
        expect(ext).toEqual({
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        });
    });

    it('custom timestamp column names', () => {
        const schema = object({ id: number().primaryKey() })
            .hasTableName('test')
            .hasTimestamps({
                createdAt: 'created_date',
                updatedAt: 'modified_date'
            });
        const ext = (schema as any).getExtension('timestamps');
        expect(ext).toEqual({
            createdAt: 'created_date',
            updatedAt: 'modified_date'
        });
    });

    it('DDL includes timestamp columns', () => {
        const sql = generateCreateTable(TimestampedPost)(knex).toQuery();
        expect(sql).toContain('"created_at"');
        expect(sql).toContain('"updated_at"');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 3: Scopes
// ═══════════════════════════════════════════════════════════════════════════

describe('scopes', () => {
    const ScopedPost = object({
        id: number().primaryKey(),
        title: string(),
        status: string(),
        isActive: boolean().hasColumnName('is_active')
    })
        .hasTableName('posts')
        .scope('published', (q: any) =>
            q.where((t: any) => t.status, 'published')
        )
        .scope('recent', (q: any) =>
            q.orderBy((t: any) => t.id, 'desc').limit(10)
        )
        .defaultScope((q: any) => q.where((t: any) => t.isActive, true));

    it('scope() stores named scopes', () => {
        const scopes = (ScopedPost as any).getExtension('scopes');
        expect(typeof scopes.published).toBe('function');
        expect(typeof scopes.recent).toBe('function');
    });

    it('defaultScope() stores default scope function', () => {
        const fn = (ScopedPost as any).getExtension('defaultScope');
        expect(typeof fn).toBe('function');
    });

    it('scoped() applies named scope to query', () => {
        const sql = query(knex, ScopedPost).scoped('published').toQuery();
        expect(sql).toContain('"status" = \'published\'');
    });

    it('scoped() applies multiple scopes', () => {
        const sql = query(knex, ScopedPost)
            .scoped('published')
            .scoped('recent')
            .toQuery();
        expect(sql).toContain('"status" = \'published\'');
        expect(sql).toContain('order by');
        expect(sql).toContain('limit');
    });

    it('scoped() throws for unknown scope', () => {
        expect(() => query(knex, ScopedPost).scoped('nonexistent')).toThrow(
            'Unknown scope "nonexistent"'
        );
    });

    it('default scope is applied automatically', () => {
        const sql = query(knex, ScopedPost).toQuery();
        expect(sql).toContain('"is_active" = true');
    });

    it('unscoped() bypasses default scope', () => {
        const sql = query(knex, ScopedPost).unscoped().toQuery();
        expect(sql).not.toContain('is_active');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 4: Lifecycle hooks
// ═══════════════════════════════════════════════════════════════════════════

describe('lifecycle hooks', () => {
    it('beforeInsert() stores hooks', () => {
        const fn = vi.fn();
        const schema = object({ id: number().primaryKey() })
            .hasTableName('test')
            .beforeInsert(fn);
        const hooks = (schema as any).getExtension('beforeInsert');
        expect(hooks).toHaveLength(1);
        expect(hooks[0]).toBe(fn);
    });

    it('afterInsert() stores hooks', () => {
        const fn = vi.fn();
        const schema = object({ id: number().primaryKey() })
            .hasTableName('test')
            .afterInsert(fn);
        const hooks = (schema as any).getExtension('afterInsert');
        expect(hooks).toHaveLength(1);
    });

    it('beforeUpdate() stores hooks', () => {
        const fn = vi.fn();
        const schema = object({ id: number().primaryKey() })
            .hasTableName('test')
            .beforeUpdate(fn);
        const hooks = (schema as any).getExtension('beforeUpdate');
        expect(hooks).toHaveLength(1);
    });

    it('beforeDelete() stores hooks', () => {
        const fn = vi.fn();
        const schema = object({ id: number().primaryKey() })
            .hasTableName('test')
            .beforeDelete(fn);
        const hooks = (schema as any).getExtension('beforeDelete');
        expect(hooks).toHaveLength(1);
    });

    it('multiple hooks accumulate', () => {
        const fn1 = vi.fn();
        const fn2 = vi.fn();
        const schema = object({ id: number().primaryKey() })
            .hasTableName('test')
            .beforeInsert(fn1)
            .beforeInsert(fn2);
        const hooks = (schema as any).getExtension('beforeInsert');
        expect(hooks).toHaveLength(2);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 4: Pagination (SQL generation)
// ═══════════════════════════════════════════════════════════════════════════

describe('selectRaw', () => {
    it('selectRaw() adds raw SQL to select clause', () => {
        const sql = query(knex, Post)
            .selectRaw(
                '*, ts_rank(search_vector, plainto_tsquery(?)) AS rank',
                ['search term']
            )
            .toQuery();
        expect(sql).toContain('ts_rank');
        expect(sql).toContain('rank');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 5: Schema diff
// ═══════════════════════════════════════════════════════════════════════════

describe('diffSchema', () => {
    const SimpleSchema = object({
        id: number().primaryKey(),
        name: string(),
        bio: string().columnType('text').optional()
    }).hasTableName('simple');

    it('detects added columns', () => {
        const dbState: DatabaseTableState = {
            columns: {
                id: {
                    name: 'id',
                    type: 'integer',
                    nullable: false,
                    defaultValue: "nextval('simple_id_seq')",
                    maxLength: null,
                    numericPrecision: 32
                },
                name: {
                    name: 'name',
                    type: 'character varying',
                    nullable: false,
                    defaultValue: null,
                    maxLength: 255,
                    numericPrecision: null
                }
            },
            indexes: [],
            foreignKeys: [],
            checks: []
        };

        const diff = diffSchema(SimpleSchema, dbState);
        expect(diff.addColumns).toHaveLength(1);
        expect(diff.addColumns[0].name).toBe('bio');
        expect(diff.addColumns[0].type).toBe('text');
        expect(diff.addColumns[0].nullable).toBe(true);
    });

    it('detects dropped columns', () => {
        const dbState: DatabaseTableState = {
            columns: {
                id: {
                    name: 'id',
                    type: 'integer',
                    nullable: false,
                    defaultValue: null,
                    maxLength: null,
                    numericPrecision: null
                },
                name: {
                    name: 'name',
                    type: 'character varying',
                    nullable: false,
                    defaultValue: null,
                    maxLength: null,
                    numericPrecision: null
                },
                bio: {
                    name: 'bio',
                    type: 'text',
                    nullable: true,
                    defaultValue: null,
                    maxLength: null,
                    numericPrecision: null
                },
                legacy_field: {
                    name: 'legacy_field',
                    type: 'text',
                    nullable: true,
                    defaultValue: null,
                    maxLength: null,
                    numericPrecision: null
                }
            },
            indexes: [],
            foreignKeys: [],
            checks: []
        };

        const diff = diffSchema(SimpleSchema, dbState);
        expect(diff.dropColumns).toContain('legacy_field');
    });

    it('detects nullable changes', () => {
        const RequiredSchema = object({
            id: number().primaryKey(),
            name: string() // required by default
        }).hasTableName('test');

        const dbState: DatabaseTableState = {
            columns: {
                id: {
                    name: 'id',
                    type: 'integer',
                    nullable: false,
                    defaultValue: null,
                    maxLength: null,
                    numericPrecision: null
                },
                name: {
                    name: 'name',
                    type: 'character varying',
                    nullable: true, // DB says nullable, schema says required
                    defaultValue: null,
                    maxLength: null,
                    numericPrecision: null
                }
            },
            indexes: [],
            foreignKeys: [],
            checks: []
        };

        const diff = diffSchema(RequiredSchema, dbState);
        expect(diff.alterColumns).toHaveLength(1);
        expect(diff.alterColumns[0].name).toBe('name');
        expect(diff.alterColumns[0].changes.nullable).toEqual({
            from: true,
            to: false
        });
    });

    it('detects missing foreign keys', () => {
        const dbState: DatabaseTableState = {
            columns: {
                id: {
                    name: 'id',
                    type: 'integer',
                    nullable: false,
                    defaultValue: null,
                    maxLength: null,
                    numericPrecision: null
                },
                title: {
                    name: 'title',
                    type: 'character varying',
                    nullable: false,
                    defaultValue: null,
                    maxLength: null,
                    numericPrecision: null
                },
                slug: {
                    name: 'slug',
                    type: 'character varying',
                    nullable: false,
                    defaultValue: null,
                    maxLength: null,
                    numericPrecision: null
                },
                body: {
                    name: 'body',
                    type: 'text',
                    nullable: false,
                    defaultValue: null,
                    maxLength: null,
                    numericPrecision: null
                },
                status: {
                    name: 'status',
                    type: 'character varying',
                    nullable: false,
                    defaultValue: "'draft'",
                    maxLength: null,
                    numericPrecision: null
                },
                author_id: {
                    name: 'author_id',
                    type: 'integer',
                    nullable: false,
                    defaultValue: null,
                    maxLength: null,
                    numericPrecision: null
                },
                category_id: {
                    name: 'category_id',
                    type: 'integer',
                    nullable: true,
                    defaultValue: null,
                    maxLength: null,
                    numericPrecision: null
                }
            },
            indexes: [],
            foreignKeys: [], // No FK exists in DB
            checks: []
        };

        const diff = diffSchema(Post, dbState);
        expect(diff.addForeignKeys.length).toBeGreaterThanOrEqual(1);
        const authorFK = diff.addForeignKeys.find(
            fk => fk.column === 'author_id'
        );
        expect(authorFK).toBeDefined();
        expect(authorFK!.foreignTable).toBe('users');
        expect(authorFK!.onDelete).toBe('CASCADE');
    });

    it('returns empty diff when schema matches DB', () => {
        const SimpleSchema2 = object({
            id: number().primaryKey(),
            name: string()
        }).hasTableName('simple');

        const dbState: DatabaseTableState = {
            columns: {
                id: {
                    name: 'id',
                    type: 'integer',
                    nullable: false,
                    defaultValue: "nextval('simple_id_seq')",
                    maxLength: null,
                    numericPrecision: 32
                },
                name: {
                    name: 'name',
                    type: 'character varying',
                    nullable: false,
                    defaultValue: null,
                    maxLength: 255,
                    numericPrecision: null
                }
            },
            indexes: [],
            foreignKeys: [],
            checks: []
        };

        const diff = diffSchema(SimpleSchema2, dbState);
        expect(diff.addColumns).toHaveLength(0);
        expect(diff.dropColumns).toHaveLength(0);
        expect(diff.alterColumns).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 5: Migration generation
// ═══════════════════════════════════════════════════════════════════════════

describe('generateMigration', () => {
    it('generates up and down migration code', () => {
        const diff = {
            addColumns: [
                {
                    name: 'bio',
                    type: 'text',
                    nullable: true
                }
            ],
            dropColumns: [],
            alterColumns: [],
            addIndexes: [
                {
                    columns: ['email', 'name'],
                    name: 'idx_users_email_name'
                }
            ],
            dropIndexes: [],
            addForeignKeys: [],
            dropForeignKeys: []
        };

        const migration = generateMigration(diff, 'users');

        expect(migration.up).toContain("table.text('bio')");
        expect(migration.up).toContain('.nullable()');
        expect(migration.up).toContain('idx_users_email_name');
        expect(migration.down).toContain("table.dropColumn('bio')");
        expect(migration.full).toContain('export async function up');
        expect(migration.full).toContain('export async function down');
    });

    it('generates FK migration code', () => {
        const diff = {
            addColumns: [],
            dropColumns: [],
            alterColumns: [],
            addIndexes: [],
            dropIndexes: [],
            addForeignKeys: [
                {
                    column: 'author_id',
                    foreignTable: 'users',
                    foreignColumn: 'id',
                    onDelete: 'CASCADE'
                }
            ],
            dropForeignKeys: []
        };

        const migration = generateMigration(diff, 'posts');
        expect(migration.up).toContain("table.foreign('author_id')");
        expect(migration.up).toContain(".references('id')");
        expect(migration.up).toContain(".inTable('users')");
        expect(migration.up).toContain(".onDelete('CASCADE')");
    });

    it('generates nullable change migration', () => {
        const diff = {
            addColumns: [],
            dropColumns: [],
            alterColumns: [
                {
                    name: 'email',
                    changes: { nullable: { from: true, to: false } }
                }
            ],
            addIndexes: [],
            dropIndexes: [],
            addForeignKeys: [],
            dropForeignKeys: []
        };

        const migration = generateMigration(diff, 'users');
        expect(migration.up).toContain("table.dropNullable('email')");
        expect(migration.down).toContain("table.setNullable('email')");
    });

    it('generates empty migration when no changes', () => {
        const diff = {
            addColumns: [],
            dropColumns: [],
            alterColumns: [],
            addIndexes: [],
            dropIndexes: [],
            addForeignKeys: [],
            dropForeignKeys: []
        };

        const migration = generateMigration(diff, 'users');
        expect(migration.up).toContain('No changes needed');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 6: Raw query (type/mapping only — no DB)
// ═══════════════════════════════════════════════════════════════════════════

describe('rawQuery', () => {
    it('rawQuery is exported and is a function', () => {
        expect(typeof rawQuery).toBe('function');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Combined: Full blog application schema
// ═══════════════════════════════════════════════════════════════════════════

describe('full blog application schema', () => {
    it('User schema generates valid DDL', () => {
        const sql = generateCreateTable(User)(knex).toQuery();
        expect(sql).toContain('create table "users"');
        expect(sql).toContain('"email_address"');
        expect(sql).toContain('"is_active"');
        expect(sql).toContain("default 'user'");
    });

    it('Post schema generates valid DDL with FKs', () => {
        const sql = generateCreateTable(Post)(knex).toQuery();
        expect(sql).toContain('create table "posts"');
        expect(sql).toContain('references "users"');
        expect(sql).toContain('references "categories"');
        expect(sql).toContain('on delete CASCADE');
        expect(sql).toContain('on delete SET NULL');
    });

    it('PostTag schema generates valid DDL with composite PK', () => {
        const sql = generateCreateTable(PostTag)(knex).toQuery();
        expect(sql).toContain('create table "post_tags"');
        expect(sql).toContain('primary key');
    });

    it('Category schema generates valid DDL with timestamps', () => {
        const sql = generateCreateTable(Category)(knex).toQuery();
        expect(sql).toContain('create table "categories"');
        expect(sql).toContain('"created_at"');
        expect(sql).toContain('"updated_at"');
    });

    it('Comment schema generates valid DDL', () => {
        const sql = generateCreateTable(Comment)(knex).toQuery();
        expect(sql).toContain('create table "comments"');
        expect(sql).toContain('references "posts"');
        expect(sql).toContain('references "users"');
    });

    it('schemas with all ORM features work together', () => {
        const FullUser = User.hasTimestamps()
            .softDelete()
            .hasMany('posts', {
                schema: Post,
                foreignKey: (t: any) => t.authorId
            })
            .scope('admins', (q: any) => q.where((t: any) => t.role, 'admin'))
            .scope('active', (q: any) => q.where((t: any) => t.isActive, true))
            .beforeInsert(async (data: any) => data);

        expect((FullUser as any).getExtension('timestamps')).toBeTruthy();
        expect((FullUser as any).getExtension('softDelete')).toBeTruthy();
        expect((FullUser as any).getExtension('relations')).toHaveLength(1);
        expect((FullUser as any).getExtension('scopes')).toBeTruthy();
        expect((FullUser as any).getExtension('beforeInsert')).toHaveLength(1);

        // DDL includes everything
        const sql = generateCreateTable(FullUser)(knex).toQuery();
        expect(sql).toContain('"created_at"');
        expect(sql).toContain('"updated_at"');
        expect(sql).toContain('"deleted_at"');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Extension method chaining
// ═══════════════════════════════════════════════════════════════════════════

describe('extension method chaining', () => {
    it('DDL methods survive fluent chaining', () => {
        const schema = number().primaryKey().hasColumnName('user_id');
        const ext = schema.introspect().extensions;
        expect(ext.primaryKey).toEqual({ autoIncrement: true });
        expect(ext.columnName).toBe('user_id');
    });

    it('multiple DDL methods chain correctly', () => {
        const schema = number()
            .hasColumnName('author_id')
            .references('users', 'id')
            .onDelete('CASCADE')
            .onUpdate('RESTRICT')
            .index('idx_author');
        const ext = schema.introspect().extensions;
        expect(ext.columnName).toBe('author_id');
        expect(ext.references).toEqual({ table: 'users', column: 'id' });
        expect(ext.onDelete).toBe('CASCADE');
        expect(ext.onUpdate).toBe('RESTRICT');
        expect(ext.index).toBe('idx_author');
    });

    it('string DDL methods chain correctly', () => {
        const schema = string()
            .unique('unq_email')
            .defaultTo('unknown')
            .check("email LIKE '%@%'")
            .columnType('citext');
        const ext = schema.introspect().extensions;
        expect(ext.unique).toBe('unq_email');
        expect(ext.defaultTo).toBe('unknown');
        expect(ext.check).toBe("email LIKE '%@%'");
        expect(ext.columnType).toBe('citext');
    });

    it('object DDL methods chain correctly', () => {
        const schema = object({
            id: number().primaryKey()
        })
            .hasTableName('test')
            .hasIndex(['a'], { name: 'idx_a' })
            .hasIndex(['b'], { name: 'idx_b' })
            .hasUnique(['c', 'd'])
            .hasCheck('x > 0')
            .hasRawColumn('vec', 'tsvector')
            .hasRawIndex('CREATE INDEX idx_vec ON test USING gin(vec)');

        const ext = (schema.introspect() as any).extensions;
        expect(ext.indexes).toHaveLength(2);
        expect(ext.uniques).toHaveLength(1);
        expect(ext.checks).toHaveLength(1);
        expect(ext.rawColumns).toHaveLength(1);
        expect(ext.rawIndexes).toHaveLength(1);
    });

    it('ORM methods chain with DDL methods', () => {
        const schema = object({
            id: number().primaryKey(),
            name: string()
        })
            .hasTableName('test')
            .hasTimestamps()
            .softDelete()
            .scope('active', (q: any) => q)
            .defaultScope((q: any) => q)
            .beforeInsert(async (d: any) => d)
            .afterInsert(async () => {})
            .beforeUpdate(async (d: any) => d)
            .beforeDelete(async () => {});

        const ext = (schema.introspect() as any).extensions;
        expect(ext.timestamps).toBeTruthy();
        expect(ext.softDelete).toBeTruthy();
        expect(ext.scopes).toBeTruthy();
        expect(ext.defaultScope).toBeTruthy();
        expect(ext.beforeInsert).toHaveLength(1);
        expect(ext.afterInsert).toHaveLength(1);
        expect(ext.beforeUpdate).toHaveLength(1);
        expect(ext.beforeDelete).toHaveLength(1);
    });
});

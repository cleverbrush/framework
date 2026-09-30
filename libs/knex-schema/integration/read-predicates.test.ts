import { randomUUID } from 'node:crypto';
import { mapper } from '@cleverbrush/mapper';
import {
    aggregate,
    alias,
    array,
    createDb,
    date,
    defineEntity,
    eq,
    number,
    object,
    query,
    string
} from '@cleverbrush/orm';
import Knex from 'knex';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const connection = process.env.QUERY_TEST_DATABASE_URL;
if (!connection) throw new Error('QUERY_TEST_DATABASE_URL is required');
const knex = Knex({ client: 'pg', connection });
const prefix = `cb_pred_${randomUUID().replaceAll('-', '')}`;
const names = {
    projects: `${prefix}_projects`,
    tasks: `${prefix}_tasks`,
    labels: `${prefix}_labels`,
    links: `${prefix}_links`
};
const Task = object({
    id: number().primaryKey(),
    projectId: number().hasColumnName('project_id'),
    title: string(),
    kind: string(),
    amount: number().decimal(24, 6),
    done: date().optional()
}).hasTableName(names.tasks);
const Project = object({
    id: number().primaryKey(),
    ownerId: number().hasColumnName('owner_id'),
    name: string()
}).hasTableName(names.projects);
const Label = object({
    id: number().primaryKey(),
    projectId: number().hasColumnName('project_id'),
    name: string()
}).hasTableName(names.labels);
const Link = object({
    taskId: number().hasColumnName('task_id'),
    labelId: number().hasColumnName('label_id')
}).hasTableName(names.links);
const ProjectEntity = defineEntity(
    Project.addProp('tasks', array(Task).optional())
).hasMany(
    p => p.tasks,
    p => p.id,
    t => t.projectId
);
const timestamp = '2026-09-30T12:00:00.123456Z';

beforeAll(async () => {
    await knex.schema.createTable(names.projects, t => {
        t.integer('id').primary();
        t.integer('owner_id');
        t.text('name');
    });
    await knex.schema.createTable(names.tasks, t => {
        t.integer('id').primary();
        t.integer('project_id');
        t.text('title');
        t.text('kind');
        t.decimal('amount', 24, 6);
        t.timestamp('done', { useTz: true });
    });
    await knex.schema.createTable(names.labels, t => {
        t.integer('id').primary();
        t.integer('project_id');
        t.text('name');
    });
    await knex.schema.createTable(names.links, t => {
        t.integer('task_id');
        t.integer('label_id');
    });
    await knex(names.projects).insert([
        { id: 1, owner_id: 1, name: 'Alpha' },
        { id: 2, owner_id: 1, name: 'Beta' },
        { id: 3, owner_id: 2, name: 'Private' }
    ]);
    await knex(names.tasks).insert([
        {
            id: 101,
            project_id: 1,
            title: 'literal 50%_!',
            kind: 'task',
            amount: '9007199254740993.000001',
            done: timestamp
        },
        {
            id: 102,
            project_id: 1,
            title: 'label match',
            kind: 'task',
            amount: '12.340000',
            done: null
        },
        {
            id: 103,
            project_id: 2,
            title: 'other project',
            kind: 'task',
            amount: '1.000000',
            done: null
        },
        {
            id: 104,
            project_id: 1,
            title: 'milestone',
            kind: 'milestone',
            amount: '2.000000',
            done: null
        },
        {
            id: 201,
            project_id: 3,
            title: 'literal 50%_!',
            kind: 'task',
            amount: '3.000000',
            done: null
        }
    ]);
    await knex(names.labels).insert([
        { id: 1, project_id: 1, name: 'Alpha' },
        { id: 2, project_id: 1, name: 'Beta' },
        { id: 3, project_id: 1, name: 'Unused' },
        { id: 4, project_id: 3, name: 'Private' }
    ]);
    await knex(names.links).insert([
        { task_id: 101, label_id: 1 },
        { task_id: 102, label_id: 1 },
        { task_id: 102, label_id: 2 },
        { task_id: 201, label_id: 2 }
    ]);
});
afterAll(async () => {
    for (const name of [names.links, names.labels, names.tasks, names.projects])
        await knex.schema.dropTableIfExists(name);
    await knex.destroy();
});

describe('schema-aware read predicates against PostgreSQL', () => {
    it('keeps outer access filters around grouped raw search and correlated EXISTS', async () => {
        const base = query(knex, alias(Task, 'task'))
            .withRowSchema()
            .join(alias(Project, 'project'), t =>
                eq(t.task.projectId, t.project.id)
            );
        const linked = query(knex, Link)
            .where(l => l.labelId, 2)
            .where(
                l => l.taskId,
                base.ref(t => t.task.id)
            )
            .select(l => l.taskId)
            .toKnexQuery();
        const filtered = base
            .where(t => t.project.ownerId, 1)
            .whereRaw('case when ?? = ? then ? else ? end = ?', [
                base.ref(t => t.task.kind),
                'milestone',
                'planned',
                'active',
                'active'
            ])
            .andWhere(p =>
                p
                    .whereRaw("?? ilike ? escape '!'", [
                        p.ref(t => t.task.title),
                        '%50!%!_!!%'
                    ])
                    .orWhereExists(linked)
            );
        const rowsQuery = filtered
            .select(t => ({
                id: t.task.id,
                amount: t.task.amount,
                done: t.task.done
            }))
            .orderBy(t => t.task.id);
        const countQuery = filtered.select(() => ({
            total: aggregate.count()
        }));
        const [rows, count] = await Promise.all([
            rowsQuery,
            countQuery.first()
        ]);
        expect(rows.map(row => row.id)).toEqual([101, 102]);
        expect(count?.total).toBe(2);
        expect(rows[0].amount).toBe('9007199254740993.000001');
        expect(rows[0].done).toEqual(new Date(timestamp));
        expect(rows[1].done).toBeNull();
        for (const row of rows)
            expect(rowsQuery.rowSchema.validate(row).valid).toBe(true);
        expect(await rowsQuery.limit(1).offset(1)).toEqual([rows[1]]);
        expect((await rowsQuery).length).toBe(2);
        expect((await countQuery.first())?.total).toBe(2);
    });

    it('limits label IDs in a subquery before aggregating matching links', async () => {
        const page = query(knex, Label)
            .where(l => l.projectId, 1)
            .orderBy(l => l.name)
            .limit(1)
            .offset(1)
            .select(l => l.id)
            .toKnexQuery();
        const read = query(knex, alias(Label, 'label'))
            .withRowSchema()
            .leftJoin(alias(Link, 'link'), t => eq(t.label.id, t.link.labelId))
            .whereIn(t => t.label.id, page)
            .groupBy(
                t => t.label.id,
                t => t.label.name
            )
            .select(t => ({
                id: t.label.id,
                name: t.label.name,
                total: aggregate.count(t.link.taskId)
            }));
        page.clear('limit').where('id', 99);
        expect(await read).toEqual([{ id: 2, name: 'Beta', total: 2 }]);
        expect(read.rowSchema.validate((await read)[0]).valid).toBe(true);
    });

    it('uses raw conditional ordering with independent ordinary numbered and cursor pages', async () => {
        const source = query(knex, Project)
            .withRowSchema()
            .where(p => p.ownerId, 1)
            .select(p => ({ id: p.id, name: p.name }));
        const priority = source
            .orderByRaw('case when ?? = ? then 0 else 1 end', [
                source.ref(p => p.id),
                2
            ])
            .orderBy(p => p.name);
        const first = await priority.paginate({ page: 1, pageSize: 1 });
        const second = await priority.paginate({ page: 2, pageSize: 1 });
        expect(first.data.map(p => p.id)).toEqual([2]);
        expect(second.data.map(p => p.id)).toEqual([1]);
        expect(first.total).toBe(2);
        expect(second.total).toBe(2);
        expect(priority.rowSchema).toBe(source.rowSchema);
        expect(source.toQuery()).not.toContain('order by');
        const cursor = await priority.paginateAfter({
            limit: 1,
            orderBy: [{ column: p => p.id, direction: 'asc' }]
        });
        expect(cursor.data.map(p => p.id)).toEqual([1]);
        const next = await priority.paginateAfter({
            limit: 1,
            cursor: cursor.nextCursor,
            orderBy: [{ column: p => p.id, direction: 'asc' }]
        });
        expect(next.data.map(p => p.id)).toEqual([2]);
    });

    it('orders aliased reads with bound CASE expressions and retains nullable left joins', async () => {
        const source = query(knex, alias(Project, 'project'))
            .withRowSchema()
            .leftJoin(alias(Task, 'task'), t =>
                eq(t.project.id, t.task.projectId)
            )
            .where(t => t.project.ownerId, 1)
            .select(t => ({ id: t.project.id, taskId: t.task.id }));
        const result = source
            .orderByRaw('case when ?? = ? then 0 else 1 end', [
                source.ref(t => t.project.id),
                2
            ])
            .orderBy(t => t.task.id);
        expect((await result)[0]).toEqual({ id: 2, taskId: 103 });
        expect(result.rowSchema).toBe(source.rowSchema);
        const empty = query(knex, alias(Project, 'project'))
            .withRowSchema()
            .leftJoin(alias(Label, 'label'), t =>
                eq(t.project.id, t.label.projectId)
            )
            .where(t => t.project.id, 2)
            .select(t => ({ id: t.project.id, label: t.label.name }));
        expect(await empty).toEqual([{ id: 2, label: null }]);
        expect(empty.rowSchema.validate({ id: 2, label: null }).valid).toBe(
            true
        );
    });

    it('filters nested ORM reads, stays detached, and reuses the prepared mapper', async () => {
        const db = createDb(
            knex,
            { projects: ProjectEntity },
            { tracking: true }
        );
        const source = db.projects
            .withRowSchema()
            .select(p => ({ id: p.id }))
            .include(
                p => p.tasks,
                tasks =>
                    tasks
                        .where(p =>
                            p
                                .where(t => t.kind, 'task')
                                .orWhere(t => t.kind, 'note')
                        )
                        .orderByRaw('?? desc', [tasks.ref(t => t.id)])
                        .limit(1)
                        .select(t => ({
                            title: t.title,
                            amount: t.amount,
                            done: t.done
                        }))
            );
        const Target = object({
            id: number(),
            tasks: array(
                object({
                    title: string(),
                    amount: string(),
                    done: date().nullable()
                })
            )
        });
        const map = mapper()
            .configure(source.rowSchema, Target, m => m)
            .getSyncMapper(source.rowSchema, Target);
        const read = source.where(p => p.id, 1);
        expect(read.rowSchema).toBe(source.rowSchema);
        const [row] = await read;
        expect(map(row)).toEqual({
            id: 1,
            tasks: [{ title: 'label match', amount: '12.340000', done: null }]
        });
        row.tasks[0].title = 'detached mutation';
        await db.saveChanges();
        expect((await knex(names.tasks).where('id', 102).first()).title).toBe(
            'label match'
        );
    });

    it('preserves captured predicates in transaction clones without touching the source', async () => {
        const read = query(knex, Task)
            .withRowSchema()
            .where(t => t.projectId, 1);
        const noLabels = knex(names.links)
            .select('task_id')
            .where(
                'task_id',
                read.ref(t => t.id)
            );
        const filtered = read
            .whereNotExists(noLabels)
            .select(t => ({ id: t.id }));
        await knex.transaction(async trx => {
            await trx(names.tasks).insert({
                id: 105,
                project_id: 1,
                title: 'transaction',
                kind: 'task',
                amount: '1',
                done: null
            });
            const transactional = filtered.transacting(trx).orderBy(t => t.id);
            expect(transactional.rowSchema).toBe(filtered.rowSchema);
            expect((await transactional).map(t => t.id)).toEqual([104, 105]);
            await trx.rollback();
        });
        expect((await filtered).map(t => t.id)).toEqual([104]);
    });
});

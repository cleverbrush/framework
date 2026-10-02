import { createClient } from '@cleverbrush/client';
import { deepExtend } from '@cleverbrush/deep';
import {
    alias,
    defineEntity,
    type InsertType,
    number as int,
    query,
    object as table,
    string as text
} from '@cleverbrush/knex-schema';
import { mapper } from '@cleverbrush/mapper';
import type { WithIncluded, WithVariantIncluded } from '@cleverbrush/orm';
import { createDb } from '@cleverbrush/orm';
import type { SchemaFormInstance } from '@cleverbrush/react-form';
import {
    array,
    type InferType,
    number,
    object,
    string
} from '@cleverbrush/schema';
import {
    fromJsonSchema,
    type InferFromJsonSchema
} from '@cleverbrush/schema-json';
import {
    defineApi,
    endpoint,
    implement,
    mergeContracts,
    route
} from '@cleverbrush/server';
import Knex from 'knex';

const Plain = object({
    /** Plain name. */
    name: string(),
    /** Plain optional age. */
    age: number().optional(),
    /** Plain defaulted count. */
    count: number().default(0),
    address: object({
        /** Address city. */
        city: string()
    }),
    tags: array(
        object({
            /** Tag label. */
            label: string()
        })
    )
});
declare const plain: InferType<typeof Plain>;
plain./*infer-name*/ name;
plain./*infer-optional*/ age;
plain.tags[0]./*infer-array*/ label;
declare const input: Parameters<typeof Plain.validate>[0];
input./*input-default*/ count;
Plain.validate({} as any).getErrorsFor(t => t./*validation*/ name);
declare const form: SchemaFormInstance<typeof Plain>;
form.useField(t => t./*form-field*/ name);
form.useField(t => t.tags[0]./*form-array*/ label);
form.getValue()./*form-value*/ name;
const Target = object({
    /** Target label. */
    label: string()
});
mapper().configure(Plain, Target, m =>
    m.for(t => t./*mapper-target*/ label).from(t => t./*mapper-source*/ name)
);
mapper().configure(Plain, Target, m =>
    m.for(t => t.label).compute(t => t./*mapper-compute*/ name)
);
const Picked = Plain.pick('name');
Picked.validate({} as any).getErrorsFor(t => t./*picked*/ name);

const Dept = table({
    /** Department id. */
    id: int().primaryKey(),
    /** Department title. */
    title: text()
}).hasTableName('departments');
const User = table({
    /** User id. */
    id: int().primaryKey(),
    /** User first name. */
    firstName: text().hasColumnName('first_name'),
    /** User optional score. */
    score: int().optional(),
    /** Department foreign key. */
    departmentId: int(),
    /** Department navigation. */
    department: Dept.optional(),
    profile: table({
        /** Profile city. */
        city: text()
    })
}).hasTableName('users');
const Entity = defineEntity(User).belongsTo(
    t => t./*entity-nav*/ department,
    t => t.departmentId,
    d => d.id
);
const knex = Knex({ client: 'pg' });
const read = query(knex, Entity.schema);
read.where(t => t./*where*/ firstName, 'John');
read.whereNull(t => t./*optional-column*/ score);
read.select('firstName')
    .rowSchema.validate({ firstName: 'Jane' })
    .getErrorsFor(t => t./*row-schema*/ firstName);
query(knex, alias(Entity.schema, 'user')).where(
    t => t.user./*where*/ firstName,
    'John'
);
const rows = await read;
rows[0]./*read-row*/ firstName;
rows[0].profile./*read-row-json*/ city;
read.rowSchema
    .validate({} as any)
    .getErrorsFor(t => t./*row-schema*/ firstName);
const projected = read.select(t => ({
    /** Projected name. */
    displayName: t.firstName
}));
const projectedRows = await projected;
projectedRows[0]./*projection-row*/ displayName;
projected.rowSchema
    .validate({} as any)
    .getErrorsFor(t => t./*projection-schema*/ displayName);
read.insert({ /*insert-key*/ firstName: 'Jane' });
read.update({ /*update-key*/ firstName: 'Jane' });
declare const payload: InsertType<typeof Entity.schema>;
payload./*insert-value*/ firstName;
const included = read.include(t => t./*query-include*/ department);
const includedRows = await included;
includedRows[0]./*included-nav*/ department?.title;
includedRows[0].department?./*included-child*/ title;
const customized = read
    .include(
        t => t.department,
        child =>
            child.select(t => ({
                /** Department display label. */
                label: t./*included-child*/ title
            }))
    )
    .select(t => ({
        /** Customized user name. */
        name: t.firstName
    }));
(await customized)[0]./*included-nav*/ department?./*customized-child*/ label;
const db = createDb(knex, {
    /** Users collection. */
    users: Entity
});
db./*db-set*/ users;
db.users.where(t => t./*orm-where*/ firstName, 'John');
const ormIncluded = db.users.include(t => t./*orm-include*/ department);
const ormRows = await ormIncluded;
ormRows[0]./*orm-row*/ firstName;
ormRows[0]./*orm-nav*/ department?.title;
declare const withIncluded: WithIncluded<typeof Entity, {}, 'department'>;
withIncluded./*orm-nav*/ department?./*included-child*/ title;
declare const withVariant: WithVariantIncluded<
    typeof Entity,
    { type: 'photo' },
    'photo',
    'department'
>;
withVariant./*orm-nav*/ department?./*included-child*/ title;

const Task = table({
    id: int().primaryKey(),
    ownerId: int(),
    /** Task title. */
    title: text()
}).hasTableName('tasks');
const Owner = defineEntity(
    table({
        id: int().primaryKey(),
        /** Owner tasks. */
        tasks: array(Task).optional()
    }).hasTableName('owners')
).hasMany(
    t => t.tasks,
    t => t.id,
    t => t.ownerId
);
const ownerRead = query(knex, Owner.schema).include(
    t => t./*many-include*/ tasks
);
(await ownerRead)[0]./*many-result*/ tasks[0]./*many-child*/ title;
const owners = createDb(knex, { owners: Owner }).owners.include(
    t => t./*many-include*/ tasks
);
(await owners)[0]./*many-result*/ tasks[0]./*many-child*/ title;

const Base = defineEntity(
    table({
        /** Asset id. */
        id: int().primaryKey(),
        /** Asset kind. */
        kind: text(),
        departmentId: int(),
        /** Asset department. */
        department: Dept.optional()
    }).hasTableName('assets')
)
    .belongsTo(
        t => t.department,
        t => t.departmentId,
        t => t.id,
        { optional: true }
    )
    .discriminator(t => t.kind)
    .stiVariant(
        'photo',
        table({
            /** Photo size. */
            size: int()
        })
    );
const poly = query(knex, Base.schema);
const polyRows = await poly;
if (polyRows[0].kind === 'photo') {
    polyRows[0]./*poly-base*/ id;
    polyRows[0]./*poly-field*/ size;
    polyRows[0]./*poly-discriminator*/ kind;
}
poly.variantRowSchemas.photo
    .validate({} as any)
    .getErrorsFor(t => t./*poly-schema*/ size);
const polyIncluded = poly.include(t => t./*poly-include*/ department);
(await polyIncluded)[0]./*poly-relation*/ department?./*included-child*/ title;

const JSONSchema = {
    type: 'object',
    properties: {
        /** JSON name. */
        name: { type: 'string' },
        /** JSON age. */
        age: { type: 'number' }
    },
    required: ['name']
} as const;
declare const fromJson: InferFromJsonSchema<typeof JSONSchema>;
fromJson./*json-required*/ name;
fromJson./*json-optional*/ age;
fromJsonSchema(JSONSchema)
    .validate({} as any)
    .getErrorsFor(t => t./*json-builder*/ name);

const routeShape = {
    /** Route id. */
    id: number()
};
const endpointDef = endpoint
    .resource('/users')
    .get(route(routeShape)`/${t => t./*route-param*/ id}`)
    .query(Plain)
    .responses({ 200: Plain });
const first = defineApi({
    /** Public users. */
    users: {
        /** Get users. */
        list: endpointDef
    }
});
const second = defineApi({
    /** Admin group. */
    admin: { list: endpoint.get('/admin').responses({ 200: Plain }) }
});
const merged = mergeContracts(first, second);
merged./*merged-group*/ users./*merged-endpoint*/ list;
const client = createClient(merged);
client./*client-group*/ users./*client-endpoint*/ list;
const extra = defineApi({
    users: {
        /** User detail operation. */
        detail: endpoint.get('/users/detail').responses({ 200: Plain })
    }
});
const overlapping = mergeContracts(first, extra);
createClient(overlapping).users./*overlap-endpoint*/ detail;
implement(first)
    .group('users')
    .withHandlers({
        list: ({ query: args }) => {
            args./*handler-input*/ name;
            return args;
        }
    });
const DbSchema = object({
    /** Injected value. */
    value: string()
});
const scope = implement(first).group('users', {
    inject: {
        /** Scope dependency. */
        db: DbSchema
    }
});
scope.withHandlers({
    list: ({ query: args }, services) => {
        services./*injected-service*/ db;
        services.db./*service-property*/ value;
        return args;
    }
});
const overridden = implement(first).group('users', {
    inject: { db: DbSchema },
    operations: {
        list: {
            inject: {
                /** Operation dependency. */
                db: object({ replacement: string() })
            }
        }
    }
});
overridden.withHandlers({
    list: ({ query: args }, services) => {
        services./*overridden-service*/ db.replacement;
        return args;
    }
});
const left = {
    /** Left property. */
    shared: {
        /** Left child. */
        leftChild: 1
    },
    /** Left only. */
    left: 1
};
const right = {
    /** Right property. */
    shared: {
        /** Right child. */
        rightChild: 2
    }
};
const extended = deepExtend(left, right);
extended./*deep-shared*/ shared./*deep-child*/ rightChild;
extended./*deep-left*/ left;
interface OptionalMergeInput {
    /** Optional merge value. */
    readonly value?: string;
}
declare const optionalMergeInput: OptionalMergeInput;
deepExtend({ value: '' }, optionalMergeInput)./*deep-optional*/ value;

export {
    db,
    Entity,
    JSONSchema,
    merged,
    Plain,
    projected,
    read,
    scope,
    Target,
    User
};

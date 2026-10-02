// Checked JavaScript consumers must retain the same declaration origins as TS.
import { query } from '@cleverbrush/knex-schema';
import { mapper } from '@cleverbrush/mapper';
import { useSchemaForm } from '@cleverbrush/react-form';
import Knex from 'knex';
import {
    db,
    Entity,
    Plain,
    projected,
    read,
    Target
} from './property-navigation.model.js';

query(Knex({ client: 'pg' }), Entity.schema).where(
    t => t./*where*/ firstName,
    'John'
);
read.select(t => ({ name: t./*where*/ firstName }));
read.orderBy(t => t./*where*/ firstName);
read.where(group => group.where(t => t./*where*/ firstName, 'John'));
read.where(t => t.profile./*read-row-json*/ city, 'London');
read.insert({ /*insert-key*/ firstName: 'Jane' });
const rows = await read.include(t => t./*query-include*/ department);
rows[0]./*included-nav*/ department?./*included-child*/ title;
rows[0]./*read-row*/ firstName;
(await projected)[0]./*projection-row*/ displayName;
mapper().configure(Plain, Target, m =>
    m.for(t => t./*mapper-target*/ label).from(s => s./*mapper-source*/ name)
);
const form = useSchemaForm(Plain);
form.useField(t => t./*form-field*/ name);
form.useField(t => t.tags[0]./*form-array*/ label);
db.users.include(t => t./*orm-include*/ department);

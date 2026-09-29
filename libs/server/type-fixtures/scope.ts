import { object, string } from '@cleverbrush/schema';
import { implement } from '@cleverbrush/server';
import { api } from './contracts.js';

export const Db = object({ name: string() });
export const Mailer = object({ host: string() });
export const items = implement(api).group('items', {
    inject: { db: Db },
    tags: ['items'],
    operations: {
        list: { summary: 'List items' },
        create: { inject: { mailer: Mailer }, operationId: 'createItem' }
    }
});

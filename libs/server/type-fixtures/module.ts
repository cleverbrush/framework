import { ActionResult, implement } from '@cleverbrush/server';
import { api } from './contracts.js';
import { create } from './handlers/create.js';
import { list } from './handlers/list.js';
import { remove } from './handlers/remove.js';
import { missingItem } from './policies.js';
import { items } from './scope.js';

export const reads = items.pick('list').withHandlers({ list });
export const writes = items.pick('create', 'remove', 'upload').withHandlers({
    create: { handler: create, errors: missingItem },
    remove: { handler: remove, errors: missingItem },
    upload: ({ files }, { db }) => {
        if (!files.image || !db.name) throw new Error('Missing image');
        return ActionResult.noContent();
    }
});
export const itemsImplementation = implement(api).use(reads, writes);
export const live = implement(api)
    .group('live')
    .withHandlers({
        changes: async function* ({ signal }) {
            if (!signal.aborted) yield { id: 1, title: 'Changed' };
        }
    });

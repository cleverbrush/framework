import { object, string } from '@cleverbrush/schema';
import {
    ActionResult,
    createServer,
    defineApi,
    endpoint,
    errorMap,
    implement,
    mapHandlers
} from '@cleverbrush/server';
import { expect, it } from 'vitest';
import { generateOpenApiSpec } from './generateOpenApiSpec.js';

it('emits the same OpenAPI contract for modular and existing registrations', () => {
    const Principal = object({ userId: string() });
    const Db = object({ name: string() });
    const Message = object({ message: string() });
    const api = defineApi({
        items: {
            create: endpoint
                .post('/items')
                .body(object({ title: string() }))
                .authorize(Principal, 'admin')
                .responses({ 201: Message, 404: Message })
                .clearsCacheTag('items')
        }
    });
    const scope = implement(api).group('items', {
        inject: { db: Db },
        tags: ['items'],
        operations: {
            create: {
                summary: 'Create item',
                description: 'Create a new item.',
                operationId: 'createItem',
                deprecated: true
            }
        }
    });
    const handler = () => ActionResult.created({ message: 'created' });
    const modular = createServer().handleAll(
        implement(api)
            .use(
                scope.withHandlers({
                    create: {
                        handler,
                        errors: errorMap().on(Error, () =>
                            ActionResult.notFound({ message: 'Missing' })
                        )
                    }
                })
            )
            .complete()
    );
    const previous = createServer().handleAll(
        mapHandlers(
            {
                items: {
                    create: api.items.create
                        .inject({ db: Db })
                        .tags('items')
                        .summary('Create item')
                        .description('Create a new item.')
                        .operationId('createItem')
                        .deprecated()
                }
            },
            { items: { create: handler } }
        )
    );
    const info = { title: 'Items', version: '1' };
    expect(
        generateOpenApiSpec({
            info,
            registrations: [...modular.getRegistrations()]
        })
    ).toEqual(
        generateOpenApiSpec({
            info,
            registrations: [...previous.getRegistrations()]
        })
    );
});

import { number, string } from '@cleverbrush/schema';
import { expectTypeOf, test } from 'vitest';
import {
    endpoint,
    endpointPath,
    matchEndpointPath,
    route
} from './contract.js';

test('path arguments and matched parameters follow the contract', () => {
    const get = endpoint.resource('').get(
        route({
            id: number().coerce(),
            name: string()
        })`/items/${p => p.id}/${p => p.name}`
    );
    endpointPath(get, { id: 1, name: 'item' });
    expectTypeOf(matchEndpointPath(get, '/items/1/item')).toEqualTypeOf<
        { id: number; name: string } | undefined
    >();
    // @ts-expect-error path parameters are required
    endpointPath(get);
    // @ts-expect-error a renamed property cannot silently construct a stale URL
    endpointPath(get, { itemId: 1, name: 'item' });
    // @ts-expect-error input types follow the contract
    endpointPath(get, { id: '1', name: 'item' });
    endpointPath(endpoint.get('/health'));
});

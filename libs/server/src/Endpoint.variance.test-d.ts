import { expectTypeOf } from 'vitest';
import type { EndpointBuilder } from './Endpoint.js';

// Large contracts rely on argument-based comparisons. Covariance must still
// reject narrowing request, service, principal and response-map types.
type Narrow = EndpointBuilder<
    { id: string },
    { title: string },
    { search: string },
    { token: string },
    { db: { name: string } },
    { role: 'admin' },
    'admin',
    { title: string },
    { 200: { title: string } },
    false
>;
type Wide = EndpointBuilder<
    { id: string | number },
    { title: string },
    { search: string | number },
    { token: string | number },
    { db: { name: string | number } },
    { role: string },
    string,
    { title: string },
    { 200: { title: string | number } },
    boolean
>;
expectTypeOf<Narrow>().toExtend<Wide>();
expectTypeOf<Wide>().not.toExtend<Narrow>();
expectTypeOf<EndpointBuilder<{ id: number }>>().not.toExtend<
    EndpointBuilder<{ id: string }>
>();

// Body and response descriptors expose setters as well as getters.
expectTypeOf<EndpointBuilder<{}, string>>().not.toExtend<
    EndpointBuilder<{}, string | number>
>();
expectTypeOf<
    EndpointBuilder<{}, undefined, {}, {}, {}, undefined, string, string>
>().not.toExtend<
    EndpointBuilder<
        {},
        undefined,
        {},
        {},
        {},
        undefined,
        string,
        string | number
    >
>();

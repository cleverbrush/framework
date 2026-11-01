import { expectTypeOf } from 'vitest';
import {
    createServer,
    type Middleware,
    type RequestRoute,
    type ResponseCompletion,
    type ResponseOutcome,
    type ServerBuilder
} from './index.js';

const observe: Middleware = async (context, next) => {
    expectTypeOf(context.route).toEqualTypeOf<RequestRoute | undefined>();
    const unsubscribe = context.onResponseCompleted(completion => {
        expectTypeOf(completion).toEqualTypeOf<ResponseCompletion>();
        expectTypeOf(completion.statusCode).toEqualTypeOf<number | undefined>();
        expectTypeOf(completion.outcome).toEqualTypeOf<ResponseOutcome>();
        // @ts-expect-error Completion snapshots are readonly.
        completion.outcome = 'success';
    });
    expectTypeOf(unsubscribe).toEqualTypeOf<() => void>();
    context.markResponseOutcome('timeout');
    context.markResponseOutcome('cancelled');
    // @ts-expect-error Disconnects cannot be guessed as explicit cancellation.
    context.markResponseOutcome('interrupted');
    if (context.route) {
        // @ts-expect-error Route metadata is readonly.
        context.route.pathTemplate = '/changed';
    }
    await next();
};

expectTypeOf(createServer().useRequest(observe)).toEqualTypeOf<ServerBuilder>();

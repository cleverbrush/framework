import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    handler: vi.fn() as any,
    listener: undefined as ((message: any) => void) | undefined,
    ackError: undefined as any,
    port: { on: vi.fn(), postMessage: vi.fn(), close: vi.fn() },
    data: {
        runId: 'run',
        attempt: 2,
        input: { id: 'one' },
        moduleUrl: '',
        policy: {
            maxProgressEvents: 2,
            maxProgressBytes: 100,
            maxPayloadBytes: 100
        }
    }
}));
vi.mock('node:worker_threads', () => ({
    parentPort: state.port,
    workerData: state.data
}));
vi.mock('../../../demos/durable-jobs/thread-handler.mjs', () => ({
    get default() {
        return state.handler;
    }
}));
beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    state.handler = vi.fn(() => ({ url: '/result' }));
    state.ackError = undefined;
    state.data.moduleUrl = new URL(
        '../../../demos/durable-jobs/thread-handler.mjs',
        import.meta.url
    ).href;
    state.port.on.mockImplementation((_name, callback) => {
        state.listener = callback;
    });
    state.port.postMessage.mockImplementation(message => {
        if (message.type === 'progress')
            state.listener!({
                type: 'ack',
                sequence: message.sequence,
                error: state.ackError
            });
    });
});

it('waits for progress acknowledgements before sending the result', async () => {
    state.handler = vi.fn(async (_input, context) => {
        expect(context).toMatchObject({ runId: 'run', attempt: 2 });
        state.listener!({ type: 'ack', sequence: 999 });
        await context.report({ percent: 50 });
        return { url: '/result' };
    });
    await import('./thread-entry.js');
    expect(
        state.port.postMessage.mock.calls.map(([message]) => message.type)
    ).toEqual(['progress', 'result']);
    expect(state.port.postMessage).toHaveBeenLastCalledWith({
        type: 'result',
        value: { url: '/result' }
    });
    expect(state.port.close).toHaveBeenCalledOnce();
});

it('preserves permanent progress errors from the parent', async () => {
    state.ackError = { message: 'lease expired', code: 'lease_lost' };
    state.handler = async (_input: any, context: any) => {
        await context.report({ percent: 50 });
        return {};
    };
    await import('./thread-entry.js');
    expect(state.port.postMessage).toHaveBeenLastCalledWith({
        type: 'error',
        error: state.ackError,
        retryable: false
    });
    expect(state.port.close).toHaveBeenCalledOnce();
});

it('enforces progress count and payload limits, including forgotten promises', async () => {
    state.handler = async (_input: any, context: any) => {
        await context.report({ percent: 10 });
        await context.report({ percent: 20 });
        await context.report({ percent: 30 });
        return {};
    };
    await import('./thread-entry.js');
    expect(state.port.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
            type: 'error',
            retryable: false,
            error: expect.objectContaining({ code: 'progress_limit' })
        })
    );
    expect(
        state.port.postMessage.mock.calls.filter(
            ([message]) => message.type === 'progress'
        )
    ).toHaveLength(2);
});

it('reports invalid outputs and import failures and closes the port', async () => {
    state.handler = () => ({ bad: undefined });
    await import('./thread-entry.js');
    expect(state.port.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
            type: 'error',
            retryable: false,
            error: expect.objectContaining({ code: 'invalid_payload' })
        })
    );
    vi.resetModules();
    state.data.moduleUrl = 'file:///missing-handler.mjs';
    await import('./thread-entry.js');
    expect(state.port.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'error', retryable: true })
    );
});

it('requires a default function and exposes cancellation to handlers', async () => {
    state.handler = undefined;
    await import('./thread-entry.js');
    expect(state.port.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
            error: expect.objectContaining({ code: 'invalid_handler' }),
            retryable: false
        })
    );
    vi.resetModules();
    state.handler = (_input: any, context: any) => {
        state.listener!({ type: 'abort' });
        expect(context.signal.aborted).toBe(true);
        return {};
    };
    await import('./thread-entry.js');
    expect(state.port.postMessage).toHaveBeenLastCalledWith({
        type: 'result',
        value: {}
    });
});

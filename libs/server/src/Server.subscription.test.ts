import { once } from 'node:events';
import { object, string } from '@cleverbrush/schema';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import { endpoint, mapHandlers } from './Endpoint.js';
import { type Server, ServerBuilder } from './Server.js';
import { tracked } from './Subscription.js';

const servers: Server[] = [];
const sockets: WebSocket[] = [];
afterEach(async () => {
    for (const ws of sockets.splice(0)) ws.terminate();
    await Promise.all(servers.splice(0).map(s => s.close()));
    vi.restoreAllMocks();
});
async function connect(def: any, handler: any, options?: any) {
    const builder = new ServerBuilder();
    builder.handleAll(
        mapHandlers(
            { live: { events: def } },
            { live: { events: { handler, ...options } } }
        )
    );
    const server = await builder.listen(0, '127.0.0.1');
    servers.push(server);
    const ws = new WebSocket(`ws://127.0.0.1:${server.address!.port}/events`);
    sockets.push(ws);
    const messages: any[] = [];
    ws.on('message', buffer => messages.push(JSON.parse(buffer.toString())));
    const closed = once(ws, 'close');
    await once(ws, 'open');
    return { ws, messages, closed };
}
describe('subscription server lifecycle', () => {
    it('validates incoming frames, supports ping, and streams tracked and ordinary events', async () => {
        const definition = endpoint
            .subscription('/events')
            .incoming(object({ text: string() }))
            .outgoing(string());
        const { ws, messages } = await connect(
            definition,
            async function* ({ incoming }) {
                yield tracked('one', 'ready');
                for await (const message of incoming) {
                    yield message.text;
                    break;
                }
            }
        );
        await vi.waitFor(() =>
            expect(messages).toContainEqual(
                expect.objectContaining({
                    type: 'tracked',
                    id: 'one',
                    data: 'ready'
                })
            )
        );
        ws.send('invalid JSON');
        ws.send(JSON.stringify({ type: 'ping' }));
        ws.send(JSON.stringify({ type: 'message', data: { text: 1 } }));
        ws.send(
            JSON.stringify({ type: 'message', data: { text: 'accepted' } })
        );
        await vi.waitFor(() =>
            expect(messages).toContainEqual(
                expect.objectContaining({ type: 'message', data: 'accepted' })
            )
        );
        expect(messages).toContainEqual(
            expect.objectContaining({ type: 'pong' })
        );
        expect(messages).toContainEqual(
            expect.objectContaining({ type: 'error', code: 400 })
        );
        expect(messages).toContainEqual(
            expect.objectContaining({ type: 'error', code: 422 })
        );
    });
    it('rejects invalid ordinary and tracked outputs without leaking handler errors', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { messages, closed } = await connect(
            endpoint.subscription('/events').outgoing(string()),
            async function* () {
                yield 123;
                yield tracked('invalid', 123);
                throw new Error('private credentials');
            }
        );
        expect((await closed)[0]).toBe(1011);
        expect(messages.filter(m => m.type === 'error')).toHaveLength(3);
        expect(JSON.stringify(messages)).not.toContain('private credentials');
    });
    it.each(['query', 'headers'])(
        'closes invalid %s contracts before calling handlers',
        async kind => {
            const handler = vi.fn(async function* () {
                yield 'unexpected';
            });
            const def = endpoint
                .subscription('/events')
                [kind](object({ required: string() }));
            const { closed } = await connect(def, handler);
            expect((await closed)[0]).toBe(1002);
            expect(handler).not.toHaveBeenCalled();
        }
    );
    it('rejects failed middleware and isolates middleware exceptions', async () => {
        for (const throws of [false, true]) {
            const handler = vi.fn(async function* () {
                yield 'unexpected';
            });
            const { closed } = await connect(
                endpoint.subscription('/events'),
                handler,
                {
                    middlewares: [
                        async ctx => {
                            if (throws) throw new Error('middleware failed');
                            ctx.responded = true;
                        }
                    ]
                }
            );
            expect((await closed)[0]).toBe(throws ? 1011 : 1008);
            expect(handler).not.toHaveBeenCalled();
        }
    });
    it('ends pending incoming iteration and aborts the handler on disconnect', async () => {
        let signal!: AbortSignal;
        const finished = vi.fn();
        const { ws, messages, closed } = await connect(
            endpoint.subscription('/events'),
            async function* (ctx) {
                signal = ctx.signal;
                yield 'ready';
                for await (const message of ctx.incoming) yield message;
                finished();
            }
        );
        await vi.waitFor(() => expect(messages).toHaveLength(1));
        ws.close();
        await closed;
        await vi.waitFor(() => expect(finished).toHaveBeenCalledOnce());
        expect(signal.aborted).toBe(true);
    });
    it('limits unconsumed message queues', async () => {
        const { ws, closed, messages } = await connect(
            endpoint.subscription('/events'),
            async function* ({ signal }) {
                await new Promise<void>(resolve =>
                    signal.addEventListener('abort', () => resolve(), {
                        once: true
                    })
                );
            }
        );
        for (let i = 0; i < 1100; i++)
            ws.send(JSON.stringify({ type: 'message', data: i }));
        expect((await closed)[0]).toBe(1008);
        expect(messages).toContainEqual(
            expect.objectContaining({ type: 'error', code: 429 })
        );
    });
});

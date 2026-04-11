import {
    any,
    func,
    number,
    object,
    promise,
    string
} from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { ParamBuilder, RouteBuilder } from '../src/RouteBuilder.js';

// ---------------------------------------------------------------------------
// ParamBuilder
// ---------------------------------------------------------------------------

describe('ParamBuilder', () => {
    it('builds empty sources by default', () => {
        expect(new ParamBuilder().build()).toEqual([]);
    });

    it('.path() adds path source', () => {
        const sources = new ParamBuilder().path().build();
        expect(sources).toEqual([{ from: 'path' }]);
    });

    it('.body() adds body source', () => {
        const sources = new ParamBuilder().body().build();
        expect(sources).toEqual([{ from: 'body' }]);
    });

    it('.query(name) adds query source', () => {
        const sources = new ParamBuilder().query('q').build();
        expect(sources).toEqual([{ from: 'query', name: 'q' }]);
    });

    it('.header(name) adds header source (lowercased)', () => {
        const sources = new ParamBuilder().header('X-Api-Key').build();
        expect(sources).toEqual([{ from: 'header', name: 'x-api-key' }]);
    });

    it('.context() adds context source', () => {
        const sources = new ParamBuilder().context().build();
        expect(sources).toEqual([{ from: 'context' }]);
    });

    it('chains multiple sources in order', () => {
        const sources = new ParamBuilder()
            .path()
            .body()
            .query('limit')
            .header('Authorization')
            .context()
            .build();

        expect(sources).toEqual([
            { from: 'path' },
            { from: 'body' },
            { from: 'query', name: 'limit' },
            { from: 'header', name: 'authorization' },
            { from: 'context' }
        ]);
    });
});

// ---------------------------------------------------------------------------
// RouteBuilder
// ---------------------------------------------------------------------------

describe('RouteBuilder', () => {
    const Schema = object({
        list: func().hasReturnType(promise(any())),
        getById: func()
            .addParameter(object({ id: number() }))
            .hasReturnType(promise(any())),
        create: func()
            .addParameter(object({ title: string() }))
            .hasReturnType(promise(any())),
        update: func()
            .addParameter(object({ id: number() }))
            .addParameter(object({ title: string().optional() }))
            .hasReturnType(promise(any())),
        remove: func()
            .addParameter(object({ id: number() }))
            .hasReturnType(promise(any()))
    });

    it('builds basic config with basePath and routes', () => {
        const config = new RouteBuilder(Schema)
            .basePath('/api/todos')
            .get(t => t.list, '/')
            .build();

        expect(config).toEqual({
            basePath: '/api/todos',
            routes: {
                list: { method: 'GET', path: '/' }
            }
        });
    });

    it('supports all HTTP verbs', () => {
        const S = object({
            a: func(),
            b: func(),
            c: func(),
            d: func(),
            e: func(),
            f: func(),
            g: func()
        });

        const config = new RouteBuilder(S)
            .get(t => t.a, '/get')
            .post(t => t.b, '/post')
            .put(t => t.c, '/put')
            .patch(t => t.d, '/patch')
            .delete(t => t.e, '/del')
            .head(t => t.f, '/head')
            .options(t => t.g, '/opts')
            .build();

        expect(config.routes.a).toEqual({ method: 'GET', path: '/get' });
        expect(config.routes.b).toEqual({ method: 'POST', path: '/post' });
        expect(config.routes.c).toEqual({ method: 'PUT', path: '/put' });
        expect(config.routes.d).toEqual({ method: 'PATCH', path: '/patch' });
        expect(config.routes.e).toEqual({ method: 'DELETE', path: '/del' });
        expect(config.routes.f).toEqual({ method: 'HEAD', path: '/head' });
        expect(config.routes.g).toEqual({
            method: 'OPTIONS',
            path: '/opts'
        });
    });

    it('resolves params via callback', () => {
        const config = new RouteBuilder(Schema)
            .patch(
                t => t.update,
                '/items/:id',
                p => p.path().body()
            )
            .build();

        expect(config.routes.update).toEqual({
            method: 'PATCH',
            path: '/items/:id',
            params: [{ from: 'path' }, { from: 'body' }]
        });
    });

    it('omits params when callback not provided', () => {
        const config = new RouteBuilder(Schema).get(t => t.list, '/').build();

        expect(config.routes.list).toEqual({
            method: 'GET',
            path: '/'
        });
        expect(config.routes.list.params).toBeUndefined();
    });

    it('includes middlewares when added via .use()', () => {
        const mw = async () => {};
        const config = new RouteBuilder(Schema)
            .use(mw)
            .get(t => t.list, '/')
            .build();

        expect(config.middlewares).toEqual([mw]);
    });

    it('omits middlewares key when none added', () => {
        const config = new RouteBuilder(Schema).get(t => t.list, '/').build();

        expect(config.middlewares).toBeUndefined();
    });

    it('omits basePath key when not set', () => {
        const config = new RouteBuilder(Schema).get(t => t.list, '/').build();

        expect(config.basePath).toBeUndefined();
    });

    it('throws when selector returns unknown descriptor', () => {
        expect(() => {
            new RouteBuilder(Schema).get(() => ({}) as any, '/');
        }).toThrow('Unknown property descriptor');
    });

    it('last route wins when same method selector used twice', () => {
        const config = new RouteBuilder(Schema)
            .get(t => t.list, '/old')
            .get(t => t.list, '/new')
            .build();

        expect(config.routes.list).toEqual({
            method: 'GET',
            path: '/new'
        });
    });
});

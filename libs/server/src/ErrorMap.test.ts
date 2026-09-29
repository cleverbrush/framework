import { object, string } from '@cleverbrush/schema';
import { describe, expect, it, vi } from 'vitest';
import { ActionResult, endpoint, errorMap, withErrors } from './index.js';

class Missing extends Error {}
class SpecialMissing extends Missing {}
const message = object({ message: string() });
const ep = endpoint
    .get('/items')
    .responses({ 200: string(), 404: message, 204: null });

describe('errorMap and withErrors', () => {
    it('translates sync failures and preserves successful results and arguments', async () => {
        const configured = ep.inject({ db: object({ name: string() }) });
        const policy = errorMap().on(Missing, () =>
            ActionResult.notFound({ message: 'Not found' })
        );
        const handler = vi.fn(
            (_context, { db }: { db: { name: string } }) => db.name
        );
        const wrapped = withErrors(configured, policy, handler);
        const context = {} as never;
        const services = { db: { name: 'Connected' } };
        expect(await wrapped(context, services)).toBe('Connected');
        expect(handler).toHaveBeenCalledWith(context, services);
        const failing = withErrors(ep, policy, () => {
            throw new Missing('private details');
        });
        expect(await failing(context)).toMatchObject({
            status: 404,
            body: { message: 'Not found' }
        });
    });

    it('supports async handlers and translators', async () => {
        const policy = errorMap().on(Missing, async () =>
            ActionResult.notFound({ message: 'Async' })
        );
        const wrapped = withErrors(ep, policy, async () => {
            throw new Missing();
        });
        expect(await wrapped({} as never)).toMatchObject({
            status: 404,
            body: { message: 'Async' }
        });
    });

    it('is immutable and uses the first matching constructor including subclasses', async () => {
        const empty = errorMap();
        const specific = empty.on(SpecialMissing, () =>
            ActionResult.notFound({ message: 'Specific' })
        );
        const all = specific.on(Missing, () =>
            ActionResult.notFound({ message: 'General' })
        );
        const error = new Missing();
        await expect(empty.translate(error)).rejects.toBe(error);
        await expect(specific.translate(error)).rejects.toBe(error);
        expect(await all.translate(new SpecialMissing())).toMatchObject({
            body: { message: 'Specific' }
        });
        const first = errorMap()
            .on(Missing, () => ActionResult.notFound({ message: 'First' }))
            .on(SpecialMissing, () =>
                ActionResult.notFound({ message: 'Later' })
            );
        expect(await first.translate(new SpecialMissing())).toMatchObject({
            body: { message: 'First' }
        });
    });

    it.each([
        new Error('Database password'),
        'non-error',
        undefined,
        null
    ])('rethrows unmatched values without changing identity: %s', async error => {
        const wrapped = withErrors(
            ep,
            errorMap().on(Missing, () => ActionResult.noContent()),
            () => {
                throw error;
            }
        );
        await expect(wrapped({} as never)).rejects.toBe(error);
    });

    it('does not feed translator failures back into the policy', async () => {
        const failure = new SpecialMissing('translator failed');
        const later = vi.fn(() => ActionResult.noContent());
        const policy = errorMap()
            .on(Missing, async () => {
                throw failure;
            })
            .on(SpecialMissing, later);
        const wrapped = withErrors(ep, policy, () => {
            throw new Missing();
        });
        await expect(wrapped({} as never)).rejects.toBe(failure);
        expect(later).not.toHaveBeenCalled();
    });

    it('requires declared responses for erased/JavaScript callers', () => {
        expect(() =>
            (withErrors as any)(endpoint.get('/legacy'), errorMap(), () => null)
        ).toThrow('explicit endpoint responses');
    });

    it('rejects raw, arbitrary, and plain-object translator results at runtime', async () => {
        for (const response of [
            ActionResult.raw(() => {}),
            ActionResult.content('text'),
            { message: 'not an ActionResult' }
        ]) {
            const policy = errorMap().on(Missing, () => response as any);
            await expect(policy.translate(new Missing())).rejects.toThrow(
                'explicit JSON or bodyless'
            );
        }
    });
});

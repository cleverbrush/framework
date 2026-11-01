import { describe, expect, it, vi } from 'vitest';
import { sanitizeException } from './exceptionPolicy.js';

describe('exception policy boundaries', () => {
    it('does not inspect omitted errors, including hostile thrown objects', () => {
        const inspect = vi.fn(() => {
            throw new Error('private value');
        });
        const value = {
            toString: inspect,
            get message() {
                return inspect();
            }
        };
        expect(sanitizeException(value)).toBeUndefined();
        expect(inspect).not.toHaveBeenCalled();
    });

    it('allowlists fields without attaching arbitrary provider metadata', () => {
        const error = new Error('SELECT password FROM users; secret-token');
        const result = sanitizeException(error, original => {
            expect(original).toBe(error);
            return {
                name: 'DatabaseFailure',
                message: 'Unavailable',
                sql: 'secret'
            };
        });
        expect(result).toEqual({
            name: 'DatabaseFailure',
            message: 'Unavailable'
        });
        expect(error.message).toContain('secret-token');
    });

    it('omits exceptions when sanitizers or exception getters fail', () => {
        const error = new Error('private database URL');
        expect(
            sanitizeException(error, () => {
                throw error;
            })
        ).toBeUndefined();
        expect(
            sanitizeException(error, () => ({
                get message(): string {
                    throw error;
                }
            }))
        ).toBeUndefined();
    });

    it('captures non-Error values only when raw capture is deliberate', () => {
        expect(sanitizeException('private', 'raw')).toEqual({
            message: 'private'
        });
        expect(
            sanitizeException(
                {
                    toString() {
                        throw new Error('private');
                    }
                },
                'raw'
            )
        ).toBeUndefined();
    });
});

import { describe, expect, it } from 'vitest';
import { extractCorrelationId, generateCorrelationId } from './correlation.js';

describe('correlation', () => {
    describe('generateCorrelationId', () => {
        it('should return a UUID-formatted string', () => {
            const id = generateCorrelationId();
            expect(id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
            );
        });

        it('should be UUID v7 (version nibble = 7)', () => {
            const id = generateCorrelationId();
            // The version nibble is the first hex digit of the 3rd group
            expect(id[14]).toBe('7');
        });

        it('should generate unique IDs', () => {
            const ids = new Set<string>();
            for (let i = 0; i < 100; i++) {
                ids.add(generateCorrelationId());
            }
            expect(ids.size).toBe(100);
        });
    });

    describe('extractCorrelationId', () => {
        it('should extract X-Correlation-Id', () => {
            const id = extractCorrelationId({
                'x-correlation-id': 'test-id'
            });
            expect(id).toBe('test-id');
        });

        it('should extract X-Request-Id as fallback', () => {
            const id = extractCorrelationId({
                'x-request-id': 'req-id'
            });
            expect(id).toBe('req-id');
        });

        it('should extract traceparent trace-id', () => {
            const id = extractCorrelationId({
                traceparent: '00-abc123def456-789012-01'
            });
            expect(id).toBe('abc123def456');
        });

        it('should generate new ID when no headers found', () => {
            const id = extractCorrelationId({});
            expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
        });

        it('should prioritize X-Correlation-Id over X-Request-Id', () => {
            const id = extractCorrelationId({
                'x-correlation-id': 'corr-id',
                'x-request-id': 'req-id'
            });
            expect(id).toBe('corr-id');
        });

        it('should handle array header values', () => {
            const id = extractCorrelationId({
                'x-correlation-id': ['first', 'second']
            });
            expect(id).toBe('first');
        });
    });
});

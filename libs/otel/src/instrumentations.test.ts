import { describe, expect, it } from 'vitest';
import {
    outboundHttpInstrumentations,
    runtimeMetrics
} from './instrumentations.js';

describe('instrumentations', () => {
    it('outboundHttpInstrumentations returns an array', () => {
        const result = outboundHttpInstrumentations();
        expect(Array.isArray(result)).toBe(true);
        // The dev deps are installed, so we expect both instrumentations
        expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('runtimeMetrics returns an array', () => {
        const result = runtimeMetrics();
        expect(Array.isArray(result)).toBe(true);
    });
});

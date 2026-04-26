import { describe, expect, it } from 'vitest';
import {
    LogLevel,
    levelToShortString,
    levelToString,
    parseLogLevel
} from './LogLevel.js';

describe('LogLevel helpers', () => {
    it('parseLogLevel handles all level names case-insensitively', () => {
        expect(parseLogLevel('trace')).toBe(LogLevel.Trace);
        expect(parseLogLevel('DEBUG')).toBe(LogLevel.Debug);
        expect(parseLogLevel('Information')).toBe(LogLevel.Information);
        expect(parseLogLevel('WARNING')).toBe(LogLevel.Warning);
        expect(parseLogLevel('error')).toBe(LogLevel.Error);
        expect(parseLogLevel('FATAL')).toBe(LogLevel.Fatal);
    });

    it('parseLogLevel throws on unknown level name', () => {
        expect(() => parseLogLevel('verbose')).toThrow(/Invalid log level/);
    });

    it('levelToString returns all level name strings', () => {
        expect(levelToString(LogLevel.Trace)).toBe('trace');
        expect(levelToString(LogLevel.Debug)).toBe('debug');
        expect(levelToString(LogLevel.Information)).toBe('information');
        expect(levelToString(LogLevel.Warning)).toBe('warning');
        expect(levelToString(LogLevel.Error)).toBe('error');
        expect(levelToString(LogLevel.Fatal)).toBe('fatal');
    });

    it('levelToString defaults to "information" for unknown value', () => {
        expect(levelToString(99 as any)).toBe('information');
    });

    it('levelToShortString returns three-letter codes for all levels', () => {
        expect(levelToShortString(LogLevel.Trace)).toBe('TRC');
        expect(levelToShortString(LogLevel.Debug)).toBe('DBG');
        expect(levelToShortString(LogLevel.Information)).toBe('INF');
        expect(levelToShortString(LogLevel.Warning)).toBe('WRN');
        expect(levelToShortString(LogLevel.Error)).toBe('ERR');
        expect(levelToShortString(LogLevel.Fatal)).toBe('FTL');
    });

    it('levelToShortString defaults to "INF" for unknown value', () => {
        expect(levelToShortString(99 as any)).toBe('INF');
    });
});

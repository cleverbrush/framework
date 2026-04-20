import { describe, expect, it, vi } from 'vitest';
import { SelfLog } from './SelfLog.js';

describe('SelfLog', () => {
    it('should not output when disabled', () => {
        const writeSpy = vi
            .spyOn(process.stderr, 'write')
            .mockImplementation(() => true);

        SelfLog.disable();
        SelfLog.write('test message');

        expect(writeSpy).not.toHaveBeenCalled();
        writeSpy.mockRestore();
    });

    it('should output when enabled', () => {
        const writeSpy = vi
            .spyOn(process.stderr, 'write')
            .mockImplementation(() => true);

        SelfLog.enable();
        SelfLog.write('test message');

        expect(writeSpy).toHaveBeenCalledTimes(1);
        const output = writeSpy.mock.calls[0][0] as string;
        expect(output).toContain('SelfLog]');
        expect(output).toContain('test message');

        SelfLog.disable();
        writeSpy.mockRestore();
    });

    it('should use custom output', () => {
        const writeSpy = vi
            .spyOn(process.stderr, 'write')
            .mockImplementation(() => true);

        SelfLog.enable();
        SelfLog.write('custom output');

        expect(writeSpy).toHaveBeenCalledTimes(1);
        const output = writeSpy.mock.calls[0][0] as string;
        expect(output).toContain('custom output');

        SelfLog.disable();
        writeSpy.mockRestore();
    });
});

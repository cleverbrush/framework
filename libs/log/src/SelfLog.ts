/**
 * Internal diagnostic channel for the logging library's own errors.
 *
 * Sinks use this when they fail, instead of throwing and crashing
 * the application. By default writes to `process.stderr`.
 *
 * @example
 * ```ts
 * SelfLog.setOutput(fs.createWriteStream('./logs/selflog.txt'));
 * SelfLog.disable();
 * ```
 */
export const SelfLog = {
    _enabled: true,
    _output: null as null | { write(s: string): void },

    /**
     * Writes an internal diagnostic message. Includes optional error details.
     *
     * @param message - diagnostic message
     * @param error - optional associated error
     */
    write(message: string, error?: unknown): void {
        if (!this._enabled) return;
        const timestamp = new Date().toISOString();
        const errorStr =
            error instanceof Error
                ? ` ${error.stack ?? error.message}`
                : error !== undefined
                  ? ` ${String(error)}`
                  : '';
        const line = `[${timestamp} SelfLog] ${message}${errorStr}\n`;
        if (this._output) {
            this._output.write(line);
        } else if (typeof process !== 'undefined' && process.stderr) {
            process.stderr.write(line);
        }
    },

    /**
     * Sets a custom output stream for self-diagnostics.
     *
     * @param output - writable stream with a `write` method
     */
    setOutput(output: { write(s: string): void }): void {
        this._output = output;
    },

    /** Suppresses all internal diagnostic output. */
    disable(): void {
        this._enabled = false;
    },

    /** Re-enables internal diagnostic output. */
    enable(): void {
        this._enabled = true;
    }
};

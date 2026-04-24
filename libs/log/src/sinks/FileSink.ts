import * as fs from 'node:fs';
import * as path from 'node:path';
import { formatClef } from '../formatters/ClefFormatter.js';
import type { LogEvent } from '../LogEvent.js';
import { type LogLevelName, parseLogLevel } from '../LogLevel.js';
import { SelfLog } from '../SelfLog.js';
import type { LogSink } from '../Sink.js';

/**
 * File rotation configuration.
 */
export interface RotationOptions {
    /** Rotation strategy. */
    strategy: 'size' | 'time' | 'hybrid';
    /** Time-based rotation interval (for `'time'` and `'hybrid'`). */
    interval?: 'hourly' | 'daily';
    /** Maximum file size in bytes before rotation (for `'size'` and `'hybrid'`). */
    maxBytes?: number;
    /** Number of rotated files to retain. @default 10 */
    retainCount?: number;
}

/**
 * File sink configuration.
 */
export interface FileSinkOptions {
    /** Path to the log file. */
    path: string;
    /** Minimum level for this sink. */
    minimumLevel?: LogLevelName;
    /** Rotation configuration. */
    rotation?: RotationOptions;
}

/**
 * Creates a file sink that writes CLEF-formatted log events.
 *
 * Supports size-based, time-based, and hybrid rotation strategies.
 *
 * @param options - file sink configuration
 * @returns a `LogSink` that appends to a file
 *
 * @example
 * ```ts
 * const sink = fileSink({
 *     path: './logs/app.log',
 *     rotation: { strategy: 'time', interval: 'daily', retainCount: 30 },
 * });
 * ```
 */
export function fileSink(options: FileSinkOptions): LogSink {
    const filePath = path.resolve(options.path);
    const minLevel = options.minimumLevel
        ? parseLogLevel(options.minimumLevel)
        : undefined;
    const rotation = options.rotation;
    const retainCount = rotation?.retainCount ?? 10;

    let currentSize = 0;
    let currentDate = getDateString(new Date(), rotation?.interval);
    let stream: fs.WriteStream | undefined;

    function ensureDir(): void {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    function getStream(): fs.WriteStream {
        if (!stream || stream.closed) {
            ensureDir();
            stream = fs.createWriteStream(filePath, {
                flags: 'a'
            });
            try {
                const stats = fs.statSync(filePath);
                currentSize = stats.size;
            } catch {
                currentSize = 0;
            }
        }
        return stream;
    }

    function shouldRotate(): boolean {
        if (!rotation) return false;

        const now = new Date();
        const nowDate = getDateString(now, rotation.interval);

        if (rotation.strategy === 'time') {
            return nowDate !== currentDate;
        }
        if (rotation.strategy === 'size') {
            return (
                rotation.maxBytes !== undefined &&
                currentSize >= rotation.maxBytes
            );
        }
        if (rotation.strategy === 'hybrid') {
            return (
                nowDate !== currentDate ||
                (rotation.maxBytes !== undefined &&
                    currentSize >= rotation.maxBytes)
            );
        }
        return false;
    }

    function rotate(): void {
        if (stream) {
            stream.end();
            stream = undefined;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const ext = path.extname(filePath);
        const base = filePath.slice(0, -ext.length || undefined);
        const rotatedPath = `${base}.${timestamp}${ext}`;

        try {
            if (fs.existsSync(filePath)) {
                fs.renameSync(filePath, rotatedPath);
            }
        } catch (err) {
            SelfLog.write('File rotation failed', err);
        }

        currentSize = 0;
        currentDate = getDateString(new Date(), rotation?.interval);

        // Prune old files
        pruneOldFiles(filePath, retainCount);
    }

    return {
        async emit(events: LogEvent[]): Promise<void> {
            for (const event of events) {
                if (minLevel !== undefined && event.level < minLevel) {
                    continue;
                }

                if (shouldRotate()) {
                    rotate();
                }

                const line = formatClef(event) + '\n';
                const s = getStream();
                s.write(line);
                currentSize += Buffer.byteLength(line);
            }
        },

        async flush(): Promise<void> {
            if (stream) {
                await new Promise<void>((resolve, reject) => {
                    stream!.once('drain', resolve);
                    stream!.once('error', reject);
                    if (!stream!.write('')) {
                        // Waiting for drain
                    } else {
                        resolve();
                    }
                });
            }
        },

        async [Symbol.asyncDispose](): Promise<void> {
            if (stream) {
                await new Promise<void>(resolve => {
                    stream!.end(() => resolve());
                });
                stream = undefined;
            }
        }
    };
}

function getDateString(date: Date, interval?: 'hourly' | 'daily'): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    if (interval === 'hourly') {
        const h = String(date.getHours()).padStart(2, '0');
        return `${y}-${m}-${d}-${h}`;
    }
    return `${y}-${m}-${d}`;
}

function pruneOldFiles(basePath: string, retainCount: number): void {
    try {
        const dir = path.dirname(basePath);
        const base = path.basename(basePath);
        const ext = path.extname(base);
        const nameWithoutExt = base.slice(0, -ext.length || undefined);

        const files = fs
            .readdirSync(dir)
            .filter(f => f.startsWith(nameWithoutExt + '.') && f !== base)
            .sort();

        if (files.length > retainCount) {
            const toDelete = files.slice(0, files.length - retainCount);
            for (const file of toDelete) {
                fs.unlinkSync(path.join(dir, file));
            }
        }
    } catch (err) {
        SelfLog.write('Failed to prune old log files', err);
    }
}

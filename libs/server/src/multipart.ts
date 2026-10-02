import type { IncomingMessage } from 'node:http';
import { Busboy, type BusboyFileStream } from '@fastify/busboy';
import { HttpError } from './HttpError.js';
import type { FilePart, RejectedFile } from './types.js';
import type { UploadConfiguration } from './upload.js';

function failure(status: number, detail: string, field?: string): HttpError {
    const pointer =
        field === undefined
            ? '/files'
            : `/files/${field.replace(/~/g, '~0').replace(/\//g, '~1')}`;
    return new HttpError(
        status,
        status === 413 ? 'Payload Too Large' : 'Bad Request',
        detail,
        {
            errors: [{ pointer, detail }]
        }
    );
}

/** @internal Buffered multipart parsing with a bound on the entire wire body. */
export async function parseMultipart(
    req: IncomingMessage,
    options: UploadConfiguration,
    maxBodySize: number
): Promise<{
    fields: Record<string, string>;
    files: Record<string, FilePart | FilePart[]>;
    rejectedFiles: RejectedFile[];
}> {
    const maxFileCount = options.maxFileCount ?? 10;
    const maxFieldCount = options.maxFieldCount ?? 100;
    const properties = options.schema?.introspect().properties;
    const fields: Record<string, string> = Object.create(null);
    const collected: Record<string, FilePart[]> = Object.create(null);
    const rejectedFiles: RejectedFile[] = [];
    const seenFiles = new Set<string>();
    const contentLength = Number(req.headers['content-length']);
    if (contentLength > maxBodySize) {
        req.resume();
        throw failure(413, 'Multipart request exceeds maxBodySize');
    }
    await new Promise<void>((resolve, reject) => {
        let finished = false;
        let bytes = 0;
        const active = new Map<BusboyFileStream, Buffer[]>();
        const parser = Busboy({
            headers: req.headers as { 'content-type': string },
            limits: {
                fileSize: options.maxFileSize ?? 10 * 1024 * 1024,
                files: maxFileCount,
                fieldSize: options.maxFieldSize ?? 1024 * 1024,
                fields: maxFieldCount,
                parts: options.maxPartCount ?? maxFileCount + maxFieldCount
            }
        });
        const cleanup = () => {
            req.unpipe(parser);
            req.off('data', countBytes);
            req.off('aborted', aborted);
            req.off('error', onError);
            req.off('close', closed);
            for (const [stream, chunks] of active) {
                chunks.length = 0;
                stream.destroy();
            }
            active.clear();
        };
        const fail = (error: unknown) => {
            if (finished) return;
            finished = true;
            cleanup();
            for (const key of Object.keys(collected)) delete collected[key];
            parser.destroy();
            req.resume();
            reject(
                error instanceof HttpError
                    ? error
                    : failure(400, 'Malformed multipart request')
            );
        };
        const countBytes = (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > maxBodySize)
                fail(failure(413, 'Multipart request exceeds maxBodySize'));
        };
        const aborted = () =>
            fail(failure(400, 'Multipart request interrupted'));
        const closed = () => {
            if (!req.complete) aborted();
        };
        const onError = (error: Error) => fail(error);
        const checkName = (name: string) => {
            if (Buffer.byteLength(name) > (options.maxFieldNameSize ?? 100)) {
                fail(failure(413, 'Multipart field name is too long', name));
                return false;
            }
            return true;
        };
        parser.on('field', (name, value, nameTruncated, valueTruncated) => {
            if (finished || !checkName(name)) return;
            if (nameTruncated || valueTruncated) {
                fail(
                    failure(413, 'Multipart field exceeds its size limit', name)
                );
                return;
            }
            if (
                Object.hasOwn(fields, name) ||
                seenFiles.has(name) ||
                (properties && Object.hasOwn(properties, name))
            ) {
                fail(
                    failure(
                        400,
                        'Duplicate or incorrectly encoded multipart field',
                        name
                    )
                );
                return;
            }
            fields[name] = value;
        });
        parser.on('file', (name, stream, filename, _encoding, mimeType) => {
            const chunks: Buffer[] = [];
            active.set(stream, chunks);
            stream.on('error', onError);
            stream.on('limit', () =>
                fail(failure(413, 'File exceeds maxFileSize', name))
            );
            if (finished || !checkName(name)) {
                stream.resume();
                return;
            }
            const property =
                properties && Object.hasOwn(properties, name)
                    ? properties[name]
                    : undefined;
            const multiple = property?.introspect().type === 'array';
            if (
                (properties && !property) ||
                Object.hasOwn(fields, name) ||
                (seenFiles.has(name) && !multiple)
            ) {
                fail(failure(400, 'Unknown or duplicate file field', name));
                return;
            }
            seenFiles.add(name);
            const allowed =
                !options.allowedMimeTypes ||
                options.allowedMimeTypes.some(pattern =>
                    pattern.endsWith('/*')
                        ? mimeType.startsWith(pattern.slice(0, -1))
                        : mimeType === pattern
                );
            if (!allowed) {
                if (properties) {
                    fail(
                        failure(
                            400,
                            `MIME type "${mimeType}" is not allowed`,
                            name
                        )
                    );
                    return;
                }
                rejectedFiles.push({
                    fieldName: name,
                    filename,
                    mimeType,
                    reason: `MIME type "${mimeType}" is not allowed`
                });
                stream.on('end', () => active.delete(stream));
                stream.resume();
                return;
            }
            // Reserve the position at part arrival, not when its stream ends.
            const list = collected[name] ?? [];
            collected[name] = list;
            const index = list.length;
            list.push(undefined as unknown as FilePart);
            stream.on('data', (chunk: Buffer) => {
                if (!finished) chunks.push(chunk);
            });
            stream.on('end', () => {
                active.delete(stream);
                if (finished) return;
                if (stream.truncated) {
                    fail(failure(413, 'File was truncated', name));
                    return;
                }
                const buffer = Buffer.concat(chunks);
                chunks.length = 0;
                list[index] = {
                    filename,
                    mimeType,
                    buffer,
                    size: buffer.length
                };
            });
        });
        parser.on('filesLimit', () =>
            fail(failure(413, 'Exceeded maxFileCount'))
        );
        parser.on('fieldsLimit', () =>
            fail(failure(413, 'Exceeded maxFieldCount'))
        );
        parser.on('partsLimit', () =>
            fail(failure(413, 'Exceeded maxPartCount'))
        );
        parser.on('error', onError);
        parser.on('finish', () => {
            if (finished) return;
            finished = true;
            cleanup();
            resolve();
        });
        req.on('data', countBytes);
        req.once('aborted', aborted);
        req.once('error', onError);
        req.once('close', closed);
        req.pipe(parser);
    });
    const files: Record<string, FilePart | FilePart[]> = Object.create(null);
    for (const [name, values] of Object.entries(collected)) {
        files[name] =
            properties?.[name]?.introspect().type === 'array'
                ? values
                : values[0];
    }
    if (options.schema) {
        for (const [name, property] of Object.entries(properties!)) {
            const info = (property as any).introspect();
            if (
                info.type === 'array' &&
                info.isRequired &&
                !Object.hasOwn(files, name)
            )
                files[name] = [];
        }
        const result = await options.schema.validateAsync(files, {
            doNotStopOnFirstError: true
        });
        if (!result.valid) {
            const errors = result.getInvalidProperties().flatMap(prop =>
                prop.errors.map(detail => ({
                    pointer: `/files${prop.descriptor.toJsonPointer()}`,
                    detail
                }))
            );
            throw new HttpError(
                400,
                'Bad Request',
                'Upload contract validation failed',
                {
                    errors: errors.length
                        ? errors
                        : result.errors?.map(error => ({
                              pointer: '/files',
                              detail: error.message
                          }))
                }
            );
        }
        return {
            fields,
            files: Object.fromEntries(
                Object.entries(result.object!).filter(
                    ([, value]) => value !== undefined
                )
            ),
            rejectedFiles
        };
    }
    return { fields, files, rejectedFiles };
}

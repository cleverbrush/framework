import {
    any,
    type InferType,
    type ObjectSchemaBuilder,
    type SchemaBuilder
} from '@cleverbrush/schema';
import type { FilePart, UploadOptions } from './types.js';

/** A buffered file in an upload contract. Safe to import in browser contracts. */
export function file() {
    return any()
        .hasType<FilePart>()
        .addValidator(value => {
            const valid =
                value !== null &&
                typeof value === 'object' &&
                typeof value.filename === 'string' &&
                typeof value.mimeType === 'string' &&
                value.buffer instanceof Uint8Array &&
                value.size === value.buffer.byteLength;
            return {
                valid,
                errors: valid ? [] : [{ message: 'Expected an uploaded file' }]
            };
        })
        .withExtension('uploadFile', true);
}

/** Flat object of file() and array(file()) fields. */
export type UploadSchema = ObjectSchemaBuilder<
    any,
    any,
    any,
    any,
    any,
    any,
    any
>;
/** Upload metadata shared by the server, typed client, and OpenAPI generator. */
export interface UploadConfiguration extends UploadOptions {
    readonly schema?: UploadSchema;
}
/** The upload state carried through immutable endpoint chaining. */
export type UploadContract = boolean | UploadSchema;
/** Files received by a handler, inferred from the upload schema. */
export type UploadFiles<T extends UploadContract> = T extends UploadSchema
    ? InferType<T>
    : Record<string, FilePart>;

/** @internal Validate the supported multipart shape in either chaining order. */
export function validateUploadConfiguration(
    upload: UploadConfiguration | null,
    body: SchemaBuilder<any, any, any, any, any> | null
): void {
    if (!upload) return;
    for (const key of [
        'maxFileSize',
        'maxFileCount',
        'maxFieldSize',
        'maxFieldCount',
        'maxFieldNameSize',
        'maxPartCount'
    ] as const) {
        const value = upload[key];
        if (value !== undefined && (!Number.isSafeInteger(value) || value < 1))
            throw new TypeError(`${key} must be a positive safe integer`);
    }
    if (!upload.schema) return;
    const root = upload.schema.introspect();
    if (
        root.type !== 'object' ||
        root.isNullable ||
        !root.isRequired ||
        root.acceptUnknownProps
    )
        throw new TypeError('Upload schemas must be required, closed objects');
    const bodyInfo = body?.introspect() as any;
    if (bodyInfo && bodyInfo.type !== 'object')
        throw new TypeError('Multipart body schemas must be objects');
    for (const [name, property] of Object.entries(root.properties)) {
        const info = (property as SchemaBuilder<any>).introspect() as any;
        const leaf =
            info.type === 'array' ? info.elementSchema?.introspect() : info;
        if (
            !leaf?.extensions?.uploadFile ||
            info.isNullable ||
            leaf.isNullable ||
            info.hasDefault ||
            leaf.hasDefault ||
            (info.type === 'array' && !leaf.isRequired)
        )
            throw new TypeError(
                `Upload field "${name}" must be file() or array(file())`
            );
        if (Object.hasOwn(bodyInfo?.properties ?? {}, name))
            throw new TypeError(
                `Multipart text and file fields overlap: ${name}`
            );
    }
}

import { array, object, string } from '@cleverbrush/schema';
import { expect, it } from 'vitest';
import { endpoint } from './Endpoint.js';
import { file } from './upload.js';

it('keeps upload schemas and limits through immutable chaining', () => {
    const files = object({
        images: array(file()).minLength(1),
        cover: file().optional()
    });
    const base = endpoint.post('/files');
    const upload = base
        .upload(files, { maxFieldSize: 20 })
        .body(object({ title: string() }))
        .summary('Upload');
    expect(base.introspect().fileUpload).toBeNull();
    expect(upload.introspect().fileUpload).toMatchObject({
        schema: files,
        maxFieldSize: 20
    });
    expect(file().optional().introspect().extensions?.uploadFile).toBe(true);
});

it('rejects ambiguous or unsupported multipart contracts in either chaining order', () => {
    expect(() =>
        endpoint.post('/').upload(object({ image: string() }))
    ).toThrow(/file/);
    expect(() =>
        endpoint.post('/').upload(object({ image: file().nullable() }))
    ).toThrow(/file/);
    expect(() =>
        endpoint
            .post('/')
            .upload(object({ image: file() }).acceptUnknownProps())
    ).toThrow(/closed/);
    expect(() =>
        endpoint
            .post('/')
            .body(object({ image: string() }))
            .upload(object({ image: file() }))
    ).toThrow(/overlap/);
    expect(() =>
        endpoint
            .post('/')
            .upload(object({ image: file() }))
            .body(object({ image: string() }))
    ).toThrow(/overlap/);
    expect(() => endpoint.post('/').upload({ maxFileCount: 0 })).toThrow(
        /positive/
    );
});

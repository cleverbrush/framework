import { array, object } from '@cleverbrush/schema';
import {
    type ActionContext,
    defineApi,
    endpoint,
    type FilePart,
    file
} from '@cleverbrush/server/contract';
import { expectTypeOf, it } from 'vitest';
import { createClient } from './client.js';
import type { EndpointCallArgs } from './types.js';

it('infers upload fields on server and client', () => {
    const upload = endpoint
        .post('/files')
        .upload(
            object({
                images: array(file()).minLength(1),
                cover: file().optional()
            })
        )
        .summary('Files');
    const legacy = endpoint.post('/legacy').upload();
    const api = defineApi({ assets: { upload, legacy } });
    const client = createClient(api);
    expectTypeOf<
        ActionContext<typeof upload>['files']['images']
    >().toEqualTypeOf<FilePart[]>();
    expectTypeOf<
        ActionContext<typeof upload>['files']['cover']
    >().toEqualTypeOf<FilePart | undefined>();
    expectTypeOf<
        EndpointCallArgs<typeof upload>['files']['images']
    >().toEqualTypeOf<(FilePart | Blob)[]>();
    expectTypeOf<
        EndpointCallArgs<typeof upload>['files']['cover']
    >().toEqualTypeOf<FilePart | Blob | undefined>();
    expectTypeOf<ActionContext<typeof legacy>['files']>().toEqualTypeOf<
        Record<string, FilePart>
    >();
    client.assets.upload({ files: { images: [new Blob(['one'])] } });
    // @ts-expect-error required field missing
    client.assets.upload({ files: {} });
    // @ts-expect-error multiple field requires an array
    client.assets.upload({ files: { images: new Blob() } });
    // @ts-expect-error no dummy body is part of a files-only contract
    client.assets.upload({ files: { images: [] }, body: {} });
    // @ts-expect-error undeclared file field
    client.assets.upload({ files: { images: [], extra: new Blob() } });
    client.assets.legacy({ files: { image: new Blob() } });
});

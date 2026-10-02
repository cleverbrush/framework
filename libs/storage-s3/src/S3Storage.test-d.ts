import type { ObjectStorage } from '@cleverbrush/storage';
import { expectTypeOf, it } from 'vitest';
import type { S3Storage, S3StorageOptions } from './index.js';

it('implements the provider-neutral contract with explicit provider configuration', () => {
    expectTypeOf<S3Storage>().toExtend<ObjectStorage>();
    expectTypeOf<S3StorageOptions['credentials']>().toEqualTypeOf<{
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken?: string;
    }>();
    // @ts-expect-error A custom endpoint is required, not inferred from AWS defaults.
    const _missingEndpoint: S3StorageOptions = {
        region: 'garage',
        bucket: 'assets',
        credentials: { accessKeyId: 'a', secretAccessKey: 'b' }
    };
});

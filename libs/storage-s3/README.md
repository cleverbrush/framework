# @cleverbrush/storage-s3
<!-- coverage-badge-start -->
![Unit coverage](https://img.shields.io/badge/unit_coverage-90.7%25-brightgreen)
<!-- coverage-badge-end -->

An implementation of [`ObjectStorage`](../storage) for S3-compatible services.
Uses the modular AWS SDK as a protocol client; an AWS account is not required.
Explicit endpoints and credentials are required, with no ambient AWS credential
lookup. The package is server-only and requires Node.js 24+.

## Configure a provider

```ts
import { S3Storage } from '@cleverbrush/storage-s3';

await using storage = new S3Storage({
    endpoint: process.env.STORAGE_ENDPOINT!,
    region: process.env.STORAGE_REGION!,
    bucket: process.env.STORAGE_BUCKET!,
    credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!
    },
    forcePathStyle: true,
    keyPrefix: 'assets',
    publicBaseUrl: 'https://assets.example.com'
});

await storage.put('images/logo.png', imageBytes, { contentType: 'image/png' });
const url = storage.publicUrl('images/logo.png');
// https://assets.example.com/assets/images/logo.png
// Leaving this scope automatically awaits storage.close().
```

`await using` closes owned storage on both normal scope exit and exceptions,
waiting for active work and multipart cleanup. Keep application-wide instances
alive until shutdown; handlers borrowing injected storage must not dispose them.
Explicit `await storage.close()` is also supported and is idempotent.

The public base URL is the public bucket/proxy root. The prefix is appended once,
so do not include the same prefix in both settings. No public URL is inferred
from the authenticated endpoint. Configuring it does not change bucket access.

| Option | Default / purpose |
| --- | --- |
| `endpoint`, `region`, `bucket`, `credentials` | Required, explicit provider configuration. Credentials optionally include `sessionToken`. |
| `forcePathStyle` | `true`; set `false` for virtual-hosted bucket addressing. |
| `keyPrefix` | Empty; applied to every operation and public URL, omitted from returned keys. |
| `publicBaseUrl` | Unset; `publicUrl()` then returns `undefined`. |
| `partSize` | 5 MiB minimum and default. Increase for uploads that would exceed 10,000 parts. |
| `queueSize` | Four concurrent parts; multipart buffering is approximately part size × concurrency, plus stream buffers. |
| `requestTimeoutMs` | 30,000 milliseconds per network request, including cleanup; connections are limited to at most 10 seconds. |
| `requestChecksumCalculation` | `WHEN_REQUIRED`; optional `WHEN_SUPPORTED` for providers supporting SDK checksum extensions. |
| `responseChecksumValidation` | `WHEN_REQUIRED`; optional `WHEN_SUPPORTED`. |

The SDK retries retryable requests up to three attempts. Streams are broken into
bounded, replayable parts instead of retrying a consumed stream as a whole. Failed
uploads attempt `AbortMultipartUpload`, including failures during completion.
Cleanup requires a reachable provider; configure an incomplete-upload lifecycle
rule as an operational backstop. `close()` waits for owned work and cleanup before
destroying the client. It is idempotent and also available via `await using`.

Writes default to `application/octet-stream`. S3 user metadata accepts ASCII
values and names containing letters, digits, `_` and `-`; names are lowercased,
and duplicate names after lowercasing are rejected. Keys, including the prefix,
must fit S3's 1,024-byte limit. Copy uses native same-bucket `CopyObject`, preserving
headers and metadata. Provider copy-size limits apply (commonly 5 GiB); multipart
copy, version selection, ACLs, object tags and bucket provisioning are outside
this API. Deletion affects the current object; version-retention policy remains
provider configuration.

## Provider examples and verification

| Provider | Endpoint | Region | Addressing |
| --- | --- | --- | --- |
| Garage test service | `http://127.0.0.1:<port>` | `garage` | Path style |
| Hetzner example | `https://fsn1.your-objectstorage.com` | `fsn1` | `forcePathStyle: false` |
| Other self-hosted services | Your S3 service URL | Server-configured region | Configurable |

The same adapter serves every row. Garage v2.3.0 is exercised by CI, including
multipart abort cleanup. The Hetzner configuration follows its
[SDK examples](https://docs.hetzner.com/storage/object-storage/getting-started/using-libraries/)
and [supported operations](https://docs.hetzner.com/storage/object-storage/supported-actions/);
a live Hetzner account is not part of the default test suite. MinIO and other
implementations can run the same contract suite; they are not claimed as CI-tested.

## Typed multipart upload handler

The storage API accepts the bytes already provided by the Framework upload
contract. Storage SDK imports and configuration stay in backend modules.

```ts
import { randomUUID } from 'node:crypto';
import { any, array, object, string } from '@cleverbrush/schema';
import { ActionResult, endpoint, file, type Handler } from '@cleverbrush/server';
import type { ObjectStorage } from '@cleverbrush/storage';

const AssetStorageToken = any().hasType<ObjectStorage>();
const UploadAssets = endpoint.post('/assets')
    .upload(object({ images: array(file()).minLength(1) }))
    .inject({ storage: AssetStorageToken })
    .responses({ 201: array(object({ key: string(), url: string().optional() })) });

const upload: Handler<typeof UploadAssets> = async ({ files }, { storage }) => {
    const results = [];
    for (const image of files.images) {
        const key = `images/${randomUUID()}`;
        await storage.put(key, image.buffer, {
            contentType: image.mimeType, size: image.size
        });
        results.push({ key, url: storage.publicUrl(key) });
    }
    return ActionResult.created(results);
};
```

Add application authorization, reference tracking and recovery policy around this
handler. Keep DTOs and upload contracts in browser-safe modules; import only
`ObjectStorage` types in backend code. Existing HTTP multipart parsing remains
buffered; stream-capable storage does not change that HTTP contract.

## Stream a stored object to an HTTP response

`pipeline` handles backpressure and destroys streams on failure/disconnect. Attach
cancellation before opening the object so disconnects also cancel pending reads:

```ts
import { pipeline } from 'node:stream/promises';
import { ActionResult } from '@cleverbrush/server';

// Inside an authorized backend handler with storage and a resolved object key:
return ActionResult.raw(async (_request, response) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    response.once('close', abort);
    try {
        const object = await storage.get(key, { signal: controller.signal });
        try {
            response.setHeader('content-type', object.contentType ?? 'application/octet-stream');
            response.setHeader('content-length', object.size);
            await pipeline(object.body, response);
        } finally {
            object.body.destroy();
        }
    } finally {
        response.off('close', abort);
    }
});
```

## Run compatibility tests

```sh
npm ci
npm run build
npm run test:storage:integration
```

The command starts a disposable official Garage container pinned by digest, runs
shared contract and real multipart tests, and removes the container and temporary
configuration afterward. Docker is required for the default local/CI fixture.

To test an existing, explicitly designated test bucket, set
`STORAGE_TEST_ENDPOINT`, `STORAGE_TEST_REGION`, `STORAGE_TEST_BUCKET`,
`STORAGE_TEST_ACCESS_KEY_ID`, `STORAGE_TEST_SECRET_ACCESS_KEY`, and optionally
`STORAGE_TEST_FORCE_PATH_STYLE=false` and `STORAGE_TEST_PUBLIC_BASE_URL` before
running the same command. No container or bucket is created in this mode. Tests
write only beneath unique `framework-storage-tests/<uuid>/` prefixes and delete
their objects afterward. The credentials need bucket metadata access, object read/write/delete/copy and
multipart upload/list/abort permissions. No production provider is provisioned by
this package.

# @cleverbrush/storage
<!-- coverage-badge-start -->
![Unit coverage](https://img.shields.io/badge/unit_coverage-100%25-brightgreen)
<!-- coverage-badge-end -->

Provider-neutral object storage contracts and key/URL helpers for Node.js 24+.
The core has no runtime dependencies. Use an adapter such as
[`@cleverbrush/storage-s3`](../storage-s3) for self-hosted or hosted S3 services.

## Contract

| Method | Behavior |
| --- | --- |
| `put(key, bytesOrStream, options?)` | Replace an object; return logical key, actual byte size and optional ETag. |
| `get(key, { signal }?)` | Return metadata and a readable body; throw `not_found` when missing. |
| `stat(key, { signal }?)` | Return metadata, or `undefined` on a missing object; other errors throw. |
| `copy(source, destination, { signal }?)` | Copy within one storage instance, preserving metadata and replacing the destination. |
| `delete(key, { signal }?)` | Delete the current object; missing objects succeed. |
| `publicUrl(key)` | Return a stable public URL, or `undefined` without a configured public base URL. |
| `close()` | Abort active work, release resources and permanently close the instance. |
| `[Symbol.asyncDispose]()` | Await `close()` automatically when an `await using` scope ends. |

`StorageBody` accepts `Uint8Array` (including Buffer) or a binary Node `Readable`.
`PutOptions` supports `size`, `contentType`, `cacheControl`, `contentDisposition`,
string `metadata` and `signal`. Supplying `size` asserts the exact byte count.
Metadata names are case-insensitive and returned in lowercase. `ObjectMetadata`
adds these headers and an optional `lastModified` date to the write receipt.
ETags are opaque; compare bytes or calculate an independent checksum when needed.

## Ownership and errors

The adapter owns a supplied write stream for that operation, consuming it once
and destroying it on failure or cancellation. A returned read stream belongs to
the caller: consume it, pipe it with `pipeline`, or destroy it. A read's abort
signal stays active until its body closes. Adapters must not buffer complete
streamed objects.

Every `ObjectStorage` implements `AsyncDisposable`. Use `await using` when your
scope owns the instance; leaving that scope awaits `close()`, including when an
exception is thrown. Cleanup is asynchronous so active operations and multipart
cleanup finish before resources are released. Explicit `close()` remains
available and is safe to call more than once.

`StorageError.code` is one of `not_found`, `access_denied`, `aborted`,
`invalid_argument`, `unavailable`, `closed` or `provider_error`. Errors omit raw
provider requests, signed URLs, credentials and source error messages. Permission
errors are not interpreted as absent objects. Cancellation can race a completed
write; object storage operations are not database transactions.

## Keys and public URLs

Keys are logical relative names, not filesystem paths or URLs. They are never
normalized or decoded. Empty keys, leading slashes, backslashes, control
characters and `.` / `..` path segments are rejected. Spaces, Unicode, literal
percent signs and repeated slashes are retained. `prefixedObjectKey` applies a
configured prefix once; `publicObjectUrl` encodes segments without encoding slash
separators. Public base URLs must be HTTP(S), without credentials, query or hash.

A public URL is a mapping, not an access grant or an existence check. Configure
public bucket access or a proxy separately. Ownership checks, generated object
names, reference tracking, rendering and database consistency belong to the
application. Signed URLs and bucket management are not part of this contract.

## Dependency injection

Create application-owned schema tokens, just like other Framework services:

```ts
import { any } from '@cleverbrush/schema';
import type { ObjectStorage } from '@cleverbrush/storage';

export const AssetStorageToken = any().hasType<ObjectStorage>();
// services.addSingletonInstance(AssetStorageToken, storage);
// endpoint.inject({ storage: AssetStorageToken });
```

Register multiple tokens/instances when assets use different providers or buckets.
Keep application-wide adapters alive until application shutdown, then close them
after stopping incoming work. Handlers borrowing injected storage must not dispose
it. Use `await using` only in the scope that owns the adapter's lifetime.
The reusable contract suite under `testing/` is a repository test utility and is
not included in the published package.

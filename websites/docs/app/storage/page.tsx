import { docsMetadata } from '../site';

export const metadata = docsMetadata('/storage');

const setup = `import { S3Storage } from '@cleverbrush/storage-s3';

const storage = new S3Storage({
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

await storage.put('images/logo.png', imageBytes, {
    contentType: 'image/png'
});
const url = storage.publicUrl('images/logo.png');
await storage.close();`;

export default function StoragePage() {
    return (
        <div className="container">
            <h1>Object storage</h1>
            <p>
                <code>@cleverbrush/storage</code> defines a provider-neutral
                Node.js contract. <code>@cleverbrush/storage-s3</code>{' '}
                implements it for self-hosted and hosted S3-compatible services.
                Change the endpoint, region, bucket and credentials to choose a
                provider.
            </p>
            <div className="card">
                <h2>Configure an adapter</h2>
                <pre>
                    <code>{setup}</code>
                </pre>
                <p>
                    The public base URL is configured independently of the API
                    endpoint. It maps keys to stable public bucket or proxy
                    URLs; access policies remain deployment configuration. The
                    key prefix is appended once. Hetzner can use its regional
                    endpoint with virtual-hosted addressing by setting
                    <code> forcePathStyle: false</code>.
                </p>
            </div>
            <div className="card">
                <h2>Streaming and lifecycle</h2>
                <p>
                    Use put, get, stat, copy and delete with an AbortSignal.
                    Writes accept buffers or binary Node streams and use bounded
                    multipart uploads. Consume or destroy every returned read
                    stream. Close adapters during application shutdown to cancel
                    active work and release connections.
                </p>
                <p>
                    Metadata survives writes and copies. Errors have portable
                    codes and omit raw provider requests and credentials. Copy
                    stays within the configured bucket. ETags are opaque values,
                    not guaranteed content checksums.
                </p>
                <p>
                    Garage is covered by the CI contract suite. Other endpoints,
                    including Hetzner, can run the same suite against a
                    designated test bucket. Production provider selection is
                    independent of the Garage test fixture.
                </p>
                <a href="https://github.com/cleverbrush/framework/blob/development/libs/storage/README.md">
                    Storage contract and DI
                </a>
                {' · '}
                <a href="https://github.com/cleverbrush/framework/blob/development/libs/storage-s3/README.md">
                    S3 configuration, uploads and streaming examples
                </a>
            </div>
        </div>
    );
}

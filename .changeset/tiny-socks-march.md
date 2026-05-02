---
"@cleverbrush/server": minor
"@cleverbrush/server-openapi": minor
---

feat(server): add file upload support via `.upload()` and `FilePart` type

Adds `multipart/form-data` parsing with `@fastify/busboy`, a new `.upload()`
method on `EndpointBuilder`, and the `FilePart` type for handling uploaded
files in endpoint handlers. The OpenAPI generator emits `multipart/form-data`
request bodies for upload-enabled endpoints.

```ts
const ep = endpoint
    .post("/api/avatar")
    .upload({ maxFileSize: 2 * 1024 * 1024 })
    .body(object({ description: string().optional() }));

server.handle(ep, ({ files }) => {
    const avatar = files["avatar"];
    // { filename, mimeType, buffer, size }
});
```


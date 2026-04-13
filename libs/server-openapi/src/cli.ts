import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    generateOpenApiSpec,
    type OpenApiDocument,
    type OpenApiOptions
} from './generateOpenApiSpec.js';

/**
 * Generate an OpenAPI spec and write it to a file.
 *
 * @param options - Same options as `generateOpenApiSpec()`.
 * @param outputPath - File path to write the JSON spec to.
 * @returns The generated spec document.
 *
 * @example
 * ```ts
 * import { writeOpenApiSpec } from '@cleverbrush/server-openapi';
 * import { createServer, endpoint } from '@cleverbrush/server';
 *
 * const builder = createServer()
 *   .handle(endpoint.get('/api/health'), () => ({ ok: true }));
 *
 * writeOpenApiSpec(
 *   {
 *     registrations: builder.getRegistrations(),
 *     info: { title: 'My API', version: '1.0.0' }
 *   },
 *   './openapi.json'
 * );
 * ```
 */
export function writeOpenApiSpec(
    options: OpenApiOptions,
    outputPath: string
): OpenApiDocument {
    const spec = generateOpenApiSpec(options);
    const dir = path.dirname(outputPath);
    if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf-8');
    return spec;
}

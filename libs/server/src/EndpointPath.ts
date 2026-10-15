import type { EndpointBuilder, EndpointMetadata } from './Endpoint.js';

type AnyEndpoint = EndpointBuilder<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
>;
/** The path-parameter type declared by an endpoint. */
export type EndpointParams<E> =
    E extends EndpointBuilder<
        infer P,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any
    >
        ? P
        : never;
type PathMetadata = Pick<EndpointMetadata, 'basePath' | 'pathTemplate'>;

const trimTrailingSlash = (path: string) =>
    path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
const escapeRegex = (text: string) =>
    text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Match literal path text before decoding captured parameters. */
function literalPattern(literal: string): string {
    return Array.from(decodeURI(literal), character => {
        const encoded = encodeURI(character);
        return encoded === character
            ? escapeRegex(character)
            : `(?:${escapeRegex(character)}|${encoded.replace(/[A-F]/g, c => `[${c}${c.toLowerCase()}]`)})`;
    }).join('');
}

/**
 * Build a relative pathname from an endpoint's contract. Parameters are validated
 * and encoded individually, so reserved characters cannot introduce URL syntax.
 * Query strings and origins belong to the caller. Throws for invalid parameters.
 * @example endpointPath(api.files.content, { id: 'report 1' })
 */
export function endpointPath<E extends AnyEndpoint>(
    endpoint: E,
    ...args: keyof EndpointParams<E> extends never
        ? [params?: EndpointParams<E>]
        : [params: EndpointParams<E>]
): string {
    const { basePath, pathTemplate } = endpoint.introspect();
    if (typeof pathTemplate === 'string')
        return pathTemplate === '/' ? basePath || '/' : basePath + pathTemplate;
    const { literals, segments } = pathTemplate.introspect().templateDefinition;
    let path = basePath;
    for (let index = 0; index < segments.length; index++) {
        const segment = segments[index];
        const value = segment.descriptor.getValue(args[0] ?? {});
        if (!value.success || value.value == null)
            throw new TypeError(`Missing path parameter: ${segment.path}`);
        const checked = segment.schema.safeParse(value.value);
        if (!checked.valid)
            throw new TypeError(`Invalid path parameter: ${segment.path}`);
        path += literals[index] + encodeURIComponent(String(checked.object));
    }
    path += literals[segments.length] ?? '';
    return trimTrailingSlash(path) || '/';
}

/**
 * Match a pathname against one endpoint and return validated path parameters.
 * Returns undefined for a different route, invalid encoding/parameters or an
 * absolute URL/query/fragment. This does not check HTTP method or authorization.
 * One optional trailing slash is accepted, matching server routing. Parameters
 * may contain slashes when their schema permits them, as in route templates.
 */
export function matchEndpointPath<E extends AnyEndpoint>(
    endpoint: E,
    pathname: string
): EndpointParams<E> | undefined {
    return matchRoutePath(endpoint.introspect(), pathname) as
        | EndpointParams<E>
        | undefined;
}

/** @internal Shared by HTTP/WebSocket routing so matching has one implementation. */
export function matchRoutePath(
    meta: PathMetadata,
    pathname: string
): Record<string, unknown> | undefined {
    if (
        !pathname.startsWith('/') ||
        pathname.startsWith('//') ||
        /[?#]/.test(pathname)
    )
        return undefined;
    try {
        // Validate percent escapes without decoding dynamic values twice.
        decodeURI(pathname);
        const { basePath, pathTemplate } = meta;
        if (typeof pathTemplate === 'string') {
            const expected =
                pathTemplate === '/'
                    ? basePath || '/'
                    : basePath + pathTemplate;
            return trimTrailingSlash(decodeURI(pathname)) ===
                trimTrailingSlash(decodeURI(expected))
                ? {}
                : undefined;
        }
        const { literals, segments } =
            pathTemplate.introspect().templateDefinition;
        const pattern =
            literalPattern(basePath + (literals[0] ?? '')) +
            segments
                .map(
                    (_, index) =>
                        '(.*?)' + literalPattern(literals[index + 1] ?? '')
                )
                .join('');
        const matched = new RegExp(
            '^' + trimTrailingSlash(pattern) + '/?$'
        ).exec(pathname);
        if (!matched) return undefined;
        const params: Record<string, unknown> = {};
        for (let index = 0; index < segments.length; index++) {
            const segment = segments[index];
            const result = segment.schema.safeParse(
                decodeURIComponent(matched[index + 1])
            );
            if (!result.valid) return undefined;
            segment.descriptor.setValue(params, result.object, {
                createMissingStructure: true
            });
        }
        return params;
    } catch {
        return undefined;
    }
}

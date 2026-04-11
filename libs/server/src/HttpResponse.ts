export class HttpResponse {
    readonly body: unknown;
    readonly status: number;
    readonly headers: Record<string, string>;
    readonly contentType?: string;

    constructor(
        body: unknown,
        status: number,
        headers?: Record<string, string>,
        contentType?: string
    ) {
        this.body = body;
        this.status = status;
        this.headers = headers ?? {};
        this.contentType = contentType;
    }

    static ok(body: unknown): HttpResponse {
        return new HttpResponse(body, 200);
    }

    static created(body: unknown, location?: string): HttpResponse {
        const headers: Record<string, string> = {};
        if (location) headers['location'] = location;
        return new HttpResponse(body, 201, headers);
    }

    static noContent(): HttpResponse {
        return new HttpResponse(null, 204);
    }

    static redirect(url: string, permanent = false): HttpResponse {
        return new HttpResponse(null, permanent ? 301 : 302, {
            location: url
        });
    }
}

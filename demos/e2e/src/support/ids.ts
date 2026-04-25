import { randomUUID } from 'node:crypto';

/** Returns a unique email scoped to the given suite/test name. */
export function uniqueEmail(suite = 'e2e'): string {
    return `${suite}-${randomUUID()}@test.local`;
}

/** Returns a unique todo title for trace-friendly assertions. */
export function uniqueTitle(prefix = 'Todo'): string {
    return `[E2E] ${prefix} ${randomUUID().slice(0, 8)}`;
}

/** A short opaque id usable in path segments / keys. */
export function shortId(): string {
    return randomUUID().slice(0, 12);
}

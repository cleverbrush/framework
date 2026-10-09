import type { ValidationErrorItem } from '@cleverbrush/server';
import { isApiError } from './errors.js';

/** Explicit request location whose field paths match the consumer's form. */
export type ValidationIssueSource = 'body' | 'query' | 'headers';

/**
 * Decode Framework validation Problem Details into plain, serializable issues.
 * The selected request prefix is removed; other sources and root errors use
 * the empty pointer (a form-level issue). No field names are inferred.
 *
 * Returns undefined for non-validation errors or malformed payloads. Keep an
 * application-owned safe fallback for those errors. `errors` is Framework's
 * Problem Details extension, not a universal RFC 9457 field-error format.
 *
 * @example
 * ```ts
 * const issues = decodeValidationIssues(error, { source: 'body' });
 * if (issues) return { ok: false, error: 'Check your input.', issues };
 * throw error;
 * ```
 */
export function decodeValidationIssues(
    error: unknown,
    options: { source: ValidationIssueSource }
): readonly ValidationErrorItem[] | undefined {
    if (!isApiError(error) || ![400, 422].includes(error.status)) return;
    const body = error.body;
    if (!body || typeof body !== 'object') return;
    const problem = body as Record<string, unknown>;
    if (
        typeof problem.type !== 'string' ||
        typeof problem.title !== 'string' ||
        problem.status !== error.status ||
        !Array.isArray(problem.errors) ||
        problem.errors.length === 0
    )
        return;
    const issues: ValidationErrorItem[] = [];
    for (const item of problem.errors) {
        if (
            !item ||
            typeof item !== 'object' ||
            typeof item.pointer !== 'string' ||
            typeof item.detail !== 'string' ||
            !item.detail.trim() ||
            (item.pointer !== '' && !item.pointer.startsWith('/')) ||
            /~(?![01])/.test(item.pointer)
        )
            return;
        const segments = item.pointer
            .slice(1)
            .split('/')
            .map((part: string) =>
                part.replace(/~1/g, '/').replace(/~0/g, '~')
            );
        const pointer =
            segments[0] === options.source
                ? segments
                      .slice(1)
                      .map(
                          (part: string) =>
                              '/' +
                              part.replace(/~/g, '~0').replace(/\//g, '~1')
                      )
                      .join('')
                : '';
        issues.push({ pointer, detail: item.detail });
    }
    return issues;
}

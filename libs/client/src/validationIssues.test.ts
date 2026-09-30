import { expect, test } from 'vitest';
import { ApiError, NetworkError } from './errors.js';
import { decodeValidationIssues } from './validationIssues.js';

const problem = (errors: unknown, status = 400) =>
    new ApiError(status, 'Bad Request', {
        type: 'https://httpstatuses.com/' + status,
        title: 'Bad Request',
        status,
        errors
    });
test('decodes explicit sources, escapes and array indices without losing other issues', () => {
    const issues = decodeValidationIssues(
        problem([
            { pointer: '/body/addresses/0/city', detail: 'City required' },
            { pointer: '/body/a~1b/~0name/a.b', detail: 'Invalid' },
            { pointer: '/body/', detail: 'Empty property name' },
            { pointer: '/body', detail: 'Body error' },
            { pointer: '/query/page', detail: 'Page error' },
            { pointer: '/bodyguard/name', detail: 'Unknown source' }
        ]),
        { source: 'body' }
    );
    expect(JSON.parse(JSON.stringify(issues))).toEqual([
        { pointer: '/addresses/0/city', detail: 'City required' },
        { pointer: '/a~1b/~0name/a.b', detail: 'Invalid' },
        { pointer: '/', detail: 'Empty property name' },
        { pointer: '', detail: 'Body error' },
        { pointer: '', detail: 'Page error' },
        { pointer: '', detail: 'Unknown source' }
    ]);
});
test.each(['query', 'headers'] as const)('supports %s and 422', source => {
    expect(
        decodeValidationIssues(
            problem([{ pointer: `/${source}/x`, detail: 'Invalid' }], 422),
            { source }
        )
    ).toEqual([{ pointer: '/x', detail: 'Invalid' }]);
});
test.each([
    null,
    {},
    [],
    [{ pointer: '/body/x', detail: 1 }],
    [{ pointer: '/body/~2', detail: 'Invalid' }],
    [{ pointer: '#/body/x', detail: 'Invalid' }],
    [{ pointer: '/body/x', detail: '' }],
    [{ pointer: '/body/x', detail: 'Valid item' }, null]
])('rejects malformed or empty collections: %j', errors => {
    expect(
        decodeValidationIssues(problem(errors), { source: 'body' })
    ).toBeUndefined();
});
test.each([
    new Error('unexpected'),
    new NetworkError('offline'),
    new ApiError(400, 'bad', { message: 'Business error' }),
    problem([{ pointer: '/body/x', detail: 'Invalid' }], 500),
    new ApiError(400, 'bad', { type: 'x', title: 'x', status: 422, errors: [] })
])('leaves unrelated errors to application fallback', error => {
    expect(decodeValidationIssues(error, { source: 'body' })).toBeUndefined();
});

import { array, number, object, string } from '@cleverbrush/schema';
import { expectTypeOf, test } from 'vitest';
import { useSchemaForm } from './hooks.js';
import type { FormIssue } from './types.js';

test('indexed fields keep value inference and serializable submission issues', () => {
    const form = useSchemaForm(
        object({
            addresses: array(object({ city: string() })),
            matrix: array(array(number()))
        })
    );
    const city = form.useField(t => t.addresses[0].city);
    expectTypeOf(city.value).toEqualTypeOf<string | undefined>();
    city.setValue('Paris');
    // @ts-expect-error indexed fields preserve value types
    city.setValue(1);
    // @ts-expect-error invalid element property
    form.useField(t => t.addresses[0].country);
    // @ts-expect-error array descriptors are not native JS arrays
    form.useField(t => t.addresses.push);
    const cell = form.useField(t => t.matrix[1][2]);
    expectTypeOf(cell.value).toEqualTypeOf<number | undefined>();
    const issues: readonly FormIssue[] = [
        { pointer: '/addresses/0/city', detail: 'Unsupported' }
    ];
    form.setIssues(issues);
    form.handleSubmit(() => ({ ok: false, error: 'Check fields', issues }));
    form.handleSubmit(() => ({ ok: false, error: 'Legacy failure' }));
    // @ts-expect-error issues are data, not selector functions
    form.setIssues([{ pointer: t => t.addresses, detail: 'No' }]);
});

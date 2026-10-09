import { describe, expect, it } from 'vitest';
import {
    defineExtension,
    defineMetadataMethod,
    withExtensions
} from './extension.js';
import { number, type StringSchemaBuilder, string } from './index.js';

const labels = defineExtension({
    string: {
        label: defineMetadataMethod('label').argument<string>(),
        internal: defineMetadataMethod('visibility').value('internal'),
        external: defineMetadataMethod('visibility').value('external'),
        lengthHint: defineMetadataMethod('lengthHint').compute(
            (min: number, max: number) => ({ min, max })
        ),
        trim(this: StringSchemaBuilder) {
            return this.addPreprocessor(v =>
                typeof v === 'string' ? v.trim() : v
            );
        }
    }
});

describe('typed metadata extensions', () => {
    it('stores only the declared key, including explicit undefined values', () => {
        const s = withExtensions(
            defineExtension({
                string: {
                    label: defineMetadataMethod('label').value(undefined),
                    anonymous: defineMetadataMethod('label').compute(
                        () => undefined
                    ),
                    internal:
                        defineMetadataMethod('visibility').value('internal')
                }
            })
        );
        expect(s.string().label().introspect().extensions).toEqual({
            label: undefined
        });
        expect(
            s.string().anonymous().internal().introspect().extensions
        ).toEqual({ label: undefined, visibility: 'internal' });
    });
    it('stores literal, constant and computed values through immutable chains', () => {
        const s = withExtensions(labels);
        const original = s.string().label('Title').internal();
        const changed = original
            .optional()
            .nullable()
            .lengthHint(1, 20)
            .external()
            .trim()
            .label('Name');
        expect(original.introspect().extensions).toMatchObject({
            label: 'Title',
            visibility: 'internal'
        });
        expect(changed.introspect().extensions).toMatchObject({
            label: 'Name',
            visibility: 'external',
            lengthHint: { min: 1, max: 20 }
        });
        expect(changed.parse('  Name  ')).toBe('Name');
        expect(changed.parse(null)).toBeNull();
        expect(changed.parse(undefined)).toBeUndefined();
    });

    it('isolates factories and never mutates global builder prototypes', () => {
        const tagged = withExtensions(labels).string();
        expect(typeof tagged.label).toBe('function');
        expect('label' in string()).toBe(false);
        expect('label' in number()).toBe(false);
        expect('label' in withExtensions().string()).toBe(false);
    });

    it('composes with ordinary extensions and overwrites metadata', () => {
        const other = defineExtension({
            string: {
                searchable: defineMetadataMethod('searchable').value(true)
            }
        });
        const s = withExtensions(labels, other)
            .string()
            .label('First')
            .searchable()
            .trim()
            .label('Second');
        expect(s.introspect().extensions).toMatchObject({
            label: 'Second',
            searchable: true
        });
        expect(s.parse(' x ')).toBe('x');
    });
});

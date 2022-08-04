import { number } from './NumberSchemaBuilder.js';

test('Validators - 1', () => {
    const schema = number();
    expect(schema).not.toHaveProperty('validators');
});

test('Validators - 2', () => {
    const schema = number().addValidator(() => ({ valid: true }));
    expect(schema).toHaveProperty('validators');
    expect(schema.validators).toHaveProperty('length', 1);
});

test('Validators - 3', () => {
    const schema = number()
        .addValidator(() => ({ valid: true }))
        .addValidator(() => ({ valid: false }));
    expect(schema).toHaveProperty('validators');
    expect(schema.validators).toHaveProperty('length', 2);
});

test('Validators - 4', () => {
    const schema = number()
        .addValidator(() => ({ valid: true }))
        .clearValidators();
    expect(schema).not.toHaveProperty('validators');
});

test('Validators - 5', () => {
    expect(() => {
        number().addValidator('string' as any);
    }).toThrow();
});

test('Preprocessor - 1', () => {
    const schema = number();
    expect(schema).not.toHaveProperty('preprocessor');
});

test('Preprocessor - 2', () => {
    const schema = number().addPreprocessor(() => new Date());
    expect(schema).toHaveProperty('preprocessor');
});

test('Preprocessor - 3', () => {
    const schema = number()
        .addPreprocessor(() => new Date())
        .clearPreprocessor();
    expect(schema).not.toHaveProperty('preprocessor');
});

test('Preprocessor - 4', () => {
    const schema1 = number();
    const schema2 = schema1.addPreprocessor(() => new Date());
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
});

test('Preprocessor - 5', () => {
    const schema1 = number().addPreprocessor(() => new Date());
    const schema2 = schema1.clearPreprocessor();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
});

test('Preprocessor - 6', () => {
    const schema1 = number()
        .addPreprocessor(() => new Date())
        .hasMinValue(30);
    const schema2 = schema1.clearPreprocessor();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
});

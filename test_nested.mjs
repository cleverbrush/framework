import { object, string, number } from './libs/schema/dist/index.js';

function logResult(name, pvr) {
    console.log(name, '- isValid:', pvr.isValid, '- errors:', JSON.stringify(pvr.errors));
}

// Test: does string() alone produce "is required" error?
const SimpleSchema = object({
    name: string(),
    age: number()
});

console.log('=== Simple schema: validate({}) ===');
const r1 = await SimpleSchema.validate({}, { doNotStopOnFirstError: true });
console.log('valid:', r1.valid);
if (r1.getErrorsFor) {
    logResult('name', r1.getErrorsFor(t => t.name));
    logResult('age', r1.getErrorsFor(t => t.age));
}

// Test: does nested string() without validator get errors?
const NestedSchema = object({
    outer: object({
        inner: string()
    })
});

console.log('\n=== Nested: validate({ outer: {} }) ===');
const r2 = await NestedSchema.validate({ outer: {} }, { doNotStopOnFirstError: true });
console.log('valid:', r2.valid);
if (r2.getErrorsFor) {
    logResult('outer.inner', r2.getErrorsFor(t => t.outer.inner));
}

console.log('\n=== Nested: validate({}) ===');
try {
    const r3 = await NestedSchema.validate({}, { doNotStopOnFirstError: true });
    console.log('valid:', r3.valid);
    if (r3.getErrorsFor) {
        logResult('outer', r3.getErrorsFor(t => t.outer));
        logResult('outer.inner', r3.getErrorsFor(t => t.outer.inner));
    }
} catch(e) {
    console.log('THREW:', e.message);
}

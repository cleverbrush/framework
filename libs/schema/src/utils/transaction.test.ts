import { transaction } from './transaction.js';

test('The same obj shape returned initially', () => {
    const obj = {
        first: '1',
        second: 2
    };
    const { object } = transaction(obj);

    expect(object).toEqual(obj);
});

test('Can read modified property - 1', () => {
    const obj = {
        first: '1',
        second: 2
    };
    const { object }: { object: any } = transaction(obj);

    object.third = 123;

    expect('third' in object).toEqual(true);
    expect('third' in obj).toEqual(false);
    expect(object).toEqual({
        first: '1',
        second: 2,
        third: 123
    });
    expect(obj).toEqual({
        first: '1',
        second: 2
    });
    expect(object.third).toEqual(123);
});

test('Can read modified property - 2', () => {
    const obj = {
        first: '1',
        second: 2
    };
    const { object }: { object: any } = transaction(obj);

    object.second = 123;

    expect('second' in object).toEqual(true);
    expect('second' in obj).toEqual(true);
    expect(object.second).toEqual(123);
    expect(obj.second).toEqual(2);
    expect(object).toEqual({
        first: '1',
        second: 123
    });
    expect(obj).toEqual({
        first: '1',
        second: 2
    });
});

test('Commit updates initial object', () => {
    const obj = {
        first: '1',
        second: 2
    };
    const { object, commit, isDirty } = transaction(obj);

    expect(isDirty()).toEqual(false);

    (object as any).third = 123;

    expect(isDirty()).toEqual(true);

    expect('third' in object).toEqual(true);
    expect('third' in obj).toEqual(false);
    expect(object).toEqual({
        first: '1',
        second: 2,
        third: 123
    });
    expect(obj).toEqual({
        first: '1',
        second: 2
    });

    const commitResult = commit();
    expect('third' in commitResult).toEqual(true);
    expect('third' in obj).toEqual(true);
    expect(obj).toEqual({
        first: '1',
        second: 2,
        third: 123
    });
    expect(commitResult).toEqual({
        first: '1',
        second: 2,
        third: 123
    });
    expect(isDirty()).toEqual(false);
});

test('commit - 1', () => {
    const initial = {
        field1: 1,
        field2: 'str',
        nested: {
            n1: 1,
            n2: 'str'
        }
    };

    const { object, commit } = transaction(initial);

    object.nested.n1 = 20;
    object.nested.n2 = 'new val';

    expect(object.nested.n1).toEqual(20);
    expect(object.nested.n2).toEqual('new val');

    expect(initial.nested.n1).toEqual(1);
    expect(initial.nested.n2).toEqual('str');

    commit();

    expect(initial.nested.n1).toEqual(20);
    expect(initial.nested.n2).toEqual('new val');
});

test('delete property', () => {
    const initial = {
        first: 'string',
        second: 123
    };

    const { object, commit } = transaction(initial);

    delete (object as any).second;

    const result = commit();

    expect(result).toEqual({
        first: 'string'
    });
});

test('delete nested property', () => {
    const initial = {
        first: 'string',
        second: 123,
        nested: {
            n1: 20
        }
    };

    const { object, commit } = transaction(initial);

    object.nested.n1 = 30;
    delete (object as any).nested;

    const result = commit();

    expect(result).toEqual({
        first: 'string',
        second: 123
    });
});

test('nested object', () => {
    const nested = {
        field1: 'some str',
        field2: 1
    };
    const initial = {
        field3: 2,
        nested
    };

    const { object, commit } = transaction(initial);

    expect(object.nested === nested).toEqual(false);

    object.nested.field1 = 'modified';

    expect(object).toEqual({
        field3: 2,
        nested: {
            field1: 'modified',
            field2: 1
        }
    });

    delete (object.nested as any).field2;

    expect(object).toEqual({
        field3: 2,
        nested: {
            field1: 'modified'
        }
    });

    const result = commit();

    expect(result).toEqual({
        field3: 2,
        nested: {
            field1: 'modified'
        }
    });

    expect(initial).toEqual({
        field3: 2,
        nested: {
            field1: 'modified'
        }
    });
});

test('delete of unknown property', () => {
    const initial = {
        field1: 1,
        field2: 'str'
    };

    const { object } = transaction(initial);

    delete (object as any).field3;

    expect(object).toEqual(initial);
});

test('delete property twice', () => {
    const initial = {
        field1: 1,
        field2: 'str'
    };

    const { object } = transaction(initial);

    delete (object as any).field2;
    delete (object as any).field2;
    const desc = Object.getOwnPropertyDescriptor(object, 'field2');
    expect(desc).not.toBeDefined();

    expect(object).toEqual({
        field1: 1
    });
});

test('in for deleted property returns false', () => {
    const initial = {
        field1: 1,
        field2: 'str'
    };

    const { object } = transaction(initial);

    delete (object as any).field2;
    expect('field2' in object).toEqual(false);
    expect(object.field2).not.toBeDefined();

    expect(object).toEqual({
        field1: 1
    });
});

test('in for untouched property', () => {
    const initial = {
        field1: 1,
        field2: 'str'
    };

    const { object } = transaction(initial);

    delete (object as any).field2;
    expect('field1' in object).toEqual(true);
});

test('error and regex are preserved', () => {
    const initial = {
        field1: 1,
        field2: 'str',
        err: new Error(),
        regex: new RegExp('aaa'),
        nested: {}
    };

    const { object } = transaction(initial);

    expect(object.err === initial.err).toEqual(true);
    expect(object.regex === initial.regex).toEqual(true);
    expect(object.nested === initial.nested).toEqual(false);
});

test('shouldNotWrapWithTransaction - 1', () => {
    const customErr = class extends Error {};

    const initial = {
        field1: 1,
        field2: 'str',
        err: new Error(),
        customErr: new customErr(),
        nested: {}
    };

    const { object } = transaction(initial, {
        shouldNotWrapWithTransaction: (item) => item instanceof customErr
    });

    expect(object.err === initial.err).toEqual(false);
    expect(object.customErr === initial.customErr).toEqual(true);
    expect(object.nested === initial.nested).toEqual(false);
});

test('null property - 1', () => {
    const initial = {
        field1: 1,
        field2: 'str',
        field3: null
    };

    const { object } = transaction(initial);

    expect(object.field3 === null).toEqual(true);
});

test('rollback - 1', () => {
    const initial = {
        field1: 1,
        field2: 'str'
    };

    const { object, rollback } = transaction(initial);

    delete (object as any).field2;

    rollback();

    expect('field1' in object).toEqual(true);
    expect('field2' in object).toEqual(true);
    expect('field1' in initial).toEqual(true);
    expect('field2' in initial).toEqual(true);
    expect(object.field1).toEqual(1);
    expect(object.field2).toEqual('str');
    expect(initial.field1).toEqual(1);
    expect(initial.field2).toEqual('str');
});

test('rollback - 1', () => {
    const initial = {
        field1: 1,
        field2: 'str',
        nested: {
            n1: 1,
            n2: 'str'
        }
    };

    const { object, rollback } = transaction(initial);

    object.nested.n1 = 20;
    object.nested.n2 = 'new val';

    expect(object.nested.n1).toEqual(20);
    expect(object.nested.n2).toEqual('new val');

    rollback();

    expect(initial.nested.n1).toEqual(1);
    expect(initial.nested.n2).toEqual('str');
});

test('array - 1', () => {
    const initial = [1, 2, 3];
    const { object, commit } = transaction(initial);

    object.push(4);

    expect(object.length).toEqual(4);
    expect(initial.length).toEqual(3);

    commit();

    expect(object.length).toEqual(4);
    expect(initial.length).toEqual(3);
});

test('array - 2', () => {
    const initial = {
        first: 'value',
        second: [
            100,
            'str',
            {
                nested1: 11
            }
        ]
    };

    const { object, commit } = transaction(initial);

    (object as any).second[2].nested2 = 12;
    object.second.push(200);

    expect(object).toEqual({
        first: 'value',
        second: [
            100,
            'str',
            {
                nested1: 11,
                nested2: 12
            },
            200
        ]
    });
    expect(initial).toEqual({
        first: 'value',
        second: [
            100,
            'str',
            {
                nested1: 11
            }
        ]
    });

    const result = commit();

    expect(result).toEqual({
        first: 'value',
        second: [
            100,
            'str',
            {
                nested1: 11,
                nested2: 12
            },
            200
        ]
    });
});

test('array - 3', () => {
    const initial = {
        first: 'value',
        second: [
            100,
            'str',
            {
                nested1: 11
            }
        ]
    };

    const { object, rollback } = transaction(initial);

    (object as any).second[2].nested2 = 12;
    object.second.push(200);

    expect(object).toEqual({
        first: 'value',
        second: [
            100,
            'str',
            {
                nested1: 11,
                nested2: 12
            },
            200
        ]
    });
    expect(initial).toEqual({
        first: 'value',
        second: [
            100,
            'str',
            {
                nested1: 11
            }
        ]
    });

    const result = rollback();

    expect(initial).toEqual({
        first: 'value',
        second: [
            100,
            'str',
            {
                nested1: 11
            }
        ]
    });

    expect(result).toEqual({
        first: 'value',
        second: [
            100,
            'str',
            {
                nested1: 11
            }
        ]
    });
});

test('cyclic - 1', () => {
    const initial = {} as any;

    const child = {
        parent: initial
    };

    initial.child = child;

    const { object, commit } = transaction(initial);

    object.nn = 100;

    const result = commit();

    expect(result).toHaveProperty('nn');
    expect(result).toHaveProperty('child.parent.child');
});

test('isDirty - 1', () => {
    const initial = {
        val1: 1,
        val2: '2'
    };

    const { object, isDirty, commit, rollback } = transaction(initial);

    expect(isDirty()).toEqual(false);

    object.val2 = 'new val';

    expect(isDirty()).toEqual(true);

    object.val2 = '2';

    expect(isDirty()).toEqual(false);

    object.val2 = 'new val 2';

    expect(isDirty()).toEqual(true);

    commit();

    expect(isDirty()).toEqual(false);

    object.val2 = 'new val 3';

    expect(isDirty()).toEqual(true);

    rollback();

    expect(isDirty()).toEqual(false);
});

test('isDirty - 2', () => {
    const nested = {
        val2: '2'
    };
    const initial = {
        val1: 1,
        nested
    };

    const { object, isDirty, commit, rollback } = transaction(initial);

    expect(isDirty()).toEqual(false);

    object.nested.val2 = 'new val';

    expect(isDirty()).toEqual(true);

    object.nested.val2 = '2';

    expect(isDirty()).toEqual(false);

    object.nested.val2 = 'new val 2';

    expect(isDirty()).toEqual(true);

    commit();

    expect(isDirty()).toEqual(false);

    object.nested.val2 = 'new val 3';

    expect(isDirty()).toEqual(true);

    rollback();

    expect(isDirty()).toEqual(false);
});

test('isDirty - 3', () => {
    const nested = {
        val2: '2'
    };
    const initial = {
        val1: 1,
        nested
    };

    const { object, isDirty, commit, rollback } = transaction(initial);

    expect(isDirty()).toEqual(false);

    object.nested = { val2: 'new val' };

    expect(isDirty()).toEqual(true);

    object.nested = nested;

    expect(isDirty()).toEqual(false);

    object.nested = { val2: 'new val 2' };

    expect(isDirty()).toEqual(true);

    commit();

    expect(isDirty()).toEqual(false);

    object.nested = { val2: 'new val 3' };

    expect(isDirty()).toEqual(true);

    rollback();

    expect(isDirty()).toEqual(false);
});

test('isDirty - 4', () => {
    const arr = [{ name: 'Ivanov' }, { name: 'Petrov' }, { name: 'Sidorov' }];
    const initial = {
        val1: 1,
        arr
    };

    const { object, isDirty, commit, rollback } = transaction(initial);

    expect(isDirty()).toEqual(false);

    object.arr[1].name = 'Kuznetsov';

    expect(isDirty()).toEqual(true);

    object.arr[1].name = 'Petrov';

    expect(isDirty()).toEqual(false);

    object.arr[1].name = 'Kuznetsov';

    expect(isDirty()).toEqual(true);

    commit();

    expect(isDirty()).toEqual(false);

    object.arr[1].name = 'Petrov';

    expect(isDirty()).toEqual(true);

    rollback();

    expect(isDirty()).toEqual(false);
});

import { object } from './ObjectSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import {
    InferType,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from './SchemaBuilder.js';

test('Throws with not ObjectSchemaBuilder instance', async () => {
    expect(() => (object as any).getPropertiesFor()).toThrowError();
    expect(() => (object as any).getPropertiesFor(undefined)).toThrowError();
    expect(() => (object as any).getPropertiesFor(null)).toThrowError();
    expect(() => (object as any).getPropertiesFor(10)).toThrowError();
    expect(() => (object as any).getPropertiesFor(number())).toThrowError();
});

test('Returns empty object for empty schema', async () => {
    const schema = object();
    const tree = object.getPropertiesFor(schema);

    expect(tree).not.toBeNull();
    expect(tree).not.toBeUndefined();
    expect(tree).toEqual({});
});

test('Properties exists', async () => {
    const schema = object({
        firstName: string(),
        lastName: string(),
        address: object({
            street: string(),
            city: string(),
            zip: number(),
            // nested object
            phone: object({
                home: string(),
                work: string()
            })
        })
    });

    const tree = object.getPropertiesFor(schema);

    expect(tree).not.toBeNull();
    expect(tree).not.toBeUndefined();
    expect(tree).toHaveProperty('firstName');
    expect(tree).toHaveProperty('lastName');
    expect(tree).toHaveProperty('address');
    expect(tree.address).not.toBeNull();
    expect(tree.address).not.toBeUndefined();
    expect(tree.address).toHaveProperty('street');
    expect(tree.address).toHaveProperty('city');
    expect(tree.address).toHaveProperty('zip');
    expect(tree.address).toHaveProperty('phone');
    expect(tree.address.phone).not.toBeNull();
    expect(tree.address.phone).not.toBeUndefined();
    expect(tree.address.phone).toHaveProperty('home');
    expect(tree.address.phone).toHaveProperty('work');
});

test('Returns the same property tree for the same schema', async () => {
    const schema = object({
        prop1: string(),
        prop2: number()
    });

    const tree1 = object.getPropertiesFor(schema);
    const tree2 = object.getPropertiesFor(schema);

    expect(tree1 === tree2).toEqual(true);
});

test('Returns the same property tree for the same schema (with nested)', async () => {
    const schema = object({
        prop1: string(),
        prop2: number(),
        nested: object({
            prop3: string(),
            prop4: number()
        })
    });

    const tree1 = object.getPropertiesFor(schema);
    const tree2 = object.getPropertiesFor(schema);

    expect(tree1 === tree2).toEqual(true);
});

const verifyPropertyDescriptor = (
    descriptor: any,
    obj: any,
    oldValue: any,
    newValue: any
) => {
    expect(SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in descriptor).toEqual(true);
    const desc = descriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
    expect(desc).not.toBeNull();
    expect(desc).not.toBeUndefined();

    expect(typeof desc.getValue === 'function').toEqual(true);
    expect(typeof desc.setValue === 'function').toEqual(true);

    const { success: fsuccess, value: prevValue } = desc.getValue(obj);

    expect(fsuccess).toEqual(true);
    expect(oldValue).toEqual(prevValue);

    expect(desc.setValue(obj, newValue)).toEqual(true);

    const { success, value: nextValue } = desc.getValue(obj);

    expect(success).toEqual(true);
    expect(newValue).toEqual(nextValue);
};

test('Property Descriptor is valid - 1', async () => {
    const schema = object({
        firstName: string(),
        lastName: string(),
        address: object({
            street: string(),
            city: string(),
            zip: number(),
            // nested object
            phone: object({
                home: string(),
                work: string()
            })
        })
    });

    const person: InferType<typeof schema> = {
        firstName: 'Leo',
        lastName: 'Tolstoy',
        address: {
            street: 'Some street',
            city: 'Yasnaya Polyana',
            zip: 12345,
            phone: {
                home: '123-456-7890',
                work: '098-765-4321'
            }
        }
    };

    const tree = object.getPropertiesFor(schema);

    verifyPropertyDescriptor(
        tree.address,
        person,
        {
            street: 'Some street',
            city: 'Yasnaya Polyana',
            zip: 12345,
            phone: {
                home: '123-456-7890',
                work: '098-765-4321'
            }
        },
        {
            street: 'Another street',
            city: 'Moscow',
            zip: 54321,
            phone: {
                home: '098-765-4321',
                work: '123-456-7890'
            }
        }
    );
});

test('Property Descriptor is valid - 2', async () => {
    const schema = object({
        firstName: string(),
        lastName: string(),
        address: object({
            street: string(),
            city: string(),
            zip: number(),
            // nested object
            phone: object({
                home: string(),
                work: string()
            })
        })
    });

    const person: InferType<typeof schema> = {
        firstName: 'Leo',
        lastName: 'Tolstoy',
        address: {
            street: 'Some street',
            city: 'Yasnaya Polyana',
            zip: 12345,
            phone: {
                home: '123-456-7890',
                work: '098-765-4321'
            }
        }
    };

    const tree = object.getPropertiesFor(schema);

    verifyPropertyDescriptor(
        tree.address.street,
        person,
        'Some street',
        'Another street'
    );
});

test('Property Descriptor is valid - 3', async () => {
    const schema = object({
        firstName: string(),
        lastName: string(),
        address: object({
            street: string(),
            city: string(),
            zip: number(),
            // nested object
            phone: object({
                home: string(),
                work: string()
            })
        })
    });

    const person: InferType<typeof schema> = {
        firstName: 'Leo',
        lastName: 'Tolstoy',
        address: {
            street: 'Some street',
            city: 'Yasnaya Polyana',
            zip: 12345,
            phone: {
                home: '123-456-7890',
                work: '098-765-4321'
            }
        }
    };

    const tree = object.getPropertiesFor(schema);

    verifyPropertyDescriptor(tree.firstName, person, 'Leo', 'Lev');
});

test('Property Descriptor is valid - 4', async () => {
    const schema = object({
        firstName: string(),
        lastName: string(),
        address: object({
            street: string(),
            city: string(),
            zip: number(),
            // nested object
            phone: object({
                home: string(),
                work: string()
            })
        })
    });

    const person: InferType<typeof schema> = {
        firstName: 'Leo',
        lastName: 'Tolstoy',
        address: {
            street: 'Some street',
            city: 'Yasnaya Polyana',
            zip: 12345,
            phone: {
                home: '123-456-7890',
                work: '098-765-4321'
            }
        }
    };

    const tree = object.getPropertiesFor(schema);

    verifyPropertyDescriptor(tree.firstName, person, 'Leo', 'Lev');
    verifyPropertyDescriptor(tree.firstName, person, 'Lev', 'Leo');
    verifyPropertyDescriptor(
        tree.address.phone,
        person,
        {
            home: '123-456-7890',
            work: '098-765-4321'
        },
        {
            home: '098-765-4321',
            work: '123-456-7890'
        }
    );

    verifyPropertyDescriptor(
        tree.address.phone.home,
        person,
        '098-765-4321',
        '123-456-7890'
    );
});

test('Property Descriptor is valid - 5', async () => {
    const schema = object({
        firstName: string(),
        lastName: string(),
        address: object({
            street: string(),
            city: string(),
            zip: number(),
            // nested object
            phone: object({
                home: string(),
                work: string()
            })
        })
    });

    const person: InferType<typeof schema> = {
        firstName: 'Leo',
        lastName: 'Tolstoy'
    } as any;

    const tree = object.getPropertiesFor(schema);

    const res = tree.address.zip[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR].setValue(
        person,
        12345
    );

    expect(res).toEqual(false);
    expect(person.address).toBeUndefined();
});

test('Wrong descriptor', async () => {
    const schema = object({
        firstName: string(),
        lastName: string(),
        address: object({
            street: string(),
            city: string(),
            zip: number(),
            // nested object
            phone: object({
                home: string(),
                work: string()
            })
        })
    });

    const person = {
        firstName: 'Leo',
        lastName: 'Tolstoy'
    };

    const tree = object.getPropertiesFor(schema);

    const res = tree.address.phone[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR].setValue(
        person as any,
        { home: '123-456-7890', work: '098-765-4321' }
    );
    expect(res).toEqual(false);

    {
        const { success, value } = tree.address.phone[
            SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
        ].getValue(person as any);

        expect(success).toEqual(false);
        expect(value).toEqual(undefined);
    }

    {
        const { success, value } = tree.address[
            SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
        ].getValue(person as any);

        expect(success).toEqual(false);
        expect(value).toEqual(undefined);
    }

    {
        const success = tree.address[
            SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
        ].setValue(person as any, {
            street: 'Some street',
            city: 'Yasnaya Polyana',
            zip: 12345,
            phone: {
                home: '123-456-7890',
                work: '098-765-4321'
            }
        });

        expect(success).toEqual(true);
    }
});

test('No new properties creation by default', async () => {
    const schema = object({
        nested: object({
            nested: object({
                value: number()
            })
        })
    });

    const person = {} as any;

    const tree = object.getPropertiesFor(schema);

    const res = tree.nested.nested.value[
        SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
    ].setValue(person, 123);

    expect(res).toEqual(false);
    expect(person).toEqual({});
});

test('New properties creation', async () => {
    const schema = object({
        nested: object({
            nested: object({
                value: number()
            })
        })
    });

    const person = {} as any;

    const tree = object.getPropertiesFor(schema);

    const res = tree.nested.nested.value[
        SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
    ].setValue(person, 123, { createMissingStructure: true });

    expect(res).toEqual(true);
    expect(person).toEqual({ nested: { nested: { value: 123 } } });
});

test('The same subschema in different parents gives different property descriptors', async () => {
    const nestedSchema = object({
        value: number()
    });

    const parentSchema1 = object({
        nested: nestedSchema
    });

    const parentSchema2 = object({
        nested: nestedSchema
    });

    const nestedProp1 = object.getPropertiesFor(parentSchema1).nested;
    const nestedProp2 = object.getPropertiesFor(parentSchema2).nested;

    expect(nestedProp1 === nestedProp2).toEqual(false);

    const nestedProp1ValueProp =
        object.getPropertiesFor(parentSchema1).nested.value;
    const nestedProp2ValueProp =
        object.getPropertiesFor(parentSchema2).nested.value;

    expect(nestedProp1ValueProp === nestedProp2ValueProp).toEqual(false);
});

test('Schema modification changes property descriptor', async () => {
    const schema = object({
        level1: string(),
        nested: object({
            level2: number()
        })
    });

    const initialDescriptorForLevel1 = object.getPropertiesFor(schema).level1;
    const initialDescriptorForLevel2 =
        object.getPropertiesFor(schema).nested.level2;

    const modifiedSchema = schema.makeAllPropsOptional();

    const modifiedDescriptorForLevel1 =
        object.getPropertiesFor(modifiedSchema).level1;
    const modifiedDescriptorForLevel2 =
        object.getPropertiesFor(modifiedSchema).nested.level2;

    expect(
        (initialDescriptorForLevel1 as any) === modifiedDescriptorForLevel1
    ).toEqual(false);
    expect(
        (initialDescriptorForLevel2 as any) === modifiedDescriptorForLevel2
    ).toEqual(false);
});

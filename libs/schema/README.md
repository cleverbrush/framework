# Object Schema Validator

This package contains utilities to validate the JavaScript object's schema. There is only one class exported - `SchemaValidator`

## Schema Types

There are several schema types available:

-   object
-   string
-   number
-   array
-   function (_TBD_)

Schemas could be either described by shortcusts (string value from the list above) or by more detailed specification.

## Schema Definitions

### Common for all types

Any schema defined by object can contain the following fields:

-   `type` - schema type (see the list above)
-   `isRequired` - defines if `undefined` value is considered valid
-   `isNullable` - defines if `null` value is considered valid
-   `validators` - optional array of custom validation functions (see Examples section at the bottom of this page)

### Number

`number` schema can be defined as follows:

```typescript
import { SchemaValidator } from '@cleverbrush/schema';
const validator = new SchemaValidator();

// validates for integer number between 1 and 100
let result = await validator.validate(
    {
        type: 'number',
        isInteger: true,
        min: 1,
        max: 100
    },
    10
);
```

All fields available (apart of common fields for all schemas) are:

-   `isInteger` - ensures that number is integer
-   `ensureIsFinite` - ensures that nubmer is finite
-   `ensureNotNaN` - ensures that number is not NaN
-   `equals` - checks if a value is equal to provided number
-   `min` - checks if a value is bigger or equal than a provided lower bound
-   `max` - checks if a value is lower or equal than a provided upper bound

Also it can be defined either by shortcut:

```typescript
import { SchemaValidator } from '@cleverbrush/schema';

const validator = new SchemaValidator();
let result = await validator.validate('number', 10);
// { valid: true }
result = await validator.validate('number', 'some string');
// { valid: false, errors: [ 'expected type number, but saw string' ] }
```

which is equal to:

```typescript
import { SchemaValidator } from '@cleverbrush/schema';

const validator = new SchemaValidator();

let result = await validator.validate(
    {
        type: 'number',
        isRequired: true,
        isNullable: false,
        ensureNotNaN: true,
        ensureIsFinite: true
    },
    0 / 0
);
// { valid: false }
```

### String

`string` schema can be defined as follows:

```typescript
import { SchemaValidator } from '@cleverbrush/schema';

const validator = new SchemaValidator();

// validates for non empty string no longer than 100 chars
let result = await validator.validate(
    {
        type: 'string',
        minLength: 1,
        maxLength: 100
    },
    'some value here'
);
// { valid: true }
```

All fields available (apart of common fields for all schemas) are:

-   `equals` - checks if value is equal to provided string
-   `minLength` - checks if value is at least `minLength` characters long
-   `maxLength` - checks if value is at most `maxLength` characters long

Also it can be defined either by shortcut:

```typescript
import { SchemaValidator } from '@cleverbrush/schema';

const validator = new SchemaValidator();

let result = await validator.validate('string', 'something');
// { valid: true }
result = await validator.validate('string', 10);
// { valid: false, errors: [ 'expected type string, but saw number' ] }
```

or by detailed descriptor:

```typescript
import { SchemaValidator } from '@cleverbrush/schema';

const validator = new SchemaValidator();

let result = await validator.validate(
    {
        type: 'string',
        isNullable: false,
        isRequired: true
    },
    1230
);
// { valid: false }
```

### Array

`array` schema can be defined as follows:

```typescript
import { SchemaValidator } from '@cleverbrush/schema';
const validator = new SchemaValidator();

// validates for non empty string no longer than 100 chars
let result = await validator.validate(
    {
        type: 'array',
        minLength: 5,
        maxLength: 10,
        ofType: {
            type: 'number',
            min: 1,
            max: 10
        }
    },
    [5, 6, 7, 8, 9]
);
// { valid: true }
```

All fields available (apart of common fields for all schemas) are:

-   `ofType` - here you can pass the `schema` and all array elements will be checked to match this schema
-   `minLength` - checks if array is at least `minLength` elements long
-   `maxLength` - checks if array is at most `maxLength` elements long

Also it can be defined either by shortcut:

```typescript
import { SchemaValidator } from '@cleverbrush/schema';

const validator = new SchemaValidator();

let result = await validator.validate('array', []);
// { valid: true }
result = await validator.validate('array', 10);
// { valid: false, errors: [ 'expected array' ] }
```

or by detailed descriptor:

```typescript
import { SchemaValidator } from '@cleverbrush/schema';

const validator = new SchemaValidator();

let result = await validator.validate(
    {
        type: 'array'
    },
    1230
);
// { valid: false, errors: [ 'expected array' ] }
```

### Object

`object` type allows to define a complex object schema. For example:

```typescript
await validator.validate(
    {
        type: 'object',
        properties: {
            id: 'number',
            name: {
                type: 'string',
                minLength: 1,
                maxLength: 100
            },
            address: {
                type: 'object',
                properties: {
                    city: 'string',
                    street: {
                        type: 'string',
                        isRequired: false
                    }
                }
            }
        }
    },
    {
        id: 10,
        name: 'Andrew',
        address: {
            city: 'Madrid'
        }
    }
);
// {valid: true}
```

All fields available are:

-   `noUnknownProperties` - Validator will return an error if this field is set to `true` and validated objects contain fields not defined in the object schema. Equals to `false` by default.
-   `properties` - the list of properties, every property has corresponding schema definition (see example above).

## Alternative schema

Everywhere you pass a `schema` object to the library, you may pass an array of `schema` objects which will validate the object to match at least one schema from this list.
For example, if you want to check that array is consisting either from number or from `{ name: string, value: number }` objects, you can do the following:

```typescript
await validator.validate(
    {
        type: 'array',
        ofType: [
            'number',
            {
                type: 'object',
                properties: {
                    name: 'string',
                    value: 'number'
                }
            }
        ]
    },
    [
        10,
        { name: 'something', value: 1 },
        100,
        { name: 'another string', value: 1 }
    ]
);
// {valid: true}
```

## Named schemas

There is a possibility to register a schema, give it a name and then reuse it:

```typescript
const validator = new SchemaValidator().addSchemaType('Address', {
    properties: {
        id: {
            type: 'number',
            min: 1
        },
        street: 'string',
        zip: 'number'
    }
});

await validator.validate(
    {
        type: 'object',
        properties: {
            name: 'string',
            address1: 'Address',
            address2: 'Address'
        }
    },
    {
        name: 'Andrew',
        address1: {
            id: 1,
            street: 'some street',
            zip: 12345
        },
        address2: {
            id: 2,
            street: 'some street 2',
            zip: 3456
        }
    }
);

// { valid: true }
```

Also there is a possibility to organize schemas in modules (or even submodules):

```typescript
const validator = new SchemaValidator()
    .addSchemaType('Module1.DTOs.Address', {
        properties: {
            id: {
                type: 'number',
                min: 1
            },
            street: 'string',
            zip: 'number'
        }
    })
    .addSchemaType('Module1.Models.Person', {
        properties: {
            firstName: 'string',
            lastName: 'string'
        }
    });

const resultPerson = await validator.schemas.Module1.Models.Person.validate({
    fistName: 'John',
    lastName: 'Smith'
});

const resultAddress = await validator.schemas.Module1.DTOs.Address.validate({});
```

## Examples

For Examples see unit tests in the schemaValidator.tests.ts

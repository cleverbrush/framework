import { ValidationResult } from './schema.js';
import SchemaRegistry from './schemaRegistry.js';

import { alias } from './builders/AliasSchemaBuilder.js';
import { array } from './builders/ArraySchemaBuilder.js';
import { boolean } from './builders/BooleanSchemaBuilder.js';
import { number } from './builders/NumberSchemaBuilder.js';
import { object } from './builders/ObjectSchemaBuilder.js';
import { string } from './builders/StringSchemaBuilder.js';
import { union } from './builders/UnionSchemaBuilder.js';

export type GetNodes<
    T extends Record<string, any>,
    TPrefix extends string = ''
> = {
    [k in keyof T]: k extends `${TPrefix}${infer F}.${infer S}` ? F : never;
}[keyof T];

export type GetLeafs<
    T extends Record<string, any>,
    TPrefix extends string = ''
> = {
    [k in keyof T]: k extends `${TPrefix}${infer F}`
        ? F extends `${infer S}.${infer G}`
            ? never
            : F
        : never;
}[keyof T];

export type Unfold<
    TBag extends Record<string, any>,
    TPrefix extends string = ''
> = {
    [k in GetLeafs<TBag, TPrefix>]: ISchemaActions<TBag[`${TPrefix}${k}`]>;
} & {
    [k in GetNodes<TBag, TPrefix>]: Unfold<TBag, `${TPrefix}${k}.`>;
};

export interface ISchemaActions<S> {
    validate(value: any): Promise<ValidationResult>;
    schema: S;
}

export interface ISchemaRegistry<T extends Record<string, any>> {
    schemas: Unfold<T>;
}

export { SchemaRegistry as SchemaValidator };
export default SchemaRegistry;

export { alias, array, boolean, number, object, string, union };

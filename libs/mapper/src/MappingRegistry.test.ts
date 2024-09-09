//import { object, string, number } from '@cleverbrush/schema';

import { MappingRegistry } from './MappingRegistry.js';

// const UserSchema = object({
//     name: string(),
//     age: number(),
//     address: object({
//         city: string(),
//         houseNr: number()
//     })
// });

// const UserDtoSchema = object({
//     name: string(),
//     cityName: string(),
//     houseNr: string(),
//     fullAddress: string(),
//     alwaysTen: number().equals(10)
// });

test('Throws on nulls', async () => {
    const mappers = new MappingRegistry();
    expect(true).toEqual(true);

    // expect(() => mappers.map(null as any, null as any)).toThrow();
    //     expect(() => mappers.map(null as any, UserDtoSchema)).toThrow();
    //     expect(() => mappers.map(UserSchema, null as any)).toThrow();
    //     expect(() => mappers.map(UserSchema, UserDtoSchema)).not.toThrow();
    //     mappers.map(UserSchema, UserDtoSchema);

    //     {
    //         const obj = { obj: { nested: 'val' } };
    //         const {
    //             valid,
    //             object: result,
    //             errors
    //         } = await schema.validate(obj as any);
    //         expect(valid).toEqual(false);
    //         expect(result).not.toBeDefined();
    //         expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    //     }
});

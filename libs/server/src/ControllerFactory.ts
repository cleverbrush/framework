import type { IServiceProvider } from '@cleverbrush/di';
import type { SchemaBuilder } from '@cleverbrush/schema';

export function createController(
    schema: SchemaBuilder<any, any, any, any, any>,
    implClass: new (...args: any[]) => any,
    serviceProvider: IServiceProvider
): any {
    const introspection = schema.introspect();
    const constructorSchemas = (introspection as any).constructorSchemas as
        | SchemaBuilder<any, any, any, any, any>[]
        | undefined;

    if (!constructorSchemas || constructorSchemas.length === 0) {
        return new implClass();
    }

    // Use the first constructor schema
    const ctorSchema = constructorSchemas[0];
    const ctorIntrospection = ctorSchema.introspect();
    const paramSchemas = (ctorIntrospection as any).parameters as
        | SchemaBuilder<any, any, any, any, any>[]
        | undefined;

    if (!paramSchemas || paramSchemas.length === 0) {
        return new implClass();
    }

    const resolvedArgs = paramSchemas.map(paramSchema =>
        serviceProvider.get(paramSchema)
    );

    return new implClass(...resolvedArgs);
}

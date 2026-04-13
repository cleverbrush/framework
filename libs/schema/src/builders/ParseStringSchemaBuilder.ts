import { ObjectSchemaBuilder } from './ObjectSchemaBuilder.js';
import {
    type BRAND,
    type InferType,
    type PropertyDescriptor,
    type PropertyDescriptorInner,
    type PropertyDescriptorTree,
    SchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult
} from './SchemaBuilder.js';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** Descriptor for a single interpolation segment captured at creation time. */
type SegmentDef = {
    /** The property schema for this segment. */
    schema: SchemaBuilder<any, any, any, any, any>;
    /** Dot-separated property path (e.g. `'order.id'`) — used in error messages. */
    path: string;
    /** The property descriptor inner — used to set parsed values on the result object. */
    descriptor: PropertyDescriptorInner<any, any, any>;
};

/** Internal data captured by the `$template` tagged-template invocation. */
type ParseStringTemplateDefinition = {
    /** Literal string fragments from the tagged template. */
    literals: readonly string[];
    /** One segment per interpolation expression, in order. */
    segments: readonly SegmentDef[];
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * The typed tagged-template function passed to the `parseString`
 * callback. Template expressions must be property-selector lambdas that
 * navigate the {@link PropertyDescriptorTree} of the object schema.
 *
 * Only properties whose inferred type extends `string | number | boolean | Date`
 * are selectable — nested `ObjectSchemaBuilder` children are navigable but
 * not themselves endpoints.
 */
export type ParseStringTemplateTag<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> = (
    strings: TemplateStringsArray,
    ...selectors: Array<
        (
            tree: PropertyDescriptorTree<
                TSchema,
                TSchema,
                string | number | boolean | Date
            >
        ) => PropertyDescriptor<TSchema, any, any>
    >
) => ParseStringTemplateDefinition;

type ParseStringSchemaBuilderCreateProps<
    T = any,
    R extends boolean = true
> = Partial<ReturnType<ParseStringSchemaBuilder<T, R>['introspect']>>;

// ---------------------------------------------------------------------------
// Regex helper
// ---------------------------------------------------------------------------

/** Escapes characters that have special meaning in a regular expression. */
function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Path-tracking Proxy (used at schema creation time)
// ---------------------------------------------------------------------------

/**
 * Wraps a `PropertyDescriptorTree` in a Proxy that records the traversed
 * property path. When the result is accessed via
 * `SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR` we know we've reached a leaf, so we
 * return the real descriptor. All other property accesses are captured as
 * path segments and the proxy recurses.
 *
 * @returns A proxy that looks identical to the tree from TypeScript's
 *          perspective but captures `[propName, propName, …]` as the user
 *          navigates via `t => t.order.id`.
 */
function createPathTrackingProxy(tree: any): {
    proxy: any;
    getPath: () => string[];
} {
    // Shared mutable array — child proxy pushes propagate to parent's getPath
    const pathSegments: string[] = [];

    function wrapProxy(target: any): any {
        return new Proxy(target, {
            get(t, prop) {
                // Property descriptor access — return real descriptor
                if (prop === SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR) {
                    return t[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
                }

                // Symbol / non-string — pass through
                if (typeof prop !== 'string') {
                    return t[prop];
                }

                const child = t[prop];
                if (typeof child !== 'object' || child === null) {
                    return child;
                }

                // Record this segment and recurse
                pathSegments.push(prop);
                return wrapProxy(child);
            }
        });
    }

    return {
        proxy: wrapProxy(tree),
        getPath: () => pathSegments
    };
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Validates a string against a template pattern and parses it
 * into a strongly-typed object.
 *
 * Created via the {@link parseString} factory:
 *
 * ```ts
 * const RouteSchema = parseString(
 *   object({ userId: string().uuid(), id: number() }),
 *   $t => $t`/orders/${t => t.id}/${t => t.userId}`
 * );
 *
 * const result = RouteSchema.validate('/orders/42/550e8400-...');
 * // result.object === { id: 42, userId: '550e8400-...' }
 * ```
 *
 * @see {@link parseString}
 */
export class ParseStringSchemaBuilder<
    TResult = any,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasDefault extends boolean = false,
    TExtensions = {}
> extends SchemaBuilder<
    TResult,
    TRequired,
    TNullable,
    THasDefault,
    TExtensions
> {
    #objectSchema: ObjectSchemaBuilder<any, any, any, any, any, any, any>;
    #templateDef: ParseStringTemplateDefinition;
    #compiledRegex: RegExp | null = null;

    /**
     * @hidden
     */
    public static create(props: ParseStringSchemaBuilderCreateProps) {
        return new ParseStringSchemaBuilder({
            type: 'parseString',
            ...props
        });
    }

    protected constructor(props: ParseStringSchemaBuilderCreateProps) {
        super(props as any);

        this.#objectSchema = props.objectSchema!;
        this.#templateDef = props.templateDefinition!;
    }

    // -- Regex ---------------------------------------------------------------

    #buildRegex(): RegExp {
        if (this.#compiledRegex) return this.#compiledRegex;
        const { literals, segments } = this.#templateDef;
        let pattern = '^';
        for (let i = 0; i < segments.length; i++) {
            pattern += escapeRegex(literals[i]);
            // Use non-greedy unless this is the last capture AND the
            // trailing literal is empty (nothing to anchor to).
            const isLast = i === segments.length - 1;
            const trailingLiteral = literals[i + 1] ?? '';
            pattern += isLast && trailingLiteral === '' ? '(.*)' : '(.*?)';
        }
        // Append the trailing literal (after all segments)
        pattern += escapeRegex(literals[segments.length] ?? '');
        pattern += '$';
        this.#compiledRegex = new RegExp(pattern);
        return this.#compiledRegex;
    }

    /** Builds a human-readable pattern like `/orders/{id}/{userId}` for error messages. */
    #humanPattern(): string {
        const { literals, segments } = this.#templateDef;
        let result = '';
        for (let i = 0; i < segments.length; i++) {
            result += literals[i] + `{${segments[i].path}}`;
        }
        result += literals[segments.length] ?? '';
        return result;
    }

    // -- Introspect ----------------------------------------------------------

    /**
     * Return a snapshot of this builder's configuration.
     *
     * Includes all base-class fields plus:
     * - `objectSchema` — the object schema defining the result shape.
     * - `templateDefinition` — the parsed template (literals and selector segments).
     */
    public introspect() {
        return {
            ...super.introspect(),
            /** The object schema defining the result shape. */
            objectSchema: this.#objectSchema,
            /** The template definition (literals + segments). */
            templateDefinition: this.#templateDef
        };
    }

    // -- Validate (sync) -----------------------------------------------------

    /** {@inheritDoc SchemaBuilder.validate} */
    public validate(
        object: string,
        context?: ValidationContext
    ): ValidationResult<TResult> {
        return super.validate(object, context) as ValidationResult<TResult>;
    }

    /** {@inheritDoc SchemaBuilder.validateAsync} */
    public async validateAsync(
        object: string,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
        return super.validateAsync(object, context) as Promise<
            ValidationResult<TResult>
        >;
    }

    protected _validate(
        object: any,
        context?: ValidationContext
    ): ValidationResult<TResult> {
        // Handle optional / nullable / default at the top
        if (typeof object === 'undefined' || object === null) {
            if (typeof object === 'undefined' && this.hasDefault) {
                object = this.resolveDefaultValue();
                return { valid: true, object: object as TResult };
            }
            if (!this.isRequired || (object === null && this.isNullable)) {
                return { valid: true, object: object as any };
            }
            return {
                valid: false,
                errors: [
                    {
                        message: this.getValidationErrorMessageSync(
                            this.requiredErrorMessage,
                            object
                        )
                    }
                ]
            };
        }

        return this.#matchAndValidate(object, context, (schema, raw) =>
            schema.validate(raw)
        );
    }

    // -- Validate (async) ----------------------------------------------------

    protected async _validateAsync(
        object: any,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
        // Handle optional / nullable / default
        if (typeof object === 'undefined' || object === null) {
            if (typeof object === 'undefined' && this.hasDefault) {
                object = this.resolveDefaultValue();
                return { valid: true, object: object as TResult };
            }
            if (!this.isRequired || (object === null && this.isNullable)) {
                return { valid: true, object: object as any };
            }
            return {
                valid: false,
                errors: [
                    {
                        message: await this.getValidationErrorMessage(
                            this.requiredErrorMessage,
                            object
                        )
                    }
                ]
            };
        }

        return this.#matchAndValidate(object, context, (schema, raw) =>
            schema.validateAsync(raw)
        );
    }

    /**
     * Shared regex-match + per-segment validation logic used by both
     * `_validate` (sync) and `_validateAsync` (async).
     *
     * The caller supplies `validateSegment` which is either the sync
     * `schema.validate` or async `schema.validateAsync`.
     */
    #matchAndValidate<
        R extends ValidationResult<unknown> | Promise<ValidationResult<unknown>>
    >(
        object: any,
        context: ValidationContext | undefined,
        validateSegment: (
            schema: SchemaBuilder<any, any, any, any, any>,
            raw: string
        ) => R
    ): R extends Promise<any>
        ? Promise<ValidationResult<TResult>>
        : ValidationResult<TResult> {
        if (typeof object !== 'string') {
            return {
                valid: false,
                errors: [
                    {
                        message: `expected a string to parse, but saw ${typeof object}`
                    }
                ]
            } as any;
        }

        const { segments } = this.#templateDef;

        // Degenerate case: no segments — just compare literals
        if (segments.length === 0) {
            const expected = this.#templateDef.literals[0] ?? '';
            if (object !== expected) {
                return {
                    valid: false,
                    errors: [
                        {
                            message: `expected "${expected}" but saw "${object}"`
                        }
                    ]
                } as any;
            }
            return { valid: true, object: {} as TResult } as any;
        }

        const regex = this.#buildRegex();
        const match = regex.exec(object);

        if (!match) {
            return {
                valid: false,
                errors: [
                    {
                        message: `does not match the parse-string pattern ${this.#humanPattern()}`
                    }
                ]
            } as any;
        }

        const doNotStop = context?.doNotStopOnFirstError ?? false;

        // Compute segment validation results lazily so fail-fast mode can
        // short-circuit without eagerly validating later segments. When
        // doNotStopOnFirstError is enabled, prestart all validations to
        // preserve the existing eager/parallel behavior.
        const segResults = new Proxy([] as R[], {
            get: (target, prop, receiver) => {
                if (prop === 'length') return segments.length;

                const index =
                    typeof prop === 'string' ? Number(prop) : Number.NaN;
                if (
                    Number.isInteger(index) &&
                    index >= 0 &&
                    index < segments.length
                ) {
                    if (!(index in target)) {
                        target[index] = validateSegment(
                            segments[index].schema,
                            match[index + 1]
                        );
                    }
                    return target[index];
                }

                return Reflect.get(target, prop, receiver);
            }
        }) as R[];

        if (doNotStop) {
            for (let i = 0; i < segments.length; i++) {
                void segResults[i];
            }
        }

        // If first result is a promise, the whole pipeline is async
        const firstResult = segResults[0];
        if (firstResult && typeof (firstResult as any).then === 'function') {
            return (async () => {
                const errors: { message: string }[] = [];
                const resultObj = {} as any;
                for (let i = 0; i < segments.length; i++) {
                    const segResult = (await segResults[
                        i
                    ]) as ValidationResult<unknown>;
                    if (!segResult.valid) {
                        const inner =
                            segResult.errors?.[0]?.message ??
                            'validation failed';
                        errors.push({
                            message: `${segments[i].path}: ${inner}`
                        });
                        if (!doNotStop) return { valid: false, errors };
                        continue;
                    }
                    segments[i].descriptor.setValue(
                        resultObj,
                        segResult.object,
                        { createMissingStructure: true }
                    );
                }
                if (errors.length > 0) return { valid: false, errors };
                return { valid: true, object: resultObj as TResult };
            })() as any;
        }

        // Sync path
        const errors: { message: string }[] = [];
        const resultObj = {} as any;
        for (let i = 0; i < segments.length; i++) {
            const segResult = segResults[i] as ValidationResult<unknown>;
            if (!segResult.valid) {
                const inner =
                    segResult.errors?.[0]?.message ?? 'validation failed';
                errors.push({
                    message: `${segments[i].path}: ${inner}`
                });
                if (!doNotStop) return { valid: false, errors } as any;
                continue;
            }
            segments[i].descriptor.setValue(resultObj, segResult.object, {
                createMissingStructure: true
            });
        }
        if (errors.length > 0) return { valid: false, errors } as any;
        return { valid: true, object: resultObj as TResult } as any;
    }

    // -- Fluent overrides (return type narrowing) ----------------------------

    /**
     * @inheritdoc
     */
    public hasType<T>(
        _notUsed?: T
    ): ParseStringSchemaBuilder<T, true, TNullable, THasDefault, TExtensions> &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @inheritdoc
     */
    public clearHasType(): ParseStringSchemaBuilder<
        any,
        TRequired,
        TNullable,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @hidden
     */
    public nullable(): ParseStringSchemaBuilder<
        TResult,
        TRequired,
        true,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.nullable() as any;
    }

    /**
     * @hidden
     */
    public notNullable(): ParseStringSchemaBuilder<
        TResult,
        TRequired,
        false,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.notNullable() as any;
    }

    /**
     * @hidden
     */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): ParseStringSchemaBuilder<
        TResult,
        true,
        TNullable,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.required(errorMessage);
    }

    /**
     * @hidden
     */
    public optional(): ParseStringSchemaBuilder<
        TResult,
        false,
        TNullable,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.optional();
    }

    /**
     * @hidden
     */
    public default(
        value: TResult | (() => TResult)
    ): ParseStringSchemaBuilder<TResult, true, TNullable, true, TExtensions> &
        TExtensions {
        return super.default(value) as any;
    }

    /**
     * @hidden
     */
    public clearDefault(): ParseStringSchemaBuilder<
        TResult,
        TRequired,
        TNullable,
        false,
        TExtensions
    > &
        TExtensions {
        return super.clearDefault() as any;
    }

    /**
     * @hidden
     */
    public brand<TBrand extends string | symbol>(
        _name?: TBrand
    ): ParseStringSchemaBuilder<
        TResult & { readonly [K in BRAND]: TBrand },
        TRequired,
        TNullable,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.brand(_name);
    }

    /**
     * @hidden
     */
    public readonly(): ParseStringSchemaBuilder<
        Readonly<TResult>,
        TRequired,
        TNullable,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.readonly();
    }

    protected createFromProps<T, TReq extends boolean>(
        props: ParseStringSchemaBuilderCreateProps<T, TReq>
    ): this {
        return ParseStringSchemaBuilder.create(props as any) as any;
    }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a parse-string schema that validates a string against a
 * template pattern and parses it into a strongly-typed object.
 *
 * The first argument defines the result shape via `object(...)`, and the
 * second argument is a callback receiving a typed `$template` tagged-template
 * function whose template expressions are type-safe property selectors.
 *
 * @example
 * ```ts
 * const RouteSchema = parseString(
 *   object({
 *     userId: string().uuid(),
 *     id: number()
 *   }),
 *   $t => $t`/orders/${t => t.id}/${t => t.userId}`
 * );
 *
 * const result = RouteSchema.validate('/orders/42/550e8400-e29b-41d4-a716-446655440000');
 * // result.valid === true
 * // result.object === { id: 42, userId: '550e8400-e29b-41d4-a716-446655440000' }
 *
 * type Route = InferType<typeof RouteSchema>;
 * // { id: number; userId: string }
 * ```
 *
 * @example Nested objects
 * ```ts
 * const schema = parseString(
 *   object({
 *     order: object({ id: number() }),
 *     user: object({ name: string() })
 *   }),
 *   $t => $t`/orders/${t => t.order.id}/by/${t => t.user.name}`
 * );
 * ```
 *
 * @param objectSchema - An `ObjectSchemaBuilder` defining the result type and
 *   per-property validation schemas.
 * @param templateBuilder - Callback receiving the typed `$template`
 *   tagged-template function. Must return the result of invoking `$template`.
 * @returns A `ParseStringSchemaBuilder` whose `validate()` accepts a
 *   string and whose `InferType` is the object schema's inferred type.
 */
export function parseString<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    objectSchema: TSchema,
    templateBuilder: (
        $template: ParseStringTemplateTag<TSchema>
    ) => ParseStringTemplateDefinition
): ParseStringSchemaBuilder<InferType<TSchema>> {
    if (!(objectSchema instanceof ObjectSchemaBuilder)) {
        throw new Error(
            'First argument must be an ObjectSchemaBuilder instance'
        );
    }

    // Get the PropertyDescriptorTree for the object schema
    const tree = ObjectSchemaBuilder.getPropertiesFor(objectSchema as any);

    // Build the $template tagged-template function
    const $template = ((
        strings: TemplateStringsArray,
        ...selectors: Array<(t: any) => any>
    ): ParseStringTemplateDefinition => {
        const seenPaths = new Set<string>();
        const segments: SegmentDef[] = [];

        for (const selector of selectors) {
            if (typeof selector !== 'function') {
                throw new Error(
                    'Template expressions must be property selector functions (e.g. t => t.id)'
                );
            }

            // Create a path-tracking proxy for this selector invocation
            const { proxy, getPath } = createPathTrackingProxy(tree);
            const descriptor = selector(proxy);

            if (
                !descriptor ||
                typeof descriptor !== 'object' ||
                !(SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in descriptor)
            ) {
                throw new Error(
                    'Template expression must select a property from the schema (e.g. t => t.id)'
                );
            }

            const inner: PropertyDescriptorInner<any, any, any> =
                descriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
            const schema = inner.getSchema();
            const path = getPath();

            if (path.length === 0) {
                throw new Error(
                    'Template expression must select a specific property (e.g. t => t.id), not the root object'
                );
            }

            const pathStr = path.join('.');

            if (seenPaths.has(pathStr)) {
                throw new Error(
                    `Duplicate template parameter: "${pathStr}" is already used in this template`
                );
            }
            seenPaths.add(pathStr);

            segments.push({
                schema,
                path: pathStr,
                descriptor: inner
            });
        }

        return {
            literals: [...strings],
            segments
        };
    }) as ParseStringTemplateTag<TSchema>;

    const templateDef = templateBuilder($template);

    return ParseStringSchemaBuilder.create({
        isRequired: true,
        objectSchema: objectSchema as any,
        templateDefinition: templateDef
    }) as any;
}

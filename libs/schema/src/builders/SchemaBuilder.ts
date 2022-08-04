import { Schema, Validator } from '../schema.js';

export interface ISchemaBuilder<
    TRequired extends boolean = true,
    TNullable extends boolean = false
> {
    readonly _schema: Schema;
    isRequired: TRequired;
    isNullable: TNullable;
    validators?: Validator[];
    preprocessor?: ((value: unknown) => unknown | Promise<unknown>) | string;
    addValidator(validator: Validator): this;
    clearValidators(): this;
    addPreprocessor(
        preprocessor: ((value: unknown) => unknown | Promise<unknown>) | string
    ): this;
    clearPreprocessor(): this;
    clone(): this;
}

export abstract class SchemaBuilder<
    TRequired extends boolean = true,
    TNullable extends boolean = false
> implements ISchemaBuilder<TRequired, TNullable>
{
    protected _isRequired: TRequired = true as any as TRequired;
    protected _isNullable: TNullable = false as any as TNullable;

    public validators?: Validator[];

    public preprocessor?:
        | ((value: unknown) => unknown | Promise<unknown>)
        | string;

    public abstract clone(): this;

    public abstract get _schema(): Schema;

    protected constructor(obj: {
        isRequired?: boolean;
        isNullable?: boolean;
        preprocessor?:
            | ((value: unknown) => unknown | Promise<unknown>)
            | string;
        validators?: Validator[];
    }) {
        if (typeof obj === 'object') {
            if (typeof obj.isRequired !== 'undefined') {
                this.isRequired = obj.isRequired;
            }
            if (typeof obj.isNullable !== 'undefined') {
                this.isNullable = obj.isNullable;
            }
            if (Array.isArray(obj.validators)) {
                this.validators = [...obj.validators];
            }
            if (typeof obj.preprocessor !== 'undefined') {
                this.preprocessor = obj.preprocessor;
            }
        }
    }

    protected getCommonSchema() {
        const schemas = [];
        if (typeof this.preprocessor !== 'undefined') {
            schemas.push({
                preprocessor: this.preprocessor
            });
        }
        if (typeof this.isRequired !== 'undefined') {
            schemas.push({ isRequired: this.isRequired });
        }
        if (typeof this.isNullable !== 'undefined') {
            schemas.push({ isNullable: this.isNullable });
        }
        if (typeof this.validators !== 'undefined') {
            schemas.push({ validators: [...this.validators] });
        }
        return Object.assign({}, ...schemas);
    }

    addPreprocessor(
        preprocessor: ((value: unknown) => unknown | Promise<unknown>) | string
    ) {
        const result = this.clone();
        result.preprocessor = preprocessor;
        return result;
    }

    clearPreprocessor(): this {
        if (typeof this.preprocessor === 'undefined') {
            return this;
        }

        const result = this.clone();
        delete result.preprocessor;
        return result;
    }

    addValidator(validator: Validator): this {
        const result = this.clone();
        if (typeof validator !== 'function')
            throw new Error('validator should be a function');

        if (Array.isArray(result.validators)) {
            result.validators.push(validator);
        } else {
            result.validators = [validator];
        }
        return result;
    }

    clearValidators(): this {
        if (typeof this.validators === 'undefined') return this;
        const result = this.clone();
        delete result.validators;
        return result;
    }

    public get isRequired(): TRequired {
        return this._isRequired;
    }

    protected set isRequired(val: boolean) {
        this._isRequired = val as TRequired;
    }

    public get isNullable(): TNullable {
        return this._isNullable;
    }

    protected set isNullable(val: boolean) {
        this._isNullable = val as TNullable;
    }
}

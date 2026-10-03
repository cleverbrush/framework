import type { InferType } from '@cleverbrush/schema';
import type { QueryParameter } from './parameter.js';

/** @internal Query argument state; origins allow branch removal without stale arguments. */
export type ParameterState = readonly (readonly [
    name: string,
    uses: Record<string, unknown>
])[];

/** @internal */
export const PARAMETER_STATE = Symbol('query-parameter-state');
/** @internal Higher-kinded return type for table, alias, group and ORM readers. */
export const PARAMETER_READER = Symbol('query-parameter-reader');
declare const QUERY_SOURCE: unique symbol;

/** @internal Recover the reader behind its callable public type. */
export type UnderlyingQuery<Q> = Q extends { readonly [QUERY_SOURCE]: infer S }
    ? S
    : Q;

/** @internal */
export interface ParameterReader {
    readonly parameters: unknown;
    readonly result: unknown;
}

/** @internal */
export type Reparameterize<
    F extends ParameterReader,
    P extends ParameterState
> = (F & { readonly parameters: P })['result'];

/** @internal */
export type ParametersOf<Q> = Q extends {
    readonly [PARAMETER_STATE]: infer P extends ParameterState;
}
    ? P
    : [];

type ValueOf<U> = {
    [K in keyof U]: (value: U[K]) => void;
}[keyof U] extends (value: infer V) => void
    ? V
    : never;

/** The positional argument tuple inferred from a parameterized reader. */
export type QueryArguments<P extends ParameterState> = {
    -readonly [K in keyof P]: ValueOf<P[K][1]>;
};

type Find<P extends ParameterState, N extends string> = Extract<
    P[number],
    readonly [N, unknown]
>;
type ExistingValue<P extends ParameterState, N extends string> =
    Find<P, N> extends infer E extends readonly [string, unknown]
        ? ValueOf<E[1]>
        : never;

/** @internal */
export type ParameterCompatible<
    P extends ParameterState,
    N extends string,
    V
> = [Find<P, N>] extends [never]
    ? unknown
    : [NonNullable<ExistingValue<P, N>> & NonNullable<V>] extends [never]
      ? never
      : unknown;

/** @internal */
export type AddParameter<
    P extends ParameterState,
    N extends string,
    V,
    Origin extends string = 'root'
> = P extends readonly [
    infer H extends ParameterState[number],
    ...infer T extends ParameterState
]
    ? H[0] extends N
        ? [
              readonly [
                  N,
                  Omit<H[1], Origin> &
                      Record<
                          Origin,
                          Origin extends keyof H[1] ? H[1][Origin] & V : V
                      >
              ],
              ...T
          ]
        : [H, ...AddParameter<T, N, V, Origin>]
    : [readonly [N, Record<Origin, V>]];

type SetOrigin<
    U,
    C extends ParameterState,
    N extends string,
    O extends string
> = Omit<U, O> &
    ([Find<C, N>] extends [never] ? {} : Record<O, ExistingValue<C, N>>);
type ReplaceOrigins<
    P extends ParameterState,
    C extends ParameterState,
    O extends string
> = P extends readonly [
    infer H extends ParameterState[number],
    ...infer T extends ParameterState
]
    ? SetOrigin<H[1], C, H[0], O> extends infer U
        ? [keyof U] extends [never]
            ? ReplaceOrigins<T, C, O>
            : [
                  readonly [H[0], U & Record<never, never>],
                  ...ReplaceOrigins<T, C, O>
              ]
        : never
    : [];
type AppendOrigins<
    P extends ParameterState,
    C extends ParameterState,
    O extends string
> = C extends readonly [
    infer H extends ParameterState[number],
    ...infer T extends ParameterState
]
    ? AppendOrigins<AddParameter<P, H[0], ValueOf<H[1]>, O>, T, O>
    : P;

/** @internal Replace one nested reader while preserving surviving argument order. */
export type AttachParameters<
    P extends ParameterState,
    C extends ParameterState,
    Origin extends string
> = AppendOrigins<ReplaceOrigins<P, C, Origin>, C, Origin>;

/** @internal */
export type MergeParameters<
    P extends ParameterState,
    C extends ParameterState
> = AppendOrigins<P, C, 'root'>;

/** @internal Recover one child contract for a subsequent variant customizer. */
export type ScopedParameters<
    P extends ParameterState,
    O extends string
> = P extends readonly [
    infer H extends ParameterState[number],
    ...infer T extends ParameterState
]
    ? O extends keyof H[1]
        ? [readonly [H[0], { root: H[1][O] }], ...ScopedParameters<T, O>]
        : ScopedParameters<T, O>
    : [];

/** @internal Retain root/relation constraints and the selected variant constraints. */
export type SelectParameterVariants<
    P extends ParameterState,
    K extends string
> = P extends readonly [
    infer H extends ParameterState[number],
    ...infer T extends ParameterState
]
    ? {
          [O in keyof H[1] as O extends `variant:${infer V}`
              ? V extends K
                  ? O
                  : never
              : O]: H[1][O];
      } extends infer U
        ? [keyof U] extends [never]
            ? SelectParameterVariants<T, K>
            : [
                  readonly [H[0], U & Record<never, never>],
                  ...SelectParameterVariants<T, K>
              ]
        : never
    : [];

/** @internal Reject placeholders in untyped APIs, including nested binding arrays. */
export type WithoutParameters<V> = V extends QueryParameter
    ? never
    : V extends readonly unknown[]
      ? { [K in keyof V]: WithoutParameters<V[K]> }
      : V extends Record<string, unknown>
        ? { [K in keyof V]: WithoutParameters<V[K]> }
        : V;

/** @internal Add every placeholder in a fixed value tuple in tuple order. */
export type ValueParameters<P extends ParameterState, A, V> =
    A extends QueryParameter<infer N>
        ? AddParameter<P, N, V>
        : A extends readonly [infer H, ...infer T]
          ? ValueParameters<ValueParameters<P, H, V>, T, V>
          : P;

/** @internal Reject incompatible reuse without a permissive value overload. */
export type CheckParameterValue<P extends ParameterState, A, V> =
    A extends QueryParameter<infer N>
        ? ParameterCompatible<P, N, V>
        : A extends readonly [infer H, ...infer T]
          ? CheckParameterValue<P, H, V> &
                CheckParameterValue<ValueParameters<P, H, V>, T, V>
          : A extends readonly (infer E)[]
            ? Extract<E, QueryParameter> extends never
                ? unknown
                : never
            : A extends WithoutParameters<A>
              ? unknown
              : never;

/** @internal Reject incompatible argument intersections introduced by a nested reader. */
export type CheckParameterState<P extends ParameterState> = P extends readonly [
    infer H extends ParameterState[number],
    ...infer T extends ParameterState
]
    ? [NonNullable<ValueOf<H[1]>>] extends [never]
        ? never
        : CheckParameterState<T>
    : unknown;

/** @internal Scalar predicates never expand placeholder arrays or objects. */
export type CheckScalarParameter<
    P extends ParameterState,
    A,
    V
> = A extends QueryParameter
    ? CheckParameterValue<P, A, V>
    : A extends WithoutParameters<A>
      ? unknown
      : never;

type UnboundTerminal =
    | 'then'
    | 'execute'
    | 'first'
    | 'all'
    | 'find'
    | 'findOrFail'
    | 'findMany'
    | 'paginate'
    | 'paginateAfter'
    | 'pluck'
    | 'countValue'
    | 'countDistinctValue'
    | 'sumValue'
    | 'avgValue'
    | 'minValue'
    | 'maxValue'
    | 'compile'
    | 'toKnexQuery'
    | 'toQuery'
    | 'apply'
    | 'selectRaw'
    | 'insert'
    | 'insertMany'
    | 'update'
    | 'delete'
    | 'hardDelete'
    | 'restore'
    | 'bulkInsert'
    | 'bulkUpdate'
    | 'bulkUpsert'
    | 'upsert'
    | 'onConflict'
    | 'save';

/** SQL with positional value placeholders and independently snapshotted bindings. */
export interface BoundQuerySql {
    readonly sql: string;
    readonly bindings: readonly unknown[];
}

/** A callable SELECT template; use query(...args) for ordinary query composition. */
export type ParameterizedQuery<Q, P extends ParameterState> = Omit<
    Q,
    UnboundTerminal | 'query'
> & {
    readonly [QUERY_SOURCE]: Q;
    (
        ...args: QueryArguments<P>
    ): Promise<Q extends { rowSchema: infer S } ? InferType<S>[] : never>;
    /** Bind an independent ordinary reader without executing it. */
    query(...args: QueryArguments<P>): Q extends {
        readonly [PARAMETER_READER]: infer F extends ParameterReader;
    }
        ? Reparameterize<F, []>
        : never;
    /** Compile once on first use; subsequent calls only bind values. */
    toSQL(...args: QueryArguments<P>): BoundQuerySql;
};

/** @internal Ordinary readers keep their existing API until a parameter is added. */
export type QueryView<Q> =
    ParametersOf<Q> extends readonly []
        ? Q
        : ParameterizedQuery<Q, ParametersOf<Q>>;

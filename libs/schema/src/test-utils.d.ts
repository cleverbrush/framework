export type Expect<T extends true> = T;

export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
    T
>() => T extends Y ? 1 : 2
    ? true
    : false;

// export type Equal<X, Y> = X extends Y ? (Y extends X ? true : false) : false;

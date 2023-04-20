import { EventEmitter } from 'events';

export type CollectorEvents<T> = {
    end: (result: T) => void;
    timeout: (result: Partial<T>) => void;
};

export interface ICollector<T> {
    on<M extends keyof CollectorEvents<T>>(
        event: M,
        listener: CollectorEvents<T>[M]
    ): this;
}

/**
 * Allows to collect results of async operations and wait for all of them to finish
 * supports timeout and promise interface to wait for all results.
 * Also implementes EventEmitter interface.
 * @example
 * ```typescript
 * const collector = new Collector(['a', 'b', 'c']);
 * collector.collect('a', Promise.resolve(1));
 * collector.collect('b', Promise.resolve(2));
 * collector.collect('c', Promise.resolve(3));
 * collector.on('end', (result) => {
 *    console.log(result); // { a: 1, b: 2, c: 3 }
 * });
 * ```
 * or using promise interface
 * ```typescript
 * const collector = new Collector(['a', 'b', 'c']);
 * collector.collect('a', Promise.resolve(1));
 * collector.collect('b', Promise.resolve(2));
 * collector.collect('c', Promise.resolve(3));
 * collector.toPromise().then((result) => {
 *   console.log(result); // { a: 1, b: 2, c: 3 }
 * });
 */
export default class Collector<
        T extends Record<string, unknown>,
        K extends keyof T = keyof T
    >
    extends EventEmitter
    implements ICollector<T>
{
    on<M extends keyof CollectorEvents<T>>(
        event: M,
        listener: CollectorEvents<T>[M]
    ): this {
        return super.on(event, listener);
    }
    #collectionResults: Record<keyof T, unknown>;

    #leftToCollect = 0;

    #timeoutTimer;

    #isTimedOut = false;

    #promiseResolve: (...args: any[]) => any;

    #promiseReject: (...args: any[]) => any;

    /**
     *
     * @param keys - array of keys to collect
     * @param timeout - optional timeout in ms. If timeout is reached, collector will emit 'timeout' event and reject promise
     */
    constructor(keys: K[], timeout = -1) {
        super();
        if (!Array.isArray(keys))
            throw new Error('keys must be of time Array<String>');

        this.#leftToCollect = Object.keys(keys).length;
        this.#collectionResults = {} as any;

        if (typeof timeout === 'number' && timeout > 0) {
            this.#timeoutTimer = setTimeout(() => {
                if (this.#leftToCollect <= 0) return;
                if (this.#isTimedOut) return;
                this.#isTimedOut = true;
                this.emit('timeout', { ...this.#collectionResults });
                if (typeof this.#promiseReject === 'function')
                    this.#promiseReject({
                        reason: 'timeout',
                        results: { ...this.#collectionResults }
                    });
            }, timeout);
        }
    }

    #onEnd() {
        clearTimeout(this.#timeoutTimer);
        this.emit('end', { ...this.#collectionResults });
        if (typeof this.#promiseResolve === 'function')
            this.#promiseResolve({ ...this.#collectionResults });
    }

    /**
     * Collects `value` for given `key`
     * @param key - key to collect
     * @param value - value to collect for given key. If value is Promise - it will be awaited and result will be collected
     * @returns `this` to allow chaining
     */
    collect<L extends K>(key: L, value: T[L]): this {
        if (this.#isTimedOut) return this;
        // if value is Promise - await it and collect its result
        Promise.resolve(value)
            .then((result) => {
                if (this.#isTimedOut) return;
                if (key in this.#collectionResults)
                    throw new Error(
                        `Item with key '${key.toString()}' is already collected`
                    );

                this.#collectionResults[key] = result;
                this.#leftToCollect--;
                if (this.#leftToCollect === 0) {
                    this.#onEnd();
                }
            })
            .catch((e) => {
                if (typeof this.#promiseReject === 'function') {
                    this.#promiseReject({
                        reason: 'error',
                        results: { key, error: e }
                    });
                } else {
                    this.emit('error', {
                        key,
                        error: e
                    });
                }
            });

        // eslint-disable-next-line
        return this;
    }

    /**
     * Returns promise that will be resolved when all items are collected or rejected if timeout is reached.
     */
    toPromise(): Promise<T> {
        return new Promise((res, rej) => {
            this.#promiseResolve = res;
            this.#promiseReject = rej;
        });
    }
}

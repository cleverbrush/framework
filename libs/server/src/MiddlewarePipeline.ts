import type { RequestContext } from './RequestContext.js';
import type { Middleware } from './types.js';

/**
 * Executes a chain of {@link Middleware} functions in order, then invokes
 * a final handler when `next()` is called by every middleware in the chain.
 *
 * Middleware can short-circuit the chain by not calling `next()`.
 */
export class MiddlewarePipeline {
    readonly #middlewares: Middleware[] = [];

    /** Append a middleware to the end of the pipeline. */
    add(middleware: Middleware): void {
        this.#middlewares.push(middleware);
    }

    /**
     * Execute the pipeline with the given `context`, calling each middleware
     * in order and finally invoking `finalHandler`.
     */
    async execute(
        context: RequestContext,
        finalHandler: () => Promise<void>
    ): Promise<void> {
        let index = 0;

        const next = async (): Promise<void> => {
            if (index < this.#middlewares.length) {
                const middleware = this.#middlewares[index++];
                await middleware(context, next);
            } else {
                await finalHandler();
            }
        };

        await next();
    }
}
